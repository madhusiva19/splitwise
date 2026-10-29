import { API_BASE_URL } from "./api";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
}

export function storeAuth(response: AuthResponse): void {
  localStorage.setItem("accessToken", response.accessToken);
  localStorage.setItem("refreshToken", response.refreshToken);
  localStorage.setItem("userId", response.userId);
  localStorage.setItem("userName", response.name);
  localStorage.setItem("userEmail", response.email);
}

export function clearAuth(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
}

// Revokes the refresh token server-side (best-effort — the user is logged out locally either
// way) and clears local storage, then sends the caller to /login.
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // network error — still clear local state below
    }
  }
  clearAuth();
  window.location.href = "/login";
}
