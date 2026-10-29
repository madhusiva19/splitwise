interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card dark:shadow-card-dark ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
