"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Money from "@/components/Money";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import { CardListSkeleton } from "@/components/Skeleton";
import { recordSettlement, remindSettlement, SettlementSuggestion } from "@/lib/expenses";

interface SettleTabProps {
  groupId: string;
  settlements: SettlementSuggestion[] | null;
  currentUserId: string;
  onSettled: () => Promise<void>;
}

export default function SettleTab({ groupId, settlements, currentUserId, onSettled }: SettleTabProps) {
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [remindingKey, setRemindingKey] = useState<string | null>(null);
  const [remindedKeys, setRemindedKeys] = useState<Set<string>>(new Set());

  async function handleSettleUp(suggestion: SettlementSuggestion) {
    const key = `${suggestion.fromUserId}-${suggestion.toUserId}`;
    setSettleError(null);
    setSettlingKey(key);

    try {
      await recordSettlement(groupId, { toUserId: suggestion.toUserId, amount: suggestion.amount });
      await onSettled();
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setSettlingKey(null);
    }
  }

  async function handleSendReminder(suggestion: SettlementSuggestion) {
    const key = `${suggestion.fromUserId}-${suggestion.toUserId}`;
    setSettleError(null);
    setRemindingKey(key);

    try {
      await remindSettlement(groupId, { toUserId: suggestion.fromUserId, amount: suggestion.amount });
      setRemindedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setRemindingKey(null);
    }
  }

  return (
    <div>
      {settleError && <ErrorBanner className="mb-4" message={settleError} />}

      {settlements === null ? (
        <CardListSkeleton count={2} />
      ) : settlements.length === 0 ? (
        <EmptyState
          title="All settled up"
          hint="No payments are needed right now."
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          }
        />
      ) : (
        <ul className="space-y-3">
          {settlements.map((s, i) => {
            const key = `${s.fromUserId}-${s.toUserId}`;
            const canSettle = s.fromUserId === currentUserId;
            const canRemind = s.toUserId === currentUserId;
            const alreadyReminded = remindedKeys.has(key);
            return (
              <li key={`${key}-${i}`}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex flex-wrap items-center gap-x-1.5 font-sans text-sm text-ink">
                      <span className="font-semibold">{s.fromUserName}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5 text-ink-muted"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      <span className="font-semibold">{s.toUserName}</span>
                      <Money amount={s.amount} />
                    </p>
                    {canSettle && (
                      <button
                        type="button"
                        onClick={() => handleSettleUp(s)}
                        disabled={settlingKey === key}
                        className="whitespace-nowrap rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {settlingKey === key ? "Recording…" : "Mark as paid"}
                      </button>
                    )}
                    {canRemind && (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(s)}
                        disabled={remindingKey === key || alreadyReminded}
                        className="whitespace-nowrap rounded-full font-sans text-sm font-semibold text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {remindingKey === key ? "Sending…" : alreadyReminded ? "Reminded ✓" : "Send reminder"}
                      </button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
