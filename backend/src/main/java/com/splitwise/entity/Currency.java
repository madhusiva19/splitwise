package com.splitwise.entity;

// A fixed, small set rather than the full ISO 4217 list — enough for "Splitwise Lite" scope
// without needing a lookup table. Each group picks one at creation; expenses within it are
// all assumed to be in that currency (no per-expense currency, no FX conversion here).
public enum Currency {
    INR("₹"),
    USD("$"),
    EUR("€"),
    GBP("£"),
    JPY("¥"),
    AUD("A$"),
    CAD("C$"),
    SGD("S$");

    private final String symbol;

    Currency(String symbol) {
        this.symbol = symbol;
    }

    public String getSymbol() {
        return symbol;
    }
}
