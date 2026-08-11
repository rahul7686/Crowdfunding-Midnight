/**
 * Builds the MidnightProviders object that connects the deployed contract to
 * the browser via the DApp Connector wallet:
 *
 *   - private state        → encrypted local store (browser IndexedDB)
 *   - public state         → the Preview indexer (GraphQL)
 *   - zk artifacts         → FetchZkConfigProvider (served from /contracts)
 *   - proving              → DELEGATED TO THE WALLET (DApp Connector
 *                            `getProvingProvider`) — the wallet proves the
 *                            circuit, so the private witnesses never leave
 *                            the browser
 *   - balancing + signing  → wallet (`balanceUnsealedTransaction`)
 *   - submission           → wallet relayer (`submitTransaction`)
 *
 * The donation amount and the campaign secret key live ONLY in the private
 * state / witnesses. They are never part of the provider config below.
 */

import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CostModel, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { type MidnightProviders, type UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";

import { type CrowdfundingPrivateState } from "./witnesses";

export const NETWORK_ID = import.meta.env.VITE_NETWORK ?? "preview";
export const INDEXER_URL =
  import.meta.env.VITE_INDEXER_URL ??
  "https://indexer.preview.midnight.network/api/v4/graphql";
export const INDEXER_WS_URL =
  import.meta.env.VITE_INDEXER_WS_URL ??
  "wss://indexer.preview.midnight.network/api/v4/graphql/ws";

export const PRIVATE_STATE_ID = "crowdfundingPrivateState";
export const PRIVATE_STATE_PASSWORD =
  "Crowdfunding-DApp-Preview-Bootcamp-2026";

// Circuit names in the compiled contract — used to type the ZK config provider.
export type CircuitKeys = "launchCampaign" | "donate" | "closeCampaign";

export type Providers = MidnightProviders<
  CircuitKeys,
  typeof PRIVATE_STATE_ID,
  CrowdfundingPrivateState
>;

export interface WalletKeys {
  coinPublicKey: string;
  encryptionPublicKey: string;
}

export const makePrivateStateProvider = (accountId: string) =>
  levelPrivateStateProvider<typeof PRIVATE_STATE_ID, CrowdfundingPrivateState>({
    accountId,
    privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
  });

// --- Balancing diagnostics --------------------------------------------------
//
// The 1AM wallet surfaces a cryptic "Balance failed: Insufficient funds" when
// `balanceUnsealedTransaction` cannot fund the transaction's shielded (Zswap)
// section. Because the donate() circuit creates a *shielded* tNIGHT coin, the
// wallet must pay for it out of its *shielded* coin pool — unshielded tNIGHT
// (e.g. from the faucet) cannot fund it. The helpers below log the exact
// transaction + the wallet's shielded/unshielded split, and re-word the error
// with the actual deficit.

// The native token's raw color is 32 zero bytes, so its hex TokenType is an
// all-zero string. Every other (non-native) color is a non-zero hex string.
const IS_NATIVE = (type: string): boolean => /^0+$/.test(type);

// The ledger's `TokenType` is a tagged union ({ tag: 'shielded', raw: hex });
// the dapp-connector API uses the bare hex `raw`. Normalise so we can compare.
function imbalanceKeyToHex(type: unknown): string | null {
  if (typeof type === "string") return type;
  if (type !== null && typeof type === "object") {
    const { tag, raw } = type as { tag?: string; raw?: string };
    if ((tag === "shielded" || tag === "unshielded") && typeof raw === "string") {
      return raw;
    }
  }
  return null;
}

function nativeBalance(record: Record<string, bigint>): bigint {
  return Object.entries(record).find(([type]) => IS_NATIVE(type))?.[1] ?? 0n;
}

function describeImbalances(
  unproven: UnboundTransaction,
): Record<string, string> {
  return Object.fromEntries(
    Array.from(unproven.imbalances(0).entries()).map(([type, value]) => {
      const hex = imbalanceKeyToHex(type);
      const label =
        hex === null
          ? "dust / other"
          : IS_NATIVE(hex)
            ? "tNIGHT (native)"
            : `${hex.slice(0, 10)}…`;
      return [label, value.toString()];
    }),
  );
}

async function logBalancingContext(
  api: ConnectedAPI,
  unproven: UnboundTransaction,
): Promise<void> {
  try {
    const [shielded, unshielded, dust] = await Promise.all([
      api.getShieldedBalances(),
      api.getUnshieldedBalances(),
      api.getDustBalance(),
    ]);
    const imbalances = describeImbalances(unproven);
    const nativeImbalance = Object.entries(imbalances).find(([label]) =>
      label.startsWith("tNIGHT"),
    );
    console.debug("[crowdfunding:balanceTx] wallet funds", {
      shielded: shielded,
      unshielded: unshielded,
      dust: dust.balance.toString(),
    });
    console.debug("[crowdfunding:balanceTx] unproven transaction", {
      guaranteedInputs: unproven.guaranteedOffer?.inputs.length ?? 0,
      guaranteedOutputs: (unproven.guaranteedOffer?.outputs ?? []).map(
        (output) => ({
          toCoinPublicKey: (output as unknown as { coinPublicKey: string })
            .coinPublicKey,
          commitment: output.commitment,
        }),
      ),
      fallibleSections: unproven.fallibleOffer
        ? Array.from(unproven.fallibleOffer.keys())
        : [],
      imbalances,
    });
    if (nativeImbalance) {
      console.debug(
        "[crowdfunding:balanceTx] native deficit vs balances",
        nativeImbalance[0],
        {
          needed: nativeImbalance[1],
          shieldedTnight: nativeBalance(shielded),
          unshieldedTnight: nativeBalance(unshielded),
        },
      );
    }
  } catch (err) {
    console.debug("[crowdfunding:balanceTx] could not inspect wallet/tx", err);
  }
}

async function rewordInsufficientFunds(
  api: ConnectedAPI,
  unproven: UnboundTransaction,
  err: unknown,
): Promise<Error> {
  const raw = err instanceof Error ? err.message : String(err);
  if (!/insufficient|not enough|funds/i.test(raw)) {
    return err instanceof Error ? err : new Error(String(err));
  }
  try {
    const [shielded, unshielded] = await Promise.all([
      api.getShieldedBalances(),
      api.getUnshieldedBalances(),
    ]);
    const nativeImbalance = Array.from(unproven.imbalances(0).entries()).find(
      ([type]) => {
        const hex = imbalanceKeyToHex(type);
        return hex !== null && IS_NATIVE(hex);
      },
    );
    const shieldedTnight = nativeBalance(shielded);
    const unshieldedTnight = nativeBalance(unshielded);
    const needed = nativeImbalance ? (nativeImbalance[1] < 0n ? -nativeImbalance[1] : nativeImbalance[1]) : null;
    const detail =
      needed !== null
        ? `This transaction needs ${needed} of shielded tNIGHT; your wallet currently holds ${shieldedTnight} shielded / ${unshieldedTnight} unshielded tNIGHT.`
        : `Your wallet currently holds ${shieldedTnight} shielded / ${unshieldedTnight} unshielded tNIGHT.`;
    return new Error(
      `Insufficient shielded funds to balance this transaction. ${detail} ` +
        "Donations pay out a private (shielded) tNIGHT coin, so the amount must sit " +
        "in your wallet's shielded balance, not only its public (unshielded) balance.",
    );
  } catch {
    return err instanceof Error ? err : new Error(String(err));
  }
}

export async function buildProviders(
  api: ConnectedAPI,
  keys: WalletKeys,
  accountId: string,
): Promise<Providers> {
  setNetworkId(NETWORK_ID);

  // The SDK calls `this.fetchFunc(...)`, i.e. as a method. When fetchFunc is
  // the raw `window.fetch` (what cross-fetch re-exports), Chrome throws
  // "Failed to execute 'fetch' on 'Window': Illegal invocation" because `this`
  // is the provider instead of the Window. Binding to `window` fixes it.
  const zkConfigProvider = new FetchZkConfigProvider<CircuitKeys>(
    `${window.location.origin}/contracts`,
    (input, init) => window.fetch(input, init),
  );

  // Proving is delegated to the wallet. The wallet pulls the prover keys from
  // the zkConfigProvider and generates the zero-knowledge proof locally (or via
  // the proof server the wallet user has configured). The DApp never sees the
  // witness values — they only ever live inside the circuit preimage.
  const proofProvider = await dappConnectorProofProvider(
    api,
    zkConfigProvider,
    CostModel.initialCostModel(),
  );

  return {
    privateStateProvider: makePrivateStateProvider(accountId),
    publicDataProvider: indexerPublicDataProvider(
      INDEXER_URL,
      INDEXER_WS_URL,
      // The provider's type is the Node `ws` implementation; in the browser we
      // pass the native one, which graphql-ws accepts at runtime.
      WebSocket as never,
    ),
    zkConfigProvider,
    proofProvider,
    walletProvider: {
      getCoinPublicKey: () => keys.coinPublicKey,
      getEncryptionPublicKey: () => keys.encryptionPublicKey,
      async balanceTx(tx: unknown, _ttl?: Date) {
        const unproven = tx as UnboundTransaction;
        const serialized = toHex(unproven.serialize());

        void logBalancingContext(api, unproven);

        try {
          const received = await api.balanceUnsealedTransaction(serialized);
          return Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            fromHex(received.tx),
          );
        } catch (err) {
          throw await rewordInsufficientFunds(api, unproven, err);
        }
      },
    },
    midnightProvider: {
      async submitTx(tx: unknown): Promise<string> {
        await api.submitTransaction(toHex((tx as { serialize(): Uint8Array }).serialize()));
        const identifiers = (tx as { identifiers?(): readonly string[] }).identifiers?.();
        return identifiers?.[0] ?? "";
      },
    },
  };
}
