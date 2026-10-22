import { productCatalog } from "./catalog";
import { inventoryForSku } from "@/lib/analytics/catalog";
import type { InventoryItem } from "@/types";
// Compatibility view for existing analytics. Canonical location stock lives in catalog.
export const inventory: InventoryItem[] = productCatalog.shelfInventory.map(
  (r) => {
    const p = productCatalog.products.find((p) => p.sku === r.sku)!;
    const category = productCatalog.categories.find(
      (c) => c.id === p.categoryId,
    )!;
    return {
      sku: r.sku,
      shelfId: r.fixtureId,
      categoryId: category.parentId!,
      onHand: r.shelfStock,
      reorderPoint: productCatalog.planning.find((p) => p.sku === r.sku)!
        .safetyStock,
      backroomOnHand:
        productCatalog.shelfInventory.find((s) => s.sku === r.sku) === r
          ? inventoryForSku(productCatalog, r.sku).backroomStock
          : 0,
    };
  },
);
