"use client";
import type { Fixture } from "@/types";
import { PartBox } from "../SceneAssets";
export function ElectronicsDisplay({ fixture }: { fixture: Fixture }) {
  const [w, , d] = fixture.transform.size;
  return (
    <group>
      <PartBox position={[0, 0.2, 0]} size={[w, 0.4, d]} color="frame" />
      {[-0.95, 0.95].map((x) => (
        <group key={x} position={[x, 0.4, 0]}>
          {fixture.variant === "television" ? (
            <>
              <PartBox
                position={[0, 0.65, 0]}
                size={[1.45, 0.85, 0.14]}
                color="dark"
              />
              <PartBox
                position={[0, 0.65, 0.08]}
                size={[1.28, 0.68, 0.02]}
                color="blue"
              />
              <PartBox
                position={[0, 0.12, 0]}
                size={[0.16, 0.25, 0.16]}
                color="frame"
              />
              <PartBox
                position={[0, 0.03, 0]}
                size={[0.7, 0.05, 0.35]}
                color="dark"
              />
            </>
          ) : fixture.variant === "fridge" ? (
            <>
              <PartBox
                position={[0, 0.7, 0]}
                size={[0.85, 1.4, 0.75]}
                color="shelf"
              />
              <PartBox
                position={[0, 1.13, 0.39]}
                size={[0.8, 0.46, 0.03]}
                color="frame"
              />
              <PartBox
                position={[0.28, 0.63, 0.43]}
                size={[0.04, 0.4, 0.05]}
                color="dark"
              />
            </>
          ) : fixture.variant === "microwave" ? (
            <>
              <PartBox
                position={[0, 0.33, 0]}
                size={[1.4, 0.65, 0.75]}
                color="frame"
              />
              <PartBox
                position={[-0.15, 0.33, 0.39]}
                size={[0.9, 0.43, 0.03]}
                color="dark"
              />
              <PartBox
                position={[0.53, 0.33, 0.42]}
                size={[0.12, 0.35, 0.04]}
                color="shelf"
              />
            </>
          ) : (
            <>
              <PartBox
                position={[0, 0.22, 0]}
                size={[0.65, 0.44, 0.6]}
                color="dark"
              />
              <PartBox
                position={[0, 0.63, 0]}
                size={[0.4, 0.48, 0.42]}
                color="glass"
              />
              <PartBox
                position={[0, 0.9, 0]}
                size={[0.46, 0.06, 0.48]}
                color="frame"
              />
            </>
          )}
        </group>
      ))}
    </group>
  );
}
