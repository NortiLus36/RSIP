"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import {
  comparePeriod,
  dateAdd,
  monday,
  inventoryRecommendation,
  profitScenario,
  forecastVariance,
} from "@/lib/analytics/intelligence";
import { useForecast, usePlanningSku } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { useExplorer } from "@/stores/explorer";
import { WorkforcePanel } from "./WorkforcePanel";
import { CustomerPanel } from "./CustomerPanel";
import { AnalyticsView } from "./AnalyticsView";
import { InventoryPlanner } from "./InventoryPlanner";
import { display, Field, Stats, Table, Chart } from "./IntelligenceUI";
const modules = [
  "Store Overview",
  "Demand Forecast",
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
        {modules.map((m) => (
          <button key={m} aria-pressed={m === tab} onClick={() => setTab(m)}>
            {m}
          </button>
        ))}
      </nav>
      <div className="module-content">
        {tab === modules[0] ? (
          <Overview data={data} />
        ) : tab === modules[1] ? (
          <Forecast data={data} />
        ) : tab === modules[2] ? (
          <Inventory data={data} onExplore={onExplore} />
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
function Overview({ data }: { data: DashboardData }) {
  const latest =
    data.dataset.sales
      .map((r) => r.date)
      .sort()
      .at(-1) ?? data.dataset.asOf.slice(0, 10);
  const [period, setPeriod] = useState("WTD"),
    [end, setEnd] = useState(latest),
    [start, setStart] = useState(monday(latest)),
    [prior, setPrior] = useState(dateAdd(monday(latest), -7)),
    [zone, setZone] = useState(""),
    [category, setCategory] = useState(""),
    [target, setTarget] = useState(0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(end)))
    return (
      <label>
        เลือกวันที่สิ้นสุดให้ถูกต้อง
        <input
          type="date"
          value={end}
          onInput={(e) => setEnd(e.currentTarget.value)}
        />
      </label>
    );
  const from = ["Daily", "Same weekday"].includes(period)
    ? end
    : ["WTD", "Weekly"].includes(period)
      ? monday(end)
      : period === "Festival"
        ? "2026-10-10"
        : start;
  const to =
    period === "Festival"
      ? "2026-10-18"
      : period === "Weekly"
        ? dateAdd(from, 6)
        : end;
  const previous =
    period === "Same weekday"
      ? dateAdd(end, -7)
      : period === "Daily"
        ? dateAdd(end, -1)
        : ["WTD", "Weekly"].includes(period)
          ? dateAdd(from, -7)
          : prior;
  let result: ReturnType<typeof comparePeriod> | undefined,
    error = "";
  try {
    result = comparePeriod(data, from, to, previous, zone, category);
  } catch (e) {
    error = String(e);
  }
  const oos = data.catalog.shelfInventory.filter(
      (p) =>
        (!zone ||
          data.store.fixtures.some(
            (f) => f.id === p.fixtureId && f.zoneId === zone,
          )) &&
        (!category ||
          data.catalog.products.some(
            (pr) =>
              pr.sku === p.sku &&
              (pr.categoryId === category ||
                data.catalog.categories.some(
                  (c) => c.id === pr.categoryId && c.parentId === category,
                )),
          )),
    ),
    coverage = result?.coverage ?? 0;
  return (
    <section>
      <h2>Store Overview</h2>
      <div className="intel-fields">
        <label>
          ช่วงเวลา
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {[
              "Daily",
              "Same weekday",
              "WTD",
              "Weekly",
              "Festival",
              "Custom",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          วันที่สิ้นสุด
          <input
            type="date"
            value={end}
            onInput={(e) => setEnd(e.currentTarget.value)}
          />
        </label>
        {period === "Custom" && (
          <>
            <label>
              เริ่ม
              <input
                type="date"
                value={start}
                onInput={(e) => setStart(e.currentTarget.value)}
              />
            </label>
            <label>
              เริ่มช่วงเปรียบเทียบ
              <input
                type="date"
                value={prior}
                onInput={(e) => setPrior(e.currentTarget.value)}
              />
            </label>
          </>
        )}
        <label>
          Zone
          <select
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              setCategory("");
            }}
          >
            <option value="">ทุก Zone</option>
            {data.store.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          หมวดหมู่
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {data.catalog.categories
              .filter((c) => !zone || c.zoneId === zone)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameTh}
                </option>
              ))}
          </select>
        </label>
        <Field
          label="เป้าหมายยอดขาย (ไม่บังคับ)"
          value={target}
          onChange={setTarget}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>
            {from}–{to} เทียบ {previous}–{result.priorTo} · WTD
            จันทร์–วันเดียวกันของสัปดาห์ก่อน · ข้อมูล {coverage}/
            {result.expected} วัน · เปรียบเทียบได้ {result.matched} วัน
          </p>
          <Stats
            items={[
              ["Sales THB", coverage ? result.totals.sales : null],
              ["Gross Profit THB", coverage ? result.totals.grossProfit : null],
              [
                "Gross Margin %",
                coverage && result.totals.sales
                  ? (result.totals.grossProfit / result.totals.sales) * 100
                  : null,
              ],
              ["Transactions", result.transactions],
              ["Matched-day growth %", result.change],
              [
                "OOS snapshot %",
                oos.length
                  ? (oos.filter((r) => r.shelfStock === 0).length /
                      oos.length) *
                    100
                  : null,
              ],
              [
                "Target attainment %",
                target > 0 && coverage
                  ? (result.totals.sales / target) * 100
                  : null,
              ],
            ]}
          />
          <p>
            Peak day: {result.peak?.date ?? "No Data"} · OOS เป็นสต็อกล่าสุด
            ไม่ใช่ค่าเฉลี่ยของช่วงขาย
          </p>
          <Chart rows={result.rows} keys={["actual", "previous"]} />
          <Table
            headers={["วันปัจจุบัน", "ยอดขาย", "วันเปรียบเทียบ", "ยอดขายเดิม"]}
          >
            {result.rows.map((r) => (
              <tr key={r.date}>
                <td>{r.date}</td>
                <td>{display(r.actual)}</td>
                <td>{r.previousDate}</td>
                <td>{display(r.previous)}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <details>
        <summary>Dashboard และกราฟเดิม</summary>
        <AnalyticsView dataset={data.dataset} store={data.store} />
      </details>
    </section>
  );
}
function Forecast({ data }: { data: DashboardData }) {
  const f = useForecast(data),
    [sku, setSku] = usePlanningSku(data),
    s = useIntelligence(),
    [notice, setNotice] = useState("");
  const daily = Array.from(
    { length: f.error ? 0 : f.options.horizon },
    (_, i) => {
      const date = dateAdd(f.options.start, i),
        rows = f.rows.filter((r) => r.date === date && r.sku === sku);
      return {
        date,
        quantity: rows.reduce((s, r) => s + r.quantity, 0),
        revenue: rows.reduce((s, r) => s + r.revenue, 0),
      };
    },
  );
  const save = async () => {
    try {
      if (f.error || !f.rows.length) throw new Error(f.error || "No Data");
      const now = new Date().toISOString();
      await s.save({
        snapshots: [
          ...s.snapshots,
          {
            id: crypto.randomUUID(),
            createdAt: now,
            reference: f.ref,
            storeId: data.store.id,
            options: structuredClone(f.options),
            rows: structuredClone(f.rows),
            backtest:
              f.options.start <=
              new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
          },
        ],
      });
      setNotice(
        "บันทึก Snapshot แล้ว เปิด Performance Review เพื่อเทียบ Actual",
      );
    } catch (e) {
      setNotice(String(e));
    }
  };
  return (
    <section>
      <h2>Demand Forecast</h2>
      <label>
        Forecast SKU
        <select value={sku} onChange={(e) => setSku(e.target.value)}>
          {data.catalog.products.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.nameTh}
            </option>
          ))}
        </select>
      </label>
      <p>
        กราฟและตารางแสดง SKU ที่เลือก · การบันทึก Snapshot เก็บทุก SKU ใน
        Horizon เพื่อใช้วางแผนร่วมกัน
      </p>
      <p>
        ค่าเดียวกันใช้ใน Smart Inventory, Profit และ Workforce ·
        ใช้ประวัติวันเดียวกัน 4 สัปดาห์ล่าสุด ตัดผล Calendar ออกจากอดีตก่อน
        ใส่ผลช่วงเป้าหมายเพียงครั้งเดียว
      </p>
      <div className="intel-fields">
        <label>
          Training cutoff
          <input
            type="date"
            value={f.options.cutoff}
            onInput={(e) => f.setOptions({ cutoff: e.currentTarget.value })}
          />
        </label>
        <label>
          เริ่ม Forecast
          <input
            type="date"
            value={f.options.start}
            onInput={(e) => f.setOptions({ start: e.currentTarget.value })}
          />
        </label>
        <Field
          label="จำนวนวัน (1–7)"
          min={1}
          max={7}
          value={f.options.horizon}
          onChange={(horizon) => f.setOptions({ horizon })}
        />
        <label>
          Scenario
          <select
            value={f.options.scenario}
            onChange={(e) =>
              f.setOptions({
                scenario: e.target.value as typeof f.options.scenario,
              })
            }
          >
            {["Conservative", "Expected", "Optimistic"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          ใช้สมมติฐานเอง
          <input
            type="checkbox"
            checked={f.options.manual}
            onChange={(e) => f.setOptions({ manual: e.target.checked })}
          />
        </label>
        <Field
          label="Manual units/SKU/day"
          value={f.options.baseDemand}
          onChange={(baseDemand) => f.setOptions({ baseDemand })}
        />
        <Field
          label="Weekend % (Manual เท่านั้น)"
          value={f.options.weekendPct}
          onChange={(weekendPct) => f.setOptions({ weekendPct })}
        />
        <Field
          label="Festival override % (0 = Calendar)"
          value={f.options.festivalPct}
          onChange={(festivalPct) => f.setOptions({ festivalPct })}
        />
        <Field
          label="Promotion override % (0 = Calendar)"
          value={f.options.promotionPct}
          onChange={(promotionPct) => f.setOptions({ promotionPct })}
        />
      </div>
      <p role="status">{f.error || notice}</p>
      <button disabled={s.busy || !!f.error} onClick={save}>
        บันทึก Forecast Snapshot
      </button>
      <p>
        ประวัติ weekday น้อยกว่า 2 วันใช้ Planning assumption และแสดง Manual ·
        Range ±20% เป็นสมมติฐาน ไม่ใช่ความเชื่อมั่นทางสถิติ · Forecast
        ย้อนหลังคือ Backtest
      </p>
      <Chart rows={daily} keys={["quantity"]} />
      <Table
        headers={[
          "วันที่",
          "SKU",
          "Zone",
          "Units",
          "Low–High",
          "Revenue THB",
          "ฐาน / Samples",
        ]}
      >
        {f.rows
          .filter((r) => r.sku === sku)
          .map((r) => (
            <tr key={r.date + r.sku} title={r.assumption}>
              <td>{r.date}</td>
              <td>{r.sku}</td>
              <td>{r.zoneId}</td>
              <td>{r.quantity}</td>
              <td>
                {r.low}–{r.high}
              </td>
              <td>{display(r.revenue)}</td>
              <td>
                {r.manual ? "Manual" : "History"} / {r.samples}
              </td>
            </tr>
          ))}
      </Table>
      <details>
        <summary>Business Calendar / แหล่งข้อมูล</summary>
        <p>
          วันเทศกาลกินเจ 10–18 ต.ค. 2026 ตาม{" "}
          <a
            href="https://www.tatnews.org/2026/10/thailand-celebrates-vegetarian-festival-2026-across-the-country/"
            target="_blank"
            rel="noreferrer"
          >
            TAT
          </a>{" "}
          · uplift เป็นสมมติฐานจำลอง
        </p>
        <Table headers={["Event", "เริ่ม", "สิ้นสุด", "SKU", "Uplift %"]}>
          {data.dataset.intelligence?.calendar.map((e, i) => (
            <tr key={i}>
              <td>{String(e.name)}</td>
              <td>{String(e.startDate)}</td>
              <td>{String(e.endDate)}</td>
              <td>{String(e.sku || "All")}</td>
              <td>{String(e.upliftPct)}</td>
            </tr>
          ))}
        </Table>
      </details>
    </section>
  );
}
function Inventory({
  data,
  onExplore,
}: {
  data: DashboardData;
  onExplore?: () => void;
}) {
  const f = useForecast(data),
    [review, setReview] = useState(1),
    [sku, setSku] = usePlanningSku(data),
    [fixture, setFixture] = useState("");
  let rows: NonNullable<ReturnType<typeof inventoryRecommendation>>[] = [],
    error = f.error;
  try {
    rows = data.catalog.products.flatMap((p) => {
      const r = inventoryRecommendation(data, f.rows, p.sku, review);
      return r ? [r] : [];
    });
  } catch (e) {
    error = String(e);
  }
  const placements = data.catalog.fixtureProducts.filter((p) => p.sku === sku),
    selected = placements.find((p) => p.fixtureId === fixture) ?? placements[0];
  return (
    <section>
      <h2>Smart Inventory</h2>
      <p>
        ใช้ Forecast {f.options.start} · {f.options.horizon} วัน ·{" "}
        {f.options.scenario} · พร้อมขาย = Shelf + Backroom − Reserved ·
        Protection = Lead time + Review days · Incoming นับเมื่อ ETA ทัน
      </p>
      <div className="intel-fields">
        <Field
          label="Review days"
          max={7}
          value={review}
          onChange={setReview}
        />
        <label>
          SKU
          <select
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setFixture("");
            }}
          >
            {data.catalog.products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fixture
          <select
            value={selected?.fixtureId ?? ""}
            onChange={(e) => setFixture(e.target.value)}
          >
            {placements.map((p) => (
              <option key={p.fixtureId}>{p.fixtureId}</option>
            ))}
          </select>
        </label>
        <button
          disabled={!selected}
          onClick={() => {
            if (selected)
              useExplorer.getState().selectSku(sku, selected.fixtureId);
            onExplore?.();
          }}
        >
          Focus ใน 3D
        </button>
      </div>
      <p role="alert">{error}</p>
      <Table
        headers={[
          "SKU",
          "Shelf",
          "Backroom",
          "Reserved",
          "Available",
          "Incoming ทัน",
          "Protection demand",
          "เติมชั้น",
          "สั่งเพิ่ม",
          "Closing estimate",
          "Days supply",
          "ข้อเสนอ",
        ]}
      >
        {rows.map((r) => (
          <tr key={r.sku}>
            <td>{r.sku}</td>
            {[
              r.shelfStock,
              r.backroomStock,
              r.reservedStock,
              r.availableStock,
              r.inTime,
              r.protection,
              r.replenishment,
              r.suggestedOrder,
              r.closing,
              r.daysOfSupply,
            ].map((v, i) => (
              <td key={i}>{display(v)}</td>
            ))}
            <td>
              {r.risk}
              {r.extrapolated ? " · เกิน Horizon ใช้ค่าเฉลี่ย" : null}
            </td>
          </tr>
        ))}
      </Table>
      <p>
        เติมชั้นจำกัดตาม Display Capacity และคลังพร้อมใช้ · Closing
        เป็นยอดรวมช่วง ไม่รับประกันว่า ETA จะป้องกันขาดของระหว่างวัน
      </p>
      <details>
        <summary>
          เครื่องคำนวณ Inventory เดิม / ปรับ Capacity และแผนต่อ SKU
        </summary>
        <InventoryPlanner
          dataset={data.dataset}
          items={data.inventory}
          catalog={data.catalog}
        />
      </details>
    </section>
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
    [inTime, setInTime] = useState(true);
  const product = data.catalog.products.find((p) => p.sku === sku),
    rec = inventoryRecommendation(data, f.rows, sku);
  let result: ReturnType<typeof profitScenario> | undefined,
    error = f.error;
  try {
    if (product && rec)
      result = profitScenario({
        ...v,
        price: product.sellingPrice,
        cost: product.unitCost,
        demand: rec.demand,
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
        Price {display(product?.sellingPrice)} · Cost{" "}
        {display(product?.unitCost)} · Demand {display(rec?.demand)} · Available{" "}
        {display(rec?.availableStock)} · แนะนำสั่ง{" "}
        {display(rec?.suggestedOrder)}
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
        <Overview data={data} />
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
          <Table
            headers={[
              "วันที่",
              "SKU",
              "Forecast qty",
              "Actual qty",
              "Variance",
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
                <td>{r.date}</td>
                <td>{r.sku}</td>
                <td>{r.quantity}</td>
                <td>{display(r.actualQuantity)}</td>
                <td>{display(r.variance)}</td>
                <td>{display(r.revenue)}</td>
                <td>{display(r.actualSales)}</td>
                <td>
                  {display(
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
