import type { DashboardData } from "@/data/providers";
import type {
  ForecastOptions,
  ForecastRow,
  StaffTask,
} from "@/types/intelligence";
import type { InventoryAssumptions } from "@/types/inventory-planning";
import { dateAdd, inventoryRecommendation } from "./intelligence";
import { inventoryRef } from "./inventory-actions";
import { validDate } from "@/lib/import/validate";

export function profitSource(
  data: DashboardData,
  rows: ForecastRow[],
  sku: string,
  options: ForecastOptions,
) {
  const product = data.catalog.products.find((p) => p.sku === sku && p.active);
  const end =
    validDate(options.start) &&
    Number.isInteger(options.horizon) &&
    options.horizon > 0 &&
    options.horizon <= 366
      ? dateAdd(options.start, options.horizon - 1)
      : null;
  const selected = end
    ? rows.filter(
        (r) => r.sku === sku && r.date >= options.start && r.date <= end,
      )
    : [];
  const complete =
    !!end &&
    selected.length === options.horizon &&
    new Set(selected.map((r) => r.date)).size === options.horizon &&
    selected.every(
      (r) =>
        validDate(r.date) && Number.isFinite(r.quantity) && r.quantity >= 0,
    );
  return {
    product,
    end,
    rows: complete ? selected : [],
    quantity: complete
      ? selected.reduce((sum, r) => sum + r.quantity, 0)
      : null,
    forecastReference: inventoryRef([
      data.dataset.intelligence?.reference,
      options,
      selected,
    ]),
    assumed: selected.some((r) => r.manual),
  };
}

// Inventory validation must never gate price × quantity profitability.
export function profitStock(
  data: DashboardData,
  rows: ForecastRow[],
  sku: string,
  review: number,
  assumptions?: InventoryAssumptions,
) {
  try {
    const plan = inventoryRecommendation(
      data,
      rows,
      sku,
      review,
      undefined,
      assumptions,
    );
    return {
      plan,
      warning: plan
        ? ""
        : "ยังไม่ได้ตรวจสอบความเพียงพอของสินค้า: ไม่มีสต็อกเปิดงวดหรือข้อมูลแผนที่ตรงกับช่วงคาดการณ์",
    };
  } catch (error) {
    return {
      plan: null,
      warning: `ตรวจแผนสต็อกไม่ได้ (${String(error).replace("Error: ", "").replace("Review Days 0–7 และต้องเป็นจำนวนเต็ม", "รอบการสั่งซื้อต้องเป็นจำนวนเต็ม 0–7 วัน")}) กำไรพื้นฐานยังคำนวณได้จากราคา ต้นทุน และจำนวนขาย`,
    };
  }
}
export function matchingLabor(
  tasks: StaffTask[],
  reference: string,
  sku: string,
  start: string,
  end: string | null,
) {
  return end
    ? tasks
        .filter(
          (t) =>
            t.reference === reference &&
            t.sku === sku &&
            !t.taskType &&
            t.date >= start &&
            t.date <= end &&
            t.status !== "Done",
        )
        .reduce(
          (sum, t) =>
            sum +
            (Number.isFinite(t.laborCost) && t.laborCost! >= 0
              ? t.laborCost!
              : 0),
          0,
        )
    : 0;
}

export function matchingWaste(
  data: DashboardData,
  sku: string,
  start: string,
  end: string | null,
) {
  return end
    ? (data.dataset.intelligence?.waste ?? [])
        .filter(
          (r) =>
            r.sku === sku &&
            validDate(String(r.date)) &&
            String(r.date) >= start &&
            String(r.date) <= end &&
            typeof r.quantity === "number" &&
            Number.isFinite(r.quantity) &&
            r.quantity >= 0,
        )
        .reduce((sum, r) => sum + Number(r.quantity), 0)
    : 0;
}
