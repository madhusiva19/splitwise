"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import { apiFetch } from "@/lib/api";
import { storeAuth, AuthResponse } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      storeAuth(response);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setLoading(false);
    }
  }

  return (
    <AuthCard mode="signup">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Jane Doe"
          required
          autoComplete="name"
        />
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
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />

        {error && (
          <p role="alert" className="font-mono text-sm text-debt">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-ledger-green py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-paper transition-colors hover:bg-ledger-green-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing up…" : "Sign up"}
        </button>
      </form>
    </AuthCard>
  );
}
