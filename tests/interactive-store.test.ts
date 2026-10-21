import { test } from "node:test";
import assert from "node:assert/strict";
import { floorPlan, sceneConfig } from "../src/config/floor-plan";
import {
  cameraFrame,
  storeBounds,
  findSceneObject,
} from "../src/lib/scene/camera";
import { useExplorer } from "../src/stores/explorer";
import { retailProvider, loadDashboard } from "../src/data/providers";

test("fixture footprints stay inside original zones, leave aisles and do not collide", () => {
  for (const fixture of floorPlan.fixtures) {
    const zone = floorPlan.zones.find((z) => z.id === fixture.zoneId)!;
    for (const axis of [0, 2])
      assert.ok(
        Math.abs(
          fixture.transform.position[axis] - zone.transform.position[axis],
        ) +
          fixture.transform.size[axis] / 2 <=
          zone.transform.size[axis] / 2,
        fixture.id,
      );
  }
  for (let i = 0; i < floorPlan.fixtures.length; i++)
    for (let j = i + 1; j < floorPlan.fixtures.length; j++) {
      const a = floorPlan.fixtures[i],
        b = floorPlan.fixtures[j];
      const overlaps = [0, 2].every(
        (axis) =>
          Math.abs(a.transform.position[axis] - b.transform.position[axis]) <
          (a.transform.size[axis] + b.transform.size[axis]) / 2 - 0.01,
      );
      assert.equal(overlaps, false, `${a.id} collides with ${b.id}`);
    }
  const clothes = floorPlan.fixtures.filter((f) => f.zoneId === "M");
  assert.ok(clothes.some((f) => f.kind === "clothes"));
  assert.ok(clothes.some((f) => f.kind === "shoes"));
  assert.ok(clothes.some((f) => f.kind === "folded"));
  for (const zone of floorPlan.zones)
    assert.ok(floorPlan.fixtures.some((f) => f.zoneId === zone.id));
});
test("selection, repeat focus, scene click and clear have distinct camera semantics", () => {
  const s = useExplorer.getState();
  s.select(null, false);
  const reset = s.resetVersion;
  const before = useExplorer.getState().focusVersion;
  s.select("fixture-m-01");
  assert.equal(useExplorer.getState().focusVersion, before + 1);
  s.select("fixture-m-01");
  assert.equal(useExplorer.getState().focusVersion, before + 2);
  s.select("fixture-a-01", false);
  assert.equal(useExplorer.getState().focusVersion, before + 2);
  s.select(null, false);
  assert.equal(useExplorer.getState().selectedId, null);
  assert.equal(useExplorer.getState().resetVersion, reset);
  s.toggle("autoRotate");
  s.select("M");
  assert.equal(useExplorer.getState().autoRotate, false);
  s.select(null, false);
});
test("camera framing fits wide and narrow viewports and clamps close-up zoom", () => {
  const bounds = storeBounds(floorPlan);
  const wide = cameraFrame(bounds, 1100, 500);
  const narrow = cameraFrame(bounds, 300, 500);
  assert.ok(wide.zoom >= narrow.zoom);
  assert.ok(Number.isFinite(narrow.zoom));
  const fixture = floorPlan.fixtures.find((f) => f.kind === "clothes")!;
  const close = cameraFrame(fixture.transform, 900, 600);
  assert.ok(close.zoom > wide.zoom);
  assert.ok(close.zoom <= sceneConfig.maxZoom);
  assert.equal(findSceneObject(floorPlan, fixture.id)?.id, fixture.id);
  assert.equal(findSceneObject(floorPlan, "missing"), undefined);
  assert.equal(
    close.target.toArray().join(","),
    fixture.transform.position.join(","),
  );
});
test("provider delivers inventory and omits unavailable service-fixture KPIs", async () => {
  const data = await loadDashboard();
  assert.ok(data.inventory.length);
  assert.ok(
    (await retailProvider.getSnapshot("fixture-l-01"))?.metrics.some(
      (m) => m.key === "waitTime",
    ),
  );
  assert.equal(
    (await retailProvider.getSnapshot("fixture-f-01"))?.metrics.length,
    0,
  );
  assert.ok(
    (await retailProvider.getSnapshot("fixture-m-01"))?.metrics.find(
      (m) => m.key === "netSales",
    ),
  );
  assert.ok(
    data.inventory.every((item) => findSceneObject(floorPlan, item.shelfId)),
  );
});
