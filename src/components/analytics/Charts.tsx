"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ChartDatum } from "@/types/analytics";
const palette = [
  "#516dcc",
  "#59a99a",
  "#e4b063",
  "#af83bf",
  "#83b1d4",
  "#d3888b",
  "#758899",
  "#a0b870",
];
const currency = (value: unknown) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
        Number(value),
      )
    : "N/A";
function Empty() {
  return <p className="empty-state">No Data · ไม่พบข้อมูลในขอบเขตที่เลือก</p>;
}
export function SalesTrendChart({
  data,
  unit = "THB",
}: {
  data: ChartDatum[];
  unit?: "THB" | "minutes";
}) {
  return data.length ? (
    <div
      className="analytics-chart"
      role="img"
      aria-label={
        unit === "THB" ? "Sales trend history" : "Checkout wait history"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#edf0f5"
          />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} width={52} />
          <Tooltip formatter={currency} />
          <Line
            type="monotone"
            dataKey="sales"
            name={unit === "THB" ? "ยอดขาย (THB)" : "เวลารอเฉลี่ย (นาที)"}
            stroke="#516dcc"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty />
  );
}
export function CategoryComparisonChart({
  data,
  scenario = false,
}: {
  data: ChartDatum[];
  scenario?: boolean;
}) {
  return data.length ? (
    <div
      className="analytics-chart"
      role="img"
      aria-label={
        scenario ? "Scenario contribution comparison" : "Sales by category"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#edf0f5"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            interval={0}
            tickFormatter={(v) => String(v).split(" · ")[0]}
          />
          <YAxis tick={{ fontSize: 9 }} width={52} />
          <Tooltip formatter={currency} />
          <Bar
            dataKey="sales"
            name={scenario ? "Contribution (THB)" : "ยอดขาย (THB)"}
            fill="#516dcc"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty />
  );
}
export function CompositionChart({ data }: { data: ChartDatum[] }) {
  return data.length ? (
    <div className="analytics-chart" role="img" aria-label="Sales composition">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            nameKey="name"
            dataKey="sales"
            innerRadius="48%"
            outerRadius="75%"
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={currency} />
          <Legend
            wrapperStyle={{ fontSize: 9 }}
            formatter={(v) => String(v).split(" · ")[0]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty />
  );
}
