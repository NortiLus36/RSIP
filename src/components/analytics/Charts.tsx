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
  "#02aba4",
  "#59a99a",
  "#ffc815",
  "#af83bf",
  "#83b1d4",
  "#d3888b",
  "#758899",
  "#a0b870",
  "#c09144",
  "#466f9b",
  "#af608c",
  "#508b79",
];
const currency = (value: unknown) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
        Number(value),
      )
    : "N/A";
function Empty() {
  return (
    <p className="empty-state">ไม่มีข้อมูล · ไม่พบข้อมูลในขอบเขตที่เลือก</p>
  );
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
        unit === "THB" ? "แนวโน้มยอดขายย้อนหลัง" : "เวลารอชำระเงินย้อนหลัง"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ bottom: 16, left: 10, right: 12 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#edf0f5"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            label={{
              value: "วันที่",
              position: "insideBottom",
              offset: -10,
              fontSize: 9,
            }}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            width={62}
            label={{
              value: unit === "THB" ? "บาท" : "นาที",
              angle: -90,
              position: "insideLeft",
              fontSize: 9,
            }}
          />
          <Tooltip formatter={currency} />
          <Line
            type="monotone"
            dataKey="sales"
            name={unit === "THB" ? "ยอดขาย (บาท)" : "เวลารอเฉลี่ย (นาที)"}
            stroke="#02aba4"
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
      style={{ height: Math.max(220, data.length * 30) }}
      role="img"
      aria-label={
        scenario
          ? "เปรียบเทียบกำไรส่วนเพิ่มของทางเลือก"
          : "ยอดขายแยกตามหมวดสินค้า"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ bottom: 16, right: 15, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#edf0f5"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 9 }}
            label={{
              value: "บาท",
              position: "insideBottom",
              offset: -10,
              fontSize: 9,
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 9 }}
            width={130}
            interval={0}
          />
          <Tooltip formatter={currency} />
          <Bar
            dataKey="sales"
            name={scenario ? "กำไรส่วนเพิ่ม (บาท)" : "ยอดขาย (บาท)"}
            fill="#02aba4"
            radius={[0, 4, 4, 0]}
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
    <div
      className="analytics-chart"
      role="img"
      aria-label="สัดส่วนยอดขายตามหมวดสินค้า"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            name="ยอดขาย (บาท)"
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
          <Legend wrapperStyle={{ fontSize: 9 }} formatter={(v) => String(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty />
  );
}
