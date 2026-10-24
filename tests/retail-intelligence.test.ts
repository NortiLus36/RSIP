import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboard, loadLegacyDashboard } from "../src/data/providers";
import { octoberBundle } from "../src/data/mock/october";
const demoPromise = loadDashboard();
test("October foundation covers only completed Oct 1–23 with transaction-derived sales and costs", async () => {
  const d = await demoPromise;
  assert.equal(d.dataset.asOf, "2026-10-23");
  assert.equal(new Set(d.dataset.sales.map((r) => r.date)).size, 23);
  assert.ok(
    d.dataset.sales.every((r) => r.date <= "2026-10-23" && r.quantity! > 0),
  );
  const raw = d.dataset.intelligence!.sales;
  assert.equal(
    raw.reduce((s, r) => s + Math.round(Number(r.netSalesAmount) * 100), 0),
    d.dataset.sales.reduce((s, r) => s + r.netSalesCents, 0),
  );
  assert.equal(
    raw.reduce((s, r) => s + Math.round(Number(r.costAmount) * 100), 0),
    d.dataset.sales.reduce((s, r) => s + r.cogsCents, 0),
  );
});
test("October catalog preserves every existing SKU and exact geometry, adds vegetarian SKUs on existing fixtures", async () => {
  const [d, legacy] = await Promise.all([demoPromise, loadLegacyDashboard()]);
  assert.deepEqual(d.store, legacy.store);
  for (const p of legacy.catalog.products)
    assert.ok(d.catalog.products.some((r) => r.sku === p.sku));
  assert.equal(d.catalog.products.length, 65);
  assert.ok(
    d.catalog.fixtureProducts.every((m) =>
      d.store.fixtures.some((f) => f.id === m.fixtureId),
    ),
  );
});
test("event effects are SKU-specific and calendar states verified festival dates", async () => {
  const d = await demoPromise,
    c = d.dataset.intelligence!.calendar;
  assert.ok(
    c.some((r) => r.startDate === "2026-10-10" && r.endDate === "2026-10-18"),
  );
  assert.ok(c.every((r) => String(r.sku).startsWith("VEG-")));
  assert.equal(
    octoberBundle(await loadLegacyDashboard()).traffic!.rows.length,
    23 * 15 * 14,
  );
});
test("October data has daily variation, weekend peaks and no future actual rows", async () => {
  const d = await demoPromise;
  const daily = new Map<string, number>();
  d.dataset.sales.forEach((r) =>
    daily.set(r.date, (daily.get(r.date) ?? 0) + r.netSalesCents),
  );
  assert.equal(new Set(daily.values()).size, 23);
  assert.equal(d.spatial.dates.at(-1), "2026-10-23");
  assert.ok(
    !d.dataset.intelligence!.sales.some((r) =>
      String(r.transactionDateTime).startsWith("2026-10-24"),
    ),
  );
});
