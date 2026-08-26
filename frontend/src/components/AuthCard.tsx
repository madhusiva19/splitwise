import Link from "next/link";

interface AuthCardProps {
  mode: "login" | "signup";
  children: React.ReactNode;
}

export default function AuthCard({ mode, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-sm border border-line bg-paper shadow-sm">
        <div className="perforated-top" aria-hidden="true" />

        <div className="px-8 pb-8 pt-2">
          <header className="mb-6 text-center">
            <h1 className="font-mono text-lg font-bold tracking-tight text-ink">
              Splitwise-lite
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink/60">
              Split the bill, not the friendship
            </p>
          </header>

          <nav className="mb-6 flex justify-center gap-8 font-mono text-sm">
            <Link
              href="/login"
              className={
                mode === "login"
                  ? "border-b-2 border-ledger-green pb-1 font-bold text-ledger-green"
                  : "pb-1 text-ink/60 hover:text-ink"
              }
              aria-current={mode === "login" ? "page" : undefined}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={
                mode === "signup"
                  ? "border-b-2 border-ledger-green pb-1 font-bold text-ledger-green"
                  : "pb-1 text-ink/60 hover:text-ink"
              }
              aria-current={mode === "signup" ? "page" : undefined}
            >
              Sign up
            </Link>
          </nav>

          <div className="stitch-divider mb-6" aria-hidden="true" />

          {children}
        </div>
      </div>
    </div>
  );
}
