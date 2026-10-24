import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboard } from "../src/data/providers";
import {
  demandForecast,
  inventoryRecommendation,
  profitScenario,
  forecastVariance,
} from "../src/lib/analytics/intelligence";
import {
  customerModel,
  syncCases,
  bangkokDay,
  type CaseStates,
} from "../src/lib/analytics/customer";
import { defaultOptions } from "../src/components/analytics/useForecast";
import { metricValue, metricHelp } from "../src/lib/analytics/metric-help";
import { safeCsv } from "../src/lib/import/parse";
import type { ForecastSnapshot } from "../src/types/intelligence";
const pending = loadDashboard();
test("Bangkok case day respects midnight boundary", () => {
  assert.equal(bangkokDay("2026-10-20T17:30:00Z"), "2026-10-21");
});
const action = {
  id: "a",
  zoneId: "A",
  problem: "queue",
  owner: "Staff",
  severity: 3,
  urgency: 3,
  impact: 3,
  status: "Done" as const,
  critical: "none" as const,
};
test("Action completion closes linked case once, retains timestamp and isolates dataset", () => {
  const states: CaseStates = {
    one: { c: { status: "Open", actionId: "a" } },
    two: { c: { status: "Open", actionId: "a" } },
  };
  const out = syncCases(states, { one: [action] }, "2026-10-21T10:00:00Z");
  assert.equal(out.one.c.status, "Done");
  assert.equal(out.two.c.status, "Open");
  assert.equal(
    syncCases(out, { one: [action] }, "later").one.c.resolvedAt,
    "2026-10-21T10:00:00Z",
  );
  assert.equal(states.one.c.status, "Open");
});
test("Reopening action clears resolved time", () => {
  const out = syncCases(
    { one: { c: { status: "Done", resolvedAt: "old", actionId: "a" } } },
    { one: [{ ...action, status: "In progress" }] },
    "now",
  );
  assert.equal(out.one.c.resolvedAt, undefined);
  assert.equal(out.one.c.status, "In progress");
});
test("Customer cases filter date/zone, do not add aggregate complaints, CSAT uses surveys only", async () => {
  const d = structuredClone(await pending);
  d.dataset.intelligence!.feedback = [
    {
      caseId: "x",
      dateTime: "2026-10-21T10:00:00+07:00",
      zoneId: "A",
      category: "Queue",
      severity: 3,
      description: "Synthetic",
      status: "Done",
      resolvedAt: "2026-10-21T12:00:00+07:00",
    },
    {
      caseId: "y",
      dateTime: "2026-10-22T10:00:00+07:00",
      zoneId: "B",
      category: "Pricing",
      severity: 2,
      description: "Synthetic",
      status: "Open",
    },
  ];
  const m = customerModel(d, [], {}, "2026-10-21", "2026-10-21", "A");
  assert.equal(m.count, 1);
  assert.equal(m.resolved, 1);
  assert.equal(m.resolutionRate, 100);
  assert.equal(m.hours, 2);
  assert.equal(m.csat, null);
  assert.equal(m.categories[0].date, "Queue");
  assert.equal(m.rate, 1000 / m.transactions!);
});
test("Missing complaint evidence and out of range filters stay No Data", async () => {
  const d = structuredClone(await pending);
  d.dataset.intelligence!.feedback = [];
  assert.equal(
    customerModel(d, [], {}, "2026-10-01", "2026-10-25", "").count,
    null,
  );
  assert.equal(
    customerModel(d, [], {}, "2026-11-01", "2026-11-02", "").rate,
    null,
  );
});
test("Quick Reports use dataset reference, not reports from another import", async () => {
  const d = await pending;
  const base = {
    id: "r",
    createdAt: "2026-10-21T10:00:00+07:00",
    zoneId: "A",
    sku: "x",
    fixtureId: "x",
    count: 0,
    replenished: 0,
    category: "Shelf OOS",
    note: "",
    status: "Pending" as const,
  };
  assert.equal(
    customerModel(
      d,
      [{ ...base, reference: "other" }],
      {},
      "2026-10-01",
      "2026-10-25",
      "",
    ).count,
    null,
  );
  assert.equal(
    customerModel(
      d,
      [{ ...base, reference: d.dataset.intelligence!.reference }],
      {},
      "2026-10-01",
      "2026-10-25",
      "",
    ).count,
    1,
  );
});
test("Incoming uses absolute snapshot ETA when forecast is delayed", async () => {
  const d = structuredClone(await pending),
    sku = d.catalog.products[0].sku;
  d.catalog.stockLocations
    .filter((r) => r.sku === sku)
    .forEach((r) => {
      r.updatedAt = "2026-10-25T00:00:00+07:00";
      r.incomingStock = 20;
      r.incomingArrivalDays = 4;
      r.incomingBatches = [{ quantity: 20, arrivalDays: 4 }];
    });
  const opts = { ...defaultOptions(d), start: "2026-10-29", horizon: 1 };
  const r = inventoryRecommendation(d, demandForecast(d, opts), sku)!;
  assert.equal(r.eligibleHorizon, 20);
  assert.equal(r.openingStockAssumption, true);
});
test("Later inventory snapshot cannot leak into earlier backtest opening stock", async () => {
  const d = await pending,
    rows = demandForecast(d, {
      ...defaultOptions(d),
      cutoff: "2026-10-20",
      start: "2026-10-21",
    });
  assert.equal(
    inventoryRecommendation(d, rows, d.catalog.products[0].sku),
    null,
  );
});
test("Zero demand has N/A days supply and finite closing", async () => {
  const d = await pending,
    sku = d.catalog.products[0].sku,
    rows = demandForecast(d, {
      ...defaultOptions(d),
      manual: true,
      baseDemand: 0,
    });
  const r = inventoryRecommendation(d, rows, sku)!;
  assert.equal(r.daysOfSupply, null);
  assert.ok(Number.isFinite(r.closing));
});
const input = {
  price: 100,
  cost: 60,
  demand: 10,
  available: 100,
  order: 10,
  discount: 0,
  uplift: 0,
  labor: 0,
  campaign: 0,
  wasteUnits: 0,
  other: 0,
  orderInTime: true,
};
test("Scenario price/cost/demand changes outputs without investment counted in contribution twice", () => {
  const b = profitScenario(input),
    c = profitScenario({ ...input, cost: 70, labor: 20 });
  assert.equal(b.investment, 600);
  assert.equal(b.cogs, 600);
  assert.equal(c.grossProfit, 300);
  assert.equal(c.contribution, 280);
  assert.equal(profitScenario({ ...input, demand: 20 }).revenue, 2000);
  assert.equal(profitScenario({ ...input, price: 80 }).revenue, 800);
});
test("Cost scenario leaves historical transaction COGS untouched", async () => {
  const d = await pending,
    before = d.dataset.sales.reduce((s, r) => s + r.cogsCents, 0);
  profitScenario({ ...input, cost: 150 });
  assert.equal(
    d.dataset.sales.reduce((s, r) => s + r.cogsCents, 0),
    before,
  );
});
test("Snapshot review adds variance %, weighted row margin, preserves frozen rows", async () => {
  const d = await pending,
    opts = {
      ...defaultOptions(d),
      cutoff: "2026-10-20",
      start: "2026-10-21",
      horizon: 1,
    };
  const snap: ForecastSnapshot = {
    id: "f",
    createdAt: "2026-10-20T00:00:00Z",
    storeId: d.store.id,
    reference: "frozen-reference",
    options: opts,
    rows: demandForecast(d, opts),
    backtest: false,
  };
  const before = JSON.stringify(snap);
  const r = forecastVariance(snap, d)[0];
  assert.equal(r.variancePct, (r.variance! / r.quantity) * 100);
  const actual = d.dataset.sales.filter(
    (x) => x.sku === r.sku && x.date === r.date,
  );
  const expectedMargin =
    (actual.reduce((s, x) => s + x.netSalesCents - x.cogsCents, 0) /
      actual.reduce((s, x) => s + x.netSalesCents, 0)) *
    100;
  assert.ok(Math.abs(r.actualMargin! - expectedMargin) < 1e-9);
  assert.equal(JSON.stringify(snap), before);
});
test("Zero forecast variance denominator returns N/A rather than infinity", async () => {
  const d = await pending,
    options = defaultOptions(d),
    snap: ForecastSnapshot = {
      id: "f",
      createdAt: "",
      reference: "",
      storeId: d.store.id,
      options,
      backtest: true,
      rows: demandForecast(d, {
        ...options,
        manual: true,
        baseDemand: 0,
        start: "2026-10-21",
        cutoff: "2026-10-20",
        horizon: 1,
      }),
    };
  assert.equal(forecastVariance(snap, d)[0].variancePct, null);
});
test("Metric formatting uses cents/percent, finite values and formula help", () => {
  assert.equal(metricValue("Sales THB", 1234), "฿1,234.00");
  assert.equal(metricValue("Margin %", 12.3), "12.30%");
  assert.equal(metricValue("units", Infinity), "No Data");
  assert.match(metricHelp("Suggested order units").formula, /Incoming/);
  assert.match(metricHelp("Contribution THB").formula, /Waste/);
});
test("Review CSV escapes untrusted spreadsheet formula text", () => {
  assert.match(safeCsv(["SKU"], [["=SUM(1,2)"]]), /\'=SUM/);
});

import { applyApprovedReports } from "../src/lib/analytics/operations";
import { overviewModel } from "../src/lib/analytics/overview";
test("Approved staff count reaches Overview dated OOS without mutating imported raw snapshot", async () => {
  const d = await pending,
    sku = d.catalog.products[0].sku,
    pos = d.catalog.shelfInventory.find((p) => p.sku === sku)!;
  const updated = applyApprovedReports(d, [
    {
      id: "audit-report",
      reference: d.dataset.intelligence!.reference,
      createdAt: "2026-10-25T00:01:00+07:00",
      reviewedAt: "2026-10-25T00:02:00+07:00",
      zoneId: "A",
      sku,
      fixtureId: pos.fixtureId,
      count: 5,
      replenished: 5,
      category: "Shelf OOS",
      note: "Synthetic",
      status: "Approved",
    },
  ]);
  assert.equal(
    d.dataset.intelligence!.inventory.find(
      (r) => r.sku === sku && r.snapshotDate === "2026-10-25",
    )!.shelfStock,
    0,
  );
  assert.equal(
    updated.dataset.intelligence!.inventory.find(
      (r) => r.sku === sku && r.snapshotDate === "2026-10-25",
    )!.shelfStock,
    5,
  );
  const filters = {
    mode: "Daily" as const,
    date: "2026-10-25",
    start: "2026-10-25",
    end: "2026-10-25",
    comparison: "previous" as const,
    comparisonStart: "",
    event: "",
    zone: "",
    category: "",
    target: 0,
  };
  assert.ok(
    overviewModel(updated, filters).oos! < overviewModel(d, filters).oos!,
  );
  assert.deepEqual(updated.dataset.sales, d.dataset.sales);
  const rec = inventoryRecommendation(
    updated,
    demandForecast(updated, defaultOptions(updated)),
    sku,
  )!;
  assert.equal(rec.stockDate, "2026-10-25");
});

import "fake-indexeddb/auto";
import { writeSaved } from "../src/lib/import/persistence";
import { useDataSource } from "../src/stores/data-source";
test("Reload preserves optional columns present only in later imported feedback rows", async () => {
  const d = await pending;
  const rows: import("../src/lib/import/types").DataRow[] = [
    {
      caseId: "a",
      dateTime: "2026-10-23T12:00:00+07:00",
      zoneId: "A",
      category: "Queue",
      severity: 2,
      description: "Synthetic",
      status: "Open",
    },
    {
      caseId: "b",
      dateTime: "2026-10-23T13:00:00+07:00",
      zoneId: "L",
      category: "Queue",
      severity: 2,
      description: "Synthetic",
      status: "Done",
      resolvedAt: "2026-10-23T15:00:00+07:00",
    },
  ];
  await writeSaved({
    version: 1,
    source: "imported",
    bundle: {
      feedback: {
        rows,
        fileName: "audit.csv",
        importedAt: "2026-10-25T00:00:00Z",
      },
    },
  });
  useDataSource.setState({
    hydrated: false,
    busy: false,
    error: "",
    bundle: {},
    source: "demo",
  });
  await useDataSource.getState().hydrate(d);
  assert.equal(useDataSource.getState().error, "");
  assert.equal(useDataSource.getState().source, "imported");
  assert.equal(
    useDataSource.getState().bundle.feedback!.rows[1].resolvedAt,
    "2026-10-23T15:00:00+07:00",
  );
});
