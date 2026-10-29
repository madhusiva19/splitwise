"use client";

import { useMemo, useState, FormEvent } from "react";
import Field from "@/components/Field";
import ErrorBanner from "@/components/ErrorBanner";
import Button from "@/components/Button";
import SegmentedControl from "@/components/SegmentedControl";
import ItemizedExpenseEntry from "@/components/ItemizedExpenseEntry";
import { useCurrency } from "@/lib/currency";
import { ItemizedResult } from "@/lib/itemizedSplit";
import {
  createExpense,
  updateExpense,
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseResponse,
  EXPENSE_CATEGORIES,
  formatCategory,
  SplitType,
} from "@/lib/expenses";
import { GroupMember } from "@/lib/groups";

// "Itemized" isn't a real backend SplitType — it's a frontend entry method that computes an
// EXACT split from line items, then submits it the same way a manually-entered EXACT split would.
type EntryMode = SplitType | "ITEMIZED";

const ENTRY_MODE_OPTIONS: { value: EntryMode; label: string }[] = [
  { value: "EQUAL", label: "Equal" },
  { value: "EXACT", label: "Exact" },
  { value: "PERCENTAGE", label: "Percent" },
  { value: "ITEMIZED", label: "Itemized" },
];

interface AddExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  expense?: ExpenseResponse;
  onSaved: (expense: ExpenseResponse) => void;
  onCancel: () => void;
}

