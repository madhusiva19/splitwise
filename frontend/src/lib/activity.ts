import { apiFetch } from "./api";

export type ActivityType = "EXPENSE_ADDED" | "SETTLEMENT_RECORDED" | "MEMBER_JOINED";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  actorUserId: string;
  actorName: string;
  occurredAt: string;
}

export function getGroupActivity(groupId: string): Promise<ActivityItem[]> {
  return apiFetch<ActivityItem[]>(`/groups/${groupId}/activity`);
}
