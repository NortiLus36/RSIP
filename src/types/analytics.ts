export interface SalesRecord {
  quantity?: number;
  transactionId?: string;
  hour?: number;
  date: string;
  sku: string;
  fixtureId: string;
  zoneId: string;
  categoryId: string;
  netSalesCents: number;
  cogsCents: number;
  wasteCents: number;
}
export interface StoreDay {
  date: string;
  traffic: number;
  transactions: number;
  laborHours: number;
  laborCost: number;
  satisfied: number;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  complaints: number;
}
export interface CheckoutRecord {
  date: string;
  fixtureId: string;
  transactions: number;
  totalWaitMinutes: number;
}
export interface PlanningProfile {
  sku: string;
  dailyDemand: number;
  leadTime: number;
  safetyStock: number;
  incomingStock: number;
  arrivalDays: number;
}
export interface ContributionInput {
  sales: number;
  cogs: number;
  campaignCost: number;
}
export interface ManagementAction {
  id: string;
  problem: string;
  zoneId: string;
  severity: number;
  urgency: number;
  impact: number;
  owner: string;
  status: "Open" | "In progress" | "Done";
  critical: "none" | "safety" | "legal";
}
export interface RetailDataset {
  intelligence?: import("./intelligence").IntelligenceData;
  source: "Mock" | "Imported";
  asOf: string;
  currency: "THB";
  sales: SalesRecord[];
  storeDays: StoreDay[];
  checkout: CheckoutRecord[];
  planning: PlanningProfile[];
  scenarioDefaults: { a: ContributionInput; b: ContributionInput };
  actions: ManagementAction[];
}
export interface AnalyticsFilter {
  zoneId?: string;
  categoryId?: string;
  fixtureId?: string;
  sku?: string;
  from?: string;
  to?: string;
}
export interface ChartDatum {
  name: string;
  sales: number;
  grossProfit?: number;
}
