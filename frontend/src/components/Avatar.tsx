interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

// Deterministic per-user color so the same person's chip looks the same everywhere without
// having to store a color choice anywhere. Values are literal Tailwind classes (not assembled
// from a template) so the build-time scanner can find them.
const PALETTE = [
  "bg-primary-soft text-primary",
  "bg-accent-soft text-ink",
  "bg-positive/15 text-positive",
  "bg-negative/15 text-negative",
];

function colorClassFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = "md", className }: AvatarProps) {
  const dimension = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl font-sans font-bold ${dimension} ${colorClassFor(
        name
      )} ${className ?? ""}`}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
