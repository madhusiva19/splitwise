import Card from "@/components/Card";
import { ActivityItem, ActivityType } from "@/lib/activity";

const TYPE_LABELS: Record<ActivityType, string> = {
  EXPENSE_ADDED: "Expense",
  SETTLEMENT_RECORDED: "Settled",
  MEMBER_JOINED: "Joined",
};

interface ActivityFeedProps {
  items: ActivityItem[] | null;
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items === null) {
    return <p className="font-mono text-sm text-ink/60">Loading…</p>;
  }

  if (items.length === 0) {
    return <p className="font-mono text-sm text-ink/60">No activity yet.</p>;
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
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60">
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
