import { create } from "zustand";
interface ExplorerState {
  selectedId: string | null;
  labels: boolean;
  grid: boolean;
  autoRotate: boolean;
  resetVersion: number;
  select: (id: string | null) => void;
  toggle: (key: "labels" | "grid" | "autoRotate") => void;
  reset: () => void;
}
export const useExplorer = create<ExplorerState>((set) => ({
  selectedId: null,
  labels: true,
  grid: false,
  autoRotate: false,
  resetVersion: 0,
  select: (id) => set({ selectedId: id }),
  toggle: (key) => set((s) => ({ [key]: !s[key] })),
  reset: () => set((s) => ({ resetVersion: s.resetVersion + 1 })),
}));
