"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DashboardData } from "@/data/providers";
import {
  overviewModel,
  overviewModes,
  festivals,
  fullDate,
  compactDate,
  type OverviewFilters,
} from "@/lib/analytics/overview";
import { monday } from "@/lib/analytics/intelligence";
import { useDataSource } from "@/stores/data-source";
import { KPIInfoPopover } from "./KPIInfoPopover";
import type { HelpTopic } from "@/config/kpi-help";
import { metricValue } from "@/lib/analytics/metric-help";
import { display, money, Table } from "./IntelligenceUI";
const help = (
  title: string,
  formula: string,
  definition: string,
): HelpTopic => ({
  title,
  formula,
  definition,
  inputs: "ข้อมูลจาก Active Dataset ตามตัวกรองชุดเดียวกัน · THB · Asia/Bangkok",
  interpretation: "อ่านช่วงวันที่และ Coverage ควบคู่กับตัวเลข",
  example: formula,
  advice: "ตรวจวันที่ขาดและช่วงเปรียบเทียบก่อนตัดสินใจ",
  caution: "No Data ไม่ใช่ 0 · Demo เป็นข้อมูลสังเคราะห์ ไม่ใช่ยอดขายจริง",
});
export const overviewHelp = {
  sales: help(
    "Net Sales",
    "Σ Net Sales Amount หลังหักส่วนลด",
    "ยอดขายสุทธิของรายการขายในช่วงปัจจุบันตามนิยาม Dataset",
  ),
  gp: help(
    "Gross Profit",
    "Σ Net Sales − Σ COGS",
    "กำไรขั้นต้นก่อนค่าใช้จ่ายดำเนินงาน",
  ),
  margin: help(
    "Gross Margin %",
    "Σ Gross Profit / Σ Net Sales × 100",
    "คำนวณจากยอดรวม ไม่เฉลี่ยเปอร์เซ็นต์รายวัน ยอดขายเป็นศูนย์แสดง No Data",
  ),
  transactions: help(
    "Transactions",
    "COUNT DISTINCT Transaction ID",
    "นับ Transaction ID ไม่ซ้ำในช่วงที่เลือก หลังกรอง Zone/Category ไม่ใช่จำนวนบรรทัด SKU",
  ),
  growth: help(
    "Sales Growth % — Matched Days",
    "(Current Matched Sales − Previous Matched Sales) / Previous Matched Sales × 100",
    "ใช้เฉพาะวันที่มีข้อมูลทั้งคู่ ตัวหารศูนย์หรือไม่มีคู่ = No Data",
  ),
  oos: help(
    "Shelf OOS Rate",
    "ตำแหน่ง SKU + Fixture ที่ Shelf Stock = 0 / ตำแหน่งที่ตรวจ × 100",
    "ใช้ Inventory Snapshot ตรงวันที่สิ้นสุดของช่วงที่เลือกเท่านั้น ไม่ใช้สต็อกล่าสุดแทนย้อนหลัง และไม่เฉลี่ยเปอร์เซ็นต์รายวัน",
  ),
  target: help(
    "Target Achievement %",
    "Current Net Sales / Sales Target × 100",
    "เป้าหมายสำหรับช่วงปัจจุบันตามตัวกรองที่เลือก ไม่ระบุเป้าหมายหรือเป้าหมายเป็นศูนย์ = No Data",
  ),
  comparison: help(
    "การเปรียบเทียบยอดขาย",
    "จับคู่วัน → รวม Matched Sales → คำนวณ Difference / Growth",
    "Teal = ช่วงปัจจุบัน, Gray = ช่วงเปรียบเทียบ Tooltip แสดงวันที่จริง GP และ Transactions; ขาดข้อมูลเว้นว่างเป็น No Data",
  ),
  zones: help(
    "Sales by Zone",
    "Σ Net Sales ของ SKU ในแต่ละ Zone ตามช่วงปัจจุบัน",
    "ใช้ช่วงเวลาและตัวกรองเดียวกับ KPI ไม่ใช้ค่าจาก Dashboard อีกชุด",
  ),
  peak: help(
    "Peak Sales Day",
    "วันที่มี Net Sales สูงสุดในช่วงปัจจุบัน",
    "คำนวณจากวันที่มีข้อมูลจริงใน Active Dataset; ถ้าเสมอกันเลือกวันแรก",
  ),
};
export function OverviewLabel({
  title,
  topic,
}: {
  title: string;
  topic: keyof typeof overviewHelp;
}) {
  return (
    <div className="overview-label">
      <span>{title}</span>
      <KPIInfoPopover topic={topic} helpOverride={overviewHelp[topic]} />
    </div>
  );
}
function periodText(dates: (string | null)[], nonContinuous = false) {
  const known = dates.filter((d): d is string => !!d);
  if (!known.length) return "No comparable normal days";
  return nonContinuous
    ? known.map(compactDate).join(" · ")
    : known.length === 1
      ? fullDate(known[0])
      : `${fullDate(known[0])} – ${fullDate(known.at(-1)!)}`;
}
type Model = ReturnType<typeof overviewModel>;
type Point = {
  label: string;
  actual: number | null;
  previous: number | null;
  current: Model["rows"][number]["current"];
  prior: Model["rows"][number]["prior"];
  date: string | null;
  previousDate: string | null;
  festival: string;
  previousFestival: string;
};
function SalesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="overview-tooltip">
      {[
        [p.date, p.current, "ช่วงปัจจุบัน", p.festival],
        [p.previousDate, p.prior, "ช่วงเปรียบเทียบ", p.previousFestival],
      ].map(([date, summary, title, festival], i) => {
        const s = summary as Point["current"];
        return date ? (
          <div key={i}>
            <strong>
              {String(title)} · {fullDate(String(date))}
            </strong>
            {festival && <p>{String(festival)}</p>}
            <p>Net Sales: {metricValue("Sales THB", s?.sales)} THB</p>
            <p>Gross Profit: {metricValue("GP THB", s?.grossProfit)} THB</p>
            <p>Transactions: {display(s?.transactions)}</p>
          </div>
        ) : null;
      })}
    </div>
  );
}
function ComparisonChart({
  model,
  mode,
}: {
  model: Model;
  mode: OverviewFilters["mode"];
}) {
  const single = mode === "Daily" || mode === "Same weekday",
    first = model.rows[0];
  const points: Point[] = single
    ? [
        {
          ...first,
          label: compactDate(first.date),
          previous: null,
          prior: null,
          previousDate: null,
        },
        {
          ...first,
          label: first.previousDate
            ? compactDate(first.previousDate)
            : "No Data",
          date: null,
          actual: null,
          current: null,
        },
      ]
    : model.rows.map((r) => ({
        ...r,
        label: ["WTD", "Weekly"].includes(mode) ? r.label : compactDate(r.date),
      }));
  return (
    <div
      className="overview-chart"
      role="img"
      aria-label="Daily Sales Comparison"
    >
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={points}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" fontSize={11} />
          <YAxis fontSize={10} width={65} />
          <Tooltip content={<SalesTooltip />} />
          <Legend />
          <Bar
            dataKey="actual"
            name={single ? "วันที่เลือก" : "ช่วงปัจจุบัน"}
            fill="#02ABA4"
          />
          <Bar
            dataKey="previous"
            name={
              mode === "Same weekday"
                ? "วันเดียวกันของสัปดาห์ก่อน"
                : single
                  ? "วันก่อนหน้า"
                  : "ช่วงเปรียบเทียบ"
            }
            fill="#94a3b8"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function StoreOverview({ data }: { data: DashboardData }) {
  const state = useDataSource(),
    events = festivals(data.dataset.intelligence?.calendar ?? []),
    latest =
      data.dataset.sales
        .map((r) => r.date)
        .sort()
        .at(-1) ?? data.dataset.asOf.slice(0, 10);
  const [f, setF] = useState<OverviewFilters>({
      mode: "WTD",
      date: latest,
      start: monday(latest),
      end: latest,
      comparison: "previous",
      comparisonStart: "",
      event: events[0]?.id ?? "",
      zone: "",
      category: "",
      target: 0,
    }),
    [notice, setNotice] = useState("");
  const update = (p: Partial<OverviewFilters>) => setF((s) => ({ ...s, ...p }));
  let m: Model | undefined,
    error = "";
  try {
    m = overviewModel(data, f);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const activate = async (source: "demo" | "imported") => {
    try {
      await useDataSource
        .getState()
        .save(source, useDataSource.getState().bundle);
      setNotice(
        source === "demo"
          ? "ใช้ Demo ตุลาคม 2569 แล้ว ข้อมูลนำเข้าเดิมยังอยู่"
          : "กลับข้อมูลนำเข้าเดิมแล้ว",
      );
    } catch (e) {
      setNotice(String(e));
    }
  };
  const currentTitle = m ? periodText(m.periods.current) : "—",
    previousTitle = m
      ? periodText(m.periods.previous, m.periods.nonContinuous)
      : "—";
  return (
    <section className="store-overview" aria-label="Store Overview dashboard">
      <header className="overview-heading">
        <h2>Store Overview</h2>
      </header>
      <div className="overview-source">
        <p>
          <strong>
            {data.dataset.source === "Imported"
              ? "IMPORTED DATA"
              : "SYNTHETIC DEMO DATA"}
          </strong>{" "}
          · {new Set(data.dataset.sales.map((r) => r.date)).size}{" "}
          วันขายที่มีข้อมูล{" "}
          {data.dataset.source === "Imported"
            ? "· ข้อมูลที่ไม่ได้นำเข้าแสดง No Data"
            : "· 1–25 ต.ค. 2569 รวมวันที่ 25 เป็นข้อมูลจำลอง ไม่ใช่ยอดขายจริงที่เกิดขึ้นแล้ว"}
        </p>
        <div>
          <button
            disabled={state.busy || !state.hydrated}
            onClick={() => void activate("demo")}
          >
            ใช้ Demo ตุลาคม 2569
          </button>
          <button
            disabled={
              state.busy || !state.hydrated || !Object.keys(state.bundle).length
            }
            onClick={() => void activate("imported")}
          >
            กลับไปใช้ Imported Dataset
          </button>
        </div>
        <p>สลับแหล่งข้อมูลทั้งระบบ ไม่ลบหรือเขียนทับไฟล์นำเข้าที่บันทึกไว้</p>
        <span role="status">{notice}</span>
      </div>
      <p>
        Active Filters: {f.zone || "All Zones"} ·{" "}
        {f.category || "All Categories"}
      </p>
      <button onClick={() => setF({ ...f, zone: "", category: "", target: 0 })}>
        Reset Filters
      </button>
      <div className="intel-fields overview-filters">
        <label>
          ช่วงเวลา
          <select
            value={f.mode}
            onChange={(e) =>
              update({ mode: e.target.value as OverviewFilters["mode"] })
            }
          >
            {overviewModes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        {!["Festival", "Custom"].includes(f.mode) && (
          <label>
            {f.mode === "Weekly"
              ? "เลือกวันในสัปดาห์"
              : "วันที่เลือก / สิ้นสุดช่วง"}
            <input
              type="date"
              value={f.date}
              onInput={(e) => update({ date: e.currentTarget.value })}
            />
          </label>
        )}
        {f.mode === "Festival" && (
          <label>
            เทศกาลจาก Event Calendar
            <select
              value={f.event}
              onChange={(e) => update({ event: e.target.value })}
            >
              {!events.length && <option value="">No Event Calendar</option>}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} · {ev.start}–{ev.end}
                </option>
              ))}
            </select>
          </label>
        )}
        {f.mode === "Custom" && (
          <>
            <label>
              Start Date
              <input
                type="date"
                value={f.start}
                onInput={(e) => update({ start: e.currentTarget.value })}
              />
            </label>
            <label>
              End Date
              <input
                type="date"
                value={f.end}
                onInput={(e) => update({ end: e.currentTarget.value })}
              />
            </label>
            <label>
              Custom Comparison
              <select
                value={f.comparison}
                onChange={(e) =>
                  update({
                    comparison: e.target.value as OverviewFilters["comparison"],
                  })
                }
              >
                <option value="previous">Previous Equal-length Period</option>
                <option value="custom">กำหนดวันเริ่มเปรียบเทียบ</option>
              </select>
            </label>
            {f.comparison === "custom" && (
              <label>
                Comparison Start Date
                <input
                  type="date"
                  value={f.comparisonStart}
                  onInput={(e) =>
                    update({ comparisonStart: e.currentTarget.value })
                  }
                />
              </label>
            )}
          </>
        )}
        <label>
          Zone
          <select
            value={f.zone}
            onChange={(e) => update({ zone: e.target.value, category: "" })}
          >
            <option value="">ทุก Zone</option>
            {data.store.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nameTh}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={f.category}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">ทุกหมวดหมู่</option>
            {data.catalog.categories
              .filter((c) => !f.zone || c.zoneId === f.zone)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameTh}
                </option>
              ))}
          </select>
        </label>
        <label>
          Sales Target (THB / ช่วงปัจจุบัน)
          <input
            type="number"
            min={0}
            value={Number.isFinite(f.target) ? f.target : ""}
            onChange={(e) =>
              update({
                target: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="overview-warning">
          {error}
        </p>
      )}
      {m && (
        <>
          <section
            className="overview-comparison"
            aria-label="Comparison summary"
          >
            <h3>{f.mode} · Comparison Summary</h3>
            <div className="overview-periods">
              <div>
                <span className="overview-key current" />{" "}
                <strong>Current Period</strong>
                <p>{currentTitle}</p>
                <p>
                  Data Coverage: {m.coverage}/{m.expected} วัน
                </p>
                <b>
                  Current Sales: {money(m.coverage ? m.current.sales : null)}{" "}
                  THB
                </b>
              </div>
              <div>
                <span className="overview-key previous" />{" "}
                <strong>Comparison Period / Previous Period</strong>
                <p>{previousTitle}</p>
                <p>
                  Data Coverage: {m.previousCoverage}/{m.expected} วัน
                </p>
                <b>
                  Previous Sales:{" "}
                  {money(m.previousCoverage ? m.previous.sales : null)} THB
                </b>
              </div>
            </div>
            <p>
              {f.mode === "Same weekday"
                ? `${currentTitle} เทียบกับ ${previousTitle}`
                : f.mode === "Weekly"
                  ? "สัปดาห์จันทร์–อาทิตย์ เทียบสัปดาห์ก่อน"
                  : f.mode === "WTD"
                    ? "จันทร์ถึงวันที่เลือก เทียบจันทร์ถึงวันเดียวกันของสัปดาห์ก่อน"
                    : f.mode === "Festival"
                      ? "Comparable Normal Days: วันประเภทเดียวกัน จำนวนวันเท่ากัน เลือกวันที่ใกล้ที่สุดนอก Calendar events และไม่ใช้วันซ้ำ (อาจไม่ต่อเนื่อง ใช้ทบทวนย้อนหลัง)"
                      : "ช่วงเปรียบเทียบจำนวนวันเท่ากัน"}
            </p>
            <p>
              <strong>
                Matched Days: {m.matched}/{m.expected}
              </strong>{" "}
              · Current Matched Sales{" "}
              {money(m.matched ? m.matchedCurrent : null)} / Previous Matched
              Sales {money(m.matched ? m.matchedPrevious : null)} THB ·
              Difference {money(m.difference)} THB · Growth{" "}
              {metricValue("%", m.growth)}
            </p>
            {m.partial && (
              <p className="overview-warning">
                {f.mode === "Weekly" ? "Partial Week" : "Partial Period"} ·
                คำนวณ Growth เฉพาะวันที่มีข้อมูลทั้งคู่ วันที่ขาดเป็น No Data
              </p>
            )}
            {m.oneDay && (
              <p className="overview-warning">
                One-day Data · แสดงข้อมูลเพียงวันเดียว ไม่อ้างว่าเป็นแนวโน้ม
              </p>
            )}
          </section>
          <div className="intel-stats overview-kpis">
            {(
              [
                [
                  "Net Sales",
                  "sales",
                  m.coverage ? m.current.sales : null,
                  "THB",
                ],
                [
                  "Gross Profit",
                  "gp",
                  m.coverage ? m.current.grossProfit : null,
                  "THB",
                ],
                [
                  "Gross Margin",
                  "margin",
                  m.coverage ? m.current.margin : null,
                  "%",
                ],
                [
                  "Transactions",
                  "transactions",
                  m.current.transactions,
                  "รายการ",
                ],
                ["Sales Growth · Matched Days", "growth", m.growth, "%"],
                ["Shelf OOS Rate", "oos", m.oos, "%"],
                ["Target Achievement", "target", m.targetAchievement, "%"],
              ] as const
            ).map(([title, topic, value, unit]) => (
              <article key={topic}>
                <OverviewLabel title={title} topic={topic} />
                <strong>
                  {unit === "THB" ? (
                    metricValue("THB", value)
                  ) : unit === "%" ? (
                    metricValue("%", value)
                  ) : (
                    <>
                      {display(value)}{" "}
                      <small>{value === null ? "" : unit}</small>
                    </>
                  )}
                </strong>
                {topic === "oos" && (
                  <p>
                    Snapshot {m.stockDate} · {m.stockPositions} ตำแหน่งที่ตรวจ
                  </p>
                )}
              </article>
            ))}
          </div>
          <section className="overview-chart-card">
            <OverviewLabel
              title="Daily Sales Comparison · Net Sales (THB)"
              topic="comparison"
            />
            <p>
              {currentTitle}
              <br />
              เทียบ {previousTitle}
            </p>
            <ComparisonChart model={m} mode={f.mode} />
            <Table
              headers={[
                "วันที่เลือก",
                "Net Sales THB",
                "วันที่เปรียบเทียบ",
                "Net Sales THB",
              ]}
            >
              {m.rows.map((r) => (
                <tr key={r.date}>
                  <td>
                    {fullDate(r.date)}
                    {r.festival && <small> · {r.festival}</small>}
                  </td>
                  <td>{metricValue("Sales THB", r.actual)}</td>
                  <td>
                    {r.previousDate
                      ? fullDate(r.previousDate)
                      : "No normal day available"}
                    {r.previousFestival && (
                      <small> · {r.previousFestival}</small>
                    )}
                  </td>
                  <td>{metricValue("Sales THB", r.previous)}</td>
                </tr>
              ))}
            </Table>
          </section>
          <div className="overview-lower">
            <section className="overview-chart-card">
              <OverviewLabel title="Sales by Zone · THB" topic="zones" />
              {m.coverage ? (
                <div
                  className="overview-chart"
                  role="img"
                  aria-label="Sales by Zone"
                >
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart
                      data={m.zones.map((z) => ({
                        ...z,
                        sales: z.covered ? z.sales : null,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={10} />
                      <YAxis
                        type="category"
                        dataKey="date"
                        width={115}
                        fontSize={10}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="sales"
                        name="Net Sales THB"
                        fill="#02ABA4"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p>No Data ในช่วงและตัวกรองที่เลือก</p>
              )}
            </section>
            <section className="overview-chart-card">
              <OverviewLabel title="Peak Sales Day" topic="peak" />
              <p>{m.peak ? fullDate(m.peak.date) : "No Data"}</p>
              <strong className="overview-peak">
                {metricValue("Sales THB", m.peak?.actual)} THB
              </strong>
              {f.mode === "Festival" && (
                <>
                  <h3>Festival vs Normal</h3>
                  <p>Matched Sales Difference: {money(m.difference)} THB</p>
                  <p>
                    Gross Margin Difference: {display(m.marginDifference)}{" "}
                    percentage points
                  </p>
                  <h3>Top Performing Categories · Festival</h3>
                  <ol>
                    {m.categories.slice(0, 5).map((c) => (
                      <li key={c.id}>
                        {c.name}: {money(c.sales)} THB
                      </li>
                    ))}
                  </ol>
                  <p>
                    Normal days เป็น benchmark ที่จับคู่ weekday
                    ไม่ใช่ข้อพิสูจน์ผลเชิงสาเหตุของเทศกาล หากวันปกติไม่พอแสดง
                    Coverage และ No Data
                  </p>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
