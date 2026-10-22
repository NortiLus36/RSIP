"use client";
import type { Vec3 } from "@/types";
import { PartBox, InstancedParts } from "../SceneAssets";
export function ShoppingCart({ loaded = false }: { loaded?: boolean }) {
  const rails = Array.from({ length: 6 }, (_, i) => ({
    position: [-0.25 + i * 0.1, 0.63, 0.38] as Vec3,
    size: [0.025, 0.36, 0.025] as Vec3,
  }));
  return (
    <group>
      <PartBox
        position={[0, 0.36, 0]}
        size={[0.52, 0.04, 0.72]}
        color="frame"
      />
      <PartBox
        position={[0, 0.47, 0]}
        size={[0.54, 0.04, 0.76]}
        color="frame"
      />
      <PartBox position={[0, 0.8, 0]} size={[0.58, 0.04, 0.8]} color="frame" />
      {[-0.27, 0.27].map((x) => (
        <group key={x}>
          <PartBox
            position={[x, 0.63, 0]}
            size={[0.025, 0.35, 0.76]}
            color="glass"
          />
          <PartBox
            position={[x, 0.23, 0]}
            size={[0.035, 0.4, 0.5]}
            color="frame"
          />
        </group>
      ))}
      <PartBox
        position={[0, 0.86, -0.46]}
        size={[0.6, 0.06, 0.07]}
        color="blue"
      />
      <InstancedParts parts={rails} material="frame" />
      <InstancedParts
        material="dark"
        shape="sphere"
        parts={[-0.22, 0.22].flatMap((x) =>
          [-0.27, 0.27].map((z) => ({
            position: [x, 0.09, z] as Vec3,
            size: [0.17, 0.17, 0.12] as Vec3,
          })),
        )}
      />
      {loaded && (
        <>
          <PartBox
            position={[-0.12, 0.59, 0]}
            size={[0.2, 0.25, 0.3]}
            color="orange"
          />
          <PartBox
            position={[0.1, 0.63, 0.16]}
            size={[0.18, 0.3, 0.18]}
            color="green"
          />
        </>
      )}
    </group>
  );
}
