import { Cell, Pie, PieChart } from "recharts";

import type { Transaction, TransactionType } from "../types";

const TYPE_COLOR: Record<TransactionType, string> = {
  income: "#16a34a",
  expense: "#dc2626",
  savings: "#2563eb",
};

const TYPE_META: { type: TransactionType; label: string }[] = [
  { type: "income", label: "Income" },
  { type: "expense", label: "Expenses" },
  { type: "savings", label: "Savings" },
];

const DONUT_SIZE = 240;
const RADIAN = Math.PI / 180;

function euro(value: number): string {
  return `€${value.toFixed(2)}`;
}

function sumAmount(transactions: Transaction[]): number {
  return transactions.reduce((total, t) => total + Number(t.amount), 0);
}

// Mix a hex color toward white. amount: 0 = base color, 1 = white.
function tint(hex: string, amount: number): string {
  const channel = (start: number) =>
    Math.round(
      parseInt(hex.slice(start, start + 2), 16) * (1 - amount) + 255 * amount,
    );
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}

interface CategorySlice {
  name: string;
  amount: number;
  color: string;
}

function categorySlices(
  transactions: Transaction[],
  type: TransactionType,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === type) {
      totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount));
    }
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const base = TYPE_COLOR[type];
  // Largest category keeps the tag's exact color; the rest are lighter tints of it.
  return sorted.map(([name, amount], i) => ({
    name,
    amount,
    color: tint(
      base,
      sorted.length <= 1 ? 0 : (i * 0.55) / (sorted.length - 1),
    ),
  }));
}

export function Analytics({ transactions }: { transactions: Transaction[] }) {
  const totals: Record<TransactionType, number> = {
    income: sumAmount(transactions.filter((t) => t.type === "income")),
    expense: sumAmount(transactions.filter((t) => t.type === "expense")),
    savings: sumAmount(transactions.filter((t) => t.type === "savings")),
  };
  const balance = totals.income - totals.expense - totals.savings;

  const donutData = TYPE_META.map(({ type, label }) => ({
    type,
    label,
    value: totals[type],
    color: TYPE_COLOR[type],
  }));

  return (
    <section className="card analytics">
      <div className="analytics__donut">
        <div className="donut">
          <PieChart width={DONUT_SIZE} height={DONUT_SIZE}>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="label"
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              innerRadius={58}
              outerRadius={88}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              labelLine={false}
              isAnimationActive={false}
              label={({ cx, cy, midAngle, outerRadius, percent, index }) => {
                if (!percent) return null;
                const r = Number(outerRadius) + 16;
                const angle = -Number(midAngle) * RADIAN;
                return (
                  <text
                    x={Number(cx) + r * Math.cos(angle)}
                    y={Number(cy) + r * Math.sin(angle)}
                    className="donut__pct"
                    fill={donutData[Number(index)].color}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {Math.round(Number(percent) * 100)}%
                  </text>
                );
              }}
            >
              {donutData.map((d) => (
                <Cell key={d.type} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
          <div className="donut__center">
            <span className="donut__caption">BALANCE</span>
            <span
              className="donut__balance"
              style={{
                color: balance >= 0 ? TYPE_COLOR.income : TYPE_COLOR.expense,
              }}
            >
              {euro(balance)}
            </span>
          </div>
        </div>

        <ul className="analytics__legend">
          {TYPE_META.map(({ type, label }) => (
            <li key={type}>
              <span className="dot" style={{ background: TYPE_COLOR[type] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="analytics__breakdowns">
        {TYPE_META.map(({ type, label }) => {
          const slices = categorySlices(transactions, type);
          const total = totals[type];
          const color = TYPE_COLOR[type];
          return (
            <div className="breakdown" key={type}>
              <div className="breakdown__head">
                <span className="breakdown__title" style={{ color }}>
                  {label}
                </span>
                <span className="breakdown__total" style={{ color }}>
                  {euro(total)}
                </span>
              </div>
              <div className="breakdown__bar">
                {total > 0 ? (
                  slices.map((c) => (
                    <span
                      key={c.name}
                      className="breakdown__seg"
                      style={{
                        width: `${(c.amount / total) * 100}%`,
                        background: c.color,
                      }}
                      title={`${c.name}: ${euro(c.amount)}`}
                    />
                  ))
                ) : (
                  <span className="breakdown__seg breakdown__seg--empty" />
                )}
              </div>
              {slices.length > 0 && (
                <ul className="breakdown__legend">
                  {slices.map((c) => (
                    <li key={c.name}>
                      <span className="dot" style={{ background: c.color }} />
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
