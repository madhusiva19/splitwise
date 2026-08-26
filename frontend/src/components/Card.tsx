interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-sm border border-line bg-paper shadow-sm ${className ?? ""}`}
    >
      <div className="perforated-top" aria-hidden="true" />
      <div className="px-6 pb-6 pt-2">{children}</div>
    </div>
  );
}
