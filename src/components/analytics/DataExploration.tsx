"use client";
import { useState } from "react";
import type { Store } from "@/types";
import type { RetailDataset } from "@/types/analytics";
import { rowsFor, shiftDate, salesTotals } from "@/lib/analytics/selectors";
import { groupSales, type Grouping } from "@/lib/analytics/exploration";
export function DataExploration({
  dataset,
  store,
}: {
  dataset: RetailDataset;
  store: Store;
}) {
  const [group, setGroup] = useState<Grouping>("zoneId");
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [ascending, setAscending] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const rows = rowsFor(dataset, {
    zoneId: zone || undefined,
    from: weekly ? shiftDate(dataset.asOf, -6) : dataset.asOf,
    to: dataset.asOf,
  }).filter((r) =>
    `${r.sku} ${r.zoneId} ${r.fixtureId} ${r.categoryId} ${store.zones.find((z) => z.id === r.zoneId)?.nameTh ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const groups = groupSales(rows, group).sort(
    (a, b) => (ascending ? 1 : -1) * (a.salesCents - b.salesCents),
  );
  const totals = salesTotals(rows);
  const fmt = (n: number) =>
    new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
  return (
    <section>
      <div className="section-title">
        <h2>Data Exploration</h2>
        <span className="demo-badge">
          {dataset.source === "Imported" ? "IMPORTED DATA" : "DEMO"} ·
          Pivot-like
        </span>
      </div>
      <div className="analytics-filters">
        <label>
          Group By
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as Grouping)}
          >
            <option value="zoneId">Zone</option>
            <option value="categoryId">Category</option>
            <option value="sku">SKU</option>
          </select>
        </label>
        <label>
          ค้นหา
          <input
            aria-label="Search dataset"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SKU / Zone / Fixture"
          />
        </label>
        <label>
          Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {store.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.id} · {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          ช่วงเวลา
          <select
            value={weekly ? "weekly" : "daily"}
            onChange={(e) => setWeekly(e.target.value === "weekly")}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly · 7 วัน</option>
          </select>
        </label>
      </div>
      <p className="data-period">
        {weekly ? shiftDate(dataset.asOf, -6) : dataset.asOf} – {dataset.asOf} ·
        THB · เรียงตามยอดขาย
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{group}</th>
              <th>
                <button
                  onClick={() => setAscending(!ascending)}
                  aria-label="Sort sales"
                >
                  Net Sales {ascending ? "↑" : "↓"}
                </button>
              </th>
              <th>COGS</th>
              <th>Gross Profit</th>
              <th>แถวข้อมูล</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name}>
                <td>
                  {group === "zoneId"
                    ? `${g.name} · ${store.zones.find((z) => z.id === g.name)?.nameTh}`
                    : group === "categoryId"
                      ? store.zones.find((z) => z.categoryId === g.name)?.nameTh
                      : g.name}
                </td>
                <td>{fmt(g.salesCents / 100)}</td>
                <td>{fmt(g.cogsCents / 100)}</td>
                <td>{fmt((g.salesCents - g.cogsCents) / 100)}</td>
                <td>{g.rows}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>รวม {groups.length} กลุ่ม</th>
              <td>{fmt(totals.sales)}</td>
              <td>{fmt(totals.cogs)}</td>
              <td>{fmt(totals.grossProfit)}</td>
              <td>{rows.length}</td>
            </tr>
          </tfoot>
        </table>
        {!groups.length && (
          <p className="empty-state">No Data · ไม่พบแถวที่ตรงกับตัวกรอง</p>
        )}
      </div>
    </section>
  );
}
