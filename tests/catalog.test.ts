import test from "node:test";
import assert from "node:assert/strict";
import { productCatalog } from "../src/data/mock/catalog";
import { floorPlan } from "../src/config/floor-plan";
import { inventory } from "../src/data/mock/inventory";
import { analyticsDataset } from "../src/data/mock/analytics";
import { validateCatalog, inventoryForSku } from "../src/lib/analytics/catalog";
import {
  currentRows,
  salesTotals,
  categoryChart,
  snapshotFor,
} from "../src/lib/analytics/selectors";
import { retailProvider } from "../src/data/providers";
import { useExplorer } from "../src/stores/explorer";
import { useSpatial } from "../src/stores/spatial";
import { spatialDataset } from "../src/data/mock/spatial";

test("catalog joins every retail zone, subcategory, fixture and SKU through unique references", () => {
  assert.deepEqual(validateCatalog(productCatalog, floorPlan), []);
  for (const zone of floorPlan.zones.filter(
    (z) => !["F", "L"].includes(z.id),
  )) {
    const sub = productCatalog.categories.filter(
      (c) => c.zoneId === zone.id && c.parentId,
    );
    assert.ok(sub.length >= 3, zone.id);
    for (const c of sub)
      assert.ok(
        productCatalog.products.some((p) => p.categoryId === c.id),
        c.id,
      );
    for (const f of floorPlan.fixtures.filter((f) => f.zoneId === zone.id))
      assert.ok(
        productCatalog.fixtureProducts.some((m) => m.fixtureId === f.id),
        f.id,
      );
  }
  assert.equal(
    new Set(productCatalog.products.map((p) => p.sku)).size,
    productCatalog.products.length,
  );
  const jasmine = productCatalog.products.find(
    (p) => p.nameTh === "ข้าวหอมมะลิ 5 กก.",
  )!;
  assert.ok(jasmine);
  assert.equal(jasmine.unit, "ถุง");
  assert.equal(
    productCatalog.categories.find((c) => c.id === jasmine.categoryId)?.nameTh,
    "ข้าวสาร",
  );
});
test("operational zones carry real product storage and transactions without fictional retail SKUs", () => {
  assert.ok(
    productCatalog.stockLocations.every((r) =>
      floorPlan.fixtures.some((f) => f.id === r.fixtureId && f.zoneId === "F"),
    ),
  );
  assert.ok(
    productCatalog.fixtureProducts.every((r) =>
      floorPlan.fixtures.some(
        (f) => f.id === r.fixtureId && !["F", "L"].includes(f.zoneId),
      ),
    ),
  );
  assert.ok(
    !inventory.some(
      (r) => r.categoryId === "category-f" || r.categoryId === "category-l",
    ),
  );
  assert.ok(
    analyticsDataset.checkout.every((r) =>
      floorPlan.fixtures.some((f) => f.id === r.fixtureId && f.zoneId === "L"),
    ),
  );
});
test("catalog validation rejects duplicate IDs, broken references, invalid stock and non-finite data", () => {
  const corruptions: ((c: typeof productCatalog) => void)[] = [
    (c) => c.products.push({ ...c.products[0] }),
    (c) => (c.categories[1].parentId = "missing"),
    (c) => (c.products[0].categoryId = "missing"),
    (c) => (c.fixtureProducts[0].fixtureId = "missing"),
    (c) => (c.shelfInventory[0].shelfStock = -1),
    (c) => (c.stockLocations[0].backroomStock = Infinity),
    (c) =>
      (c.stockLocations[0].reservedStock =
        c.stockLocations[0].backroomStock + 1),
    (c) => c.shelfInventory.push({ ...c.shelfInventory[0] }),
    (c) => c.stockLocations.push({ ...c.stockLocations[0] }),
    (c) => (c.planning[0].averageDailyDemand = NaN),
    (c) => (c.products[0].unitCost = -10),
    (c) => c.planning.splice(0, 1),
  ];
  for (const mutate of corruptions) {
    const c = structuredClone(productCatalog);
    mutate(c);
    assert.ok(validateCatalog(c, floorPlan).length);
  }
});
test("one SKU on two fixtures counts shelf positions separately and warehouse stock once", () => {
  const c = structuredClone(productCatalog),
    sku = c.products[0].sku;
  const r = c.shelfInventory.find((r) => r.sku === sku)!;
  r.shelfStock = 5;
  r.reservedStock = 2;
  c.fixtureProducts.push({
    sku,
    fixtureId: "fixture-a-02",
    displayCapacity: 100,
  });
  c.shelfInventory.push({
    ...r,
    fixtureId: "fixture-a-02",
    shelfStock: 7,
    reservedStock: 1,
  });
  const stock = c.stockLocations.find((r) => r.sku === sku)!;
  stock.backroomStock = 30;
  stock.reservedStock = 3;
  c.planning.find((r) => r.sku === sku)!.averageDailyDemand = 10;
  const result = inventoryForSku(c, sku);
  assert.equal(result.shelfStock, 12);
  assert.equal(result.backroomStock, 30);
  assert.equal(result.reservedStock, 6);
  assert.equal(result.availableStock, 36);
  assert.equal(result.daysOfSupply, 3.6);
  assert.deepEqual(validateCatalog(c, floorPlan), []);
});
test("late incoming is excluded, zero demand is N/A, scenarios do not mutate inventory", () => {
  const c = structuredClone(productCatalog),
    sku = c.products[0].sku;
  const before = JSON.stringify(c);
  const original = inventoryForSku(c, sku);
  assert.equal(JSON.stringify(c), before);
  c.stockLocations.find((r) => r.sku === sku)!.incomingArrivalDays = 999;
  const late = inventoryForSku(c, sku);
  assert.equal(late.eligibleIncoming, 0);
  assert.ok(late.suggestedOrder! >= original.suggestedOrder!);
  c.planning.find((r) => r.sku === sku)!.averageDailyDemand = 0;
  assert.equal(inventoryForSku(c, sku).daysOfSupply, null);
});
test("canonical shelf availability, OOS and warehouse totals reconcile with the compatibility provider", () => {
  assert.equal(inventory.length, productCatalog.shelfInventory.length);
  for (const p of productCatalog.products) {
    const rows = inventory.filter((i) => i.sku === p.sku),
      stock = inventoryForSku(productCatalog, p.sku);
    assert.equal(
      rows.reduce((s, r) => s + r.onHand, 0),
      stock.shelfStock,
    );
    assert.equal(
      rows.reduce((s, r) => s + (r.backroomOnHand ?? 0), 0),
      stock.backroomStock,
    );
  }
  const snapshot = snapshotFor(
    analyticsDataset,
    inventory,
    floorPlan,
    floorPlan.id,
  )!;
  assert.equal(
    snapshot.metrics.find((m) => m.key === "oosRate")!.value,
    (inventory.filter((r) => r.onHand === 0).length / inventory.length) * 100,
  );
});
test("expanded SKU sales reconcile by day, category, SKU and spatial hour without changing store sales", () => {
  assert.equal(salesTotals(currentRows(analyticsDataset)).sales, 284650);
  for (const row of analyticsDataset.sales) {
    const product = productCatalog.products.find((p) => p.sku === row.sku)!;
    assert.ok(product);
    const cat = productCatalog.categories.find(
      (c) => c.id === product.categoryId,
    )!;
    assert.equal(cat.parentId, row.categoryId);
    assert.equal(cat.zoneId, row.zoneId);
    assert.ok(
      productCatalog.fixtureProducts.some(
        (m) => m.sku === row.sku && m.fixtureId === row.fixtureId,
      ),
    );
  }
  const rows = currentRows(analyticsDataset),
    chart = categoryChart(rows, floorPlan);
  assert.ok(chart.every((r) => /[ก-๙]/.test(r.name)));
  assert.ok(Math.abs(chart.reduce((s, r) => s + r.sales, 0) - 284650) < 1e-8);
  for (const z of floorPlan.zones) {
    const facts = salesTotals(
      currentRows(analyticsDataset, { zoneId: z.id }),
    ).sales;
    const hours =
      spatialDataset.zones
        .filter((r) => r.zoneId === z.id && r.date === analyticsDataset.asOf)
        .reduce((s, r) => s + (r.salesCents ?? 0), 0) / 100;
    assert.equal(hours, facts);
  }
});
test("SKU selection focuses its fixture, preserves spatial time and clears when choosing a zone", () => {
  const date = useSpatial.getState().selectedDate,
    hour = useSpatial.getState().selectedHour;
  useExplorer.getState().selectSku("MOCK-SKU-001", "fixture-a-01");
  assert.equal(useExplorer.getState().selectedSku, "MOCK-SKU-001");
  assert.equal(useExplorer.getState().selectedId, "fixture-a-01");
  useExplorer.getState().select("A");
  assert.equal(useExplorer.getState().selectedSku, null);
  assert.equal(useSpatial.getState().selectedDate, date);
  assert.equal(useSpatial.getState().selectedHour, hour);
});
test("the asynchronous provider exposes the same catalog used by inventory and sales", async () => {
  assert.equal(await retailProvider.getCatalog(), productCatalog);
  assert.deepEqual(
    await retailProvider.getCategories(),
    productCatalog.categories,
  );
});
