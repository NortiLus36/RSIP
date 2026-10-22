"use client";
import { useEffect, useMemo, type CSSProperties } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { SpatialDataset } from "@/types/spatial";
import { useSpatial } from "@/stores/spatial";
import { startPlayback } from "@/lib/simulation/playback";
import {
  hourlySeries,
  nextHour,
  peakHour,
  validTime,
} from "@/lib/analytics/spatial";
export const timeLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;
export const num = (n: number | null, unit = "") =>
  n === null || !Number.isFinite(n)
    ? "No Data"
    : `${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
export function Timeline({ data }: { data: SpatialDataset }) {
  const {
    selectedDate: date,
    selectedHour: hour,
    playing,
    speed,
    setTime,
    setPlaying,
    setSpeed,
    activeDataLayer,
  } = useSpatial();
  useEffect(() => {
    if (!playing) return;
    return startPlayback(
      () => {
        const current = useSpatial.getState();
        if (!current.playing) return;
        const next = nextHour(current.selectedHour, data.hours);
        useSpatial.setState({ selectedHour: next.hour, playing: next.playing });
      },
      speed,
      window,
    );
  }, [playing, speed, data.hours]);
  const series = useMemo(() => hourlySeries(data, date), [data, date]);
  const row = series.find((r) => r.hour === hour);
  const peak = peakHour(data, date);
  const change = (d: string, h: number) => {
    if (validTime(data, d, h)) setTime(d, h);
  };
  return (
    <section className="timeline" aria-label="Hourly timeline">
      <div className="timeline-controls">
        <span className="timeline-title">
          TIME EXPLORER <small>DEMO DATA · Asia/Bangkok</small>
        </span>
        <label>
          วันที่
          <select
            aria-label="Timeline date"
            value={date}
            onChange={(e) => change(e.target.value, hour)}
          >
            {data.dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <button
          aria-label={playing ? "Pause playback" : "Play timeline"}
          onClick={() => {
            if (hour === data.hours.at(-1)) setTime(date, data.hours[0]);
            setPlaying(!playing);
          }}
          className="primary-button"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          aria-label="Reset timeline"
          onClick={() => setTime(date, data.hours[0])}
        >
          <RotateCcw size={14} />
        </button>
        <label>
          Speed
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as 1 | 2 | 5)}
          >
            {[1, 2, 5].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <strong data-selected-time>
          {timeLabel(hour)}–{timeLabel(hour + 1)}
        </strong>
        <span className="peak-badge">
          Peak {peak === null ? "No Data" : timeLabel(peak)}
        </span>
      </div>
      <div className="timeline-track">
        <span>08:00</span>
        <input
          aria-label="Selected hour"
          type="range"
          min={data.hours[0]}
          max={data.hours.at(-1)}
          step={1}
          value={hour}
          aria-valuetext={`${date} ${timeLabel(hour)} Asia/Bangkok`}
          style={
            {
              "--timeline-progress": `${((hour - data.hours[0]) / (data.hours.at(-1)! - data.hours[0])) * 100}%`,
            } as CSSProperties
          }
          onChange={(e) => change(date, Number(e.target.value))}
        />
        <span>22:00</span>
      </div>
      <div className="hourly-summary" aria-label="Selected hour store KPIs">
        <span>
          ผู้เข้าร้าน{" "}
          <b data-hour-kpi="entries">{num(row?.entries ?? null, "คน/ชม.")}</b>
        </span>
        <span>
          Occupancy snapshot{" "}
          <b data-hour-kpi="occupancy">{num(row?.occupancy ?? null, "คน")}</b>
        </span>
        <span>
          Sales{" "}
          <b data-hour-kpi="sales">{num(row?.sales ?? null, "THB/ชม.")}</b>
        </span>
        <span>
          Transactions{" "}
          <b data-hour-kpi="transactions">
            {num(row?.transactions ?? null, "รายการ/ชม.")}
          </b>
        </span>
      </div>
      <p className="timeline-note">
        {activeDataLayer === "normal" &&
          "Normal ไม่แสดง Heatmap · เปิด Customer Density เพื่อดูสีเปลี่ยนตามเวลา · "}
        หยุดที่ 22:00 · Occupancy แต่ละโซนเป็น snapshot พร้อมกัน
        ไม่ใช่จำนวนคนผ่านทั้งชั่วโมง · KPI แถบ Store Performance เป็นฐานรายวัน
        Phase 3
      </p>
    </section>
  );
}
