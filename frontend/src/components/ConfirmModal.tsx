/**
 * ConfirmModal — lightweight accessible confirmation dialog (used before
 * closing a campaign). No destructive action runs until the user confirms.
 */

import { useEffect, useRef } from "react";

import { AlertIcon, CloseIcon } from "./icons";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      restoreFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !busy) onCancel();
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="modal modal-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-body"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h3 id="confirm-modal-title" className="modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close confirmation dialog"
            onClick={onCancel}
            disabled={busy}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          <div className="confirm-icon" aria-hidden="true">
            <AlertIcon />
          </div>
          <p id="confirm-modal-body" className="confirm-body">
            {body}
          </p>
          <div className="btn-row confirm-actions">
            <button
              type="button"
              className="btn btn-secondary"
              ref={cancelRef}
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <span className="btn-busy">
                  <span className="spinner" />
                  <span>Closing…</span>
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
