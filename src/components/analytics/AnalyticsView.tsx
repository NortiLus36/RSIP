"use client";
import { useMemo, useState } from "react";
import type { Store } from "@/types";
import type { RetailDataset, AnalyticsFilter } from "@/types/analytics";
import { KPIFieldHeader } from "./KPIFieldHeader";
import {
  currentRows,
  salesTotals,
  categoryChart,
  trendChart,
  shiftDate,
  rowsFor,
} from "@/lib/analytics/selectors";
import {
  SalesTrendChart,
  CategoryComparisonChart,
  CompositionChart,
} from "./Charts";
export function KPIStatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <article className="analytics-stat">
      <KPIFieldHeader label={label} />
      <strong>
        {value === null
          ? "N/A"
          : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
              value,
            )}{" "}
        <small>{unit}</small>
      </strong>
    </article>
  );
}
export function AnalyticsView({
  dataset,
  store,
  fixedFilter,
}: {
  dataset: RetailDataset;
  store: Store;
  fixedFilter?: AnalyticsFilter;
}) {
  const [weekly, setWeekly] = useState(false);
  const [zone, setZone] = useState("");
  const [category, setCategory] = useState("");
  const [fixture, setFixture] = useState("");
  const filter = useMemo(
    () =>
      fixedFilter ?? {
        zoneId: zone || undefined,
        categoryId: category || undefined,
        fixtureId: fixture || undefined,
      },
    [fixedFilter, zone, category, fixture],
  );
  const rows = currentRows(dataset, filter, weekly);
  const totals = salesTotals(rows);
  const compared = categoryChart(rows, store);
  const trend = rowsFor(dataset, filter).length
    ? trendChart(dataset, filter, weekly)
    : [];
  return (
    <section className="analytics-view">
      <div className="analytics-filters">
        <label>
          ช่วงเวลา
          <select
            value={weekly ? "weekly" : "daily"}
            onChange={(e) => setWeekly(e.target.value === "weekly")}
          >
            <option value="daily">Daily · วันล่าสุด</option>
            <option value="weekly">Weekly · 7 วันล่าสุด</option>
          </select>
        </label>
        {!fixedFilter && (
          <>
            <label>
              Zone
              <select
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value);
                  setFixture("");
                }}
              >
                <option value="">ทุก Zone</option>
                {store.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} · {z.nameTh}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setFixture("");
                }}
              >
                <option value="">ทุกหมวดสินค้า</option>
                {store.zones.map((z) => (
                  <option key={z.categoryId} value={z.categoryId}>
                    {z.nameTh}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fixture
              <select
                value={fixture}
                onChange={(e) => setFixture(e.target.value)}
              >
                <option value="">ทุก Fixture</option>
                {store.fixtures
                  .filter(
                    (f) =>
                      (!zone || f.zoneId === zone) &&
                      (!category ||
                        `category-${f.zoneId.toLowerCase()}` === category),
                  )
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · {f.id}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
      </div>
      <p className="data-period">
        DEMO · THB · {weekly ? shiftDate(dataset.asOf, -6) : dataset.asOf} –{" "}
        {dataset.asOf} · {rows.length} แถวข้อมูล
      </p>
      <div className="analytics-stats">
        <KPIStatCard
          label="ยอดขายสุทธิ"
          value={rows.length ? totals.sales : null}
          unit="บาท"
        />
        <KPIStatCard
          label="กำไรขั้นต้น"
          value={rows.length ? totals.grossProfit : null}
          unit="บาท"
        />
        <KPIStatCard
          label="อัตรากำไรขั้นต้น"
          value={
            totals.sales ? (totals.grossProfit / totals.sales) * 100 : null
          }
          unit="%"
        />
      </div>
      <div className="chart-card">
        <h3>
          <KPIFieldHeader
            label="แนวโน้มยอดขาย · ข้อมูลย้อนหลัง"
            topic="trend"
          />
        </h3>
        <p>
          {weekly ? "สองช่วง ช่วงละ 7 วัน" : "รายวันย้อนหลัง 14 วัน"} ·
          กราฟนี้แสดงประวัติ ขอบเขตเวลาต่างจาก KPI เมื่อเลือกวันล่าสุด
        </p>
        <SalesTrendChart data={trend} />
      </div>
      <div className="chart-columns">
        <div className="chart-card">
          <h3>
            <KPIFieldHeader label="ยอดขายแยกตามหมวดสินค้า" topic="category" />
          </h3>
          <CategoryComparisonChart data={compared} />
        </div>
        <div className="chart-card">
          <h3>
            <KPIFieldHeader
              label="สัดส่วนยอดขายตามหมวดสินค้า"
              topic="composition"
            />
          </h3>
          <CompositionChart data={compared} />
        </div>
      </div>
    </section>
  );
}
