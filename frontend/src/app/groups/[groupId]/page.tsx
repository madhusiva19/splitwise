"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Money from "@/components/Money";
import NavBar from "@/components/NavBar";
import AddExpenseForm from "@/components/AddExpenseForm";
import AddMemberForm from "@/components/AddMemberForm";
import CategoryBreakdownChart from "@/components/CategoryBreakdownChart";
import AddRecurringExpenseForm from "@/components/AddRecurringExpenseForm";
import RecurringExpensesList from "@/components/RecurringExpensesList";
import ActivityFeed from "@/components/ActivityFeed";
import { getGroup, deleteGroup, GroupResponse } from "@/lib/groups";
import { downloadCsv } from "@/lib/csv";
import {
  listExpenses,
  getBalances,
  getSettlementSuggestions,
  getCategoryBreakdown,
  recordSettlement,
  deleteExpense,
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
import { getGroupActivity, ActivityItem } from "@/lib/activity";

type Tab = "expenses" | "balances" | "settle" | "recurring" | "activity";

interface ExpenseItemProps {
  expense: ExpenseResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function ExpenseItem({ expense, canManage, onEdit, onDelete, deleting }: ExpenseItemProps) {
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

          {canManage && (
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                onClick={onEdit}
                className="font-mono text-xs font-bold text-ledger-green hover:text-ledger-green-dark"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="font-mono text-xs font-bold text-debt hover:text-debt/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
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
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("expenses");

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [expenseActionError, setExpenseActionError] = useState<string | null>(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);

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
      const [g, e, b, s, c, r, a] = await Promise.all([
        getGroup(groupId),
        listExpenses(groupId),
        getBalances(groupId),
        getSettlementSuggestions(groupId),
        getCategoryBreakdown(groupId),
        listRecurringExpenses(groupId),
        getGroupActivity(groupId),
      ]);
      setGroup(g);
      setExpenses(e);
      setBalances(b);
      setSettlements(s);
      setCategoryBreakdown(c);
      setRecurringExpenses(r);
      setActivity(a);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load group");
    }
  }

  async function handleExpenseSaved(expense: ExpenseResponse) {
    setShowExpenseForm(false);
    setEditingExpense(null);

    // Fetch the derived views before touching state, so the expense list and the
    // balances/settlements/category chart update together in one render instead of
    // the list changing first and the chart briefly showing stale data.
    const [b, s, c, a] = await Promise.all([
      getBalances(groupId),
      getSettlementSuggestions(groupId),
      getCategoryBreakdown(groupId),
      getGroupActivity(groupId),
    ]);
    setExpenses((prev) => {
      if (!prev) return [expense];
      const exists = prev.some((e) => e.id === expense.id);
      return exists ? prev.map((e) => (e.id === expense.id ? expense : e)) : [expense, ...prev];
    });
    setBalances(b);
    setSettlements(s);
    setCategoryBreakdown(c);
    setActivity(a);
  }

  async function handleDeleteExpense(expense: ExpenseResponse) {
    if (!window.confirm(`Delete "${expense.description}"?`)) return;
    setExpenseActionError(null);
    setDeletingExpenseId(expense.id);

    try {
      await deleteExpense(groupId, expense.id);
      const [b, s, c, a] = await Promise.all([
        getBalances(groupId),
        getSettlementSuggestions(groupId),
        getCategoryBreakdown(groupId),
        getGroupActivity(groupId),
      ]);
      setExpenses((prev) => (prev ? prev.filter((e) => e.id !== expense.id) : prev));
      setBalances(b);
      setSettlements(s);
      setCategoryBreakdown(c);
      setActivity(a);
    } catch (err) {
      setExpenseActionError(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleSettleUp(suggestion: SettlementSuggestion) {
    const key = `${suggestion.fromUserId}-${suggestion.toUserId}`;
    setSettleError(null);
    setSettlingKey(key);

    try {
      await recordSettlement(groupId, { toUserId: suggestion.toUserId, amount: suggestion.amount });
      const [b, s, a] = await Promise.all([
        getBalances(groupId),
        getSettlementSuggestions(groupId),
        getGroupActivity(groupId),
      ]);
      setBalances(b);
      setSettlements(s);
      setActivity(a);
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setSettlingKey(null);
    }
  }

  async function handleDeleteGroup() {
    if (!group) return;
    if (!window.confirm(`Delete "${group.name}"? This removes all its expenses, settlements, and history for everyone.`)) return;
    setDeleteGroupError(null);
    setDeletingGroup(true);

    try {
      await deleteGroup(groupId);
      router.push("/");
    } catch (err) {
      setDeleteGroupError(err instanceof Error ? err.message : "Failed to delete group");
      setDeletingGroup(false);
    }
  }

  function handleExportBalancesCsv() {
    if (!group || !balances) return;

    const rows = balances.map((b) => {
      const status =
        b.netBalance > 0.004
          ? `is owed ₹${b.netBalance.toFixed(2)}`
          : b.netBalance < -0.004
          ? `owes ₹${Math.abs(b.netBalance).toFixed(2)}`
          : "settled up";
      return [b.userName, b.netBalance.toFixed(2), status];
    });

    const safeName = group.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "group";
    downloadCsv(`${safeName}-balances.csv`, ["Member", "Net balance (INR)", "Status"], rows);
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
      <>
        <NavBar />
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
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block font-mono text-xs uppercase tracking-wider text-ink/60 hover:text-ink"
        >
          ← Your groups
        </Link>

        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-mono text-2xl font-bold text-ink">{group.name}</h1>
            {group.createdByUserId === currentUserId && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
                className="whitespace-nowrap font-mono text-xs font-bold text-debt hover:text-debt/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingGroup ? "Deleting…" : "Delete group"}
              </button>
            )}
          </div>
          {deleteGroupError && (
            <p role="alert" className="mt-2 font-mono text-sm text-debt">
              {deleteGroupError}
            </p>
          )}
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
            <AddMemberForm
              groupId={groupId}
              existingMembers={group.members}
              onAdded={(updated) => {
                setGroup(updated);
                setShowMemberForm(false);
                getGroupActivity(groupId).then(setActivity).catch(() => {});
              }}
              onCancel={() => setShowMemberForm(false)}
            />
          </Card>
        )}

        {loadError && (
          <p role="alert" className="mb-4 font-mono text-sm text-debt">
            {loadError}
          </p>
        )}

        <nav className="mb-4 flex gap-8 font-mono text-sm">
          {(["expenses", "balances", "settle", "recurring", "activity"] as Tab[]).map((t) => (
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
                : t === "recurring"
                ? "Recurring"
                : "Activity"}
            </button>
          ))}
        </nav>
        <div className="stitch-divider mb-6" aria-hidden="true" />

        {tab === "expenses" && (
          <div>
            <div className="mb-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseForm((s) => !s);
                }}
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
                  onSaved={handleExpenseSaved}
                  onCancel={() => setShowExpenseForm(false)}
                />
              </Card>
            )}

            {editingExpense && (
              <Card className="mb-6">
                <AddExpenseForm
                  groupId={groupId}
                  members={group.members}
                  expense={editingExpense}
                  onSaved={handleExpenseSaved}
                  onCancel={() => setEditingExpense(null)}
                />
              </Card>
            )}

            <CategoryBreakdownChart breakdown={categoryBreakdown} />

            {expenseActionError && (
              <p role="alert" className="mb-4 font-mono text-sm text-debt">
                {expenseActionError}
              </p>
            )}

            {expenses === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : expenses.length === 0 ? (
              <p className="font-mono text-sm text-ink/60">No expenses yet.</p>
            ) : (
              <ul className="space-y-3">
                {expenses.map((expense) => (
                  <li key={expense.id}>
                    <ExpenseItem
                      expense={expense}
                      canManage={expense.paidByUserId === currentUserId}
                      onEdit={() => {
                        setShowExpenseForm(false);
                        setEditingExpense(expense);
                      }}
                      onDelete={() => handleDeleteExpense(expense)}
                      deleting={deletingExpenseId === expense.id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "balances" && (
          <div>
            {balances !== null && balances.length > 0 && (
              <div className="mb-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleExportBalancesCsv}
                  className="font-mono text-sm font-bold text-ledger-green hover:text-ledger-green-dark"
                >
                  Export CSV
                </button>
              </div>
            )}

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
            {settleError && (
              <p role="alert" className="mb-4 font-mono text-sm text-debt">
                {settleError}
              </p>
            )}

            {settlements === null ? (
              <p className="font-mono text-sm text-ink/60">Loading…</p>
            ) : settlements.length === 0 ? (
              <p className="font-mono text-sm text-ink/60">
                All settled up — no payments needed.
              </p>
            ) : (
              <ul className="space-y-3">
                {settlements.map((s, i) => {
                  const key = `${s.fromUserId}-${s.toUserId}`;
                  const canSettle = s.fromUserId === currentUserId;
                  return (
                    <li key={`${key}-${i}`}>
                      <Card>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-sans text-sm text-ink">
                            <span className="font-mono font-bold">{s.fromUserName}</span> pays{" "}
                            <span className="font-mono font-bold">{s.toUserName}</span>{" "}
                            <Money amount={s.amount} />
                          </p>
                          {canSettle && (
                            <button
                              type="button"
                              onClick={() => handleSettleUp(s)}
                              disabled={settlingKey === key}
                              className="whitespace-nowrap font-mono text-xs font-bold text-ledger-green hover:text-ledger-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {settlingKey === key ? "Recording…" : "Mark as paid"}
                            </button>
                          )}
                        </div>
                      </Card>
                    </li>
                  );
                })}
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

        {tab === "activity" && <ActivityFeed items={activity} />}
      </div>
      </main>
    </>
  );
}
