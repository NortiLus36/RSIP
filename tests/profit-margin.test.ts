import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadDashboard } from "../src/data/providers";
import { defaultOptions } from "../src/components/analytics/useForecast";
import {
  demandForecast,
  profitScenario,
} from "../src/lib/analytics/intelligence";
import {
  profitSource,
  profitStock,
  matchingLabor,
  matchingWaste,
} from "../src/lib/analytics/profit-context";
import {
  analyticsModules,
  visibleAnalyticsModules,
  resolveAnalyticsTab,
} from "../src/config/analytics-modules";
import { AnalyticsWorkspace } from "../src/components/analytics/AnalyticsWorkspace";
import { ProfitMargin } from "../src/components/analytics/ProfitMargin";
const pending = loadDashboard();
test("Waste defaults use only matching SKU and dates, without changing imported rows", async () => {
  const d = structuredClone(await pending);
  d.dataset.intelligence!.waste = [
    { sku: "s", date: "2026-10-26", quantity: 2 },
    { sku: "s", date: "2026-10-27", quantity: 3 },
    { sku: "other", date: "2026-10-26", quantity: 100 },
    { sku: "s", date: "2026-11-10", quantity: 100 },
  ];
  const before = JSON.stringify(d);
  assert.equal(matchingWaste(d, "s", "2026-10-26", "2026-11-01"), 5);
  assert.equal(JSON.stringify(d), before);
});
const base = {
  price: 68,
  cost: 53.72,
  demand: 100,
  available: null,
  order: 0,
  discount: 0,
  uplift: 0,
  labor: 0,
  campaign: 0,
  wasteUnits: 0,
  other: 0,
  orderInTime: false,
  constrainStock: false,
};
test("68 baht, 53.72 cost, 2 percent discount yields 66.64 price, 12.92 unit GP and 19.39 margin", () => {
  const r = profitScenario({ ...base, discount: 2 });
  assert.ok(Math.abs(r.effectivePrice - 66.64) < 1e-9);
  assert.ok(Math.abs(r.unitProfit - 12.92) < 1e-9);
  assert.equal(r.margin!.toFixed(2), "19.39");
});
test("Missing inventory still computes financial scenario without claiming investment or closing", () => {
  const r = profitScenario(base);
  assert.equal(r.revenue, 6800);
  assert.equal(r.margin!.toFixed(2), "21.00");
  assert.equal(r.sellable, null);
  assert.equal(r.closing, null);
  assert.equal(r.investment, null);
});
test("Discount, cost, quantity update revenue/COGS/profit independently", () => {
  const r = profitScenario(base);
  assert.ok(profitScenario({ ...base, discount: 10 }).margin! < r.margin!);
  assert.equal(profitScenario({ ...base, cost: 60 }).cogs, 6000);
  assert.equal(profitScenario({ ...base, demand: 200 }).revenue, 13600);
  assert.equal(
    profitScenario({ ...base, demand: 200 }).grossProfit,
    r.grossProfit * 2,
  );
});
test("Labor/campaign/other reduce contribution only; purchase investment is not expensed twice", () => {
  const r = profitScenario({
    ...base,
    available: 100,
    order: 100,
    labor: 100,
    campaign: 50,
    other: 10,
  });
  assert.equal(r.grossProfit, profitScenario(base).grossProfit);
  assert.equal(r.contribution, r.grossProfit - 160);
  assert.equal(r.investment, 5372);
  assert.equal(r.cogs, 5372);
});
test("Unconstrained financial scenario separates demand from stock, waste and timely purchase", () => {
  const r = profitScenario({
    ...base,
    available: 20,
    order: 10,
    wasteUnits: 5,
    orderInTime: false,
  });
  assert.equal(r.sold, 100);
  assert.equal(r.sellable, 15);
  assert.equal(r.shortfall, 85);
  assert.equal(r.closing, 0);
  assert.equal(r.contribution, r.grossProfit - 5 * base.cost);
  const timely = profitScenario({
    ...base,
    available: 20,
    order: 10,
    wasteUnits: 5,
    orderInTime: true,
  });
  assert.equal(timely.sellable, 25);
});
test("Uplift is explicit and discount alone never invents extra quantity", () => {
  assert.equal(profitScenario({ ...base, discount: 20 }).desired, 100);
  assert.equal(profitScenario({ ...base, uplift: 20 }).desired, 120);
});
test("Zero revenue has N/A margin; losses remain signed; invalid numbers rejected", () => {
  assert.equal(profitScenario({ ...base, demand: 0 }).margin, null);
  assert.equal(profitScenario({ ...base, discount: 100 }).margin, null);
  assert.ok(profitScenario({ ...base, cost: 100 }).grossProfit < 0);
  for (const patch of [
    { price: NaN },
    { discount: 101 },
    { cost: -1 },
    { demand: Infinity },
    { order: NaN },
  ])
    assert.throws(() => profitScenario({ ...base, ...patch }));
  assert.ok(
    profitScenario({ ...base, baselineContribution: -100 })
      .breakEvenQuantity! >= 0,
  );
});
test("SKU source changes master price/cost and isolates forecast quantities and dates", async () => {
  const d = await pending,
    o = defaultOptions(d),
    rows = demandForecast(d, o),
    a = d.catalog.products[0],
    b = d.catalog.products[1];
  const x = profitSource(d, rows, a.sku, o),
    y = profitSource(d, rows, b.sku, o);
  assert.notEqual(x.product!.sellingPrice, y.product!.sellingPrice);
  assert.notEqual(x.product!.unitCost, y.product!.unitCost);
  assert.ok(y.rows.every((r) => r.sku === b.sku));
  assert.equal(
    y.quantity,
    rows.filter((r) => r.sku === b.sku).reduce((n, r) => n + r.quantity, 0),
  );
  assert.notEqual(x.forecastReference, y.forecastReference);
  assert.equal(
    profitSource(d, rows, b.sku, { ...o, start: "2030-01-01" }).quantity,
    null,
  );
});
test("No forecast or partial horizon stays missing; explicit manual quantity still works", async () => {
  const d = await pending,
    o = defaultOptions(d),
    sku = d.catalog.products[0].sku,
    rows = demandForecast(d, o);
  assert.equal(profitSource(d, [], sku, o).quantity, null);
  assert.equal(
    profitSource(
      d,
      rows.filter((r) => r.date !== o.start),
      sku,
      o,
    ).quantity,
    null,
  );
  assert.equal(profitScenario({ ...base, demand: 12 }).revenue, 816);
});
test("Invalid Review Days is confined to stock validation and does not block basic profit", async () => {
  const d = await pending,
    o = defaultOptions(d),
    rows = demandForecast(d, o),
    sku = d.catalog.products[0].sku;
  for (const review of [NaN, 8, -1]) {
    const s = profitStock(d, rows, sku, review);
    assert.equal(s.plan, null);
    assert.match(s.warning, /กำไรพื้นฐานยังคำนวณได้/);
    assert.equal(profitScenario(base).revenue, 6800);
  }
  const clone = structuredClone(d);
  clone.catalog.shelfInventory = [];
  assert.equal(profitStock(clone, rows, sku, 1).plan, null);
  assert.equal(profitScenario(base).revenue, 6800);
});
test("Scenario/reset inputs never mutate active product, historical sales or forecast", async () => {
  const d = await pending,
    o = defaultOptions(d),
    rows = demandForecast(d, o),
    before = JSON.stringify(d),
    beforeRows = JSON.stringify(rows),
    p = d.catalog.products[0];
  profitScenario({ ...base, price: 1, cost: 2, discount: 50 });
  const reset = profitSource(d, rows, p.sku, o);
  assert.equal(reset.product!.sellingPrice, p.sellingPrice);
  assert.equal(JSON.stringify(d), before);
  assert.equal(JSON.stringify(rows), beforeRows);
});
test("Matching labor excludes other SKU, other datasets, completed, inventory and wrong date tasks", () => {
  const task = {
    id: "t",
    actionId: "a",
    reference: "r",
    sku: "s",
    date: "2026-10-26",
    hour: 8,
    zoneId: "A",
    role: "Staff",
    priority: "Standby" as const,
    status: "Open" as const,
    reason: "x",
    laborCost: 10,
  };
  assert.equal(
    matchingLabor(
      [
        task,
        { ...task, sku: "other" },
        { ...task, reference: "other" },
        { ...task, date: "2026-11-10" },
        { ...task, status: "Done" },
        { ...task, taskType: "Replenishment" },
      ],
      "r",
      "s",
      "2026-10-26",
      "2026-11-01",
    ),
    10,
  );
});
test("Four visible tabs retain all seven IDs and hidden/invalid saved IDs safely resolve to overview", () => {
  assert.equal(visibleAnalyticsModules.length, 4);
  assert.equal(analyticsModules.length, 7);
  for (const m of analyticsModules.slice(4))
    assert.equal(resolveAnalyticsTab(m.id), "Store Overview");
  assert.equal(resolveAnalyticsTab("unknown"), "Store Overview");
  assert.equal(resolveAnalyticsTab("Profit & Margin"), "Profit & Margin");
});
test("Server UI renders four navigation buttons, Thai profit heading, inline help and collapsed advanced settings", async () => {
  const d = await pending,
    workspace = renderToStaticMarkup(
      createElement(AnalyticsWorkspace, { data: d }),
    ),
    nav = workspace.match(
      /<nav[^>]+aria-label="Analytics modules"[^>]*>(.*?)<\/nav>/s,
    )![1];
  assert.equal((nav.match(/<button/g) ?? []).length, 4);
  assert.doesNotMatch(nav, /วิเคราะห์ช่วงเวลาเร่งด่วนและกำลังคน/);
  const html = renderToStaticMarkup(createElement(ProfitMargin, { data: d }));
  assert.match(html, /<h2>วิเคราะห์ต้นทุนและกำไร<\/h2>/);
  assert.match(html, /class="profit-label"/);
  assert.match(html, /aria-label="ข้อมูล ยอดขายคาดการณ์"/);
  assert.match(html, /<details class="profit-advanced">/);
  assert.doesNotMatch(html, /<details[^>]*open/);
});
