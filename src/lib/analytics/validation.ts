export interface NumericField {
  key: string;
  label: string;
  unit: string;
  integer?: boolean;
  max?: number;
}
export function validateDraft(
  draft: Record<string, string>,
  fields: NumericField[],
) {
  const values: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const text = draft[f.key]?.trim() ?? "";
    const value = Number(text);
    if (text === "") errors[f.key] = "กรุณากรอกค่า";
    else if (!Number.isFinite(value))
      errors[f.key] = "ต้องเป็นตัวเลขที่มีค่าจำกัด";
    else if (value < 0) errors[f.key] = "ต้องไม่ติดลบ";
    else if (value > Number.MAX_SAFE_INTEGER)
      errors[f.key] = "เกินช่วงตัวเลขที่รองรับอย่างปลอดภัย";
    else if (f.integer && !Number.isSafeInteger(value))
      errors[f.key] = "ต้องเป็นจำนวนเต็มที่ปลอดภัย";
    else if (f.max !== undefined && value > f.max)
      errors[f.key] = `ต้องไม่เกิน ${f.max}`;
    else values[f.key] = value;
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}
