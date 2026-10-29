"use client";

import { useState, FormEvent } from "react";
import Field from "@/components/Field";
import ErrorBanner from "@/components/ErrorBanner";
import Button from "@/components/Button";
import SegmentedControl from "@/components/SegmentedControl";
import { EXPENSE_CATEGORIES, ExpenseCategory, formatCategory } from "@/lib/expenses";
import { GroupMember } from "@/lib/groups";
import {
  createRecurringExpense,
  CreateRecurringExpenseRequest,
  RecurrenceFrequency,
  RecurringExpenseResponse,
} from "@/lib/recurringExpenses";

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

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

      <SegmentedControl label="Repeats" options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />

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

      <div className="rounded-2xl border border-border px-4 py-3.5">
        <span className="mb-2 block font-sans text-sm font-medium text-ink-muted">
          Participants (split equally)
        </span>
        <div className="space-y-2">
          {members.map((member) => (
            <label key={member.userId} className="flex items-center gap-2 font-sans text-sm text-ink">
              <input
                type="checkbox"
                checked={participantIds.includes(member.userId)}
                onChange={() => toggleParticipant(member.userId)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              {member.name}
            </label>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-3">
        <Button type="submit" fullWidth disabled={!canSubmit} loading={saving} loadingLabel="Saving…">
          Add recurring expense
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
