"use client";
import { useMemo } from "react";
import { Shape } from "three";
import type { Store, Zone } from "@/types";
import type { SpatialDataset } from "@/types/spatial";
import { useSpatial } from "@/stores/spatial";
import { colorLevel, layerValue, zoneFootprint } from "@/lib/analytics/spatial";
function ZoneOverlay({ zone, color }: { zone: Zone; color: string }) {
  const shape = useMemo(() => {
    const s = new Shape();
    zoneFootprint(zone).forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, -z);
      else s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, [zone]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.18, 0]}
      raycast={() => null}
      renderOrder={1}
    >
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.84}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}
export function HeatmapLayer({
  store,
  data,
}: {
  store: Store;
  data: SpatialDataset;
}) {
  const layer = useSpatial((s) => s.activeDataLayer);
  const date = useSpatial((s) => s.selectedDate);
  const hour = useSpatial((s) => s.selectedHour);
  const colors = useMemo(
    () =>
      store.zones.map((z) =>
        layer === "normal"
          ? null
          : colorLevel(layerValue(data, date, hour, z.id, layer), layer).color,
      ),
    [data, date, hour, layer, store.zones],
  );
  if (layer === "normal") return null;
  return (
    <group name="zone-heatmap">
      {store.zones.map((z, i) => (
        <ZoneOverlay key={z.id} zone={z} color={colors[i]!} />
      ))}
    </group>
  );
}
