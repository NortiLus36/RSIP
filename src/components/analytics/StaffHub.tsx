"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/data/providers";
import type { QuickReport } from "@/types/intelligence";
import { useIntelligence, type DemoRole } from "@/stores/intelligence";
import { validateQuickReport } from "@/lib/analytics/operations";
import { useExplorer } from "@/stores/explorer";
import { ActionPlanning } from "./ActionPlanning";
import { Field, Table } from "./IntelligenceUI";
const lessons = [
  [
    "วิธีใช้ Store Explorer",
    "1. เปิด Explore 2. พิมพ์ชื่อสินค้า 3. ขยายหมวดและหมวดย่อยเพื่อดู SKU",
    "ค้นหาสินค้าที่ไหน?",
    "ช่องค้นหาใน Store Explorer",
  ],
  [
    "วิธีตรวจ SKU ใน 3D",
    "1. เลือกสินค้าใน Sidebar 2. เลือก Fixture กรณีมีหลายชั้น 3. กด Focus และอ่าน Inventory ใน Inspector",
    "SKU อยู่หลาย Fixture ควรทำอะไร?",
    "เลือก Fixture ที่ต้องการตรวจ",
  ],
  [
    "วิธีบันทึก Shelf Stock",
    "1. เปิด Quick Report 2. เลือก SKU/Fixture 3. นับยอดหลังเติม 4. กรอกจำนวนเติมจากคลัง 5. ส่งให้หัวหน้าอนุมัติ",
    "ส่งรายงานแล้วสต็อกเปลี่ยนเลยหรือไม่?",
    "รอหัวหน้าอนุมัติก่อน",
  ],
  [
    "วิธีรายงาน OOS",
    "1. ตรวจชั้นว่าง 2. ตรวจคลัง 3. เลือก Shelf OOS ใน Quick Report 4. กรอกยอดนับและเวลา ห้ามใส่ข้อมูลส่วนบุคคล",
    "ของหมดชั้นแต่คลังมีควรทำอะไร?",
    "เติมจากคลังก่อนและรายงานผล",
  ],
  [
    "วิธีดู Standby Tasks",
    "1. เปิด My Tasks 2. อ่าน Zone/Hour และเหตุผล 3. เปลี่ยนเป็น In progress 4. เปิด 3D 5. ทำงานแล้วเปลี่ยนเป็น Done",
    "ดูงานที่ได้รับจาก Workforce ที่ไหน?",
    "My Tasks ใน Operations",
  ],
];
export function StaffHub({ data }: { data: DashboardData }) {
  const router = useRouter();
  const s = useIntelligence(),
    ref = data.dataset.intelligence?.reference ?? "legacy",
    [tab, setTab] = useState("Action Planning"),
    [notice, setNotice] = useState(""),
    [sku, setSku] = useState(data.catalog.products[0]?.sku ?? ""),
    [fixture, setFixture] = useState(""),
    [reportTime, setReportTime] = useState(() =>
      new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16),
    ),
    [count, setCount] = useState(0),
    [replenished, setReplenished] = useState(0),
    [category, setCategory] = useState("Shelf OOS"),
    [note, setNote] = useState(""),
    [feedback, setFeedback] = useState(""),
    [learned, setLearned] = useState<string[]>([]);
  const privileged = ["Store Manager", "Department Supervisor"].includes(
      s.role,
    ),
    placements = data.catalog.fixtureProducts.filter((p) => p.sku === sku),
    placement =
      placements.find((p) => p.fixtureId === fixture) ?? placements[0],
    actions = s.actions[ref] ?? data.dataset.actions;
  const persist = async (p: Parameters<typeof s.save>[0]) => {
    try {
      await s.save(p);
      setNotice("บันทึกแล้ว");
    } catch (e) {
      setNotice(String(e));
    }
  };
  const report = async () => {
    try {
      if (!placement) throw new Error("เลือก SKU ที่มี Fixture ก่อน");
      const r: QuickReport = {
        id: crypto.randomUUID(),
        reference: ref,
        createdAt: new Date(reportTime + "+07:00").toISOString(),
        zoneId: data.store.fixtures.find((f) => f.id === placement.fixtureId)!
          .zoneId,
        sku,
        fixtureId: placement.fixtureId,
        count,
        replenished,
        category,
        note: note.trim(),
        status: "Pending",
      };
      validateQuickReport(data, r);
      await s.save({ reports: [...s.reports, r] });
      setNotice("ส่งรายงานแล้ว รอหัวหน้าอนุมัติก่อนเปลี่ยนสต็อก");
    } catch (e) {
      setNotice(String(e));
    }
  };
  const review = async (r: QuickReport, status: QuickReport["status"]) => {
    try {
      if (!privileged) throw new Error("Demo role นี้อนุมัติไม่ได้");
      if (status === "Approved") validateQuickReport(data, r);
      await s.save({
        reports: s.reports.map((x) =>
          x.id === r.id
            ? { ...x, status, reviewedAt: new Date().toISOString() }
            : x,
        ),
      });
      setNotice(
        status === "Approved"
          ? "อนุมัติแล้ว สต็อกและ OOS อัปเดตจากรายงาน"
          : "ปฏิเสธรายงานแล้ว",
      );
    } catch (e) {
      setNotice(String(e));
    }
  };
  return (
    <div className="intelligence staff-hub">
      <header>
        <div className="eyebrow">OPERATIONS · STORE STAFF HUB</div>
        <h1>งานสาขาและทีมพนักงาน</h1>
        <label>
          Demo role
          <select
            value={s.role}
            onChange={(e) => void persist({ role: e.target.value as DemoRole })}
          >
            {[
              "Store Manager",
              "Department Supervisor",
              "Store Staff",
              "Digital Store Talent",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <p>
          จำลองบทบาทเพื่อสาธิตเท่านั้น ไม่ใช่ระบบล็อกอินหรือควบคุมสิทธิ์จริง ·
          เก็บเฉพาะ Browser นี้
        </p>
      </header>
      <nav className="module-nav" aria-label="Operations modules">
        {[
          "Action Planning",
          "My Tasks",
          "Quick Report",
          "Digital Learning",
          "Feedback & Pain Points",
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <p role="status">{notice || s.error}</p>
      {tab === "Action Planning" ? (
        <ActionPlanning
          store={data.store}
          initialActions={data.dataset.actions}
          controlledActions={actions}
          onActionsChange={(next) =>
            void persist({
              actions: { ...s.actions, [ref]: next },
              tasks: s.tasks.map((t) =>
                t.reference === ref
                  ? {
                      ...t,
                      status:
                        next.find((a) => a.id === t.actionId)?.status ??
                        t.status,
                    }
                  : t,
              ),
            })
          }
        />
      ) : tab === "My Tasks" ? (
        <section>
          <h2>My Tasks</h2>
          <p>งานจาก Peak Time & Workforce · สถานะเชื่อม Action Planning</p>
          <Table
            headers={[
              "วัน / เวลา",
              "Zone",
              "Role",
              "Priority / Reason",
              "Status",
              "Focus",
            ]}
          >
            {s.tasks
              .filter(
                (t) =>
                  t.reference === ref &&
                  (s.role !== "Store Staff" || t.role === s.role),
              )
              .map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.date} {t.hour}:00
                  </td>
                  <td>{t.zoneId}</td>
                  <td>{t.role}</td>
                  <td>
                    {t.priority} · {t.reason}
                  </td>
                  <td>
                    <select
                      aria-label={`Task status ${t.id}`}
                      value={t.status}
                      onChange={(e) => {
                        const status = e.target.value as typeof t.status;
                        void persist({
                          tasks: s.tasks.map((x) =>
                            x.id === t.id ? { ...x, status } : x,
                          ),
                          actions: {
                            ...s.actions,
                            [ref]: actions.map((a) =>
                              a.id === t.actionId ? { ...a, status } : a,
                            ),
                          },
                        });
                      }}
                    >
                      {["Open", "In progress", "Done"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        useExplorer.getState().select(t.fixtureId ?? t.zoneId);
                        router.push(
                          `/?focus=${encodeURIComponent(t.fixtureId ?? t.zoneId)}`,
                        );
                      }}
                    >
                      เปิด 3D
                    </button>
                  </td>
                </tr>
              ))}
          </Table>
        </section>
      ) : tab === "Quick Report" ? (
        <section>
          <h2>Quick Report / Manager Review</h2>
          <label>
            Report time · Asia/Bangkok
            <input
              type="datetime-local"
              value={reportTime}
              onInput={(e) => setReportTime(e.currentTarget.value)}
            />
          </label>
          <p>
            ยอดนับคือจำนวนบนชั้นหลังเติม ·
            จำนวนเติมหักออกจากคลังครั้งเดียวเมื่ออนุมัติ · รายงาน Pending
            ไม่แก้ยอดขายหรือสต็อก · ไม่ใส่ชื่อ/เบอร์โทรลูกค้า
          </p>
          <div className="intel-fields">
            <label>
              SKU
              <select
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setFixture("");
                }}
              >
                {data.catalog.products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.nameTh}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fixture
              <select
                value={placement?.fixtureId ?? ""}
                onChange={(e) => setFixture(e.target.value)}
              >
                {placements.map((p) => (
                  <option key={p.fixtureId}>{p.fixtureId}</option>
                ))}
              </select>
            </label>
            <Field label="ยอดนับหลังเติม" value={count} onChange={setCount} />
            <Field
              label="เติมจากคลัง units"
              value={replenished}
              onChange={setReplenished}
            />
            <label>
              หมวดปัญหา
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Shelf OOS",
                  "Stock discrepancy",
                  "Customer complaint",
                  "Service delay",
                  "Damaged product",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              รายละเอียด (ไม่มี PII)
              <textarea
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button disabled={s.busy || !placement} onClick={report}>
              ส่งรายงานให้หัวหน้า
            </button>
          </div>
          <Table
            headers={[
              "รายงาน",
              "SKU / Fixture",
              "Count / เติม",
              "Status",
              "Review",
            ]}
          >
            {s.reports
              .filter((r) => r.reference === ref)
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.createdAt}
                    <br />
                    {r.category} · {r.note}
                  </td>
                  <td>
                    {r.sku}
                    <br />
                    {r.fixtureId}
                  </td>
                  <td>
                    {r.count} / {r.replenished}
                  </td>
                  <td>
                    {r.status}
                    {r.resolutionAt ? " · Resolved" : ""}
                  </td>
                  <td>
                    {r.status === "Pending" ? (
                      <>
                        <button
                          disabled={!privileged || s.busy}
                          onClick={() => review(r, "Approved")}
                        >
                          อนุมัติ
                        </button>
                        <button
                          disabled={!privileged || s.busy}
                          onClick={() => review(r, "Rejected")}
                        >
                          ปฏิเสธ
                        </button>
                      </>
                    ) : (
                      !r.resolutionAt && (
                        <button
                          disabled={!privileged || s.busy}
                          onClick={() =>
                            persist({
                              reports: s.reports.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      resolutionAt: new Date().toISOString(),
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          ปิดเคสหลังแก้ไข
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
          </Table>
        </section>
      ) : tab === "Digital Learning" ? (
        <section>
          <h2>Digital Learning · {learned.length}/5 บท (Session นี้)</h2>
          {lessons.map(([title, content, question, answer]) => (
            <article className="intel-lesson" key={title}>
              <h3>{title}</h3>
              <p>{content}</p>
              <label>
                {question}
                <select
                  aria-label={question}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === answer)
                      setLearned((a) =>
                        a.includes(title) ? a : [...a, title],
                      );
                  }}
                >
                  <option value="">เลือกคำตอบ</option>
                  <option>{answer}</option>
                  <option>ข้ามการตรวจสอบและทำทันที</option>
                </select>
              </label>
              {learned.includes(title) && <strong>✓ ผ่านบทเรียน</strong>}
            </article>
          ))}
        </section>
      ) : (
        <section>
          <h2>Feedback & Pain Points</h2>
          <p>
            Digital Store Talent ช่วยรวบรวมปัญหาและสอนการใช้ข้อมูล
            ไม่ใช้ระบบนี้เก็บข้อมูลส่วนบุคคล
          </p>
          <label>
            ข้อเสนอแนะ
            <textarea
              value={feedback}
              maxLength={1000}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </label>
          <button
            disabled={!feedback.trim() || s.busy}
            onClick={() => {
              void persist({
                feedback: [
                  ...s.feedback,
                  {
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    category: "Process / Digital adoption",
                    description: feedback.trim(),
                    status: "Open",
                  },
                ],
              });
              setFeedback("");
            }}
          >
            ส่ง Feedback
          </button>
          <Table headers={["ข้อความ", "สถานะ"]}>
            {s.feedback.map((r) => (
              <tr key={r.id}>
                <td>{r.description}</td>
                <td>
                  <select
                    disabled={!privileged}
                    value={r.status}
                    onChange={(e) =>
                      void persist({
                        feedback: s.feedback.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                status: e.target.value as typeof x.status,
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    {["Open", "In progress", "Done"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </div>
  );
}
