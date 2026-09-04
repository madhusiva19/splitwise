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
      <span className="block font-mono text-xs uppercase tracking-wider text-ink/70">
        {label}
      </span>
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
        className={`mt-1 w-full border-0 border-b bg-transparent py-1.5 font-sans text-ink outline-none transition-colors focus:ring-0 ${
          error ? "border-debt focus:border-debt" : "border-line focus:border-ledger-green"
        }`}
      />
      {error && <span className="mt-1 block font-mono text-xs text-debt">{error}</span>}
    </label>
  );
}
