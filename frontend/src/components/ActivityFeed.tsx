import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import { CardListSkeleton } from "@/components/Skeleton";
import { ActivityItem, ActivityType } from "@/lib/activity";

const TYPE_LABELS: Record<ActivityType, string> = {
  EXPENSE_ADDED: "Expense",
  SETTLEMENT_RECORDED: "Settled",
  MEMBER_JOINED: "Joined",
};

const TYPE_BADGE_CLASSES: Record<ActivityType, string> = {
  EXPENSE_ADDED: "border-line text-ink/60",
  SETTLEMENT_RECORDED: "border-ledger-green/40 text-ledger-green",
  MEMBER_JOINED: "border-line text-ink/60",
};

interface ActivityFeedProps {
  items: ActivityItem[] | null;
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items === null) {
    return <CardListSkeleton count={4} />;
  }

  if (items.length === 0) {
    return <EmptyState title="No activity yet" hint="Expenses, settlements, and new members show up here." />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ledger-green font-mono text-[10px] font-bold text-paper">
                  {item.actorName.charAt(0).toUpperCase()}
                </span>
                <p className="font-sans text-sm text-ink">{item.message}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_BADGE_CLASSES[item.type]}`}
              >
                {TYPE_LABELS[item.type]}
              </span>
            </div>
            <p className="mt-1.5 pl-7 font-mono text-xs uppercase tracking-wider text-ink/60">
              {new Date(item.occurredAt).toLocaleString()}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
