import { floorPlan } from "@/config/floor-plan";
import type {
  HourlyTraffic,
  InventoryItem,
  KpiMetric,
  KpiSnapshot,
} from "@/types";
export const storeMetrics: KpiMetric[] = [
  {
    key: "netSales",
    label: "ยอดขายสุทธิ",
    value: 284650,
    unit: "THB",
    definition: "ยอดขายหลังหักส่วนลดและคืนสินค้า",
    change: "+12.8%",
    trend: "good",
  },
  {
    key: "grossMargin",
    label: "อัตรากำไรขั้นต้น",
    value: 24.6,
    unit: "%",
    definition: "กำไรขั้นต้น / ยอดขายสุทธิ × 100",
    change: "+2.4 pp",
    trend: "good",
  },
  {
    key: "oosRate",
    label: "สินค้าขาดชั้นวาง",
    value: 3.2,
    unit: "%",
    definition: "SKU ที่ไม่มีสินค้าบนชั้น / SKU ทั้งหมด × 100",
    change: "−0.8 pp",
    trend: "good",
  },
  {
    key: "traffic",
    label: "ลูกค้าเข้าร้าน",
    value: 1842,
    unit: "people",
    definition: "จำนวนผู้เข้าร้านสะสมในช่วงเวลา",
    change: "+8.2%",
    trend: "good",
  },
  {
    key: "waitTime",
    label: "เวลารอชำระเงิน",
    value: 4.5,
    unit: "minutes",
    definition: "เวลาเฉลี่ยตั้งแต่เข้าคิวจนเริ่มชำระเงิน",
    change: "+0.6 min",
    trend: "warning",
  },
  {
    key: "csat",
    label: "ความพึงพอใจ",
    value: 92.4,
    unit: "%",
    definition: "คำตอบพึงพอใจ / คำตอบทั้งหมด × 100",
    change: "+1.2 pp",
    trend: "good",
  },
  {
    key: "waste",
    label: "มูลค่าสินค้าสูญเสีย",
    value: 3200,
    unit: "THB",
    definition: "ต้นทุนสินค้าที่ทิ้งหรือเสียหาย",
    change: "−4.1%",
    trend: "good",
  },
  {
    key: "grossProfit",
    label: "กำไรขั้นต้น",
    value: 70023.9,
    unit: "THB",
    definition: "ยอดขายสุทธิลบต้นทุนขาย",
    change: "+14.2%",
    trend: "good",
  },
];
export const period = {
  from: "2026-10-21T00:00:00+07:00",
  to: "2026-10-21T18:00:00+07:00",
};
const snapshot = (objectId: string, factor: number): KpiSnapshot => ({
  objectId,
  period,
  source: "Mock",
  metrics: storeMetrics.map((m) => ({
    ...m,
    value: ["netSales", "grossProfit", "waste", "traffic"].includes(m.key)
      ? Math.round(m.value * factor)
      : m.value,
  })),
});
const weights = [18, 12, 15, 9, 7, 0, 6, 7, 4, 3, 6, 0, 13];
export const snapshots = [
  snapshot(floorPlan.id, 1),
  ...floorPlan.zones.map((z, i) => snapshot(z.id, weights[i] / 100)),
  ...floorPlan.fixtures
    .filter((f) => !["F", "L"].includes(f.zoneId))
    .map((f) => {
      const factor =
        weights[floorPlan.zones.findIndex((z) => z.id === f.zoneId)] /
        100 /
        floorPlan.fixtures.filter((other) => other.zoneId === f.zoneId).length;
      const data = snapshot(f.id, factor);
      return {
        ...data,
        metrics: data.metrics.filter((metric) =>
          ["netSales", "oosRate"].includes(metric.key),
        ),
      };
    }),
];
export const hourlyTraffic: HourlyTraffic[] = [
  76, 104, 138, 196, 228, 182, 163, 211, 278, 266,
].map((customers, i) => ({
  hour: `${String(i + 9).padStart(2, "0")}:00`,
  customers,
}));
export const inventory: InventoryItem[] = floorPlan.fixtures
  .filter((f) => !["checkout", "trolley", "pallet"].includes(f.kind))
  .map((f, i) => ({
    sku: `MOCK-SKU-${String(i + 1).padStart(3, "0")}`,
    shelfId: f.id,
    categoryId: `category-${f.zoneId.toLowerCase()}`,
    onHand: 40 + i * 7,
    reorderPoint: 20,
    backroomOnHand: 90 + i * 11,
  }));
