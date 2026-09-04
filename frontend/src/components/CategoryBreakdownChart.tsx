"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { CategoryBreakdown, ExpenseCategory, formatCategory } from "@/lib/expenses";
import { useTheme } from "@/lib/useTheme";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdown[] | null;
  activeCategory?: ExpenseCategory | null;
  onCategoryClick?: (category: ExpenseCategory) => void;
}

// Shades and tints of the ledger palette (ledger.green / debt) so the chart reads as part
// of the same paper-and-ink theme instead of library defaults. Recharts renders raw SVG,
// so these can't be Tailwind classes — each mode needs its own literal hex values.
const CATEGORY_COLORS = {
  light: ["#2F6F4E", "#B3492F", "#4C8B6C", "#C97A5F", "#1A3A29", "#8F3A25", "#6FA98D", "#DDA48D"],
  dark: ["#4FAE7C", "#E07856", "#7BC49B", "#EDA588", "#2E6B4C", "#B8583A", "#9BD3B6", "#F2C0AA"],
};

const CHART_THEME = {
  light: { axisLine: "#D8D0BC", tick: "#22261F", tooltipBg: "#FAF6EE", tooltipBorder: "#D8D0BC" },
  dark: { axisLine: "#3A362E", tick: "#EDE8DC", tooltipBg: "#1A1815", tooltipBorder: "#3A362E" },
};

export default function CategoryBreakdownChart({ breakdown, activeCategory, onCategoryClick }: CategoryBreakdownChartProps) {
  const { theme } = useTheme();
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
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">
          Spending by category
        </h2>
        {clickable && <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">Click a bar to filter</span>}
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
              tick={{ fill: chartTheme.tick, fontSize: 12, fontFamily: "var(--font-space-mono), monospace" }}
            />
            <Tooltip
              cursor={{ fill: chartTheme.axisLine, opacity: 0.3 }}
              contentStyle={{
                background: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                borderRadius: 2,
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                color: chartTheme.tick,
              }}
              formatter={(value, _name, item) => {
                const amount = Number(value ?? 0);
                const count = item.payload.expenseCount as number;
                return [`₹${amount.toFixed(2)} · ${count} expense${count === 1 ? "" : "s"}`, item.payload.label];
              }}
            />
            <Bar
              dataKey="totalAmount"
              radius={[0, 2, 2, 0]}
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
