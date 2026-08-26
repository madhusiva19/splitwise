import { apiFetch } from "./api";
import { ExpenseCategory } from "./expenses";

export type RecurrenceFrequency = "WEEKLY" | "MONTHLY";

export interface CreateRecurringExpenseRequest {
  description: string;
  amount: number;
  category?: ExpenseCategory;
  participantUserIds: string[];
  frequency: RecurrenceFrequency;
}

export interface RecurringExpenseResponse {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  frequency: RecurrenceFrequency;
  participantUserIds: string[];
  nextRunAt: string;
  active: boolean;
  createdAt: string;
  createdByUserId: string;
}

export function createRecurringExpense(
  groupId: string,
  req: CreateRecurringExpenseRequest
): Promise<RecurringExpenseResponse> {
  return apiFetch<RecurringExpenseResponse>(`/groups/${groupId}/recurring-expenses`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function listRecurringExpenses(groupId: string): Promise<RecurringExpenseResponse[]> {
  return apiFetch<RecurringExpenseResponse[]>(`/groups/${groupId}/recurring-expenses`);
}

export function deactivateRecurringExpense(groupId: string, templateId: string): Promise<void> {
  return apiFetch<void>(`/groups/${groupId}/recurring-expenses/${templateId}`, {
    method: "DELETE",
  });
}

export function formatFrequency(frequency: RecurrenceFrequency): string {
  return frequency === "WEEKLY" ? "Weekly" : "Monthly";
}

export function formatNextRunAt(iso: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return date.toLocaleDateString("en-US", options);
}
