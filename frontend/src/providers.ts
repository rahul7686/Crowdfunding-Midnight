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

// --- Chain-tip freshness gate ----------------------------------------------
//
// Every transaction is built from state served by the public indexer (see
// `publicDataProvider` below). If the indexer is behind the chain tip — or is
// briefly serving a fork during a re-org — the node rejects the transaction's
// proofs (InvalidProof = custom 115, InvalidDustSpendProof = custom 170), and
// repeated byte-identical resubmissions get the transaction banned by the
// pool. Before building a transaction we therefore wait until the indexer has
// caught up to (and agrees with) the node's canonical chain.

const DEFAULT_NODE_RPC =
  NETWORK_ID === "preprod"
    ? "https://rpc.preprod.midnight.network"
    : "https://rpc.preview.midnight.network";

export const NODE_RPC_URL = import.meta.env.VITE_NODE_RPC_URL ?? DEFAULT_NODE_RPC;

export interface ChainTip {
  height: number;
  hash: string;
}

export interface WaitForCanonicalStateOptions {
  /** How long to keep polling before giving up, in ms. */
  timeoutMs?: number;
  /** Delay between polls, in ms. */
  intervalMs?: number;
  /** How many blocks behind the tip counts as "caught up". */
  tolerance?: number;
  /** Called with a human-readable status while waiting. */
  onStatus?: (status: string) => void;
}

async function rpcNode(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(NODE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`Node RPC error (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) {
    throw new Error(`Node RPC error: ${json.error.message ?? "unknown"}`);
  }
  return json.result;
}

async function queryIndexerBlockAt(height: number): Promise<ChainTip | null> {
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "query($offset: BlockOffset) { block(offset: $offset) { height hash } }",
        variables: { offset: { height } },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { block?: { height: number; hash: string } | null };
    };
    const block = json.data?.block;
    return block ? { height: block.height, hash: block.hash } : null;
  } catch {
    return null;
  }
}

export async function getNodeTip(): Promise<ChainTip> {
  const [header, hash] = (await Promise.all([
    rpcNode("chain_getHeader", []),
    rpcNode("chain_getBlockHash", []),
  ])) as [{ number: string }, string];
  return { height: Number(header.number), hash: String(hash) };
}

/**
 * Waits until the indexer has caught up to the node's canonical chain tip
 * (within `tolerance` blocks) so transactions are built against a state the
 * network will accept. Throws with a clear message if it never converges.
 */
export async function waitForCanonicalState(
  options: WaitForCanonicalStateOptions = {},
): Promise<void> {
  const { timeoutMs = 180_000, intervalMs = 5_000, tolerance = 24 } = options;
  const onStatus = options.onStatus;
  const startedAt = Date.now();
  let lastReported = "";

  const report = (message: string) => {
    if (message !== lastReported) {
      lastReported = message;
      onStatus?.(message);
    }
  };

  for (;;) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `The ${NETWORK_ID} indexer is still behind the chain tip after ` +
          `${Math.round(timeoutMs / 1000)}s. Transactions built on a lagging ` +
          "indexer are rejected by the network (custom errors 115 / 170). " +
          "Wait a few minutes and try again, or check https://status.shielded.tools/preprod.",
      );
    }

    let tip: ChainTip;
    try {
      tip = await getNodeTip();
    } catch {
      report(`Checking the ${NETWORK_ID} node connection…`);
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    // The indexer must have the SAME block as the node at (tip - tolerance):
    // this proves it is close to the tip AND on the same canonical chain, not
    // a lagging or forked view.
    const referenceHeight = tip.height - tolerance;
    let nodeReferenceHash: string;
    try {
      nodeReferenceHash = String(
        await rpcNode("chain_getBlockHash", [`0x${referenceHeight.toString(16)}`]),
      ).replace(/^0x/, "");
    } catch {
      report(`Checking the ${NETWORK_ID} node connection…`);
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    const reference = await queryIndexerBlockAt(referenceHeight);
    if (reference !== null && reference.hash === nodeReferenceHash) {
      report("");
      return;
    }

    report(
      `Waiting for the ${NETWORK_ID} indexer to catch up to the chain tip ` +
        `(more than ${tolerance} blocks behind)…`,
    );
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

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
