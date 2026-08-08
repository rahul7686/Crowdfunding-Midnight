/**
 * Deploy the Private Crowdfunding contract to a Midnight network
 * (undeployed by default; use --network preview|preprod for public networks).
 *
 * Flow:
 *   1. resolve network + wallet (BIP-39 mnemonic persisted to .midnight-state.json)
 *   2. sync wallet, print address + balance
 *   3. FUNDING GATE — on public networks with a 0 tNight balance, STOP, print the
 *      wallet address + faucet URL, and wait (default max 5 min) for funds.
 *   4. register NIGHT for DUST generation
 *   5. deploy an empty contract instance; unless --no-launch is passed, call
 *      launchCampaign(...) with the campaign details (--title / --description /
 *      --target). Pass --no-launch so the DApp browser (its owner key) launches
 *      the campaign instead.
 *   6. record the contract address in .midnight-state.json and frontend/.env.local
 *
 * Non-interactive: campaign details default to a demo campaign when not passed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import * as Rx from "rxjs";

import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { fromHex } from "@midnight-ntwrk/midnight-js-utils";

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, recordDeployment } from "./network";
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from "./wallet";
import { createCrowdfundingPrivateState, deriveCampaignSecretKey, type CrowdfundingPrivateState } from "./contract/witnesses";
import { CompiledPrivateCrowdfundingContractContract } from "./contract/index.js";

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = "crowdfundingPrivateState";

// Campaign details from CLI flags, with a demo default so the flow is
// non-interactive for the bootcamp.
function parseCampaignArgs(
  argv: string[],
): { title: string; description: string; target: bigint; noLaunch: boolean } {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    title: get("--title") ?? "Community Solar Cooperative",
    description:
      get("--description") ??
      "Rooftop solar for 40 low-income households. Donations are fully private — no one learns who donated or how much.",
    // NIGHT has 6 decimal places (1 NIGHT = 10^6 STAR base units).
    target: BigInt(get("--target") ?? "1000000000"), // 1,000 tNIGHT default (6 decimals)
    noLaunch: argv.includes("--no-launch"),
  };
}

async function waitForProofServer(maxAttempts = 30, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://127.0.0.1:6300", {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return true;
    } catch (err: any) {
      const code = err?.cause?.code || err?.code || "";
      if (code !== "ECONNREFUSED" && code !== "UND_ERR_CONNECT_TIMEOUT" && code !== "UND_ERR_SOCKET") {
        return true;
      }
    }
    if (attempt < maxAttempts) {
      process.stdout.write(`\r  Waiting for proof server... (${attempt}/${maxAttempts})   `);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, "..", "contracts", "managed", "private-crowdfunding");

const compiledContract = CompiledPrivateCrowdfundingContractContract;

// Transient Preview RPC failures: the public RPC gateway is load-balanced and
// can drop connections mid-request (and the wallet SDK surfaces them as nested
// SubmissionError / "Normal Closure" / ECONNRESET). These must be retried, not
// treated as fatal.
const TRANSIENT_RPC_PATTERNS = [
  /disconnected from/,
  /Normal Closure/,
  /ECONNRESET/,
  /ETIMEDOUT/,
  /SubmissionError/,
  /submission failed/i,
  /ConnectionClosed/i,
  /rpc.*timeout/i,
  /transaction submission/i,
];

export function isTransientRpcError(err: unknown): boolean {
  let node: unknown = err;
  const messages: string[] = [];
  for (let depth = 0; node && depth < 6; depth++) {
    if (node instanceof Error) messages.push(node.message);
    else if (typeof node === "object" && node !== null && "message" in node) {
      messages.push(String((node as { message: unknown }).message));
    }
    node = (node as { cause?: unknown })?.cause;
  }
  const full = messages.join(" ");
  return TRANSIENT_RPC_PATTERNS.some((re) => re.test(full));
}

async function withTransientRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; delayMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 10;
  const delayMs = opts.delayMs ?? 10_000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientRpcError(err) || attempt === maxAttempts) throw err;
      console.log(
        `  ⏳ ${label} hit a transient RPC error — retrying (${attempt}/${maxAttempts}) in ${delayMs / 1000}s...`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Unreachable: withTransientRetry(${label})`);
}

async function createProviders(walletCtx: WalletContext, networkConfig: ReturnType<typeof resolveNetwork>["config"]) {
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

async function main() {
  const { network, config: networkConfig } = resolveNetwork();
  const WALLET = getOrCreateWallet(network);
  const SEED = WALLET.seed;
  {
    const notice = formatWalletBackupNotice(WALLET, network);
    if (notice) console.log(notice);
  }
  const { title, description, target, noLaunch } = parseCampaignArgs(process.argv);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  Deploy Private Crowdfunding to ${network}`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("─── Wallet setup ───────────────────────────────────────────────\n");
  console.log("  Creating wallet...");
  const walletCtx = await createWallet({ network, networkConfig, seed: SEED });
  const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
  if (restoredCount > 0) {
    console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state — sync will resume from saved point.`);
  }

  console.log("  Syncing with network...");
  console.log("  ℹ  This may take several minutes depending on network size.");
  console.log("     RPC disconnection messages during sync are normal and can be safely ignored.\n");
  const syncStart = Date.now();
  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);
    process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
  }, 5000);
  const state = await walletCtx.wallet.waitForSyncedState();
  clearInterval(syncInterval);
  process.stdout.write("\r  ✓ Synced with network.                                      \n");

  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  let balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`\n  Wallet Address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  if (network === "undeployed" && balance === 0n) {
    console.error(
      "\n❌ Genesis-seed wallet has zero NIGHT. The devnet preset may not have minted to it.\n" +
        "   Check `docker compose ps` and `docker compose logs node`. Then `docker compose down -v` and retry.\n",
    );
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  // FUNDING GATE (public networks only): stop, print the address + faucet URL,
  // and wait up to MIDNIGHT_FAUCET_TIMEOUT_MS (default 5 min) for tNIGHT.
  if (network !== "undeployed" && networkConfig.faucet && balance === 0n) {
    console.log("─── FUNDING REQUIRED ────────────────────────────────────────────\n");
    console.log(`  Your wallet has 0 tNIGHT. Fund it at the Preview faucet, then wait —`);
    console.log(`  the deploy will continue automatically once the funds arrive.\n`);
    console.log(`  Wallet address: ${address}`);
    console.log(`  Faucet URL:     ${networkConfig.faucet}\n`);
    console.log("  Waiting for tNIGHT to arrive (poll every 10s)...");

    const rawTimeout = Number(process.env.MIDNIGHT_FAUCET_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 300_000;
    const start = Date.now();
    let funded = false;
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 10_000));
      const s = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((x) => x.isSynced)));
      const tn = s.unshielded.balances[unshieldedToken().raw] ?? 0n;
      if (tn > 0n) {
        funded = true;
        balance = tn;
        console.log(`\n  Funded! tNIGHT balance: ${tn.toLocaleString()}\n`);
        break;
      }
      const elapsed = Math.round((Date.now() - start) / 1000);
      process.stdout.write(`\r  ...still waiting (${elapsed}s elapsed)`);
    }
    if (!funded) {
      console.log(`\n  ❌ Funding not received within ${Math.round(timeoutMs / 60_000)} min.`);
      console.log(`  Address: ${address}`);
      console.log(`  Faucet:  ${networkConfig.faucet}`);
      console.log("  Re-run `npm run deploy -- --network preview` after funding — your seed is preserved.\n");
      await walletCtx.wallet.stop();
      process.exit(1);
    }
  }

  console.log("─── DUST Token Setup ───────────────────────────────────────────\n");
  await withTransientRetry("DUST registration", async () => {
    // Re-read fresh state on every attempt so already-registered UTXOs are
    // filtered out (the submit may have landed before the RPC dropped).
    const s = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((st) => st.isSynced)));
    const unregistered = s.unshielded.availableCoins.filter(
      (c: any) => !c.meta?.registeredForDustGeneration,
    );
    if (unregistered.length === 0) {
      console.log("  NIGHT UTXOs already registered for DUST generation.");
      return;
    }
    console.log(`  Registering ${unregistered.length} NIGHT UTXOs for DUST generation...`);
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregistered,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
    console.log("  DUST registration submitted.");
  });

  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  if (dustState.dust.balance(new Date()) === 0n) {
    console.log("  Waiting for DUST tokens...");
    await withTransientRetry("waiting for DUST", () =>
      Rx.firstValueFrom(
        walletCtx.wallet.state().pipe(
          Rx.throttleTime(5000),
          Rx.filter((s) => s.isSynced),
          Rx.filter((s) => s.dust.balance(new Date()) > 0n),
        ),
      ).then(() => undefined),
    );
  }
  console.log("  DUST tokens ready!\n");

  console.log("─── Deploy Contract ────────────────────────────────────────────\n");

  console.log("  Checking proof server...");
  const proofServerReady = await waitForProofServer();
  if (!proofServerReady) {
    console.log("\n  ❌ Proof server not responding. Run: docker compose up -d\n");
    await walletCtx.wallet.stop();
    process.exit(1);
  }
  process.stdout.write("\r  Proof server ready!                                 \n");

  console.log("  Setting up providers...");
  const providers = await createProviders(walletCtx, networkConfig);

  process.stdout.write("  Generating DUST...");
  await new Promise((r) => setTimeout(r, 6000));
  process.stdout.write(" done.\n");

  console.log("  Deploying contract...\n");

  const MAX_RETRIES = 20;
  const RETRY_DELAY_MS = 5000;
  let deployed: Awaited<ReturnType<typeof deployContract>> | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      deployed = await deployContract(providers, {
        compiledContract: compiledContract as any,
        args: [],
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: createCrowdfundingPrivateState(deriveCampaignSecretKey(SEED)),
      });
      break;
    } catch (err: any) {
      const errMsg = err?.message || err?.toString() || "";
      const errCause = err?.cause?.message || err?.cause?.toString() || "";
      const fullError = `${errMsg} ${errCause}`;

      const isDustShortage =
        fullError.includes("Not enough Dust") ||
        fullError.includes("Insufficient Funds") ||
        fullError.includes("could not balance dust");

      if (
        fullError.includes("Failed to connect to Proof Server") ||
        fullError.includes("connect ECONNREFUSED 127.0.0.1:6300")
      ) {
        console.log("  ❌ Proof server unreachable. Run: docker compose up -d\n");
        await walletCtx.wallet.stop();
        process.exit(1);
      }

      const retryable = isDustShortage || isTransientRpcError(err);
      if (!retryable) throw err;

      if (attempt > 1 || !isDustShortage) {
        console.error(`\n  Attempt ${attempt} error: ${errMsg}`);
        if (errCause && errCause !== errMsg) console.error(`  Cause: ${errCause}`);
      }

      if (attempt < MAX_RETRIES) {
        const currentState = await walletCtx.wallet.waitForSyncedState().catch(() => null);
        const dustBalance = currentState ? currentState.dust.balance(new Date()) : 0n;
        const reason = isDustShortage ? "DUST still generating" : "transient RPC error";
        console.log(
          `  ⏳ ${reason} (attempt ${attempt}/${MAX_RETRIES}); retrying in ${RETRY_DELAY_MS / 1000}s...` +
            (isDustShortage ? ` (DUST balance: ${dustBalance.toLocaleString()})` : ""),
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.log(
          `  ❌ Deployment failed after ${MAX_RETRIES} retries (last error: ${errMsg})`,
        );
        await walletCtx.wallet.stop();
        process.exit(1);
      }
    }
  }

  if (!deployed) throw new Error("Deployment failed after all retries");

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log("  ✅ Contract deployed successfully!\n");
  console.log(`  Contract Address: ${contractAddress}\n`);

  recordDeployment(network, contractAddress, address.toString());

  if (noLaunch) {
    console.log("  --no-launch: skipping launchCampaign. Launch it from the DApp");
    console.log("  browser instead — that browser's wallet key becomes the owner.\n");
  } else {
    console.log("─── Launch Campaign ────────────────────────────────────────────\n");
    console.log(`  Title:       ${title}`);
    console.log(`  Description: ${description}`);
    console.log(`  Target:      ${target.toLocaleString()} tNIGHT\n`);
    console.log("  Submitting launchCampaign (proof generation may take a minute)...");
    try {
      // Donations are paid to this wallet's Zswap coin public key (raw bytes).
      const recipient = fromHex(walletCtx.shieldedSecretKeys.coinPublicKey);
      const launchTx = await (deployed as any).callTx.launchCampaign(title, description, target, recipient);
      console.log(`  ✅ Campaign #${launchTx.private.result.toString()} launched. tx: ${launchTx.public.txHash} @ block ${launchTx.public.blockHeight}`);
    } catch (e: any) {
      console.error(`  ⚠ Contract deployed but launchCampaign failed: ${e?.message ?? e}`);
      console.error("    You can relaunch later with: npm run cli (option 1)");
    }
  }

  // Persist the address for the frontend (frontend/.env.local is gitignored).
  try {
    const envLocalPath = path.resolve(__dirname, "..", "frontend", ".env.local");
    fs.writeFileSync(
      envLocalPath,
      `VITE_NETWORK=${network}\nVITE_CONTRACT_ADDRESS=${contractAddress}\nVITE_INDEXER_URL=${networkConfig.indexer}\n`,
    );
    console.log(`\n  Saved VITE_* vars to frontend/.env.local (gitignored).`);
  } catch {
    // non-fatal
  }

  console.log("  Saved to .midnight-state.json\n");

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
  console.log("─── Deployment complete ────────────────────────────────────────\n");
  console.log("  Next: npm run cli\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
