"use client";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  Object3D,
  Color,
  type InstancedMesh,
  type BufferGeometry,
} from "three";
import type { Vec3 } from "@/types";
const colors = {
  frame: "#d4dce4",
  shelf: "#fafbf8",
  dark: "#293e54",
  wood: "#c39b6b",
  belt: "#3e4a4e",
  blue: "#5c85aa",
  glass: "#b9e7ec",
  orange: "#df9357",
  red: "#d67669",
  green: "#81a46c",
  yellow: "#e7c66d",
  pink: "#cc8fa9",
  purple: "#9a8ac2",
  paper: "#e3d6b9",
};
export type MaterialName = keyof typeof colors;
function createAssets() {
  return {
    box: new BoxGeometry(1, 1, 1),
    bottle: new CylinderGeometry(0.32, 0.4, 1, 8),
    sphere: new SphereGeometry(0.5, 8, 6),
    materials: Object.fromEntries(
      Object.entries(colors).map(([name, color]) => [
        name,
        new MeshStandardMaterial({
          color,
          roughness: name === "glass" ? 0.15 : 0.75,
          metalness: name === "frame" ? 0.35 : 0,
          transparent: name === "glass",
          opacity: name === "glass" ? 0.28 : 1,
          depthWrite: name !== "glass",
        }),
      ]),
    ) as Record<MaterialName, MeshStandardMaterial>,
  };
}
type Assets = ReturnType<typeof createAssets>;
const Context = createContext<Assets | null>(null);
export function SceneAssets({ children }: { children: React.ReactNode }) {
  const assets = useMemo(() => createAssets(), []);
  useEffect(
    () => () => {
      assets.box.dispose();
      assets.bottle.dispose();
      assets.sphere.dispose();
      Object.values(assets.materials).forEach((m) => m.dispose());
    },
    [assets],
  );
  return <Context.Provider value={assets}>{children}</Context.Provider>;
}
export function useAssets() {
  const a = useContext(Context);
  if (!a) throw new Error("Missing scene assets");
  return a;
}
export interface Part {
  position: Vec3;
  size: Vec3;
  color?: MaterialName;
  rotation?: Vec3;
}
export function PartBox({ position, size, color = "shelf", rotation }: Part) {
  const a = useAssets();
  return (
    <mesh
      geometry={a.box}
      material={a.materials[color]}
      position={position}
      scale={size}
      rotation={rotation}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
export function InstancedParts({
  parts,
  shape = "box",
  material = "shelf",
}: {
  parts: Part[];
  shape?: "box" | "bottle" | "sphere";
  material?: MaterialName;
}) {
  const a = useAssets();
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    // Shared geometry/materials belong to SceneAssets; instance GPU buffers belong to this mesh.
    return () => {
      mesh?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    const dummy = new Object3D();
    const color = new Color();
    parts.forEach((part, i) => {
      dummy.position.set(...part.position);
      dummy.scale.set(...part.size);
      dummy.rotation.set(...(part.rotation ?? [0, 0, 0]));
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      ref.current!.setColorAt(
        i,
        color.set(part.color ? a.materials[part.color].color : "#ffffff"),
      );
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [parts, a]);
  return (
    <instancedMesh
      ref={ref}
      args={[a[shape] as BufferGeometry, a.materials[material], parts.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
