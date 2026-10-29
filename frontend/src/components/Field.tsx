"use client";

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  error?: string;
  onBlur?: () => void;
}

export default function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  error,
  onBlur,
}: FieldProps) {
  return (
    <label className="block">
      <span className="block font-sans text-sm font-medium text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className={`mt-1.5 w-full rounded-xl border bg-surface-muted px-4 py-2.5 font-sans text-ink outline-none transition-colors focus:ring-2 focus:ring-offset-0 ${
          error
            ? "border-negative focus:border-negative focus:ring-negative/20"
            : "border-transparent focus:border-primary focus:ring-primary/20"
        }`}
      />
      {error && <span className="mt-1.5 block font-sans text-xs text-negative">{error}</span>}
    </label>
  );
}
