import type { HourlyTraffic } from "@/types";
export const hourlyTraffic: HourlyTraffic[] = [
  76, 104, 138, 196, 228, 182, 163, 211, 278, 266,
].map((customers, i) => ({
  hour: `${String(i + 9).padStart(2, "0")}:00`,
  customers,
}));
