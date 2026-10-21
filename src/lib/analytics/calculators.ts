// Pure business math: invalid inputs throw; undefined ratios return null, never NaN/Infinity.
export function nonNegative(value: number, name = "value") {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
    throw new RangeError(
      `${name}: ต้องไม่ติดลบและอยู่ในช่วงตัวเลขที่รองรับอย่างปลอดภัย`,
    );
  return value;
}
export function count(value: number, name = "count") {
  nonNegative(value, name);
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${name}: ต้องเป็นจำนวนเต็มที่ปลอดภัย`);
  return value;
}
export function finite(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
    throw new RangeError("ผลลัพธ์เกินขอบเขตตัวเลขที่รองรับอย่างปลอดภัย");
  return value;
}
export function percentage(value: number) {
  nonNegative(value);
  if (value > 100) throw new RangeError("เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100");
  return value;
}
function ratio(a: number, b: number, multiplier = 1) {
  nonNegative(a);
  nonNegative(b);
  return b === 0 ? null : finite((a / b) * multiplier);
}
export function grossProfit(netSales: number, cogs: number) {
  return finite(nonNegative(netSales) - nonNegative(cogs));
}
export function grossMargin(netSales: number, cogs: number) {
  const profit = grossProfit(netSales, cogs);
  return netSales === 0 ? null : finite((profit / netSales) * 100);
}
export function estimatedSales(
  traffic: number,
  conversion: number,
  abv: number,
) {
  return finite(
    ((count(traffic) * percentage(conversion)) / 100) * nonNegative(abv),
  );
}
export function inventoryPlan(
  dailyDemand: number,
  leadTime: number,
  safetyStock: number,
  availableStock: number,
  incomingStock: number,
  arrivalDays = 0,
) {
  [
    dailyDemand,
    leadTime,
    safetyStock,
    availableStock,
    incomingStock,
    arrivalDays,
  ].forEach((v) => nonNegative(v));
  const eligibleIncoming = arrivalDays <= leadTime ? incomingStock : 0;
  const leadTimeDemand = finite(dailyDemand * leadTime);
  const targetStock = finite(leadTimeDemand + safetyStock);
  return {
    leadTimeDemand,
    targetStock,
    eligibleIncoming,
    suggestedOrder: finite(
      Math.max(0, targetStock - availableStock - eligibleIncoming),
    ),
    daysOfSupply:
      dailyDemand === 0 ? null : finite(availableStock / dailyDemand),
  };
}
export function oosRate(oos: number, checked: number) {
  count(oos);
  count(checked);
  if (oos > checked) throw new RangeError("OOS SKU ต้องไม่เกิน Checked SKU");
  return ratio(oos, checked, 100);
}
export function csat(satisfied: number, total: number) {
  count(satisfied);
  count(total);
  if (satisfied > total)
    throw new RangeError("ผู้พึงพอใจต้องไม่เกินจำนวนผู้ตอบ");
  return ratio(satisfied, total, 100);
}
export function nps(
  promoters: number,
  passives: number,
  detractors: number,
  total = promoters + passives + detractors,
) {
  [promoters, passives, detractors, total].forEach((v) => count(v));
  const sum = finite(promoters + passives + detractors);
  if (sum !== total)
    throw new RangeError(
      "Promoters + Passives + Detractors ต้องเท่ากับจำนวนผู้ตอบ NPS",
    );
  return total === 0 ? null : finite(((promoters - detractors) / total) * 100);
}
export function complaintRate(complaints: number, transactions: number) {
  count(complaints);
  count(transactions);
  return ratio(complaints, transactions, 1000);
}
export function wasteRatio(waste: number, sales: number) {
  return ratio(waste, sales, 100);
}
export function salesPerLaborHour(sales: number, hours: number) {
  return ratio(sales, hours);
}
export function laborCostRate(cost: number, sales: number) {
  return ratio(cost, sales, 100);
}
export function incrementalContribution(
  sales: number,
  cogs: number,
  campaignCost: number,
) {
  return finite(
    nonNegative(sales) - nonNegative(cogs) - nonNegative(campaignCost),
  );
}
export function priorityScore(
  severity: number,
  urgency: number,
  impact: number,
) {
  [severity, urgency, impact].forEach((v) => {
    count(v);
    if (v < 1 || v > 5) throw new RangeError("คะแนนต้องอยู่ระหว่าง 1–5");
  });
  return severity + urgency + impact;
}
