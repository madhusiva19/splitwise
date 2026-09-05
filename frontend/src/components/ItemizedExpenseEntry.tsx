"use client";

import { useEffect, useState } from "react";
import { useCurrency } from "@/lib/currency";
import { computeItemizedShares, ItemizedResult } from "@/lib/itemizedSplit";
import { GroupMember } from "@/lib/groups";

interface LineItem {
  id: string;
  label: string;
  price: string;
  assignedUserIds: string[];
}

interface ItemizedExpenseEntryProps {
  members: GroupMember[];
  onChange: (result: ItemizedResult | null) => void;
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), label: "", price: "", assignedUserIds: [] };
}

export default function ItemizedExpenseEntry({ members, onChange }: ItemizedExpenseEntryProps) {
  const { symbol } = useCurrency();
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [extra, setExtra] = useState("");

  const memberOrder = members.map((m) => m.userId);
  const result = computeItemizedShares(items, extra, memberOrder);

  useEffect(() => {
    onChange(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, extra]);

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function toggleAssignee(itemId: string, userId: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              assignedUserIds: it.assignedUserIds.includes(userId)
                ? it.assignedUserIds.filter((id) => id !== userId)
                : [...it.assignedUserIds, userId],
            }
          : it
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  const itemsSubtotal = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0);
  const extraAmount = parseFloat(extra) || 0;

  return (
    <div className="space-y-4 rounded-sm border border-line px-4 py-3">
      <span className="block font-mono text-xs uppercase tracking-wider text-ink/70">Line items</span>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 border-b border-line/60 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder={`Item ${index + 1}`}
                className="min-w-0 flex-1 border-0 border-b border-line bg-transparent py-1 font-sans text-sm text-ink outline-none focus:border-ledger-green focus:ring-0"
              />
              <input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: e.target.value })}
                placeholder="0.00"
                className="w-24 border-0 border-b border-line bg-transparent py-1 text-right font-sans text-sm text-ink outline-none focus:border-ledger-green focus:ring-0"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.label || `item ${index + 1}`}`}
                  className="shrink-0 rounded-sm font-mono text-xs text-ink/40 transition-colors hover:text-debt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const selected = item.assignedUserIds.includes(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleAssignee(item.id, member.userId)}
                    aria-pressed={selected}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green ${
                      selected
                        ? "border-ledger-green bg-ledger-green text-paper"
                        : "border-line text-ink/60 hover:text-ink"
                    }`}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, newItem()])}
        className="font-mono text-xs font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
      >
        + Add item
      </button>

      <label className="block">
        <span className="block font-mono text-xs uppercase tracking-wider text-ink/70">
          Tax / tip / extra <span className="normal-case text-ink/40">(optional, split proportionally)</span>
        </span>
        <input
          type="number"
          step="0.01"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-32 border-0 border-b border-line bg-transparent py-1.5 font-sans text-sm text-ink outline-none focus:border-ledger-green focus:ring-0"
        />
      </label>

      <div className="border-t border-line pt-3">
        {result === null ? (
          <p className="font-mono text-xs text-ink/50">
            Add at least one priced item with someone assigned to it.
          </p>
        ) : (
          <>
            <p className="font-mono text-xs text-ink/60">
              Subtotal {symbol}{itemsSubtotal.toFixed(2)}
              {extraAmount > 0 ? ` + ${symbol}${extraAmount.toFixed(2)} extra` : ""} ={" "}
              <span className="font-bold text-ink">Total {symbol}{result.amount.toFixed(2)}</span>
            </p>
            <ul className="mt-2 space-y-1">
              {result.shares.map((s) => {
                const member = members.find((m) => m.userId === s.userId);
                return (
                  <li key={s.userId} className="flex items-center justify-between font-sans text-sm text-ink">
                    <span>{member?.name ?? "Unknown"}</span>
                    <span className="font-mono tabular-nums">{symbol}{s.amount.toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
