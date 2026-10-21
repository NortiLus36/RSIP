"use client";
import { useId, useMemo, useState } from "react";
import { RotateCcw, Calculator } from "lucide-react";
import {
  calculatorFields,
  calculatorTitles,
  calculateModule,
  type CalculatorKind,
} from "@/lib/analytics/modules";
import { validateDraft } from "@/lib/analytics/validation";
import { CategoryComparisonChart } from "./Charts";
import { contributionInsight } from "@/lib/analytics/insights";
const format = (n: number | null) =>
  n === null
    ? "N/A"
    : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
export function CalculatorForm({
  kind,
  defaults,
  period,
}: {
  kind: CalculatorKind;
  defaults: Record<string, number>;
  period?: string;
}) {
  const id = useId();
  const initial = () =>
    Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, String(v)]),
    );
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const validated = useMemo(
    () => validateDraft(draft, calculatorFields[kind]),
    [draft, kind],
  );
  const checkErrors = { ...validated.errors };
  if (validated.valid) {
    const v = validated.values;
    if (kind === "operations" && v.oos > v.checked)
      checkErrors.oos = "OOS SKU ต้องไม่เกิน Checked SKU";
    if (kind === "experience") {
      if (v.satisfied > v.responses)
        checkErrors.satisfied = "ต้องไม่เกินจำนวนผู้ตอบ CSAT";
      if (v.promoters + v.passives + v.detractors !== v.npsTotal)
        checkErrors.npsTotal =
          "ยอด Promoters + Passives + Detractors ไม่ตรงกับจำนวนผู้ตอบ NPS";
    }
  }
  let results: ReturnType<typeof calculateModule> = [];
  let calculationError = "";
  if (Object.keys(checkErrors).length === 0) {
    try {
      results = calculateModule(kind, validated.values);
    } catch (e) {
      calculationError = e instanceof Error ? e.message : "คำนวณไม่สำเร็จ";
    }
  }
  return (
    <section className="calculator-form" aria-label={calculatorTitles[kind]}>
      <div className="section-title">
        <h3>
          <Calculator size={16} />
          {calculatorTitles[kind]}
        </h3>
        <button className="text-button" onClick={() => setDraft(initial())}>
          <RotateCcw size={12} />
          Reset Demo
        </button>
      </div>
      <p className="scenario-note">
        SCENARIO · คำนวณจาก Input ปัจจุบัน · ไม่เปลี่ยน KPI ของร้าน
      </p>
      {period && (
        <p className="data-period">
          ค่า Demo อ้างอิง {period} · Scenario ต่อ 1 วัน
        </p>
      )}
      <div className="calculator-inputs">
        {calculatorFields[kind].map((f) => (
          <label key={f.key} htmlFor={`${id}-${f.key}`}>
            <span>
              {f.label}
              <small>{f.unit}</small>
            </span>
            <input
              id={`${id}-${f.key}`}
              type="text"
              inputMode="decimal"
              value={draft[f.key] ?? ""}
              onChange={(e) =>
                setDraft((s) => ({ ...s, [f.key]: e.target.value }))
              }
              aria-invalid={!!checkErrors[f.key]}
              aria-describedby={
                checkErrors[f.key] ? `${id}-${f.key}-error` : undefined
              }
            />
            {checkErrors[f.key] && (
              <small className="field-error" id={`${id}-${f.key}-error`}>
                {checkErrors[f.key]}
              </small>
            )}
          </label>
        ))}
      </div>
      {calculationError && (
        <p role="alert" className="field-error">
          {calculationError}
        </p>
      )}
      {Object.keys(checkErrors).length > 0 && (
        <p className="form-hint">แก้ไข Input เพื่อแสดงผลคำนวณ</p>
      )}
      <div className="calculation-results" aria-live="polite">
        {results.map((r) => (
          <article key={r.label}>
            <div>
              <span>{r.label}</span>
              <strong data-result={r.label}>
                {format(r.value)} <small>{r.unit}</small>
              </strong>
            </div>
            <code>{r.formula}</code>
            <p className="substitution">แทนค่า: {r.substitution}</p>
            <p>{r.explanation}</p>
          </article>
        ))}
      </div>
      {kind === "scenario" && results.length === 2 && (
        <>
          <CategoryComparisonChart
            scenario
            data={results.map((r) => ({ name: r.label, sales: r.value ?? 0 }))}
          />
          <p className="business-insight">
            {contributionInsight(results[0].value!, results[1].value!)}
          </p>
        </>
      )}
      {kind === "inventory" && (
        <aside className="assumptions">
          <strong>สมมติฐาน · Basic Planning Simulation</strong>
          <p>
            ความต้องการคงที่ตลอด Lead Time; Available
            รวมสินค้าบนชั้นและคลังที่พร้อมใช้ ส่วน Incoming
            นับเฉพาะที่มาถึงภายใน Lead Time
          </p>
          <p>
            ยังไม่รวม Reorder Cycle, MOQ, ความผันผวนของ Demand, ความไม่แน่นอนของ
            Supplier Lead Time และการทยอยส่งจริง ไม่ใช่คำสั่งซื้อ
          </p>
        </aside>
      )}
    </section>
  );
}
