"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import ErrorBanner from "@/components/ErrorBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddMemberForm from "@/components/AddMemberForm";
import Avatar from "@/components/Avatar";
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
          <h1 className="break-words font-sans text-2xl font-extrabold text-ink sm:text-3xl">{group.name}</h1>
          {group.createdByUserId === currentUserId ? (
            <button
              type="button"
              onClick={() => setShowDeleteGroupDialog(true)}
              disabled={deletingGroup}
              className="whitespace-nowrap rounded-full font-sans text-sm font-semibold text-negative transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingGroup ? "Deleting…" : "Delete group"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLeaveGroupDialog(true)}
              disabled={leavingGroup}
              className="whitespace-nowrap rounded-full font-sans text-sm font-semibold text-negative transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negative disabled:cursor-not-allowed disabled:opacity-60"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3 font-sans text-sm text-ink/80"
            >
              <Avatar name={m.name} size="sm" />
              {m.name}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setShowMemberForm((s) => !s)}
            className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
