import type { Fixture, Zone, Vec3 } from "@/types";

type Layout = {
  zone: string;
  kind: Fixture["kind"];
  count: number;
  start: [number, number];
  step: [number, number];
  size: Vec3;
  name: string;
  description: string;
  variant?: Fixture["variant"];
};
// Offsets are relative to the unchanged Phase 1 zone centers. Dimensions include all modeled parts.
export const fixtureLayouts: Layout[] = [
  {
    zone: "A",
    kind: "shelf",
    count: 7,
    start: [-6.6, 0],
    step: [2.2, 0],
    size: [1.05, 1.85, 7.6],
    name: "Grocery aisle",
    description: "ชั้นสองด้าน 4 ระดับ พร้อมสินค้าแบบกล่องและขวด",
  },
  {
    zone: "B",
    kind: "shelf",
    count: 4,
    start: [0, -3.2],
    step: [0, 2.1],
    size: [10, 1.65, 0.85],
    name: "Snack display",
    description: "ชั้นขนมหลายสี 4 ระดับ",
  },
  {
    zone: "C",
    kind: "produce",
    count: 5,
    start: [-6, 0],
    step: [3, 0],
    size: [2.4, 0.95, 1.8],
    name: "Produce island",
    description: "กระบะผักและผลไม้ พร้อมผลผลิตจำลอง",
  },
  {
    zone: "D",
    kind: "refrigerator",
    count: 4,
    start: [0, -4.5],
    step: [0, 3],
    size: [3.5, 1.85, 2.2],
    name: "Chilled cabinet",
    description: "ตู้แช่กระจกใส ชั้นวางและสินค้าควบคุมอุณหภูมิ",
  },
  {
    zone: "E",
    kind: "shelf",
    count: 3,
    start: [0, -2.3],
    step: [0, 2.3],
    size: [3.7, 1.7, 0.85],
    name: "Beverage shelf",
    description: "ชั้นขวดน้ำและเครื่องดื่ม 4 ระดับ",
  },
  {
    zone: "F",
    kind: "warehouse",
    count: 2,
    start: [-3, -1.1],
    step: [6, 0],
    size: [4.8, 2.5, 1.1],
    name: "Warehouse rack",
    description: "โครงเหล็กคลังสินค้าและกล่องสต็อก",
  },
  {
    zone: "F",
    kind: "pallet",
    count: 2,
    start: [-3, 1.5],
    step: [3, 0],
    size: [2, 1.2, 1.3],
    name: "Stock pallet",
    description: "พาเลตไม้และกล่องพักสินค้า",
  },
  {
    zone: "F",
    kind: "trolley",
    count: 1,
    start: [4, 1.4],
    step: [0, 0],
    size: [1.1, 1.1, 1.5],
    name: "Stock trolley",
    description: "รถเข็นเคลื่อนย้ายสินค้าในคลัง",
  },
  {
    zone: "G",
    kind: "shelf",
    count: 2,
    start: [0, -1.5],
    step: [0, 3],
    size: [3.7, 1.8, 0.9],
    name: "Home essentials",
    description: "ชั้นกล่องอุปกรณ์บ้านหลายขนาด",
  },
  {
    zone: "H",
    kind: "shelf",
    count: 2,
    start: [0, -1.25],
    step: [0, 2.5],
    size: [5.5, 1.6, 0.8],
    name: "Beauty display",
    description: "ชั้นขวดเครื่องสำอางและผลิตภัณฑ์สุขภาพ",
  },
  {
    zone: "I",
    kind: "shelf",
    count: 2,
    start: [0, -1],
    step: [0, 2],
    size: [5.5, 1.5, 0.7],
    name: "Baby products",
    description: "ชั้นสินค้าเด็ก นมผง และของใช้สำหรับแม่",
  },
  {
    zone: "J",
    kind: "shelf",
    count: 2,
    start: [0, -1],
    step: [0, 2],
    size: [5.5, 1.55, 0.7],
    name: "Pet food shelf",
    description: "ชั้นถุงอาหารสัตว์และกล่องอุปกรณ์สัตว์เลี้ยง",
  },
  {
    zone: "K",
    kind: "bakery",
    count: 2,
    start: [0, -1.5],
    step: [0, 3],
    size: [4.4, 1.55, 1.2],
    name: "Bakery counter",
    description: "เคาน์เตอร์ไม้และตู้กระจกแสดงขนมปัง",
  },
  {
    zone: "L",
    kind: "checkout",
    count: 6,
    start: [-9, 0],
    step: [3.6, 0],
    size: [1.65, 1.45, 2.7],
    name: "Checkout",
    description:
      "สายพานสินค้าและจุดชำระเงิน POS · พื้นที่คิวสงวนสำหรับ Phase ถัดไป",
  },
  {
    zone: "M",
    kind: "clothes",
    count: 3,
    start: [-4, -0.45],
    step: [2.7, 0],
    size: [2.1, 1.9, 1.8],
    name: "Clothing rack",
    description: "ราวโลหะและเสื้อแขวนแบบ low-poly",
  },
  {
    zone: "M",
    kind: "folded",
    count: 1,
    start: [4, 0.7],
    step: [0, 0],
    size: [2, 1.2, 1.2],
    name: "Folded clothing",
    description: "โต๊ะแสดงเสื้อผ้าพับ",
  },
  {
    zone: "M",
    kind: "shoes",
    count: 1,
    start: [4, -1],
    step: [0, 0],
    size: [2.1, 1.6, 0.8],
    name: "Shoe display",
    description: "ชั้นรองเท้าพร้อมรองเท้าจำลอง",
  },
];
const electronics: NonNullable<Fixture["variant"]>[] = [
  "television",
  "fridge",
  "microwave",
  "small-appliances",
];
electronics.forEach((variant, i) =>
  fixtureLayouts.push({
    zone: "N",
    kind: "electronics",
    count: 1,
    start: [0, -3.3 + i * 2.2],
    step: [0, 0],
    size: [3.4, 1.85, 1.1],
    name: variant,
    description: `เครื่องใช้ไฟฟ้าจำลอง · ${variant}`,
    variant,
  }),
);
export function buildFixtures(zones: Zone[]): Fixture[] {
  const counters = new Map<string, number>();
  return fixtureLayouts.flatMap((layout) => {
    const zone = zones.find((z) => z.id === layout.zone);
    if (!zone) throw new Error(`Missing zone ${layout.zone}`);
    return Array.from({ length: layout.count }, (_, i) => {
      const index = (counters.get(zone.id) ?? 0) + 1;
      counters.set(zone.id, index);
      return {
        id: `fixture-${zone.id.toLowerCase()}-${String(index).padStart(2, "0")}`,
        zoneId: zone.id,
        kind: layout.kind,
        name: `${layout.name} ${String(index).padStart(2, "0")}`,
        description: layout.description,
        ...(layout.variant ? { variant: layout.variant } : {}),
        transform: {
          position: [
            zone.transform.position[0] + layout.start[0] + layout.step[0] * i,
            layout.size[1] / 2 + 0.15,
            zone.transform.position[2] + layout.start[1] + layout.step[1] * i,
          ],
          size: [...layout.size],
          rotation: [0, 0, 0],
        },
      };
    });
  });
}
export const fixtureTypeNames: Record<Fixture["kind"], string> = {
  shelf: "ชั้นวางสินค้า",
  produce: "กระบะผักและผลไม้",
  refrigerator: "ตู้แช่เย็น",
  warehouse: "ชั้นคลังสินค้า",
  pallet: "พาเลตสินค้า",
  trolley: "รถเข็น",
  bakery: "เคาน์เตอร์เบเกอรี่",
  checkout: "จุดชำระเงิน",
  clothes: "ราวแขวนเสื้อผ้า",
  folded: "โต๊ะเสื้อผ้าพับ",
  shoes: "ชั้นรองเท้า",
  electronics: "เครื่องใช้ไฟฟ้า",
};
