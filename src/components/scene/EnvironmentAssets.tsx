"use client";
import { Line } from "@react-three/drei";
import { SceneHtml as Html } from "./SceneHtml";
import { useMemo, useEffect } from "react";
import { MeshStandardMaterial } from "three";
import type { Store, Vec3 } from "@/types";
import { storeEnvironment } from "@/config/floor-plan";
import { PartBox, InstancedParts, useAssets } from "./SceneAssets";
import { InteractiveObject } from "./InteractiveObject";
export function ATMModel({
  color,
  position,
}: {
  color: string;
  position: Vec3;
}) {
  const a = useAssets();
  const material = useMemo(() => new MeshStandardMaterial({ color }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={position}>
      <mesh
        geometry={a.box}
        material={material}
        dispose={null}
        position={[0, 0.9, 0]}
        scale={[0.8, 1.8, 0.7]}
        castShadow
      ></mesh>
      <PartBox
        position={[0, 1.25, 0.36]}
        size={[0.57, 0.44, 0.04]}
        color="dark"
      />
      <PartBox
        position={[0, 1.25, 0.39]}
        size={[0.45, 0.3, 0.02]}
        color="blue"
      />
      <PartBox
        position={[0.22, 0.9, 0.4]}
        size={[0.2, 0.035, 0.05]}
        color="dark"
      />
      <PartBox
        position={[0, 0.58, 0.39]}
        size={[0.47, 0.07, 0.04]}
        color="dark"
      />
      <PartBox
        position={[0, 0.84, 0.4]}
        size={[0.3, 0.25, 0.09]}
        color="frame"
      />
      <InstancedParts
        material="dark"
        parts={Array.from({ length: 9 }, (_, i) => ({
          position: [
            -0.08 + (i % 3) * 0.08,
            0.92 - Math.floor(i / 3) * 0.075,
            0.46,
          ] as Vec3,
          size: [0.045, 0.04, 0.02] as Vec3,
        }))}
      />
      <Html position={[0, 1.66, 0.38]} center style={{ pointerEvents: "none" }}>
        <span className="atm-sign">ATM</span>
      </Html>
    </group>
  );
}
export function EnvironmentAssets({ store }: { store: Store }) {
  const cold = store.supportAreas.find((s) => s.id === "support-cold")!;
  const [x, , z] = cold.transform.position,
    [w, , d] = cold.transform.size;
  return (
    <group>
      <InteractiveObject id="support-atm">
        {storeEnvironment.atms.map((atm) => (
          <ATMModel key={atm.id} {...atm} />
        ))}
      </InteractiveObject>
      <InteractiveObject id="support-cold">
        <group position={[x, 0.22, z]}>
          <PartBox
            position={[0, 0.9, -d / 2]}
            size={[w, 1.8, 0.12]}
            color="frame"
          />
          <PartBox
            position={[w / 2, 0.9, 0]}
            size={[0.12, 1.8, d]}
            color="shelf"
          />
          <PartBox
            position={[-w / 2, 0.9, 0]}
            size={[0.12, 1.8, d]}
            color="shelf"
          />
          <PartBox
            position={[0, 0.9, d / 2]}
            size={[1.4, 1.8, 0.12]}
            color="blue"
          />
          <PartBox
            position={[0.47, 0.9, d / 2 + 0.08]}
            size={[0.06, 0.35, 0.05]}
            color="dark"
          />
        </group>
      </InteractiveObject>
      <Line
        points={storeEnvironment.coldChain.map(([px, pz]) => [px, 0.24, pz])}
        color="#287eae"
        lineWidth={2}
        dashed
        dashSize={0.35}
        gapSize={0.2}
        raycast={() => null}
      />
      <Html
        position={storeEnvironment.coldChainLabel}
        center
        style={{ pointerEvents: "none" }}
      >
        <span className="process-sign">Receiving → Cold Room → Fresh Food</span>
      </Html>
    </group>
  );
}
