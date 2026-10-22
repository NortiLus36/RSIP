import test from "node:test";
import assert from "node:assert/strict";
import { floorPlan, storeEnvironment } from "../src/config/floor-plan";
import { analyticsDataset } from "../src/data/mock/analytics";
import { inventory } from "../src/data/mock/inventory";
import { helpFor } from "../src/config/kpi-help";
import nextConfig from "../next.config";
import {
  planRoute,
  routeLengths,
  sampleRoute,
  pointClear,
  environmentObstacles,
  doorShouldOpen,
} from "../src/lib/scene/navigation";
import { useEnvironment } from "../src/stores/environment";
import { useSpatial } from "../src/stores/spatial";
test("requested support rooms are removed and cold chain is aligned with receiving", () => {
  for (const id of ["office", "service", "first-aid", "baby"])
    assert.equal(
      floorPlan.supportAreas.some((a) => a.id === `support-${id}`),
      false,
    );
  const cold = floorPlan.supportAreas.find((a) => a.id === "support-cold")!,
    dock = floorPlan.supportAreas.find((a) => a.id === "support-loading")!;
  assert.equal(cold.transform.position[2], dock.transform.position[2]);
  assert.ok(
    Math.abs(cold.transform.position[0] - dock.transform.position[0]) <= 6,
  );
});
test("six stable checkout IDs reconcile every day's transactions", () => {
  const counters = floorPlan.fixtures.filter((f) => f.kind === "checkout");
  assert.equal(counters.length, 6);
  assert.deepEqual(
    counters.map((f) => f.id),
    [1, 2, 3, 4, 5, 6].map((i) => `fixture-l-0${i}`),
  );
  assert.ok(
    !analyticsDataset.checkout.some(
      (r) => r.fixtureId === "fixture-l-07" || r.fixtureId === "fixture-l-08",
    ),
  );
  for (const day of analyticsDataset.storeDays)
    assert.equal(
      analyticsDataset.checkout
        .filter((r) => r.date === day.date)
        .reduce((s, r) => s + r.transactions, 0),
      day.transactions,
    );
});
test("electronics has four recognizable interactive variants, inventory and canonical sales", () => {
  assert.equal(
    floorPlan.zones.find((z) => z.id === "N")?.categoryId,
    "category-n",
  );
  const fixtures = floorPlan.fixtures.filter((f) => f.zoneId === "N");
  assert.equal(fixtures.length, 4);
  assert.equal(new Set(fixtures.map((f) => f.variant)).size, 4);
  for (const f of fixtures) {
    assert.ok(inventory.some((r) => r.shelfId === f.id));
    assert.ok(
      analyticsDataset.sales.some(
        (r) => r.fixtureId === f.id && r.netSalesCents > 0,
      ),
    );
  }
  assert.equal(
    inventory.find((i) => i.shelfId === "fixture-a-07")?.sku,
    "MOCK-SKU-007",
  );
});
test("four generic ATM cabinets fit the support area without overlap", () => {
  assert.equal(storeEnvironment.atms.length, 4);
  assert.equal(new Set(storeEnvironment.atms.map((a) => a.color)).size, 4);
  const area = floorPlan.supportAreas.find((a) => a.id === "support-atm")!;
  for (const a of storeEnvironment.atms)
    for (const axis of [0, 2])
      assert.ok(
        Math.abs(a.position[axis] - area.transform.position[axis]) +
          a.size[axis] / 2 <=
          area.transform.size[axis] / 2,
      );
  for (let i = 1; i < 4; i++)
    assert.ok(
      storeEnvironment.atms[i].position[0] -
        storeEnvironment.atms[i - 1].position[0] >=
        0.8,
    );
});
test("important KPI and chart explanations have all seven teaching fields", () => {
  for (const key of [
    "netSales",
    "grossProfit",
    "grossMargin",
    "oosRate",
    "abv",
    "conversion",
    "labor",
    "csat",
    "nps",
    "waste",
    "dos",
    "order",
    "contribution",
    "trend",
    "category",
    "composition",
  ]) {
    const help = helpFor(key);
    for (const value of Object.values(help)) assert.ok(value.length > 0);
  }
  assert.equal(nextConfig.devIndicators, false);
});
test("all nine configured character paths avoid fixtures, rooms, ATMs, gates and parked carts", () => {
  assert.equal(
    storeEnvironment.characters.filter((c) => c.role === "customer").length,
    6,
  );
  assert.equal(storeEnvironment.characters.length, 9);
  const obstacles = environmentObstacles(floorPlan);
  for (const spec of storeEnvironment.characters) {
    const radius = spec.cart ? 0.85 : 0.28,
      route = routeLengths(planRoute(floorPlan, spec.waypoints, radius));
    assert.ok(route.total > 0, spec.id);
    for (let distance = 0; distance < route.total; distance += 0.1) {
      const p = sampleRoute(route, distance);
      assert.ok(
        pointClear([p.x, p.z], obstacles, radius - 1e-7),
        `${spec.id} intersects at ${p.x},${p.z}`,
      );
      assert.ok(Number.isFinite(p.angle));
    }
  }
});
test("door detects a person through the opening and closes only after clearance", () => {
  assert.equal(doorShouldOpen([-3, 24], [{ x: -3, z: 24 }]), true);
  assert.equal(doorShouldOpen([-3, 24], [{ x: -3, z: 22 }]), true);
  assert.equal(doorShouldOpen([-3, 24], [{ x: -3, z: 28 }]), false);
  assert.equal(doorShouldOpen([-3, 24], []), false);
  assert.equal(storeEnvironment.securityGates.length, 4);
  assert.ok(storeEnvironment.doors.every((d) => d.width >= 4));
});
test("visual animation pause does not alter hourly data/playback state", () => {
  const time = useSpatial.getState();
  useEnvironment.getState().toggle();
  assert.equal(useEnvironment.getState().paused, true);
  assert.equal(useSpatial.getState(), time);
  useEnvironment.getState().toggle();
});
