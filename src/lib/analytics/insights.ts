import type { ManagementAction } from "@/types/analytics";
import { finite, priorityScore } from "./calculators";
export function contributionInsight(a: number, b: number) {
  finite(a);
  finite(b);
  const comparison =
    a === b
      ? "ทั้งสองทางเลือกมี contribution เท่ากัน"
      : `${a > b ? "A" : "B"} ให้ contribution สูงกว่าในสมมติฐานนี้`;
  return `${comparison} · ควรพิจารณาความเสี่ยง เงินสด และความเป็นไปได้ร่วมด้วย`;
}
export function prioritizeActions(actions: ManagementAction[]) {
  return {
    critical: actions.filter((a) => a.critical !== "none"),
    normal: actions
      .filter((a) => a.critical === "none")
      .sort(
        (a, b) =>
          priorityScore(b.severity, b.urgency, b.impact) -
          priorityScore(a.severity, a.urgency, a.impact),
      ),
  };
}
