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

export interface CategoryBreakdown {
  category: ExpenseCategory;
  totalAmount: number;
  expenseCount: number;
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

export function getBalances(groupId: string): Promise<BalanceResponse[]> {
  return apiFetch<BalanceResponse[]>(`/groups/${groupId}/balances`);
}

export function getSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
  return apiFetch<SettlementSuggestion[]>(`/groups/${groupId}/settlements/suggestions`);
}

export function getCategoryBreakdown(groupId: string): Promise<CategoryBreakdown[]> {
  return apiFetch<CategoryBreakdown[]>(`/groups/${groupId}/categories/breakdown`);
}

export function formatCategory(category: ExpenseCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}
