"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Field from "@/components/Field";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import Button from "@/components/Button";
import { CardListSkeleton } from "@/components/Skeleton";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { createGroup, listGroups, GroupSummaryResponse } from "@/lib/groups";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupSummaryResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCurrency, setGroupCurrency] = useState("INR");
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
    setLoadError(null);
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
      await createGroup(groupName, groupCurrency);
      setGroupName("");
      setGroupCurrency("INR");
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
    <PageShell>
      <header className="mb-8">
        <p className="font-sans text-sm text-ink-muted">Welcome back</p>
        <h1 className="font-sans text-2xl font-extrabold text-ink sm:text-3xl">{name}</h1>
      </header>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-semibold text-ink">
          Your Groups
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full font-sans text-sm font-semibold text-primary transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

            <label className="block">
              <span className="block font-sans text-sm font-medium text-ink-muted">Currency</span>
              <select
                value={groupCurrency}
                onChange={(e) => setGroupCurrency(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-transparent bg-surface-muted px-4 py-2.5 font-sans text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label} ({c.symbol})
                  </option>
                ))}
              </select>
            </label>

            {createError && <ErrorBanner message={createError} />}

            <Button type="submit" fullWidth loading={creating} loadingLabel="Saving…">
              Create group
            </Button>
          </form>
        </Card>
      )}

      {loadError && <ErrorBanner className="mb-4" message={loadError} />}

      {groups === null ? (
        <CardListSkeleton count={3} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          hint="Create a group above to start splitting expenses with friends."
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Card className="transition-all hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-sans text-base font-semibold text-ink">{group.name}</span>
                    <span className="shrink-0 font-sans text-xs text-ink-muted">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · {group.currency}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
