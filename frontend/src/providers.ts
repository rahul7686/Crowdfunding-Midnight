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
import { type MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
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
        const serialized = toHex((tx as { serialize(): Uint8Array }).serialize());
        const received = await api.balanceUnsealedTransaction(serialized);
        return Transaction.deserialize(
          "signature",
          "proof",
          "binding",
          fromHex(received.tx),
        );
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
