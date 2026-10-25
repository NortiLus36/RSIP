import type { ProductCategory } from "./index";

export interface CatalogCategory extends ProductCategory {
  zoneId: string;
  nameTh: string;
  nameEn: string;
  parentId?: string;
}
export interface Product {
  sku: string;
  categoryId: string;
  nameTh: string;
  nameEn: string;
  brand: string;
  unit: string;
  sellingPrice: number;
  unitCost: number;
  active: boolean;
}
export interface FixtureProduct {
  fixtureId: string;
  sku: string;
  displayCapacity: number;
}
export interface ShelfInventory {
  sku: string;
  fixtureId: string;
  shelfStock: number;
  reservedStock: number;
  updatedAt: string;
}
// Backroom and incoming are stored once per SKU/location, never per display.
export interface StockLocation {
  incomingAsOf?: string;
  incomingBatches?: { quantity: number; arrivalDays: number }[];
  sku: string;
  fixtureId: string;
  backroomStock: number;
  reservedStock: number;
  incomingStock: number;
  incomingArrivalDays: number;
  updatedAt: string;
}
export interface ProductPlanning {
  sku: string;
  averageDailyDemand: number;
  safetyStock: number;
  leadTimeDays: number;
}
export interface ProductCatalog {
  categories: CatalogCategory[];
  products: Product[];
  fixtureProducts: FixtureProduct[];
  shelfInventory: ShelfInventory[];
  stockLocations: StockLocation[];
  planning: ProductPlanning[];
}
