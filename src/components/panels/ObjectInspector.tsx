"use client";
import { X, Info, Box } from "lucide-react";
import type { Store, ProductCategory, KpiSnapshot } from "@/types";
import { useExplorer } from "@/stores/explorer";
import { formatMetric, formatPeriod } from "@/lib/analytics";
export function ObjectInspector({
  store,
  categories,
  snapshots,
}: {
  store: Store;
  categories: ProductCategory[];
  snapshots: KpiSnapshot[];
}) {
  const { selectedId, select } = useExplorer();
  const zone = store.zones.find((z) => z.id === selectedId);
  const fixture = store.fixtures.find((f) => f.id === selectedId);
  const support = store.supportAreas.find((s) => s.id === selectedId);
  const parent = zone ?? store.zones.find((z) => z.id === fixture?.zoneId);
  const object = zone ?? fixture ?? support;
  if (!object) return null;
  const snapshot = snapshots.find((s) => s.objectId === selectedId);
  return (
    <section className="inspector" aria-label="Object details">
      <div className="inspector-top">
        <span>
          <Info size={14} /> รายละเอียดพื้นที่
        </span>
        <button aria-label="Close inspector" onClick={() => select(null)}>
          <X size={16} />
        </button>
      </div>
      <div
        className="inspector-icon"
        style={{ background: parent?.color ?? "#e6eaf0" }}
      >
        {zone?.id ?? <Box size={22} />}
      </div>
      <h2>{object.name}</h2>
      <p>{parent?.nameTh ?? support?.nameTh}</p>
      <dl>
        <dt>OBJECT ID</dt>
        <dd>{object.id}</dd>
        <dt>รายละเอียด</dt>
        <dd>{parent?.description ?? "พื้นที่สนับสนุนการดำเนินงานของร้าน"}</dd>
        <dt>หมวดหมู่สินค้า</dt>
        <dd>
          {categories.find((c) => c.id === parent?.categoryId)?.name ??
            "พื้นที่สนับสนุน"}
        </dd>
        {fixture && (
          <>
            <dt>ZONE</dt>
            <dd>{fixture.zoneId}</dd>
          </>
        )}
      </dl>
      {snapshot ? (
        <>
          <div className="inspector-metrics">
            {snapshot.metrics.slice(0, 3).map((m) => (
              <div key={m.key}>
                <span>{m.label}</span>
                <strong>{formatMetric(m.value, m.unit)}</strong>
              </div>
            ))}
          </div>
          <small className="mock-note">
            {snapshot.source} · {formatPeriod(snapshot.period)}
          </small>
        </>
      ) : (
        <small className="mock-note">ยังไม่มี KPI สำหรับพื้นที่สนับสนุน</small>
      )}
      <div className="inspector-note">ตำแหน่งโดยประมาณจากภาพอ้างอิง</div>
    </section>
  );
}
