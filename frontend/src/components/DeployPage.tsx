import { useCallback, useEffect, useState } from "react";
import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

import { deployContract } from "../deployContract";
import {
  createConnectedSession,
  detectWallet,
  pollForState,
  type ConnectedSession,
} from "../providers";
import { ShieldIcon, SparkleIcon, ArrowRightIcon } from "./icons";

interface DeployPageProps {
  onNavigateHome?: () => void;
}

export function DeployPage({ onNavigateHome }: DeployPageProps) {
  const [walletInstalled, setWalletInstalled] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [session, setSession] = useState<ConnectedSession | null>(null);

  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [deployedAddress, setDeployedAddress] = useState("");

  useEffect(() => {
    detectWallet().then((w) => setWalletInstalled(w !== null));
  }, []);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      const wallet = await detectWallet();
      if (!wallet) {
        setError("1AM wallet not detected. Please install the 1AM browser extension.");
        return;
      }
      const api: ConnectedAPI = await wallet.connect("preprod");
      const s = await createConnectedSession(api);
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect 1AM wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDeploy = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    setStatusMessage("Deploying Crowdfunding-Midnight contract via 1AM wallet…");
    try {
      const addr = await deployContract(session);
      setStatusMessage("Waiting for contract state to index on Midnight Preprod…");
      
      await pollForState(
        session.config.indexerUri,
        addr,
        (attempt) => setStatusMessage(`Waiting for indexer (attempt ${attempt})…`),
      );

      setDeployedAddress(addr);
      // Automatically store in local storage so the frontend can interact with it
      localStorage.setItem("crowdfunding_contract_address", addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatusMessage("");
    }
  }, [session]);

  const copyAddress = useCallback(() => {
    if (deployedAddress) {
      void navigator.clipboard.writeText(deployedAddress);
      alert("Contract address copied to clipboard!");
    }
  }, [deployedAddress]);

  if (walletInstalled === false) {
    return (
      <div className="card deploy-card text-center" style={{ maxWidth: "600px", margin: "40px auto" }}>
        <div className="placeholder-icon">
          <ShieldIcon />
        </div>
        <h2 className="section-title" style={{ fontSize: "1.5rem" }}>1AM Wallet Required</h2>
        <p className="muted" style={{ marginBottom: "20px" }}>
          Contract deployment requires the <strong>1AM</strong> browser extension for Midnight Network Preprod.
        </p>
        <a
          href="https://1am.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Install 1AM Wallet
        </a>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "720px", margin: "40px auto", padding: "0 20px" }}>
      <div className="section-head text-center">
        <span className="hero-eyebrow" style={{ display: "inline-flex", marginBottom: "12px" }}>
          <SparkleIcon />
          Browser 1AM Deployment · Midnight Preprod
        </span>
        <h1 className="section-title">Deploy Crowdfunding-Midnight Contract</h1>
        <p className="section-sub">
          Deploy a fresh smart contract instance on Midnight Preprod using the 1AM wallet extension.
        </p>
      </div>

      {!session ? (
        <div className="card text-center" style={{ padding: "40px 24px" }}>
          <div className="placeholder-icon" style={{ margin: "0 auto 16px" }}>
            <ShieldIcon />
          </div>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Connect 1AM Wallet</h3>
          <p className="muted" style={{ marginBottom: "24px", fontSize: "0.9rem" }}>
            Connect your 1AM wallet extension set to the <strong>preprod</strong> network to proceed with deployment.
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="btn btn-primary btn-lg"
          >
            {connecting ? "Connecting 1AM Wallet…" : "Connect 1AM Wallet"}
          </button>
        </div>
      ) : (
        <div className="card space-y-6" style={{ padding: "32px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Connected 1AM Wallet
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.9rem", wordBreak: "break-all" }}>
              {session.unshieldedAddress}
            </p>
            <p className="muted" style={{ fontSize: "0.8rem", marginTop: "4px" }}>
              Network: <strong style={{ color: "#a1a1aa" }}>{session.config.networkId}</strong>
            </p>
          </div>

          {!deployedAddress && !busy && (
            <div style={{ marginTop: "24px" }}>
              <button
                onClick={handleDeploy}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Deploy Contract via 1AM Extension
              </button>
            </div>
          )}

          {busy && (
            <div className="text-center" style={{ padding: "24px 0" }}>
              <div className="pulse-indicator" style={{ marginBottom: "12px" }} />
              <p style={{ fontSize: "0.95rem", color: "#e4e4e7" }}>{statusMessage}</p>
            </div>
          )}

          {deployedAddress && (
            <div style={{ marginTop: "24px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ color: "#4ade80", fontSize: "1.1rem", marginBottom: "8px", fontWeight: 600 }}>
                🎉 Contract Deployed Successfully!
              </h3>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
                Your Crowdfunding-Midnight contract is deployed on Midnight Preprod.
              </p>
              
              <div style={{ marginBottom: "16px" }}>
                <label className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Deployed Contract Address
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    readOnly
                    value={deployedAddress}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#09090b",
                      border: "1px solid #27272a",
                      color: "#f4f4f5",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    }}
                  />
                  <button onClick={copyAddress} className="btn btn-ghost" style={{ whiteSpace: "nowrap" }}>
                    Copy Address
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                {onNavigateHome && (
                  <button onClick={onNavigateHome} className="btn btn-primary">
                    Go to Campaigns <ArrowRightIcon />
                  </button>
                )}
                <a
                  href={`https://explorer.midnight.network/contracts/${deployedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  View on Explorer ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: "16px", padding: "14px 16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#f87171", fontSize: "0.85rem" }}>
          <strong>Deployment Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
