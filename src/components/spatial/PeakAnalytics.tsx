"use client";
import { KPIFieldHeader } from "@/components/analytics/KPIFieldHeader";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Cell,
} from "recharts";
import type { Store } from "@/types";
import type { SpatialDataset } from "@/types/spatial";
import { useSpatial } from "@/stores/spatial";
import { hourlySeries, peakHour, topZones } from "@/lib/analytics/spatial";
import { num, timeLabel } from "./Timeline";
export function HourChart({
  data,
  date,
  zoneId,
  metric = "entries",
  selectedHour,
}: {
  data: SpatialDataset;
  date: string;
  zoneId?: string;
  metric?: "entries" | "occupancy" | "sales";
  selectedHour: number;
}) {
  const rows = useMemo(
    () => hourlySeries(data, date, zoneId),
    [data, date, zoneId],
  );
  const peak = peakHour(data, date);
  const unit =
    metric === "sales"
      ? "บาท/ชั่วโมง"
      : metric === "entries"
        ? "ผู้เข้าร้าน/ชั่วโมง"
        : "คน ณ snapshot";
  const select = useSpatial((s) => s.setTime);
  const current = rows.find((r) => r.hour === selectedHour)?.[metric];
  if (rows.every((r) => r[metric] === null))
    return (
      <p className="empty-state">
        ไม่มีข้อมูล · ไม่พบ {unit} ของ {zoneId ?? "ร้าน"} ในวันที่ {date}
      </p>
    );
  return (
    <div
      className="hour-chart"
      role="img"
      aria-label={`${metric === "sales" ? "ยอดขาย" : metric === "entries" ? "จำนวนลูกค้าเข้าร้าน" : "จำนวนลูกค้าในโซน"} ${date} ${zoneId ?? "ร้าน"}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ left: 0, right: 14, top: 12, bottom: 8 }}
          onClick={(state) => {
            const label = state?.activeLabel;
            if (label != null) {
              const row = rows.find((r) => r.name === String(label));
              if (row) select(date, row.hour);
            }
          }}
        >
          <CartesianGrid vertical={false} stroke="#edf1f4" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            minTickGap={18}
            label={{
              value: "เวลา",
              position: "insideBottom",
              offset: -5,
              fontSize: 9,
            }}
          />
          <YAxis
            width={65}
            tick={{ fontSize: 10 }}
            label={{
              value: metric === "sales" ? "บาท" : "คน",
              angle: -90,
              position: "insideLeft",
              fontSize: 9,
            }}
          />
          <Tooltip
            labelFormatter={(label) => `${date} ${label} · Asia/Bangkok`}
            formatter={(value) => [
              num(typeof value === "number" ? value : null),
              unit,
            ]}
          />
          <ReferenceLine
            x={timeLabel(selectedHour)}
            stroke="#02aba4"
            strokeWidth={2}
            label={{
              value: "ช่วงที่เลือก",
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
          {peak !== null && (
            <ReferenceLine
              x={timeLabel(peak)}
              stroke="#ffc815"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
          <Line
            type="monotone"
            dataKey={metric}
            stroke="#02aba4"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#ffc815" }}
            isAnimationActive={false}
          />
          {current != null && (
            <ReferenceDot
              x={timeLabel(selectedHour)}
              y={current}
              r={5}
              fill="#ffc815"
              stroke="#92730d"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function PeakAnalytics({
  data,
  store,
}: {
  data: SpatialDataset;
  store: Store;
}) {
  const date = useSpatial((s) => s.selectedDate),
    hour = useSpatial((s) => s.selectedHour);
  const rows = useMemo(() => hourlySeries(data, date), [data, date]);
  const selected = rows.find((r) => r.hour === hour);
  const peak = peakHour(data, date);
  const top = topZones(data, date, hour).map((r) => ({
    name: `${r.zoneId} · ${store.zones.find((z) => z.id === r.zoneId)?.nameTh}`,
    occupancy: r.occupancy,
  }));
  return (
    <section className="peak-analytics">
      <span className="eyebrow">SPATIAL INTELLIGENCE · DEMO DATA</span>
      <h1>Peak Time Analytics</h1>
      <p>
        {date} · {timeLabel(hour)}–{timeLabel(hour + 1)} · Asia/Bangkok ·
        เลือกช่วงเวลาที่ Timeline ด้านล่าง หรือคลิกจุดในกราฟ
      </p>
      <div className="peak-kpis">
        <article>
          <span>Daily peak · ผู้เข้าร้าน</span>
          <b>{peak === null ? "No Data" : timeLabel(peak)}</b>
          <small>สูงสุดจาก Dataset · เสมอกันเลือกชั่วโมงแรก</small>
        </article>
        <article>
          <span>ลูกค้าเข้าร้านช่วงที่เลือก</span>
          <b>{num(selected?.entries ?? null, "คน")}</b>
          <small>ผู้เข้าร้าน ไม่บวกจำนวนคนผ่านหลายโซน</small>
        </article>
        <article>
          <span>ยอดขายรายชั่วโมง</span>
          <b>{num(selected?.sales ?? null, "บาท")}</b>
        </article>
        <article>
          <span>จำนวนธุรกรรม</span>
          <b>{num(selected?.transactions ?? null, "รายการ")}</b>
        </article>
      </div>
      <div className="peak-chart-grid">
        <article className="chart-card">
          <h3>
            <KPIFieldHeader
              label="จำนวนลูกค้าเข้าร้านรายชั่วโมง"
              topic="trend"
            />
          </h3>
          <p>
            ผู้เข้าร้านต่อชั่วโมง · เส้นเหลือง = ช่วงสูงสุดของวัน · เส้นเขียว =
            ช่วงที่เลือก
          </p>
          <HourChart data={data} date={date} selectedHour={hour} />
        </article>
        <article className="chart-card">
          <h3>
            <KPIFieldHeader label="ยอดขายรายชั่วโมง" topic="trend" />
          </h3>
          <p>บาทต่อชั่วโมง · รวมวันตรงกับฐานยอดขายรายวัน</p>
          <HourChart
            data={data}
            date={date}
            selectedHour={hour}
            metric="sales"
          />
        </article>
        <article className="chart-card">
          <h3>
            <KPIFieldHeader
              label="3 โซนที่มีลูกค้ามากที่สุด"
              topic="category"
            />
          </h3>
          <p>
            เรียงจาก Occupancy ณ {timeLabel(hour)} · ไม่ใช่ Footfall ทั้งวัน
          </p>
          <div className="hour-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top}
                layout="vertical"
                margin={{ left: 16, right: 20 }}
              >
                <XAxis
                  type="number"
                  label={{
                    value: "จำนวนคน",
                    position: "insideBottom",
                    offset: -3,
                    fontSize: 9,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={115}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v) => [
                    num(typeof v === "number" ? v : null),
                    "คน ณ snapshot",
                  ]}
                  labelFormatter={(l) => `${date} ${timeLabel(hour)} · ${l}`}
                />
                <Bar dataKey="occupancy" isAnimationActive={false}>
                  {top.map((r, i) => (
                    <Cell key={r.name} fill={i === 0 ? "#ffc815" : "#02aba4"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="chart-card">
          <h3>นิยามที่ใช้</h3>
          <p>
            Occupancy เป็นข้อมูลจำลอง ณ ต้นชั่วโมง แต่ละคนอยู่ในโซนเดียวใน
            snapshot นั้น ไม่รวมพื้นที่คลังสินค้า จึงไม่เท่ากับ Traffic
            ผู้เข้าร้านทั้งชั่วโมง
          </p>
          <p>
            Sales และ Transactions เป็นยอดทั้งช่วงชั่วโมงที่เลือก Transactions
            จัดสรรตามโซนสินค้าเพื่อรวมได้โดยไม่ซ้ำกับ Checkout
          </p>
          <p>
            08:00–22:00 หมายถึง bucket สุดท้าย 22:00–23:00 · Phase 4
            ขยายป้ายช่วงเวลาของฐานรายวันเป็น 00:00–23:00
            เพื่อให้สอดคล้องกับการจัดสรรครบวัน โดยยอดรวมเดิมไม่เปลี่ยน
          </p>
        </article>
      </div>
    </section>
  );
}
