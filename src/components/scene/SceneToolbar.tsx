"use client";
import {
  RotateCcw,
  Tags,
  Grid2X2,
  Orbit,
  Layers,
  BrickWall,
} from "lucide-react";
import { useExplorer } from "@/stores/explorer";
export function SceneToolbar() {
  const s = useExplorer();
  return (
    <div className="scene-toolbar" role="toolbar" aria-label="Scene controls">
      <button onClick={s.reset} title="Reset camera" aria-label="Reset camera">
        <RotateCcw size={17} />
      </button>
      <i />
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
      <button
        disabled
        title="Layers · Coming soon"
        aria-label="Layers coming soon"
      >
        <Layers size={17} />
      </button>
    </div>
  );
}
