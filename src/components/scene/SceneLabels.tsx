"use client";
import { useState, useEffect } from "react";
import { Html, useCursor } from "@react-three/drei";
import type { Store } from "@/types";
import { useExplorer } from "@/stores/explorer";
import { findSceneObject } from "@/lib/scene/camera";
export function SceneLabels({ store }: { store: Store }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const labels = useExplorer((s) => s.labels);
  const selected = useExplorer((s) => s.selectedId);
  const hovered = useExplorer((s) => s.hoveredId);
  useCursor(hovered !== null);
  const object = findSceneObject(store, hovered);
  if (!ready) return null;
  return (
    <>
      {labels &&
        store.zones.map((z) => (
          <Html
            key={z.id}
            center
            position={[
              z.transform.position[0],
              2.7,
              z.transform.position[2] - z.transform.size[2] / 2 + 0.3,
            ]}
            zIndexRange={[6, 1]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className={`map-label ${selected === z.id ? "map-selected" : ""}`}
            >
              <b style={{ background: z.color }}>{z.id}</b>
              <span>
                {z.name}
                <small>{z.nameTh}</small>
              </span>
            </div>
          </Html>
        ))}
      {labels &&
        store.supportAreas.map((s) => (
          <Html
            key={s.id}
            center
            position={[s.transform.position[0], 0.6, s.transform.position[2]]}
            zIndexRange={[4, 1]}
            style={{ pointerEvents: "none" }}
          >
            <div className="support-map-label">{s.nameTh}</div>
          </Html>
        ))}
      {object && (
        <Html
          center
          position={[
            object.transform.position[0],
            object.transform.size[1] + 1,
            object.transform.position[2],
          ]}
          zIndexRange={[9, 7]}
          style={{ pointerEvents: "none" }}
        >
          <div className="scene-tooltip">
            <strong>{object.name}</strong>
            <span>{object.id}</span>
          </div>
        </Html>
      )}
    </>
  );
}
