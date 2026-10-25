import type { DashboardData } from "@/data/providers";
import type {
  ForecastOptions,
  ForecastRow,
  StaffTask,
} from "@/types/intelligence";
import { taskAction } from "./operations";
export const inventoryRef = (value: unknown) => {
  const text = JSON.stringify(value);
  let n = 2166136261;
  for (let i = 0; i < text.length; i++)
    n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16);
};
export function createInventoryTask(
  data: DashboardData,
  rows: ForecastRow[],
  options: ForecastOptions,
  input: {
    sku: string;
    fixtureId: string;
    quantity: number;
    type: "Replenishment" | "PurchaseReview";
    reason: string;
    inventoryReference: string;
  },
  existing: StaffTask[],
  id: string,
) {
  if (
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0 ||
    input.quantity > 1e9
  )
    throw Error("ปริมาณงานต้องมากกว่าศูนย์และอยู่ในขอบเขต");
  const p = data.catalog.products.find((p) => p.sku === input.sku),
    fixture = data.store.fixtures.find((f) => f.id === input.fixtureId);
  if (
    !p ||
    !fixture ||
    !data.catalog.fixtureProducts.some(
      (r) => r.sku === p.sku && r.fixtureId === fixture.id,
    )
  )
    throw Error("สินค้าและชั้นวางไม่สัมพันธ์กัน");
  const reference = data.dataset.intelligence?.reference ?? "legacy",
    forecast = rows.filter((r) => r.sku === p.sku);
  if (!forecast.length) throw Error("ไม่มีForecastที่ใช้สร้างคำแนะนำ");
  const forecastReference = `${reference}:${inventoryRef([options, forecast])}`;
  const dedupKey = inventoryRef([
    reference,
    input.sku,
    input.fixtureId,
    input.type,
    input.quantity,
    input.inventoryReference,
    forecastReference,
  ]);
  if (
    existing.some(
      (t) =>
        t.reference === reference &&
        t.dedupKey === dedupKey &&
        t.status !== "Done",
    )
  )
    throw Error("มีงานคำแนะนำเดียวกันที่ยังไม่ปิดแล้ว กรุณาตรวจที่Operations");
  const task: StaffTask = {
    id,
    actionId: `inventory-${id}`,
    reference,
    date: forecast[0].date,
    hour: 8,
    zoneId: fixture.zoneId,
    sku: p.sku,
    fixtureId: fixture.id,
    role:
      input.type === "Replenishment" ? "Store Staff" : "Department Supervisor",
    priority: "Standby",
    status: "Open",
    taskType: input.type,
    productName: p.nameTh,
    quantity: input.quantity,
    unit: p.unit,
    inventoryReference: input.inventoryReference,
    forecastReference,
    dedupKey,
    reason: `${input.type === "Replenishment" ? "เติมขึ้นชั้น" : "พิจารณาสั่งซื้อ (คำแนะนำ ไม่ใช่ Purchase Order)"} ${p.nameTh} / ${p.sku} / ${fixture.id}: ${input.quantity} ${p.unit} · ${input.reason}`,
  };
  return { task, action: taskAction(task) };
}
