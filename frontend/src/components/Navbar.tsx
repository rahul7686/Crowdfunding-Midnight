import { useEffect, useState } from "react";

import { WalletDropdown } from "./WalletDropdown";
import { CloseIcon, LogoShield, MenuIcon, WalletIcon } from "./icons";

interface NavbarProps {
  connected: boolean;
  networkId: string | null;
  address: string | null;
  onDisconnect: () => void;
}

const NAV_LINKS = [
  { label: "Dashboard", href: "#home" },
  { label: "Campaign", href: "#campaign" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Privacy", href: "#privacy" },
  { label: "About", href: "#about" },
];

export function Navbar({ connected, networkId, address, onDisconnect }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const networkLabel =
    networkId === null || networkId === "" || networkId === "preview"
      ? "Midnight Preview"
      : `Midnight ${networkId}`;

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner">
        <a className="brand" href="#home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <LogoShield />
          </span>
          <span className="brand-text">
            <span className="brand-name">PrivateFund</span>
            <span className="brand-sub">Private Crowdfunding</span>
          </span>
        </a>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              className="nav-link"
              href={link.href}
              onClick={() => setMenuOpen(false)}
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
            <a className="btn btn-primary btn-connect" href="#campaign">
              <WalletIcon />
              <span>Connect Wallet</span>
            </a>
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
