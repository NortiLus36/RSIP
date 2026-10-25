"use client";
import { StoreOverview } from "./StoreOverview";
import { DemandForecast } from "./DemandForecast";
import { useState } from "react";
import { safeCsv } from "@/lib/import/parse";
import { fullDate } from "@/lib/analytics/overview";
import type { DashboardData } from "@/data/providers";
import {
  dateAdd,
  inventoryRecommendation,
  profitScenario,
  forecastVariance,
} from "@/lib/analytics/intelligence";
import { useForecast, usePlanningSku } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { WorkforcePanel } from "./WorkforcePanel";
import { CustomerPanel } from "./CustomerPanel";
import { SmartInventory } from "./SmartInventory";
import { display, money, Field, Stats, Table, Chart } from "./IntelligenceUI";
const moduleLabels = [
  "ภาพรวมผลการดำเนินงาน",
  "คาดการณ์ความต้องการสินค้า",
  "วางแผนสินค้าคงคลัง",
  "วิเคราะห์ต้นทุนและกำไร",
  "วิเคราะห์ช่วงเวลาเร่งด่วนและกำลังคน",
  "ประสบการณ์และปัญหาลูกค้า",
  "สรุปและประเมินผลการดำเนินงาน",
];
const modules = [
  "Store Overview",
  "คาดการณ์ความต้องการสินค้า",
  "Smart Inventory",
  "Profit & Margin",
  "Peak Time & Workforce",
  "Customer Experience",
  "Performance Review",
];
export function AnalyticsWorkspace({
  data,
  onExplore,
}: {
  data: DashboardData;
  onExplore?: () => void;
}) {
  const [tab, setTab] = useState(modules[0]);
  return (
    <div className="analytics-workspace intelligence">
      <header>
        <div className="eyebrow">RETAIL INTELLIGENCE</div>
        <h1>Analytics Studio</h1>
        <p>{data.dataset.intelligence?.sourceLabel} · THB · Asia/Bangkok</p>
      </header>
      <nav className="module-nav" aria-label="Analytics modules">
        {modules.map((m, i) => (
          <button key={m} aria-pressed={m === tab} onClick={() => setTab(m)}>
            {moduleLabels[i]}
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
          <Profit data={data} />
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
function Profit({ data }: { data: DashboardData }) {
  const f = useForecast(data),
    [sku, setSku] = usePlanningSku(data),
    [v, setV] = useState({
      discount: 0,
      uplift: 0,
      labor: 0,
      campaign: 0,
      wasteUnits: 0,
      other: 0,
      order: 0,
    }),
    [inTime, setInTime] = useState(true),
    [overrides, setOverrides] = useState<
      Record<string, { price?: number; cost?: number; demand?: number }>
    >({});
  const product = data.catalog.products.find((p) => p.sku === sku);
  let rec: ReturnType<typeof inventoryRecommendation> = null,
    error = f.error;
  try {
    rec = inventoryRecommendation(
      data,
      f.rows,
      sku,
      useIntelligence.getState().reviewDays[f.ref] ?? 1,
      undefined,
      useIntelligence.getState().planningAssumptions[f.ref]?.[sku],
    );
  } catch (e) {
    error = String(e);
  }
  const input = {
    price: product?.sellingPrice ?? NaN,
    cost: product?.unitCost ?? NaN,
    demand: rec?.demand ?? NaN,
    ...overrides[sku],
  };
  let result: ReturnType<typeof profitScenario> | undefined;
  try {
    if (product && rec)
      result = profitScenario({
        ...v,
        ...input,
        available: rec.availableStock + rec.eligibleHorizon,
        orderInTime: inTime,
      });
  } catch (e) {
    error = String(e);
  }
  return (
    <section>
      <h2>Profit & Margin</h2>
      <p>
        Scenario แยกจาก Actual · ใช้ Forecast และราคาทุนจาก Active Dataset ·
        ไม่เกินสินค้าที่มีและคำสั่งซื้อที่มาทัน
      </p>
      <div className="intel-fields">
        <label>
          SKU
          <select value={sku} onChange={(e) => setSku(e.target.value)}>
            {data.catalog.products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh}
              </option>
            ))}
          </select>
        </label>
        {(["price", "cost", "demand"] as const).map((k) => (
          <Field
            key={k}
            label={
              {
                price: "Scenario Selling Price THB",
                cost: "Scenario Unit Cost THB",
                demand: "Scenario Forecast units",
              }[k]
            }
            value={input[k]}
            onChange={(n) =>
              setOverrides({
                ...overrides,
                [sku]: { ...overrides[sku], [k]: n },
              })
            }
          />
        ))}
        <button onClick={() => setOverrides({ ...overrides, [sku]: {} })}>
          คืนราคา / ทุน / Demand จาก Dataset
        </button>
        {Object.entries({
          order: "สั่งเพิ่ม units",
          discount: "ส่วนลด %",
          uplift: "Demand เพิ่มจาก Forecast %",
          labor: "ค่าแรงเพิ่ม THB",
          campaign: "Campaign THB",
          wasteUnits: "Waste units",
          other: "ต้นทุนอื่น THB",
        }).map(([k, label]) => (
          <Field
            key={k}
            label={label}
            value={v[k as keyof typeof v]}
            max={k === "discount" ? 100 : 1e9}
            onChange={(n) => setV({ ...v, [k]: n })}
          />
        ))}
        <label>
          คำสั่งซื้อทัน Horizon
          <input
            type="checkbox"
            checked={inTime}
            onChange={(e) => setInTime(e.target.checked)}
          />
        </label>
      </div>
      <p>
        FORECAST Reference: {f.ref} · {f.options.start} · {f.options.horizon}{" "}
        วัน · {f.options.scenario} · ค่าแรงเพิ่มกรอกเป็น SCENARIO
        แยกจากตารางเวรจริง
      </p>
      <button
        onClick={() => {
          const zoneId = data.catalog.categories.find(
            (c) => c.id === product?.categoryId,
          )?.zoneId;
          const tasks = useIntelligence
            .getState()
            .tasks.filter(
              (t) =>
                t.reference === f.ref &&
                t.zoneId === zoneId &&
                t.date >= f.options.start &&
                t.date <= dateAdd(f.options.start, f.options.horizon - 1) &&
                t.status !== "Done",
            );
          setV({
            ...v,
            labor: tasks.reduce((sum, t) => sum + (t.laborCost ?? 0), 0),
          });
        }}
      >
        ใช้ค่าแรงเพิ่มจากงาน Workforce ช่วง / Zone นี้
      </button>
      {!rec && (
        <p>No Data · ต้องมี Inventory ที่ใช้เป็นสต็อกเปิดของช่วง Forecast</p>
      )}
      <p>
        Price {money(product?.sellingPrice)} · Cost {money(product?.unitCost)} ·
        Demand {display(rec?.demand)} · Available {display(rec?.availableStock)}{" "}
        · แนะนำสั่ง {display(rec?.suggestedOrder)}
      </p>
      <p role="alert">{error}</p>
      <button
        disabled={!rec}
        onClick={() => setV({ ...v, order: rec?.suggestedOrder ?? 0 })}
      >
        ใช้จำนวนสั่งเพิ่มจาก Smart Inventory
      </button>
      {result && (
        <>
          <Stats
            items={Object.entries(result).map(
              ([k, v]) => [profitLabels[k] ?? k, v] as [string, number | null],
            )}
          />
          <Table headers={["Metric", "Baseline", "SCENARIO"]}>
            <tr>
              <td>Gross Margin %</td>
              <td>
                {input.price
                  ? display(((input.price - input.cost) / input.price) * 100) +
                    "%"
                  : "N/A · Revenue = 0"}
              </td>
              <td>
                {result.margin === null
                  ? "N/A · Revenue = 0"
                  : display(result.margin) + "%"}
              </td>
            </tr>
            <tr>
              <td>Contribution THB</td>
              <td>{money(result.baseline)}</td>
              <td>{money(result.contribution)}</td>
            </tr>
          </Table>
          <Chart
            rows={[
              { date: "Baseline", contribution: result.baseline },
              { date: "Scenario", contribution: result.contribution },
            ]}
            keys={["contribution"]}
          />
          <p>
            Stock investment = จำนวนสั่ง × ทุน แยกจาก COGS = จำนวนขาย × ทุน ·
            Contribution = GP − Waste − ค่าใช้จ่ายเพิ่ม · Break-even
            เป็นความต้องการเชิงทฤษฎี อาจเกิน Supply
          </p>
        </>
      )}
    </section>
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

const profitLabels: Record<string, string> = {
  sold: "ขายได้ units",
  desired: "Demand หลัง Uplift",
  revenue: "ยอดขาย THB",
  cogs: "ต้นทุนที่ขาย THB",
  grossProfit: "กำไรขั้นต้น THB",
  margin: "Gross Margin %",
  investment: "เงินซื้อสต็อกเพิ่ม THB",
  closing: "สินค้าคงเหลือ units",
  wasteLoss: "มูลค่า Waste THB",
  contribution: "Contribution THB",
  baseline: "Baseline contribution THB",
  incremental: "Incremental contribution THB",
  breakEvenQuantity: "ยอดขายคุ้มทุน units",
  breakEvenUplift: "Uplift คุ้มทุน %",
};
