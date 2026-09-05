"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Money from "@/components/Money";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import { Skeleton, CardListSkeleton } from "@/components/Skeleton";
import AddExpenseForm from "@/components/AddExpenseForm";
import AddMemberForm from "@/components/AddMemberForm";
import CategoryBreakdownChart from "@/components/CategoryBreakdownChart";
import AddRecurringExpenseForm from "@/components/AddRecurringExpenseForm";
import RecurringExpensesList from "@/components/RecurringExpensesList";
import ActivityFeed from "@/components/ActivityFeed";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getGroup, deleteGroup, leaveGroup, GroupResponse } from "@/lib/groups";
import { downloadCsv } from "@/lib/csv";
import {
  listExpenses,
  getBalances,
  getSettlementSuggestions,
  getCategoryBreakdown,
  recordSettlement,
  remindSettlement,
  deleteExpense,
  formatCategory,
  ExpenseResponse,
  ExpenseCategory,
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
    <Card className="transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="-m-2 flex w-full items-center justify-between gap-3 rounded-sm p-2 text-left transition-colors hover:bg-line/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ledger-green"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-mono text-base font-bold text-ink">{expense.description}</p>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/60">
              {formatCategory(expense.category)}
            </span>
          </div>
          <p className="truncate font-mono text-xs uppercase tracking-wider text-ink/60">
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
                aria-label={`Edit "${expense.description}"`}
                className="rounded-sm font-mono text-xs font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label={`Delete "${expense.description}"`}
                className="rounded-sm font-mono text-xs font-bold text-debt transition-colors hover:text-debt/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-debt disabled:cursor-not-allowed disabled:opacity-60"
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
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [leaveGroupError, setLeaveGroupError] = useState<string | null>(null);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [expenseActionError, setExpenseActionError] = useState<string | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | null>(null);
  const [visibleExpenseCount, setVisibleExpenseCount] = useState(10);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [remindingKey, setRemindingKey] = useState<string | null>(null);
  const [remindedKeys, setRemindedKeys] = useState<Set<string>>(new Set());

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

  async function handleSendReminder(suggestion: SettlementSuggestion) {
    const key = `${suggestion.fromUserId}-${suggestion.toUserId}`;
    setSettleError(null);
    setRemindingKey(key);

    try {
      await remindSettlement(groupId, { toUserId: suggestion.fromUserId, amount: suggestion.amount });
      setRemindedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setRemindingKey(null);
    }
  }

  async function handleConfirmDeleteGroup() {
    if (!group) return;
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

  const balanceSummary = useMemo(() => {
    if (!balances) return null;
    const mine = balances.find((b) => b.userId === currentUserId);
    return mine ? mine.netBalance : 0;
  }, [balances, currentUserId]);

  const sortedBalances = useMemo(() => {
    if (!balances) return null;
    return [...balances].sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [balances]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return null;
    const query = expenseSearch.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchesQuery = query.length === 0 || e.description.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === null || e.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [expenses, expenseSearch, categoryFilter]);

  const expensesFiltered = expenseSearch.trim().length > 0 || categoryFilter !== null;

  function handleCategoryChartClick(category: ExpenseCategory) {
    setCategoryFilter((prev) => (prev === category ? null : category));
    setVisibleExpenseCount(10);
  }

  if (!group) {
    return (
      <PageShell>
        {loadError ? (
          <ErrorBanner message={loadError} />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <CardListSkeleton count={3} />
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 rounded-sm font-mono text-xs uppercase tracking-wider text-ink/60 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
        >
          ← Your groups
        </Link>

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
                setGroup(updated);
                setShowMemberForm(false);
                getGroupActivity(groupId).then(setActivity).catch(() => {});
              }}
              onCancel={() => setShowMemberForm(false)}
            />
          </Card>
        )}

        {loadError && <ErrorBanner className="mb-4" message={loadError} />}

        <nav className="-mx-4 mb-4 overflow-x-auto px-4">
          <div className="flex gap-6 whitespace-nowrap font-mono text-sm sm:gap-8">
            {(["expenses", "balances", "settle", "recurring", "activity"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-sm pb-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green ${
                  tab === t
                    ? "border-b-2 border-ledger-green font-bold text-ledger-green"
                    : "border-b-2 border-transparent text-ink/60 hover:text-ink"
                }`}
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
          </div>
        </nav>
        <div className="stitch-divider mb-6" aria-hidden="true" />

        {tab === "expenses" && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              {expenses !== null && expenses.length > 0 && (
                <p className="font-mono text-xs uppercase tracking-wider text-ink/60">
                  {expensesFiltered && filteredExpenses
                    ? `${filteredExpenses.length} of ${expenses.length} expenses`
                    : `${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"}`}{" "}
                  · Total{" "}
                  <span className="font-bold text-ink">
                    ₹{(filteredExpenses ?? expenses).reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpenseForm((s) => !s);
                }}
                className="ml-auto rounded-sm font-mono text-sm font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
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

            <CategoryBreakdownChart
              breakdown={categoryBreakdown}
              activeCategory={categoryFilter}
              onCategoryClick={handleCategoryChartClick}
            />

            {expenseActionError && <ErrorBanner className="mb-4" message={expenseActionError} />}

            {expenses !== null && expenses.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={expenseSearch}
                  onChange={(e) => {
                    setExpenseSearch(e.target.value);
                    setVisibleExpenseCount(10);
                  }}
                  placeholder="Search expenses…"
                  className="min-w-0 flex-1 rounded-sm border border-line bg-transparent px-3 py-1.5 font-sans text-sm text-ink outline-none transition-colors focus:border-ledger-green"
                />
                {categoryFilter && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChartClick(categoryFilter)}
                    className="flex items-center gap-1.5 rounded-full border border-ledger-green bg-ledger-green/10 px-3 py-1 font-mono text-xs text-ledger-green transition-colors hover:bg-ledger-green/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
                  >
                    {formatCategory(categoryFilter)}
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
            )}

            {expenses === null ? (
              <CardListSkeleton count={3} />
            ) : expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                hint="Add the first expense to start tracking who paid for what."
              />
            ) : filteredExpenses && filteredExpenses.length === 0 ? (
              <EmptyState
                title="No expenses match"
                hint="Try a different search term or clear the category filter."
              />
            ) : (
              <>
                <ul className="space-y-3">
                  {filteredExpenses!.slice(0, visibleExpenseCount).map((expense) => (
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
                {filteredExpenses!.length > visibleExpenseCount && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleExpenseCount((c) => c + 10)}
                      className="rounded-sm border border-line px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink/70 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
                    >
                      Show more ({filteredExpenses!.length - visibleExpenseCount} more)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "balances" && (
          <div>
            {balances !== null && balances.length > 0 && (
              <>
                {balanceSummary !== null && Math.abs(balanceSummary) > 0.004 && (
                  <div
                    className={`mb-4 rounded-sm border px-4 py-3 ${
                      balanceSummary > 0
                        ? "border-ledger-green/40 bg-ledger-green/10"
                        : "border-debt/40 bg-debt/10"
                    }`}
                  >
                    <p className="font-sans text-sm text-ink">
                      {balanceSummary > 0 ? (
                        <>
                          Overall, you&rsquo;re owed{" "}
                          <span className="font-mono font-bold text-ledger-green">
                            ₹{balanceSummary.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>
                          Overall, you owe{" "}
                          <span className="font-mono font-bold text-debt">₹{Math.abs(balanceSummary).toFixed(2)}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="mb-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleExportBalancesCsv}
                    className="rounded-sm font-mono text-sm font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
                  >
                    Export CSV
                  </button>
                </div>
              </>
            )}

            {balances === null ? (
              <CardListSkeleton count={3} />
            ) : balances.length === 0 ? (
              <EmptyState title="No balances yet" hint="Balances appear once expenses are added." />
            ) : (
              <ul className="space-y-3">
                {sortedBalances!.map((b) => {
                  const isSettled = Math.abs(b.netBalance) < 0.004;
                  return (
                    <li key={b.userId}>
                      <Card
                        className={`border-l-[3px] ${
                          isSettled
                            ? "border-l-line"
                            : b.netBalance > 0
                            ? "border-l-ledger-green"
                            : "border-l-debt"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="block font-sans text-sm font-medium text-ink">{b.userName}</span>
                            <span className="block font-mono text-[11px] uppercase tracking-wider text-ink/50">
                              {isSettled ? "Settled up" : b.netBalance > 0 ? "Is owed" : "Owes"}
                            </span>
                          </div>
                          <Money amount={b.netBalance} showSign />
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "settle" && (
          <div>
            {settleError && <ErrorBanner className="mb-4" message={settleError} />}

            {settlements === null ? (
              <CardListSkeleton count={2} />
            ) : settlements.length === 0 ? (
              <EmptyState
                title="All settled up"
                hint="No payments are needed right now."
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
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                }
              />
            ) : (
              <ul className="space-y-3">
                {settlements.map((s, i) => {
                  const key = `${s.fromUserId}-${s.toUserId}`;
                  const canSettle = s.fromUserId === currentUserId;
                  const canRemind = s.toUserId === currentUserId;
                  const alreadyReminded = remindedKeys.has(key);
                  return (
                    <li key={`${key}-${i}`}>
                      <Card>
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex flex-wrap items-center gap-x-1.5 font-sans text-sm text-ink">
                            <span className="font-mono font-bold">{s.fromUserName}</span>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5 text-ink/40"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                            <span className="font-mono font-bold">{s.toUserName}</span>
                            <Money amount={s.amount} />
                          </p>
                          {canSettle && (
                            <button
                              type="button"
                              onClick={() => handleSettleUp(s)}
                              disabled={settlingKey === key}
                              className="whitespace-nowrap rounded-sm font-mono text-xs font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {settlingKey === key ? "Recording…" : "Mark as paid"}
                            </button>
                          )}
                          {canRemind && (
                            <button
                              type="button"
                              onClick={() => handleSendReminder(s)}
                              disabled={remindingKey === key || alreadyReminded}
                              className="whitespace-nowrap rounded-sm font-mono text-xs font-bold text-ink/60 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {remindingKey === key ? "Sending…" : alreadyReminded ? "Reminded ✓" : "Send reminder"}
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
                className="rounded-sm font-mono text-sm font-bold text-ledger-green transition-colors hover:text-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
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
              <CardListSkeleton count={2} />
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
    </PageShell>
  );
}
