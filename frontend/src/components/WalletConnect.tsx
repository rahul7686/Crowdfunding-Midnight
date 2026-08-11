import { useEffect, useRef } from "react";
import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { useMidnight, CONNECT_REJECTED_MESSAGE } from "../hooks/useMidnight";
import { useToast } from "./Toast";
import {
  notifyConnecting,
  registerConnectHandler,
  registerDisconnectHandler,
  unregisterConnectHandler,
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
    // Never silently re-establish a connection: only run the explicit wallet
    // authorization request when the user clicks Connect Wallet while
    // disconnected.
    if (isConnected) return;
    clearError();
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

  // Bridge for UI chrome outside this card (e.g. the navbar connect button) to
  // request a connection through the same hook-owned logic.
  const connectHandlerRef = useRef(handleConnect);
  connectHandlerRef.current = handleConnect;

  useEffect(() => {
    registerConnectHandler(() => void connectHandlerRef.current());
    return () => unregisterConnectHandler();
  }, []);

  // Bridge for UI chrome outside this card (e.g. the navbar dropdown) to
  // request a disconnect through the same hook-owned logic.
  const disconnectHandlerRef = useRef(handleDisconnect);
  disconnectHandlerRef.current = handleDisconnect;

  useEffect(() => {
    registerDisconnectHandler(() => disconnectHandlerRef.current());
    return () => unregisterDisconnectHandler();
  }, []);

  // Forward the connecting state so the navbar button can show progress and
  // disable itself while the wallet prompt is open.
  useEffect(() => {
    notifyConnecting(status.status === "connecting");
    return () => notifyConnecting(false);
  }, [status.status]);

  // Surface connection failures (triggered from the card or the navbar) through
  // the toast system, on top of the inline error box. A declined/cancelled
  // authorization request gets a softer title than a real failure.
  const prevStatus = useRef(status.status);
  useEffect(() => {
    if (status.status === "error" && prevStatus.current !== "error" && error) {
      toast.error(
        error === CONNECT_REJECTED_MESSAGE
          ? "Connection not established"
          : "Wallet connection failed",
        error,
      );
    }
    prevStatus.current = status.status;
  }, [status, error, toast]);

  const handleRetry = () => {
    clearError();
    void handleConnect();
  };

  // When connected, the navbar wallet profile is the only place that shows
  // connected wallet info and the disconnect action, so this card is hidden.
  if (isConnected) {
    return null;
  }

  return (
    <section className="card wallet-connect-card">
      <div className="wallet-connect-row">
        <p className="wallet-connect-text">
          Connect your wallet to launch or donate privately.
        </p>
        <div className="wallet-connect-actions">
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
      {noWallet && (
        <p className="error-text wallet-connect-error">
          No Midnight wallet detected. Install a Midnight wallet extension
          (e.g. Lace Beta) and refresh this page.
        </p>
      )}
      {status.status === "error" && error && (
        <p className="error-text wallet-connect-error">{error}</p>
      )}
    </section>
  );
}
