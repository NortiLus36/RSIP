import type { Vec3 } from "@/types";
export interface CharacterSpec {
  id: string;
  role: "customer" | "restocker" | "cashier" | "floor-staff";
  color: string;
  cart: boolean;
  speed: number;
  phase: number;
  waypoints: [number, number][];
}
const shopperRoute: [number, number][] = [
  [-3, 27],
  [-3, 24],
  [-3, 21],
  [-2, 20.5],
  [-2, 16],
  [0, 1.1],
  [9.1, 1.1],
  [9.1, 16],
  [8.5, 20.5],
  [3, 21],
  [3, 24],
  [3, 27],
  [-3, 27],
];
export const storeEnvironment = {
  atms: ["#329763", "#8055ad", "#c64f59", "#02aba4"].map((color, i) => ({
    id: `atm-${i + 1}`,
    color,
    position: [10.5 + i, 0.22, 19] as Vec3,
    size: [0.8, 1.85, 1] as Vec3,
  })),
  doors: [
    { id: "entrance-door", position: [-3, 0.15, 24] as Vec3, width: 4 },
    { id: "exit-door", position: [3, 0.15, 24] as Vec3, width: 4 },
  ],
  securityGates: [-3, 3].flatMap((x) =>
    [-1.6, 1.6].map((dx) => ({
      position: [x + dx, 0.15, 22] as Vec3,
      size: [0.16, 1.45, 0.5] as Vec3,
    })),
  ),
  parkedCarts: [-12.2, -11.3, -10.4, -9.5].map((x) => [x, 0.15, 22] as Vec3),
  cartArea: {
    position: [-10.9, 0.16, 22] as Vec3,
    size: [4.6, 0.02, 1.6] as Vec3,
  },
  coldChain: [
    [13, -15.5],
    [18, -15.5],
    [18, -13.2],
    [9.2, -13.2],
    [9.2, -11],
    [7.5, -11],
  ] as [number, number][],
  coldChainLabel: [18, 0.8, -13.2] as Vec3,
  nav: {
    minX: -15,
    maxX: 21,
    minZ: -24,
    maxZ: 27,
    step: 0.5,
    apronHalfWidth: 7,
  },
  characters: [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `customer-${i + 1}`,
      role: "customer" as const,
      color: ["#d98272", "#5b8ebe", "#e2b856", "#9a75af", "#79a78c", "#d08dab"][
        i
      ],
      cart: i === 0 || i === 3,
      speed: 0.9 + i * 0.08,
      phase: i / 6,
      waypoints: shopperRoute,
    })),
    {
      id: "staff-restock",
      role: "restocker",
      color: "#02aba4",
      cart: false,
      speed: 0.65,
      phase: 0,
      waypoints: [
        [-8.7, -8],
        [-8.7, 1.1],
        [-9.1, 1.1],
        [-9.1, -8],
        [-8.7, -8],
      ],
    },
    {
      id: "staff-cashier",
      role: "cashier",
      color: "#02aba4",
      cart: false,
      speed: 0.2,
      phase: 0,
      waypoints: [
        [-11, 16.1],
        [-10.5, 16.1],
        [-11, 16.1],
      ],
    },
    {
      id: "staff-floor",
      role: "floor-staff",
      color: "#02aba4",
      cart: false,
      speed: 0.7,
      phase: 0.4,
      waypoints: [
        [9.1, 1],
        [9.1, 10],
        [9.1, 16],
        [9.1, 1],
      ],
    },
  ] satisfies CharacterSpec[],
};
