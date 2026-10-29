"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
}

// Tailwind's build-time scanner needs complete, literal class strings, so each variant is
// spelled out in full rather than assembled from a template literal.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:opacity-90 focus-visible:outline-primary disabled:opacity-50",
  secondary:
    "bg-surface-muted text-ink hover:opacity-80 focus-visible:outline-primary disabled:opacity-50",
  ghost:
    "border border-border text-ink hover:bg-surface-muted focus-visible:outline-primary disabled:opacity-50",
  danger:
    "bg-negative text-white hover:opacity-90 focus-visible:outline-negative disabled:opacity-50",
};

export default function Button({
  children,
  variant = "primary",
  fullWidth,
  loading,
  loadingLabel,
  disabled,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-semibold transition-colors active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...rest}
    >
      {loading ? loadingLabel ?? "Working…" : children}
    </button>
  );
}
