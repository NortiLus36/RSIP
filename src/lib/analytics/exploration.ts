import type { SalesRecord } from "@/types/analytics";
export type Grouping = "zoneId" | "categoryId" | "sku";
export function groupSales(rows: SalesRecord[], group: Grouping) {
  const groups = new Map<
    string,
    { name: string; salesCents: number; cogsCents: number; rows: number }
  >();
  for (const row of rows) {
    const name = row[group];
    const item = groups.get(name) ?? {
      name,
      salesCents: 0,
      cogsCents: 0,
      rows: 0,
    };
    item.salesCents += row.netSalesCents;
    item.cogsCents += row.cogsCents;
    item.rows++;
    groups.set(name, item);
  }
  return [...groups.values()];
}
