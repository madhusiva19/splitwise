import NavBar from "@/components/NavBar";

interface PageShellProps {
  children: React.ReactNode;
  wide?: boolean;
}

// The persistent authenticated-page shell: nav bar + centered content column.
// Keeping this in one place means every page gets identical spacing/width for free.
export default function PageShell({ children, wide }: PageShellProps) {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-paper px-4 py-8 sm:py-10">
        <div className={`mx-auto ${wide ? "max-w-3xl" : "max-w-2xl"}`}>{children}</div>
      </main>
    </>
  );
}
