import { floorPlan } from "@/config/floor-plan";
import { analyticsDataset } from "./analytics";
import { inventory } from "./inventory";
import type { SpatialDataset } from "@/types/spatial";
import { spatialDates, spatialHours } from "@/config/heatmap";
// Integer allocation preserves every daily total, including money in cents.
function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((s, w) => s + w, 0);
  let used = 0;
  return weights.map((w, i) => {
    const n =
      i === weights.length - 1 ? total - used : Math.floor((total * w) / sum);
    used += n;
    return n;
  });
}
const dates = spatialDates;
const hours = spatialHours;
const profiles = [
  [3, 4, 5, 7, 10, 9, 7, 6, 7, 10, 16, 14, 10, 6, 3],
  [3, 4, 5, 7, 10, 9, 6, 5, 8, 13, 15, 18, 10, 6, 3],
  [3, 4, 5, 7, 11, 9, 7, 6, 9, 15, 20, 17, 11, 6, 3],
];
export const spatialDataset: SpatialDataset = {
  source: "DEMO DATA",
  timezone: "Asia/Bangkok",
  dates,
  hours,
  // Demonstration areas only. Scene units are NOT a survey or real square metres.
  mockAreaSqm: Object.fromEntries(
    floorPlan.zones.map((z) => [
      z.id,
      Math.round(z.transform.size[0] * z.transform.size[2] * 3),
    ]),
  ),
  storeHours: [],
  zones: [],
  stock: [],
};
dates.forEach((date, di) => {
  const context = analyticsDataset.storeDays.find((r) => r.date === date)!;
  const entries = allocate(context.traffic, profiles[di]);
  const transactions = allocate(context.transactions, profiles[di]);
  hours.forEach((hour, hi) =>
    spatialDataset.storeHours.push({ date, hour, entries: entries[hi] }),
  );
  const salesZones = floorPlan.zones.filter((z) =>
    analyticsDataset.sales.some((r) => r.date === date && r.zoneId === z.id),
  );
  const txByZone = hours.map((_, hi) =>
    allocate(
      transactions[hi],
      salesZones.map((z) =>
        analyticsDataset.sales
          .filter((r) => r.date === date && r.zoneId === z.id)
          .reduce((s, r) => s + r.netSalesCents, 0),
      ),
    ),
  );
  floorPlan.zones.forEach((z, zi) => {
    const facts = analyticsDataset.sales.filter(
      (r) => r.date === date && r.zoneId === z.id,
    );
    const weights = profiles[di].map(
      (w, hi) => w * (1 + 0.18 * Math.sin(hi + zi + di)),
    );
    const sales = allocate(
      facts.reduce((s, r) => s + r.netSalesCents, 0),
      weights,
    );
    hours.forEach((hour, hi) => {
      // Exclusive zone occupancy snapshot; never interpreted as hourly footfall.
      const occupancy =
        z.id === "F"
          ? null
          : Math.round(
              (profiles[di][hi] / 20) *
                (12 + ((zi * 7) % 35)) *
                (1 + 0.2 * Math.sin(hi + zi + di)),
            );
      const ti = salesZones.findIndex((v) => v.id === z.id);
      spatialDataset.zones.push({
        date,
        hour,
        zoneId: z.id,
        occupancy,
        salesCents: facts.length ? sales[hi] : null,
        transactions: ti < 0 ? 0 : txByZone[hi][ti],
      });
      floorPlan.fixtures
        .filter((f) => f.zoneId === z.id)
        .forEach((f) => {
          const items = inventory.filter(
            (i) => i.shelfId === f.id && z.id !== "F",
          );
          const oos = items.filter((i, ii) =>
            date === "2026-10-22" && hour === 18
              ? i.onHand === 0
              : (hi + di + zi + ii + Number(f.id.slice(-2))) % 17 === 0,
          ).length;
          spatialDataset.stock.push({
            date,
            hour,
            zoneId: z.id,
            fixtureId: f.id,
            checked: items.length,
            oos,
          });
        });
    });
  });
});
