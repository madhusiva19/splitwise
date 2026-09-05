"use client";

import { useMemo, useState } from "react";
import Card from "@/components/Card";
import ErrorBanner from "@/components/ErrorBanner";
import EmptyState from "@/components/EmptyState";
import { CardListSkeleton } from "@/components/Skeleton";
import AddExpenseForm from "@/components/AddExpenseForm";
import CategoryBreakdownChart from "@/components/CategoryBreakdownChart";
import ExpenseItem from "@/components/group/ExpenseItem";
import { GroupMember } from "@/lib/groups";
import {
  deleteExpense,
  formatCategory,
  ExpenseResponse,
  ExpenseCategory,
  CategoryBreakdown,
} from "@/lib/expenses";

interface ExpensesTabProps {
  groupId: string;
  members: GroupMember[];
  expenses: ExpenseResponse[] | null;
  categoryBreakdown: CategoryBreakdown[] | null;
  currentUserId: string;
  onExpensesChanged: (expenses: ExpenseResponse[]) => void;
  onDerivedDataChanged: () => Promise<void>;
}

export default function ExpensesTab({
  groupId,
  members,
  expenses,
  categoryBreakdown,
  currentUserId,
  onExpensesChanged,
  onDerivedDataChanged,
}: ExpensesTabProps) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [expenseActionError, setExpenseActionError] = useState<string | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | null>(null);
  const [visibleExpenseCount, setVisibleExpenseCount] = useState(10);

  async function handleExpenseSaved(expense: ExpenseResponse) {
    setShowExpenseForm(false);
    setEditingExpense(null);

    // Fetch the derived views before touching state, so the expense list and the
    // balances/settlements/category chart update together in one render instead of
    // the list changing first and the chart briefly showing stale data.
    await onDerivedDataChanged();
    if (!expenses) {
      onExpensesChanged([expense]);
      return;
    }
    const exists = expenses.some((e) => e.id === expense.id);
    onExpensesChanged(exists ? expenses.map((e) => (e.id === expense.id ? expense : e)) : [expense, ...expenses]);
  }

  async function handleDeleteExpense(expense: ExpenseResponse) {
    if (!window.confirm(`Delete "${expense.description}"?`)) return;
    setExpenseActionError(null);
    setDeletingExpenseId(expense.id);

    try {
      await deleteExpense(groupId, expense.id);
      await onDerivedDataChanged();
      if (expenses) onExpensesChanged(expenses.filter((e) => e.id !== expense.id));
    } catch (err) {
      setExpenseActionError(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  function handleCategoryChartClick(category: ExpenseCategory) {
    setCategoryFilter((prev) => (prev === category ? null : category));
    setVisibleExpenseCount(10);
  }

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

  return (
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
            members={members}
            onSaved={handleExpenseSaved}
            onCancel={() => setShowExpenseForm(false)}
          />
        </Card>
      )}

      {editingExpense && (
        <Card className="mb-6">
          <AddExpenseForm
            groupId={groupId}
            members={members}
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
  );
}
