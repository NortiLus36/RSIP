import type { HelpTopic } from "@/config/kpi-help";
export function metricHelp(title: string): HelpTopic {
  const rules: [RegExp, string, string][] = [
    [
      /Replenishment|เติมชั้น/i,
      "min(คลังพร้อมใช้, max(0, min(capacity, demand วันแรก) − shelf))",
      "ไม่ใช่การสั่งซื้อ; คลังหัก Reserved ครั้งเดียว",
    ],
    [
      /Suggested order|สั่งเพิ่ม/i,
      "max(0, demand ใน Lead + Review + Safety − Available − Incoming ทัน)",
      "Incoming เทียบ ETA กับวันปลายช่วงจากวันที่ Snapshot",
    ],
    [
      /Stock investment|เงินซื้อ/i,
      "Planned order × Unit cost",
      "เงินลงทุนสต็อกแสดงแยก ไม่หักซ้ำใน COGS",
    ],
    [
      /Contribution|คุ้มทุน/i,
      "Contribution = Gross Profit − Waste cost − Extra labor − Campaign − Other",
      "Baseline ใช้ราคา/ทุนและ Demand ก่อนปรับส่วนลด/uplift; break-even เป็นเชิงทฤษฎี",
    ],
    [
      /Margin/i,
      "Gross Profit / Revenue × 100",
      "คำนวณจากยอดรวม; รายได้ศูนย์ = N/A",
    ],
    [
      /Gross Profit|กำไรขั้นต้น|Actual GP/i,
      "Net Revenue − COGS",
      "ค่าแรงเพิ่มไม่เปลี่ยน Gross Profit",
    ],
    [
      /COGS|ต้นทุนที่ขาย/i,
      "Sold quantity × Applicable unit cost",
      "Historical ใช้ต้นทุนรายการขาย; Scenario ใช้ทุนที่กรอก",
    ],
    [
      /Revenue|Sales|ยอดขาย/i,
      "Σ Quantity × Effective price หลังส่วนลด",
      "Actual มาจากธุรกรรม; Forecast/Scenario มีป้ายกำกับแยก",
    ],
    [
      /Baseline %/i,
      "(Forecast quantity − Baseline quantity) / Baseline quantity × 100",
      "Baseline ตัดผล Calendar ออกจากประวัติ; ตัวหารศูนย์ = N/A",
    ],
    [
      /Resolved Count/i,
      "COUNT เคสที่ status = Done",
      "นับ Case ID จากช่วงวันที่รายงานและ Zone ที่เลือก",
    ],
    [
      /Resolution Rate/i,
      "Resolved case count / Case count × 100",
      "ไม่มีเคสที่มีข้อมูล = No Data; ตัวหารศูนย์ = N/A",
    ],
    [
      /Resolution mean/i,
      "เฉลี่ย (Resolved At − Report DateTime) / 3,600,000",
      "ชั่วโมง; ใช้เฉพาะเคสปิดแล้วที่มีเวลาถูกต้อง",
    ],
    [
      /Complaint.*1,000/i,
      "Case count / COUNT DISTINCT Transaction ID × 1,000",
      "ใช้ธุรกรรมในช่วงและ Zone เดียวกัน; case-based rate ไม่รวมยอดร้องเรียน aggregate ซ้ำ",
    ],
    [
      /Complaint Count/i,
      "COUNT DISTINCT Case ID",
      "รวม imported cases และ Quick Reports ของ Active Dataset; ไม่บวก Experience aggregate ซ้ำ",
    ],
    [
      /CSAT/i,
      "Satisfied survey responses / Total survey responses × 100",
      "ใช้ Survey เท่านั้น; Zone filter ไม่มี survey ระดับ Zone จะแสดง No Data",
    ],
    [
      /Required staff/i,
      "ceil(Workload minutes / Productive minutes per staff)",
      "SCENARIO capacity จากช่องกรอก; ไม่ใช่จำนวนพนักงานที่ยืนยันแล้ว",
    ],
    [
      /Additional staff/i,
      "max(0, Required staff − Available staff)",
      "Monitor = 0, Standby = 1, Reinforce ≥ 2",
    ],
    [
      /labor|ค่าแรง/i,
      "Additional staff × Hourly labor cost",
      "ต้นทุนเพิ่มต่อชั่วโมง; สมมติฐานใน Planner",
    ],
    [
      /Workload/i,
      "Pass-through หรือ Occupancy proxy × Service minutes + Restock + Forecast units/hour × 0.3",
      "Occupancy ไม่ใช่ unique arrivals; เป็น workload scenario proxy",
    ],
    [
      /Closing|คงเหลือ/i,
      "max(0, Opening available + Timely supply − Sold − Waste)",
      "ประมาณการรวมช่วง ไม่รับประกัน stockout ระหว่างวัน; closing จริงต้องมี confirmed snapshot",
    ],
    [/Waste/i, "Waste units × Unit cost", "แยกของเสียจาก COGS ของสินค้าที่ขาย"],
    [
      /Forecast units/i,
      "ceil(Normalized same-weekday baseline × Calendar × Scenario)",
      "Manual หากประวัติ weekday น้อยกว่า 2; range ±20% ไม่ใช่ confidence interval",
    ],
  ];
  const match = rules.find(([pattern]) => pattern.test(title));
  return {
    title,
    definition:
      match?.[2] ??
      "ค่าจาก Active Dataset หรือสมมติฐานในช่องกรอกตามหน่วยที่ระบุ",
    formula: match?.[1] ?? "ค่าที่ระบุใน Input / ผลรวมรายการตามตัวกรองที่เลือก",
    inputs:
      "Active dataset reference และ Forecast options ร่วมกัน · Asia/Bangkok · THB",
    interpretation:
      "อ่านป้าย SYNTHETIC / IMPORTED / FORECAST / SCENARIO และช่วงวันที่",
    example: match?.[1] ?? title,
    advice: "ตรวจความครอบคลุมข้อมูลก่อนใช้ตัดสินใจ",
    caution:
      "No Data = ไม่พบข้อมูลรองรับ; N/A = คำนวณอัตราไม่ได้ ไม่แทนด้วยศูนย์",
  };
}
export function metricValue(label: string, n: number | null | undefined) {
  if (n == null || !Number.isFinite(n))
    return /%|Rate|1,000|คุ้มทุน/i.test(label)
      ? "N/A · ไม่มีฐานคำนวณ"
      : "No Data";
  if (/%|Rate/i.test(label))
    return (
      n.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + "%"
    );
  if (/THB/i.test(label))
    return (
      "฿" +
      n.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  return (
    n.toLocaleString("th-TH", { maximumFractionDigits: 2 }) +
    (/units/i.test(label) ? " หน่วย" : "")
  );
}
