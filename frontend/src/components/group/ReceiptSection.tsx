"use client";

import { useRef, useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { deleteReceipt, fetchReceiptObjectUrl, uploadReceipt } from "@/lib/receipts";

interface ReceiptSectionProps {
  groupId: string;
  expenseId: string;
  hasReceipt: boolean;
  onChanged: (hasReceipt: boolean) => void;
}

export default function ReceiptSection({ groupId, expenseId, hasReceipt, onChanged }: ReceiptSectionProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleViewToggle() {
    if (previewUrl) {
      clearPreview();
      return;
    }
    setError(null);
    setLoadingPreview(true);
    try {
      setPreviewUrl(await fetchReceiptObjectUrl(groupId, expenseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipt");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadReceipt(groupId, expenseId, file);
      clearPreview();
      onChanged(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remove this receipt?")) return;
    setError(null);
    try {
      await deleteReceipt(groupId, expenseId);
      clearPreview();
      onChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove receipt");
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChosen}
      />
      <div className="flex flex-wrap items-center gap-4">
        {hasReceipt && (
          <button
            type="button"
            onClick={handleViewToggle}
            disabled={loadingPreview}
            className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPreview ? "Loading…" : previewUrl ? "Hide receipt" : "View receipt"}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading…" : hasReceipt ? "Replace receipt" : "+ Add receipt"}
        </button>
        {hasReceipt && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-full font-sans text-sm font-semibold text-negative transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative"
          >
            Remove
          </button>
        )}
      </div>
      {error && <ErrorBanner className="mt-2" message={error} />}
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Receipt" className="mt-3 max-h-80 rounded-xl border border-border" />
      )}
    </div>
  );
}
