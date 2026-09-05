import { createContext, useContext } from "react";

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

export const DEFAULT_CURRENCY: CurrencyInfo = { code: "INR", symbol: "₹" };

// Mirrors the backend's Currency enum (com.splitwise.entity.Currency) — a fixed, small set
// rather than the full ISO 4217 list, matching "Splitwise Lite" scope.
export const SUPPORTED_CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
];

// Provided per-group (see the group detail page) so Money and other amount-formatting
// components don't need the group threaded through every prop chain.
export const CurrencyContext = createContext<CurrencyInfo>(DEFAULT_CURRENCY);

export function useCurrency(): CurrencyInfo {
  return useContext(CurrencyContext);
}
