import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/Card";
import { CategoryBreakdown, formatCategory } from "@/lib/expenses";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdown[] | null;
}

// Shades and tints of the ledger palette (ledger.green / debt) so the chart
// reads as part of the same paper-and-ink theme instead of library defaults.
const CATEGORY_COLORS = [
  "#2F6F4E",
  "#B3492F",
  "#4C8B6C",
  "#C97A5F",
  "#1A3A29",
  "#8F3A25",
  "#6FA98D",
  "#DDA48D",
];

export default function CategoryBreakdownChart({ breakdown }: CategoryBreakdownChartProps) {
  if (breakdown === null) {
    return (
      <Card className="mb-6">
        <p className="font-mono text-sm text-ink/60">Loading…</p>
      </Card>
    );
  }

  if (breakdown.length === 0) {
    return null;
  }

  const data = [...breakdown]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((b) => ({ ...b, label: formatCategory(b.category) }));

  return (
    <Card className="mb-6">
      <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-ink">
        Spending by category
      </h2>
      <div style={{ width: "100%", height: Math.max(data.length * 40, 120) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tickLine={false}
              axisLine={{ stroke: "#D8D0BC" }}
              tick={{ fill: "#22261F", fontSize: 12, fontFamily: "var(--font-space-mono), monospace" }}
            />
            <Tooltip
              cursor={{ fill: "#D8D0BC", opacity: 0.3 }}
              contentStyle={{
                background: "#FAF6EE",
                border: "1px solid #D8D0BC",
                borderRadius: 2,
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
              }}
              formatter={(value, _name, item) => {
                const amount = Number(value ?? 0);
                const count = item.payload.expenseCount as number;
                return [`₹${amount.toFixed(2)} · ${count} expense${count === 1 ? "" : "s"}`, item.payload.label];
              }}
            />
            <Bar dataKey="totalAmount" radius={[0, 2, 2, 0]} barSize={18}>
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
