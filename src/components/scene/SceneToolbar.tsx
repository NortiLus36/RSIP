"use client";
import {
  RotateCcw,
  Tags,
  Grid2X2,
  Orbit,
  Layers,
  BrickWall,
  Users,
} from "lucide-react";
import { useExplorer } from "@/stores/explorer";
import { useSpatial } from "@/stores/spatial";
import type { DataLayer } from "@/types/spatial";
import { useEnvironment } from "@/stores/environment";
export function SceneToolbar() {
  const s = useExplorer();
  const layer = useSpatial((s) => s.activeDataLayer);
  const setLayer = useSpatial((s) => s.setLayer);
  const paused = useEnvironment((s) => s.paused),
    togglePeople = useEnvironment((s) => s.toggle);
  return (
    <div className="scene-toolbar" role="toolbar" aria-label="Scene controls">
      <button onClick={s.reset} title="Reset camera" aria-label="Reset camera">
        <RotateCcw size={17} />
      </button>
      <i />
      <button
        aria-label={
          paused ? "Resume people animation" : "Pause people animation"
        }
        aria-pressed={!paused}
        className={!paused ? "on" : ""}
        onClick={togglePeople}
        title="ภาพประกอบการเดิน แยกจากข้อมูล KPI"
      >
        <Users size={17} />
      </button>
      {(
        [
          { key: "labels", icon: Tags, label: "Toggle labels" },
          { key: "grid", icon: Grid2X2, label: "Toggle grid" },
          { key: "autoRotate", icon: Orbit, label: "Auto rotate" },
          { key: "walls", icon: BrickWall, label: "Toggle walls" },
        ] as const
      ).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          className={s[key] ? "on" : ""}
          aria-label={label}
          aria-pressed={s[key]}
          title={label}
          onClick={() => s.toggle(key)}
        >
          <Icon size={17} />
        </button>
      ))}
      <i />
      <label className="layer-controller">
        <Layers size={16} />
        <select
          aria-label="Data layer"
          value={layer}
          onChange={(e) => setLayer(e.target.value as DataLayer)}
        >
          <option value="normal">Normal</option>
          <option value="density">Customer Density</option>
          <option value="sales">Sales Intensity</option>
          <option value="oos">OOS Risk</option>
        </select>
      </label>
    </div>
  );
}
