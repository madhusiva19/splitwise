"use client";

import { useMemo, useState, FormEvent } from "react";
import Field from "@/components/Field";
import {
  createExpense,
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseResponse,
  EXPENSE_CATEGORIES,
  formatCategory,
  SplitType,
} from "@/lib/expenses";
import { GroupMember } from "@/lib/groups";

interface AddExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  onCreated: (expense: ExpenseResponse) => void;
  onCancel: () => void;
}

export default function AddExpenseForm({ groupId, members, onCreated, onCancel }: AddExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [category, setCategory] = useState<ExpenseCategory | undefined>(undefined);
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.userId));
  const [shareInputs, setShareInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedAmount = parseFloat(amount);
  const needsShares = splitType === "EXACT" || splitType === "PERCENTAGE";

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
      const expense = await createExpense(groupId, req);
      onCreated(expense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field
        label="Description"
        type="text"
        value={description}
        onChange={setDescription}
        placeholder="Groceries"
        required
      />
      <Field
        label="Amount"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="0.00"
        required
      />

      <label className="block">
        <span className="block font-mono text-xs uppercase tracking-wider text-ink/70">
          Split type
        </span>
        <select
          value={splitType}
          onChange={(e) => setSplitType(e.target.value as SplitType)}
          className="mt-1 w-full border-0 border-b border-line bg-transparent py-1.5 font-sans text-ink outline-none transition-colors focus:border-ledger-green focus:ring-0"
        >
          <option value="EQUAL">Equal</option>
          <option value="EXACT">Exact amounts</option>
          <option value="PERCENTAGE">Percentage</option>
        </select>
      </label>

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
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
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

      <div>
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
                    className="h-4 w-4 border-line text-ledger-green focus:ring-ledger-green"
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
              </div>
            );
          })}
        </div>
        {needsShares && (
          <p className={`mt-2 font-mono text-xs ${sharesValid ? "text-ink/60" : "text-debt"}`}>
            {splitType === "PERCENTAGE"
              ? `Total: ${shareSum.toFixed(2)}% (must equal 100%)`
              : `Total: ₹${shareSum.toFixed(2)} (must equal ₹${
                  Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : "0.00"
                })`}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-debt">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="flex-1 rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-line px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink/70 transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