export default function AddExpenseForm({ groupId, members, expense, onSaved, onCancel }: AddExpenseFormProps) {
  const { symbol } = useCurrency();
  const isEditing = !!expense;
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [mode, setMode] = useState<EntryMode>(expense?.splitType ?? "EQUAL");
  const [itemizedResult, setItemizedResult] = useState<ItemizedResult | null>(null);
  const [category, setCategory] = useState<ExpenseCategory | undefined>(expense?.category);
  const [paidByUserId, setPaidByUserId] = useState<string>(expense?.paidByUserId ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    expense ? expense.shares.map((s) => s.userId) : members.map((m) => m.userId)
  );
  const [shareInputs, setShareInputs] = useState<Record<string, string>>(
    expense
      ? Object.fromEntries(
          expense.shares.map((s) => [
            s.userId,
            mode === "PERCENTAGE"
              ? String((s.shareAmount / expense.amount) * 100)
              : String(s.shareAmount),
          ])
        )
      : {}
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const isItemized = mode === "ITEMIZED";
  const splitType: SplitType = isItemized ? "EXACT" : mode;
  const parsedAmount = isItemized ? itemizedResult?.amount ?? NaN : parseFloat(amount);
  const needsShares = mode === "EXACT" || mode === "PERCENTAGE";
  const descriptionError =
    descriptionTouched && description.trim().length === 0 ? "Description is required" : undefined;
  const amountError =
    !isItemized && amountTouched && !(Number.isFinite(parsedAmount) && parsedAmount > 0)
      ? "Enter an amount greater than 0"
      : undefined;

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  const shareSum = useMemo(
    () => participantIds.reduce((sum, id) => sum + (parseFloat(shareInputs[id]) || 0), 0),
    [participantIds, shareInputs]
  );

  const shareTarget = splitType === "PERCENTAGE" ? 100 : parsedAmount;
  const sharesValid = !needsShares || (Number.isFinite(shareTarget) && Math.abs(shareSum - shareTarget) < 0.01);

  const canSubmit =
    description.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    (isItemized || participantIds.length > 0) &&
    sharesValid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSaving(true);

    try {
      const req: CreateExpenseRequest = {
        description,
        amount: parsedAmount,
        splitType,
        category,
        participantUserIds: isItemized ? itemizedResult!.shares.map((s) => s.userId) : participantIds,
        shares: isItemized
          ? itemizedResult!.shares
          : needsShares
          ? participantIds.map((id) => ({ userId: id, amount: parseFloat(shareInputs[id]) || 0 }))
          : undefined,
      };
      const saved = isEditing
        ? await updateExpense(groupId, expense!.id, {
            ...req,
            paidByUserId: paidByUserId !== expense!.paidByUserId ? paidByUserId : undefined,
          })
        : await createExpense(groupId, req);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? "save" : "add"} expense`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field
          label="Description"
          type="text"
          value={description}
          onChange={setDescription}
          onBlur={() => setDescriptionTouched(true)}
          error={descriptionError}
          placeholder="Groceries"
          required
        />
        <div className="sm:w-32">
          {isItemized ? (
            <div>
              <span className="block font-sans text-sm font-medium text-ink-muted">Amount</span>
              <p className="mt-1.5 py-2.5 font-sans font-semibold text-ink">
                {itemizedResult ? `${symbol}${itemizedResult.amount.toFixed(2)}` : "—"}
              </p>
            </div>
          ) : (
            <Field
              label="Amount"
              type="number"
              value={amount}
              onChange={setAmount}
              onBlur={() => setAmountTouched(true)}
              error={amountError}
              placeholder="0.00"
              required
            />
          )}
        </div>
      </div>

      {isEditing && (
        <div>
          <span className="mb-2 block font-sans text-sm font-medium text-ink-muted">
            Paid by
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const selected = paidByUserId === member.userId;
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => setPaidByUserId(member.userId)}
                  aria-pressed={selected}
                  className={`rounded-full px-3.5 py-1.5 font-sans text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected
                      ? "bg-primary text-white"
                      : "bg-surface-muted text-ink-muted hover:text-ink"
                  }`}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <SegmentedControl
        label="Split type"
        options={ENTRY_MODE_OPTIONS}
        value={mode}
        onChange={setMode}
      />

      <div>
        <span className="mb-2 block font-sans text-sm font-medium text-ink-muted">
          Category <span className="text-ink-muted/60">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(selected ? undefined : c)}
                aria-pressed={selected}
                className={`rounded-full px-3.5 py-1.5 font-sans text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-ink-muted hover:text-ink"
                }`}
              >
                {formatCategory(c)}
              </button>
            );
          })}
        </div>
      </div>

      {isItemized ? (
        <ItemizedExpenseEntry members={members} onChange={setItemizedResult} />
      ) : (
      <div className="rounded-2xl border border-border px-4 py-3.5">
        <span className="mb-2 block font-sans text-sm font-medium text-ink-muted">
          Participants
        </span>
        <div className="space-y-2">
          {members.map((member) => {
            const checked = participantIds.includes(member.userId);
            return (
              <div key={member.userId} className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 font-sans text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(member.userId)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {member.name}
                </label>
                {needsShares && checked && (
                  <input
                    type="number"
                    step="0.01"
                    value={shareInputs[member.userId] ?? ""}
                    onChange={(e) =>
                      setShareInputs((prev) => ({ ...prev, [member.userId]: e.target.value }))
                    }
                    placeholder={splitType === "PERCENTAGE" ? "%" : "0.00"}
                    className="w-24 rounded-lg border border-transparent bg-surface-muted px-2 py-1 text-right font-sans text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {!needsShares && checked && Number.isFinite(parsedAmount) && parsedAmount > 0 && participantIds.length > 0 && (
                  <span className="font-sans text-xs tabular-nums text-ink-muted">
                    {symbol}{(parsedAmount / participantIds.length).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {needsShares && (
          <p className={`mt-3 border-t border-border pt-2 font-sans text-xs ${sharesValid ? "text-ink-muted" : "text-negative"}`}>
            {splitType === "PERCENTAGE"
              ? `Total: ${shareSum.toFixed(2)}% (must equal 100%)`
              : `Total: ${symbol}${shareSum.toFixed(2)} (must equal ${symbol}${
                  Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : "0.00"
                })`}
          </p>
        )}
      </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-3">
        <Button type="submit" fullWidth disabled={!canSubmit} loading={saving} loadingLabel="Saving…">
          {isEditing ? "Save changes" : "Add expense"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
