"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { useCurrency } from "@/lib/currency";
import { CategoryBreakdown, ExpenseCategory, formatCategory } from "@/lib/expenses";
import { useTheme } from "@/lib/useTheme";
import { CATEGORY_COLORS, CHART_THEME } from "@/lib/chartTheme";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdown[] | null;
  activeCategory?: ExpenseCategory | null;
  onCategoryClick?: (category: ExpenseCategory) => void;
}

export default function CategoryBreakdownChart({ breakdown, activeCategory, onCategoryClick }: CategoryBreakdownChartProps) {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const colors = CATEGORY_COLORS[theme];
  const chartTheme = CHART_THEME[theme];

  if (breakdown === null) {
    return (
      <Card className="mb-6">
        <Skeleton className="mb-4 h-4 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      </Card>
    );
  }

  // No breakdown card at all yet (nothing to summarize) — the expense list below
  // already carries its own empty state, so this stays quiet rather than doubling up.
  if (breakdown.length === 0) {
    return null;
  }

  const data = [...breakdown]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((b) => ({ ...b, label: formatCategory(b.category) }));

  const clickable = !!onCategoryClick;

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-sans text-sm font-semibold text-ink">
          Spending by category
        </h2>
        {clickable && <span className="font-sans text-xs text-ink-muted">Click a bar to filter</span>}
      </div>
      <div style={{ width: "100%", height: Math.max(data.length * 40, 120) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisLine }}
              tick={{ fill: chartTheme.tick, fontSize: 12, fontFamily: "var(--font-inter), sans-serif" }}
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
              formatter={(value, _name, item) => {
                const amount = Number(value ?? 0);
                const count = item.payload.expenseCount as number;
                return [`${symbol}${amount.toFixed(2)} · ${count} expense${count === 1 ? "" : "s"}`, item.payload.label];
              }}
            />
            <Bar
              dataKey="totalAmount"
              radius={[0, 8, 8, 0]}
              barSize={18}
              onClick={(entry: unknown) => onCategoryClick?.((entry as { category: ExpenseCategory }).category)}
              style={{ cursor: clickable ? "pointer" : "default" }}
            >
              {data.map((entry, index) => {
                const isDimmed = !!activeCategory && activeCategory !== entry.category;
                return (
                  <Cell
                    key={entry.category}
                    fill={colors[index % colors.length]}
                    opacity={isDimmed ? 0.35 : 1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
