"use client";
import { create } from "zustand";
import type { DashboardData } from "@/data/providers";
import type {
  ImportBundle,
  DatasetKind,
  ParsedTable,
  ColumnMapping,
} from "@/lib/import/types";
import { validateImport } from "@/lib/import/validate";
import { autoMapping, tableFromRows } from "@/lib/import/parse";
import { readSaved, writeSaved } from "@/lib/import/persistence";
interface DataState {
  source: "demo" | "imported";
  bundle: ImportBundle;
  hydrated: boolean;
  busy: boolean;
  error: string;
  revision: number;
  hydrate: (demo: DashboardData) => Promise<void>;
  save: (source: "demo" | "imported", bundle: ImportBundle) => Promise<void>;
  apply: (
    kind: DatasetKind,
    table: ParsedTable,
    mapping: ColumnMapping,
    fileName: string,
    demo: DashboardData,
  ) => Promise<void>;
}
export const useDataSource = create<DataState>((set, get) => ({
  source: "demo",
  bundle: {},
  hydrated: false,
  busy: false,
  error: "",
  revision: 0,
  hydrate: async (demo) => {
    if (get().hydrated || get().busy) return;
    set({ busy: true });
    try {
      const saved = await readSaved();
      if (saved) {
        if (
          saved.version !== 1 ||
          !["demo", "imported"].includes(saved.source) ||
          !saved.bundle ||
          typeof saved.bundle !== "object"
        )
          throw new Error("ข้อมูลบันทึกคนละเวอร์ชัน ใช้ Demo แทน");
        for (const [kind, d] of Object.entries(saved.bundle)) {
          if (!d?.rows?.length) throw new Error("ข้อมูลใน Browser ไม่ถูกต้อง");
          // Optional columns may occur only in later rows (e.g. resolvedAt).
          // Preserve their union when revalidating persisted normalized records.
          const headers = [...new Set(d.rows.flatMap((r) => Object.keys(r)))];
          const table = tableFromRows([
            headers,
            ...d.rows.map((r) => headers.map((h) => r[h])),
          ]);
          if (
            validateImport(
              kind as DatasetKind,
              table,
              autoMapping(kind as DatasetKind, headers),
              saved.bundle,
              demo.store,
              demo.catalog,
            ).errors
          )
            throw new Error(
              "ข้อมูลใน Browser ไม่ผ่าน Validation กรุณาล้างข้อมูลนำเข้า",
            );
        }
        set({
          source: saved.source,
          bundle: saved.bundle,
          revision: get().revision + 1,
        });
      }
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false, hydrated: true });
    }
  },
  save: async (source, bundle) => {
    if (get().busy) throw new Error("กำลังบันทึกข้อมูล โปรดรอ");
    set({ busy: true, error: "" });
    try {
      await writeSaved({ version: 1, source, bundle });
      set({ source, bundle, revision: get().revision + 1 });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },
  apply: async (kind, table, mapping, fileName, demo) => {
    const result = validateImport(
      kind,
      table,
      mapping,
      get().bundle,
      demo.store,
      demo.catalog,
    );
    if (result.errors)
      throw new Error("Validation มี Error ไม่ได้เปลี่ยนข้อมูลใด ๆ");
    await get().save("imported", {
      ...get().bundle,
      [kind]: {
        rows: result.rows,
        fileName,
        importedAt: new Date().toISOString(),
      },
    });
  },
}));
