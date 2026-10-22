import { floorPlan, categories } from "@/config/floor-plan";
import { spatialDataset } from "@/data/mock/spatial";
import type { SpatialDataset } from "@/types/spatial";
import {
  snapshots,
  hourlyTraffic,
  inventory,
  analyticsDataset,
} from "@/data/mock";
import type { RetailDataset } from "@/types/analytics";
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
}
export const retailProvider: RetailDataProvider = {
  getStore: async () => floorPlan,
  getSnapshot: async (id) => snapshots.find((s) => s.objectId === id),
  getTraffic: async () => hourlyTraffic,
  getInventory: async () => inventory,
  getCategories: async () => categories,
  getAnalytics: async () => analyticsDataset,
  getSpatial: async () => spatialDataset,
};
export async function loadDashboard() {
  const [store, traffic, categories, inventory, dataset, spatial] =
    await Promise.all([
      retailProvider.getStore(),
      retailProvider.getTraffic(),
      retailProvider.getCategories(),
      retailProvider.getInventory(),
      retailProvider.getAnalytics(),
      retailProvider.getSpatial(),
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
  };
}
export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
