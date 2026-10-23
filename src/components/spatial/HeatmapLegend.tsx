"use client";
import { useMemo, useState } from "react";
import type { Store } from "@/types";
import type { SpatialDataset } from "@/types/spatial";
import { useSpatial } from "@/stores/spatial";
import { useExplorer } from "@/stores/explorer";
import { layerConfig, noDataColor } from "@/config/heatmap";
import { colorLevel, layerValue } from "@/lib/analytics/spatial";
import { num, timeLabel } from "./Timeline";
export function HeatmapLegend({
  data,
  store,
}: {
  data: SpatialDataset;
  store: Store;
}) {
  const [open, setOpen] = useState(true);
  const layer = useSpatial((s) => s.activeDataLayer);
  const date = useSpatial((s) => s.selectedDate);
  const hour = useSpatial((s) => s.selectedHour);
  const hovered = useExplorer((s) => s.hoveredId);
  const selected = useExplorer((s) => s.selectedId);
  const id = hovered ?? selected;
  const zone =
    store.zones.find((z) => z.id === id) ??
    store.zones.find(
      (z) => z.id === store.fixtures.find((f) => f.id === id)?.zoneId,
    );
  const values = useMemo(
    () =>
      store.zones
        .map((z) => layerValue(data, date, hour, z.id, layer))
        .filter((v): v is number => v !== null),
    [data, date, hour, layer, store.zones],
  );
  if (layer === "normal")
    return (
      <aside className="heatmap-off" aria-label="Heatmap is off">
        <span>Normal · Heatmap ปิดอยู่</span>
        <button onClick={() => useSpatial.getState().setLayer("density")}>
          เปิด Customer Density
        </button>
      </aside>
    );
  const config = layerConfig[layer];
  const value = zone ? layerValue(data, date, hour, zone.id, layer) : null;
  return (
    <aside className="heatmap-legend" aria-label="Heatmap legend">
      <button
        className="legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {config.name}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <p>
            {date} · {timeLabel(hour)} · {data.source}
          </p>
          <small>{config.unit}</small>
          {layer === "density" && (
            <>
              <div
                className="density-scale"
                style={{
                  background: `linear-gradient(90deg, ${config.colors[0]} 0%, ${config.colors[1]} ${(config.thresholds[0] / config.thresholds[1]) * 100}%, ${config.colors[2]} 100%)`,
                }}
              />
              <small>สีไล่ระดับตามค่าจริง · ระดับด้านล่างใช้จัดกลุ่ม</small>
            </>
          )}
          {config.colors.map((color, i) => (
            <div className="legend-row" key={color}>
              <i style={{ background: color }} />
              <span>{["Low / Normal", "Medium / Watch", "High"][i]}</span>
              <b>
                {i === 0
                  ? `< ${config.thresholds[0]}`
                  : i === 1
                    ? `${config.thresholds[0]}–<${config.thresholds[1]}`
                    : `≥ ${config.thresholds[1]}`}
              </b>
            </div>
          ))}
          <div className="legend-row">
            <i style={{ background: noDataColor }} />
            No Data
          </div>
          <small>
            Min {num(values.length ? Math.min(...values) : null)} · Max{" "}
            {num(values.length ? Math.max(...values) : null)}
          </small>
          {layer === "density" && (
            <small>พื้นที่ทั้งหมดเป็น ตร.ม. จำลอง ไม่ใช่พื้นที่สำรวจจริง</small>
          )}
          {zone && (
            <div className="heatmap-tooltip" role="status">
              <b>
                {zone.id} · {zone.name}
              </b>
              <span>
                {num(value)} {config.unit}
              </span>
              <small>{colorLevel(value, layer).label} · ข้อมูลระดับ Zone</small>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
