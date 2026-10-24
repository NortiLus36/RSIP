"use client";
import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
export const display = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "No Data"
    : n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
export function Field({
  label,
  value,
  onChange,
  min = 0,
  max = 1000000000,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </label>
  );
}
export function Stats({
  items,
}: {
  items: [string, number | null | undefined][];
}) {
  return (
    <div className="intel-stats">
      {items.map(([k, v]) => (
        <article key={k}>
          <small>{k}</small>
          <strong>{display(v)}</strong>
        </article>
      ))}
    </div>
  );
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="intel-table">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Chart({
  rows,
  keys,
}: {
  rows: Record<string, unknown>[];
  keys: string[];
}) {
  return (
    <div className="intel-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Legend />
          {keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              name={chartLabels[k] ?? k}
              fill={["#00aaa6", "#aabbd1", "#f0bc3b"][i % 3]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const chartLabels: Record<string, string> = {
  actual: "Actual",
  previous: "ช่วงเปรียบเทียบ",
  forecast: "Forecast",
  quantity: "Forecast units",
  contribution: "Contribution THB",
  cases: "จำนวนเคส",
};
