interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, hint, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink/30">{icon}</div>}
      <p className="font-mono text-sm font-bold text-ink/70">{title}</p>
      {hint && <p className="mt-1 font-sans text-sm text-ink/50">{hint}</p>}
    </div>
  );
}
