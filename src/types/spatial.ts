export type DataLayer = "normal" | "density" | "sales" | "oos";
export interface ZoneHour {
  date: string;
  hour: number;
  zoneId: string;
  occupancy: number | null;
  salesCents: number | null;
  transactions: number;
  customerCount?: number;
}
export interface StockHour {
  date: string;
  hour: number;
  zoneId: string;
  fixtureId: string;
  checked: number;
  oos: number;
}
export interface SpatialDataset {
  source: "DEMO DATA" | "IMPORTED DATA" | "FORECAST";
  timezone: "Asia/Bangkok";
  dates: string[];
  hours: number[];
  mockAreaSqm: Record<string, number>;
  storeHours: { date: string; hour: number; entries: number }[];
  zones: ZoneHour[];
  stock: StockHour[];
}
