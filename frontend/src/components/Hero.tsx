import { ArrowRightIcon, ChainIcon, EyeOffIcon, ShieldIcon, SparkleIcon } from "./icons";

function HeroVisual() {
  const nodes: Array<[number, number, boolean]> = [
    [60, 210, true],
    [360, 210, false],
    [210, 60, true],
    [210, 360, false],
    [82, 120, true],
    [338, 120, false],
    [82, 300, true],
    [338, 300, false],
  ];

  return (
    <div className="hero-visual" aria-hidden="true">
      <svg className="hero-svg" viewBox="0 0 420 420" fill="none">
        <defs>
          <linearGradient id="hero-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(124,92,255,0.4)" />
            <stop offset="1" stopColor="rgba(124,92,255,0)" />
          </radialGradient>
        </defs>

        <circle cx="210" cy="210" r="175" fill="url(#hero-glow)" />
        <circle cx="210" cy="210" r="150" stroke="rgba(139,92,246,0.35)" strokeWidth="1" strokeDasharray="3 9" />
        <circle cx="210" cy="210" r="106" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="2 8" />

        <g stroke="rgba(139,92,246,0.35)" strokeWidth="1">
          <line x1="60" y1="210" x2="210" y2="210" />
          <line x1="360" y1="210" x2="210" y2="210" />
          <line x1="210" y1="60" x2="210" y2="210" />
          <line x1="210" y1="360" x2="210" y2="210" />
        </g>

        {nodes.map(([x, y, purple], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill={purple ? "#8b5cf6" : "#38bdf8"}>
            <animate attributeName="opacity" values="0.55;1;0.55" dur="3s" repeatCount="indefinite" />
          </circle>
        ))}

        <path
          d="M210 150c14 0 26 12 26 26v34c0 14-10 26-26 34-16-8-26-20-26-34v-34c0-14 12-26 26-26Z"
          fill="url(#hero-shield)"
        />
        <path
          d="M196 182h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-28a4 4 0 0 1-4-4v-14a4 4 0 0 1 4-4Z"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M210 190v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <SparkleIcon />
            Midnight Network · Private &amp; Verifiable
          </span>
          <h1 className="hero-title">
            Private Crowdfunding
            <span className="hero-title-accent">Powered by Zero-Knowledge</span>
          </h1>
          <p className="hero-sub">
            Raise funds and support meaningful campaigns while keeping donor identity
            and contribution details private.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#campaign">
              Launch Campaign
            </a>
            <a className="btn btn-ghost btn-lg" href="#campaign">
              Explore Campaigns
              <ArrowRightIcon />
            </a>
          </div>
          <div className="hero-trust">
            <span>
              <ShieldIcon />
              Zero-Knowledge Proofs
            </span>
            <span>
              <EyeOffIcon />
              No Identity Revealed
            </span>
            <span>
              <ChainIcon />
              On-chain Verified
            </span>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}
