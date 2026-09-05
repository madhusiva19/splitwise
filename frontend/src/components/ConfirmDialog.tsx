"use client";

import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  // Omit for a plain confirm/cancel dialog. Set to require typing the exact phrase (e.g. the
  // group's name) before the confirm button enables — for irreversible, high-stakes actions.
  confirmationPhrase?: string;
  confirmLabel: string;
  confirmingLabel?: string;
  confirming?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A confirmation dialog for actions that deserve more friction than a single click.
// Plain window.confirm() is too easy to click through without reading; this optionally
// requires typing an exact phrase first for the most catastrophic actions.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmationPhrase,
  confirmLabel,
  confirmingLabel,
  confirming,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (open) setInput("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const matches = confirmationPhrase === undefined || input.trim() === confirmationPhrase;

  // Tailwind's build-time scanner needs complete, literal class strings — it can't see
  // classes assembled from a template literal like `bg-${accent}` — so pick a full set here.
  const inputFocusClass = destructive ? "focus:border-debt" : "focus:border-ledger-green";
  const confirmButtonClass = destructive
    ? "bg-debt hover:bg-debt/90 focus-visible:outline-debt"
    : "bg-ledger-green hover:bg-ledger-green-dark focus-visible:outline-ledger-green";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-sm border border-line bg-paper shadow-lg">
        <div className="perforated-top" aria-hidden="true" />
        <div className="px-6 pb-6 pt-2">
          <h2 id="confirm-dialog-title" className="font-mono text-base font-bold text-ink">
            {title}
          </h2>
          <p className="mt-2 font-sans text-sm text-ink/70">{description}</p>

          {confirmationPhrase !== undefined && (
            <label className="mt-4 block">
              <span className="block font-mono text-xs uppercase tracking-wider text-ink/60">
                Type <span className="font-bold text-ink">{confirmationPhrase}</span> to confirm
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                autoComplete="off"
                className={`mt-1 w-full border-0 border-b border-line bg-transparent py-1.5 font-sans text-ink outline-none transition-colors ${inputFocusClass} focus:ring-0`}
              />
            </label>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!matches || confirming}
              className={`flex-1 rounded-sm py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
            >
              {confirming ? confirmingLabel ?? "Working…" : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-sm border border-line px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink/70 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
