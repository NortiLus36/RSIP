// Keep IDs stable; visibility can be restored without deleting integrations.
export const analyticsModules = [
  { id: "Store Overview", label: "ภาพรวมผลการดำเนินงาน", visible: true },
  {
    id: "คาดการณ์ความต้องการสินค้า",
    label: "คาดการณ์ความต้องการสินค้า",
    visible: true,
  },
  { id: "Smart Inventory", label: "วางแผนสินค้าคงคลัง", visible: true },
  { id: "Profit & Margin", label: "วิเคราะห์ต้นทุนและกำไร", visible: true },
  {
    id: "Peak Time & Workforce",
    label: "วิเคราะห์ช่วงเวลาเร่งด่วนและกำลังคน",
    visible: false,
  },
  {
    id: "Customer Experience",
    label: "ประสบการณ์และปัญหาลูกค้า",
    visible: false,
  },
  {
    id: "Performance Review",
    label: "สรุปและประเมินผลการดำเนินงาน",
    visible: false,
  },
] as const;
export const visibleAnalyticsModules = analyticsModules.filter(
  (m) => m.visible,
);
export function resolveAnalyticsTab(value?: string | null) {
  return (
    visibleAnalyticsModules.find((m) => m.id === value)?.id ??
    analyticsModules[0].id
  );
}
