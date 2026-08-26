"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import { formatCategory } from "@/lib/expenses";
import {
  deactivateRecurringExpense,
  formatFrequency,
  formatNextRunAt,
  RecurringExpenseResponse,
} from "@/lib/recurringExpenses";

interface RecurringExpensesListProps {
  groupId: string;
  templates: RecurringExpenseResponse[];
  currentUserId: string;
  onDeactivated: (templateId: string) => void;
}

function RecurringExpenseItem({
  groupId,
  template,
  canDeactivate,
  onDeactivated,
}: {
  groupId: string;
  template: RecurringExpenseResponse;
  canDeactivate: boolean;
  onDeactivated: (templateId: string) => void;
}) {
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    if (!window.confirm("Stop this recurring expense?")) return;
    setError(null);
    setDeactivating(true);
    try {
      await deactivateRecurringExpense(groupId, template.id);
      onDeactivated(template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
      setDeactivating(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-base font-bold text-ink">{template.description}</p>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60">
              {formatCategory(template.category)}
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink/60">
            {formatFrequency(template.frequency)} · Next: {formatNextRunAt(template.nextRunAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Money amount={template.amount} />
          {canDeactivate && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-full border border-debt px-3 py-1 font-mono text-xs text-debt transition-colors hover:bg-debt hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deactivating ? "…" : "Cancel"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-mono text-xs text-debt">
          {error}
        </p>
      )}
    </Card>
  );
}

export default function RecurringExpensesList({
  groupId,
  templates,
  currentUserId,
  onDeactivated,
}: RecurringExpensesListProps) {
  const active = templates.filter((t) => t.active);

  if (active.length === 0) {
    return <p className="font-mono text-sm text-ink/60">No recurring expenses yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {active.map((template) => (
        <li key={template.id}>
          <RecurringExpenseItem
            groupId={groupId}
            template={template}
            canDeactivate={template.createdByUserId === currentUserId}
            onDeactivated={onDeactivated}
          />
        </li>
      ))}
    </ul>
  );
}
