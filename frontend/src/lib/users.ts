import { apiFetch } from "./api";

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export function searchUsers(query: string): Promise<UserSearchResult[]> {
  return apiFetch<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`);
}
