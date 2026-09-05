import { apiFetch, API_BASE_URL } from "./api";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function receiptUrl(groupId: string, expenseId: string): string {
  return `${API_BASE_URL}/groups/${groupId}/expenses/${expenseId}/receipt`;
}

async function throwOnError(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({ message: res.statusText }));
  throw new Error(body.message || fallback);
}

// Multipart upload — apiFetch always sets Content-Type: application/json, which would break
// the multipart boundary, so this bypasses it with a raw fetch.
export async function uploadReceipt(groupId: string, expenseId: string, file: File): Promise<void> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(receiptUrl(groupId, expenseId), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  await throwOnError(res, "Failed to upload receipt");
}

// The receipt endpoint requires a Bearer token, which a plain <img src> can't send — so this
// fetches the bytes with the auth header and hands back an object URL to display instead
// (the same pattern used for the SSE notification stream).
export async function fetchReceiptObjectUrl(groupId: string, expenseId: string): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(receiptUrl(groupId, expenseId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  await throwOnError(res, "Failed to load receipt");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function deleteReceipt(groupId: string, expenseId: string): Promise<void> {
  return apiFetch<void>(`/groups/${groupId}/expenses/${expenseId}/receipt`, { method: "DELETE" });
}
