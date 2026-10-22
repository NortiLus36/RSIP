import type { Store, InventoryItem, KpiSnapshot, KpiMetric } from "@/types";
import type {
  AnalyticsFilter,
  RetailDataset,
  ChartDatum,
  SalesRecord,
} from "@/types/analytics";
import { csat, grossMargin, oosRate } from "./calculators";
export function rowsFor(data: RetailDataset, filter: AnalyticsFilter = {}) {
  return data.sales.filter(
    (r) =>
      (!filter.zoneId || r.zoneId === filter.zoneId) &&
      (!filter.categoryId || r.categoryId === filter.categoryId) &&
      (!filter.fixtureId || r.fixtureId === filter.fixtureId) &&
      (!filter.sku || r.sku === filter.sku) &&
      (!filter.from || r.date >= filter.from) &&
      (!filter.to || r.date <= filter.to),
  );
}
export function salesTotals(rows: SalesRecord[]) {
  const sales = rows.reduce((sum, r) => sum + r.netSalesCents, 0);
  const cogs = rows.reduce((sum, r) => sum + r.cogsCents, 0);
  return {
    sales: sales / 100,
    cogs: cogs / 100,
    grossProfit: (sales - cogs) / 100,
    waste: rows.reduce((sum, r) => sum + r.wasteCents, 0) / 100,
  };
}
export function filterForObject(
  store: Store,
  id: string,
): AnalyticsFilter | null {
  if (id === store.id) return {};
  const fixture = store.fixtures.find((f) => f.id === id);
  if (fixture) return { fixtureId: id };
  if (store.zones.some((z) => z.id === id)) return { zoneId: id };
  return null;
}
export function currentRows(
  data: RetailDataset,
  filter: AnalyticsFilter = {},
  weekly = false,
) {
  const from = weekly ? shiftDate(data.asOf, -6) : data.asOf;
  return rowsFor(data, { ...filter, from, to: data.asOf });
}
export function shiftDate(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function categoryChart(rows: SalesRecord[], store: Store): ChartDatum[] {
  return store.zones
    .map((z) => {
      const total = salesTotals(rows.filter((r) => r.zoneId === z.id));
      return {
        name: `${z.id} · ${z.name}`,
        sales: total.sales,
        grossProfit: total.grossProfit,
      };
    })
    .filter((r) => r.sales > 0);
}
export function trendChart(
  data: RetailDataset,
  filter: AnalyticsFilter = {},
  weekly = false,
): ChartDatum[] {
  const rows = rowsFor(data, filter);
  const dates = [...new Set(data.sales.map((r) => r.date))].sort();
  if (weekly)
    return [dates.slice(0, 7), dates.slice(7)].map((group) => ({
      name: `${group[0].slice(5)}–${group.at(-1)!.slice(5)}`,
      sales: salesTotals(rows.filter((r) => group.includes(r.date))).sales,
    }));
  return dates.map((date) => ({
    name: date.slice(5),
    sales: salesTotals(rows.filter((r) => r.date === date)).sales,
  }));
}
function metric(
  key: KpiMetric["key"],
  label: string,
  value: number | null,
  unit: KpiMetric["unit"],
  definition: string,
): KpiMetric[] {
  return value === null
    ? []
    : [{ key, label, value, unit, definition, change: "", trend: "good" }];
}
export function snapshotFor(
  data: RetailDataset,
  inventory: InventoryItem[],
  store: Store,
  id: string,
): KpiSnapshot | undefined {
  const filter = filterForObject(store, id);
  if (!filter) return undefined;
  const rows = currentRows(data, filter);
  const totals = salesTotals(rows);
  const skus = new Set(rows.map((r) => r.sku));
  const checked = inventory.filter((i) => skus.has(i.sku));
  const metrics: KpiMetric[] = rows.length
    ? [
        ...metric(
          "netSales",
          "ยอดขายสุทธิ",
          totals.sales,
          "THB",
          "ยอดขายสุทธิรวมจาก SKU ในช่วงเวลาที่ระบุ",
        ),
        ...metric(
          "grossProfit",
          "กำไรขั้นต้น",
          totals.grossProfit,
          "THB",
          "ยอดขายสุทธิ − ต้นทุนขาย",
        ),
        ...metric(
          "grossMargin",
          "อัตรากำไรขั้นต้น",
          grossMargin(totals.sales, totals.cogs),
          "%",
          "กำไรขั้นต้น / ยอดขายสุทธิ × 100",
        ),
        ...metric(
          "oosRate",
          "สินค้าขาดชั้นวาง",
          oosRate(checked.filter((i) => i.onHand === 0).length, checked.length),
          "%",
          "SKU ที่ onHand บนชั้น = 0 / SKU ที่ตรวจ ณ snapshot × 100",
        ),
        ...metric(
          "waste",
          "มูลค่าสูญเสีย",
          totals.waste,
          "THB",
          "ต้นทุนสินค้าสูญเสียรวมจากแถวข้อมูล",
        ),
      ]
    : [];
  if (id === store.id) {
    const today = data.storeDays.find((d) => d.date === data.asOf)!;
    metrics.push(
      ...metric(
        "traffic",
        "ลูกค้าเข้าร้าน",
        today.traffic,
        "people",
        "จำนวนผู้เข้าร้านรายวัน",
      ),
      ...metric(
        "csat",
        "ความพึงพอใจ",
        csat(today.satisfied, today.responses),
        "%",
        "คำตอบพึงพอใจ / คำตอบทั้งหมด × 100",
      ),
    );
  }
  const checkout = data.checkout.filter(
    (r) =>
      r.date === data.asOf &&
      (id === store.id || id === "L" || id === r.fixtureId),
  );
  const count = checkout.reduce((s, r) => s + r.transactions, 0);
  if (count)
    metrics.push(
      ...metric(
        "waitTime",
        "เวลารอชำระเงิน",
        checkout.reduce((s, r) => s + r.totalWaitMinutes, 0) / count,
        "minutes",
        "เวลาเข้าคิวจนเริ่มชำระเงิน เฉลี่ยถ่วงน้ำหนักตามธุรกรรม",
      ),
    );
  return {
    objectId: id,
    period: {
      from: `${data.asOf}T00:00:00+07:00`,
      to: `${data.asOf}T23:00:00+07:00`,
    },
    source: "Mock",
    metrics,
  };
}
