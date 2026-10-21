"use client";
import { useMemo } from "react";
import { Shape } from "three";
import type { Store } from "@/types";
import { useExplorer } from "@/stores/explorer";
import { InteractiveObject, SelectionHighlight } from "./InteractiveObject";
import { PartBox } from "./SceneAssets";
export function StoreEnvironment() {
  const grid = useExplorer((s) => s.grid);
  return (
    <>
      <color attach="background" args={["#eef2f6"]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#ffffff", "#c4d0df", 1]} />
      <directionalLight
        position={[-15, 40, 10]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-normalBias={0.04}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.34, 0]}
        receiveShadow
        onClick={(e) => {
          if (e.delta < 5) useExplorer.getState().select(null, false);
        }}
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#eef2f6" />
      </mesh>
      {grid && (
        <gridHelper
          args={[90, 45, "#aabed2", "#d2dee9"]}
          position={[0, -0.3, 0]}
        />
      )}
    </>
  );
}
export function StoreFloor({ store }: { store: Store }) {
  const shape = useMemo(() => {
    const s = new Shape();
    store.boundary.forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, -z);
      else s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, [store.boundary]);
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.09, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 5) useExplorer.getState().select(null, false);
        }}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#fcfcfa" />
      </mesh>
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[shape, { depth: 0.13, bevelEnabled: false }]} />
        <meshStandardMaterial color="#d1dbe4" />
      </mesh>
    </>
  );
}
export function StoreWalls({ store }: { store: Store }) {
  const walls = useExplorer((s) => s.walls);
  if (!walls) return null;
  return (
    <group>
      {store.boundary.map(([x, z], i) => {
        const [nx, nz] = store.boundary[(i + 1) % store.boundary.length];
        if (i === 0) return null;
        const length = Math.hypot(nx - x, nz - z);
        return (
          <group
            key={i}
            position={[(x + nx) / 2, 0.5, (z + nz) / 2]}
            rotation={[0, -Math.atan2(nz - z, nx - x), 0]}
          >
            <PartBox
              position={[0, 0, 0]}
              size={[length, 1, 0.16]}
              color="shelf"
            />
            <PartBox
              position={[0, 0.52, 0]}
              size={[length, 0.07, 0.2]}
              color="dark"
            />
          </group>
        );
      })}
    </group>
  );
}
export function ZoneRenderer({ store }: { store: Store }) {
  const selected = useExplorer((s) => s.selectedId);
  const hovered = useExplorer((s) => s.hoveredId);
  return (
    <>
      {store.zones.map((z) => (
        <group key={z.id}>
          <InteractiveObject id={z.id}>
            <mesh position={z.transform.position} receiveShadow>
              <boxGeometry args={z.transform.size} />
              <meshStandardMaterial
                color={z.color}
                roughness={1}
                transparent
                opacity={0.44}
              />
            </mesh>
          </InteractiveObject>
          <SelectionHighlight
            transform={z.transform}
            selected={selected === z.id}
            hovered={hovered === z.id}
          />
        </group>
      ))}
      {store.supportAreas.map((s) => (
        <group key={s.id}>
          <InteractiveObject id={s.id}>
            <mesh position={s.transform.position} receiveShadow>
              <boxGeometry args={s.transform.size} />
              <meshStandardMaterial color="#dbe3eb" />
            </mesh>
          </InteractiveObject>
          <SelectionHighlight
            transform={s.transform}
            selected={selected === s.id}
            hovered={hovered === s.id}
          />
        </group>
      ))}
    </>
  );
}
