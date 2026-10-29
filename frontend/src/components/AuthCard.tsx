import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface AuthCardProps {
  mode: "login" | "signup";
  children: React.ReactNode;
}

export default function AuthCard({ mode, children }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-card dark:shadow-card-dark">
        <header className="mb-6 text-center">
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ink">
            Splitwise
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-muted">
            Split the bill, not the friendship
          </p>
        </header>

        <nav className="mb-6 flex justify-center gap-1 rounded-full border border-border bg-surface-muted p-1 font-sans text-sm">
          <Link
            href="/login"
            className={`flex-1 rounded-full py-1.5 text-center font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "login" ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
            }`}
            aria-current={mode === "login" ? "page" : undefined}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={`flex-1 rounded-full py-1.5 text-center font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === "signup" ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
            }`}
            aria-current={mode === "signup" ? "page" : undefined}
          >
            Sign up
          </Link>
        </nav>

        {children}
      </div>
    </div>
  );
}
