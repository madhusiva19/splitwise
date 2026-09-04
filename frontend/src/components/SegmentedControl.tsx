"use client";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div>
      <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/70">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-sm border border-line"
      >
        {options.map((opt, i) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`px-2 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ledger-green ${
                i > 0 ? "border-l border-line" : ""
              } ${
                selected
                  ? "bg-ledger-green text-paper"
                  : "bg-transparent text-ink/60 hover:bg-line/20 hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
