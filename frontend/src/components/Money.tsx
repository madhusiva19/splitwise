"use client";

import { useCurrency } from "@/lib/currency";

interface MoneyProps {
  amount: number;
  showSign?: boolean;
}

export default function Money({ amount, showSign }: MoneyProps) {
  const { symbol } = useCurrency();
  const isNegative = amount < 0;
  const sign = isNegative ? "-" : showSign ? "+" : "";

  return (
    <span className={`font-sans font-semibold tabular-nums ${isNegative ? "text-negative" : "text-positive"}`}>
      {sign}{symbol}{Math.abs(amount).toFixed(2)}
    </span>
  );
}
