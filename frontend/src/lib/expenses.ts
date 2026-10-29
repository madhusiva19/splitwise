import { apiFetch } from "./api";

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE";

export type ExpenseCategory =
  | "FOOD"
  | "RENT"
  | "TRAVEL"
  | "UTILITIES"
  | "ENTERTAINMENT"
  | "SHOPPING"
  | "HEALTHCARE"
  | "OTHER";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "FOOD",
  "RENT",
  "TRAVEL",
  "UTILITIES",
  "ENTERTAINMENT",
  "SHOPPING",
  "HEALTHCARE",
  "OTHER",
];

export interface ExpenseShareInput {
  userId: string;
  amount: number;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  splitType: SplitType;
  category?: ExpenseCategory;
  participantUserIds: string[];
  shares?: ExpenseShareInput[];
}

export type UpdateExpenseRequest = CreateExpenseRequest & {
  // Omit to keep the existing payer, or set to reassign who paid.
  paidByUserId?: string;
};

export interface ExpenseShareResponse {
  userId: string;
  userName: string;
  shareAmount: number;
  settled: boolean;
}

export interface ExpenseResponse {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  splitType: SplitType;
  category: ExpenseCategory;
  paidByUserId: string;
  paidByName: string;
  createdAt: string;
  hasReceipt: boolean;
  shares: ExpenseShareResponse[];
}

export interface BalanceResponse {
  userId: string;
  userName: string;
  netBalance: number;
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface RecordSettlementRequest {
  toUserId: string;
  amount: number;
}

export interface RemindSettlementRequest {
  toUserId: string;
  amount: number;
}

export interface SettlementResponse {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  settledAt: string;
}

export interface CategoryBreakdown {
  category: ExpenseCategory;
  totalAmount: number;
  expenseCount: number;
}

export interface MonthlySpendPoint {
  month: string; // "YYYY-MM"
  totalAmount: number;
}

export interface CategoryTrend {
  category: ExpenseCategory;
  currentMonthAmount: number;
  previousMonthAmount: number;
  // null means "undefined" (previous month was zero) — render as "new this month" rather than a percentage.
  percentChange: number | null;
}

export interface SpendingTrendResponse {
  monthlyTotals: MonthlySpendPoint[];
  categoryTrends: CategoryTrend[];
}

export function createExpense(groupId: string, req: CreateExpenseRequest): Promise<ExpenseResponse> {
  return apiFetch<ExpenseResponse>(`/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function listExpenses(groupId: string): Promise<ExpenseResponse[]> {
  return apiFetch<ExpenseResponse[]>(`/groups/${groupId}/expenses`);
}

export function updateExpense(
  groupId: string,
  expenseId: string,
  req: UpdateExpenseRequest
): Promise<ExpenseResponse> {
  return apiFetch<ExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  return apiFetch<void>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: "DELETE",
  });
}

export function getBalances(groupId: string): Promise<BalanceResponse[]> {
  return apiFetch<BalanceResponse[]>(`/groups/${groupId}/balances`);
}

export function getSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
  return apiFetch<SettlementSuggestion[]>(`/groups/${groupId}/settlements/suggestions`);
}

export function recordSettlement(groupId: string, req: RecordSettlementRequest): Promise<SettlementResponse> {
  return apiFetch<SettlementResponse>(`/groups/${groupId}/settlements`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function remindSettlement(groupId: string, req: RemindSettlementRequest): Promise<void> {
  return apiFetch<void>(`/groups/${groupId}/settlements/remind`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getCategoryBreakdown(groupId: string): Promise<CategoryBreakdown[]> {
  return apiFetch<CategoryBreakdown[]>(`/groups/${groupId}/categories/breakdown`);
}

export function getSpendingTrend(groupId: string): Promise<SpendingTrendResponse> {
  return apiFetch<SpendingTrendResponse>(`/groups/${groupId}/spending-trend`);
}

export function formatCategory(category: ExpenseCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}
