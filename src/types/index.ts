export type Vec3 = [number, number, number];
export interface Transform {
  position: Vec3;
  rotation: Vec3;
  size: Vec3;
}
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
}
export interface Zone {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  categoryId: string;
  color: string;
  transform: Transform;
}
export interface Fixture {
  id: string;
  zoneId: string;
  name: string;
  kind: "shelf" | "counter" | "rack";
  transform: Transform;
}
export interface Shelf extends Fixture {
  kind: "shelf";
  capacity: number;
}
export interface SupportArea {
  id: string;
  name: string;
  nameTh: string;
  transform: Transform;
}
export interface Store {
  id: string;
  name: string;
  boundary: [number, number][];
  zones: Zone[];
  fixtures: Fixture[];
  supportAreas: SupportArea[];
}
export type KpiKey =
  | "netSales"
  | "grossMargin"
  | "oosRate"
  | "traffic"
  | "waitTime"
  | "csat"
  | "waste"
  | "grossProfit";
export interface KpiMetric {
  key: KpiKey;
  label: string;
  value: number;
  unit: "THB" | "%" | "people" | "minutes";
  definition: string;
  change: string;
  trend: "good" | "warning";
}
export interface KpiSnapshot {
  objectId: string;
  period: { from: string; to: string };
  source: "Mock";
  metrics: KpiMetric[];
}
export interface HourlyTraffic {
  hour: string;
  customers: number;
}
export interface InventoryItem {
  sku: string;
  shelfId: string;
  categoryId: string;
  onHand: number;
  reorderPoint: number;
}
