import { floorPlan, categories } from "@/config/floor-plan";
import { snapshots, hourlyTraffic, inventory } from "@/data/mock";
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
}
export const retailProvider: RetailDataProvider = {
  getStore: async () => floorPlan,
  getSnapshot: async (id) => snapshots.find((s) => s.objectId === id),
  getTraffic: async () => hourlyTraffic,
  getInventory: async () => inventory,
  getCategories: async () => categories,
};
export async function loadDashboard() {
  const [store, traffic, categories, inventory] = await Promise.all([
    retailProvider.getStore(),
    retailProvider.getTraffic(),
    retailProvider.getCategories(),
    retailProvider.getInventory(),
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
  return { store, snapshot, traffic, categories, objectSnapshots, inventory };
}
