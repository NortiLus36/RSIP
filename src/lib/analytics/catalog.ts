import type { ProductCatalog } from "@/types/catalog";
import type { Store } from "@/types";
import { inventoryPlan } from "./calculators";

export function inventoryForSku(
  catalog: ProductCatalog,
  sku: string,
  planningMetrics = true,
) {
  const shelves = catalog.shelfInventory.filter((r) => r.sku === sku);
  const locations = catalog.stockLocations.filter((r) => r.sku === sku);
  const plan = catalog.planning.find((r) => r.sku === sku);
  const shelfStock = shelves.reduce((s, r) => s + r.shelfStock, 0);
  const backroomStock = locations.reduce((s, r) => s + r.backroomStock, 0);
  const reservedStock = [...shelves, ...locations].reduce(
    (s, r) => s + r.reservedStock,
    0,
  );
  const incomingStock = locations.reduce((s, r) => s + r.incomingStock, 0);
  const availableStock = shelfStock + backroomStock - reservedStock;
  const eligibleIncoming = locations.reduce(
    (s, r) =>
      s +
      (r.incomingBatches
        ? r.incomingBatches
            .filter((b) => plan && b.arrivalDays <= plan.leadTimeDays)
            .reduce((a, b) => a + b.quantity, 0)
        : plan && r.incomingArrivalDays <= plan.leadTimeDays
          ? r.incomingStock
          : 0),
    0,
  );
  return {
    shelfStock,
    backroomStock,
    reservedStock,
    incomingStock,
    availableStock,
    eligibleIncoming,
    ...(plan && planningMetrics
      ? inventoryPlan(
          plan.averageDailyDemand,
          plan.leadTimeDays,
          plan.safetyStock,
          availableStock,
          eligibleIncoming,
          0,
        )
      : {}),
  };
}
export function validateCatalog(c: ProductCatalog, store: Store): string[] {
  const errors: string[] = [];
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length)
      errors.push(`Duplicate ${label}`);
  };
  unique(
    c.products.map((p) => p.sku),
    "SKU",
  );
  unique(
    c.categories.map((p) => p.id),
    "category",
  );
  unique(
    c.fixtureProducts.map((p) => `${p.sku}:${p.fixtureId}`),
    "fixture product",
  );
  unique(
    c.shelfInventory.map((p) => `${p.sku}:${p.fixtureId}`),
    "shelf position",
  );
  unique(
    c.stockLocations.map((p) => `${p.sku}:${p.fixtureId}`),
    "stock location",
  );
  unique(
    c.planning.map((p) => p.sku),
    "planning SKU",
  );
  const finite = (values: number[]) =>
    values.every(
      (n) => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER,
    );
  c.categories.forEach((cat) => {
    if (
      !store.zones.some((z) => z.id === cat.zoneId) ||
      (cat.parentId &&
        !c.categories.some(
          (p) =>
            p.id === cat.parentId && p.zoneId === cat.zoneId && !p.parentId,
        ))
    )
      errors.push("Missing category parent/zone");
  });
  c.products.forEach((p) => {
    if (!c.categories.some((cat) => cat.id === p.categoryId && cat.parentId))
      errors.push("Missing product category");
    if (!finite([p.sellingPrice, p.unitCost])) errors.push("Invalid price");
    if (
      !c.fixtureProducts.some((r) => r.sku === p.sku) ||
      !c.planning.some((r) => r.sku === p.sku)
    )
      errors.push("Missing product placement/planning");
  });
  c.fixtureProducts.forEach((m) => {
    const product = c.products.find((p) => p.sku === m.sku),
      cat = c.categories.find((p) => p.id === product?.categoryId),
      f = store.fixtures.find((f) => f.id === m.fixtureId);
    if (
      !product ||
      !f ||
      f.zoneId !== cat?.zoneId ||
      ["F", "L"].includes(f.zoneId)
    )
      errors.push("Missing or invalid fixture mapping");
    if (!finite([m.displayCapacity])) errors.push("Invalid capacity");
    if (
      !c.shelfInventory.some(
        (r) => r.sku === m.sku && r.fixtureId === m.fixtureId,
      )
    )
      errors.push("Missing shelf inventory");
  });
  c.shelfInventory.forEach((r) => {
    if (
      !c.fixtureProducts.some(
        (m) => m.sku === r.sku && m.fixtureId === r.fixtureId,
      )
    )
      errors.push("Missing shelf mapping");
    const capacity =
      c.fixtureProducts.find(
        (m) => m.sku === r.sku && m.fixtureId === r.fixtureId,
      )?.displayCapacity ?? 0;
    if (
      !finite([r.shelfStock, r.reservedStock]) ||
      r.reservedStock > r.shelfStock ||
      r.shelfStock > capacity
    )
      errors.push("Invalid shelf stock");
  });
  c.stockLocations.forEach((r) => {
    if (
      !c.products.some((p) => p.sku === r.sku) ||
      !store.fixtures.some((f) => f.id === r.fixtureId && f.zoneId === "F")
    )
      errors.push("Missing stock SKU/location");
    if (
      !finite([
        r.backroomStock,
        r.reservedStock,
        r.incomingStock,
        r.incomingArrivalDays,
      ]) ||
      r.reservedStock > r.backroomStock
    )
      errors.push("Invalid backroom stock");
  });
  c.planning.forEach((r) => {
    if (!c.products.some((p) => p.sku === r.sku))
      errors.push("Missing planning SKU");
    if (!finite([r.averageDailyDemand, r.safetyStock, r.leadTimeDays]))
      errors.push("Invalid planning");
  });
  return errors;
}
