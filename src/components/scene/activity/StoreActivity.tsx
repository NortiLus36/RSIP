"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { Store } from "@/types";
import { storeEnvironment } from "@/config/floor-plan";
import {
  planRoute,
  routeLengths,
  sampleRoute,
  doorShouldOpen,
} from "@/lib/scene/navigation";
import { useEnvironment } from "@/stores/environment";
import { PartBox } from "../SceneAssets";
import { CharacterModel, type CharacterRig } from "./CharacterModel";
import { ShoppingCart } from "./ShoppingCart";
export function StoreActivity({ store }: { store: Store }) {
  const rigs = useRef<(CharacterRig | null)[]>([]),
    panels = useRef<(Group | null)[]>([]);
  const doorBadges = useRef<(HTMLSpanElement | null)[]>([]);
  const motion = useMemo(
    () =>
      storeEnvironment.characters.map((spec) => {
        const route = routeLengths(
          planRoute(store, spec.waypoints, spec.cart ? 0.85 : 0.28),
        );
        return { spec, route, distance: route.total * spec.phase };
      }),
    [store],
  );
  const doorMotion = useRef(
    storeEnvironment.doors.map(() => ({ open: 0, hold: 0 })),
  );
  useFrame((_, rawDelta) => {
    const paused = useEnvironment.getState().paused,
      delta = Math.min(rawDelta, 0.05);
    const positions = motion.map((m) => sampleRoute(m.route, m.distance));
    motion.forEach((m, i) => {
      const rig = rigs.current[i];
      if (!rig) return;
      const ahead = sampleRoute(m.route, m.distance + m.spec.speed * delta);
      const yielding = positions.some(
        (p, j) =>
          j < i &&
          Math.hypot(p.x - ahead.x, p.z - ahead.z) < (m.spec.cart ? 1 : 0.65),
      );
      if (!paused && !yielding) m.distance += m.spec.speed * delta;
      const p = sampleRoute(m.route, m.distance);
      rig.root.position.set(p.x, 0.16, p.z);
      rig.root.rotation.y = p.angle;
      const stride = !paused && !yielding ? Math.sin(m.distance * 6) * 0.42 : 0;
      rig.limbs.forEach((limb, k) => {
        if (limb)
          limb.rotation.x =
            k < 2
              ? k === 0
                ? stride
                : -stride
              : m.spec.cart
                ? -0.8
                : (k === 2 ? -stride : stride) * 0.7;
      });
    });
    storeEnvironment.doors.forEach((door, i) => {
      const people = motion.map((m) => sampleRoute(m.route, m.distance));
      const near = doorShouldOpen([door.position[0], door.position[2]], people),
        state = doorMotion.current[i];
      if (!paused) {
        state.hold = near ? 0.8 : Math.max(0, state.hold - delta);
        const target = near || state.hold > 0 ? 1 : 0;
        state.open += Math.max(
          -delta * 2.5,
          Math.min(delta * 5, target - state.open),
        );
      }
      [-1, 1].forEach((sign, j) => {
        const panel = panels.current[i * 2 + j];
        if (panel)
          panel.position.x =
            sign * (door.width / 4 + (state.open * door.width) / 3);
      });
      const badge = doorBadges.current[i];
      const label = `${i === 0 ? "ENTRANCE" : "EXIT"} · ${state.open > 0.95 ? "OPEN" : state.open < 0.05 ? "CLOSED" : near ? "OPENING" : "CLOSING"}`;
      if (badge && badge.textContent !== label) badge.textContent = label;
    });
  });
  return (
    <group name="visual-store-activity">
      {motion.map((m, i) => (
        <CharacterModel
          key={m.spec.id}
          spec={m.spec}
          ref={(r) => {
            rigs.current[i] = r;
          }}
        />
      ))}
      {storeEnvironment.doors.map((door, i) => (
        <group key={door.id} position={door.position} name={door.id}>
          {[-1, 1].map((sign) => (
            <PartBox
              key={sign}
              position={[(sign * door.width) / 2, 1.25, 0]}
              size={[0.12, 2.5, 0.18]}
              color="frame"
            />
          ))}
          <PartBox
            position={[0, 2.5, 0]}
            size={[door.width + 0.14, 0.14, 0.22]}
            color="blue"
          />
          {[-1, 1].map((sign, j) => (
            <group
              key={sign}
              ref={(r) => {
                panels.current[i * 2 + j] = r;
              }}
              position={[(sign * door.width) / 4, 0, 0]}
            >
              <PartBox
                position={[0, 1.2, 0]}
                size={[door.width / 2 - 0.08, 2.35, 0.07]}
                color="glass"
              />
              <PartBox
                position={[0, 1.1, 0.05]}
                size={[door.width / 2 - 0.08, 0.06, 0.05]}
                color="frame"
              />
            </group>
          ))}
          <Html position={[0, 2.7, 0]} center style={{ pointerEvents: "none" }}>
            <span
              className="process-sign"
              data-door={door.id}
              ref={(el) => {
                doorBadges.current[i] = el;
              }}
            >
              {i === 0 ? "ENTRANCE" : "EXIT"} · AUTO
            </span>
          </Html>
        </group>
      ))}
      {storeEnvironment.securityGates.map((gate, i) => (
        <group key={i} position={gate.position}>
          <PartBox position={[0, 0.7, 0]} size={gate.size} color="frame" />
          <PartBox
            position={[0, 0.75, 0.28]}
            size={[0.08, 1.15, 0.025]}
            color="blue"
          />
        </group>
      ))}
      <PartBox {...storeEnvironment.cartArea} color="blue" />
      {storeEnvironment.parkedCarts.map((p, i) => (
        <group key={i} position={p}>
          <ShoppingCart loaded={i === 0} />
        </group>
      ))}
      <Html
        position={[
          storeEnvironment.cartArea.position[0],
          0.6,
          storeEnvironment.cartArea.position[2],
        ]}
        center
        style={{ pointerEvents: "none" }}
      >
        <span className="process-sign">CART PARKING</span>
      </Html>
    </group>
  );
}
