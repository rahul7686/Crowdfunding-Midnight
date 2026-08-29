import { LogoShield } from "./icons";

const LINKS: Array<{ label: string; href: string }> = [
  { label: "Home", href: "#home" },
  { label: "Campaigns", href: "#campaign" },
  { label: "About", href: "#about" },
];

const TECHNOLOGY = [
  "Midnight Network",
  "Compact Smart Contracts",
  "Zero-Knowledge Proofs",
  "React + Vite",
  "Crowdfunding-Midnight",
];

export function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-lg">
            <LogoShield />
          </span>
          <span className="brand-name footer-brand-name">Crowdfunding-Midnight</span>
          <p className="footer-tagline">Private Crowdfunding powered by Midnight Network.</p>
          <p className="footer-about">
            Crowdfunding-Midnight lets you donate privately and verify impact publicly.
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
          <span className="footer-link">Preprod</span>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          Crowdfunding-Midnight on the Midnight Network ·{" "}
          <code>preprod</code>
        </p>
      </div>
    </footer>
  );
}
