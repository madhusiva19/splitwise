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
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="mt-1 w-full border-0 border-b border-line bg-transparent py-1.5 font-sans text-ink outline-none transition-colors focus:border-ledger-green focus:ring-0"
      />
    </label>
  );
}
