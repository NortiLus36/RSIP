"use client";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { MeshStandardMaterial, type Group } from "three";
import { Html } from "@react-three/drei";
import { useExplorer } from "@/stores/explorer";
import type { CharacterSpec } from "@/config/store-environment";
import { PartBox, useAssets } from "../SceneAssets";
import { ShoppingCart } from "./ShoppingCart";
export interface CharacterRig {
  root: Group;
  limbs: (Group | null)[];
}
export const CharacterModel = forwardRef<CharacterRig, { spec: CharacterSpec }>(
  function CharacterModel({ spec }, ref) {
    const root = useRef<Group>(null),
      limbs = useRef<(Group | null)[]>([]),
      a = useAssets();
    const labels = useExplorer((s) => s.labels);
    const shirt = useMemo(
      () => new MeshStandardMaterial({ color: spec.color, roughness: 0.85 }),
      [spec.color],
    );
    useEffect(() => () => shirt.dispose(), [shirt]);
    useImperativeHandle(
      ref,
      () => ({ root: root.current!, limbs: limbs.current }),
      [],
    );
    return (
      <group ref={root} name={spec.id}>
        <group position={[0, 0, spec.cart ? -0.35 : 0]}>
          <mesh
            geometry={a.sphere}
            material={a.materials.skin}
            dispose={null}
            position={[0, 1.45, 0]}
            scale={[0.33, 0.38, 0.33]}
            castShadow
          ></mesh>
          <mesh
            geometry={a.box}
            material={shirt}
            dispose={null}
            position={[0, 1.04, 0]}
            scale={[0.38, 0.48, 0.25]}
            castShadow
          ></mesh>
          {[-1, 1].map((side, i) => (
            <group
              key={`leg${side}`}
              ref={(el) => {
                limbs.current[i] = el;
              }}
              position={[side * 0.1, 0.8, 0]}
            >
              <PartBox
                position={[0, -0.37, 0]}
                size={[0.13, 0.74, 0.16]}
                color="dark"
              />
              <PartBox
                position={[0, -0.76, 0.04]}
                size={[0.15, 0.08, 0.25]}
                color="dark"
              />
            </group>
          ))}
          {[-1, 1].map((side, i) => (
            <group
              key={`arm${side}`}
              ref={(el) => {
                limbs.current[i + 2] = el;
              }}
              position={[side * 0.25, 1.23, 0]}
              rotation={[spec.cart ? -0.8 : 0, 0, 0]}
            >
              <PartBox
                position={[0, -0.25, 0]}
                size={[0.1, 0.48, 0.12]}
                color={spec.role === "customer" ? "paper" : "blue"}
              />
            </group>
          ))}
          {spec.role !== "customer" && (
            <PartBox
              position={[0.08, 1.16, 0.14]}
              size={[0.12, 0.08, 0.02]}
              color="yellow"
            />
          )}
        </group>
        {spec.cart && (
          <group position={[0, 0, 0.45]}>
            <ShoppingCart loaded />
          </group>
        )}
        {labels && (
          <Html
            position={[0, 1.85, 0]}
            center
            style={{ pointerEvents: "none" }}
          >
            <span
              className={`character-badge ${spec.role === "customer" ? "" : "staff-badge"}`}
              data-character={spec.id}
            >
              {spec.role === "customer"
                ? "ลูกค้า"
                : spec.role === "cashier"
                  ? "แคชเชียร์"
                  : spec.role === "restocker"
                    ? "เติมสินค้า"
                    : "ดูแลพื้นที่"}
            </span>
          </Html>
        )}
      </group>
    );
  },
);
