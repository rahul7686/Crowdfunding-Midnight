import type { ReactNode } from "react";

import {
  ArrowRightIcon,
  ChainIcon,
  CheckIcon,
  EyeOffIcon,
  ShieldIcon,
} from "./icons";

const FEATURES: Array<{ icon: ReactNode; title: string; text: string }> = [
  {
    icon: <EyeOffIcon />,
    title: "Private Donations",
    text: "Donation details are protected.",
  },
  {
    icon: <ShieldIcon />,
    title: "Zero-Knowledge Proofs",
    text: "Prove your contribution without revealing private inputs.",
  },
  {
    icon: <ChainIcon />,
    title: "Secure On-Chain Verification",
    text: "Campaign state is verified on the Midnight Network.",
  },
  {
    icon: <CheckIcon />,
    title: "Transparent Results",
    text: "Campaign progress and aggregate results remain verifiable.",
  },
];

const STEPS = [
  {
    title: "Private Input",
    text: "Your donation amount and identity stay inside your wallet. No one — not even the campaign owner — sees your individual contribution.",
  },
  {
    title: "ZK Proof",
    text: "Your wallet generates a zero-knowledge proof that the donation is valid (amount, balance, and campaign state) without revealing any private value.",
  },
  {
    title: "Verified On-Chain",
    text: "Midnight verifies the proof and records only the new aggregate. Anyone can check the campaign total — but never individual donors.",
  },
];

export function PrivacySection() {
  return (
    <section className="section privacy-section" id="privacy">
      <div className="section-head">
        <h2 className="section-title">Privacy by Default</h2>
        <p className="section-sub">
          Every contribution is proved with a zero-knowledge proof. Identity and
          amounts stay private, while the outcome stays verifiable.
        </p>
      </div>
      <div className="feature-grid">
        {FEATURES.map((feature) => (
          <div className="feature-card" key={feature.title}>
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-text">{feature.text}</p>
          </div>
        ))}
      </div>

      <div className="privacy-steps" aria-label="How a private donation is verified">
        {STEPS.map((step, i) => (
          <div className="privacy-step" key={step.title}>
            <div className="privacy-step-num" aria-hidden="true">
              {i + 1}
            </div>
            <h3 className="privacy-step-title">{step.title}</h3>
            <p className="privacy-step-text">{step.text}</p>
          </div>
        ))}
      </div>

      <div className="privacy-footnote">
        <ArrowRightIcon />
        <span>
          Your donation is private — its impact is public.
        </span>
      </div>
    </section>
  );
}
