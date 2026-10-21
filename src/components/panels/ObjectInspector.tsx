"use client";
import { X, Info, Box, Focus, RotateCcw } from "lucide-react";
import type {
  Store,
  ProductCategory,
  KpiSnapshot,
  InventoryItem,
} from "@/types";
import { fixtureTypeNames } from "@/config/fixtures";
import { useExplorer } from "@/stores/explorer";
import { formatMetric, formatPeriod } from "@/lib/analytics";
export function ObjectInspector({
  store,
  categories,
  snapshots,
  inventory,
}: {
  store: Store;
  categories: ProductCategory[];
  snapshots: KpiSnapshot[];
  inventory: InventoryItem[];
}) {
  const { selectedId, select } = useExplorer();
  const zone = store.zones.find((z) => z.id === selectedId);
  const fixture = store.fixtures.find((f) => f.id === selectedId);
  const support = store.supportAreas.find((s) => s.id === selectedId);
  const parent = zone ?? store.zones.find((z) => z.id === fixture?.zoneId);
  const object = zone ?? fixture ?? support;
  if (!object) return null;
  const snapshot = snapshots.find((s) => s.objectId === selectedId);
  const items = inventory.filter((item) =>
    fixture
      ? item.shelfId === fixture.id
      : zone
        ? store.fixtures.some(
            (f) => f.id === item.shelfId && f.zoneId === zone.id,
          )
        : false,
  );
  const shelfStock =
    parent?.id === "F"
      ? undefined
      : items.length
        ? items.reduce((sum, item) => sum + item.onHand, 0)
        : undefined;
  const backroomStock =
    items.length && items.every((item) => item.backroomOnHand !== undefined)
      ? items.reduce((sum, item) => sum + (item.backroomOnHand ?? 0), 0)
      : undefined;
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
      <code className="inspector-object-id">{object.id}</code>
      <div className="inspector-actions">
        <button
          onClick={() => useExplorer.getState().focus()}
          aria-label="Focus camera"
        >
          <Focus size={13} />
          Focus Camera
        </button>
        <button
          onClick={() => useExplorer.getState().reset()}
          aria-label="Reset view"
        >
          <RotateCcw size={13} />
          Reset View
        </button>
      </div>
      <div className="inspector-metrics">
        {(["netSales", "oosRate"] as const).map((key) => {
          const metric = snapshot?.metrics.find((m) => m.key === key);
          return (
            <div key={key}>
              <span>{key === "netSales" ? "ยอดขายจำลอง" : "OOS Rate"}</span>
              <strong>
                {metric ? formatMetric(metric.value, metric.unit) : "No Data"}
              </strong>
            </div>
          );
        })}
        <div>
          <span>Shelf Stock</span>
          <strong>
            {shelfStock !== undefined
              ? `${shelfStock.toLocaleString("th-TH")} ชิ้น`
              : "No Data"}
          </strong>
        </div>
        <div>
          <span>Backroom Stock</span>
          <strong>
            {backroomStock !== undefined
              ? `${backroomStock.toLocaleString("th-TH")} ชิ้น`
              : "No Data"}
          </strong>
        </div>
      </div>
      {snapshot ? (
        <>
          <small className="mock-note">
            {snapshot.source} · {formatPeriod(snapshot.period)}
          </small>
        </>
      ) : (
        <small className="mock-note">Mock · KPI: No Data</small>
      )}
      <dl>
        <dt>รายละเอียด</dt>
        <dd>
          {fixture?.description ??
            parent?.description ??
            "พื้นที่สนับสนุนการดำเนินงานของร้าน"}
        </dd>
        <dt>ประเภทวัตถุ</dt>
        <dd>
          {fixture
            ? fixtureTypeNames[fixture.kind]
            : zone
              ? "แผนกสินค้า"
              : "พื้นที่สนับสนุน"}
        </dd>
        <dt>ZONE</dt>
        <dd>{parent ? `${parent.id} · ${parent.name}` : "No Data"}</dd>
        <dt>หมวดหมู่สินค้า</dt>
        <dd>
          {categories.find((c) => c.id === parent?.categoryId)?.name ??
            "พื้นที่สนับสนุน"}
        </dd>
      </dl>
      <div className="inspector-note">ตำแหน่งโดยประมาณจากภาพอ้างอิง</div>
    </section>
  );
}
