import type { Zone } from "@/types";
import type { DataLayer, SpatialDataset } from "@/types/spatial";
import { layerConfig, noDataColor } from "@/config/heatmap";
export function density(people: number | null, area: number | undefined) {
  const value =
    people !== null &&
    Number.isFinite(people) &&
    people >= 0 &&
    area !== undefined &&
    Number.isFinite(area) &&
    area > 0
      ? people / area
      : null;
  return value !== null && Number.isFinite(value) ? value : null;
}
export function stockRate(checked: number, oos: number) {
  return Number.isInteger(checked) &&
    Number.isInteger(oos) &&
    checked > 0 &&
    oos >= 0 &&
    oos <= checked
    ? (oos / checked) * 100
    : null;
}
export function colorLevel(
  value: number | null,
  layer: Exclude<DataLayer, "normal">,
) {
  if (value === null || !Number.isFinite(value) || value < 0)
    return { color: noDataColor, label: "No Data", level: -1 };
  const config = layerConfig[layer];
  const level =
    value < config.thresholds[0] ? 0 : value < config.thresholds[1] ? 1 : 2;
  // Density is continuous: changes inside a band must remain visible too.
  const color =
    layer === "density" ? densityColor(value) : config.colors[level];
  return {
    color,
    label: ["Low / Normal", "Medium / Watch", "High"][level],
    level,
  };
}
function densityColor(value: number) {
  const { colors, thresholds } = layerConfig.density;
  const segment = value < thresholds[0] ? 0 : 1;
  const from = segment === 0 ? 0 : thresholds[0];
  const to = thresholds[segment];
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = channels(colors[segment]),
    b = channels(colors[segment + 1]);
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export function validTime(data: SpatialDataset, date: string, hour: number) {
  return data.dates.includes(date) && data.hours.includes(hour);
}
export function nextHour(hour: number, hours: number[]) {
  const i = hours.indexOf(hour);
  return i < 0 || i >= hours.length - 1
    ? { hour: hours.at(-1) ?? hour, playing: false }
    : { hour: hours[i + 1], playing: i + 1 < hours.length - 1 };
}
export function hourlySeries(
  data: SpatialDataset,
  date: string,
  zoneId?: string,
) {
  return data.hours.map((hour) => {
    const rows = data.zones.filter(
      (r) =>
        r.date === date && r.hour === hour && (!zoneId || r.zoneId === zoneId),
    );
    const sumKnown = (key: "occupancy" | "salesCents") =>
      rows.length && rows.some((r) => r[key] !== null)
        ? rows.reduce((s, r) => s + (r[key] ?? 0), 0)
        : null;
    const salesCents = sumKnown("salesCents");
    return {
      hour,
      name: `${String(hour).padStart(2, "0")}:00`,
      entries:
        zoneId && data.source === "IMPORTED DATA"
          ? (rows[0]?.customerCount ?? null)
          : (data.storeHours.find((r) => r.date === date && r.hour === hour)
              ?.entries ?? null),
      occupancy: sumKnown("occupancy"),
      sales: salesCents === null ? null : salesCents / 100,
      transactions:
        data.source !== "FORECAST" && rows.length
          ? rows.reduce((s, r) => s + r.transactions, 0)
          : null,
    };
  });
}
export function peakHour(data: SpatialDataset, date: string) {
  if (data.source === "FORECAST") {
    const known = data.hours
      .map((hour) => {
        const rows = data.zones.filter(
          (r) => r.date === date && r.hour === hour && r.occupancy !== null,
        );
        return {
          hour,
          occupancy: rows.length
            ? rows.reduce((s, r) => s + r.occupancy!, 0)
            : null,
        };
      })
      .filter((r) => r.occupancy !== null);
    return known.length
      ? known.reduce((a, b) =>
          b.occupancy! > a.occupancy! ||
          (b.occupancy === a.occupancy && b.hour < a.hour)
            ? b
            : a,
        ).hour
      : null;
  }

  const rows = data.storeHours.filter(
    (r) => r.date === date && Number.isFinite(r.entries),
  );
  return rows.length
    ? rows.reduce((best, r) =>
        r.entries > best.entries ||
        (r.entries === best.entries && r.hour < best.hour)
          ? r
          : best,
      ).hour
    : null;
}
export function zoneAt(
  data: SpatialDataset,
  date: string,
  hour: number,
  zoneId: string,
  fixtureId?: string,
) {
  const row = data.zones.find(
    (r) => r.date === date && r.hour === hour && r.zoneId === zoneId,
  );
  const stock = data.stock.filter(
    (r) =>
      r.date === date &&
      r.hour === hour &&
      r.zoneId === zoneId &&
      (!fixtureId || r.fixtureId === fixtureId),
  );
  const checked = stock.reduce((s, r) => s + r.checked, 0);
  const oos = stock.reduce((s, r) => s + r.oos, 0);
  const totalSales = data.zones
    .filter((r) => r.date === date && r.hour === hour)
    .reduce((s, r) => s + (r.salesCents ?? 0), 0);
  return {
    occupancy: row?.occupancy ?? null,
    density: density(row?.occupancy ?? null, data.mockAreaSqm[zoneId]),
    sales: row?.salesCents == null ? null : row.salesCents / 100,
    share:
      row?.salesCents != null && totalSales > 0
        ? (row.salesCents / totalSales) * 100
        : null,
    oosRate: stockRate(checked, oos),
    checked,
    oos,
  };
}
export function layerValue(
  data: SpatialDataset,
  date: string,
  hour: number,
  zoneId: string,
  layer: DataLayer,
) {
  const r = zoneAt(data, date, hour, zoneId);
  return layer === "density"
    ? r.density
    : layer === "sales"
      ? r.sales
      : layer === "oos"
        ? r.oosRate
        : null;
}
export function topZones(data: SpatialDataset, date: string, hour: number) {
  return data.zones
    .filter((r) => r.date === date && r.hour === hour && r.occupancy !== null)
    .sort(
      (a, b) => b.occupancy! - a.occupancy! || a.zoneId.localeCompare(b.zoneId),
    )
    .slice(0, 3);
}
// Footprints derive from the actual floor-plan transform, in world X/Z coordinates.
export function zoneFootprint(zone: Zone): [number, number][] {
  const [x, , z] = zone.transform.position;
  const [w, , d] = zone.transform.size;
  const angle = zone.transform.rotation[1];
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([dx, dz]) => [
    x + dx * Math.cos(angle) + dz * Math.sin(angle),
    z - dx * Math.sin(angle) + dz * Math.cos(angle),
  ]);
}
