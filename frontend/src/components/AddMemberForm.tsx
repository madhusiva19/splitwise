"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { addMember, GroupMember, GroupResponse } from "@/lib/groups";
import { searchUsers, UserSearchResult } from "@/lib/users";
import ErrorBanner from "@/components/ErrorBanner";
import Button from "@/components/Button";

interface AddMemberFormProps {
  groupId: string;
  existingMembers: GroupMember[];
  onAdded: (group: GroupResponse) => void;
  onCancel: () => void;
}

export default function AddMemberForm({ groupId, existingMembers, onAdded, onCancel }: AddMemberFormProps) {
  const [query, setQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingMemberIds = new Set(existingMembers.map((m) => m.userId));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchUsers(trimmed);
        setResults(found.filter((u) => !existingMemberIds.has(u.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectUser(user: UserSearchResult) {
    setQuery(`${user.name} (${user.email})`);
    setSelectedEmail(user.email);
    setResults([]);
    setShowResults(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const email = selectedEmail ?? query.trim();
    if (!email) return;
    setError(null);
    setAdding(true);

    try {
      const updated = await addMember(groupId, email);
      onAdded(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="relative">
        <label className="block">
          <span className="block font-sans text-sm font-medium text-ink-muted">
            Add member
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedEmail(null);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            placeholder="Search by name or email"
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-transparent bg-surface-muted px-4 py-2.5 font-sans text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {showResults && (searching || results.length > 0) && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-surface shadow-card dark:shadow-card-dark">
            {searching ? (
              <li className="px-3.5 py-2.5 font-sans text-sm text-ink-muted">Searching…</li>
            ) : (
              results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectUser(user)}
                    className="flex w-full flex-col items-start px-3.5 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                  >
                    <span className="font-sans text-sm text-ink">{user.name}</span>
                    <span className="font-sans text-xs text-ink-muted">{user.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-3">
        <Button type="submit" fullWidth disabled={!query.trim()} loading={adding} loadingLabel="Adding…">
          Add member
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
