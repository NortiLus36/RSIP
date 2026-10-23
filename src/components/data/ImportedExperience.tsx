"use client";
import { useState } from "react";
import { useDataSource } from "@/stores/data-source";
import { experienceTotals } from "@/lib/import/provider";
export function ImportedExperience() {
  const all = useDataSource((s) => s.bundle.experience?.rows) ?? [];
  const dates = all.map((r) => String(r.date)).sort();
  const [from, setFrom] = useState(dates[0] ?? ""),
    [to, setTo] = useState(dates.at(-1) ?? "");
  const rows = all.filter(
    (r) => String(r.date) >= from && String(r.date) <= to,
  );
  const totals = experienceTotals(rows);
  return (
    <section>
      <h2>Customer Experience · IMPORTED DATA</h2>
      <label>
        ตั้งแต่{" "}
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        ถึง{" "}
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <p>
        Data Coverage: {rows.length} วัน · {from || "No Data"} –{" "}
        {to || "No Data"}
      </p>
      {Object.entries(totals).map(([k, v]) => (
        <p key={k}>
          <strong>
            {k}:{" "}
            {v === null
              ? "No Data"
              : v.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
          </strong>
        </p>
      ))}
      <p>
        CSAT = Satisfied / Responses × 100 · NPS = (Promoters − Detractors) /
        Responses × 100 · Complaint Rate = Complaints / Transactions × 1,000 ·
        ตัวหารเป็นศูนย์แสดง No Data
      </p>
    </section>
  );
}
