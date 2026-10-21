import { floorPlan } from "@/config/floor-plan";
import type { InventoryItem } from "@/types";
// SKU/object identities retain the Phase 2 order. Two shelf stockouts are now explicit observations.
export const inventory: InventoryItem[] = floorPlan.fixtures
  .filter((f) => !["checkout", "trolley", "pallet"].includes(f.kind))
  .map((f, i) => ({
    sku: `MOCK-SKU-${String(i + 1).padStart(3, "0")}`,
    shelfId: f.id,
    categoryId: `category-${f.zoneId.toLowerCase()}`,
    onHand: i === 0 || i === 10 ? 0 : 40 + i * 7,
    reorderPoint: 20,
    backroomOnHand: 90 + i * 11,
  }));
