"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    setName(localStorage.getItem("userName"));
  }, [router]);

  if (!name) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <p className="font-mono text-lg text-ink">Welcome, {name}</p>
    </main>
  );
}
