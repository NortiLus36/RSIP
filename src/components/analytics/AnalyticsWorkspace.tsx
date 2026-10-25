"use client";
import { StoreOverview } from "./StoreOverview";
import { DemandForecast } from "./DemandForecast";
import { useState, useSyncExternalStore, useEffect } from "react";
import { safeCsv } from "@/lib/import/parse";
import { fullDate } from "@/lib/analytics/overview";
import type { DashboardData } from "@/data/providers";
import { forecastVariance } from "@/lib/analytics/intelligence";
import { useIntelligence } from "@/stores/intelligence";
import { WorkforcePanel } from "./WorkforcePanel";
import { CustomerPanel } from "./CustomerPanel";
import { SmartInventory } from "./SmartInventory";
import { display, money, Stats, Table, Chart } from "./IntelligenceUI";
import { ProfitMargin } from "./ProfitMargin";
import {
  analyticsModules,
  visibleAnalyticsModules,
  resolveAnalyticsTab,
} from "@/config/analytics-modules";
const modules = analyticsModules.map((m) => m.id);
function subscribeTab(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
function readTab() {
  const query = new URLSearchParams(window.location.search);
  return resolveAnalyticsTab(query.get("analyticsTab") ?? query.get("tab"));
}
function setTab(value: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("tab");
  url.searchParams.set("analyticsTab", resolveAnalyticsTab(value));
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function AnalyticsWorkspace({
  data,
  onExplore,
}: {
  data: DashboardData;
  onExplore?: () => void;
}) {
  const tab = useSyncExternalStore(subscribeTab, readTab, () => modules[0]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requested = query.get("analyticsTab") ?? query.get("tab");
    if (requested && requested !== resolveAnalyticsTab(requested))
      setTab(modules[0]);
  }, []);
  return (
    <div className="analytics-workspace intelligence">
      <header>
        <div className="eyebrow">RETAIL INTELLIGENCE</div>
        <h1>Analytics Studio</h1>
        <p>{data.dataset.intelligence?.sourceLabel} · THB · Asia/Bangkok</p>
      </header>
      <nav className="module-nav" aria-label="Analytics modules">
        {visibleAnalyticsModules.map((m) => (
          <button
            key={m.id}
            aria-pressed={m.id === tab}
            onClick={() => setTab(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <div className="module-content">
        {tab === modules[0] ? (
          <StoreOverview data={data} />
        ) : tab === modules[1] ? (
          <DemandForecast data={data} />
        ) : tab === modules[2] ? (
          <SmartInventory
            data={data}
            onExplore={onExplore}
            onForecast={() => setTab(modules[1])}
          />
        ) : tab === modules[3] ? (
          <ProfitMargin data={data} />
        ) : tab === modules[4] ? (
          <WorkforcePanel data={data} onExplore={onExplore} />
        ) : tab === modules[5] ? (
          <CustomerPanel data={data} />
        ) : (
          <Review data={data} />
        )}
      </div>
    </div>
  );
}
function Review({ data }: { data: DashboardData }) {
  const s = useIntelligence(),
    snaps = s.snapshots.filter((x) => x.storeId === data.store.id),
    [id, setId] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [skuFilter, setSkuFilter] = useState("");
  const snap = snaps.find((x) => x.id === id) ?? snaps.at(-1),
    rows = snap
      ? forecastVariance(snap, data).filter(
          (r) =>
            (!from || r.date >= from) &&
            (!to || r.date <= to) &&
            (!skuFilter || r.sku === skuFilter),
        )
      : [];
  const actualRows = snap
    ? data.dataset.sales.filter((r) =>
        rows.some((f) => f.sku === r.sku && f.date === r.date),
      )
    : [];
  const actualSales = actualRows.reduce((s, r) => s + r.netSalesCents, 0) / 100,
    gp =
      actualRows.reduce((s, r) => s + r.netSalesCents - r.cogsCents, 0) / 100;
  return (
    <section>
      <h2>Performance Review</h2>
      <details>
        <summary>
          ทบทวน Actual รายวัน / สัปดาห์ / เทศกาล / Custom และเทียบช่วงก่อนหน้า
        </summary>
        <StoreOverview data={data} />
      </details>
      <div className="intel-fields">
        <label>
          เริ่มช่วง Review
          <input
            type="date"
            value={from}
            onInput={(e) => setFrom(e.currentTarget.value)}
          />
        </label>
        <label>
          สิ้นสุดช่วง Review
          <input
            type="date"
            value={to}
            onInput={(e) => setTo(e.currentTarget.value)}
          />
        </label>
        <label>
          SKU Review
          <select
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {data.catalog.products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p>
        Snapshot เก็บค่าขณะบันทึกแยกจากสมมติฐานปัจจุบัน ไม่คำนวณ Forecast
        เดิมย้อนหลังใหม่ · เลือก Daily/Weekly/Festival/Custom ใน Store Overview
        เพื่อทบทวน Actual
      </p>
      <label>
        Forecast ที่บันทึก
        <select value={snap?.id ?? ""} onChange={(e) => setId(e.target.value)}>
          {snaps.map((x) => (
            <option key={x.id} value={x.id}>
              {x.options.start} · {x.options.scenario} · {x.createdAt}{" "}
              {x.backtest ? "BACKTEST" : "Frozen forecast"}
            </option>
          ))}
        </select>
      </label>
      {!snap ? (
        <p className="empty-state">
          ยังไม่มี Snapshot · ไป Demand Forecast แล้วบันทึกก่อน
        </p>
      ) : (
        <>
          <p>
            Created {snap.createdAt} · Training cutoff {snap.options.cutoff} ·
            Dataset {snap.reference} เทียบ Active{" "}
            {data.dataset.intelligence?.reference} ·{" "}
            {snap.backtest
              ? "BACKTEST: สร้างหลังวันคาดการณ์ ไม่ใช่หลักฐาน Forecast ล่วงหน้า"
              : "Frozen forecast"}
          </p>
          <Stats
            items={[
              ["Forecast Sales THB", rows.reduce((s, r) => s + r.revenue, 0)],
              ["Actual Sales THB", actualRows.length ? actualSales : null],
              ["Actual GP THB", actualRows.length ? gp : null],
              [
                "Actual Margin %",
                actualSales ? (gp / actualSales) * 100 : null,
              ],
              ["Forecast units", rows.reduce((s, r) => s + r.quantity, 0)],
              [
                "Actual units",
                rows.some((r) => r.actualQuantity !== null)
                  ? rows.reduce((s, r) => s + (r.actualQuantity ?? 0), 0)
                  : null,
              ],
            ]}
          />
          <Chart
            rows={Array.from(new Set(rows.map((r) => r.date))).map((date) => ({
              date,
              forecast: rows
                .filter((r) => r.date === date)
                .reduce((s, r) => s + r.quantity, 0),
              actual: rows
                .filter((r) => r.date === date)
                .some((r) => r.actualQuantity === null)
                ? null
                : rows
                    .filter((r) => r.date === date)
                    .reduce((s, r) => s + r.actualQuantity!, 0),
            }))}
            keys={["forecast", "actual"]}
          />
          <button
            onClick={() => {
              const csv = safeCsv(
                [
                  "Date",
                  "SKU",
                  "Category",
                  "ForecastQuantity",
                  "ActualQuantity",
                  "Variance",
                  "VariancePct",
                  "ForecastSalesTHB",
                  "ActualSalesTHB",
                  "GrossMarginPct",
                  "ForecastID",
                  "ForecastReference",
                  "ActualReference",
                ],
                rows.map((r) => [
                  r.date,
                  r.sku,
                  data.catalog.products.find((p) => p.sku === r.sku)
                    ?.categoryId,
                  r.quantity,
                  r.actualQuantity ?? "No Data",
                  r.variance ?? "No Data",
                  r.variancePct ?? "N/A",
                  r.revenue,
                  r.actualSales ?? "No Data",
                  r.actualMargin ?? "N/A",
                  snap.id,
                  snap.reference,
                  data.dataset.intelligence?.reference,
                ]),
              );
              const url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv;charset=utf-8" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "forecast-review.csv";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Export Review CSV
          </button>
          <p>
            Variance = Actual − Forecast · Variance % = Difference / Forecast ×
            100 · Forecast = 0 แสดง N/A · ข้อมูล Actual{" "}
            {rows.filter((r) => r.actualQuantity !== null).length}/{rows.length}{" "}
            SKU-days · Snapshot ID {snap.id}
          </p>
          <Table
            headers={[
              "วันที่",
              "SKU / Category",
              "Forecast qty",
              "Actual qty",
              "Variance",
              "Variance %",
              "Gross Margin %",
              "Forecast THB",
              "Actual THB",
              "Revenue variance THB",
              "Waste units",
              "Inventory snapshot units",
              "Confirmed closing units",
            ]}
          >
            {rows.map((r) => (
              <tr key={r.date + r.sku}>
                <td>{fullDate(r.date)}</td>
                <td>
                  {r.sku} /{" "}
                  {data.catalog.products.find((p) => p.sku === r.sku)
                    ?.categoryId ?? "No Data"}
                </td>
                <td>{r.quantity}</td>
                <td>{display(r.actualQuantity)}</td>
                <td>{display(r.variance)}</td>
                <td>
                  {r.variancePct === null
                    ? "N/A"
                    : display(r.variancePct) + "%"}
                </td>
                <td>
                  {r.actualMargin === null
                    ? "N/A"
                    : display(r.actualMargin) + "%"}
                </td>
                <td>{money(r.revenue)}</td>
                <td>{money(r.actualSales)}</td>
                <td>
                  {money(
                    r.actualSales === null ? null : r.actualSales - r.revenue,
                  )}
                </td>
                <td>{display(r.wasteQuantity)}</td>
                <td>{display(r.stockSnapshot)}</td>
                <td>{display(r.closingInventory)}</td>
              </tr>
            ))}
          </Table>
          <p>
            วันที่ยังไม่มี Actual แสดง No Data · Closing และ Waste
            จริงต้องมีข้อมูล snapshot/waste ที่นำเข้า ไม่อนุมานจากยอดขาย
          </p>
        </>
      )}
    </section>
  );
}
