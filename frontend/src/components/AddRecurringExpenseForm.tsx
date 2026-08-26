"use client";

import { useState, FormEvent } from "react";
import Field from "@/components/Field";
import { EXPENSE_CATEGORIES, ExpenseCategory, formatCategory } from "@/lib/expenses";
import { GroupMember } from "@/lib/groups";
import {
  createRecurringExpense,
  CreateRecurringExpenseRequest,
  RecurrenceFrequency,
  RecurringExpenseResponse,
} from "@/lib/recurringExpenses";

interface AddRecurringExpenseFormProps {
  groupId: string;
  members: GroupMember[];
  onCreated: (template: RecurringExpenseResponse) => void;
  onCancel: () => void;
}

export default function AddRecurringExpenseForm({
  groupId,
  members,
  onCreated,
  onCancel,
}: AddRecurringExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [category, setCategory] = useState<ExpenseCategory | undefined>(undefined);
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.userId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedAmount = parseFloat(amount);

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  const canSubmit =
    description.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    participantIds.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSaving(true);

    try {
      const req: CreateRecurringExpenseRequest = {
        description,
        amount: parsedAmount,
        category,
        participantUserIds: participantIds,
        frequency,
      };
      const template = await createRecurringExpense(groupId, req);
      onCreated(template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recurring expense");
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
        placeholder="Rent"
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

      <div>
        <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/70">
          Repeats
        </span>
        <div className="flex gap-2">
          {(["WEEKLY", "MONTHLY"] as RecurrenceFrequency[]).map((f) => {
            const selected = frequency === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                  selected
                    ? "border-ledger-green bg-ledger-green text-paper"
                    : "border-line text-ink/60 hover:text-ink"
                }`}
              >
                {f === "WEEKLY" ? "Weekly" : "Monthly"}
              </button>
            );
          })}
        </div>
      </div>

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
          Participants (split equally)
        </span>
        <div className="space-y-2">
          {members.map((member) => (
            <label key={member.userId} className="flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={participantIds.includes(member.userId)}
                onChange={() => toggleParticipant(member.userId)}
                className="h-4 w-4 border-line text-ledger-green focus:ring-ledger-green"
              />
              {member.name}
            </label>
          ))}
        </div>
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
          {saving ? "Saving…" : "Add recurring expense"}
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
