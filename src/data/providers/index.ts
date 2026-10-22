import { floorPlan } from "@/config/floor-plan";
import { spatialDataset } from "@/data/mock/spatial";
import type { SpatialDataset } from "@/types/spatial";
import {
  snapshots,
  hourlyTraffic,
  inventory,
  analyticsDataset,
} from "@/data/mock";
import type { RetailDataset } from "@/types/analytics";
import type { ProductCatalog } from "@/types/catalog";
import { productCatalog } from "@/data/mock/catalog";
import { validateCatalog } from "@/lib/analytics/catalog";
import type {
  Store,
  KpiSnapshot,
  HourlyTraffic,
  InventoryItem,
  ProductCategory,
} from "@/types";
export interface RetailDataProvider {
  getStore(): Promise<Store>;
  getSnapshot(objectId: string): Promise<KpiSnapshot | undefined>;
  getTraffic(): Promise<HourlyTraffic[]>;
  getInventory(): Promise<InventoryItem[]>;
  getCategories(): Promise<ProductCategory[]>;
  getAnalytics(): Promise<RetailDataset>;
  getSpatial(): Promise<SpatialDataset>;
  getCatalog(): Promise<ProductCatalog>;
}
export const retailProvider: RetailDataProvider = {
  getStore: async () => floorPlan,
  getSnapshot: async (id) => snapshots.find((s) => s.objectId === id),
  getTraffic: async () => hourlyTraffic,
  getInventory: async () => inventory,
  getCategories: async () => productCatalog.categories,
  getAnalytics: async () => analyticsDataset,
  getSpatial: async () => spatialDataset,
  getCatalog: async () => {
    const errors = validateCatalog(productCatalog, floorPlan);
    if (errors.length) throw new Error(`Invalid catalog: ${errors.join(", ")}`);
    return productCatalog;
  },
};
export async function loadDashboard() {
  const [store, traffic, categories, inventory, dataset, spatial, catalog] =
    await Promise.all([
      retailProvider.getStore(),
      retailProvider.getTraffic(),
      retailProvider.getCategories(),
      retailProvider.getInventory(),
      retailProvider.getAnalytics(),
      retailProvider.getSpatial(),
      retailProvider.getCatalog(),
    ]);
  const snapshot = await retailProvider.getSnapshot(store.id);
  if (!snapshot) throw new Error("Store KPI snapshot is missing");
  const results = await Promise.all(
    [...store.zones, ...store.fixtures].map((object) =>
      retailProvider.getSnapshot(object.id),
    ),
  );
  const objectSnapshots = results.filter(
    (item): item is KpiSnapshot => item !== undefined,
  );
  return {
    store,
    snapshot,
    traffic,
    categories,
    objectSnapshots,
    inventory,
    dataset,
    spatial,
    catalog,
  };
}
export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
