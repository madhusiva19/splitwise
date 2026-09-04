interface ErrorBannerProps {
  message: string;
  className?: string;
}

export default function ErrorBanner({ message, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-sm border border-debt/40 bg-debt/10 px-3 py-2.5 font-sans text-sm text-debt ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
