import type { Store } from "@/types";
import { storeEnvironment } from "@/config/store-environment";
type Point = [number, number];
export interface Obstacle {
  x: number;
  z: number;
  w: number;
  d: number;
  id: string;
}
export function environmentObstacles(store: Store): Obstacle[] {
  return [
    ...store.fixtures.map((f) => ({
      x: f.transform.position[0],
      z: f.transform.position[2],
      w: f.transform.size[0],
      d: f.transform.size[2],
      id: f.id,
    })),
    ...store.supportAreas
      .filter((s) =>
        ["support-cold", "support-staff", "support-restroom"].includes(s.id),
      )
      .map((s) => ({
        x: s.transform.position[0],
        z: s.transform.position[2],
        w: s.transform.size[0],
        d: s.transform.size[2],
        id: s.id,
      })),
    ...storeEnvironment.atms.map((a) => ({
      x: a.position[0],
      z: a.position[2],
      w: a.size[0],
      d: a.size[2],
      id: a.id,
    })),
    ...storeEnvironment.securityGates.map((a, i) => ({
      x: a.position[0],
      z: a.position[2],
      w: a.size[0],
      d: a.size[2],
      id: `gate-${i}`,
    })),
    ...storeEnvironment.doors.flatMap((door) =>
      [-1, 1].map((sign) => ({
        x: door.position[0] + (sign * door.width) / 2,
        z: door.position[2],
        w: 0.15,
        d: 0.2,
        id: door.id,
      })),
    ),
    ...storeEnvironment.parkedCarts.map((p, i) => ({
      x: p[0],
      z: p[2],
      w: 0.6,
      d: 0.9,
      id: `parked-${i}`,
    })),
  ];
}
export function pointClear(
  point: Point,
  obstacles: Obstacle[],
  radius: number,
) {
  return obstacles.every(
    (o) =>
      Math.abs(point[0] - o.x) >= o.w / 2 + radius ||
      Math.abs(point[1] - o.z) >= o.d / 2 + radius,
  );
}
function inside(point: Point, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, z] = polygon[i],
      [px, pz] = polygon[j];
    if (
      z > point[1] !== pz > point[1] &&
      point[0] < ((px - x) * (point[1] - z)) / (pz - z) + x
    )
      result = !result;
  }
  return result;
}
export function planRoute(
  store: Store,
  anchors: Point[],
  radius: number,
): Point[] {
  const { minX, maxX, minZ, maxZ, step } = storeEnvironment.nav,
    obstacles = environmentObstacles(store);
  const frontZ = Math.max(...store.boundary.map(([, z]) => z));
  const width = Math.round((maxX - minX) / step) + 1,
    height = Math.round((maxZ - minZ) / step) + 1;
  const position = (id: number): Point => [
    minX + (id % width) * step,
    minZ + Math.floor(id / width) * step,
  ];
  const allowed = new Uint8Array(width * height);
  for (let id = 0; id < allowed.length; id++) {
    const p = position(id);
    allowed[id] = Number(
      (inside(p, store.boundary) ||
        (p[1] >= frontZ &&
          Math.abs(p[0]) <= storeEnvironment.nav.apronHalfWidth)) &&
        pointClear(p, obstacles, radius),
    );
  }
  const snap = ([x, z]: Point) => {
    const id =
      Math.round((z - minZ) / step) * width + Math.round((x - minX) / step);
    if (id < 0 || id >= allowed.length || !allowed[id])
      throw new Error(`Blocked route anchor ${x},${z} (clearance ${radius})`);
    return id;
  };
  const path: Point[] = [];
  for (let segment = 1; segment < anchors.length; segment++) {
    const start = snap(anchors[segment - 1]),
      target = snap(anchors[segment]);
    const open = new Set([start]),
      cost = new Map([[start, 0]]),
      previous = new Map<number, number>();
    const heuristic = (id: number) => {
      const a = position(id),
        b = position(target);
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    };
    let found = false;
    while (open.size) {
      let current = -1,
        best = Infinity;
      for (const id of open) {
        const score = cost.get(id)! * step + heuristic(id);
        if (score < best) {
          best = score;
          current = id;
        }
      }
      if (current === target) {
        found = true;
        break;
      }
      open.delete(current);
      const col = current % width,
        row = Math.floor(current / width);
      const neighbors = [
        col > 0 ? current - 1 : -1,
        col < width - 1 ? current + 1 : -1,
        row > 0 ? current - width : -1,
        row < height - 1 ? current + width : -1,
      ];
      for (const id of neighbors)
        if (id >= 0 && allowed[id]) {
          const next = cost.get(current)! + 1;
          if (next < (cost.get(id) ?? Infinity)) {
            previous.set(id, current);
            cost.set(id, next);
            open.add(id);
          }
        }
    }
    if (!found)
      throw new Error(
        `No collision-free route from ${anchors[segment - 1]} to ${anchors[segment]}`,
      );
    const ids = [target];
    while (ids.at(-1) !== start) ids.push(previous.get(ids.at(-1)!)!);
    const points = ids.reverse().map(position);
    if (path.length) points.shift();
    path.push(...points);
  }
  return path;
}
export function routeLengths(points: Point[]) {
  let total = 0;
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
    cumulative.push(total);
  }
  return { points, cumulative, total };
}
export function sampleRoute(
  route: ReturnType<typeof routeLengths>,
  distance: number,
) {
  const at = ((distance % route.total) + route.total) % route.total;
  let i = 1;
  while (i < route.cumulative.length - 1 && route.cumulative[i] < at) i++;
  const a = route.points[i - 1],
    b = route.points[i],
    length = route.cumulative[i] - route.cumulative[i - 1],
    t = length ? (at - route.cumulative[i - 1]) / length : 0;
  return {
    x: a[0] + (b[0] - a[0]) * t,
    z: a[1] + (b[1] - a[1]) * t,
    angle: Math.atan2(b[0] - a[0], b[1] - a[1]),
  };
}
export function doorShouldOpen(
  door: Point,
  people: { x: number; z: number }[],
) {
  return people.some((p) => Math.hypot(p.x - door[0], p.z - door[1]) < 3.2);
}
