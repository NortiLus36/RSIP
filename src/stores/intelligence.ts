"use client";
import { create } from "zustand";
import type {
  ForecastOptions,
  ForecastSnapshot,
  StaffTask,
  QuickReport,
  StaffFeedback,
} from "@/types/intelligence";
import type { ManagementAction } from "@/types/analytics";
import { readWorkflow, writeWorkflow } from "@/lib/import/persistence";
export type DemoRole =
  | "Store Manager"
  | "Department Supervisor"
  | "Store Staff"
  | "Digital Store Talent";
interface Payload {
  version: 1;
  role: DemoRole;
  options: Record<string, ForecastOptions>;
  snapshots: ForecastSnapshot[];
  tasks: StaffTask[];
  reports: QuickReport[];
  feedback: StaffFeedback[];
  actions: Record<string, ManagementAction[]>;
}
const empty: Payload = {
  version: 1,
  role: "Store Manager",
  options: {},
  snapshots: [],
  tasks: [],
  reports: [],
  feedback: [],
  actions: {},
};
interface IntelligenceState extends Payload {
  ready: boolean;
  busy: boolean;
  error: string;
  revision: number;
  hydrate: () => Promise<void>;
  save: (patch: Partial<Payload>) => Promise<void>;
  setOptions: (ref: string, options: ForecastOptions) => void;
}
export const useIntelligence = create<IntelligenceState>((set, get) => ({
  ...empty,
  ready: false,
  busy: false,
  error: "",
  revision: 0,
  hydrate: async () => {
    if (get().ready || get().busy) return;
    set({ busy: true });
    try {
      const saved = await readWorkflow<Payload>();
      if (saved) {
        if (
          saved.version !== 1 ||
          !Array.isArray(saved.snapshots) ||
          !Array.isArray(saved.reports) ||
          !Array.isArray(saved.tasks) ||
          !saved.options ||
          !saved.actions
        )
          throw new Error("Workflow ใน Browser ไม่ถูกต้อง");
        set(saved);
      }
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ ready: true, busy: false });
    }
  },
  save: async (patch) => {
    if (get().busy) throw new Error("กำลังบันทึก โปรดรอ");
    set({ busy: true, error: "" });
    try {
      const s = get(),
        payload: Payload = {
          version: 1,
          role: s.role,
          options: s.options,
          snapshots: s.snapshots,
          tasks: s.tasks,
          reports: s.reports,
          feedback: s.feedback,
          actions: s.actions,
          ...patch,
        };
      if (payload.snapshots.length > 50 || payload.reports.length > 1000)
        throw new Error("MVP จำกัด 50 Forecasts / 1,000 Reports");
      await writeWorkflow(payload);
      set({ ...payload, revision: get().revision + 1 });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    } finally {
      set({ busy: false });
    }
  },
  setOptions: (ref, options) =>
    set((s) => ({ options: { ...s.options, [ref]: options } })),
}));
