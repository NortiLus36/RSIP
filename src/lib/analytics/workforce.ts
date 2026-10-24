import type { DashboardData } from "@/data/providers";
import type { ForecastOptions } from "@/types/intelligence";
import type { SpatialDataset } from "@/types/spatial";
import { dateAdd, weekday, eventFactor } from "./intelligence";
// Occupancy is a concurrent headcount, never a sum of daily visits.
export function forecastSpatial(
  data: DashboardData,
  options: ForecastOptions,
): SpatialDataset {
  const calendar = data.dataset.intelligence?.calendar ?? [],
    dates = Array.from({ length: options.horizon }, (_, i) =>
      dateAdd(options.start, i),
    );
  const zones = dates.flatMap((date) =>
    data.store.zones.flatMap((zone) =>
      data.spatial.hours.map((hour) => {
        const observed = data.spatial.zones.filter(
          (r) =>
            r.zoneId === zone.id &&
            r.hour === hour &&
            r.date <= options.cutoff &&
            weekday(r.date) === weekday(date) &&
            r.occupancy !== null,
        );
        const days = [...new Set(observed.map((r) => r.date))].sort().slice(-4);
        const rows = observed.filter((r) => days.includes(r.date));
        const skus = data.catalog.products
          .filter((p) =>
            data.catalog.categories.some(
              (c) => c.id === p.categoryId && c.zoneId === zone.id,
            ),
          )
          .map((p) => p.sku);
        const factor = (d: string) =>
          skus.length
            ? skus.reduce((s, sku) => s + eventFactor(calendar, d, sku), 0) /
              skus.length
            : 1;
        const base = rows.length
          ? rows.reduce((s, r) => s + r.occupancy! / factor(r.date), 0) /
            rows.length
          : null;
        const scenario =
          options.scenario === "Conservative"
            ? 0.85
            : options.scenario === "Optimistic"
              ? 1.15
              : 1;
        return {
          date,
          hour,
          zoneId: zone.id,
          occupancy:
            base === null ? null : Math.round(base * factor(date) * scenario),
          salesCents: null,
          transactions: 0,
        };
      }),
    ),
  );
  return {
    ...data.spatial,
    source: "FORECAST",
    dates,
    zones,
    stock: [],
    storeHours: [],
  };
}
