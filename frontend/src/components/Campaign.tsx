/**
 * Campaigns — the core privacy feature.
 *
 * A single deployed contract instance hosts MULTIPLE campaigns simultaneously,
 * each keyed by an id in the on-chain `campaigns` map. This component:
 *   - lists every campaign (title, status, progress, owner pseudonym),
 *   - lets the user select one to view / donate to / close,
 *   - submits circuit calls (launchCampaign / donate / closeCampaign) through
 *     the DApp Connector wallet, addressed to the selected campaign.
 *
 * PRIVACY GUARANTEES ENFORCED HERE:
 *   - The donation amount is written ONLY into the private witness state
 *     (`pendingDonation`), used to build the zero-knowledge proof, and dropped
 *     to 0 in the `finally` block. It is never rendered, never logged, and
 *     never survives beyond the call.
 *   - The campaign secret key (owner identity) lives only in the encrypted
 *     local private-state store. Its one-way hash is the only thing that ever
 *     appears on-chain.
 *   - Every privacy-sensitive action is labelled
 *     "Proved without revealing your input".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { fromHex, parseCoinPublicKeyToHex, toHex } from "@midnight-ntwrk/midnight-js-utils";

import { CampaignStatus, CompiledCrowdfundingContract, ledger } from "../contract";
import { formatTNight, NIGHT_DECIMALS } from "../format";
import {
  buildProviders,
  NETWORK_ID,
  PRIVATE_STATE_ID,
  waitForCanonicalState,
  type Providers,
} from "../providers";
import type { CampaignStats } from "../types";
import { type CrowdfundingPrivateState } from "../witnesses";
import { friendlyError } from "../utils/errors";
import { ConfirmModal } from "./ConfirmModal";
import { DonationModal } from "./DonationModal";
import { LaunchModal } from "./LaunchModal";
import { useToast } from "./Toast";
import { CampaignDropdown } from "./CampaignDropdown";
import { RocketIcon, UserIcon } from "./icons";
import { TransactionReceipt, type TxReceiptData } from "./TransactionReceipt";
import { pureCircuits } from "../contracts/index.js";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
const POLL_MS = 8_000;

// The salt the contract uses to derive the owner pseudonym:
//   owner = publicKey(secretKey, "owner" || 0x00…)
const OWNER_SALT = new Uint8Array(32);
OWNER_SALT.set([111, 119, 110, 101, 114]); // "owner"

const randomBytes = (length: number): Uint8Array => {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
};

type TxReceipt = TxReceiptData;

type CampaignData = {
  id: bigint;
  status: CampaignStatus;
  title: string | null;
  description: string | null;
  target: bigint;
  raised: bigint;
  donationsCount: bigint;
  sequence: bigint;
  owner: Uint8Array;
  recipient: Uint8Array;
};

export function Campaign({
  api,
  onCampaignState,
}: {
  api: ConnectedAPI;
  onCampaignState?: (stats: CampaignStats | null) => void;
}) {
  const toast = useToast();
  const [contractAddress] = useState<string>(CONTRACT_ADDRESS);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [contract, setContract] = useState<Awaited<ReturnType<typeof findDeployedContract>> | null>(null);
  const [busy, setBusy] = useState<null | "launch" | "donate" | "close">(null);
  const [txReceipt, setTxReceipt] = useState<TxReceipt | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  // Launch form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [launchOpen, setLaunchOpen] = useState(false);

  // Donation modal
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationStage, setDonationStage] = useState(0);
  const [donationError, setDonationError] = useState<string | null>(null);

  // Ownership + close confirmation (evaluated for the selected campaign)
  const [isOwner, setIsOwner] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const providersRef = useRef<Providers | null>(null);
  // Raw 32-byte Zswap coin public key of this browser's wallet, captured at
  // connect time and used as the donation recipient when launching a campaign.
  const walletCoinPublicKeyRef = useRef<Uint8Array | null>(null);
  // Presentation-only: report a non-private aggregate snapshot of the on-chain
  // campaigns to the stats bar whenever refreshed data arrives.
  const onCampaignStateRef = useRef(onCampaignState);

  useEffect(() => {
    onCampaignStateRef.current = onCampaignState;
  }, [onCampaignState]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;
  const selectedActive = selected?.status === CampaignStatus.ACTIVE;

  const readCampaigns = useCallback((stateData: Parameters<typeof ledger>[0]): CampaignData[] => {
    const l = ledger(stateData);
    const out: CampaignData[] = [];
    for (const [id, entry] of l.campaigns) {
      out.push({
        id,
        status: entry.status,
        title: entry.title.is_some ? entry.title.value : null,
        description: entry.description.is_some ? entry.description.value : null,
        target: entry.target,
        raised: entry.raised,
        donationsCount: entry.donationsCount,
        sequence: entry.sequence,
        owner: entry.owner,
        recipient: entry.recipient,
      });
    }
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out;
  }, []);

  const refreshCampaigns = useCallback(
    async (prov: Providers | null, address: string) => {
      if (!prov) return;
      const state = await prov.publicDataProvider.queryContractState(address);
      if (!state) {
        setCampaigns([]);
        setSelectedId(null);
        onCampaignStateRef.current?.(null);
        return;
      }
      const next = readCampaigns(state.data);
      setCampaigns(next);
      // Keep an existing selection when possible; otherwise default to the
      // first active campaign (or simply the first one).
      setSelectedId((current) => {
        if (current !== null && next.some((c) => c.id === current)) return current;
        const fallback =
          next.find((c) => c.status === CampaignStatus.ACTIVE) ?? next[0] ?? null;
        return fallback ? fallback.id : null;
      });
      onCampaignStateRef.current?.({
        totalCampaigns: next.length,
        activeCampaigns: next.filter((c) => c.status === CampaignStatus.ACTIVE).length,
        totalRaised: next.reduce((sum, c) => sum + c.raised, 0n),
        totalDonations: next.reduce((sum, c) => sum + c.donationsCount, 0n),
      });
    },
    [readCampaigns],
  );

  // Connect providers + contract once the wallet is connected.
  useEffect(() => {
    let cancelled = false;
    if (!api || !contractAddress) return;

    (async () => {
      setLoadingState(true);
      setActionError(null);
      try {
        const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
          await api.getShieldedAddresses();
        const { unshieldedAddress } = await api.getUnshieldedAddress();

        // The wallet reports the coin public key as a Bech32m string; the
        // contract expects the raw 32 bytes so coins can actually be claimed
        // by the owner's wallet.
        walletCoinPublicKeyRef.current = fromHex(
          parseCoinPublicKeyToHex(shieldedCoinPublicKey, NETWORK_ID),
        );

        const prov = await buildProviders(
          api,
          {
            coinPublicKey: shieldedCoinPublicKey,
            encryptionPublicKey: shieldedEncryptionPublicKey,
          },
          unshieldedAddress,
        );
        if (cancelled) return;
        providersRef.current = prov;
        setProviders(prov);

        // Persist a stable campaign secret key on first use. It never leaves
        // the encrypted local store.
        prov.privateStateProvider.setContractAddress(contractAddress);
        const existing = await prov.privateStateProvider.get(PRIVATE_STATE_ID);
        const initialPrivateState: CrowdfundingPrivateState = existing
          ? existing
          : { secretKey: randomBytes(32), pendingDonation: 0n };

        const found = await findDeployedContract(prov, {
          // TS cannot unify the asset-path generic; the compiled contract is
          // identical to the one `npm run deploy` uses on the CLI.
          compiledContract: CompiledCrowdfundingContract as never,
          contractAddress,
          privateStateId: PRIVATE_STATE_ID,
          initialPrivateState,
        });
        if (cancelled) return;
        setContract(found);
        await refreshCampaigns(prov, contractAddress);
      } catch (err) {
        if (!cancelled) {
          setActionError(
            err instanceof Error
              ? `Could not connect to the contract: ${err.message}`
              : "Could not connect to the contract.",
          );
        }
      } finally {
        if (!cancelled) setLoadingState(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, contractAddress, refreshCampaigns]);

  // Poll the indexer for live campaign state.
  useEffect(() => {
    if (!providers || !contractAddress) return;
    const id = window.setInterval(
      () => void refreshCampaigns(providersRef.current, contractAddress),
      POLL_MS,
    );
    return () => window.clearInterval(id);
  }, [providers, contractAddress, refreshCampaigns]);

  // Determine whether THIS browser is the owner of the SELECTED campaign,
  // using only the existing contract state: the on-chain owner is the one-way
  // hash of the browser's secret key, so we recompute it with the same pure
  // circuit the contract uses and compare. Never treated as a security
  // boundary — the contract still enforces ownership on-chain.
  useEffect(() => {
    if (!selected || !providers) {
      setIsOwner(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const privateState = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
        if (!privateState || cancelled) {
          if (!cancelled) setIsOwner(false);
          return;
        }
        const expectedOwner = pureCircuits.publicKey(privateState.secretKey, OWNER_SALT);
        if (!cancelled) setIsOwner(toHex(expectedOwner) === toHex(selected.owner));
      } catch {
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, providers]);

  const requireContract = ():
    | { prov: Providers; contract: NonNullable<typeof contract> }
    | null => {
    if (!providers || !contract) {
      setActionError("Contract not connected yet — wait for the connection to finish.");
      return null;
    }
    return { prov: providers, contract };
  };

  const handleLaunch = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setTxReceipt(null);
    setSyncNote(null);
    const ctx = requireContract();
    if (!ctx) return;
    const { prov, contract } = ctx;

    const targetAmount = BigInt(target || "0") * NIGHT_DECIMALS;
    if (!title.trim() || targetAmount <= 0n) {
      setActionError("Please provide a title and a funding target greater than zero.");
      return;
    }

    setBusy("launch");
    try {
      // Wait for the indexer to agree with the node's canonical chain before
      // building the proof: proofs built on a lagging/forked indexer are
      // rejected by the network (custom errors 115 / 170).
      await waitForCanonicalState({ onStatus: setSyncNote });
      setSyncNote(null);
      const recipientBytes = walletCoinPublicKeyRef.current;
      if (!recipientBytes) {
        setActionError(
          "Wallet coin public key is not available — reconnect the wallet and try again.",
        );
        return;
      }
      const result = await contract.callTx.launchCampaign(
        title.trim(),
        description.trim(),
        targetAmount,
        recipientBytes,
      );
      const newId = result.private.result;
      setTxReceipt({
        kind: "launch",
        campaignId: newId,
        txHash: result.public.txHash,
        blockHeight: result.public.blockHeight,
      });
      await refreshCampaigns(prov, contractAddress);
      setSelectedId(newId);
      setTitle("");
      setDescription("");
      setTarget("");
      setLaunchOpen(false);
      toast.success("Campaign launched", `Campaign #${newId.toString()} is now live and accepting private donations.`);
    } catch (err) {
      const message = friendlyError(err, "launch");
      setActionError(message);
      toast.error("Launch failed", message);
    } finally {
      setSyncNote(null);
      setBusy(null);
    }
  };

  const runDonation = async (donation: bigint) => {
    setActionError(null);
    setTxReceipt(null);
    setDonationError(null);
    setSyncNote(null);
    const ctx = requireContract();
    if (!ctx) return;
    const { prov, contract } = ctx;
    if (selectedId === null) {
      setDonationError("Select a campaign to donate to first.");
      return;
    }

    if (donation <= 0n) {
      setDonationError("Enter a donation amount greater than zero.");
      return;
    }

    // Stage 1 — preparing the private proof.
    setDonationStage(1);
    setBusy("donate");
    try {
      // Wait for the indexer to agree with the node's canonical chain so the
      // proof is built against state the network will accept.
      await waitForCanonicalState({ onStatus: setSyncNote });
      setSyncNote(null);
      // Re-read the selected campaign's aggregate fresh from the indexer so the
      // proof constraint (newTotal == raised + amount) is built against current
      // state.
      const state = await prov.publicDataProvider.queryContractState(contractAddress);
      const l = state ? ledger(state.data) : null;
      if (!l || !l.campaigns.member(selectedId)) {
        setDonationError("The campaign no longer exists — select another campaign.");
        return;
      }
      const entry = l.campaigns.lookup(selectedId);
      if (entry.status !== CampaignStatus.ACTIVE) {
        setDonationError("The campaign is not active — you cannot donate right now.");
        return;
      }
      const newTotal = entry.raised + donation;
      if (newTotal > entry.target) {
        setDonationError(
          "This donation would exceed the remaining funding target. Try a smaller amount.",
        );
        return;
      }

      // Stage 2 — generating the ZK proof.
      setDonationStage(2);
      // The amount enters the proof ONLY via the private witness state, set
      // right before the call. It is never rendered or logged by this app.
      const psp = prov.privateStateProvider;
      const current = await psp.get(PRIVATE_STATE_ID);
      if (current) {
        await psp.set(PRIVATE_STATE_ID, { ...current, pendingDonation: donation });
      } else {
        await psp.set(PRIVATE_STATE_ID, {
          secretKey: randomBytes(32),
          pendingDonation: donation,
        });
      }

      const result = await contract.callTx.donate(selectedId, newTotal);

      // Stage 3 — transaction submitted.
      setDonationStage(3);
      setTxReceipt({
        kind: "donate",
        campaignId: selectedId,
        receipt: result.private.result,
        txHash: result.public.txHash,
        blockHeight: result.public.blockHeight,
      });

      // Stage 4 — confirming on the network.
      setDonationStage(4);
      await refreshCampaigns(prov, contractAddress);

      // Stage 5 — success.
      setDonationStage(5);
      toast.success("Donation successful", "Your private donation was submitted and verified on-chain.");
    } catch (err) {
      const message = friendlyError(err, "donate");
      setDonationError(message);
      toast.error("Donation failed", message);
      setDonationStage(0);
    } finally {
      // Drop the pending amount immediately — it must never persist.
      try {
        const psp = prov.privateStateProvider;
        const p = await psp.get(PRIVATE_STATE_ID);
        if (p) await psp.set(PRIVATE_STATE_ID, { ...p, pendingDonation: 0n });
      } catch {
        // non-fatal
      }
      setSyncNote(null);
      setBusy(null);
    }
  };

  const handleClose = async () => {
    setActionError(null);
    setTxReceipt(null);
    setSyncNote(null);
    const ctx = requireContract();
    if (!ctx) return;
    const { prov, contract } = ctx;
    if (selectedId === null) return;

    setBusy("close");
    try {
      await waitForCanonicalState({ onStatus: setSyncNote });
      setSyncNote(null);
      const result = await contract.callTx.closeCampaign(selectedId);
      setTxReceipt({
        kind: "close",
        campaignId: selectedId,
        txHash: result.public.txHash,
        blockHeight: result.public.blockHeight,
      });
      await refreshCampaigns(prov, contractAddress);
      setConfirmCloseOpen(false);
      toast.success("Campaign closed", "The campaign is now closed. Final aggregates remain on-chain.");
    } catch (err) {
      const message = friendlyError(err, "close");
      setActionError(message);
      toast.error("Close failed", message);
    } finally {
      setSyncNote(null);
      setBusy(null);
    }
  };

  const progressPct = useMemo(() => {
    if (!selected || selected.target === 0n) return 0;
    const pct = Number((selected.raised * 100n) / selected.target);
    return Math.min(pct, 100);
  }, [selected]);

  const activeCount = campaigns.filter((c) => c.status === CampaignStatus.ACTIVE).length;

  if (!contractAddress) {
    return (
      <section className="card">
        <div className="card-header">
          <h2>Campaigns</h2>
        </div>
        <p className="error-text">
          No contract configured. Set <code>VITE_CONTRACT_ADDRESS</code> in{" "}
          <code>frontend/.env.local</code> (see <code>.env.example</code>).
        </p>
      </section>
    );
  }

  if (loadingState && campaigns.length === 0) {
    return (
      <section className="card">
        <div className="card-header">
          <h2>Campaigns</h2>
        </div>
        <div className="campaign-skeleton" aria-busy="true" aria-label="Loading campaigns">
          <div className="skeleton skeleton-line skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton-row">
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
          </div>
          <div className="skeleton skeleton-bar" />
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Campaigns</h2>
        <div className="card-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-launch"
            disabled={busy !== null}
            onClick={() => {
              setActionError(null);
              setLaunchOpen(true);
            }}
          >
            <RocketIcon />
            Launch Campaign
          </button>
          <span className="badge">
            {campaigns.length === 0 ? (
              "NO CAMPAIGNS"
            ) : (
              <>
                <span className={`badge-dot ${activeCount > 0 ? "dot-active" : "dot-closed"}`} />
                {campaigns.length} total · {activeCount} active
              </>
            )}
          </span>
        </div>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      {syncNote && <p className="muted">{syncNote}</p>}

      {campaigns.length > 0 && (
        <div className="campaign-picker">
          <label className="campaign-picker-label" id="campaign-picker-label">
            Selected campaign
          </label>
          <CampaignDropdown
            options={campaigns.map((c) => ({
              id: c.id,
              status: c.status,
              title: c.title,
            }))}
            value={selectedId}
            labelId="campaign-picker-label"
            disabled={busy !== null}
            onChange={(next) => {
              setSelectedId(next);
              setActionError(null);
            }}
          />
        </div>
      )}

      {selected?.title ? (
        <div className="campaign-view">
          <h3 className="campaign-title">{selected.title}</h3>
          <span className="badge badge-tag">
            <span className={`badge-dot ${selectedActive ? "dot-active" : "dot-closed"}`} />
            Campaign #{selected.id.toString()} · {selectedActive ? "ACTIVE" : "CLOSED"}
          </span>
          {selected.description && (
            <p className="campaign-description">{selected.description}</p>
          )}

          <div className="amounts">
            <div className="amounts-item">
              <span className="amounts-label">Raised</span>
              <strong className="raised">{formatTNight(selected.raised)}</strong>
              <span className="amounts-unit">tNIGHT</span>
            </div>
            <div className="amounts-item">
              <span className="amounts-label">Target</span>
              <strong className="target">{formatTNight(selected.target)}</strong>
              <span className="amounts-unit">tNIGHT</span>
            </div>
            <div className="amounts-item">
              <span className="amounts-label">Private donations</span>
              <strong className="donations-count">
                {selected.donationsCount.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="progress">
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="progress-caption">
            {progressPct}% funded · owner <code>{toHex(selected.owner)}</code>
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="campaign-empty">
          <p className="muted">
            This contract instance has not launched a campaign yet. Launch one to
            become its owner, proved by your secret key. Every instance hosts any
            number of campaigns side by side.
          </p>
          <div className="campaign-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={busy !== null}
              onClick={() => {
                setActionError(null);
                setLaunchOpen(true);
              }}
            >
              <RocketIcon />
              Launch Campaign
            </button>
          </div>
        </div>
      ) : null}

      {txReceipt && <TransactionReceipt receipt={txReceipt} />}

      {selectedActive && (
        <>
          <div className="campaign-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={busy !== null}
              onClick={() => {
                setDonationError(null);
                setDonationStage(0);
                setDonationOpen(true);
              }}
            >
              Donate Privately
            </button>
          </div>

          {isOwner && (
            <div className="owner-panel">
              <div className="owner-panel-header">
                <span className="owner-panel-icon" aria-hidden="true">
                  <UserIcon />
                </span>
                <div>
                  <h4 className="owner-panel-title">Owner Panel</h4>
                  <p className="owner-panel-sub">
                    You launched this campaign (proved by your secret key). Closing it stops
                    new donations; the final aggregate stays on-chain.
                  </p>
                </div>
              </div>
              <div className="owner-panel-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy !== null}
                  onClick={() => setConfirmCloseOpen(true)}
                >
                  Close Campaign
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedActive && selected?.title && (
        <p className="muted campaign-closed-note">
          This campaign is closed. The final aggregate was disclosed on-chain;
          individual donations remain private forever.
        </p>
      )}

      {selected?.title && selectedActive && (
        <DonationModal
          open={donationOpen}
          target={selected.target}
          raised={selected.raised}
          stage={donationStage}
          error={donationError}
          onClose={() => {
            setDonationOpen(false);
            setDonationStage(0);
            setDonationError(null);
          }}
          onDonate={(amount) => void runDonation(amount)}
        />
      )}

      <LaunchModal
        open={launchOpen}
        title={title}
        description={description}
        target={target}
        busy={busy === "launch"}
        error={actionError}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onTargetChange={setTarget}
        onSubmit={handleLaunch}
        onClose={() => {
          setLaunchOpen(false);
          setActionError(null);
        }}
      />

      <ConfirmModal
        open={confirmCloseOpen}
        title="Close this campaign?"
        body="Are you sure you want to close this campaign? This stops new donations. The final aggregate stays on-chain; individual donations remain private forever."
        confirmLabel="Close Campaign"
        busy={busy === "close"}
        onConfirm={() => void handleClose()}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </section>
  );
}
