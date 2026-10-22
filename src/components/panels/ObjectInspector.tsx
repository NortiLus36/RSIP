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
import {
  filterForObject,
  currentRows,
  salesTotals,
} from "@/lib/analytics/selectors";
import { InventoryPlanner } from "@/components/analytics/InventoryPlanner";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { SalesTrendChart } from "@/components/analytics/Charts";
import { SpatialInspector } from "@/components/spatial/SpatialInspector";
import { KPIFieldHeader } from "@/components/analytics/KPIFieldHeader";
import { CatalogBrowser } from "./CatalogBrowser";
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
  const selectedSku = useExplorer((s) => s.selectedSku);
  if (!selected) return null;
  return (
    <InspectorBody
      key={`${selected}:${selectedSku ?? ""}`}
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
  const selectedSku = useExplorer((s) => s.selectedSku);
  const [tab, setTab] = useState(selectedSku ? "Inventory" : "Overview");
  const { store, dataset, inventory } = data;
  const zone = store.zones.find((z) => z.id === selected);
  const fixture = store.fixtures.find((f) => f.id === selected);
  const support = store.supportAreas.find((s) => s.id === selected);
  const object = zone ?? fixture ?? support;
  const parent = zone ?? store.zones.find((z) => z.id === fixture?.zoneId);
  if (!object) return null;
  const fixtureSnapshot = data.objectSnapshots.find(
    (s) => s.objectId === selected,
  );
  const totals = selectedSku
    ? salesTotals(currentRows(dataset, { sku: selectedSku }))
    : null;
  const skuStock = data.catalog.shelfInventory
    .filter((r) => r.sku === selectedSku)
    .reduce((s, r) => s + r.shelfStock, 0);
  const skuValues = totals
    ? {
        netSales: totals.sales,
        grossProfit: totals.grossProfit,
        grossMargin: totals.sales
          ? (totals.grossProfit / totals.sales) * 100
          : null,
        oosRate: skuStock === 0 ? 100 : 0,
      }
    : null;
  const snapshot =
    skuValues && fixtureSnapshot
      ? {
          ...fixtureSnapshot,
          metrics: fixtureSnapshot.metrics
            .filter(
              (m) =>
                m.key in skuValues &&
                skuValues[m.key as keyof typeof skuValues] !== null,
            )
            .map((m) => ({
              ...m,
              value: skuValues[m.key as keyof typeof skuValues]!,
            })),
        }
      : fixtureSnapshot;
  const items = inventory.filter((i) =>
    fixture
      ? i.shelfId === fixture.id
      : zone
        ? store.fixtures.some((f) => f.id === i.shelfId && f.zoneId === zone.id)
        : false,
  );
  const filter = selectedSku
    ? { sku: selectedSku }
    : filterForObject(store, selected);
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
          <h2>
            {data.catalog.products.find((p) => p.sku === selectedSku)?.nameTh ??
              object.name}
          </h2>
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
                      <KPIFieldHeader label={m.label} topic={m.key} />
                      <strong data-inspector-kpi={m.key}>
                        {formatMetric(m.value, m.unit)}
                        {m.unit === "minutes" ? " นาที" : ""}
                      </strong>
                    </div>
                  ))
              ) : (
                <p className="empty-state">KPI: No Data</p>
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
            {!checkout && <CatalogBrowser data={data} objectId={selected} />}
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
              <>
                {!selectedSku && (
                  <CatalogBrowser data={data} objectId={selected} />
                )}
                <InventoryPlanner
                  dataset={dataset}
                  items={items}
                  catalog={data.catalog}
                  initialSku={selectedSku}
                  onSkuChange={(sku) =>
                    useExplorer
                      .getState()
                      .selectSku(
                        sku,
                        items.find((i) => i.sku === sku)?.shelfId ?? selected,
                      )
                  }
                />
              </>
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
                    <KPIFieldHeader
                      label="เวลารอชำระเงินย้อนหลัง"
                      topic="trend"
                    />
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
