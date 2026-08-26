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
