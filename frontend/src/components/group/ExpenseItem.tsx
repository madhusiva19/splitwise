"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import { ExpenseResponse, formatCategory } from "@/lib/expenses";

interface ExpenseItemProps {
  expense: ExpenseResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

export default function ExpenseItem({ expense, canManage, onEdit, onDelete, deleting }: ExpenseItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="-m-2 flex w-full items-center justify-between gap-3 rounded-sm p-2 text-left transition-colors hover:bg-line/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ledger-green"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-mono text-base font-bold text-ink">{expense.description}</p>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60">
              {formatCategory(expense.category)}
            </span>
          </div>
          <p className="truncate font-mono text-xs uppercase tracking-wider text-ink/60">
            Paid by {expense.paidByName} · {new Date(expense.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Money amount={expense.amount} />
      </button>

      {expanded && (
        <div className="stitch-divider mt-3 pt-3">
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
                className="rounded-sm font-mono text-xs font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Delete "${expense.description}"`}
                className="rounded-sm font-mono text-xs font-bold text-debt transition-colors hover:text-debt/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-debt disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
