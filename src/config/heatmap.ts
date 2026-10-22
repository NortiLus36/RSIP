import type { DataLayer } from "@/types/spatial";
export const spatialDates = ["2026-10-20", "2026-10-21", "2026-10-22"];
export const spatialHours = Array.from({ length: 15 }, (_, i) => i + 8);
export const layerConfig: Record<
  Exclude<DataLayer, "normal">,
  {
    name: string;
    unit: string;
    thresholds: [number, number];
    colors: [string, string, string];
  }
> = {
  density: {
    name: "Customer Density",
    unit: "คน/ตร.ม. จำลอง",
    thresholds: [0.15, 0.4],
    colors: ["#22b8a8", "#facc15", "#ef6548"],
  },
  sales: {
    name: "Sales Amount",
    unit: "THB/ชั่วโมง",
    thresholds: [2000, 5000],
    colors: ["#70c5bf", "#facc15", "#e76a38"],
  },
  oos: {
    name: "OOS Risk",
    unit: "% SKU ขาดชั้นวาง ณ snapshot",
    thresholds: [5, 15],
    colors: ["#53b788", "#eabf25", "#df4b54"],
  },
};
export const noDataColor = "#aeb8c4";
