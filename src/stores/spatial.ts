import { create } from "zustand";
import type { DataLayer } from "@/types/spatial";
import { spatialDates, spatialHours } from "@/config/heatmap";
interface SpatialState {
  activeDataLayer: DataLayer;
  selectedDate: string;
  selectedHour: number;
  playing: boolean;
  speed: 1 | 2 | 5;
  setLayer: (layer: DataLayer) => void;
  setTime: (date: string, hour: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: 1 | 2 | 5) => void;
}
export const useSpatial = create<SpatialState>((set) => ({
  activeDataLayer: "normal",
  selectedDate: "2026-10-22",
  selectedHour: 18,
  playing: false,
  speed: 1,
  setLayer: (activeDataLayer) => set({ activeDataLayer }),
  setTime: (selectedDate, selectedHour) => {
    if (
      spatialDates.includes(selectedDate) &&
      spatialHours.includes(selectedHour)
    )
      set({ selectedDate, selectedHour, playing: false });
  },
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
}));
