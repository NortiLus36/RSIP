"use client";
import { useState } from "react";
import {
  X,
  Focus,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { DashboardData } from "@/data/providers";
import { useExplorer } from "@/stores/explorer";
import { fixtureTypeNames } from "@/config/fixtures";
import { formatMetric, formatPeriod } from "@/lib/analytics";
import { filterForObject } from "@/lib/analytics/selectors";
import { InventoryPlanner } from "@/components/analytics/InventoryPlanner";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { SalesTrendChart } from "@/components/analytics/Charts";
import { SpatialInspector } from "@/components/spatial/SpatialInspector";
import { KPIInfoPopover } from "@/components/analytics/KPIInfoPopover";
export function ObjectInspector({
  data,
  collapsed,
  onCollapse,
}: {
  data: DashboardData;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const selected = useExplorer((s) => s.selectedId);
  if (!selected) return null;
  return (
    <InspectorBody
      key={selected}
      data={data}
      selected={selected}
      collapsed={collapsed}
      onCollapse={onCollapse}
    />
  );
}
function InspectorBody({
  data,
  selected,
  collapsed,
  onCollapse,
}: {
  data: DashboardData;
  selected: string;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const [tab, setTab] = useState("Overview");
  const { store, dataset, inventory } = data;
  const zone = store.zones.find((z) => z.id === selected);
  const fixture = store.fixtures.find((f) => f.id === selected);
  const support = store.supportAreas.find((s) => s.id === selected);
  const object = zone ?? fixture ?? support;
  const parent = zone ?? store.zones.find((z) => z.id === fixture?.zoneId);
  if (!object) return null;
  const snapshot = data.objectSnapshots.find((s) => s.objectId === selected);
  const items = inventory.filter((i) =>
    fixture
      ? i.shelfId === fixture.id
      : zone
        ? store.fixtures.some((f) => f.id === i.shelfId && f.zoneId === zone.id)
        : false,
  );
  const filter = filterForObject(store, selected);
  const checkout = fixture?.kind === "checkout" || zone?.id === "L";
  const history = [...new Set(dataset.checkout.map((r) => r.date))].map(
    (date) => {
      const rows = dataset.checkout.filter(
        (r) => r.date === date && (!fixture || r.fixtureId === fixture.id),
      );
      const transactions = rows.reduce((s, r) => s + r.transactions, 0);
      return {
        name: date.slice(5),
        sales: transactions
          ? rows.reduce((s, r) => s + r.totalWaitMinutes, 0) / transactions
          : 0,
      };
    },
  );
  return (
    <aside
      className={`inspector drawer ${collapsed ? "drawer-collapsed" : ""}`}
      aria-label="Object details"
    >
      <header className="drawer-header">
        <div>
          <span className="eyebrow">OBJECT INSPECTOR · DEMO</span>
          <h2>{object.name}</h2>
          <code>{object.id}</code>
          <small>
            {parent ? `${parent.id} · ${parent.nameTh}` : support?.nameTh}
          </small>
        </div>
        <div className="drawer-controls">
          <button
            aria-label={collapsed ? "Expand inspector" : "Collapse inspector"}
            title={collapsed ? "Expand inspector" : "Collapse inspector"}
            onClick={onCollapse}
          >
            {collapsed ? (
              <PanelRightOpen size={16} />
            ) : (
              <PanelRightClose size={16} />
            )}
          </button>
          <button
            aria-label="Close inspector"
            title="Close inspector"
            onClick={() => useExplorer.getState().select(null, false)}
          >
            <X size={17} />
          </button>
        </div>
      </header>
      <div className="drawer-expanded" hidden={collapsed}>
        <div className="inspector-actions">
          <button
            aria-label="Focus camera"
            onClick={() => useExplorer.getState().focus()}
          >
            <Focus size={13} />
            Focus
          </button>
          <button
            aria-label="Reset view"
            onClick={() => useExplorer.getState().reset()}
          >
            <RotateCcw size={13} />
            Reset View
          </button>
        </div>
        <div
          className="inspector-tabs"
          role="tablist"
          aria-label="Inspector tabs"
        >
          {["Overview", "Inventory", "Analytics", "Traffic"].map((t) => (
            <button
              key={t}
              role="tab"
              id={`inspector-tab-${t}`}
              aria-controls={`inspector-panel-${t}`}
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="inspector-scroll">
          <section
            role="tabpanel"
            id="inspector-panel-Overview"
            aria-labelledby="inspector-tab-Overview"
            hidden={tab !== "Overview"}
          >
            <SpatialInspector
              data={data.spatial}
              zoneId={parent?.id}
              fixtureId={fixture?.id}
            />
            <h3>Daily KPI · ฐานข้อมูลรายวัน</h3>
            <p className="data-period">
              {snapshot
                ? formatPeriod(snapshot.period)
                : `Stock snapshot · ${dataset.asOf}`}
            </p>
            <div className="inspector-metrics">
              {snapshot?.metrics.length ? (
                snapshot.metrics
                  .filter((m) =>
                    [
                      "netSales",
                      "grossProfit",
                      "grossMargin",
                      "oosRate",
                      "waitTime",
                    ].includes(m.key),
                  )
                  .map((m) => (
                    <div key={m.key} title={m.definition}>
                      <span>
                        {m.label}
                        <KPIInfoPopover topic={m.key} />
                      </span>
                      <strong data-inspector-kpi={m.key}>
                        {formatMetric(m.value, m.unit)}
                        {m.unit === "minutes" ? " นาที" : ""}
                      </strong>
                    </div>
                  ))
              ) : (
                <p className="empty-state">KPI: No Data</p>
              )}
              {items.length > 0 && (
                <>
                  <div>
                    <span>Shelf Stock</span>
                    <strong>
                      {items
                        .reduce((s, i) => s + i.onHand, 0)
                        .toLocaleString("th-TH")}{" "}
                      ชิ้น
                    </strong>
                  </div>
                  <div>
                    <span>Backroom Stock</span>
                    <strong>
                      {items.every((i) => i.backroomOnHand !== undefined)
                        ? `${items.reduce((s, i) => s + (i.backroomOnHand ?? 0), 0).toLocaleString("th-TH")} ชิ้น`
                        : "No Data"}
                    </strong>
                  </div>
                </>
              )}
            </div>
            <dl>
              <dt>Description</dt>
              <dd>
                {fixture?.description ??
                  parent?.description ??
                  "พื้นที่สนับสนุนของร้าน"}
              </dd>
              <dt>Fixture Type</dt>
              <dd>
                {fixture
                  ? fixtureTypeNames[fixture.kind]
                  : zone
                    ? "แผนกสินค้า"
                    : "พื้นที่สนับสนุน"}
              </dd>
              <dt>Category</dt>
              <dd>
                {data.categories.find((c) => c.id === parent?.categoryId)
                  ?.name ?? "No Data"}
              </dd>
            </dl>
            <p className="form-hint">
              ยอดขาย/กำไรของ Zone รวมจาก SKU ของ Fixture ภายใน Zone; OOS ใช้
              stock snapshot ไม่เฉลี่ยเปอร์เซ็นต์จากชั้นวาง
            </p>
          </section>
          <section
            role="tabpanel"
            id="inspector-panel-Traffic"
            aria-labelledby="inspector-tab-Traffic"
            hidden={tab !== "Traffic"}
          >
            {tab === "Traffic" && !collapsed && (
              <SpatialInspector
                data={data.spatial}
                zoneId={parent?.id}
                fixtureId={fixture?.id}
                chart
              />
            )}
          </section>
          <section
            role="tabpanel"
            id="inspector-panel-Inventory"
            aria-labelledby="inspector-tab-Inventory"
            hidden={tab !== "Inventory"}
          >
            {checkout ? (
              <p className="empty-state">
                Checkout เป็นพื้นที่บริการ ไม่มี Inventory Calculator · ดู Wait
                Time ใน Overview และ Analytics
              </p>
            ) : (
              <InventoryPlanner dataset={dataset} items={items} />
            )}
          </section>
          <section
            role="tabpanel"
            id="inspector-panel-Analytics"
            aria-labelledby="inspector-tab-Analytics"
            hidden={tab !== "Analytics"}
          >
            {tab === "Analytics" &&
              !collapsed &&
              (checkout ? (
                <div className="chart-card">
                  <h3>
                    เวลารอชำระเงินย้อนหลัง
                    <KPIInfoPopover topic="trend" />
                  </h3>
                  <p className="data-period">
                    รายวัน · {dataset.checkout[0].date} – {dataset.asOf} · นาที
                  </p>
                  <SalesTrendChart data={history} unit="minutes" />
                </div>
              ) : filter ? (
                <AnalyticsView
                  dataset={dataset}
                  store={store}
                  fixedFilter={filter}
                />
              ) : (
                <p className="empty-state">
                  Analytics: No Data สำหรับพื้นที่สนับสนุนนี้
                </p>
              ))}
          </section>
        </div>
      </div>
    </aside>
  );
}
