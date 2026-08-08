/**
 * Interactive CLI for the Private Crowdfunding Platform.
 *
 * Connects to the deployed contract, reads public state via the indexer, and
 * submits circuit calls (launchCampaign / donate / closeCampaign) through the
 * wallet. Donation amounts are carried ONLY inside the private witness state
 * (`pendingDonation`) at call time and never persisted to the ledger.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { toHex, fromHex } from "@midnight-ntwrk/midnight-js-utils";

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, getDeployment } from "./network";
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from "./wallet";
import { createCrowdfundingPrivateState, deriveCampaignSecretKey, type CrowdfundingPrivateState } from "./contract/witnesses";
import { CompiledPrivateCrowdfundingContractContract, CampaignStatus, ledger, type CampaignEntry, type Ledger } from "./contract/index.js";

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = "crowdfundingPrivateState";
// Midnight's native token is NIGHT, whose smallest unit is STAR:
// 1 NIGHT = 10^6 STAR (6 decimal places).
const NIGHT_DECIMALS = 1_000_000n;

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
const SEED = WALLET.seed;
{
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, "..", "contracts", "managed", "private-crowdfunding");

const compiledContract = CompiledPrivateCrowdfundingContractContract;

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || "Local-Devnet-Development-Placeholder-1";

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID, CrowdfundingPrivateState>({
      privateStateStoreName: "crowdfunding-private-state",
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const getLedgerState = async (providers: any, contractAddress: string) => {
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const listCampaigns = (ledgerState: Ledger) => {
  const out: Array<[bigint, CampaignEntry]> = [];
  for (const [id, entry] of ledgerState.campaigns) out.push([id, entry]);
  out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return out;
};

async function displayCampaigns(providers: any, address: string) {
  const ledgerState = await getLedgerState(providers, address);
  if (ledgerState === null) {
    console.log(`  No contract state found at ${address}`);
    return;
  }
  const campaigns = listCampaigns(ledgerState);
  if (campaigns.length === 0) {
    console.log("  No campaigns launched yet.");
    return;
  }
  for (const [id, c] of campaigns) {
    const status = c.status === CampaignStatus.ACTIVE ? "ACTIVE" : "CLOSED";
    console.log(`  Campaign #${id.toString()}`);
    console.log(`    Status:    ${status}`);
    console.log(`    Title:     ${c.title.is_some ? c.title.value : "(none)"}`);
    console.log(`    Raised:    ${(c.raised / NIGHT_DECIMALS).toLocaleString()} tNIGHT`);
    console.log(`    Target:    ${(c.target / NIGHT_DECIMALS).toLocaleString()} tNIGHT`);
    console.log(`    Donations: ${c.donationsCount.toLocaleString()}`);
    console.log(`    Owner:     ${toHex(c.owner)}`);
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║           Private Crowdfunding Platform CLI                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const rl = createInterface({ input: stdin, output: stdout });

  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for network ${network}. Run \`npm run setup -- --network ${network}\` first.`);
    process.exit(1);
  }
  console.log(`  Contract: ${deployment.address}`);
  console.log(`  Network: ${network}\n`);

  try {
    const seed = SEED;
    // Must match the key deploy used, so this wallet can close the campaign
    // even if the private-state store was cleared. See witnesses.ts.
    const campaignSecretKey = deriveCampaignSecretKey(seed);

    console.log("  Connecting to wallet...");
    const walletCtx = await createWallet({ network, networkConfig, seed });
    const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
    if (restoredCount > 0) {
      console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state — sync will resume from saved point.`);
    }

    console.log("  Syncing with network...");
    console.log("  ℹ  This may take several minutes depending on network size.\n");
    const syncStart = Date.now();
    const syncInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - syncStart) / 1000);
      process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
    }, 5000);
    const state = await walletCtx.wallet.waitForSyncedState();
    clearInterval(syncInterval);
    process.stdout.write("\r  ✓ Synced with network.                                      \n");

    await persistWalletState(network, walletCtx);
    const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

    if (balance === 0n && network !== "undeployed" && networkConfig.faucet) {
      const address = walletCtx.unshieldedKeystore.getBech32Address();
      console.log("  ⚠ Wallet has no tNight. Fund it from the faucet to send transactions:");
      console.log(`     ${networkConfig.faucet}`);
      console.log(`     Wallet address: ${address}\n`);
    }

    console.log("  Connecting to contract...");
    const providers = await createProviders(walletCtx);

    const deployed: any = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: createCrowdfundingPrivateState(campaignSecretKey),
    });

    console.log("  ✅ Connected!\n");

    let running = true;
    while (running) {
      console.log("─── Menu ───────────────────────────────────────────────────────");
      console.log("  1. Launch campaign");
      console.log("  2. Donate to a campaign (amount stays private — proved, never revealed)");
      console.log("  3. Close a campaign (owner only)");
      console.log("  4. View all public campaigns");
      console.log("  5. Check wallet balance");
      console.log("  6. Exit\n");

      const choice = await rl.question("  Your choice: ");

      switch (choice.trim()) {
        case "1": {
          const title = await rl.question("  Campaign title: ");
          const description = await rl.question("  Description: ");
          const targetInput = await rl.question("  Funding target (tNIGHT): ");
          const target = BigInt(targetInput.trim() || "0") * NIGHT_DECIMALS;
          if (target <= 0n) {
            console.log("\n  ❌ Target must be greater than zero.\n");
            break;
          }
          console.log("\n  Submitting launchCampaign (this may take 30-60 seconds)...");
          try {
            // Donations are paid to this wallet's Zswap coin public key.
            const recipient = fromHex(walletCtx.shieldedSecretKeys.coinPublicKey);
            const tx = await deployed.callTx.launchCampaign(title, description, target, recipient);
            console.log(`\n  ✅ Campaign #${tx.private.result.toString()} launched!`);
            console.log(`  Transaction ID: ${tx.public.txHash}`);
            console.log(`  Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error("\n  ❌ Failed:", error instanceof Error ? error.message : error);
          }
          break;
        }

        case "2": {
          const campaignIdInput = await rl.question("  Campaign id: ");
          const campaignId = BigInt(campaignIdInput.trim() || "0");
          const amountInput = await rl.question("  Donation amount (tNIGHT): ");
          const amount = BigInt(amountInput.trim() || "0") * NIGHT_DECIMALS;
          if (amount <= 0n) {
            console.log("\n  ❌ Donation must be greater than zero.\n");
            break;
          }
          console.log("\n  Proved without revealing your input — generating ZK proof...");
          try {
            const ledgerState = await getLedgerState(providers, deployment.address);
            if (ledgerState === null) {
              console.log("\n  ❌ Contract state not found at contract address.\n");
              break;
            }
            if (!ledgerState.campaigns.member(campaignId)) {
              console.log("\n  ❌ Campaign #" + campaignId.toString() + " does not exist.\n");
              break;
            }
            const campaign = ledgerState.campaigns.lookup(campaignId);
            if (campaign.status !== CampaignStatus.ACTIVE) {
              console.log("\n  ❌ Campaign is not active.\n");
              break;
            }
            const newTotal = campaign.raised + amount;
            if (newTotal > campaign.target) {
              console.log("\n  ❌ Donation exceeds remaining funding target.\n");
              break;
            }

            // The amount enters the proof ONLY via the private witness state,
            // set right before the call and never logged or persisted after.
            const currentPrivate = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
            await providers.privateStateProvider.set(PRIVATE_STATE_ID, {
              ...(currentPrivate ?? { secretKey: campaignSecretKey }),
              pendingDonation: amount,
            });

            const tx = await deployed.callTx.donate(campaignId, newTotal);
            console.log(`\n  ✅ Donation submitted (ZK-proved, amount never revealed on-chain).`);
            console.log(`  Receipt: ${toHex(tx.private.result)}`);
            console.log(`  Transaction ID: ${tx.public.txHash}`);
            console.log(`  Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error("\n  ❌ Failed:", error instanceof Error ? error.message : error);
          } finally {
            // Drop the pending amount from private state right after the call.
            try {
              const p = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
              if (p) {
                await providers.privateStateProvider.set(PRIVATE_STATE_ID, { ...p, pendingDonation: 0n });
              }
            } catch {
              // non-fatal
            }
          }
          break;
        }

        case "3": {
          const campaignIdInput = await rl.question("  Campaign id: ");
          const campaignId = BigInt(campaignIdInput.trim() || "0");
          console.log("\n  Submitting closeCampaign (owner-only)...");
          try {
            const tx = await deployed.callTx.closeCampaign(campaignId);
            console.log(`\n  ✅ Campaign #${campaignId.toString()} closed! Final aggregate returned on-chain.`);
            console.log(`  Final raised: ${(tx.private.result / NIGHT_DECIMALS).toLocaleString()} tNIGHT`);
            console.log(`  Transaction ID: ${tx.public.txHash}`);
            console.log(`  Block height: ${tx.public.blockHeight}\n`);
          } catch (error) {
            console.error("\n  ❌ Failed:", error instanceof Error ? error.message : error);
          }
          break;
        }

        case "4": {
          console.log("\n  Reading public campaign state from indexer...");
          try {
            await displayCampaigns(providers, deployment.address);
            console.log("");
          } catch (error) {
            console.error("\n  ❌ Failed:", error instanceof Error ? error.message : error);
          }
          break;
        }

        case "5": {
          console.log("\n  Checking balance...");
          const currentState = await walletCtx.wallet.waitForSyncedState();
          const currentBalance = currentState.unshielded.balances[unshieldedToken().raw] ?? 0n;
          const dustBalance = currentState.dust.balance(new Date());
          console.log(`\n  tNight: ${currentBalance.toLocaleString()}`);
          console.log(`  DUST: ${dustBalance.toLocaleString()}\n`);
          break;
        }

        case "6":
          running = false;
          console.log("\n  👋 Goodbye!\n");
          break;

        default:
          console.log("\n  ❌ Invalid choice. Please enter 1-6.\n");
      }
    }

    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
