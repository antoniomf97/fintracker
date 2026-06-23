import { useEffect, useRef, useState } from "react";
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

type RangeKey = "all" | "month" | "3m" | "6m" | "year" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "month", label: "This month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const DONUT_SIZE = 280;
const RADIAN = Math.PI / 180;

function euro(value: number): string {
  return `€${value.toFixed(2)}`;
}

function isoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Inclusive [from, to] date bounds for a preset; empty string means "unbounded".
function presetRange(key: RangeKey, now: Date): { from: string; to: string } {
  const to = isoDate(now);
  const monthsBack = (months: number) =>
    isoDate(
      new Date(now.getFullYear(), now.getMonth() - months, now.getDate()),
    );
  switch (key) {
    case "month":
      return {
        from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to,
      };
    case "3m":
      return { from: monthsBack(3), to };
    case "6m":
      return { from: monthsBack(6), to };
    case "year":
      // Year to date: Jan 1 of the current year through today.
      return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to };
    default:
      return { from: "", to: "" };
  }
}

function inRange(date: string, from: string, to: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
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
  name: string; // the raw category key ("" for uncategorized)
  label: string; // what to display ("uncategorized" for the empty key)
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
    label: name || "uncategorized",
    amount,
    color: tint(
      base,
      sorted.length <= 1 ? 0 : (i * 0.55) / (sorted.length - 1),
    ),
  }));
}

export function Analytics({ transactions }: { transactions: Transaction[] }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [barHover, setBarHover] = useState<{
    type: TransactionType;
    name: string;
  } | null>(null);

  // The donut is a fixed-pixel SVG; shrink it to fit narrow (phone) cards so it
  // never overflows. We watch the card width and cap the size at DONUT_SIZE.
  const rootRef = useRef<HTMLDivElement>(null);
  const [donutSize, setDonutSize] = useState(DONUT_SIZE);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const styles = getComputedStyle(el);
      const padX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const available = el.clientWidth - padX;
      setDonutSize(Math.max(200, Math.min(DONUT_SIZE, available)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Scale the radii (and label offset) proportionally from the original 280px design.
  const scale = donutSize / DONUT_SIZE;

  const range =
    rangeKey === "custom"
      ? { from: customFrom, to: customTo }
      : presetRange(rangeKey, new Date());
  const inScope = transactions.filter((t) =>
    inRange(t.date, range.from, range.to),
  );

  const totals: Record<TransactionType, number> = {
    income: sumAmount(inScope.filter((t) => t.type === "income")),
    expense: sumAmount(inScope.filter((t) => t.type === "expense")),
    savings: sumAmount(inScope.filter((t) => t.type === "savings")),
  };
  const balance = totals.income - totals.expense - totals.savings;

  const donutData = TYPE_META.map(({ type, label }) => ({
    type,
    label,
    value: totals[type],
    color: TYPE_COLOR[type],
  }));
  const highlighted = active != null ? donutData[active] : null;

  return (
    <section className="card analytics" ref={rootRef}>
      <div className="analytics__filters">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`range-pill${rangeKey === key ? " range-pill--active" : ""}`}
            onClick={() => setRangeKey(key)}
          >
            {label}
          </button>
        ))}
        {rangeKey === "custom" && (
          <span className="analytics__custom">
            <input
              type="date"
              aria-label="From date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
            <input
              type="date"
              aria-label="To date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </span>
        )}
      </div>

      <div className="analytics__body">
        <div className="analytics__donut">
          <div
            className="donut"
            style={{ width: donutSize, height: donutSize }}
          >
            <PieChart
              width={donutSize}
              height={donutSize}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={70 * scale}
                outerRadius={104 * scale}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                paddingAngle={2}
                labelLine={false}
                isAnimationActive={false}
                onMouseEnter={(_, index) => setActive(index)}
                onMouseLeave={() => setActive(null)}
                label={({ cx, cy, midAngle, outerRadius, percent, index }) => {
                  if (!percent) return null;
                  const r = Number(outerRadius) + 16 * scale;
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
              {highlighted && (
                <span
                  className="donut__active"
                  style={{ color: highlighted.color }}
                >
                  {highlighted.label}
                  <br />
                  {euro(highlighted.value)}
                </span>
              )}
            </div>
          </div>

          <ul className="analytics__legend">
            {TYPE_META.map(({ type, label }) => (
              <li key={type}>
                <span
                  className="dot"
                  style={{ background: TYPE_COLOR[type] }}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="analytics__breakdowns">
          {TYPE_META.map(({ type, label }) => {
            const slices = categorySlices(inScope, type);
            const total = totals[type];
            const color = TYPE_COLOR[type];
            const hovered =
              barHover?.type === type
                ? slices.find((s) => s.name === barHover.name)
                : undefined;
            return (
              <div className="breakdown" key={type}>
                <div className="breakdown__head">
                  <span className="breakdown__title" style={{ color }}>
                    {label}
                  </span>
                  <span className="breakdown__total" style={{ color }}>
                    {hovered
                      ? `${hovered.label} ${euro(hovered.amount)} (${Math.round(
                          (hovered.amount / total) * 100,
                        )}%)`
                      : euro(total)}
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
                        title={`${c.label}: ${euro(c.amount)}`}
                        onMouseEnter={() => setBarHover({ type, name: c.name })}
                        onMouseLeave={() => setBarHover(null)}
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
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
