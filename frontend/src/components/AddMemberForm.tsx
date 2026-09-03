"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { addMember, GroupMember, GroupResponse } from "@/lib/groups";
import { searchUsers, UserSearchResult } from "@/lib/users";

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
          <span className="block font-mono text-xs uppercase tracking-wider text-ink/70">
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
            className="mt-1 w-full border-0 border-b border-line bg-transparent py-1.5 font-sans text-ink outline-none transition-colors focus:border-ledger-green focus:ring-0"
          />
        </label>

        {showResults && (searching || results.length > 0) && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto border border-line bg-paper shadow-sm">
            {searching ? (
              <li className="px-3 py-2 font-mono text-xs text-ink/60">Searching…</li>
            ) : (
              results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectUser(user)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-ledger-green/10"
                  >
                    <span className="font-sans text-sm text-ink">{user.name}</span>
                    <span className="font-mono text-xs text-ink/60">{user.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="font-mono text-sm text-debt">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={adding || !query.trim()}
          className="flex-1 rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add member"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-line px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-ink/70 transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
