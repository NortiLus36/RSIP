import type { DashboardData } from "@/data/providers";
import type { DataRow } from "@/lib/import/types";
import type {
  ForecastOptions,
  ForecastRow,
  ForecastSnapshot,
} from "@/types/intelligence";
import { inventoryForSku } from "./catalog";
import { salesTotals } from "./selectors";
export const dateAdd = (date: string, n: number) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const weekday = (date: string) =>
  new Date(date + "T00:00:00Z").getUTCDay();
export const monday = (date: string) =>
  dateAdd(date, -((weekday(date) + 6) % 7));
export const pct = (value: number, base: number) =>
  base === 0 ? null : ((value - base) / base) * 100;
const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
export function eventFactor(
  calendar: DataRow[],
  date: string,
  sku: string,
  kind?: string,
) {
  return calendar
    .filter(
      (e) =>
        String(e.startDate) <= date &&
        String(e.endDate) >= date &&
        (!e.sku || e.sku === sku) &&
        (!kind || e.kind === kind),
    )
    .reduce((f, e) => f * (1 + Number(e.upliftPct) / 100), 1);
}
export function demandForecast(
  data: DashboardData,
  options: ForecastOptions,
  skus?: string[],
): ForecastRow[] {
  if (
    !Number.isInteger(options.horizon) ||
    options.horizon < 1 ||
    options.horizon > 7 ||
    options.start <= options.cutoff
  )
    throw new Error(
      "Forecast ต้องเริ่มหลัง Training Cutoff และ Horizon 1–7 วัน",
    );
  for (const n of [
    options.baseDemand,
    options.weekendPct,
    options.festivalPct,
    options.promotionPct,
  ])
    if (!Number.isFinite(n) || n < 0 || n > 10000)
      throw new Error("สมมติฐานต้องเป็นตัวเลข 0–10,000");
  const calendar = data.dataset.intelligence?.calendar ?? [];
  const history = data.dataset.sales.filter(
    (r) => r.date <= options.cutoff && r.quantity !== undefined,
  );
  const daily = new Map<string, number>();
  for (const r of history) {
    const k = JSON.stringify([r.sku, r.date]);
    daily.set(k, (daily.get(k) ?? 0) + r.quantity!);
  }
  const historyDates = [...new Set(history.map((r) => r.date))].sort();
  return data.catalog.products
    .filter((p) => p.active && (!skus || skus.includes(p.sku)))
    .flatMap((p) =>
      Array.from({ length: options.horizon }, (_, i) => {
        const date = dateAdd(options.start, i),
          zoneId = data.catalog.categories.find(
            (c) => c.id === p.categoryId,
          )!.zoneId;
        const same = historyDates.filter(
          (d) =>
            weekday(d) === weekday(date) &&
            daily.has(JSON.stringify([p.sku, d])),
        );
        const observed = same
          .slice(-4)
          .map(
            (d) =>
              daily.get(JSON.stringify([p.sku, d]))! /
              eventFactor(calendar, d, p.sku),
          );
        const manual = options.manual || observed.length < 2;
        const plan = data.catalog.planning.find((r) => r.sku === p.sku);
        const baseline = manual
          ? options.manual
            ? options.baseDemand
            : (plan?.averageDailyDemand ?? options.baseDemand)
          : mean(observed);
        // Explicit overrides replace that event class, rather than compounding it twice.
        const targetEvent =
          eventFactor(calendar, date, p.sku, "preparation") *
          (options.festivalPct
            ? 1 + options.festivalPct / 100
            : eventFactor(calendar, date, p.sku, "festival")) *
          (options.promotionPct
            ? 1 + options.promotionPct / 100
            : eventFactor(calendar, date, p.sku, "promotion"));
        const factor =
          targetEvent *
          (manual && [0, 6].includes(weekday(date))
            ? 1 + options.weekendPct / 100
            : 1);
        const scenario =
          options.scenario === "Conservative"
            ? 0.85
            : options.scenario === "Optimistic"
              ? 1.15
              : 1;
        const q = Math.max(0, Math.ceil(baseline * factor * scenario));
        if (!Number.isSafeInteger(q) || q > 1e9)
          throw new Error("Forecast เกินขอบเขต MVP");
        return {
          date,
          sku: p.sku,
          zoneId,
          quantity: q,
          low: Math.floor(q * 0.8),
          high: Math.ceil(q * 1.2),
          revenue: Math.round(q * p.sellingPrice * 100) / 100,
          baseline,
          samples: observed.length,
          manual,
          assumption: `${manual ? "Manual assumption (ประวัติ weekday < 2 หรือผู้ใช้เลือก)" : "Same-weekday baseline; normalize calendar effects ออกจากประวัติ"} × calendar ${targetEvent.toFixed(2)} × extra festival/promotion × ${options.scenario}; range ±20% เป็นสมมติฐาน ไม่ใช่ช่วงความเชื่อมั่น`,
        };
      }),
    );
}
export function comparePeriod(
  data: DashboardData,
  from: string,
  to: string,
  previousFrom: string,
  zoneId = "",
  categoryId = "",
) {
  const count = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (count < 1 || count > 366) throw new Error("ช่วงเปรียบเทียบ 1–366 วัน");
  const categorySkus = new Set(
    data.catalog.products
      .filter(
        (p) =>
          p.categoryId === categoryId ||
          data.catalog.categories.some(
            (c) => c.id === p.categoryId && c.parentId === categoryId,
          ),
      )
      .map((p) => p.sku),
  );
  const filter = (a: string, b: string) =>
    data.dataset.sales.filter(
      (r) =>
        r.date >= a &&
        r.date <= b &&
        (!zoneId || r.zoneId === zoneId) &&
        (!categoryId || r.categoryId === categoryId || categorySkus.has(r.sku)),
    );
  const priorTo = dateAdd(previousFrom, count - 1),
    current = filter(from, to),
    previous = filter(previousFrom, priorTo);
  const days = new Set(data.dataset.sales.map((r) => r.date));
  const rows = Array.from({ length: count }, (_, i) => {
    const d = dateAdd(from, i),
      p = dateAdd(previousFrom, i);
    return {
      date: d,
      previousDate: p,
      actual: days.has(d)
        ? salesTotals(current.filter((r) => r.date === d)).sales
        : null,
      previous: days.has(p)
        ? salesTotals(previous.filter((r) => r.date === p)).sales
        : null,
    };
  });
  // Compare only matched observed calendar days; no invented zero values for missing coverage.
  const matched = rows.filter((r) => r.actual !== null && r.previous !== null);
  const sales = matched.reduce((s, r) => s + r.actual!, 0),
    prior = matched.reduce((s, r) => s + r.previous!, 0);
  const peak =
    rows
      .filter((r) => r.actual !== null)
      .sort((a, b) => b.actual! - a.actual!)[0] ?? null;
  const transactions = current.some((r) => r.transactionId)
    ? new Set(current.map((r) => r.transactionId).filter(Boolean)).size
    : null;
  return {
    current,
    previous,
    rows,
    totals: salesTotals(current),
    transactions,
    change: matched.length ? pct(sales, prior) : null,
    matched: matched.length,
    coverage: rows.filter((r) => r.actual !== null).length,
    expected: count,
    peak,
    priorTo,
  };
}
export function inventoryRecommendation(
  data: DashboardData,
  forecast: ForecastRow[],
  sku: string,
  reviewDays = 1,
  capacities?: number,
) {
  const planning = data.catalog.planning.find((p) => p.sku === sku),
    stock = inventoryForSku(data.catalog, sku),
    rows = forecast
      .filter((r) => r.sku === sku)
      .sort((a, b) => a.date.localeCompare(b.date));
  if (
    !planning ||
    !rows.length ||
    !data.catalog.shelfInventory.some((r) => r.sku === sku)
  )
    return null;
  if (!Number.isFinite(reviewDays) || reviewDays < 0 || reviewDays > 7)
    throw new Error("Review Days 0–7");
  const stockDate = data.catalog.shelfInventory
    .filter((r) => r.sku === sku)
    .map((r) =>
      new Date(Date.parse(r.updatedAt) + 7 * 3600000)
        .toISOString()
        .slice(0, 10),
    )
    .sort()
    .at(-1)!;
  // A later stock snapshot cannot serve as historical opening stock.
  if (stockDate > rows[0].date) return null;
  const elapsed = Math.max(
    0,
    Math.round((Date.parse(rows[0].date) - Date.parse(stockDate)) / 86400000) -
      1,
  );
  const horizon = rows.length,
    coverageDays = planning.leadTimeDays + reviewDays;
  const daily = rows.reduce((s, r) => s + r.quantity, 0) / horizon;
  const protection = Array.from(
    { length: Math.ceil(coverageDays) },
    (_, i) => rows[i]?.quantity ?? daily,
  ).reduce((s, v) => s + v, 0);
  const inTime = data.catalog.stockLocations
    .filter((r) => r.sku === sku)
    .reduce(
      (s, l) =>
        s +
        (l.incomingBatches
          ? l.incomingBatches
              .filter((b) => b.arrivalDays <= elapsed + coverageDays)
              .reduce((v, b) => v + b.quantity, 0)
          : l.incomingArrivalDays <= elapsed + coverageDays
            ? l.incomingStock
            : 0),
      0,
    );
  const eligibleHorizon = data.catalog.stockLocations
    .filter((r) => r.sku === sku)
    .reduce(
      (s, l) =>
        s +
        (l.incomingBatches
          ? l.incomingBatches
              .filter((b) => b.arrivalDays <= elapsed + horizon)
              .reduce((v, b) => v + b.quantity, 0)
          : l.incomingArrivalDays <= elapsed + horizon
            ? l.incomingStock
            : 0),
      0,
    );
  const capacity =
    capacities ??
    data.catalog.fixtureProducts
      .filter((r) => r.sku === sku)
      .reduce((s, r) => s + r.displayCapacity, 0);
  const replenishment = Math.max(
    0,
    Math.min(
      Math.max(
        0,
        stock.backroomStock -
          data.catalog.stockLocations
            .filter((l) => l.sku === sku)
            .reduce((s, l) => s + l.reservedStock, 0),
      ),
      Math.max(0, Math.min(capacity, rows[0].quantity) - stock.shelfStock),
    ),
  );
  const suggestedOrder = Math.ceil(
    Math.max(
      0,
      protection + planning.safetyStock - stock.availableStock - inTime,
    ),
  );
  const demand = rows.reduce((s, r) => s + r.quantity, 0),
    available = stock.availableStock + eligibleHorizon;
  return {
    ...stock,
    sku,
    demand,
    protection,
    coverageDays,
    stockDate,
    openingStockAssumption: elapsed > 0,
    inTime,
    eligibleHorizon,
    capacity,
    replenishment,
    suggestedOrder,
    daysOfSupply: daily ? stock.availableStock / daily : null,
    closing: Math.max(
      0,
      available +
        (planning.leadTimeDays <= horizon ? suggestedOrder : 0) -
        demand,
    ),
    risk:
      stock.shelfStock === 0 && stock.backroomStock > 0
        ? "เติมจากคลังก่อน"
        : available < demand
          ? "เสี่ยงสินค้าหมดทั้งร้าน"
          : daily && stock.availableStock / daily > 30
            ? "Overstock > 30 วัน"
            : "Monitor",
    extrapolated: coverageDays > horizon,
  };
}
export function profitScenario(input: {
  price: number;
  cost: number;
  demand: number;
  available: number;
  order: number;
  discount: number;
  uplift: number;
  labor: number;
  campaign: number;
  wasteUnits: number;
  other: number;
  orderInTime: boolean;
}) {
  const {
    price,
    cost,
    demand,
    available,
    order,
    discount,
    uplift,
    labor,
    campaign,
    wasteUnits,
    other,
    orderInTime,
  } = input;
  if (
    Object.values(input).some(
      (v) =>
        typeof v === "number" && (!Number.isFinite(v) || v < 0 || v > 1e12),
    ) ||
    discount > 100
  )
    throw new Error("ข้อมูล Scenario ไม่ถูกต้อง");
  const supply = available + (orderInTime ? order : 0),
    desired = demand * (1 + uplift / 100),
    sold = Math.min(desired, Math.max(0, supply - wasteUnits)),
    waste = Math.min(supply, wasteUnits);
  const revenue = sold * price * (1 - discount / 100),
    cogs = sold * cost,
    grossProfit = revenue - cogs,
    investment = order * cost,
    wasteLoss = waste * cost,
    extra = labor + campaign + other;
  const contribution = grossProfit - wasteLoss - extra,
    baselineSold = Math.min(demand, available),
    baseline = baselineSold * (price - cost),
    unitContribution = price * (1 - discount / 100) - cost;
  return {
    sold,
    desired,
    revenue,
    cogs,
    grossProfit,
    margin: revenue ? (grossProfit / revenue) * 100 : null,
    investment,
    closing: Math.max(0, supply - sold - waste),
    wasteLoss,
    contribution,
    baseline,
    incremental: contribution - baseline,
    breakEvenQuantity:
      unitContribution > 0
        ? (baseline + extra + wasteLoss) / unitContribution
        : null,
    breakEvenUplift:
      unitContribution > 0 && demand > 0
        ? ((baseline + extra + wasteLoss) / unitContribution / demand - 1) * 100
        : null,
  };
}
export function workforcePlan(
  workload: number,
  productiveMinutes: number,
  available: number,
  hourlyCost: number,
) {
  if (
    [workload, productiveMinutes, available, hourlyCost].some(
      (n) => !Number.isFinite(n) || n < 0,
    ) ||
    productiveMinutes <= 0 ||
    productiveMinutes > 60 ||
    !Number.isInteger(available)
  )
    throw new Error("Workload/Capacity ไม่ถูกต้อง");
  const required = Math.ceil(workload / productiveMinutes),
    additional = Math.max(0, required - available);
  return {
    required,
    additional,
    cost: additional * hourlyCost,
    level:
      additional > 1
        ? ("Reinforce" as const)
        : additional === 1
          ? ("Standby" as const)
          : ("Monitor" as const),
  };
}
export function forecastVariance(
  snapshot: ForecastSnapshot,
  data: DashboardData,
) {
  return snapshot.rows.map((f) => {
    const actual = data.dataset.sales.filter(
      (r) => r.sku === f.sku && r.date === f.date,
    );
    const covered =
      actual.length > 0 && data.catalog.products.some((p) => p.sku === f.sku);
    const inventoryRows =
      data.dataset.intelligence?.inventory.filter(
        (r) => r.sku === f.sku && r.snapshotDate === f.date,
      ) ?? [];
    const warehouses = new Map(
      inventoryRows.map((r) => [
        String(r.storageLocationId),
        Number(r.backroomStock) - Number(r.reservedStock),
      ]),
    );
    const waste =
      data.dataset.intelligence?.waste.filter(
        (r) => r.sku === f.sku && r.date === f.date,
      ) ?? [];
    const stockSnapshot = inventoryRows.length
      ? inventoryRows.reduce((s, r) => s + Number(r.shelfStock), 0) +
        [...warehouses.values()].reduce((s, n) => s + n, 0)
      : null;
    return {
      ...f,
      stockSnapshot,
      actualGrossProfit: covered ? salesTotals(actual).grossProfit : null,
      actualMargin:
        covered && salesTotals(actual).sales
          ? (salesTotals(actual).grossProfit / salesTotals(actual).sales) * 100
          : null,
      variancePct:
        covered && f.quantity && actual.every((r) => r.quantity !== undefined)
          ? ((actual.reduce((sum, r) => sum + r.quantity!, 0) - f.quantity) /
              f.quantity) *
            100
          : null,
      closingInventory:
        inventoryRows.length &&
        inventoryRows.every(
          (r) =>
            r.isClosingSnapshot === true ||
            r.isClosingSnapshot === "true" ||
            r.isClosingSnapshot === 1,
        )
          ? stockSnapshot
          : null,
      wasteQuantity: waste.length
        ? waste.reduce((s, r) => s + Number(r.quantity), 0)
        : null,
      actualQuantity:
        covered && actual.every((r) => r.quantity !== undefined)
          ? actual.reduce((s, r) => s + (r.quantity ?? 0), 0)
          : null,
      actualSales: covered ? salesTotals(actual).sales : null,
      variance:
        covered && actual.every((r) => r.quantity !== undefined)
          ? actual.reduce((s, r) => s + (r.quantity ?? 0), 0) - f.quantity
          : null,
    };
  });
}
