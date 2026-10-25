export interface InventoryAssumptions {
  leadTimeDays?: number;
  reviewDays?: number;
  safetyStock?: number;
  dailyDemand?: number;
  incomingQuantity?: number;
  incomingEta?: string;
  capacities?: Record<string, number>;
}
