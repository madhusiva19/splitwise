interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, hint, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-muted/60">{icon}</div>}
      <p className="font-sans text-sm font-semibold text-ink/80">{title}</p>
      {hint && <p className="mt-1 font-sans text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
