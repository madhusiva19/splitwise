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
    <span className={`font-mono tabular-nums ${isNegative ? "text-debt" : "text-ledger-green"}`}>
      {sign}{symbol}{Math.abs(amount).toFixed(2)}
    </span>
  );
}
