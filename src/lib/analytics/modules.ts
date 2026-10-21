import type { NumericField } from "./validation";
import * as math from "./calculators";
export type CalculatorKind =
  "retail" | "inventory" | "operations" | "experience" | "scenario";
export interface CalculationLine {
  label: string;
  value: number | null;
  unit: string;
  formula: string;
  substitution: string;
  explanation: string;
}
const field = (
  key: string,
  label: string,
  unit: string,
  integer = false,
  max?: number,
): NumericField => ({ key, label, unit, integer, max });
export const calculatorFields: Record<CalculatorKind, NumericField[]> = {
  retail: [
    field("traffic", "Foot Traffic", "คน", true),
    field("conversion", "Conversion Rate", "%", false, 100),
    field("abv", "Average Basket Value", "THB/ธุรกรรม"),
    field("sales", "Net Sales", "THB"),
    field("cogs", "Cost of Goods Sold", "THB"),
  ],
  inventory: [
    field("demand", "Daily Demand", "ชิ้น/วัน"),
    field("leadTime", "Lead Time", "วัน"),
    field("safety", "Safety Stock", "ชิ้น"),
    field("available", "Available Stock", "ชิ้น"),
    field("incoming", "Incoming Stock", "ชิ้น"),
    field("arrival", "Incoming Arrival", "วันจากวันนี้"),
  ],
  operations: [
    field("oos", "OOS SKU", "SKU", true),
    field("checked", "Checked SKU", "SKU", true),
    field("waste", "Waste Cost", "THB"),
    field("sales", "Net Sales", "THB"),
    field("hours", "Labor Hours", "ชั่วโมง"),
    field("laborCost", "Labor Cost", "THB"),
  ],
  experience: [
    field("satisfied", "Satisfied Responses", "คน", true),
    field("responses", "Total CSAT Responses", "คน", true),
    field("promoters", "Promoters", "คน", true),
    field("passives", "Passives", "คน", true),
    field("detractors", "Detractors", "คน", true),
    field("npsTotal", "Total NPS Responses", "คน", true),
    field("complaints", "Complaints", "เหตุ", true),
    field("transactions", "Transactions", "ธุรกรรม", true),
  ],
  scenario: [
    field("salesA", "A · Incremental Sales", "THB"),
    field("cogsA", "A · Incremental COGS", "THB"),
    field("costA", "A · Campaign Cost", "THB"),
    field("salesB", "B · Incremental Sales", "THB"),
    field("cogsB", "B · Incremental COGS", "THB"),
    field("costB", "B · Campaign Cost", "THB"),
  ],
};
export const calculatorTitles: Record<CalculatorKind, string> = {
  retail: "Retail KPI & Business Analytics",
  inventory: "Inventory Planning",
  operations: "Retail Operations",
  experience: "Customer Experience",
  scenario: "Scenario A/B Comparison",
};
export function calculateModule(
  kind: CalculatorKind,
  v: Record<string, number>,
): CalculationLine[] {
  const line = (
    label: string,
    value: number | null,
    unit: string,
    formula: string,
    substitution: string,
    explanation: string,
  ): CalculationLine => ({
    label,
    value,
    unit,
    formula,
    substitution,
    explanation,
  });
  switch (kind) {
    case "retail":
      return [
        line(
          "Estimated Sales",
          math.estimatedSales(v.traffic, v.conversion, v.abv),
          "THB",
          "Traffic × Conversion / 100 × ABV",
          `${v.traffic} × ${v.conversion} / 100 × ${v.abv}`,
          "ยอดขายประมาณจากจำนวนลูกค้าและมูลค่าตะกร้า ภายใน 1 วัน",
        ),
        line(
          "Gross Profit",
          math.grossProfit(v.sales, v.cogs),
          "THB",
          "Net Sales − COGS",
          `${v.sales} − ${v.cogs}`,
          "กำไรก่อนค่าใช้จ่ายดำเนินงาน อาจติดลบได้",
        ),
        line(
          "Gross Margin",
          math.grossMargin(v.sales, v.cogs),
          "%",
          "(Net Sales − COGS) / Net Sales × 100",
          `(${v.sales} − ${v.cogs}) / ${v.sales} × 100`,
          "N/A เมื่อยอดขายเป็นศูนย์",
        ),
      ];
    case "inventory": {
      const p = math.inventoryPlan(
        v.demand,
        v.leadTime,
        v.safety,
        v.available,
        v.incoming,
        v.arrival,
      );
      return [
        line(
          "Lead Time Demand",
          p.leadTimeDemand,
          "ชิ้น",
          "Daily Demand × Lead Time",
          `${v.demand} × ${v.leadTime}`,
          "ความต้องการในช่วงรอส่งสินค้า",
        ),
        line(
          "Target Stock",
          p.targetStock,
          "ชิ้น",
          "Lead Time Demand + Safety Stock",
          `${p.leadTimeDemand} + ${v.safety}`,
          "ระดับสินค้าที่ต้องการครอบคลุมช่วง Lead Time",
        ),
        line(
          "Suggested Order",
          p.suggestedOrder,
          "ชิ้น",
          "max(0, Target − Available − Eligible Incoming)",
          `max(0, ${p.targetStock} − ${v.available} − ${p.eligibleIncoming})`,
          p.suggestedOrder > 0
            ? "มีส่วนขาดตามสมมติฐานนี้ ควรพิจารณาข้อจำกัดผู้ขายก่อนตัดสินใจ"
            : "ไม่จำเป็นต้องสั่งเพิ่มตามสมมติฐานนี้",
        ),
        line(
          "Days of Supply",
          p.daysOfSupply,
          "วัน",
          "Available Stock / Daily Demand",
          `${v.available} / ${v.demand}`,
          "N/A เมื่อความต้องการเป็นศูนย์; ไม่รวมสินค้าที่ยังมาไม่ถึง",
        ),
      ];
    }
    case "operations":
      return [
        line(
          "OOS Rate",
          math.oosRate(v.oos, v.checked),
          "%",
          "OOS SKU / Checked SKU × 100",
          `${v.oos} / ${v.checked} × 100`,
          "นิยาม: SKU ที่ไม่มีสินค้าบนชั้น ณ จุดตรวจ / SKU ที่ตรวจทั้งหมด",
        ),
        line(
          "Waste-to-Sales",
          math.wasteRatio(v.waste, v.sales),
          "%",
          "Waste Cost / Net Sales × 100",
          `${v.waste} / ${v.sales} × 100`,
          "ต้นทุนสูญเสียเทียบยอดขายในช่วงเวลาเดียวกัน",
        ),
        line(
          "Sales per Labor Hour",
          math.salesPerLaborHour(v.sales, v.hours),
          "THB/ชั่วโมง",
          "Net Sales / Labor Hours",
          `${v.sales} / ${v.hours}`,
          "ยอดขายต่อชั่วโมงแรงงานรวม",
        ),
        line(
          "Labor Cost",
          math.laborCostRate(v.laborCost, v.sales),
          "%",
          "Labor Cost / Net Sales × 100",
          `${v.laborCost} / ${v.sales} × 100`,
          "ไม่รวมต้นทุนแรงงานที่ไม่ได้กรอกใน Scenario",
        ),
      ];
    case "experience":
      return [
        line(
          "CSAT",
          math.csat(v.satisfied, v.responses),
          "%",
          "Satisfied / Total CSAT Responses × 100",
          `${v.satisfied} / ${v.responses} × 100`,
          "ผู้ตอบ CSAT เป็นคนละกลุ่มกับ NPS ได้",
        ),
        line(
          "NPS",
          math.nps(v.promoters, v.passives, v.detractors, v.npsTotal),
          "score",
          "(Promoters − Detractors) / Total NPS × 100",
          `(${v.promoters} − ${v.detractors}) / ${v.npsTotal} × 100`,
          "คะแนน −100 ถึง +100 ไม่ใช่เปอร์เซ็นต์",
        ),
        line(
          "Complaint Rate",
          math.complaintRate(v.complaints, v.transactions),
          "เหตุต่อ 1,000 ธุรกรรม",
          "Complaints / Transactions × 1,000",
          `${v.complaints} / ${v.transactions} × 1,000`,
          "นับเหตุร้องเรียน อาจมีหลายเหตุต่อธุรกรรม",
        ),
      ];
    case "scenario":
      return [
        line(
          "Contribution A",
          math.incrementalContribution(v.salesA, v.cogsA, v.costA),
          "THB",
          "Incremental Sales − COGS − Campaign Cost",
          `${v.salesA} − ${v.cogsA} − ${v.costA}`,
          "ส่วนเกินหลังต้นทุนที่ระบุ ยังไม่รวมความเสี่ยงและต้นทุนอื่น",
        ),
        line(
          "Contribution B",
          math.incrementalContribution(v.salesB, v.cogsB, v.costB),
          "THB",
          "Incremental Sales − COGS − Campaign Cost",
          `${v.salesB} − ${v.cogsB} − ${v.costB}`,
          "ยอดขายสูงกว่าไม่ได้แปลว่า contribution สูงกว่า",
        ),
      ];
  }
}
