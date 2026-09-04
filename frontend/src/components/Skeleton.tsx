interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-sm bg-line/50 ${className ?? ""}`} aria-hidden="true" />;
}

// A row of skeleton bars shaped like a Card's contents (title + subtitle + trailing value),
// so loading states preview the layout that's about to appear instead of a blank/plain-text gap.
export function CardRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-paper shadow-sm">
      <div className="perforated-top" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-4 w-16 shrink-0" />
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <CardRowSkeleton key={i} />
      ))}
    </div>
  );
}
