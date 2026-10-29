"use client";

import { useState } from "react";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Avatar from "@/components/Avatar";
import { CardListSkeleton } from "@/components/Skeleton";
import { ActivityItem, ActivityType } from "@/lib/activity";

const TYPE_LABELS: Record<ActivityType, string> = {
  EXPENSE_ADDED: "Expense",
  SETTLEMENT_RECORDED: "Settled",
  MEMBER_JOINED: "Joined",
};

const TYPE_BADGE_CLASSES: Record<ActivityType, string> = {
  EXPENSE_ADDED: "bg-surface-muted text-ink-muted",
  SETTLEMENT_RECORDED: "bg-positive/10 text-positive",
  MEMBER_JOINED: "bg-surface-muted text-ink-muted",
};

const PAGE_SIZE = 10;

interface ActivityFeedProps {
  items: ActivityItem[] | null;
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (items === null) {
    return <CardListSkeleton count={4} />;
  }

  if (items.length === 0) {
    return <EmptyState title="No activity yet" hint="Expenses, settlements, and new members show up here." />;
  }

  const visible = items.slice(0, visibleCount);

  return (
    <>
      <ul className="space-y-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Avatar name={item.actorName} size="sm" />
                  <p className="font-sans text-sm text-ink">{item.message}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${TYPE_BADGE_CLASSES[item.type]}`}
                >
                  {TYPE_LABELS[item.type]}
                </span>
              </div>
              <p className="mt-1.5 pl-9 font-sans text-xs text-ink-muted">
                {new Date(item.occurredAt).toLocaleString()}
              </p>
            </Card>
          </li>
        ))}
      </ul>
      {items.length > visibleCount && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-full border border-border px-4 py-2 font-sans text-sm font-semibold text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Show more ({items.length - visibleCount} more)
          </button>
        </div>
      )}
    </>
  );
}
