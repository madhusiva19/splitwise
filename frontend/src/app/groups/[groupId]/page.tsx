"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ErrorBanner from "@/components/ErrorBanner";
import { Skeleton, CardListSkeleton } from "@/components/Skeleton";
import ActivityFeed from "@/components/ActivityFeed";
import GroupHeader from "@/components/group/GroupHeader";
import ExpensesTab from "@/components/group/ExpensesTab";
import BalancesTab from "@/components/group/BalancesTab";
import SettleTab from "@/components/group/SettleTab";
import RecurringTab from "@/components/group/RecurringTab";
import { getGroup, GroupResponse } from "@/lib/groups";
import { CurrencyContext } from "@/lib/currency";
import {
  listExpenses,
  getBalances,
  getSettlementSuggestions,
  getCategoryBreakdown,
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

  // Shared by ExpensesTab (after add/edit/delete) — everything derived from expenses needs
  // to be refetched together so the balances/settlements/category chart update in lockstep.
  async function refreshAfterExpenseChange() {
    const [b, s, c, a] = await Promise.all([
      getBalances(groupId),
      getSettlementSuggestions(groupId),
      getCategoryBreakdown(groupId),
      getGroupActivity(groupId),
    ]);
    setBalances(b);
    setSettlements(s);
    setCategoryBreakdown(c);
    setActivity(a);
  }

  // Used by SettleTab after recording a settlement — no category breakdown involved, since
  // settlements don't change what was spent, only who's paid up.
  async function refreshAfterSettlement() {
    const [b, s, a] = await Promise.all([
      getBalances(groupId),
      getSettlementSuggestions(groupId),
      getGroupActivity(groupId),
    ]);
    setBalances(b);
    setSettlements(s);
    setActivity(a);
  }

  function handleRecurringExpenseCreated(template: RecurringExpenseResponse) {
    setRecurringExpenses((prev) => (prev ? [template, ...prev] : [template]));
  }

  function handleRecurringExpenseDeactivated(templateId: string) {
    setRecurringExpenses((prev) => (prev ? prev.filter((t) => t.id !== templateId) : prev));
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
    <CurrencyContext.Provider value={{ code: group.currency, symbol: group.currencySymbol }}>
    <PageShell>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 rounded-sm font-mono text-xs uppercase tracking-wider text-ink/60 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
      >
        ← Your groups
      </Link>

      <GroupHeader
        groupId={groupId}
        group={group}
        currentUserId={currentUserId}
        onGroupUpdated={setGroup}
        onMemberAdded={() => {
          getGroupActivity(groupId).then(setActivity).catch(() => {});
        }}
      />

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
        <ExpensesTab
          groupId={groupId}
          members={group.members}
          expenses={expenses}
          categoryBreakdown={categoryBreakdown}
          currentUserId={currentUserId}
          onExpensesChanged={setExpenses}
          onDerivedDataChanged={refreshAfterExpenseChange}
        />
      )}

      {tab === "balances" && (
        <BalancesTab groupName={group.name} balances={balances} currentUserId={currentUserId} />
      )}

      {tab === "settle" && (
        <SettleTab
          groupId={groupId}
          settlements={settlements}
          currentUserId={currentUserId}
          onSettled={refreshAfterSettlement}
        />
      )}

      {tab === "recurring" && (
        <RecurringTab
          groupId={groupId}
          members={group.members}
          templates={recurringExpenses}
          currentUserId={currentUserId}
          onCreated={handleRecurringExpenseCreated}
          onDeactivated={handleRecurringExpenseDeactivated}
        />
      )}

      {tab === "activity" && <ActivityFeed items={activity} />}
    </PageShell>
    </CurrencyContext.Provider>
  );
}
