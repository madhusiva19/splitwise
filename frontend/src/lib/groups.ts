import { apiFetch } from "./api";

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  members: GroupMember[];
}

export interface GroupSummaryResponse {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export function createGroup(name: string): Promise<GroupResponse> {
  return apiFetch<GroupResponse>("/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listGroups(): Promise<GroupSummaryResponse[]> {
  return apiFetch<GroupSummaryResponse[]>("/groups");
}

export function getGroup(groupId: string): Promise<GroupResponse> {
  return apiFetch<GroupResponse>(`/groups/${groupId}`);
}

export function addMember(groupId: string, email: string): Promise<GroupResponse> {
  return apiFetch<GroupResponse>(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
