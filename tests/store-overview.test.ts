import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "fake-indexeddb/auto";
import { loadDashboard } from "../src/data/providers";
import {
  overviewModel,
  overviewPeriods,
  festivals,
  type OverviewFilters,
  fullDate,
} from "../src/lib/analytics/overview";
import { weekday } from "../src/lib/analytics/intelligence";
import {
  StoreOverview,
  OverviewLabel,
} from "../src/components/analytics/StoreOverview";
import { useDataSource } from "../src/stores/data-source";
import { scenarioBundle } from "../src/lib/import/templates";
import { ImportedDataProvider } from "../src/lib/import/provider";
const demoPromise = loadDashboard();
const filters = (patch: Partial<OverviewFilters> = {}): OverviewFilters => ({
  mode: "WTD",
  date: "2026-10-24",
  start: "2026-10-19",
  end: "2026-10-24",
  comparison: "previous",
  comparisonStart: "",
  event: "",
  zone: "",
  category: "",
  target: 0,
  ...patch,
});
test("October default demo has 25 synthetic days, unique transaction IDs and reconciled raw cents", async () => {
  const d = await demoPromise;
  assert.equal(d.dataset.asOf, "2026-10-25");
  assert.equal(new Set(d.dataset.sales.map((r) => r.date)).size, 25);
  assert.equal(d.dataset.sales.map((r) => r.date).sort()[0], "2026-10-01");
  assert.ok(d.dataset.intelligence!.sourceLabel.includes("ไม่ใช่ยอดขายจริง"));
  assert.ok(
    d.dataset.intelligence!.sales.some((r) =>
      String(r.transactionDateTime).startsWith("2026-10-25"),
    ),
  );
  const raw = d.dataset.intelligence!.sales;
  assert.equal(new Set(raw.map((r) => r.transactionId)).size, raw.length);
  assert.equal(
    raw.reduce((s, r) => s + Math.round(Number(r.netSalesAmount) * 100), 0),
    d.dataset.sales.reduce((s, r) => s + r.netSalesCents, 0),
  );
  assert.equal(
    new Set(d.dataset.intelligence!.inventory.map((r) => r.snapshotDate)).size,
    25,
  );
  assert.equal(d.spatial.zones.length, 25 * 15 * 14);
});
test("WTD selects 19–24 vs 12–17 with six matching weekdays and reconciled growth", async () => {
  const d = await demoPromise,
    m = overviewModel(d, filters());
  assert.deepEqual(
    [
      m.periods.from,
      m.periods.to,
      m.periods.previous[0],
      m.periods.previous.at(-1),
    ],
    ["2026-10-19", "2026-10-24", "2026-10-12", "2026-10-17"],
  );
  assert.equal(m.matched, 6);
  m.rows.forEach((r) =>
    assert.equal(weekday(r.date), weekday(r.previousDate!)),
  );
  assert.equal(
    m.growth,
    ((m.matchedCurrent - m.matchedPrevious) / m.matchedPrevious) * 100,
  );
  assert.equal(m.coverage, 6);
  assert.equal(m.previousCoverage, 6);
});
test("Same Weekday compares Wed21 with Wed14 and includes real dates in Thai", async () => {
  const m = overviewModel(
    await demoPromise,
    filters({ mode: "Same weekday", date: "2026-10-21" }),
  );
  assert.equal(m.rows.length, 1);
  assert.equal(m.rows[0].previousDate, "2026-10-14");
  assert.ok(fullDate(m.rows[0].date).includes("วันพุธ"));
  assert.equal(m.oneDay, false);
  assert.ok(fullDate(m.rows[0].previousDate!).includes("2569"));
  assert.ok(m.rows[0].previousFestival);
  assert.notEqual(m.current.sales, m.previous.sales);
});
test("Daily20 vs19 changes sales instead of always displaying the latest day", async () => {
  const d = await demoPromise,
    m = overviewModel(d, filters({ mode: "Daily", date: "2026-10-20" }));
  assert.deepEqual(
    [m.periods.current, m.periods.previous],
    [["2026-10-20"], ["2026-10-19"]],
  );
  assert.equal(
    m.current.sales,
    d.dataset.sales
      .filter((r) => r.date === "2026-10-20")
      .reduce((s, r) => s + r.netSalesCents, 0) / 100,
  );
});
test("Weekly chooses Monday19–Sunday25 and compares Monday12–Sunday18", async () => {
  const m = overviewModel(
    await demoPromise,
    filters({ mode: "Weekly", date: "2026-10-22" }),
  );
  assert.equal(m.expected, 7);
  assert.equal(m.periods.to, "2026-10-25");
  assert.equal(m.periods.previous.at(-1), "2026-10-18");
  assert.equal(m.partial, false);
});
test("Partial Week excludes missing current weekend from matched growth", async () => {
  const d = structuredClone(await demoPromise);
  d.dataset.sales = d.dataset.sales.filter((r) => r.date <= "2026-10-23");
  const m = overviewModel(d, filters({ mode: "Weekly" }));
  assert.equal(m.partial, true);
  assert.equal(m.coverage, 5);
  assert.equal(m.previousCoverage, 7);
  assert.equal(m.matched, 5);
  assert.equal(m.rows.at(-1)!.actual, null);
  assert.equal(
    m.matchedPrevious,
    m.rows.slice(0, 5).reduce((s, r) => s + r.previous!, 0),
  );
});
test("One-day imported data has missing comparison rather than invented zero or demo trends", async () => {
  const d = await demoPromise,
    imported = new ImportedDataProvider(
      d,
      scenarioBundle("oos", d),
    ).getDashboard(),
    m = overviewModel(imported, filters({ date: "2026-10-23" }));
  assert.equal(m.coverage, 1);
  assert.equal(m.oneDay, true);
  assert.equal(m.previousCoverage, 0);
  assert.equal(m.growth, null);
  assert.equal(m.difference, null);
  assert.ok(m.rows.every((r) => r.previous === null));
  assert.equal(m.current.sales, 200);
});
test("Festival calendar pairs nine equal weekday normal days, excludes events and never reuses dates", async () => {
  const d = await demoPromise,
    m = overviewModel(d, filters({ mode: "Festival" }));
  assert.equal(m.periods.from, "2026-10-10");
  assert.equal(m.periods.to, "2026-10-18");
  assert.equal(m.expected, 9);
  assert.equal(m.matched, 9);
  assert.equal(new Set(m.periods.previous).size, 9);
  m.rows.forEach((r) => {
    assert.equal(weekday(r.date), weekday(r.previousDate!));
    assert.ok(
      !d.dataset.intelligence!.calendar.some(
        (e) =>
          String(e.startDate) <= r.previousDate! &&
          String(e.endDate) >= r.previousDate!,
      ),
    );
  });
  assert.equal(festivals(d.dataset.intelligence!.calendar).length, 1);
  assert.ok(m.categories.length > 0);
});
test("Insufficient festival baseline remains No Data with matched coverage", async () => {
  const d = structuredClone(await demoPromise);
  d.dataset.sales = d.dataset.sales.filter(
    (r) => r.date >= "2026-10-10" && r.date <= "2026-10-18",
  );
  const m = overviewModel(d, filters({ mode: "Festival" }));
  assert.equal(m.coverage, 9);
  assert.equal(m.previousCoverage, 0);
  assert.equal(m.growth, null);
  assert.ok(m.periods.previous.every((d) => d === null));
});
test("Custom previous period has equal length; invalid range/manual comparator rejected", async () => {
  const d = await demoPromise,
    f = filters({ mode: "Custom", start: "2026-10-20", end: "2026-10-23" }),
    p = overviewPeriods(d, f);
  assert.deepEqual(p.previous, [
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
    "2026-10-19",
  ]);
  assert.throws(() => overviewPeriods(d, { ...f, start: "2026-10-24" }));
  assert.throws(() =>
    overviewPeriods(d, { ...f, comparison: "custom", comparisonStart: "" }),
  );
  assert.equal(
    overviewPeriods(d, {
      ...f,
      comparison: "custom",
      comparisonStart: "2026-10-02",
    }).previous.at(-1),
    "2026-10-05",
  );
});
test("Gross margin is weighted totals, transaction IDs deduplicated across SKU lines", async () => {
  const d = structuredClone(await demoPromise),
    base = d.dataset.sales[0];
  d.dataset.sales = [
    {
      ...base,
      date: "2026-10-20",
      transactionId: "one-basket",
      netSalesCents: 10000,
      cogsCents: 2000,
    },
    {
      ...base,
      sku: d.catalog.products[1].sku,
      date: "2026-10-20",
      transactionId: "one-basket",
      netSalesCents: 90000,
      cogsCents: 81000,
    },
  ];
  const m = overviewModel(d, filters({ mode: "Daily", date: "2026-10-20" }));
  assert.equal(m.current.margin, 17);
  assert.equal(m.current.transactions, 1);
  assert.equal(m.current.grossProfit, 170);
});
test("Zero sales denominator, zero target and missing stock are explicit No Data", async () => {
  const d = structuredClone(await demoPromise);
  d.dataset.sales = d.dataset.sales.map((r) => ({
    ...r,
    netSalesCents: 0,
    cogsCents: 0,
  }));
  const m = overviewModel(
    d,
    filters({ date: "2026-10-26", mode: "Daily", target: 0 }),
  );
  assert.equal(m.current.margin, null);
  assert.equal(m.growth, null);
  assert.equal(m.targetAchievement, null);
  assert.equal(m.oos, null);
});
test("Shared zone/category/date/target filters drive every metric and zone chart together", async () => {
  const d = await demoPromise,
    all = overviewModel(d, filters()),
    z = overviewModel(d, filters({ zone: "A", target: 100000 })),
    cat = d.catalog.products[0].categoryId,
    c = overviewModel(d, filters({ zone: "A", category: cat }));
  assert.ok(z.current.sales < all.current.sales);
  assert.ok(c.current.sales < z.current.sales);
  assert.equal(z.zones.length, 1);
  assert.equal(z.zones[0].sales, z.current.sales);
  assert.equal(z.targetAchievement, (z.current.sales / 100000) * 100);
  assert.ok(
    z.rows.every(
      (r) => r.current?.sales === null || r.actual === r.current?.sales,
    ),
  );
});
test("OOS uses exact selected snapshot date instead of latest shelf values", async () => {
  const d = await demoPromise,
    old = overviewModel(d, filters({ mode: "Daily", date: "2026-10-21" })),
    latest = overviewModel(d, filters({ mode: "Daily", date: "2026-10-25" }));
  assert.equal(old.oos, 0);
  assert.ok(latest.oos! > 0);
  assert.equal(old.stockDate, "2026-10-21");
  const no = structuredClone(d);
  no.dataset.intelligence!.inventory = [];
  assert.equal(overviewModel(no, filters()).oos, null);
});
test("Activating 25-day demo preserves imported bundle and can return to unchanged imported KPIs", async () => {
  const d = await demoPromise,
    bundle = scenarioBundle("oos", d),
    saved = structuredClone(bundle);
  await useDataSource.getState().save("imported", bundle);
  await useDataSource.getState().save("demo", useDataSource.getState().bundle);
  assert.equal(useDataSource.getState().source, "demo");
  assert.deepEqual(useDataSource.getState().bundle, saved);
  assert.equal(d.dataset.asOf, "2026-10-25");
  await useDataSource
    .getState()
    .save("imported", useDataSource.getState().bundle);
  const m = new ImportedDataProvider(
    d,
    useDataSource.getState().bundle,
  ).getDashboard();
  assert.equal(m.dataset.source, "Imported");
  assert.equal(
    m.dataset.sales.reduce((s, r) => s + r.netSalesCents, 0) / 100,
    200,
  );
  assert.deepEqual(useDataSource.getState().bundle, saved);
});
test("Info control renders with KPI label in one wrapper, keyboard-native button and accessible dialog name", () => {
  const html = renderToStaticMarkup(
    createElement(OverviewLabel, { title: "Net Sales", topic: "sales" }),
  );
  assert.match(
    html,
    /<div class="overview-label"><span>Net Sales<\/span><button/,
  );
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="ข้อมูล Net Sales"/);
  assert.match(html, /aria-haspopup="dialog"/);
});
test("Store Overview has one shared filter set and no duplicate legacy dashboard", async () => {
  const html = renderToStaticMarkup(
    createElement(StoreOverview, { data: await demoPromise }),
  );
  assert.equal((html.match(/Store Overview dashboard/g) ?? []).length, 1);
  assert.ok(!html.includes("Dashboard และกราฟเดิม"));
  assert.equal((html.match(/>ช่วงเวลา</g) ?? []).length, 1);
  assert.ok(html.includes("ใช้ Demo ตุลาคม 2569"));
  assert.ok(html.includes("Comparison Period"));
  assert.ok(html.includes("Daily Sales Comparison"));
  assert.ok(html.includes("Sales by Zone"));
});
