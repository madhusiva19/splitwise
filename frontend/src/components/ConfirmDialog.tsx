"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";

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
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card dark:shadow-card-dark">
        <h2 id="confirm-dialog-title" className="font-sans text-base font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 font-sans text-sm text-ink-muted">{description}</p>

        {confirmationPhrase !== undefined && (
          <label className="mt-4 block">
            <span className="block font-sans text-xs text-ink-muted">
              Type <span className="font-semibold text-ink">{confirmationPhrase}</span> to confirm
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              autoComplete="off"
              className={`mt-1.5 w-full rounded-xl border bg-surface-muted px-4 py-2.5 font-sans text-ink outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
                destructive
                  ? "border-transparent focus:border-negative focus:ring-negative/20"
                  : "border-transparent focus:border-primary focus:ring-primary/20"
              }`}
            />
          </label>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            variant={destructive ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            disabled={!matches}
            loading={confirming}
            loadingLabel={confirmingLabel}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
