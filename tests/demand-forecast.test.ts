import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { loadDashboard } from "../src/data/providers";
import {
  demandForecast,
  targetEventFactor,
  inventoryRecommendation,
  profitScenario,
} from "../src/lib/analytics/intelligence";
import { forecastSpatial } from "../src/lib/analytics/workforce";
import { defaultOptions } from "../src/components/analytics/useForecast";
import {
  forecastView,
  scopeForSku,
  scopeProducts,
  forecastSnapshot,
} from "../src/lib/analytics/forecast-view";
import { ImportedDataProvider } from "../src/lib/import/provider";
import { readWorkflow, writeWorkflow } from "../src/lib/import/persistence";
const pending = loadDashboard();
test("Default starts after usable historical sales, excludes missing quantities and invalid dates", async () => {
  const d = structuredClone(await pending);
  d.dataset.sales.push(
    { ...d.dataset.sales[0], date: "2026-11-10", quantity: undefined },
    { ...d.dataset.sales[0], date: "2026-99-99", quantity: 10 },
  );
  const o = defaultOptions(d);
  assert.equal(o.cutoff, "2026-10-25");
  assert.equal(o.start, "2026-10-26");
  assert.equal(o.horizon, 7);
  assert.equal(o.scenario, "Expected");
  assert.equal(o.festivalMode, "calendar");
});
test("Category changes offer only related active products, SKU handoff chooses its real root", async () => {
  const d = await pending;
  const dry = scopeProducts(d, { categoryId: "category-a", sku: "" });
  const root = d.catalog.categories.find(
    (c) => c.zoneId === "A" && !c.parentId,
  )!;
  const fresh = d.catalog.categories.find(
    (c) => c.zoneId === "C" && !c.parentId,
  )!;
  assert.ok(dry.length > 0);
  assert.ok(dry.every((p) => scopeForSku(d, p.sku).categoryId === root.id));
  const freshRows = scopeProducts(d, { categoryId: fresh.id, sku: "" });
  assert.ok(
    freshRows.every((p) => scopeForSku(d, p.sku).categoryId === fresh.id),
  );
  assert.throws(
    () => scopeProducts(d, { categoryId: fresh.id, sku: dry[0].sku }),
    /ไม่อยู่ในหมวด/,
  );
});
test("Unmapped SKU fails explicitly instead of silently using another category", async () => {
  const d = structuredClone(await pending);
  d.catalog.products[0].categoryId = "missing";
  assert.throws(() => scopeForSku(d, d.catalog.products[0].sku), /Unmapped/);
  assert.throws(() => demandForecast(d, defaultOptions(d)), /Unmapped/);
});
test("Store, category and SKU scope reconcile chart, daily details, top ranking and totals", async () => {
  const d = await pending,
    o = defaultOptions(d),
    rows = demandForecast(d, o);
  const all = forecastView(d, rows, o, { categoryId: "", sku: "" });
  assert.equal(
    all.rows.length,
    d.catalog.products.filter((p) => p.active).length * 7,
  );
  const scope = scopeForSku(d, d.catalog.products[0].sku);
  const category = forecastView(d, rows, o, {
    categoryId: scope.categoryId,
    sku: "",
  });
  const single = forecastView(d, rows, o, scope);
  assert.ok(
    category.rows.every(
      (r) => scopeForSku(d, r.sku).categoryId === scope.categoryId,
    ),
  );
  assert.ok(single.rows.every((r) => r.sku === scope.sku));
  assert.equal(single.rows.length, 7);
  for (const v of [all, category, single]) {
    assert.equal(
      v.quantity,
      v.daily.reduce((sum, r) => sum + r.quantity, 0),
    );
    assert.equal(
      v.quantity,
      v.rows.reduce((sum, r) => sum + r.quantity, 0),
    );
    assert.ok(v.top.every((r) => v.products.some((p) => p.sku === r.sku)));
    assert.equal(v.chart.filter((r) => r.forecast !== null).length, 7);
  }
  assert.ok(
    all.quantity >= category.quantity && category.quantity >= single.quantity,
  );
});
test("Forecast 26 Oct–1 Nov never uses post-cutoff rows as historical baseline or chart actual", async () => {
  const d = structuredClone(await pending),
    o = defaultOptions(d),
    sku = d.catalog.products[0].sku;
  const before = demandForecast(d, o, [sku]);
  d.dataset.sales.push({
    ...d.dataset.sales[0],
    date: "2026-10-26",
    quantity: 999999,
  });
  assert.deepEqual(demandForecast(d, o, [sku]), before);
  assert.equal(before[0].date, "2026-10-26");
  assert.equal(before.at(-1)!.date, "2026-11-01");
  const v = forecastView(d, before, o, scopeForSku(d, sku));
  assert.ok(v.chart.every((r) => r.actual === null || r.date <= o.cutoff));
  assert.ok(
    v.chart.filter((r) => r.date > o.cutoff).every((r) => r.actual === null),
  );
});
test("Scenario factors change totals while actual transactions remain immutable", async () => {
  const d = await pending,
    before = JSON.stringify(d.dataset.sales),
    o = { ...defaultOptions(d), manual: true, baseDemand: 100 };
  const totals = (["Conservative", "Expected", "Optimistic"] as const).map(
    (scenario) =>
      demandForecast(d, { ...o, scenario }).reduce(
        (sum, r) => sum + r.quantity,
        0,
      ),
  );
  assert.ok(totals[0] < totals[1] && totals[1] < totals[2]);
  assert.equal(JSON.stringify(d.dataset.sales), before);
});
test("Manual units apply per SKU; weekend uplift changes only Saturday and Sunday", async () => {
  const d = await pending,
    o = { ...defaultOptions(d), manual: true, baseDemand: 10, weekendPct: 20 };
  const rows = demandForecast(d, o, [d.catalog.products[0].sku]);
  assert.deepEqual(
    rows.map((r) => r.quantity),
    [10, 10, 10, 10, 10, 12, 12],
  );
  const two = demandForecast(
    d,
    { ...o, weekendPct: 0 },
    d.catalog.products.slice(0, 2).map((p) => p.sku),
  );
  assert.equal(
    two.reduce((sum, r) => sum + r.quantity, 0),
    140,
  );
});
test("Automatic calendar, explicit manual zero and 30% differ and respect relevant event/SKU dates", async () => {
  const d = structuredClone(await pending),
    sku = d.catalog.products[0].sku;
  d.dataset.intelligence!.calendar = [
    {
      kind: "festival",
      sku,
      startDate: "2026-10-26",
      endDate: "2026-10-26",
      upliftPct: 100,
    },
    {
      kind: "promotion",
      sku,
      startDate: "2026-10-27",
      endDate: "2026-10-27",
      upliftPct: 50,
    },
  ];
  const o = {
    ...defaultOptions(d),
    manual: true,
    baseDemand: 10,
    weekendPct: 0,
  };
  assert.equal(demandForecast(d, o, [sku])[0].quantity, 20);
  assert.equal(
    demandForecast(d, { ...o, festivalMode: "manual", festivalPct: 0 }, [
      sku,
    ])[0].quantity,
    10,
  );
  assert.equal(
    demandForecast(d, { ...o, festivalMode: "manual", festivalPct: 30 }, [
      sku,
    ])[0].quantity,
    13,
  );
  assert.equal(
    demandForecast(d, { ...o, promotionMode: "manual", promotionPct: 0 }, [
      sku,
    ])[1].quantity,
    10,
  );
  assert.equal(
    demandForecast(d, { ...o, promotionMode: "manual", promotionPct: 30 }, [
      sku,
    ])[1].quantity,
    13,
  );
  assert.equal(
    targetEventFactor(d.dataset.intelligence!.calendar, "2026-10-28", sku, {
      ...o,
      festivalMode: "manual",
      festivalPct: 30,
    }),
    1,
  );
  assert.equal(
    targetEventFactor(d.dataset.intelligence!.calendar, "2026-10-26", "other", {
      ...o,
      festivalMode: "manual",
      festivalPct: 30,
    }),
    1,
  );
});
test("Calendar normalization removes historical event uplift exactly once", async () => {
  const d = structuredClone(await pending),
    sku = d.catalog.products[0].sku;
  d.dataset.sales = d.dataset.sales
    .filter((r) => r.sku === sku)
    .map((r) => ({ ...r, quantity: 20 }));
  d.dataset.intelligence!.calendar = [
    {
      sku,
      kind: "festival",
      startDate: "2026-10-01",
      endDate: "2026-11-01",
      upliftPct: 100,
    },
  ];
  const o = defaultOptions(d);
  assert.equal(demandForecast(d, o, [sku])[0].quantity, 20);
  assert.equal(
    demandForecast(d, { ...o, festivalMode: "manual", festivalPct: 0 }, [
      sku,
    ])[0].quantity,
    10,
  );
});
test("Saved SKU and category forecasts contain only selected rows and survive IndexedDB refresh", async () => {
  const d = await pending,
    o = defaultOptions(d),
    rows = demandForecast(d, o),
    scope = scopeForSku(d, d.catalog.products[0].sku);
  const skuSnap = forecastSnapshot(
    d,
    rows,
    o,
    scope,
    "sku",
    "2026-10-25T10:00:00Z",
  );
  const categorySnap = forecastSnapshot(
    d,
    rows,
    o,
    { categoryId: scope.categoryId, sku: "" },
    "cat",
    "2026-10-25T10:00:00Z",
  );
  assert.equal(skuSnap.rows.length, 7);
  assert.ok(skuSnap.rows.every((r) => r.sku === scope.sku));
  assert.ok(categorySnap.rows.length > 7);
  assert.equal(
    categorySnap.totals!.quantity,
    categorySnap.rows.reduce((sum, r) => sum + r.quantity, 0),
  );
  assert.ok(categorySnap.assumptions!.length);
  await writeWorkflow({ snapshots: [skuSnap, categorySnap] });
  const stored = await readWorkflow<{ snapshots: (typeof skuSnap)[] }>();
  assert.deepEqual(stored!.snapshots, [skuSnap, categorySnap]);
  const frozen = JSON.stringify(categorySnap);
  rows[0].quantity = 999999;
  assert.equal(JSON.stringify(categorySnap), frozen);
});
test("Shared forecast feeds inventory and price/cost scenario without changing actual", async () => {
  const d = await pending,
    o = { ...defaultOptions(d), manual: true, baseDemand: 20 },
    rows = demandForecast(d, o),
    p = d.catalog.products[0],
    actual = JSON.stringify(d.dataset.sales);
  const rec = inventoryRecommendation(d, rows, p.sku)!;
  assert.equal(
    rec.demand,
    rows.filter((r) => r.sku === p.sku).reduce((sum, r) => sum + r.quantity, 0),
  );
  const profit = profitScenario({
    price: p.sellingPrice,
    cost: p.unitCost,
    demand: rec.demand,
    available: rec.availableStock + rec.eligibleHorizon,
    order: 0,
    discount: 0,
    uplift: 0,
    labor: 0,
    campaign: 0,
    wasteUnits: 0,
    other: 0,
    orderInTime: false,
  });
  assert.equal(profit.cogs, profit.sold * p.unitCost);
  assert.equal(JSON.stringify(d.dataset.sales), actual);
});
test("Imported product master scopes and insufficient history never gain demo observations", async () => {
  const demo = await pending,
    p = demo.catalog.products[0],
    cat = demo.catalog.categories.find((c) => c.id === p.categoryId)!;
  const d = new ImportedDataProvider(demo, {
    product: {
      rows: [
        {
          sku: p.sku,
          productName: "สินค้าไฟล์ทดสอบ",
          categoryId: p.categoryId,
          zoneId: cat.zoneId,
          unit: p.unit,
          sellingPrice: 20,
          unitCost: 10,
          active: true,
        },
      ],
      fileName: "p.csv",
      importedAt: "2026-10-25T00:00:00Z",
    },
  }).getDashboard();
  const o = defaultOptions(d),
    rows = demandForecast(d, o),
    view = forecastView(d, rows, o, { categoryId: "", sku: "" });
  assert.equal(view.products.length, 1);
  assert.equal(view.historyDays, 0);
  assert.ok(view.rows.every((r) => r.manual));
  assert.equal(view.assumed, view.rows.length);
  assert.equal(view.products[0].nameTh, "สินค้าไฟล์ทดสอบ");
});
test("Invalid dates, cutoff conflicts, horizon and non-finite assumptions are rejected", async () => {
  const d = await pending,
    o = defaultOptions(d);
  for (const patch of [
    { start: "" },
    { cutoff: "2026-02-30" },
    { start: o.cutoff },
    { horizon: 0 },
    { horizon: 8 },
    { horizon: 1.5 },
    { baseDemand: -1 },
    { festivalPct: NaN },
    { promotionPct: Infinity },
  ])
    assert.throws(() => demandForecast(d, { ...o, ...patch }));
});
test("Spatial forecast consumes same explicit zero override as demand model", async () => {
  const d = structuredClone(await pending),
    o = defaultOptions(d);
  d.dataset.intelligence!.calendar = [
    {
      kind: "festival",
      startDate: "2026-10-26",
      endDate: "2026-10-26",
      upliftPct: 100,
    },
  ];
  const auto = forecastSpatial(d, o),
    zero = forecastSpatial(d, { ...o, festivalMode: "manual", festivalPct: 0 });
  assert.ok(
    auto.zones.some(
      (r, i) =>
        r.date === "2026-10-26" &&
        r.occupancy !== null &&
        r.occupancy > zero.zones[i].occupancy!,
    ),
  );
});
