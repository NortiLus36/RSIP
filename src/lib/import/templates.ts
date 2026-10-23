import type { DashboardData } from "@/data/providers";
import type { DataRow, DatasetKind, ImportBundle } from "./types";
import { schemas } from "./schema";
import { safeCsv } from "./parse";
export function sampleRows(kind: DatasetKind, demo: DashboardData): DataRow[] {
  const p = Object.fromEntries(schemas.product.map((f) => [f.name, f.example]));
  p.categoryId = demo.catalog.categories.find(
    (c) => c.zoneId === "A" && c.parentId,
  )!.id;
  const row = Object.fromEntries(schemas[kind].map((f) => [f.name, f.example]));
  row.storeId = demo.store.id;
  if (kind === "product") return [p];
  // Keep only the documented schema, never add hidden fields to downloaded CSVs.
  return [Object.fromEntries(schemas[kind].map((f) => [f.name, row[f.name]]))];
}
export function templateCsv(kind: DatasetKind, demo: DashboardData) {
  const headers = schemas[kind].map((f) => f.name);
  return safeCsv(
    headers,
    sampleRows(kind, demo).map((r) => headers.map((h) => r[h])),
  );
}
export function dictionaryCsv(kind: DatasetKind) {
  return safeCsv(
    ["field", "required", "type", "description", "example"],
    schemas[kind].map((f) => [
      f.name,
      f.required ? "Required" : "Optional",
      f.type,
      f.description,
      f.example,
    ]),
  );
}
export function scenarioBundle(
  name: "oos" | "peak" | "overstock",
  demo: DashboardData,
): ImportBundle {
  const now = new Date().toISOString();
  const wrap = (kind: DatasetKind, rows: DataRow[]) => ({
    rows,
    fileName: `Scenario ${name} / ${kind}`,
    importedAt: now,
  });
  const product = sampleRows("product", demo).map((r) => ({
    ...r,
    sellingPrice: 100,
    unitCost: 60,
    active: true,
  }));
  const inv = sampleRows("inventory", demo).map((r) => ({
    ...r,
    shelfStock: name === "overstock" ? 500 : 0,
    backroomStock: 100,
    reservedStock: 0,
    incomingStock: 0,
    safetyStock: 10,
    averageDailyDemand: name === "overstock" ? 2 : 5,
    leadTimeDays: 3,
    incomingArrivalDays: 2,
  }));
  const sales = sampleRows("sales", demo).map((r) => ({
    ...r,
    quantity: 2,
    unitPrice: 100,
    discountAmount: 0,
    netSalesAmount: 200,
    costAmount: 120,
  }));
  const traffic: DataRow[] = [8, 12, 18, 22].flatMap((hour) =>
    ["A", "B"].map((zoneId, i) => ({
      date: "2026-10-23",
      hour,
      zoneId,
      customerCount:
        name === "peak"
          ? hour === 18
            ? 500 - i * 100
            : hour === 12
              ? 300 - i * 80
              : 20
          : 20,
      occupancyCount:
        name === "peak"
          ? hour === 18
            ? 80 - i * 40
            : hour === 12
              ? 50 - i * 25
              : 5
          : 5,
      transactionCount: name === "peak" && hour === 18 ? 30 : 5,
    })),
  );
  const experience = sampleRows("experience", demo).map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [
        k,
        ["date", "storeId"].includes(k) ? v : Number(v),
      ]),
    ),
  );
  return {
    product: wrap("product", product),
    inventory: wrap("inventory", inv),
    sales: wrap("sales", sales),
    traffic: wrap("traffic", traffic),
    experience: wrap("experience", experience),
  };
}
