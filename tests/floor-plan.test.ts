import { test } from "node:test";
import assert from "node:assert/strict";
import { floorPlan, categories } from "../src/config/floor-plan";
import { hourlyTraffic, snapshots, inventory } from "../src/data/mock";
import { retailProvider } from "../src/data/providers";
test("zone footprints leave at least half a scene unit between every department", () => {
  for (let i = 0; i < floorPlan.zones.length; i++)
    for (let j = i + 1; j < floorPlan.zones.length; j++) {
      const a = floorPlan.zones[i],
        b = floorPlan.zones[j];
      const gapX =
        Math.abs(a.transform.position[0] - b.transform.position[0]) -
        (a.transform.size[0] + b.transform.size[0]) / 2;
      const gapZ =
        Math.abs(a.transform.position[2] - b.transform.position[2]) -
        (a.transform.size[2] + b.transform.size[2]) / 2;
      assert.ok(
        Math.max(gapX, gapZ) >= 0.5 - 1e-8,
        `${a.id}/${b.id} overlap or have no aisle`,
      );
    }
  for (const left of ["B", "M"])
    for (const right of ["H", "I", "J"]) {
      const a = floorPlan.zones.find((z) => z.id === left)!.transform,
        b = floorPlan.zones.find((z) => z.id === right)!.transform;
      assert.ok(
        b.position[0] - b.size[0] / 2 - (a.position[0] + a.size[0] / 2) >= 1,
      );
    }
});
test("floor plan contains all 14 zones and globally unique object IDs", () => {
  assert.deepEqual(
    floorPlan.zones.map((z) => z.id).sort(),
    "ABCDEFGHIJKLMN".split(""),
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
