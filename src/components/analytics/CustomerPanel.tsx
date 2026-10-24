"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import { useIntelligence } from "@/stores/intelligence";
import {
  customerModel,
  bangkokDay,
  type CaseState,
} from "@/lib/analytics/customer";
import { fullDate } from "@/lib/analytics/overview";
import { Stats, Table, Chart, MetricLabel } from "./IntelligenceUI";
export function CustomerPanel({ data }: { data: DashboardData }) {
  const s = useIntelligence(),
    ref = data.dataset.intelligence?.reference ?? "legacy";
  const dates = [
    ...data.dataset.sales.map((r) => r.date),
    ...data.dataset.storeDays.map((r) => r.date),
    ...(data.dataset.intelligence?.feedback ?? []).flatMap((r) =>
      Number.isFinite(Date.parse(String(r.dateTime)))
        ? [bangkokDay(String(r.dateTime))]
        : [],
    ),
    ...s.reports
      .filter(
        (r) => r.reference === ref && Number.isFinite(Date.parse(r.createdAt)),
      )
      .map((r) => bangkokDay(r.createdAt)),
  ].sort();
  const [from, setFrom] = useState(dates[0] ?? data.dataset.asOf.slice(0, 10)),
    [to, setTo] = useState(dates.at(-1) ?? data.dataset.asOf.slice(0, 10)),
    [zone, setZone] = useState(""),
    [notice, setNotice] = useState("");
  const m = customerModel(data, s.reports, s.caseStates, from, to, zone);
  const update = async (id: string, status: CaseState["status"]) => {
    try {
      const prior = s.caseStates[ref]?.[id],
        actionId = prior?.actionId;
      await s.save({
        reports: s.reports.map((r) =>
          `report:${r.id}` === id && r.reference === ref
            ? {
                ...r,
                resolutionAt:
                  status === "Done" ? new Date().toISOString() : undefined,
              }
            : r,
        ),
        caseStates: {
          ...s.caseStates,
          [ref]: {
            ...s.caseStates[ref],
            [id]: {
              ...prior,
              status,
              resolvedAt:
                status === "Done" ? new Date().toISOString() : undefined,
            },
          },
        },
        actions: {
          ...s.actions,
          [ref]: (s.actions[ref] ?? data.dataset.actions).map((a) =>
            a.id === actionId ? { ...a, status } : a,
          ),
        },
      });
      setNotice("บันทึกสถานะเคสและ Action แล้ว");
    } catch (e) {
      setNotice(String(e));
    }
  };
  const create = async (id: string) => {
    try {
      const c = m.cases.find((c) => c.id === id);
      if (!c) throw Error("No Data");
      if (c.actionId) throw Error("เคสนี้มี Action แล้ว");
      const actionId = crypto.randomUUID();
      await s.save({
        caseStates: {
          ...s.caseStates,
          [ref]: {
            ...s.caseStates[ref],
            [id]: { status: c.status, resolvedAt: c.resolvedAt, actionId },
          },
        },
        actions: {
          ...s.actions,
          [ref]: [
            ...(s.actions[ref] ?? data.dataset.actions),
            {
              id: actionId,
              zoneId: c.zoneId,
              problem: `${c.id}: ${c.description}`,
              owner: "Department Supervisor",
              severity: c.severity,
              urgency: 3,
              impact: 3,
              status: c.status,
              critical: "none",
            },
          ],
        },
      });
      setNotice("ส่งเข้า Operations / Action Planning แล้ว");
    } catch (e) {
      setNotice(String(e));
    }
  };
  return (
    <section>
      <h2>Customer Experience</h2>
      <p>
        {data.dataset.intelligence?.sourceLabel} · Case-based metrics ·
        Browser-only persistence ไม่มี Multi-user sync ·
        ไม่เก็บชื่อหรือข้อมูลติดต่อ
      </p>
      <div className="intel-fields">
        <label>
          เริ่ม Case Range
          <input
            type="date"
            value={from}
            onInput={(e) => setFrom(e.currentTarget.value)}
          />
        </label>
        <label>
          สิ้นสุด Case Range
          <input
            type="date"
            value={to}
            onInput={(e) => setTo(e.currentTarget.value)}
          />
        </label>
        <label>
          Case Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">ทุก Zone</option>
            {data.store.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nameTh}
              </option>
            ))}
          </select>
        </label>
      </div>
      {from > to && <p role="alert">วันเริ่มต้องไม่อยู่หลังวันสิ้นสุด</p>}
      <Stats
        items={[
          ["Complaint Count", m.count],
          ["Complaint / 1,000 transactions", m.rate],
          ["Resolved Count", m.resolved],
          ["Resolution Rate %", m.resolutionRate],
          ["Resolution mean hours", m.hours],
          ["CSAT %", m.csat],
          ["Responses", m.responses],
        ]}
      />
      <p>
        ช่วงวันที่รายงาน {from && fullDate(from)} – {to && fullDate(to)} ·
        ไม่บวกจำนวนร้องเรียนรวมจาก Experience ซ้ำกับเคส · CSAT ใช้ survey
        ระดับร้านเท่านั้น เลือก Zone = No Data ·
        ไม่มีข้อมูลร้องเรียนไม่ใช่หลักฐานว่าไม่มีข้อร้องเรียน
      </p>
      <h3>
        <MetricLabel title="Top Complaint Categories" />
      </h3>
      {m.categories.length ? (
        <Chart rows={m.categories} keys={["cases"]} />
      ) : (
        <p>No Data · ไม่มีเคสที่มีข้อมูลรองรับตามช่วง / Zone นี้</p>
      )}
      <p role="status">{notice || s.error}</p>
      <Table
        headers={[
          "Case ID / วันที่",
          "Zone",
          "Category / Severity",
          "Status",
          "Resolved At",
          "Action",
        ]}
      >
        {m.cases.map((c) => (
          <tr key={c.id}>
            <td>
              {c.id}
              <br />
              {c.createdAt}
            </td>
            <td>{c.zoneId}</td>
            <td>
              {c.category} / {c.severity}
            </td>
            <td>
              <select
                aria-label={`สถานะ ${c.id}`}
                value={c.status}
                disabled={s.busy}
                onChange={(e) =>
                  void update(c.id, e.target.value as CaseState["status"])
                }
              >
                {["Open", "In progress", "Done"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </td>
            <td>{c.resolvedAt ?? "ยังไม่ปิด"}</td>
            <td>
              <button
                disabled={s.busy || !!c.actionId}
                onClick={() => void create(c.id)}
              >
                {c.actionId ? "เชื่อม Action แล้ว" : "สร้าง Action"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <h3>Staff Feedback & Pain Points · Active Dataset</h3>
      <Table headers={["วันที่", "หมวด", "ข้อความ", "สถานะ"]}>
        {s.feedback
          .filter((r) => r.reference === ref)
          .map((r) => (
            <tr key={r.id}>
              <td>{r.createdAt}</td>
              <td>{r.category}</td>
              <td>{r.description}</td>
              <td>{r.status}</td>
            </tr>
          ))}
      </Table>
      {s.feedback.some((r) => !r.reference) && (
        <p>
          Feedback รุ่นเก่ายังเก็บอยู่ แต่ไม่รวมในหน้านี้เพราะไม่มี Dataset
          Reference
        </p>
      )}
    </section>
  );
}
