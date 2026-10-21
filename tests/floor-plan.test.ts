import { test } from "node:test";
import assert from "node:assert/strict";
import { floorPlan, categories } from "../src/config/floor-plan";
import { hourlyTraffic, snapshots, inventory } from "../src/data/mock";
import { retailProvider } from "../src/data/providers";
test("floor plan contains all 13 zones and globally unique object IDs", () => {
  assert.deepEqual(
    floorPlan.zones.map((z) => z.id).sort(),
    "ABCDEFGHIJKLM".split(""),
  );
  const objects = [
    floorPlan,
    ...floorPlan.zones,
    ...floorPlan.fixtures,
    ...floorPlan.supportAreas,
  ];
  assert.equal(new Set(objects.map((o) => o.id)).size, objects.length);
  for (const f of floorPlan.fixtures)
    assert.ok(floorPlan.zones.some((z) => z.id === f.zoneId));
  for (const z of floorPlan.zones)
    assert.ok(categories.some((c) => c.id === z.categoryId));
});
test("inventory and analytics reference existing objects and reconcile traffic", () => {
  for (const i of inventory)
    assert.ok(floorPlan.fixtures.some((f) => f.id === i.shelfId));
  for (const z of floorPlan.zones)
    assert.ok(snapshots.some((s) => s.objectId === z.id));
  for (const f of floorPlan.fixtures)
    assert.ok(snapshots.some((s) => s.objectId === f.id));
  assert.equal(
    hourlyTraffic.reduce((sum, h) => sum + h.customers, 0),
    snapshots[0].metrics.find((m) => m.key === "traffic")?.value,
  );
});
test("provider returns source, period and KPI definitions; unknown object has no snapshot", async () => {
  const snapshot = await retailProvider.getSnapshot(floorPlan.id);
  assert.equal(snapshot?.source, "Mock");
  assert.ok(snapshot?.period.from);
  assert.ok(snapshot?.metrics.every((m) => m.unit && m.definition));
  assert.equal(await retailProvider.getSnapshot("missing"), undefined);
});
