/**
 * Lightweight toast system — no external library.
 *
 * `useToast()` exposes `success / error / info / pending` helpers plus manual
 * `dismiss`. Toasts auto-dismiss, are announced via an aria-live region, and
 * the pending variant shows a spinner (used for transaction submission).
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./icons";

export type ToastKind = "success" | "error" | "info" | "pending";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  pending: (title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 5_500;
const PENDING_DISMISS_MS = 12_000;

let nextId = 1;

const kindMeta: Record<ToastKind, { label: string; icon: ReactNode; className: string }> = {
  success: {
    label: "Success",
    icon: <CheckIcon />,
    className: "toast-success",
  },
  error: {
    label: "Error",
    icon: <AlertIcon />,
    className: "toast-error",
  },
  info: {
    label: "Info",
    icon: <InfoIcon />,
    className: "toast-info",
  },
  pending: {
    label: "Pending",
    icon: <span className="spinner" />,
    className: "toast-pending",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, kind, title, message }]);
      const delay = kind === "pending" ? PENDING_DISMISS_MS : AUTO_DISMISS_MS;
      const timer = window.setTimeout(() => dismiss(id), delay);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const api: ToastApi = {
    success: useCallback((title, message) => push("success", title, message), [push]),
    error: useCallback((title, message) => push("error", title, message), [push]),
    info: useCallback((title, message) => push("info", title, message), [push]),
    pending: useCallback((title, message) => push("pending", title, message), [push]),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const meta = kindMeta[toast.kind];
          return (
            <div
              className={`toast ${meta.className}`}
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
            >
              <span className="toast-icon" aria-hidden="true">
                {meta.icon}
              </span>
              <span className="toast-body">
                <span className="toast-title">
                  <span className="sr-only">{meta.label}: </span>
                  {toast.title}
                </span>
                {toast.message && <span className="toast-message">{toast.message}</span>}
              </span>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return ctx;
}
