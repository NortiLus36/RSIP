import type { DashboardData } from "@/data/providers";
import type { DataRow } from "@/lib/import/types";
import type {
  ForecastOptions,
  ForecastRow,
  ForecastSnapshot,
} from "@/types/intelligence";
import { inventoryForSku } from "./catalog";
import type { InventoryAssumptions } from "@/types/inventory-planning";
import { salesTotals } from "./selectors";
import { validDate } from "@/lib/import/validate";
export const forecastScenarioFactors = {
  Conservative: 0.85,
  Expected: 1,
  Optimistic: 1.15,
} as const;
export function targetEventFactor(
  calendar: DataRow[],
  date: string,
  sku: string,
  options: ForecastOptions,
) {
  const factor = (kind: "festival" | "promotion") => {
    const mode =
      kind === "festival" ? options.festivalMode : options.promotionMode;
    const n = kind === "festival" ? options.festivalPct : options.promotionPct;
    if (mode === undefined)
      return n ? 1 + n / 100 : eventFactor(calendar, date, sku, kind);
    if (mode === "calendar") return eventFactor(calendar, date, sku, kind);
    const applies = calendar.some(
      (e) =>
        e.kind === kind &&
        String(e.startDate) <= date &&
        String(e.endDate) >= date &&
        (!e.sku || e.sku === sku),
    );
    return applies ? 1 + n / 100 : 1;
  };
  return (
    eventFactor(calendar, date, sku, "preparation") *
    factor("festival") *
    factor("promotion")
  );
}
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
  if (!validDate(options.start) || !validDate(options.cutoff))
    throw Error(
      "กรุณาระบุวันที่เริ่มคาดการณ์และวันที่ใช้ข้อมูลย้อนหลังให้ถูกต้อง",
    );
  if (
    !(options.scenario in forecastScenarioFactors) ||
    [options.festivalMode, options.promotionMode].some(
      (m) => m !== undefined && m !== "calendar" && m !== "manual",
    )
  )
    throw Error("รูปแบบการคาดการณ์หรือโหมดปฏิทินไม่ถูกต้อง");
  if (
    !Number.isInteger(options.horizon) ||
    options.horizon < 1 ||
    options.horizon > 7 ||
    options.start <= options.cutoff
  )
    throw new Error(
      "วันที่เริ่มคาดการณ์ต้องอยู่หลังวันที่ใช้ข้อมูลย้อนหลัง และจำนวนวันต้องเป็นจำนวนเต็ม 1–7 วัน หากทดสอบย้อนหลังให้เลื่อนวันที่ใช้ข้อมูลย้อนหลังให้เร็วขึ้น",
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
    (r) =>
      validDate(r.date) &&
      r.date <= options.cutoff &&
      r.quantity !== undefined &&
      Number.isFinite(r.quantity) &&
      r.quantity >= 0,
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
          category = data.catalog.categories.find((c) => c.id === p.categoryId);
        if (!category)
          throw Error(`SKU ${p.sku}: ไม่มีหมวดสินค้าที่สัมพันธ์กัน (Unmapped)`);
        const zoneId = category.zoneId;
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
        const targetEvent = targetEventFactor(calendar, date, p.sku, options);
        const factor =
          targetEvent *
          (manual && [0, 6].includes(weekday(date))
            ? 1 + options.weekendPct / 100
            : 1);
        const scenario = forecastScenarioFactors[options.scenario];
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
          assumption: `${manual ? "สมมติฐานผู้ใช้ / แผนสินค้า เนื่องจากประวัติวันเดียวกันน้อยกว่า 2 หรือเลือกกำหนดเอง" : "ฐานวันเดียวกันในสัปดาห์ ตัดผลปฏิทินออกจากอดีตก่อน"} × ปัจจัยปฏิทิน ${targetEvent.toFixed(2)} × รูปแบบ ${scenario}; ช่วง ±20% เป็นสมมติฐาน ไม่ใช่ช่วงความเชื่อมั่น`,
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
export function fixtureCapacity(
  data: DashboardData,
  sku: string,
  fixtureId: string,
) {
  const placement = data.catalog.fixtureProducts.find(
    (p) => p.sku === sku && p.fixtureId === fixtureId,
  );
  if (!placement) return null;
  const raw = data.dataset.intelligence?.inventory;
  const latest = raw
    ?.filter((r) => r.sku === sku && r.fixtureId === fixtureId)
    .sort((a, b) =>
      String(a.snapshotDate).localeCompare(String(b.snapshotDate)),
    )
    .at(-1);
  return raw &&
    (!latest ||
      latest.shelfCapacity === undefined ||
      latest.shelfCapacity === "")
    ? null
    : placement.displayCapacity;
}
export function inventoryRecommendation(
  data: DashboardData,
  forecast: ForecastRow[],
  sku: string,
  reviewDays = 1,
  capacities?: number,
  assumptions: InventoryAssumptions = {},
) {
  const planning = data.catalog.planning.find((p) => p.sku === sku),
    stock = inventoryForSku(data.catalog, sku, false),
    shelves = data.catalog.shelfInventory.filter((p) => p.sku === sku);
  const rows = forecast
    .filter((r) => r.sku === sku)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!planning || !rows.length || !shelves.length) return null;
  const lead = assumptions.leadTimeDays ?? planning.leadTimeDays,
    review = assumptions.reviewDays ?? reviewDays,
    safety = assumptions.safetyStock ?? planning.safetyStock;
  for (const n of [
    lead,
    review,
    safety,
    ...Object.values(assumptions.capacities ?? {}),
    ...(capacities === undefined ? [] : [capacities]),
    ...(assumptions.dailyDemand === undefined ? [] : [assumptions.dailyDemand]),
    ...(assumptions.incomingQuantity === undefined
      ? []
      : [assumptions.incomingQuantity]),
  ])
    if (!Number.isFinite(n) || n < 0 || n > 1e9)
      throw Error("ค่าการวางแผนต้องเป็นตัวเลขไม่ติดลบและไม่เกิน1,000,000,000");
  if (!Number.isInteger(review) || review > 7)
    throw Error("Review Days 0–7 และต้องเป็นจำนวนเต็ม");
  if (!Number.isInteger(lead) || lead > 365)
    throw Error("ระยะเวลารอสินค้าเป็นจำนวนเต็ม0–365วัน");
  if (
    rows.some(
      (r) =>
        !validDate(r.date) || !Number.isFinite(r.quantity) || r.quantity < 0,
    ) ||
    new Set(rows.map((r) => r.date)).size !== rows.length
  )
    throw Error("Forecast ราย SKU/วันไม่ถูกต้องหรือซ้ำ");
  const day = (timestamp: string) =>
    new Date(Date.parse(timestamp) + 7 * 3600000).toISOString().slice(0, 10);
  const stockDate = shelves
    .map((r) => day(r.updatedAt))
    .sort()
    .at(-1)!;
  if (stockDate > rows[0].date) return null;
  const start = rows[0].date,
    end = rows.at(-1)!.date,
    horizon = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (horizon > 366) throw Error("ช่วงForecastยาวเกินขอบเขต");
  const daily =
      assumptions.dailyDemand ??
      rows.reduce((sum, r) => sum + r.quantity, 0) / rows.length,
    coverageDays = lead + review;
  let estimatedDays = 0;
  const demandOn = (i: number) => {
    if (assumptions.dailyDemand !== undefined) return daily;
    const r = rows.find((r) => r.date === dateAdd(start, i));
    if (r) return r.quantity;
    estimatedDays++;
    return daily;
  };
  const protection = Array.from({ length: coverageDays }, (_, i) =>
    demandOn(i),
  ).reduce((sum, q) => sum + q, 0);
  const horizonDemand = Array.from(
    { length: horizon },
    (_, i) =>
      assumptions.dailyDemand ??
      rows.find((r) => r.date === dateAdd(start, i))?.quantity ??
      daily,
  );
  const demand = horizonDemand.reduce((sum, q) => sum + q, 0),
    firstDemand = horizonDemand[0];
  const locations = data.catalog.stockLocations.filter((l) => l.sku === sku);
  const batches =
    assumptions.incomingQuantity !== undefined
      ? (() => {
          if (!validDate(assumptions.incomingEta ?? ""))
            throw Error("กรุณาระบุวันที่คาดว่าจะได้รับสินค้าให้ถูกต้อง");
          return [
            {
              quantity: assumptions.incomingQuantity,
              eta: assumptions.incomingEta!,
            },
          ];
        })()
      : locations.flatMap((l) => {
          const basis = day(l.incomingAsOf ?? l.updatedAt);
          return (
            l.incomingBatches ?? [
              { quantity: l.incomingStock, arrivalDays: l.incomingArrivalDays },
            ]
          )
            .filter((b) => b.quantity > 0)
            .map((b) => ({
              quantity: b.quantity,
              eta:
                b.arrivalDays > 36600
                  ? ""
                  : dateAdd(basis, Math.ceil(b.arrivalDays)),
            }));
        });
  const eligible = (days: number) =>
    days === 0
      ? 0
      : batches
          .filter((b) => b.eta && b.eta <= dateAdd(start, days - 1))
          .reduce((sum, b) => sum + b.quantity, 0);
  const inTime = eligible(coverageDays),
    eligibleHorizon = eligible(horizon);
  const placements = data.catalog.fixtureProducts.filter((p) => p.sku === sku);
  const legacyTotal = placements.reduce((sum, p) => sum + p.displayCapacity, 0);
  const refills = placements.map((p) => {
    const shelf = shelves.find((x) => x.fixtureId === p.fixtureId);
    const explicit = assumptions.capacities?.[p.fixtureId];
    const cap =
      explicit ??
      (capacities !== undefined
        ? capacities *
          (legacyTotal
            ? p.displayCapacity / legacyTotal
            : 1 / placements.length)
        : fixtureCapacity(data, sku, p.fixtureId));
    return {
      fixtureId: p.fixtureId,
      shelfStock: shelf?.shelfStock ?? null,
      capacity: cap,
      target: 0,
      replenishment: cap === null || !shelf ? null : 0,
    };
  });
  const capacity = refills.reduce((sum, p) => sum + (p.capacity ?? 0), 0),
    target = Math.min(
      Math.ceil(firstDemand),
      refills.reduce((sum, p) => sum + Math.floor(p.capacity ?? 0), 0),
    );
  const shares = refills
    .filter((p) => p.capacity !== null && p.shelfStock !== null)
    .map((p) => ({
      p,
      exact: capacity ? (target * p.capacity!) / capacity : 0,
    }));
  shares.forEach(({ p, exact }) => (p.target = Math.floor(exact)));
  let remaining = target - shares.reduce((sum, { p }) => sum + p.target, 0);
  for (const { p } of shares.sort(
    (a, b) =>
      b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) ||
      a.p.fixtureId.localeCompare(b.p.fixtureId),
  ))
    if (remaining > 0 && p.target < Math.floor(p.capacity!)) {
      p.target++;
      remaining--;
    }
  let backroomAvailable = Math.max(
    0,
    stock.backroomStock -
      locations.reduce((sum, l) => sum + l.reservedStock, 0),
  );
  for (const p of [...refills].sort(
    (a, b) =>
      (a.shelfStock ?? Infinity) - (b.shelfStock ?? Infinity) ||
      a.fixtureId.localeCompare(b.fixtureId),
  )) {
    if (p.replenishment === null) continue;
    p.replenishment = Math.max(
      0,
      Math.min(
        backroomAvailable,
        Math.max(0, p.capacity! - p.shelfStock!),
        p.target - p.shelfStock!,
      ),
    );
    backroomAvailable -= p.replenishment;
  }
  const replenishment = refills.reduce(
      (sum, p) => sum + (p.replenishment ?? 0),
      0,
    ),
    suggestedOrder = Math.ceil(
      Math.max(0, protection + safety - stock.availableStock - inTime),
    ),
    available = stock.availableStock + eligibleHorizon;
  return {
    ...stock,
    sku,
    demand,
    protection,
    coverageDays,
    stockDate,
    openingStockAssumption: start > dateAdd(stockDate, 1),
    inTime,
    eligibleHorizon,
    capacity,
    replenishment,
    suggestedOrder,
    daysOfSupply: daily ? stock.availableStock / daily : null,
    closing: Math.max(
      0,
      available + (lead <= horizon ? suggestedOrder : 0) - demand,
    ),
    risk:
      stock.shelfStock === 0 && stock.backroomStock > 0
        ? "เติมจากคลังก่อน"
        : available < demand
          ? "เสี่ยงสินค้าหมดทั้งร้าน"
          : daily && stock.availableStock / daily > 30
            ? "Overstock > 30 วัน"
            : "Monitor",
    extrapolated: estimatedDays > 0,
    estimatedDays,
    horizonEstimatedDays:
      assumptions.dailyDemand === undefined
        ? horizonDemand.filter(
            (_, i) => !rows.some((r) => r.date === dateAdd(start, i)),
          ).length
        : 0,
    leadTimeDays: lead,
    reviewDays: review,
    safetyStock: safety,
    dailyDemand: daily,
    refills,
    batches,
    hasMissingCapacity: refills.some((p) => p.capacity === null),
    forecastAssumption:
      rows.some((r) => r.manual) || assumptions.dailyDemand !== undefined,
    horizon,
  };
}
export function profitScenario(input: {
  price: number;
  cost: number;
  demand: number;
  available: number | null;
  constrainStock?: boolean;
  baselineContribution?: number;
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
    Object.entries(input).some(
      ([key, v]) =>
        typeof v === "number" &&
        (!Number.isFinite(v) ||
          (key !== "baselineContribution" && v < 0) ||
          Math.abs(v) > 1e12),
    ) ||
    discount > 100
  )
    throw new Error("ข้อมูล Scenario ไม่ถูกต้อง");
  const supply =
      available === null ? null : available + (orderInTime ? order : 0),
    desired = demand * (1 + uplift / 100),
    sellable =
      supply === null
        ? null
        : Math.min(desired, Math.max(0, supply - wasteUnits)),
    sold =
      input.constrainStock === false || sellable === null ? desired : sellable,
    waste =
      input.constrainStock === false || supply === null
        ? wasteUnits
        : Math.min(supply, wasteUnits);
  const revenue = sold * price * (1 - discount / 100),
    cogs = sold * cost,
    grossProfit = revenue - cogs,
    investment = order * cost,
    wasteLoss = waste * cost,
    extra = labor + campaign + other;
  const contribution = grossProfit - wasteLoss - extra,
    baselineSold =
      available === null || input.constrainStock === false
        ? demand
        : Math.min(demand, available),
    baseline = input.baselineContribution ?? baselineSold * (price - cost),
    unitContribution = price * (1 - discount / 100) - cost;
  if (
    [
      desired,
      revenue,
      cogs,
      grossProfit,
      investment,
      wasteLoss,
      contribution,
      baseline,
    ].some((n) => !Number.isFinite(n) || Math.abs(n) > 1e15)
  )
    throw new Error("ค่าการจำลองมีขนาดสูงเกินขอบเขต");
  return {
    sold,
    desired,
    revenue,
    cogs,
    grossProfit,
    margin: revenue ? (grossProfit / revenue) * 100 : null,
    investment: available === null ? null : investment,
    sellable,
    shortfall: sellable === null ? null : Math.max(0, desired - sellable),
    effectivePrice: price * (1 - discount / 100),
    unitProfit: unitContribution,
    closing:
      supply === null
        ? null
        : Math.max(0, supply - (sellable ?? 0) - Math.min(supply, waste)),
    wasteLoss,
    contribution,
    baseline,
    incremental: contribution - baseline,
    breakEvenQuantity:
      unitContribution > 0
        ? Math.max(0, (baseline + extra + wasteLoss) / unitContribution)
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
