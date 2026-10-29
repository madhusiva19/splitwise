import { storeAuth, clearAuth, AuthResponse } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

let refreshPromise: Promise<string | null> | null = null;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getAccessToken();

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && token) {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    if (refreshToken) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });
            if (!refreshRes.ok) throw new Error("Refresh failed");
            const data: AuthResponse = await refreshRes.json();
            storeAuth(data);
            return data.accessToken;
          } catch (e) {
            clearAuth();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }
      
      const newToken = await refreshPromise;
      if (newToken) {
        res = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        });
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || "Request failed");
  }

  // 204 No Content (e.g. logout) has no body to parse
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
