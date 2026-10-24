"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import { useIntelligence } from "@/stores/intelligence";
import { display, Stats, Table, Chart } from "./IntelligenceUI";
export function CustomerPanel({ data }: { data: DashboardData }) {
  const s = useIntelligence(),
    ref = data.dataset.intelligence?.reference ?? "legacy",
    [notice, setNotice] = useState("");
  const reports = s.reports.filter((r) => r.reference === ref),
    cases = data.dataset.intelligence?.feedback ?? [],
    days = data.dataset.storeDays;
  const responses = days.reduce((a, r) => a + r.responses, 0),
    satisfied = days.reduce((a, r) => a + r.satisfied, 0),
    transactions = days.reduce((a, r) => a + r.transactions, 0),
    complaints = days.reduce((a, r) => a + r.complaints, 0);
  const categories = [
    ...new Set([
      ...reports.map((r) => r.category),
      ...cases.map((r) => String(r.category)),
    ]),
  ].map((category) => ({
    date: category,
    cases:
      reports.filter((r) => r.category === category).length +
      cases.filter((r) => r.category === category).length,
  }));
  const resolved = reports.filter((r) => r.resolutionAt),
    resHours = resolved.length
      ? resolved.reduce(
          (a, r) =>
            a +
            (Date.parse(r.resolutionAt!) - Date.parse(r.createdAt)) / 3600000,
          0,
        ) / resolved.length
      : null;
  const action = async (zoneId: string, problem: string) => {
    try {
      await s.save({
        actions: {
          ...s.actions,
          [ref]: [
            ...(s.actions[ref] ?? data.dataset.actions),
            {
              id: crypto.randomUUID(),
              zoneId,
              problem,
              owner: "Department Supervisor",
              severity: 3,
              urgency: 3,
              impact: 3,
              status: "Open",
              critical: "none",
            },
          ],
        },
      });
      setNotice("ส่งเข้า Action Planning แล้ว");
    } catch (e) {
      setNotice(String(e));
    }
  };
  return (
    <section>
      <h2>Customer Experience</h2>
      <p>
        Quick Report และ Feedback ใช้เพื่อปรับปรุงงาน · ไม่เก็บชื่อ เบอร์โทร
        หรือข้อมูลส่วนบุคคล · Complaint Rate ใช้จำนวนร้องเรียนรวมจาก Experience
        เท่านั้น ไม่บวก Case ซ้ำ
      </p>
      <Stats
        items={[
          ["CSAT %", responses ? (satisfied / responses) * 100 : null],
          ["Responses", responses || null],
          [
            "Complaint / 1,000 transactions",
            transactions ? (complaints / transactions) * 1000 : null,
          ],
          ["Quick reports", reports.length],
          ["Pending", reports.filter((r) => r.status === "Pending").length],
          ["Resolution mean hours", resHours],
        ]}
      />
      <Chart rows={categories} keys={["cases"]} />
      <p role="status">{notice}</p>
      <Table
        headers={[
          "Case",
          "Zone",
          "Category",
          "Severity",
          "Status",
          "Resolution",
          "Action",
        ]}
      >
        {cases.map((r, i) => (
          <tr key={i}>
            <td>{String(r.caseId)}</td>
            <td>{String(r.zoneId)}</td>
            <td>{String(r.category)}</td>
            <td>{String(r.severity)}</td>
            <td>{String(r.status)}</td>
            <td>{String(r.resolvedAt || "No Data")}</td>
            <td>
              <button
                onClick={() => action(String(r.zoneId), String(r.description))}
              >
                สร้าง Action
              </button>
            </td>
          </tr>
        ))}
        {reports.map((r) => (
          <tr key={r.id}>
            <td>{r.sku}</td>
            <td>{r.zoneId}</td>
            <td>{r.category}</td>
            <td>Staff report</td>
            <td>{r.status}</td>
            <td>{r.resolutionAt ?? "Pending"}</td>
            <td>
              <button
                onClick={() =>
                  action(r.zoneId, `${r.category}: ${r.note || r.sku}`)
                }
              >
                สร้าง Action
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <p>
        Imported cases: {cases.length} · Resolution ของ Quick Report
        นับเมื่อผู้จัดการกดปิดเคสหลังแก้ปัญหา · ตรวจสอบสถานะงานได้ที่ Operations
      </p>
      <h3>Feedback & Pain Points</h3>
      <Table headers={["วันที่", "หมวด", "ข้อความ", "สถานะ"]}>
        {s.feedback.map((r) => (
          <tr key={r.id}>
            <td>{r.createdAt}</td>
            <td>{r.category}</td>
            <td>{r.description}</td>
            <td>{r.status}</td>
          </tr>
        ))}
      </Table>
      <p>{display(reports.length)} รายงานจากพนักงานใน Browser นี้</p>
    </section>
  );
}
