import { LogoShield } from "./icons";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Explore", href: "#campaign" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Privacy", href: "#privacy" },
  { label: "About", href: "#about" },
];

const TECHNOLOGY = [
  "Midnight Network",
  "Compact",
  "Zero-Knowledge Proofs",
  "Private Crowdfunding",
];

export function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-lg">
            <LogoShield />
          </span>
          <span className="brand-name footer-brand-name">PrivateFund</span>
          <p className="footer-tagline">Private crowdfunding powered by Midnight.</p>
          <p className="footer-about">
            PrivateFund lets you donate privately and verify impact publicly.
            Every contribution is proved with a zero-knowledge proof on the
            Midnight Network — identity and amounts are never revealed.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Links</h4>
          {LINKS.map((link) => (
            <a className="footer-link" key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Technology</h4>
          {TECHNOLOGY.map((tech) => (
            <span className="footer-link" key={tech}>
              {tech}
            </span>
          ))}
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Network</h4>
          <span className="footer-link">Preview</span>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          PrivateFund · Private crowdfunding on the Midnight Network ·{" "}
          <code>preview</code>
        </p>
      </div>
    </footer>
  );
}
