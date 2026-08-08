/**
 * WalletDropdown — connected-wallet chip with a dropdown for the full address,
 * copy, network, balance and disconnect. Uses only the existing ConnectedAPI
 * data surfaced by App (never reads private material).
 */

import { useEffect, useRef, useState } from "react";

import { useToast } from "./Toast";
import {
  ChevronDownIcon,
  CopyIcon,
  LinkIcon,
  UserIcon,
  WalletIcon,
} from "./icons";

interface WalletDropdownProps {
  address: string;
  networkId: string | null;
  onDisconnect: () => void;
}

const shorten = (address: string): string =>
  address.length <= 20 ? address : `${address.slice(0, 10)}…${address.slice(-8)}`;

export function WalletDropdown({ address, networkId, onDisconnect }: WalletDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied", "The wallet address is on your clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address", "Your browser blocked clipboard access.");
    }
  };

  const networkLabel =
    networkId === null || networkId === "" || networkId === "preview"
      ? "Midnight Preview"
      : `Midnight ${networkId}`;

  return (
    <div className="wallet-dropdown" ref={rootRef}>
      <button
        type="button"
        className="wallet-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="wallet-chip-icon" aria-hidden="true">
          <WalletIcon />
        </span>
        <span className="wallet-chip-dot" aria-hidden="true" />
        <span className="wallet-chip-addr">{shorten(address)}</span>
        <ChevronDownIcon className={`wallet-chip-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="wallet-menu" role="menu" aria-label="Wallet options">
          <div className="wallet-menu-account">
            <span className="wallet-menu-icon" aria-hidden="true">
              <UserIcon />
            </span>
            <div className="wallet-menu-account-body">
              <span className="wallet-menu-label">Connected wallet</span>
              <span className="wallet-menu-address">{address}</span>
            </div>
          </div>

          <button
            type="button"
            className="wallet-menu-action"
            onClick={handleCopy}
          >
            <CopyIcon />
            <span>{copied ? "Copied!" : "Copy address"}</span>
          </button>

          <div className="wallet-menu-row">
            <span className="wallet-menu-key">
              <LinkIcon />
              Network
            </span>
            <span className="wallet-menu-value">{networkLabel}</span>
          </div>

          <div className="wallet-menu-row">
            <span className="wallet-menu-key">
              <WalletIcon />
              Balance
            </span>
            <span className="wallet-menu-value">N/A</span>
          </div>

          <div className="wallet-menu-divider" role="separator" />

          <button
            type="button"
            className="wallet-menu-action wallet-menu-disconnect"
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
