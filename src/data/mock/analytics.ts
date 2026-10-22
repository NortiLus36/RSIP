import { floorPlan } from "@/config/floor-plan";
import { inventory } from "./inventory";
import { productCatalog, categoryCostRatios } from "./catalog";
import { hourlyTraffic } from "./traffic";
import type { RetailDataset, SalesRecord } from "@/types/analytics";
const weights: Record<string, number> = {
  A: 18,
  B: 12,
  C: 15,
  D: 9,
  E: 7,
  G: 6,
  H: 7,
  I: 4,
  J: 3,
  K: 6,
  M: 10,
  N: 3,
};
const dates = Array.from(
  { length: 14 },
  (_, i) => `2026-10-${String(i + 9).padStart(2, "0")}`,
);
const sales: SalesRecord[] = [];
const checkoutCount = floorPlan.fixtures.filter(
  (f) => f.kind === "checkout",
).length;
dates.forEach((date, day) => {
  const totalCents = Math.round(28465000 * (0.7 + (day * 0.3) / 13));
  let allocated = 0;
  const zones = Object.entries(weights);
  zones.forEach(([zoneId, weight], zi) => {
    const zoneTotal =
      zi === zones.length - 1
        ? totalCents - allocated
        : Math.round((totalCents * weight) / 100);
    allocated += zoneTotal;
    const fixtures = floorPlan.fixtures.filter((f) => f.zoneId === zoneId);
    let used = 0;
    fixtures.forEach((f, i) => {
      const value =
        i === fixtures.length - 1
          ? zoneTotal - used
          : Math.floor(zoneTotal / fixtures.length);
      used += value;
      const items = inventory.filter((item) => item.shelfId === f.id);
      let skuUsed = 0;
      items.forEach((item, ii) => {
        const skuValue =
          ii === items.length - 1
            ? value - skuUsed
            : Math.floor(value / items.length);
        skuUsed += skuValue;
        sales.push({
          date,
          sku: item.sku,
          fixtureId: f.id,
          zoneId,
          categoryId: item.categoryId,
          netSalesCents: skuValue,
          cogsCents: Math.round(skuValue * categoryCostRatios[zoneId]),
          wasteCents: Math.round(skuValue * 0.011),
        });
      });
    });
  });
});
export const analyticsDataset: RetailDataset = {
  source: "Mock",
  asOf: dates.at(-1)!,
  currency: "THB",
  sales,
  storeDays: dates.map((date, i) => ({
    date,
    traffic:
      i === 13
        ? hourlyTraffic.reduce((sum, h) => sum + h.customers, 0)
        : Math.round(1400 + i * 32),
    transactions: 600 + i * 24,
    laborHours: 180,
    laborCost: 24000,
    satisfied: 231,
    responses: 250,
    promoters: 120,
    passives: 50,
    detractors: 30,
    complaints: 3,
  })),
  checkout: dates.flatMap((date, i) =>
    floorPlan.fixtures
      .filter((f) => f.kind === "checkout")
      .map((f, index) => {
        const transactions =
          Math.floor((600 + i * 24) / checkoutCount) +
          (index < (600 + i * 24) % checkoutCount ? 1 : 0);
        return {
          date,
          fixtureId: f.id,
          transactions,
          totalWaitMinutes: transactions * (3.8 + index * 0.2),
        };
      }),
  ),
  planning: productCatalog.planning.map((item) => ({
    sku: item.sku,
    dailyDemand: item.averageDailyDemand,
    leadTime: item.leadTimeDays,
    safetyStock: item.safetyStock,
    incomingStock: productCatalog.stockLocations
      .filter((r) => r.sku === item.sku)
      .reduce((s, r) => s + r.incomingStock, 0),
    arrivalDays: 2,
  })),
  scenarioDefaults: {
    a: { sales: 25000, cogs: 17000, campaignCost: 4000 },
    b: { sales: 18000, cogs: 9000, campaignCost: 2000 },
  },
  actions: [
    {
      id: "action-001",
      problem: "เติมสินค้าขาดชั้นวาง",
      zoneId: "A",
      severity: 4,
      urgency: 4,
      impact: 4,
      owner: "Demo Operations",
      status: "Open",
      critical: "none",
    },
    {
      id: "action-002",
      problem: "ทบทวนกำลังคนจุดชำระเงิน",
      zoneId: "L",
      severity: 3,
      urgency: 3,
      impact: 4,
      owner: "Demo Service",
      status: "In progress",
      critical: "none",
    },
    {
      id: "action-003",
      problem: "ตรวจทางออกฉุกเฉิน (เหตุการณ์จำลอง)",
      zoneId: "G",
      severity: 1,
      urgency: 1,
      impact: 1,
      owner: "Demo Safety",
      status: "Open",
      critical: "safety",
    },
  ],
};
