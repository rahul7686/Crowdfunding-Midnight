import { useCallback, useEffect, useState } from "react";

import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { WalletConnect } from "./components/WalletConnect";
import { Campaign } from "./components/Campaign";
import { PrivacySection } from "./components/PrivacySection";
import { HowItWorks } from "./components/HowItWorks";
import { Footer } from "./components/Footer";
import { ShieldIcon } from "./components/icons";
import type { CampaignStats } from "./types";
import { requestWalletDisconnect } from "./utils/connectionController";

function App() {
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // Read-only wallet metadata for the navbar indicator. This uses the same
  // connected API (no separate connection system) and only reads non-private
  // fields; failures are non-fatal.
  useEffect(() => {
    let cancelled = false;
    if (!connectedApi) {
      setNetworkId(null);
      setAddress(null);
      return;
    }
    (async () => {
      try {
        const [configuration, { unshieldedAddress }] = await Promise.all([
          connectedApi.getConfiguration(),
          connectedApi.getUnshieldedAddress(),
        ]);
        if (!cancelled) {
          setNetworkId(configuration.networkId);
          setAddress(unshieldedAddress);
        }
      } catch {
        // Non-fatal: the navbar shows generic labels when metadata is unknown.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectedApi]);

  const handleDisconnected = useCallback(() => {
    setConnectedApi(null);
    setCampaignStats(null);
  }, []);

  return (
    <div className="app">
      <Navbar
        connected={connectedApi !== null}
        networkId={networkId}
        address={address}
        onDisconnect={requestWalletDisconnect}
      />

      <main className="app-main">
        <Hero />
        <Stats stats={campaignStats} />

        <section className="section campaign-section" id="campaign">
          <div className="section-head">
            <h2 className="section-title">Campaigns</h2>
            <p className="section-sub">
              Explore, support, or launch a private campaign on the Midnight Network.
            </p>
          </div>

          <WalletConnect onConnected={setConnectedApi} onDisconnected={handleDisconnected} />

          {connectedApi ? (
            <Campaign api={connectedApi} onCampaignState={setCampaignStats} />
          ) : (
            <div className="card placeholder-card">
              <div className="placeholder-icon">
                <ShieldIcon />
              </div>
              <h3 className="placeholder-title">Connect your wallet to get started</h3>
              <p className="muted placeholder-text">
                Once connected on the <strong className="placeholder-strong">preprod</strong>{" "}
                network you can launch a campaign, donate with a private amount, or close a
                campaign you own.
              </p>
            </div>
          )}
        </section>

        <PrivacySection />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}

export default App;
