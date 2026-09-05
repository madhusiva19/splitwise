"use client";

import { useMemo, useState, FormEvent } from "react";
import Field from "@/components/Field";
import ErrorBanner from "@/components/ErrorBanner";
import SegmentedControl from "@/components/SegmentedControl";
import { useCurrency } from "@/lib/currency";
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

const SPLIT_TYPE_OPTIONS: { value: SplitType; label: string }[] = [
  { value: "EQUAL", label: "Equal" },
  { value: "EXACT", label: "Exact" },
  { value: "PERCENTAGE", label: "Percent" },
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
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType ?? "EQUAL");
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
            splitType === "PERCENTAGE"
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

  const parsedAmount = parseFloat(amount);
  const needsShares = splitType === "EXACT" || splitType === "PERCENTAGE";
  const descriptionError =
    descriptionTouched && description.trim().length === 0 ? "Description is required" : undefined;
  const amountError =
    amountTouched && !(Number.isFinite(parsedAmount) && parsedAmount > 0)
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
    participantIds.length > 0 &&
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
        participantUserIds: participantIds,
        shares: needsShares
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
        </div>
      </div>

      {isEditing && (
        <div>
          <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/70">
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
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green ${
                    selected
                      ? "border-ledger-green bg-ledger-green text-paper"
                      : "border-line text-ink/60 hover:text-ink"
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
        options={SPLIT_TYPE_OPTIONS}
        value={splitType}
        onChange={setSplitType}
      />

      <div>
        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/70">
          Category <span className="normal-case text-ink/40">(optional)</span>
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
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green ${
                  selected
                    ? "border-ledger-green bg-ledger-green text-paper"
                    : "border-line text-ink/60 hover:text-ink"
                }`}
              >
                {formatCategory(c)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-sm border border-line px-4 py-3">
        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/70">
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
                    className="h-4 w-4 rounded-sm border-line text-ledger-green focus:ring-ledger-green"
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
                    className="w-24 border-0 border-b border-line bg-transparent py-1 text-right font-sans text-sm text-ink outline-none focus:border-ledger-green focus:ring-0"
                  />
                )}
                {!needsShares && checked && Number.isFinite(parsedAmount) && parsedAmount > 0 && participantIds.length > 0 && (
                  <span className="font-mono text-xs tabular-nums text-ink/50">
                    {symbol}{(parsedAmount / participantIds.length).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {needsShares && (
          <p className={`mt-3 border-t border-line pt-2 font-mono text-xs ${sharesValid ? "text-ink/60" : "text-debt"}`}>
            {splitType === "PERCENTAGE"
              ? `Total: ${shareSum.toFixed(2)}% (must equal 100%)`
              : `Total: ${symbol}${shareSum.toFixed(2)} (must equal ${symbol}${
                  Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : "0.00"
                })`}
          </p>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="flex-1 rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-line px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink/70 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
