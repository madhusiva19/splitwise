"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Field from "@/components/Field";
import Money from "@/components/Money";
import AddExpenseForm from "@/components/AddExpenseForm";
import CategoryBreakdownChart from "@/components/CategoryBreakdownChart";
import AddRecurringExpenseForm from "@/components/AddRecurringExpenseForm";
import RecurringExpensesList from "@/components/RecurringExpensesList";
import { getGroup, addMember, GroupResponse } from "@/lib/groups";
import {
  listExpenses,
  getBalances,
  getSettlementSuggestions,
  getCategoryBreakdown,
  formatCategory,
  ExpenseResponse,
  BalanceResponse,
  SettlementSuggestion,
  CategoryBreakdown,
} from "@/lib/expenses";
import {
  listRecurringExpenses,
  RecurringExpenseResponse,
} from "@/lib/recurringExpenses";

type Tab = "expenses" | "balances" | "settle" | "recurring";

function ExpenseItem({ expense }: { expense: ExpenseResponse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-base font-bold text-ink">{expense.description}</p>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60">
              {formatCategory(expense.category)}
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink/60">
            Paid by {expense.paidByName} · {new Date(expense.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Money amount={expense.amount} />
      </button>

      {expanded && (
        <div className="stitch-divider mt-3 pt-3">
          <ul className="space-y-1.5">
            {expense.shares.map((share) => (
              <li key={share.userId} className="flex items-center justify-between font-sans text-sm text-ink">
                <span>{share.userName}</span>
                <Money amount={share.shareAmount} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse[] | null>(null);
  const [balances, setBalances] = useState<BalanceResponse[] | null>(null);
  const [settlements, setSettlements] = useState<SettlementSuggestion[] | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[] | null>(null);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("expenses");

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(localStorage.getItem("userId") ?? "");
    if (groupId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, groupId]);

  async function loadAll() {
    try {
      const [g, e, b, s, c, r] = await Promise.all([
        getGroup(groupId),
        listExpenses(groupId),
        getBalances(groupId),
        getSettlementSuggestions(groupId),
        getCategoryBreakdown(groupId),
        listRecurringExpenses(groupId),
      ]);
      setGroup(g);
      setExpenses(e);
      setBalances(b);
      setSettlements(s);
      setCategoryBreakdown(c);
      setRecurringExpenses(r);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load group");
    }
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberError(null);
    setAddingMember(true);

    try {
      const updated = await addMember(groupId, memberEmail);
      setGroup(updated);
      setMemberEmail("");
      setShowMemberForm(false);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  function handleExpenseCreated(expense: ExpenseResponse) {
    setShowExpenseForm(false);
    setExpenses((prev) => (prev ? [expense, ...prev] : [expense]));
    getBalances(groupId).then(setBalances).catch(() => {});
    getSettlementSuggestions(groupId).then(setSettlements).catch(() => {});
    getCategoryBreakdown(groupId).then(setCategoryBreakdown).catch(() => {});
  }

  function handleRecurringExpenseCreated(template: RecurringExpenseResponse) {
    setShowRecurringForm(false);
    setRecurringExpenses((prev) => (prev ? [template, ...prev] : [template]));
  }

  function handleRecurringExpenseDeactivated(templateId: string) {
    setRecurringExpenses((prev) => (prev ? prev.filter((t) => t.id !== templateId) : prev));
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-paper px-4 py-10">
        <div className="mx-auto max-w-2xl">
          {loadError ? (
            <p role="alert" className="font-mono text-sm text-debt">
              {loadError}
            </p>
          ) : (
            <p className="font-mono text-sm text-ink/60">Loading…</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block font-mono text-xs uppercase tracking-wider text-ink/60 hover:text-ink"
        >
          ← Your groups
        </Link>

        <header className="mb-6">
          <h1 className="font-mono text-2xl font-bold text-ink">{group.name}</h1>
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
              className="font-mono text-xs font-bold text-ledger-green hover:text-ledger-green-dark"
            >
              {showMemberForm ? "Cancel" : "+ Add member"}
            </button>
          </div>
        </header>

        {showMemberForm && (
          <Card className="mb-6">
            <form onSubmit={handleAddMember} className="space-y-4" noValidate>
              <Field
                label="Email"
                type="email"
                value={memberEmail}
                onChange={setMemberEmail}
                placeholder="friend@example.com"
                required
              />

              {memberError && (
                <p role="alert" className="font-mono text-sm text-debt">
                  {memberError}
                </p>
              )}

              <button
                type="submit"
                disabled={addingMember}
                className="w-full rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingMember ? "Saving…" : "Add member"}
              </button>
            </form>
          </Card>
        )}

        {loadError && (
          <p role="alert" className="mb-4 font-mono text-sm text-debt">
            {loadError}
          </p>
        )}

        <nav className="mb-4 flex gap-8 font-mono text-sm">
          {(["expenses", "balances", "settle", "recurring"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "border-b-2 border-ledger-green pb-1 font-bold text-ledger-green"
                  : "pb-1 text-ink/60 hover:text-ink"
              }
              aria-current={tab === t ? "page" : undefined}
            >
              {t === "expenses"
                ? "Expenses"
                : t === "balances"
                ? "Balances"
                : t === "settle"
                ? "Settle up"
                : "Recurring"}
            </button>
          ))}
        </nav>
        <div className="stitch-divider mb-6" aria-hidden="true" />

        {tab === "expenses" && (
          <div>
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowExpenseForm((s) => !s)}
                className="font-mono text-sm font-bold text-ledger-green hover:text-ledger-green-dark"
              >
                {showExpenseForm ? "Cancel" : "+ Add expense"}
              </button>
            </div>

            {showExpenseForm && (
              <Card className="mb-6">
                <AddExpenseForm
                  groupId={groupId}
                  members={group.members}
                  onCreated={handleExpenseCreated}
                  onCancel={() => setShowExpenseForm(false)}
                />
              </Card>
            )}

            <CategoryBreakdownChart breakdown={categoryBreakdown} />

            {expenses === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : expenses.length === 0 ? (
              <p className="font-mono text-sm text-ink/60">No expenses yet.</p>
            ) : (
              <ul className="space-y-3">
                {expenses.map((expense) => (
                  <li key={expense.id}>
                    <ExpenseItem expense={expense} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "balances" && (
          <div>
            {balances === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : balances.length === 0 ? (
              <p className="font-mono text-sm text-ink/60">No balances yet.</p>
            ) : (
              <ul className="space-y-3">
                {balances.map((b) => (
                  <li key={b.userId}>
                    <Card>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-ink">{b.userName}</span>
                        <Money amount={b.netBalance} showSign />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "settle" && (
          <div>
            {settlements === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : settlements.length === 0 ? (
              <p className="font-mono text-sm text-ink/60">
                All settled up — no payments needed.
              </p>
            ) : (
              <ul className="space-y-3">
                {settlements.map((s, i) => (
                  <li key={`${s.fromUserId}-${s.toUserId}-${i}`}>
                    <Card>
                      <p className="font-sans text-sm text-ink">
                        <span className="font-mono font-bold">{s.fromUserName}</span> pays{" "}
                        <span className="font-mono font-bold">{s.toUserName}</span>{" "}
                        <Money amount={s.amount} />
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "recurring" && (
          <div>
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRecurringForm((s) => !s)}
                className="font-mono text-sm font-bold text-ledger-green hover:text-ledger-green-dark"
              >
                {showRecurringForm ? "Cancel" : "+ New recurring expense"}
              </button>
            </div>

            {showRecurringForm && (
              <Card className="mb-6">
                <AddRecurringExpenseForm
                  groupId={groupId}
                  members={group.members}
                  onCreated={handleRecurringExpenseCreated}
                  onCancel={() => setShowRecurringForm(false)}
                />
              </Card>
            )}

            {recurringExpenses === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : (
              <RecurringExpensesList
                groupId={groupId}
                templates={recurringExpenses}
                currentUserId={currentUserId}
                onDeactivated={handleRecurringExpenseDeactivated}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
