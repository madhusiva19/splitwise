"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Field from "@/components/Field";
import NavBar from "@/components/NavBar";
import { createGroup, listGroups, GroupSummaryResponse } from "@/lib/groups";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupSummaryResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    setName(localStorage.getItem("userName"));
    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function refreshGroups() {
    try {
      const data = await listGroups();
      setGroups(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load groups");
    }
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      await createGroup(groupName);
      setGroupName("");
      setShowForm(false);
      await refreshGroups();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  if (!name) return null;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60">Welcome back</p>
          <h1 className="font-mono text-2xl font-bold text-ink">{name}</h1>
        </header>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">
            Your Groups
          </h2>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="font-mono text-sm font-bold text-ledger-green hover:text-ledger-green-dark"
          >
            {showForm ? "Cancel" : "+ New Group"}
          </button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <form onSubmit={handleCreateGroup} className="space-y-4" noValidate>
              <Field
                label="Group name"
                type="text"
                value={groupName}
                onChange={setGroupName}
                placeholder="Goa Trip"
                required
              />

              {createError && (
                <p role="alert" className="font-mono text-sm text-debt">
                  {createError}
                </p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Saving…" : "Create group"}
              </button>
            </form>
          </Card>
        )}

        {loadError && (
          <p role="alert" className="mb-4 font-mono text-sm text-debt">
            {loadError}
          </p>
        )}

        {groups === null ? (
          <p className="font-mono text-sm text-ink/60">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="font-mono text-sm text-ink/60">
            No groups yet — create one to get started.
          </p>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`}>
                  <Card className="transition-colors hover:border-ledger-green">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-ink">{group.name}</span>
                      <span className="font-mono text-xs uppercase tracking-wider text-ink/60">
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
    </>
  );
}
