import { floorPlan } from "@/config/floor-plan";
import { analyticsDataset } from "./analytics";
import { inventory } from "./inventory";
import { snapshotFor } from "@/lib/analytics/selectors";
import type { KpiSnapshot } from "@/types";
export { inventory } from "./inventory";
export { hourlyTraffic } from "./traffic";
export { analyticsDataset } from "./analytics";
export const snapshots = [floorPlan, ...floorPlan.zones, ...floorPlan.fixtures]
  .map((object) =>
    snapshotFor(analyticsDataset, inventory, floorPlan, object.id),
  )
  .filter((s): s is KpiSnapshot => s !== undefined);
export const storeMetrics = snapshots[0].metrics;
export const period = snapshots[0].period;
