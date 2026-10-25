import type { DataRow } from "@/lib/import/types";
export interface IntelligenceData {
  reference: string;
  sourceLabel: string;
  sales: DataRow[];
  inventory: DataRow[];
  calendar: DataRow[];
  supply: DataRow[];
  workforce: DataRow[];
  feedback: DataRow[];
  waste: DataRow[];
}
export interface ForecastOptions {
  festivalMode?: "calendar" | "manual";
  promotionMode?: "calendar" | "manual";
  start: string;
  horizon: number;
  cutoff: string;
  scenario: "Conservative" | "Expected" | "Optimistic";
  manual: boolean;
  baseDemand: number;
  weekendPct: number;
  festivalPct: number;
  promotionPct: number;
}
export interface ForecastRow {
  date: string;
  sku: string;
  zoneId: string;
  quantity: number;
  low: number;
  high: number;
  revenue: number;
  baseline: number;
  samples: number;
  manual: boolean;
  assumption: string;
}
export interface ForecastSnapshot {
  scope?: { categoryId: string; sku: string };
  totals?: { quantity: number; revenue: number; low: number; high: number };
  assumptions?: string[];
  selectedSku?: string;
  selectedCategory?: string;
  id: string;
  createdAt: string;
  reference: string;
  storeId: string;
  options: ForecastOptions;
  rows: ForecastRow[];
  backtest: boolean;
}
export interface StaffTask {
  taskType?: "Replenishment" | "PurchaseReview";
  productName?: string;
  quantity?: number;
  unit?: string;
  inventoryReference?: string;
  forecastReference?: string;
  dedupKey?: string;
  laborCost?: number;
  id: string;
  actionId: string;
  reference: string;
  date: string;
  hour: number;
  zoneId: string;
  sku?: string;
  fixtureId?: string;
  role: string;
  priority: "Monitor" | "Standby" | "Reinforce";
  status: "Open" | "In progress" | "Done";
  reason: string;
}
export interface QuickReport {
  taskId?: string;
  id: string;
  reference: string;
  createdAt: string;
  zoneId: string;
  sku: string;
  fixtureId: string;
  count: number;
  replenished: number;
  category: string;
  note: string;
  status: "Pending" | "Approved" | "Rejected";
  reviewedAt?: string;
  resolutionAt?: string;
}
export interface StaffFeedback {
  reference?: string;
  id: string;
  createdAt: string;
  category: string;
  description: string;
  status: "Open" | "In progress" | "Done";
}
