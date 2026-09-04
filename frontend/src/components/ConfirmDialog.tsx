"use client";

import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmationPhrase: string;
  confirmLabel: string;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A typed-confirmation dialog for destructive, irreversible actions — plain window.confirm()
// is too easy to click through without reading. Requires typing the exact phrase (e.g. the
// group's name) before the destructive button is enabled.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmationPhrase,
  confirmLabel,
  confirming,
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

  const matches = input.trim() === confirmationPhrase;

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
              className="mt-1 w-full border-0 border-b border-line bg-transparent py-1.5 font-sans text-ink outline-none transition-colors focus:border-debt focus:ring-0"
            />
          </label>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!matches || confirming}
              className="flex-1 rounded-sm bg-debt py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-debt/90 active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-debt disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? "Deleting…" : confirmLabel}
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
