"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import Card from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { useCurrency } from "@/lib/currency";
import { CategoryTrend, SpendingTrendResponse, formatCategory } from "@/lib/expenses";
import { useTheme } from "@/lib/useTheme";
import { CHART_COLOR, CHART_THEME } from "@/lib/chartTheme";

interface SpendingTrendInsightsProps {
  trend: SpendingTrendResponse | null;
}

// Below this, a swing is more likely rounding noise than something worth calling out (e.g. a
// single $1 expense in an otherwise-empty category can read as a "1000% increase").
const MIN_NOTABLE_AMOUNT = 5;
const MIN_NOTABLE_PERCENT = 15;

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString(undefined, { month: "short" });
}

function isNotable(t: CategoryTrend): boolean {
  const amountMatters = t.currentMonthAmount >= MIN_NOTABLE_AMOUNT || t.previousMonthAmount >= MIN_NOTABLE_AMOUNT;
  if (!amountMatters) return false;
  return t.percentChange === null || Math.abs(t.percentChange) >= MIN_NOTABLE_PERCENT;
}

function describeTrend(t: CategoryTrend, symbol: string): string {
  const label = formatCategory(t.category);
  if (t.percentChange === null) {
    return `New this month: ${label} (${symbol}${t.currentMonthAmount.toFixed(2)})`;
  }
  const direction = t.percentChange > 0 ? "up" : "down";
  return `${label} spending is ${direction} ${Math.abs(t.percentChange).toFixed(0)}% this month (${symbol}${t.currentMonthAmount.toFixed(
    2
  )} vs ${symbol}${t.previousMonthAmount.toFixed(2)})`;
}

export default function SpendingTrendInsights({ trend }: SpendingTrendInsightsProps) {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const chartTheme = CHART_THEME[theme];

  if (trend === null) {
    return (
      <Card className="mb-6">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  const hasAnySpend = trend.monthlyTotals.some((m) => m.totalAmount > 0);
  if (!hasAnySpend) return null;

  const chartData = trend.monthlyTotals.map((m) => ({ ...m, label: formatMonthLabel(m.month) }));

  const notableTrends = trend.categoryTrends
    .filter(isNotable)
    .sort((a, b) => (b.percentChange === null ? Infinity : Math.abs(b.percentChange)) -
      (a.percentChange === null ? Infinity : Math.abs(a.percentChange)))
    .slice(0, 3);

  return (
    <Card className="mb-6">
      <h2 className="mb-4 font-sans text-sm font-semibold text-ink">
        Spending trend
      </h2>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
              tick={{ fill: chartTheme.tick, fontSize: 11, fontFamily: "var(--font-inter), sans-serif" }}
            />
            <Tooltip
              cursor={{ fill: chartTheme.axisLine, opacity: 0.3 }}
              contentStyle={{
                background: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                borderRadius: 12,
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: 12,
                color: chartTheme.tick,
              }}
              formatter={(value) => [`${symbol}${Number(value ?? 0).toFixed(2)}`, "Total"]}
            />
            <Bar dataKey="totalAmount" fill={CHART_COLOR[theme]} radius={[8, 8, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {notableTrends.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {notableTrends.map((t) => (
            <li key={t.category} className="font-sans text-sm text-ink">
              {describeTrend(t, symbol)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
