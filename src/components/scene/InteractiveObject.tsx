"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { Transform } from "@/types";
import { useExplorer } from "@/stores/explorer";
export function InteractiveObject({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5) return;
    useExplorer.getState().select(id, false);
  };
  return (
    <group
      userData={{ objectId: id }}
      onPointerOver={(e) => {
        e.stopPropagation();
        useExplorer.getState().hover(id);
      }}
      onPointerOut={() => {
        if (useExplorer.getState().hoveredId === id)
          useExplorer.getState().hover(null);
      }}
      onClick={click}
    >
      {children}
    </group>
  );
}
export function SelectionHighlight({
  transform,
  selected,
  hovered,
}: {
  transform: Transform;
  selected: boolean;
  hovered: boolean;
}) {
  if (!selected && !hovered) return null;
  return (
    <mesh
      position={[transform.position[0], 0.24, transform.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
    >
      <planeGeometry
        args={[transform.size[0] + 0.22, transform.size[2] + 0.22]}
      />
      <meshBasicMaterial
        color={selected ? "#02aba4" : "#ffc815"}
        transparent
        opacity={selected ? 0.26 : 0.18}
        depthWrite={false}
      />
    </mesh>
  );
}
