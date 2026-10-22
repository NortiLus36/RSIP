"use client";
import { KPIInfoPopover } from "@/components/analytics/KPIInfoPopover";
import type { SpatialDataset } from "@/types/spatial";
import { useSpatial } from "@/stores/spatial";
import { zoneAt } from "@/lib/analytics/spatial";
import { HourChart } from "./PeakAnalytics";
import { num, timeLabel } from "./Timeline";
export function SpatialInspector({
  data,
  zoneId,
  fixtureId,
  chart = false,
}: {
  data: SpatialDataset;
  zoneId?: string;
  fixtureId?: string;
  chart?: boolean;
}) {
  const date = useSpatial((s) => s.selectedDate),
    hour = useSpatial((s) => s.selectedHour),
    layer = useSpatial((s) => s.activeDataLayer);
  if (!zoneId)
    return (
      <p className="empty-state">
        Spatial Analytics: No Data สำหรับพื้นที่สนับสนุน
      </p>
    );
  const r = zoneAt(data, date, hour, zoneId, fixtureId);
  return (
    <section className="spatial-inspector">
      <span className="eyebrow">
        SELECTED HOUR · {layer.toUpperCase()} · DEMO
      </span>
      <p>
        {date} · {timeLabel(hour)}–{timeLabel(hour + 1)} UTC+7
      </p>
      {fixtureId && (
        <p className="form-hint">
          Traffic / Sales เป็นข้อมูลของ Zone {zoneId} ที่ Fixture นี้ตั้งอยู่
          ไม่ใช่ยอด Fixture · OOS ด้านล่างเป็นของ Fixture
        </p>
      )}
      <div className="inspector-metrics">
        <div>
          <span>Zone {zoneId} · Occupancy</span>
          <strong data-spatial-inspector="occupancy">
            {num(r.occupancy, "คน")}
          </strong>
        </div>
        <div>
          <span>Density · พื้นที่จำลอง</span>
          <strong>{num(r.density, "คน/ตร.ม.")}</strong>
        </div>
        <div>
          <span>Zone sales / ชั่วโมง</span>
          <strong data-spatial-inspector="sales">{num(r.sales, "THB")}</strong>
        </div>
        <div>
          <span>Sales share ของร้าน</span>
          <strong>{num(r.share, "%")}</strong>
        </div>
        <div>
          <span>OOS snapshot {fixtureId ? "Fixture" : "Zone"}</span>
          <strong data-spatial-inspector="oos">{num(r.oosRate, "%")}</strong>
          <small>
            {r.oos} / {r.checked} SKU · checked 0 = No Data
          </small>
        </div>
      </div>
      {chart && (
        <>
          <h3>
            Zone Occupancy by Hour
            <KPIInfoPopover topic="trend" />
          </h3>
          <HourChart
            data={data}
            date={date}
            zoneId={zoneId}
            metric="occupancy"
            selectedHour={hour}
          />
          <h3>
            Zone Sales by Hour
            <KPIInfoPopover topic="trend" />
          </h3>
          <HourChart
            data={data}
            date={date}
            zoneId={zoneId}
            metric="sales"
            selectedHour={hour}
          />
        </>
      )}
    </section>
  );
}
