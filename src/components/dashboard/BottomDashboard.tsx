"use client";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Banknote,
  ChartNoAxesCombined,
  PackageX,
  Users,
  Clock3,
  Smile,
  ArrowUpRight,
} from "lucide-react";
import type { KpiSnapshot, HourlyTraffic } from "@/types";
import { formatMetric, formatPeriod } from "@/lib/analytics";
const icons = [Banknote, ChartNoAxesCombined, PackageX, Users, Clock3, Smile];
export function BottomDashboard({ snapshot }: { snapshot: KpiSnapshot }) {
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <h2>
          ภาพรวมวันนี้ <span>Performance snapshot</span>
        </h2>
        <span>
          {formatPeriod(snapshot.period)}{" "}
          <b>{snapshot.source.toUpperCase()} DATA</b>
        </span>
      </div>
      <div className="kpi-grid">
        {snapshot.metrics.slice(0, 6).map((m, i) => {
          const Icon = icons[i];
          return (
            <article className="kpi-card" key={m.key} title={m.definition}>
              <div className="kpi-top">
                <span>{m.label}</span>
                <Icon size={16} />
              </div>
              <strong>
                {formatMetric(m.value, m.unit)}
                <small>
                  {m.unit === "people"
                    ? "คน"
                    : m.unit === "minutes"
                      ? "นาที"
                      : ""}
                </small>
              </strong>
              <div className={`kpi-change ${m.trend}`}>
                <ArrowUpRight size={12} />
                {m.change}
                <span>เทียบช่วงก่อนหน้า (จำลอง)</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
export function TrafficChart({ traffic }: { traffic: HourlyTraffic[] }) {
  return (
    <section className="traffic-card">
      <div>
        <strong>จำนวนลูกค้ารายชั่วโมง</strong>
        <span>
          Mock · {traffic[0]?.hour}–{traffic.at(-1)?.hour} · คน
        </span>
      </div>
      <div className="traffic-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={traffic}>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Area
              dataKey="customers"
              name="ลูกค้า"
              stroke="#4663c4"
              fill="#e8edff"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
