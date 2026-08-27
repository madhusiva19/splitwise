import { apiFetch } from "./api";

export type NotificationType =
  | "ADDED_TO_GROUP"
  | "EXPENSE_ADDED"
  | "SETTLEMENT_RECORDED"
  | "RECURRING_EXPENSE_CREATED";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  message: string;
  groupId: string | null;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export function listNotifications(): Promise<NotificationResponse[]> {
  return apiFetch<NotificationResponse[]>("/notifications");
}

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>("/notifications/unread-count");
}

export function markAsRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllAsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "PATCH" });
}
