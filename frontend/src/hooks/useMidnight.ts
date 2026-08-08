/**
 * useMidnight — DApp Connector wallet hook.
 *
 *   - discovers wallets from window.midnight (Object.values, never a hardcoded
 *     name — wallets are keyed by UUID),
 *   - connects to the configured network (VITE_NETWORK, default `preview`),
 *   - validates the connection: the wallet's reported network must match,
 *   - reads the unshielded address (only what the UI needs),
 *   - exposes connect / disconnect / clearError.
 *
 * No secret key is ever requested or handled here — the DApp Connector keeps
 * all key material inside the wallet extension.
 */

import { useCallback, useEffect, useState } from "react";
import { type ConnectedAPI, type InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

import { NETWORK_ID } from "../providers";

export type ConnectionStatus =
  | { status: "idle" }
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "error" };

export interface MidnightConnection {
  status: ConnectionStatus;
  wallets: InitialAPI[];
  wallet: InitialAPI | null;
  connectedApi: ConnectedAPI | null;
  unshieldedAddress: string | null;
  networkId: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const API_MAJOR_MIN = 4;

/** The DApp Connector API version, e.g. "4.0.1" → 4. */
const apiMajor = (apiVersion: string): number =>
  Number.parseInt(apiVersion.split(".")[0] ?? "", 10);

const isCompatibleWallet = (w: InitialAPI): boolean =>
  Number.isFinite(apiMajor(w.apiVersion)) && apiMajor(w.apiVersion) >= API_MAJOR_MIN;

export const discoverWallets = (): InitialAPI[] => {
  if (typeof window === "undefined" || !window.midnight) return [];
  return Object.values(window.midnight).filter(isCompatibleWallet);
};

const shorten = (address: string): string =>
  address.length <= 20 ? address : `${address.slice(0, 10)}…${address.slice(-8)}`;

export function useMidnight(): MidnightConnection {
  const [wallets, setWallets] = useState<InitialAPI[]>([]);
  const [wallet, setWallet] = useState<InitialAPI | null>(null);
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ status: "idle" });
  const [unshieldedAddress, setUnshieldedAddress] = useState<string | null>(null);
  const [networkId, setNetworkIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wallets inject asynchronously after extension load — re-scan on mount.
    setWallets(discoverWallets());
  }, []);

  const connect = useCallback(async () => {
    setStatus({ status: "connecting" });
    setError(null);
    try {
      const available = discoverWallets();
      if (available.length === 0) {
        throw new Error(
          "No Midnight wallet detected. Install a Midnight wallet extension " +
            "(e.g. Lace Beta) and refresh this page.",
        );
      }

      const selected = available[0];
      setWallet(selected);

      const api = await selected.connect(NETWORK_ID);

      const connection = await api.getConnectionStatus();
      if (connection.status !== "connected") {
        throw new Error("The wallet rejected the connection request.");
      }
      if (connection.networkId !== NETWORK_ID) {
        throw new Error(
          `Network mismatch: your wallet is connected to "${connection.networkId}", ` +
            `but this app needs "${NETWORK_ID}". Switch the network in the wallet and retry.`,
        );
      }

      const config = await api.getConfiguration();
      if (config.networkId && config.networkId !== NETWORK_ID) {
        throw new Error(
          `Network mismatch: the wallet reports "${config.networkId}", but this app ` +
            `needs "${NETWORK_ID}".`,
        );
      }

      const { unshieldedAddress } = await api.getUnshieldedAddress();

      setConnectedApi(api);
      setUnshieldedAddress(unshieldedAddress);
      setNetworkIdState(config.networkId ?? NETWORK_ID);
      setStatus({ status: "connected" });
    } catch (err) {
      setConnectedApi(null);
      setUnshieldedAddress(null);
      setNetworkIdState(null);
      setStatus({ status: "error" });
      setError(err instanceof Error ? err.message : "Could not connect to the wallet.");
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setConnectedApi(null);
    setUnshieldedAddress(null);
    setNetworkIdState(null);
    setError(null);
    setStatus({ status: "idle" });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus({ status: "idle" });
  }, []);

  return {
    status,
    wallets,
    wallet,
    connectedApi,
    unshieldedAddress: unshieldedAddress ? shorten(unshieldedAddress) : null,
    networkId,
    error,
    connect,
    disconnect,
    clearError,
  };
}
