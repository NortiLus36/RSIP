import { create } from "zustand";
interface ExplorerState {
  selectedId: string | null;
  labels: boolean;
  grid: boolean;
  autoRotate: boolean;
  walls: boolean;
  hoveredId: string | null;
  focusVersion: number;
  resetVersion: number;
  select: (id: string | null, focus?: boolean) => void;
  hover: (id: string | null) => void;
  focus: () => void;
  stopAutoRotate: () => void;
  toggle: (key: "labels" | "grid" | "autoRotate" | "walls") => void;
  reset: () => void;
}
export const useExplorer = create<ExplorerState>((set) => ({
  selectedId: null,
  labels: true,
  grid: false,
  autoRotate: false,
  walls: true,
  hoveredId: null,
  focusVersion: 0,
  resetVersion: 0,
  select: (id, focus = true) =>
    set((s) => ({
      selectedId: id,
      hoveredId: !id || focus ? null : s.hoveredId,
      autoRotate: false,
      focusVersion: s.focusVersion + (id && focus ? 1 : 0),
    })),
  hover: (id) => set((s) => (s.hoveredId === id ? s : { hoveredId: id })),
  focus: () =>
    set((s) => ({ focusVersion: s.focusVersion + 1, autoRotate: false })),
  stopAutoRotate: () => set((s) => (s.autoRotate ? { autoRotate: false } : s)),
  toggle: (key) => set((s) => ({ [key]: !s[key] })),
  reset: () =>
    set((s) => ({
      resetVersion: s.resetVersion + 1,
      autoRotate: false,
      hoveredId: null,
    })),
}));
