const STEPS = [
  {
    n: "01",
    title: "Connect Wallet",
    text: "Connect to Midnight Preview.",
  },
  {
    n: "02",
    title: "Choose or Launch",
    text: "Support an existing campaign or launch your own.",
  },
  {
    n: "03",
    title: "Donate Privately",
    text: "Your donation is processed using a zero-knowledge proof.",
  },
  {
    n: "04",
    title: "Verify On-Chain",
    text: "The campaign state is verified on-chain without exposing private donation details.",
  },
];

export function HowItWorks() {
  return (
    <section className="section how-section" id="how-it-works">
      <div className="section-head">
        <h2 className="section-title">How It Works</h2>
        <p className="section-sub">
          From connecting your wallet to verifying the outcome on-chain — in four steps.
        </p>
      </div>
      <ol className="steps-grid">
        {STEPS.map((step) => (
          <li className="step" key={step.n}>
            <span className="step-num">{step.n}</span>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
