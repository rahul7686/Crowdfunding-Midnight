/**
 * DonationModal — amount presets + a 5-stage progress stepper.
 *
 * The amount is chosen here in the UI, but the exact base-unit amount is passed
 * to the parent, which writes it into the private witness state and builds the
 * zero-knowledge proof. The amount is never stored or logged by the modal.
 *
 * Accessibility: role="dialog", Esc to close (except while a proof is running),
 * focus moved into the dialog on open and restored on close, scroll locked.
 */

import { useEffect, useRef, useState } from "react";

import { formatTNight, parseTNight } from "../format";
import { AlertIcon, CheckIcon, CloseIcon, LockIcon, ShieldIcon } from "./icons";

const PRESETS = [1, 5, 10, 25, 50];

const STAGES = [
  { n: 1, label: "Preparing private proof" },
  { n: 2, label: "Generating ZK proof" },
  { n: 3, label: "Submitting transaction" },
  { n: 4, label: "Confirming on network" },
  { n: 5, label: "Donation successful" },
];

interface DonationModalProps {
  open: boolean;
  target: bigint;
  raised: bigint;
  stage: number; // 0 = selector, 1..4 = running, 5 = success
  error: string | null;
  onClose: () => void;
  onDonate: (amount: bigint) => void;
}

export function DonationModal({
  open,
  target,
  raised,
  stage,
  error,
  onClose,
  onDonate,
}: DonationModalProps) {
  const [amountTxt, setAmountTxt] = useState("10");
  const [custom, setCustom] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);

  const running = stage >= 1 && stage <= 4;
  const succeeded = stage === 5;
  const amount = parseTNight(amountTxt);
  const remaining = target - raised;
  const exceeds = amount !== null && remaining > 0n && amount > remaining;
  const funded = remaining <= 0n;
  const canDonate = amount !== null && amount > 0n && !exceeds && !funded;

  // Scroll lock + focus management while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      restoreFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const selectPreset = (n: number) => {
    setCustom(false);
    setAmountTxt(String(n));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !running) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !running) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-title"
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h3 id="donation-modal-title" className="modal-title">
            {succeeded ? "Donation submitted" : "Donate Privately"}
          </h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close donation dialog"
            onClick={onClose}
            disabled={running}
          >
            <CloseIcon />
          </button>
        </div>

        {succeeded ? (
          <div className="donation-success">
            <span className="donation-success-icon" aria-hidden="true">
              <CheckIcon />
            </span>
            <p className="donation-success-title">
              Your private donation was submitted.
            </p>
            <p className="privacy-note">
              Your identity and the exact amount stay private. The campaign progress
              now reflects your contribution — verified on-chain.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : running ? (
          <ol className="donation-steps" aria-label="Donation progress">
            {STAGES.map((step) => {
              const isDone = stage > step.n;
              const isCurrent = stage === step.n;
              return (
                <li
                  className={`donation-step ${isCurrent ? "current" : ""} ${isDone ? "done" : ""}`}
                  key={step.n}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="donation-step-marker" aria-hidden="true">
                    {isDone ? <CheckIcon /> : isCurrent ? <span className="spinner" /> : step.n}
                  </span>
                  <span className="donation-step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="donation-selector">
            <div className="preset-grid" role="group" aria-label="Preset amounts">
              {PRESETS.map((n) => (
                <button
                  type="button"
                  key={n}
                  ref={
                    !custom && amountTxt === String(n)
                      ? (firstFieldRef as React.Ref<HTMLButtonElement>)
                      : undefined
                  }
                  className={`preset-btn ${!custom && amountTxt === String(n) ? "selected" : ""}`}
                  aria-pressed={!custom && amountTxt === String(n)}
                  onClick={() => selectPreset(n)}
                >
                  {n}
                  <span className="preset-unit">tNIGHT</span>
                </button>
              ))}
            </div>

            <div className="preset-custom">
              <button
                type="button"
                className={`preset-custom-toggle ${custom ? "selected" : ""}`}
                aria-pressed={custom}
                onClick={() => {
                  setCustom(true);
                  setAmountTxt("");
                }}
              >
                Custom amount
              </button>
              {custom && (
                <span className="input-wrap modal-input-wrap">
                  <input
                    ref={firstFieldRef as React.Ref<HTMLInputElement>}
                    type="text"
                    inputMode="decimal"
                    value={amountTxt}
                    onChange={(e) => setAmountTxt(e.target.value)}
                    placeholder="0.5"
                    aria-label="Custom donation amount in tNIGHT"
                  />
                  <span className="input-suffix">tNIGHT</span>
                </span>
              )}
            </div>

            <div className="donation-summary">
              <span className="donation-summary-label">Selected amount</span>
              <strong className="donation-summary-value">
                {amount === null ? "—" : `${formatTNight(amount)} tNIGHT`}
              </strong>
            </div>

            {exceeds && (
              <p className="donation-hint error-text">
                This would exceed the remaining funding target of{" "}
                {formatTNight(remaining)} tNIGHT. Try a smaller amount.
              </p>
            )}
            {funded && (
              <p className="donation-hint error-text">
                This campaign has reached its funding target and is no longer
                accepting donations.
              </p>
            )}

            {error && <p className="error-text">{error}</p>}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!canDonate}
              onClick={() => amount !== null && onDonate(amount)}
            >
              <ShieldIcon />
              Donate {amount !== null ? formatTNight(amount) : ""} Privately
            </button>

            <p className="donation-privacy">
              <LockIcon />
              <span>
                Your donation is verified with a zero-knowledge proof. No one learns
                who donated or how much — only the campaign progress updates on-chain.
              </span>
            </p>
          </div>
        )}

        {error && running && (
          <div className="donation-error-row">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
