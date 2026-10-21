export interface SimulationParameters {
  trafficMultiplier: number;
  openCheckouts: number;
  replenishmentMinutes: number;
}
export interface SimulationEngine {
  run(
    parameters: SimulationParameters,
  ): Promise<{ averageWaitMinutes: number; predictedOosRate: number }>;
}
export const defaultSimulationParameters: SimulationParameters = {
  trafficMultiplier: 1,
  openCheckouts: 8,
  replenishmentMinutes: 30,
};
