/**
 * LaunchModal — accessible dialog for creating a campaign.
 *
 * Collects exactly the fields the contract requires (title, description,
 * funding target in tNIGHT) and forwards the submit event to the parent's
 * existing handleLaunch, which performs the on-chain call (proof generation →
 * transaction → refresh). The fields are controlled by the parent so the
 * launch state, busy flag and errors stay in the one place.
 *
 * Accessibility: role="dialog", Esc to close (except while launching), focus
 * moved into the dialog on open and restored on close, scroll locked.
 */

import { useEffect, useRef } from "react";

import { CloseIcon, RocketIcon } from "./icons";

interface LaunchModalProps {
  open: boolean;
  title: string;
  description: string;
  target: string;
  busy: boolean;
  error: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function LaunchModal({
  open,
  title,
  description,
  target,
  busy,
  error,
  onTitleChange,
  onDescriptionChange,
  onTargetChange,
  onSubmit,
  onClose,
}: LaunchModalProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !busy) onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="modal modal-launch"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-modal-title"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h3 id="launch-modal-title" className="modal-title">
            Launch a campaign
          </h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close launch dialog"
            onClick={onClose}
            disabled={busy}
          >
            <CloseIcon />
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Title</span>
            <input
              ref={firstFieldRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Community Solar Cooperative"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Rooftop solar for 40 low-income households…"
            />
          </label>

          <label className="field">
            <span className="field-label">Funding target</span>
            <span className="input-wrap modal-input-wrap">
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => onTargetChange(e.target.value)}
                placeholder="1000"
                required
              />
              <span className="input-suffix">tNIGHT</span>
            </span>
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? (
                <span className="btn-busy">
                  <span className="spinner" />
                  <span>Launching…</span>
                </span>
              ) : (
                <>
                  <RocketIcon />
                  Launch Campaign
                </>
              )}
            </button>
          </div>
          <p className="privacy-note">Proved without revealing your input.</p>
        </form>
      </div>
    </div>
  );
}
