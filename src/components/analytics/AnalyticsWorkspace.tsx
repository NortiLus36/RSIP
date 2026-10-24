"use client";
import { StoreOverview } from "./StoreOverview";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { safeCsv } from "@/lib/import/parse";
import { fullDate, compactDate } from "@/lib/analytics/overview";
import type { DashboardData } from "@/data/providers";
import {
  dateAdd,
  inventoryRecommendation,
  profitScenario,
  forecastVariance,
} from "@/lib/analytics/intelligence";
import { useForecast, usePlanningSku } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { useExplorer } from "@/stores/explorer";
import { WorkforcePanel } from "./WorkforcePanel";
import { CustomerPanel } from "./CustomerPanel";
import { InventoryPlanner } from "./InventoryPlanner";
import { display, money, Field, Stats, Table, Chart } from "./IntelligenceUI";
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
          <StoreOverview data={data} />
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
function Forecast({ data }: { data: DashboardData }) {
  const f = useForecast(data),
    [sku, setSku] = usePlanningSku(data),
    s = useIntelligence(),
    [notice, setNotice] = useState(""),
    [category, setCategory] = useState("");
  const selectedSkus = new Set(
    data.catalog.products
      .filter((p) =>
        !category
          ? p.sku === sku
          : p.categoryId === category ||
            data.catalog.categories.some(
              (c) => c.id === p.categoryId && c.parentId === category,
            ),
      )
      .map((p) => p.sku),
  );
  const selectedRows = f.rows.filter((r) => selectedSkus.has(r.sku));
  const history = data.dataset.sales.filter(
    (r) =>
      selectedSkus.has(r.sku) &&
      r.date <= f.options.cutoff &&
      r.quantity !== undefined,
  );
  const historyDays = [...new Set(history.map((r) => r.date))]
    .sort()
    .slice(-14);
  const baseline = selectedRows.reduce((sum, r) => sum + r.baseline, 0);
  const quantity = selectedRows.reduce((sum, r) => sum + r.quantity, 0);
  const top = data.catalog.products
    .map((p) => ({
      sku: p.sku,
      name: p.nameTh,
      quantity: f.rows
        .filter((r) => r.sku === p.sku)
        .reduce((sum, r) => sum + r.quantity, 0),
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const daily = Array.from(
    { length: f.error ? 0 : f.options.horizon },
    (_, i) => {
      const date = dateAdd(f.options.start, i),
        rows = selectedRows.filter((r) => r.date === date);
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
            selectedSku: sku,
            selectedCategory: category,
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
      <label>
        Forecast Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">SKU ที่เลือก</option>
          {data.catalog.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameTh}
            </option>
          ))}
        </select>
      </label>
      <p>
        FORECAST / SCENARIO · แบบจำลองสมมติฐานจากประวัติจำกัด
        ยังไม่ผ่านการยืนยันความแม่นยำ
      </p>
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
      <Stats
        items={[
          ["Forecast units", selectedRows.length ? quantity : null],
          [
            "Forecast Revenue THB",
            selectedRows.length
              ? selectedRows.reduce((sum, r) => sum + r.revenue, 0)
              : null,
          ],
          [
            "Change vs Baseline %",
            baseline ? ((quantity - baseline) / baseline) * 100 : null,
          ],
        ]}
      />
      <h3>Historical Actual / Future Forecast · หน่วย</h3>
      <div className="intel-chart">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={[
              ...historyDays.map((date) => ({
                date,
                actual: history
                  .filter((r) => r.date === date)
                  .reduce((sum, r) => sum + r.quantity!, 0),
                forecast: null,
              })),
              ...daily.map((r) => ({
                date: r.date,
                forecast: r.quantity,
                actual: null,
              })),
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => compactDate(String(d))}
              fontSize={9}
            />
            <YAxis />
            <Tooltip labelFormatter={(d) => fullDate(String(d))} />
            <Legend />
            <Line
              dataKey="actual"
              name="Historical Actual units"
              stroke="#7b8d9d"
              connectNulls={false}
            />
            <Line
              dataKey="forecast"
              name="FORECAST units"
              stroke="#02aba4"
              strokeDasharray="5 3"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <h3>Top Forecast SKUs · ทุกหมวด</h3>
      <Table headers={["SKU", "สินค้า", "Forecast หน่วย"]}>
        {top.map((r) => (
          <tr key={r.sku}>
            <td>{r.sku}</td>
            <td>{r.name}</td>
            <td>{display(r.quantity)}</td>
          </tr>
        ))}
      </Table>
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
        {selectedRows.map((r) => (
          <tr key={r.date + r.sku} title={r.assumption}>
            <td>{fullDate(r.date)}</td>
            <td>{r.sku}</td>
            <td>{r.zoneId}</td>
            <td>{r.quantity}</td>
            <td>
              {r.low}–{r.high}
            </td>
            <td>{money(r.revenue)}</td>
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
    review = useIntelligence((state) => state.reviewDays[f.ref] ?? 1),
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
          onChange={(n) => useIntelligence.getState().setReviewDays(f.ref, n)}
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
      <p>
        FORECAST · Dataset {f.ref} · หน่วยสินค้า · ค่าคลังและชั้นอ่านจาก
        Snapshot ล่าสุด ไม่รวมหลายวัน
      </p>
      <Stats
        items={[
          ["Shelf units", rows.find((r) => r.sku === sku)?.shelfStock],
          ["Backroom units", rows.find((r) => r.sku === sku)?.backroomStock],
          [
            "Replenishment units",
            rows.find((r) => r.sku === sku)?.replenishment,
          ],
          [
            "Suggested order units",
            rows.find((r) => r.sku === sku)?.suggestedOrder,
          ],
        ]}
      />
      <p>
        {rows.find((r) => r.sku === sku)?.openingStockAssumption
          ? "SCENARIO: วันเริ่มแผนห่างจาก Snapshot สมมติสต็อกเปิดคงเดิม ไม่มีข้อมูลการเคลื่อนไหวระหว่างช่วง"
          : ""}
      </p>
      {!rows.length && (
        <p>No Data · ไม่มี Inventory ที่ใช้เป็นสต็อกเปิดของช่วง Forecast นี้</p>
      )}
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
