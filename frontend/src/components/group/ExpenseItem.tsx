"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import ReceiptSection from "@/components/group/ReceiptSection";
import { ExpenseResponse, formatCategory } from "@/lib/expenses";

interface ExpenseItemProps {
  groupId: string;
  expense: ExpenseResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  onReceiptChanged: (hasReceipt: boolean) => void;
}

export default function ExpenseItem({
  groupId,
  expense,
  canManage,
  onEdit,
  onDelete,
  deleting,
  onReceiptChanged,
}: ExpenseItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="-m-2 flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-sans text-base font-semibold text-ink">{expense.description}</p>
            <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 font-sans text-xs text-ink-muted">
              {formatCategory(expense.category)}
            </span>
            {expense.hasReceipt && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                aria-label="Has a receipt"
              >
                <title>Has a receipt</title>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </div>
          <p className="truncate font-sans text-xs text-ink-muted">
            Paid by {expense.paidByName} · {new Date(expense.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Money amount={expense.amount} />
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <ul className="space-y-1.5">
            {expense.shares.map((share) => (
              <li key={share.userId} className="flex items-center justify-between font-sans text-sm text-ink">
                <span>{share.userName}</span>
                <Money amount={share.shareAmount} />
              </li>
            ))}
          </ul>

          {canManage && (
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit "${expense.description}"`}
                className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Delete "${expense.description}"`}
                className="rounded-full font-sans text-sm font-semibold text-negative transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}

          <ReceiptSection
            groupId={groupId}
            expenseId={expense.id}
            hasReceipt={expense.hasReceipt}
            onChanged={onReceiptChanged}
          />
        </div>
      )}
    </Card>
  );
}
