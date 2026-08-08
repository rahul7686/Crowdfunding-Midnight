import { useEffect, useRef } from "react";
import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { useMidnight } from "../hooks/useMidnight";
import { useToast } from "./Toast";
import {
  registerDisconnectHandler,
  unregisterDisconnectHandler,
} from "../utils/connectionController";

interface WalletConnectProps {
  onConnected: (api: ConnectedAPI) => void;
  onDisconnected: () => void;
}

// Dedupe the "Wallet connected" toast across React StrictMode remounts (the
// same ConnectedAPI instance is propagated on both mounts).
const toastedApis = new WeakSet<ConnectedAPI>();

export function WalletConnect({ onConnected, onDisconnected }: WalletConnectProps) {
  const {
    status,
    wallets,
    wallet,
    connectedApi,
    unshieldedAddress,
    networkId,
    error,
    connect,
    disconnect,
    clearError,
  } = useMidnight();
  const toast = useToast();

  const isConnected = status.status === "connected" && connectedApi !== null;
  const isConnecting = status.status === "connecting";
  const noWallet = wallets.length === 0 && !isConnected && !isConnecting;

  const handleConnect = async () => {
    await connect();
  };

  // Propagate the connected API to the parent. It cannot be read from the
  // closure inside handleConnect above: `connect()` updates state, but the
  // click handler still sees the pre-connection (null) value, so reading
  // `connectedApi` there is always stale. Firing from an effect guarantees the
  // parent receives the API and renders Campaign once the wallet is connected.
  useEffect(() => {
    if (connectedApi) {
      onConnected(connectedApi);
      if (!toastedApis.has(connectedApi)) {
        toastedApis.add(connectedApi);
        toast.success("Wallet connected", `Connected to ${wallet?.name ?? "your Midnight wallet"}.`);
      }
    }
  }, [connectedApi, onConnected, wallet?.name, toast]);

  const handleDisconnect = () => {
    disconnect();
    onDisconnected();
    toast.info("Wallet disconnected", "You are now browsing without a wallet.");
  };

  // Bridge for UI chrome outside this card (e.g. the navbar dropdown) to
  // request a disconnect through the same hook-owned logic.
  const disconnectHandlerRef = useRef(handleDisconnect);
  disconnectHandlerRef.current = handleDisconnect;

  useEffect(() => {
    registerDisconnectHandler(() => disconnectHandlerRef.current());
    return () => unregisterDisconnectHandler();
  }, []);

  const handleRetry = () => {
    clearError();
    void handleConnect();
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2>Wallet</h2>
        {networkId && (
          <span className="badge">
            <span className="badge-dot" />
            {networkId}
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="wallet-connected">
          <p className="connected-line">
            Connected to <strong>{wallet?.name ?? "Midnight wallet"}</strong>
          </p>
          <p className="address" title={unshieldedAddress ?? undefined}>
            {unshieldedAddress}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-prompt">
          <p>
            Connect a Midnight wallet on the <strong>{networkId ?? "preview"}</strong>{" "}
            network to launch a campaign, donate privately, or close a campaign.
          </p>
          {noWallet && (
            <p className="error-text">
              No Midnight wallet detected. Install a Midnight wallet extension
              (e.g. Lace Beta) and refresh this page.
            </p>
          )}
          {status.status === "error" && error && (
            <p className="error-text">{error}</p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="btn-busy">
                  <span className="spinner" />
                  <span>Connecting…</span>
                </span>
              ) : (
                "Connect Wallet"
              )}
            </button>
            {status.status === "error" && (
              <button type="button" className="btn btn-secondary" onClick={clearError}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
