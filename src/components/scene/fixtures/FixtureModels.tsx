"use client";
import { memo, useMemo } from "react";
import type { Fixture } from "@/types";
import {
  InstancedParts,
  PartBox,
  type Part,
  type MaterialName,
} from "../SceneAssets";
const palette: MaterialName[] = [
  "red",
  "green",
  "yellow",
  "blue",
  "pink",
  "purple",
  "orange",
  "paper",
];
function shelfFrame(
  w: number,
  h: number,
  d: number,
  levels = 4,
  warehouse = false,
): Part[] {
  const parts: Part[] = [];
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06])
    for (const z of [-d / 2 + 0.04, d / 2 - 0.04])
      parts.push({
        position: [x, h / 2, z],
        size: [0.07, h, 0.07],
        color: warehouse ? "blue" : "frame",
      });
  for (let level = 0; level < levels; level++) {
    const y = 0.12 + (level * (h - 0.52)) / (levels - 1);
    parts.push(
      {
        position: [0, y, 0],
        size: [w, 0.07, d],
        color: warehouse ? "wood" : "shelf",
      },
      {
        position: [0, y + 0.04, -d / 2],
        size: [w, 0.08, 0.04],
        color: warehouse ? "orange" : "blue",
      },
    );
  }
  return parts;
}
export const ProductShelf = memo(function ProductShelf({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const bottle = ["E", "H"].includes(fixture.zoneId);
  const parts = useMemo(() => shelfFrame(w, h, d), [w, h, d]);
  const goods = useMemo(() => {
    const a: Part[] = [];
    const nx = Math.max(1, Math.floor(w / 0.48));
    const nz = Math.max(1, Math.floor(d / 0.48));
    for (let level = 0; level < 4; level++)
      for (let x = 0; x < nx; x++)
        for (let z = 0; z < nz; z++) {
          const height = fixture.zoneId === "G" ? 0.24 + (x % 3) * 0.06 : 0.23;
          a.push({
            position: [
              -w / 2 + ((x + 0.5) * w) / nx,
              0.17 + (level * (h - 0.52)) / 3 + height / 2,
              -d / 2 + ((z + 0.5) * d) / nz,
            ],
            size: [
              Math.min(0.32, (w / nx) * 0.72),
              height,
              Math.min(0.32, (d / nz) * 0.72),
            ],
            color:
              palette[
                (x + z + level * 2 + fixture.zoneId.charCodeAt(0)) %
                  palette.length
              ],
          });
        }
    return a;
  }, [w, h, d, fixture.zoneId]);
  const bottles = useMemo(
    () =>
      bottle
        ? goods
        : fixture.zoneId === "A"
          ? goods.filter((_, i) => i % 3 === 0)
          : [],
    [goods, bottle, fixture.zoneId],
  );
  const boxes = useMemo(
    () =>
      bottle
        ? []
        : fixture.zoneId === "A"
          ? goods.filter((_, i) => i % 3 !== 0)
          : goods,
    [goods, bottle, fixture.zoneId],
  );
  const caps = useMemo<Part[]>(
    () =>
      bottles.map((item) => ({
        position: [
          item.position[0],
          item.position[1] + item.size[1] / 2 + 0.025,
          item.position[2],
        ],
        size: [0.12, 0.05, 0.12],
        color: "dark",
      })),
    [bottles],
  );
  return (
    <>
      <InstancedParts parts={parts} />
      {boxes.length > 0 && <InstancedParts parts={boxes} />}
      {bottles.length > 0 && (
        <>
          <InstancedParts parts={bottles} shape="bottle" />
          <InstancedParts parts={caps} shape="bottle" />
        </>
      )}
    </>
  );
});
export const ProduceBins = memo(function ProduceBins({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const bins = useMemo<Part[]>(
    () => [
      { position: [0, h * 0.4, 0], size: [w, h * 0.8, d], color: "wood" },
      ...[-1, 0, 1].map((x) => ({
        position: [(x * w) / 3, h * 0.85, 0] as [number, number, number],
        size: [0.05, 0.23, d] as [number, number, number],
        color: "dark" as const,
      })),
    ],
    [w, h, d],
  );
  const fruit = useMemo<Part[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        position: [
          -w * 0.4 + (i % 6) * w * 0.16,
          h * 0.8 + (i % 3) * 0.015,
          -d * 0.32 + Math.floor(i / 6) * d * 0.21,
        ],
        size: [0.25, 0.25, 0.25],
        color: i % 6 < 2 ? "green" : i % 6 < 4 ? "red" : "yellow",
      })),
    [w, h, d],
  );
  return (
    <>
      <InstancedParts parts={bins} />
      <InstancedParts parts={fruit} shape="sphere" />
    </>
  );
});
export const Refrigerator = memo(function Refrigerator({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const parts = useMemo<Part[]>(
    () => [
      ...shelfFrame(w, h, d, 4),
      { position: [0, h / 2, -d / 2], size: [w, h, 0.1], color: "dark" },
      ...[-1, 0, 1].flatMap((x) => [
        {
          position: [(x * w) / 3, h / 2, d / 2] as [number, number, number],
          size: [0.04, h, 0.04] as [number, number, number],
          color: "frame" as const,
        },
        {
          position: [(x * w) / 3 + 0.16, h * 0.55, d / 2 + 0.03] as [
            number,
            number,
            number,
          ],
          size: [0.04, 0.35, 0.05] as [number, number, number],
          color: "dark" as const,
        },
      ]),
    ],
    [w, h, d],
  );
  const goods = useMemo<Part[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        position: [
          -w * 0.38 + (i % 6) * w * 0.15,
          0.35 + (Math.floor(i / 6) * (h - 0.4)) / 4,
          0,
        ],
        size: [0.28, 0.25, d * 0.5],
        color: palette[i % 4],
      })),
    [w, h, d],
  );
  return (
    <>
      <InstancedParts parts={parts} />
      <InstancedParts parts={goods} />
      <PartBox
        position={[0, h / 2, d / 2 - 0.02]}
        size={[w - 0.1, h - 0.1, 0.025]}
        color="glass"
      />
    </>
  );
});
export const WarehouseRack = memo(function WarehouseRack({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const frame = useMemo(() => shelfFrame(w, h, d, 3, true), [w, h, d]);
  const boxes = useMemo<Part[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        position: [
          -w * 0.38 + (i % 4) * w * 0.25,
          0.45 + (Math.floor(i / 4) * (h - 0.3)) / 3,
          0,
        ],
        size: [w * 0.2, 0.56, d * 0.8],
        color: i % 2 ? "paper" : "wood",
      })),
    [w, h, d],
  );
  return (
    <>
      <InstancedParts parts={frame} />
      <InstancedParts parts={boxes} />
    </>
  );
});
export const CheckoutCounter = memo(function CheckoutCounter({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, , d] = fixture.transform.size;
  return (
    <>
      <PartBox position={[0, 0.45, 0]} size={[w, 0.9, d]} color="shelf" />
      <PartBox
        position={[0, 0.94, -0.32]}
        size={[w * 0.82, 0.08, d * 0.62]}
        color="belt"
      />
      <PartBox
        position={[w * 0.28, 1.05, d * 0.32]}
        size={[0.08, 0.24, 0.08]}
        color="dark"
      />
      <PartBox
        position={[w * 0.28, 1.24, d * 0.32]}
        size={[0.44, 0.28, 0.08]}
        color="dark"
      />
      <PartBox
        position={[w * 0.28, 1.25, d * 0.37]}
        size={[0.34, 0.18, 0.015]}
        color="blue"
      />
      <PartBox
        position={[-w * 0.35, 0.5, d * 0.25]}
        size={[0.06, 0.9, 0.25]}
        color="blue"
      />
    </>
  );
});
export const ClothingRack = memo(function ClothingRack({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const frame = useMemo<Part[]>(
    () => [
      { position: [0, h - 0.04, 0], size: [w, 0.06, 0.06], color: "dark" },
      ...[-w * 0.45, w * 0.45].flatMap((x) => [
        {
          position: [x, h / 2, 0] as [number, number, number],
          size: [0.06, h, 0.06] as [number, number, number],
          color: "frame" as const,
        },
        {
          position: [x, 0.08, 0] as [number, number, number],
          size: [0.15, 0.1, d] as [number, number, number],
          color: "dark" as const,
        },
      ]),
    ],
    [w, h, d],
  );
  const clothes = useMemo<Part[]>(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const x = -w * 0.35 + i * w * 0.175;
        const color = palette[i + 1];
        return [
          {
            position: [x, h - 0.18, 0] as [number, number, number],
            size: [0.025, 0.2, 0.025] as [number, number, number],
            color: "frame" as const,
          },
          {
            position: [x, h * 0.56, 0] as [number, number, number],
            size: [0.1, h * 0.48, 0.65] as [number, number, number],
            color,
          },
          ...[-1, 1].map((side) => ({
            position: [x, h * 0.72, side * 0.39] as [number, number, number],
            size: [0.12, 0.28, 0.27] as [number, number, number],
            rotation: [side * 0.35, 0, 0] as [number, number, number],
            color,
          })),
        ];
      }).flat(),
    [w, h],
  );
  return (
    <>
      <InstancedParts parts={frame} />
      <InstancedParts parts={clothes} />
    </>
  );
});
export const BakeryCounter = memo(function BakeryCounter({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const bread = useMemo<Part[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        position: [
          -w * 0.4 + (i % 6) * w * 0.16,
          0.95 + Math.floor(i / 6) * 0.3,
          0,
        ],
        size: [0.45, 0.17, 0.35],
        color: i % 2 ? "wood" : "yellow",
      })),
    [w],
  );
  return (
    <>
      <PartBox position={[0, 0.42, 0]} size={[w, 0.84, d]} color="wood" />
      <PartBox position={[0, 0.88, 0]} size={[w, 0.08, d]} color="dark" />
      <PartBox position={[0, h - 0.02, 0]} size={[w, 0.04, d]} color="glass" />
      <PartBox
        position={[0, 1.2, d / 2]}
        size={[w, 0.6, 0.025]}
        color="glass"
      />
      <InstancedParts parts={bread} shape="sphere" />
    </>
  );
});
export const SmallDisplay = memo(function SmallDisplay({
  fixture,
}: {
  fixture: Fixture;
}) {
  const [w, h, d] = fixture.transform.size;
  const kind = fixture.kind;
  const parts = useMemo<Part[]>(() => {
    if (kind === "pallet")
      return [
        ...Array.from({ length: 5 }, (_, i) => ({
          position: [-w * 0.4 + i * w * 0.2, 0.12, 0] as [
            number,
            number,
            number,
          ],
          size: [w * 0.15, 0.2, d] as [number, number, number],
          color: "wood" as const,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          position: [
            ((i % 2) - 0.5) * w * 0.48,
            0.3 + Math.floor(i / 2) * 0.4,
            0,
          ] as [number, number, number],
          size: [w * 0.42, 0.38, d * 0.8] as [number, number, number],
          color: "paper" as const,
        })),
      ];
    if (kind === "trolley")
      return [
        { position: [0, 0.16, 0], size: [w, 0.12, d], color: "frame" },
        {
          position: [0, h / 2, -d / 2 + 0.05],
          size: [w, h, 0.06],
          color: "blue",
        },
        ...[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => ({
            position: [x * w * 0.35, 0.07, z * d * 0.35] as [
              number,
              number,
              number,
            ],
            size: [0.17, 0.14, 0.17] as [number, number, number],
            color: "dark" as const,
          })),
        ),
      ];
    if (kind === "shoes")
      return [
        ...shelfFrame(w, h, d, 3),
        ...Array.from({ length: 9 }, (_, i) => ({
          position: [
            -w * 0.32 + (i % 3) * w * 0.32,
            0.24 + (Math.floor(i / 3) * (h - 0.4)) / 2,
            0,
          ] as [number, number, number],
          size: [0.25, 0.16, d * 0.65] as [number, number, number],
          color: palette[i % palette.length],
        })),
      ];
    return [
      { position: [0, 0.45, 0], size: [w, 0.9, d], color: "shelf" },
      ...Array.from({ length: 9 }, (_, i) => ({
        position: [
          -w * 0.3 + (i % 3) * w * 0.3,
          0.93 + Math.floor(i / 3) * 0.07,
          0,
        ] as [number, number, number],
        size: [w * 0.25, 0.06, d * 0.7] as [number, number, number],
        color: palette[i % palette.length],
      })),
    ];
  }, [kind, w, h, d]);
  return <InstancedParts parts={parts} />;
});
