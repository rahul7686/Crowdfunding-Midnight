import { useEffect, useState } from "react";

import { WalletDropdown } from "./WalletDropdown";
import {
  registerConnectingListener,
  requestWalletConnect,
  unregisterConnectingListener,
} from "../utils/connectionController";
import { CloseIcon, LogoShield, MenuIcon, WalletIcon } from "./icons";

interface NavbarProps {
  connected: boolean;
  networkId: string | null;
  address: string | null;
  onDisconnect: () => void;
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Deploy (/deploy)", href: "/deploy" },
  { label: "Campaigns", href: "/#campaign" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Privacy", href: "/#privacy" },
];

export function Navbar({ connected, networkId, address, onDisconnect, onNavigate, currentPath }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mirror the wallet's connecting state
  useEffect(() => {
    registerConnectingListener(setConnecting);
    return () => unregisterConnectingListener();
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);
    if (href === "/deploy" || href === "/") {
      e.preventDefault();
      onNavigate?.(href);
    }
  };

  const networkLabel =
    networkId === null || networkId === "" || networkId === "preprod"
      ? "Midnight Preprod"
      : `Midnight ${networkId}`;

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner">
        <a className="brand" href="/" onClick={(e) => handleLinkClick(e, "/")}>
          <span className="brand-mark">
            <LogoShield />
          </span>
          <span className="brand-text">
            <span className="brand-name">Crowdfunding-Midnight</span>
            <span className="brand-sub">Midnight Network</span>
          </span>
        </a>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              className={`nav-link ${currentPath === link.href ? "active" : ""}`}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar-right">
          <span className="network-badge" title={networkLabel}>
            <span className="network-pulse" />
            {networkLabel}
          </span>

          {connected && address ? (
            <WalletDropdown
              address={address}
              networkId={networkId}
              onDisconnect={onDisconnect}
            />
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-connect"
              onClick={() => {
                setMenuOpen(false);
                requestWalletConnect();
              }}
              disabled={connecting}
            >
              <WalletIcon />
              <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
            </button>
          )}

          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
