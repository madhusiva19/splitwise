"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import ErrorBanner from "@/components/ErrorBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddMemberForm from "@/components/AddMemberForm";
import { GroupResponse, deleteGroup, leaveGroup } from "@/lib/groups";

interface GroupHeaderProps {
  groupId: string;
  group: GroupResponse;
  currentUserId: string;
  onGroupUpdated: (group: GroupResponse) => void;
  onMemberAdded: () => void;
}

export default function GroupHeader({ groupId, group, currentUserId, onGroupUpdated, onMemberAdded }: GroupHeaderProps) {
  const router = useRouter();

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [leaveGroupError, setLeaveGroupError] = useState<string | null>(null);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);

  async function handleConfirmDeleteGroup() {
    setDeleteGroupError(null);
    setDeletingGroup(true);

    try {
      await deleteGroup(groupId);
      router.push("/");
    } catch (err) {
      setDeleteGroupError(err instanceof Error ? err.message : "Failed to delete group");
      setDeletingGroup(false);
      setShowDeleteGroupDialog(false);
    }
  }

  async function handleConfirmLeaveGroup() {
    setLeaveGroupError(null);
    setLeavingGroup(true);

    try {
      await leaveGroup(groupId);
      router.push("/");
    } catch (err) {
      setLeaveGroupError(err instanceof Error ? err.message : "Failed to leave group");
      setLeavingGroup(false);
      setShowLeaveGroupDialog(false);
    }
  }

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h1 className="break-words font-mono text-2xl font-bold text-ink sm:text-3xl">{group.name}</h1>
          {group.createdByUserId === currentUserId ? (
            <button
              type="button"
              onClick={() => setShowDeleteGroupDialog(true)}
              disabled={deletingGroup}
              className="whitespace-nowrap rounded-sm font-mono text-xs font-bold text-debt transition-colors hover:text-debt/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-debt disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingGroup ? "Deleting…" : "Delete group"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLeaveGroupDialog(true)}
              disabled={leavingGroup}
              className="whitespace-nowrap rounded-sm font-mono text-xs font-bold text-debt transition-colors hover:text-debt/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-debt disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leavingGroup ? "Leaving…" : "Leave group"}
            </button>
          )}
        </div>
        {deleteGroupError && <ErrorBanner className="mt-2" message={deleteGroupError} />}
        {leaveGroupError && <ErrorBanner className="mt-2" message={leaveGroupError} />}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {group.members.map((m) => (
            <span
              key={m.userId}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 font-mono text-xs text-ink/80"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ledger-green font-mono text-[10px] font-bold text-paper">
                {m.name.charAt(0).toUpperCase()}
              </span>
              {m.name}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setShowMemberForm((s) => !s)}
            className="rounded-sm font-mono text-xs font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
          >
            {showMemberForm ? "Cancel" : "+ Add member"}
          </button>
        </div>
      </header>

      {showMemberForm && (
        <Card className="mb-6">
          <AddMemberForm
            groupId={groupId}
            existingMembers={group.members}
            onAdded={(updated) => {
              onGroupUpdated(updated);
              setShowMemberForm(false);
              onMemberAdded();
            }}
            onCancel={() => setShowMemberForm(false)}
          />
        </Card>
      )}

      <ConfirmDialog
        open={showDeleteGroupDialog}
        title={`Delete "${group.name}"?`}
        description="This permanently removes all its expenses, settlements, and history for everyone in the group. This can't be undone."
        confirmationPhrase={group.name}
        confirmLabel="Delete group"
        confirmingLabel="Deleting…"
        confirming={deletingGroup}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setShowDeleteGroupDialog(false)}
      />

      <ConfirmDialog
        open={showLeaveGroupDialog}
        title={`Leave "${group.name}"?`}
        description="You'll lose access to its expenses and history. You can only leave once you're fully settled up."
        confirmLabel="Leave group"
        confirmingLabel="Leaving…"
        confirming={leavingGroup}
        onConfirm={handleConfirmLeaveGroup}
        onCancel={() => setShowLeaveGroupDialog(false)}
      />
    </>
  );
}
