"use client";

import { useState } from "react";
import Card from "@/components/Card";
import { CardListSkeleton } from "@/components/Skeleton";
import AddRecurringExpenseForm from "@/components/AddRecurringExpenseForm";
import RecurringExpensesList from "@/components/RecurringExpensesList";
import { GroupMember } from "@/lib/groups";
import { RecurringExpenseResponse } from "@/lib/recurringExpenses";

interface RecurringTabProps {
  groupId: string;
  members: GroupMember[];
  templates: RecurringExpenseResponse[] | null;
  currentUserId: string;
  onCreated: (template: RecurringExpenseResponse) => void;
  onDeactivated: (templateId: string) => void;
}

export default function RecurringTab({
  groupId,
  members,
  templates,
  currentUserId,
  onCreated,
  onDeactivated,
}: RecurringTabProps) {
  const [showRecurringForm, setShowRecurringForm] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowRecurringForm((s) => !s)}
          className="rounded-sm font-mono text-sm font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
        >
          {showRecurringForm ? "Cancel" : "+ New recurring expense"}
        </button>
      </div>

      {showRecurringForm && (
        <Card className="mb-6">
          <AddRecurringExpenseForm
            groupId={groupId}
            members={members}
            onCreated={(template) => {
              setShowRecurringForm(false);
              onCreated(template);
            }}
            onCancel={() => setShowRecurringForm(false)}
          />
        </Card>
      )}

      {templates === null ? (
        <CardListSkeleton count={2} />
      ) : (
        <RecurringExpensesList
          groupId={groupId}
          templates={templates}
          currentUserId={currentUserId}
          onDeactivated={onDeactivated}
        />
      )}
    </div>
  );
}
