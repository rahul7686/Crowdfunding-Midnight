/**
 * Check the CLI wallet's NIGHT + DUST balance on the active network.
 */
import { WebSocket } from "ws";

import { resolveNetwork, getOrCreateWallet } from "./network";
import { createWallet, unshieldedToken } from "./wallet";

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

async function main() {
  const { network, config } = resolveNetwork();
  const WALLET = getOrCreateWallet(network);
  const seed = WALLET.seed;

  console.log(`\nChecking balance on ${network}...`);
  const walletCtx = await createWallet({ network, networkConfig: config, seed });
  await walletCtx.wallet.waitForSyncedState();

  const state = await walletCtx.wallet.state().toPromise();
  if (!state) throw new Error("Wallet returned no state; sync did not complete.");
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dustBalance = state.dust.balance(new Date());

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  console.log(`\n  Wallet address: ${address}`);
  console.log(`  tNight: ${balance.toLocaleString()}`);
  console.log(`  DUST: ${dustBalance.toLocaleString()}\n`);

  if (balance === 0n && network !== "undeployed" && config.faucet) {
    console.log(`  ⚠ No tNight. Fund from the faucet: ${config.faucet}`);
    console.log(`     Wallet address: ${address}\n`);
  }

  await walletCtx.wallet.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
