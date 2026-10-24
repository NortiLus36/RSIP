import type { DashboardData } from "@/data/providers";
import type { QuickReport } from "@/types/intelligence";
import type { ManagementAction } from "@/types/analytics";
export interface CaseState {
  status: ManagementAction["status"];
  resolvedAt?: string;
  actionId?: string;
}
export type CaseStates = Record<string, Record<string, CaseState>>;
export const bangkokDay = (date: string) =>
  new Date(Date.parse(date) + 7 * 3600000).toISOString().slice(0, 10);
export function syncCases(
  states: CaseStates,
  actions: Record<string, ManagementAction[]>,
  now: string,
): CaseStates {
  return Object.fromEntries(
    Object.entries(states).map(([ref, cases]) => [
      ref,
      Object.fromEntries(
        Object.entries(cases).map(([id, c]) => {
          const a = actions[ref]?.find((a) => a.id === c.actionId);
          return [
            id,
            a
              ? {
                  ...c,
                  status: a.status,
                  resolvedAt:
                    a.status === "Done" ? (c.resolvedAt ?? now) : undefined,
                }
              : c,
          ];
        }),
      ),
    ]),
  );
}
export function customerModel(
  data: DashboardData,
  reports: QuickReport[],
  states: CaseStates,
  from: string,
  to: string,
  zone: string,
) {
  const ref = data.dataset.intelligence?.reference ?? "legacy";
  const imported = (data.dataset.intelligence?.feedback ?? []).map((r) => ({
    id: `import:${r.caseId}`,
    zoneId: String(r.zoneId),
    category: String(r.category),
    severity: Number(r.severity),
    createdAt: String(r.dateTime),
    description: String(r.description),
    status: r.status as CaseState["status"],
    resolvedAt: r.resolvedAt ? String(r.resolvedAt) : undefined,
  }));
  const staff = reports
    .filter((r) => r.reference === ref)
    .map((r) => ({
      id: `report:${r.id}`,
      zoneId: r.zoneId,
      category: r.category,
      severity: 3,
      createdAt: r.createdAt,
      description: r.note || r.sku,
      status: r.resolutionAt ? ("Done" as const) : ("Open" as const),
      resolvedAt: r.resolutionAt,
    }));
  const cases = [...imported, ...staff]
    .map((c) => ({ ...c, ...states[ref]?.[c.id] }))
    .filter(
      (c) =>
        Number.isFinite(Date.parse(c.createdAt)) &&
        bangkokDay(c.createdAt) >= from &&
        bangkokDay(c.createdAt) <= to &&
        (!zone || c.zoneId === zone),
    );
  const resolved = cases.filter((c) => c.status === "Done");
  const times = resolved.flatMap((c) =>
    c.resolvedAt && Date.parse(c.resolvedAt) >= Date.parse(c.createdAt)
      ? [(Date.parse(c.resolvedAt) - Date.parse(c.createdAt)) / 3600000]
      : [],
  );
  const sales = data.dataset.sales.filter(
    (r) => r.date >= from && r.date <= to && (!zone || r.zoneId === zone),
  );
  const transactions =
    sales.length && sales.every((r) => r.transactionId)
      ? new Set(sales.map((r) => r.transactionId)).size
      : null;
  const days = data.dataset.storeDays.filter(
    (r) => r.date >= from && r.date <= to,
  );
  const responses = !zone ? days.reduce((sum, r) => sum + r.responses, 0) : 0;
  const satisfied = !zone ? days.reduce((sum, r) => sum + r.satisfied, 0) : 0;
  const known = cases.length > 0;
  return {
    cases,
    known,
    transactions,
    resolved: known ? resolved.length : null,
    count: known ? cases.length : null,
    rate: known && transactions ? (cases.length / transactions) * 1000 : null,
    resolutionRate: cases.length
      ? (resolved.length / cases.length) * 100
      : null,
    hours: times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : null,
    csat: responses ? (satisfied / responses) * 100 : null,
    responses: responses || null,
    categories: [...new Set(cases.map((c) => c.category))].map((category) => ({
      date: category,
      cases: cases.filter((c) => c.category === category).length,
    })),
  };
}
