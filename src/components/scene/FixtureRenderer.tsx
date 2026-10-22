"use client";
import { memo } from "react";
import type { Fixture } from "@/types";
import { useExplorer } from "@/stores/explorer";
import { InteractiveObject, SelectionHighlight } from "./InteractiveObject";
import {
  ProductShelf,
  ProduceBins,
  Refrigerator,
  WarehouseRack,
  CheckoutCounter,
  ClothingRack,
  BakeryCounter,
  SmallDisplay,
} from "./fixtures/FixtureModels";
export const FixtureRenderer = memo(function FixtureRenderer({
  fixture,
}: {
  fixture: Fixture;
}) {
  const selected = useExplorer((s) => s.selectedId === fixture.id);
  const hovered = useExplorer((s) => s.hoveredId === fixture.id);
  const [x, y, z] = fixture.transform.position;
  const [w, h, d] = fixture.transform.size;
  const Model =
    fixture.kind === "shelf"
      ? ProductShelf
      : fixture.kind === "produce"
        ? ProduceBins
        : fixture.kind === "refrigerator"
          ? Refrigerator
          : fixture.kind === "warehouse"
            ? WarehouseRack
            : fixture.kind === "checkout"
              ? CheckoutCounter
              : fixture.kind === "clothes"
                ? ClothingRack
                : fixture.kind === "bakery"
                  ? BakeryCounter
                  : SmallDisplay;
  return (
    <>
      <InteractiveObject id={fixture.id}>
        <group
          position={[x, y - h / 2, z]}
          rotation={fixture.transform.rotation}
        >
          <Model fixture={fixture} />
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshBasicMaterial
              transparent
              opacity={0}
              depthWrite={false}
              colorWrite={false}
            />
          </mesh>
          {(selected || hovered) && (
            <mesh position={[0, h / 2, 0]} raycast={() => null}>
              <boxGeometry args={[w + 0.08, h + 0.08, d + 0.08]} />
              <meshBasicMaterial
                color={selected ? "#02aba4" : "#ffc815"}
                wireframe
                transparent
                opacity={0.75}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      </InteractiveObject>
      <SelectionHighlight
        transform={fixture.transform}
        selected={selected}
        hovered={hovered}
      />
    </>
  );
});
