import type { RetailDataset } from "@/types/analytics";
import type { InventoryItem } from "@/types";
import type { CalculatorKind } from "./modules";
import { currentRows, salesTotals } from "./selectors";
export function demoValues(
  kind: CalculatorKind,
  data: RetailDataset,
  inventory: InventoryItem[],
  sku?: string,
): Record<string, number> {
  const today = data.storeDays.find((d) => d.date === data.asOf)!;
  const total = salesTotals(currentRows(data));
  const item = inventory.find((i) => i.sku === sku) ?? inventory[0];
  const plan = data.planning.find((p) => p.sku === item.sku)!;
  const checked = new Set(currentRows(data).map((r) => r.sku));
  const retailItems = inventory.filter((i) => checked.has(i.sku));
  switch (kind) {
    case "retail":
      return {
        traffic: today.traffic,
        conversion: (today.transactions / today.traffic) * 100,
        abv: total.sales / today.transactions,
        sales: total.sales,
        cogs: total.cogs,
      };
    case "inventory":
      return {
        demand: plan.dailyDemand,
        leadTime: plan.leadTime,
        safety: plan.safetyStock,
        available: item.onHand + (item.backroomOnHand ?? 0),
        incoming: plan.incomingStock,
        arrival: plan.arrivalDays,
      };
    case "operations":
      return {
        oos: retailItems.filter((i) => i.onHand === 0).length,
        checked: retailItems.length,
        waste: total.waste,
        sales: total.sales,
        hours: today.laborHours,
        laborCost: today.laborCost,
      };
    case "experience":
      return {
        satisfied: today.satisfied,
        responses: today.responses,
        promoters: today.promoters,
        passives: today.passives,
        detractors: today.detractors,
        npsTotal: today.promoters + today.passives + today.detractors,
        complaints: today.complaints,
        transactions: today.transactions,
      };
    case "scenario":
      return {
        salesA: data.scenarioDefaults.a.sales,
        cogsA: data.scenarioDefaults.a.cogs,
        costA: data.scenarioDefaults.a.campaignCost,
        salesB: data.scenarioDefaults.b.sales,
        cogsB: data.scenarioDefaults.b.cogs,
        costB: data.scenarioDefaults.b.campaignCost,
      };
  }
}
