import { create } from "zustand";
export const useEnvironment = create<{ paused: boolean; toggle: () => void }>(
  (set) => ({
    paused: false,
    toggle: () => set((s) => ({ paused: !s.paused })),
  }),
);
