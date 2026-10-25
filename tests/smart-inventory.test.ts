import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboard } from "../src/data/providers";
import {
  inventoryRecommendation,
  fixtureCapacity,
} from "../src/lib/analytics/intelligence";
import { defaultOptions } from "../src/components/analytics/useForecast";
import { demandForecast } from "../src/lib/analytics/intelligence";
import { createInventoryTask } from "../src/lib/analytics/inventory-actions";
import { ImportedDataProvider } from "../src/lib/import/provider";
import { useIntelligence } from "../src/stores/intelligence";
import "fake-indexeddb/auto";
const pending = loadDashboard();
async function fixture() {
  const d = structuredClone(await pending),
    p = d.catalog.products[0],
    sku = p.sku,
    placement = d.catalog.fixtureProducts.find((x) => x.sku === sku)!,
    shelf = d.catalog.shelfInventory.find((x) => x.sku === sku)!;
  shelf.shelfStock = 0;
  shelf.reservedStock = 0;
  d.catalog.stockLocations
    .filter((x) => x.sku === sku)
    .forEach((l) => {
      l.backroomStock = 100;
      l.reservedStock = 0;
      l.incomingStock = 0;
      l.incomingBatches = [];
    });
  placement.displayCapacity = 40;
  const o = {
    ...defaultOptions(d),
    manual: true,
    baseDemand: 10,
    weekendPct: 0,
  };
  return {
    d,
    sku,
    o,
    rows: demandForecast(d, o),
    fixtureId: placement.fixtureId,
  };
}
test("Empty shelf and available backroom produce refill bounded by capacity", async () => {
  const { d, sku, rows, fixtureId } = await fixture();
  const r = inventoryRecommendation(d, rows, sku)!;
  const p = r.refills.find((p) => p.fixtureId === fixtureId)!;
  assert.equal(p.shelfStock, 0);
  assert.equal(p.replenishment, 10);
  assert.ok(p.replenishment! <= p.capacity!);
  assert.equal(r.suggestedOrder, 0);
});
test("No backroom means no refill while protection order reflects shortage", async () => {
  const { d, sku, rows } = await fixture();
  d.catalog.stockLocations
    .filter((x) => x.sku === sku)
    .forEach((l) => (l.backroomStock = 0));
  const r = inventoryRecommendation(d, rows, sku)!;
  assert.equal(r.replenishment, 0);
  assert.equal(r.coverageDays, 3);
  assert.equal(r.suggestedOrder, 38);
});
test("Protection period uses lead plus review with labeled mean for uncovered days", async () => {
  const { d, sku, rows } = await fixture();
  const r = inventoryRecommendation(d, rows, sku, 7)!;
  assert.equal(r.coverageDays, 9);
  assert.equal(r.protection, 90);
  assert.equal(r.estimatedDays, 2);
  assert.equal(r.extrapolated, true);
});
test("Partial forecast gaps use mean estimates, not invented zero", async () => {
  const { d, sku, rows } = await fixture();
  const partial = rows.filter(
    (r) => r.sku === sku && ["2026-10-26", "2026-10-28"].includes(r.date),
  );
  const r = inventoryRecommendation(d, partial, sku, 1)!;
  assert.equal(r.demand, 30);
  assert.equal(r.protection, 30);
  assert.equal(r.estimatedDays, 1);
  assert.equal(r.horizonEstimatedDays, 1);
});
test("Late incoming excluded; explicit ETA override replaces instead of adding shipments", async () => {
  const { d, sku, rows } = await fixture();
  d.catalog.stockLocations
    .filter((x) => x.sku === sku)
    .forEach((l) => {
      l.backroomStock = 0;
      l.incomingBatches = [{ quantity: 50, arrivalDays: 30 }];
    });
  assert.equal(inventoryRecommendation(d, rows, sku)!.inTime, 0);
  const r = inventoryRecommendation(d, rows, sku, 1, undefined, {
    incomingQuantity: 20,
    incomingEta: "2026-10-27",
  })!;
  assert.equal(r.inTime, 20);
  assert.equal(r.suggestedOrder, 18);
});
test("Reserved warehouse cannot be used for shelf transfer or stock availability", async () => {
  const { d, sku, rows } = await fixture();
  d.catalog.stockLocations
    .filter((x) => x.sku === sku)
    .forEach((l) => {
      l.backroomStock = 100;
      l.reservedStock = 97;
    });
  const r = inventoryRecommendation(d, rows, sku)!;
  assert.equal(r.availableStock, 3);
  assert.equal(r.replenishment, 3);
  assert.equal(r.suggestedOrder, 35);
});
test("Multiple fixtures have separate shelf totals and share one warehouse allocation", async () => {
  const { d, sku, rows, fixtureId } = await fixture();
  const second = d.store.fixtures.find(
    (f) => f.zoneId === "A" && f.id !== fixtureId,
  )!;
  d.catalog.fixtureProducts.push({
    sku,
    fixtureId: second.id,
    displayCapacity: 40,
  });
  d.catalog.shelfInventory.push({
    sku,
    fixtureId: second.id,
    shelfStock: 2,
    reservedStock: 0,
    updatedAt: "2026-10-25T00:00:00+07:00",
  });
  d.dataset.intelligence!.inventory.push({
    ...d.dataset.intelligence!.inventory.find(
      (x) => x.sku === sku && x.snapshotDate === "2026-10-25",
    )!,
    fixtureId: second.id,
    shelfStock: 2,
    shelfCapacity: 40,
  });
  d.catalog.stockLocations
    .filter((x) => x.sku === sku)
    .forEach((l) => (l.backroomStock = 6));
  const r = inventoryRecommendation(d, rows, sku)!;
  assert.equal(r.backroomStock, 6);
  assert.equal(r.shelfStock, 2);
  assert.equal(r.availableStock, 8);
  assert.equal(r.refills.find((p) => p.fixtureId === fixtureId)!.shelfStock, 0);
  assert.equal(r.refills.find((p) => p.fixtureId === second.id)!.shelfStock, 2);
  assert.ok(r.refills.reduce((sum, p) => sum + (p.replenishment ?? 0), 0) <= 6);
  assert.equal(r.suggestedOrder, 30);
});
test("Missing capacity stays unknown until explicit per-fixture assumption", async () => {
  const { d, sku, rows, fixtureId } = await fixture();
  for (const row of d.dataset.intelligence!.inventory.filter(
    (r) => r.sku === sku,
  ))
    delete row.shelfCapacity;
  assert.equal(fixtureCapacity(d, sku, fixtureId), null);
  const r = inventoryRecommendation(d, rows, sku)!;
  assert.equal(r.refills[0].replenishment, null);
  assert.equal(r.hasMissingCapacity, true);
  const known = inventoryRecommendation(d, rows, sku, 1, undefined, {
    capacities: { [fixtureId]: 2 },
  })!;
  assert.equal(known.refills[0].replenishment, 2);
});
test("Zero demand has no refill and N/A days supply; missing inputs do not become zero stock", async () => {
  const { d, sku, rows } = await fixture();
  const zero = rows.map((r) => ({ ...r, quantity: 0 }));
  const r = inventoryRecommendation(d, zero, sku)!;
  assert.equal(r.daysOfSupply, null);
  assert.equal(r.replenishment, 0);
  assert.equal(r.suggestedOrder, 0);
  assert.equal(inventoryRecommendation(d, [], sku), null);
  d.catalog.shelfInventory = d.catalog.shelfInventory.filter(
    (p) => p.sku !== sku,
  );
  assert.equal(inventoryRecommendation(d, rows, sku), null);
});
test("Planning overrides and reset affect only selected SKU assumptions, not dataset/snapshots", async () => {
  const { d, sku, rows } = await fixture(),
    before = JSON.stringify(d),
    snapshots = useIntelligence.getState().snapshots;
  const baseline = inventoryRecommendation(d, rows, sku)!;
  useIntelligence
    .getState()
    .setPlanning("audit", sku, {
      leadTimeDays: 10,
      reviewDays: 7,
      safetyStock: 100,
    });
  assert.ok(
    inventoryRecommendation(
      d,
      rows,
      sku,
      1,
      undefined,
      useIntelligence.getState().planningAssumptions.audit[sku],
    )!.suggestedOrder > baseline.suggestedOrder,
  );
  useIntelligence.getState().setPlanning("audit", sku, {});
  assert.deepEqual(
    inventoryRecommendation(
      d,
      rows,
      sku,
      1,
      undefined,
      useIntelligence.getState().planningAssumptions.audit[sku],
    ),
    baseline,
  );
  assert.equal(JSON.stringify(d), before);
  assert.equal(useIntelligence.getState().snapshots, snapshots);
});
test("Invalid assumptions do not yield NaN or Infinity", async () => {
  const { d, sku, rows, fixtureId } = await fixture();
  for (const a of [
    { dailyDemand: NaN },
    { incomingQuantity: -1 },
    { reviewDays: 8 },
    { leadTimeDays: Infinity },
    { capacities: { [fixtureId]: -1 } },
    { incomingQuantity: 20, incomingEta: "" },
  ])
    assert.throws(() => inventoryRecommendation(d, rows, sku, 1, undefined, a));
});
test("Task metadata persists with action identity and duplicate prevention", async () => {
  const { d, sku, o, rows, fixtureId } = await fixture();
  const input = {
    sku,
    fixtureId,
    quantity: 10,
    type: "Replenishment" as const,
    reason: "Synthetic count0 / warehouse100",
    inventoryReference: "snapshot-25",
  };
  const built = createInventoryTask(d, rows, o, input, [], "task-one");
  assert.equal(built.task.quantity, 10);
  assert.equal(built.task.unit, d.catalog.products[0].unit);
  assert.equal(built.action.id, built.task.actionId);
  assert.ok(built.task.forecastReference);
  assert.throws(
    () => createInventoryTask(d, rows, o, input, [built.task], "task-two"),
    /มีงาน/,
  );
  assert.doesNotThrow(() =>
    createInventoryTask(
      d,
      rows,
      o,
      input,
      [{ ...built.task, status: "Done" }],
      "task-three",
    ),
  );
  for (const quantity of [0, -1, NaN])
    assert.throws(() =>
      createInventoryTask(d, rows, o, { ...input, quantity }, [], "bad"),
    );
  await useIntelligence
    .getState()
    .save({
      tasks: [built.task],
      actions: { [built.task.reference]: [built.action] },
    });
  assert.equal(useIntelligence.getState().tasks[0].taskType, "Replenishment");
});
test("Purchase review is a recommendation, never a purchase order confirmation", async () => {
  const { d, sku, o, rows, fixtureId } = await fixture();
  const built = createInventoryTask(
    d,
    rows,
    o,
    {
      sku,
      fixtureId,
      quantity: 5,
      type: "PurchaseReview",
      reason: "Synthetic shortage",
      inventoryReference: "s",
    },
    [],
    "purchase",
  );
  assert.match(built.task.reason, /ไม่ใช่ Purchase Order/);
  assert.equal(built.task.role, "Department Supervisor");
});
test("Imported stock changes recommendations without duplicating shared backroom", async () => {
  const { d, sku, o } = await fixture();
  const p = d.catalog.products[0],
    base = {
      snapshotDate: "2026-10-25",
      sku,
      fixtureId: d.catalog.fixtureProducts.find((x) => x.sku === sku)!
        .fixtureId,
      storageLocationId: d.store.fixtures.find((f) => f.zoneId === "F")!.id,
      shelfStock: 0,
      backroomStock: 100,
      reservedStock: 0,
      incomingStock: 0,
      incomingArrivalDays: 0,
      shelfCapacity: 30,
      averageDailyDemand: 10,
      leadTimeDays: 2,
      safetyStock: 8,
    };
  const imported = new ImportedDataProvider(d, {
    product: {
      rows: [
        {
          sku,
          productName: p.nameTh,
          categoryId: p.categoryId,
          zoneId: "A",
          unit: p.unit,
          sellingPrice: p.sellingPrice,
          unitCost: p.unitCost,
          active: true,
        },
      ],
      fileName: "p",
      importedAt: "now",
    },
    inventory: { rows: [base], fileName: "stock", importedAt: "now" },
  }).getDashboard();
  const r = inventoryRecommendation(
    imported,
    demandForecast(imported, { ...o, manual: true }),
    sku,
  )!;
  assert.equal(r.backroomStock, 100);
  assert.equal(r.replenishment, 10);
  assert.equal(r.suggestedOrder, 0);
});
