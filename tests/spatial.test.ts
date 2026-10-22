import test from "node:test";
import assert from "node:assert/strict";
import { spatialDataset as data } from "../src/data/mock/spatial";
import { analyticsDataset } from "../src/data/mock/analytics";
import { floorPlan } from "../src/config/floor-plan";
import {
  density,
  stockRate,
  colorLevel,
  peakHour,
  hourlySeries,
  zoneAt,
  layerValue,
  validTime,
  nextHour,
  zoneFootprint,
  topZones,
} from "../src/lib/analytics/spatial";
import { useSpatial } from "../src/stores/spatial";
import { useExplorer } from "../src/stores/explorer";
import { startPlayback } from "../src/lib/simulation/playback";
test("density uses mock area and handles zero, missing and non-finite values", () => {
  assert.equal(density(20, 100), 0.2);
  assert.equal(density(0, 100), 0);
  for (const area of [0, -1, undefined, Infinity, NaN])
    assert.equal(density(20, area), null);
  for (const count of [null, -1, NaN, Infinity])
    assert.equal(density(count, 100), null);
  assert.equal(density(Number.MAX_VALUE, Number.MIN_VALUE), null);
});
test("OOS denominator zero is No Data, not zero risk", () => {
  assert.equal(stockRate(50, 2), 4);
  assert.equal(stockRate(0, 0), null);
  assert.equal(stockRate(1, 2), null);
  assert.equal(stockRate(2, -1), null);
  assert.equal(stockRate(2.5, 1), null);
  assert.equal(stockRate(2, 0), 0);
});
test("thresholds have explicit boundary and missing behavior", () => {
  assert.equal(colorLevel(0.149, "density").level, 0);
  assert.equal(colorLevel(0.15, "density").level, 1);
  assert.equal(colorLevel(0.4, "density").level, 2);
  assert.equal(colorLevel(2000, "sales").level, 1);
  assert.equal(colorLevel(5000, "sales").level, 2);
  assert.equal(colorLevel(5, "oos").level, 1);
  assert.equal(colorLevel(15, "oos").level, 2);
  for (const value of [null, NaN, Infinity, -1])
    assert.equal(colorLevel(value, "oos").label, "No Data");
});
test("three distinct complete days use all floor-plan zone and fixture identities", () => {
  assert.equal(data.dates.length, 3);
  assert.deepEqual(
    data.hours,
    Array.from({ length: 15 }, (_, i) => i + 8),
  );
  assert.equal(data.zones.length, 3 * 15 * 13);
  for (const r of data.zones)
    assert.ok(floorPlan.zones.some((z) => z.id === r.zoneId));
  for (const r of data.stock)
    assert.ok(
      floorPlan.fixtures.some(
        (f) => f.id === r.fixtureId && f.zoneId === r.zoneId,
      ),
    );
  assert.notDeepEqual(
    hourlySeries(data, data.dates[0]).map((r) => r.entries),
    hourlySeries(data, data.dates[1]).map((r) => r.entries),
  );
});
test("hourly sales, traffic and transactions reconcile to the Phase 3 provider totals", () => {
  for (const date of data.dates) {
    const series = hourlySeries(data, date),
      daily = analyticsDataset.storeDays.find((r) => r.date === date)!;
    assert.equal(
      series.reduce((s, r) => s + r.entries!, 0),
      daily.traffic,
    );
    assert.equal(
      series.reduce((s, r) => s + r.transactions!, 0),
      daily.transactions,
    );
    const cents = data.zones
      .filter((r) => r.date === date)
      .reduce((s, r) => s + (r.salesCents ?? 0), 0);
    assert.equal(
      cents,
      analyticsDataset.sales
        .filter((r) => r.date === date)
        .reduce((s, r) => s + r.netSalesCents, 0),
    );
    for (const z of floorPlan.zones) {
      assert.equal(
        data.zones
          .filter((r) => r.date === date && r.zoneId === z.id)
          .reduce((s, r) => s + (r.salesCents ?? 0), 0),
        analyticsDataset.sales
          .filter((r) => r.date === date && r.zoneId === z.id)
          .reduce((s, r) => s + r.netSalesCents, 0),
      );
    }
  }
});
test("peak is derived, varies by day, missing is null, ties choose earliest", () => {
  assert.equal(peakHour(data, "2026-10-20"), 18);
  assert.equal(peakHour(data, "2026-10-21"), 19);
  assert.equal(peakHour(data, "2026-10-22"), 18);
  assert.equal(peakHour(data, "bad-date"), null);
  assert.equal(
    peakHour(
      {
        ...data,
        storeHours: [
          { date: "x", hour: 19, entries: 9 },
          { date: "x", hour: 12, entries: 9 },
        ],
      },
      "x",
    ),
    12,
  );
});
test("heatmap, Inspector, chart and top zones select the same rows", () => {
  for (const date of data.dates)
    for (const hour of data.hours) {
      for (const z of floorPlan.zones) {
        const a = zoneAt(data, date, hour, z.id),
          chart = hourlySeries(data, date, z.id).find((r) => r.hour === hour)!;
        assert.equal(a.sales, chart.sales);
        assert.equal(a.occupancy, chart.occupancy);
        assert.equal(layerValue(data, date, hour, z.id, "density"), a.density);
        assert.equal(layerValue(data, date, hour, z.id, "oos"), a.oosRate);
      }
      const top = topZones(data, date, hour);
      assert.equal(top.length, 3);
      assert.ok(top[0].occupancy! >= top[1].occupancy!);
    }
});
test("unknown zones and non-merchandise snapshots remain No Data", () => {
  assert.equal(zoneAt(data, "2026-10-22", 18, "missing").sales, null);
  assert.equal(zoneAt(data, "2026-10-22", 18, "F").density, null);
  assert.equal(zoneAt(data, "2026-10-22", 18, "L").oosRate, null);
  assert.equal(zoneAt(data, "2026-10-22", 18, "A", "missing").oosRate, null);
  assert.equal(hourlySeries(data, "missing")[0].sales, null);
  assert.equal(
    zoneAt(data, "2026-10-22", 18, "A", "fixture-a-01").oosRate,
    100,
  );
});
test("time and speed state stay independent from scene selection and camera", () => {
  useExplorer.getState().select("fixture-a-07");
  const before = useExplorer.getState();
  useSpatial.getState().setTime("2026-10-21", 12);
  useSpatial.getState().setLayer("density");
  useSpatial.getState().setSpeed(5);
  assert.equal(useExplorer.getState(), before);
  const good = useSpatial.getState();
  useSpatial.getState().setTime("missing", 12);
  useSpatial.getState().setTime("2026-10-21", 12.5);
  assert.equal(useSpatial.getState(), good);
  assert.ok(validTime(data, "2026-10-22", 22));
  assert.equal(validTime(data, "2026-10-22", 23), false);
  useSpatial.getState().setPlaying(true);
  useSpatial.getState().setTime("2026-10-22", 8);
  assert.equal(useSpatial.getState().playing, false);
  useExplorer.getState().select(null);
  useSpatial.setState({
    activeDataLayer: "normal",
    selectedDate: "2026-10-22",
    selectedHour: 18,
    speed: 1,
    playing: false,
  });
});
test("playback advances one discrete bucket then stops at the final hour", () => {
  assert.deepEqual(nextHour(8, data.hours), { hour: 9, playing: true });
  assert.deepEqual(nextHour(21, data.hours), { hour: 22, playing: false });
  assert.deepEqual(nextHour(22, data.hours), { hour: 22, playing: false });
});
test("playback timer is cleared on effect cleanup and speed changes do not leave duplicate intervals", () => {
  let next = 0,
    ticks = 0;
  const active = new Map<number, { tick: () => void; ms: number }>();
  const timers = {
    setInterval: (tick: () => void, ms: number) => {
      const id = ++next;
      active.set(id, { tick, ms });
      return id;
    },
    clearInterval: (id: number) => {
      active.delete(id);
    },
  };
  const stop = startPlayback(() => ticks++, 1, timers);
  assert.equal(active.size, 1);
  assert.equal(active.get(1)?.ms, 1500);
  active.get(1)!.tick();
  assert.equal(ticks, 1);
  stop();
  assert.equal(active.size, 0);
  const stopFast = startPlayback(() => ticks++, 5, timers);
  assert.equal(active.size, 1);
  assert.equal(active.get(2)?.ms, 300);
  stopFast();
  assert.equal(active.size, 0);
});
test("zone polygon derives all vertices and rotations from the floor plan", () => {
  const z = floorPlan.zones[0],
    vertices = zoneFootprint(z);
  assert.equal(vertices.length, 4);
  assert.deepEqual(vertices[0], [
    z.transform.position[0] - z.transform.size[0] / 2,
    z.transform.position[2] - z.transform.size[2] / 2,
  ]);
  const rotated = zoneFootprint({
    ...z,
    transform: {
      ...z.transform,
      position: [0, 0, 0],
      size: [4, 0.15, 2],
      rotation: [0, Math.PI / 2, 0],
    },
  });
  assert.ok(Math.abs(rotated[0][0] + 1) < 1e-9);
  assert.ok(Math.abs(rotated[0][1] - 2) < 1e-9);
});
