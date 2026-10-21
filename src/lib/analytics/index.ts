import type { InventoryItem, KpiSnapshot } from "@/types";
export function formatPeriod(period: KpiSnapshot["period"]) {
  const date = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(period.to));
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  return `${date} · ${time(period.from)}–${time(period.to)} UTC+7`;
}
export interface AnalyticsCalculator {
  calculate(input: {
    inventory: InventoryItem[];
    from: string;
    to: string;
  }): Promise<KpiSnapshot>;
}
export function formatMetric(value: number, unit: string) {
  return `${unit === "THB" ? "฿" : ""}${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value)}${unit === "%" ? "%" : ""}`;
}
