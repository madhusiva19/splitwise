"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import ErrorBanner from "@/components/ErrorBanner";
import Button from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { storeAuth, AuthResponse } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeAuth(response);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <AuthCard mode="login">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && <ErrorBanner message={error} />}

        <Button type="submit" fullWidth loading={loading} loadingLabel="Logging in…">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
