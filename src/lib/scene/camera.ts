import { Vector3 } from "three";
import type { Store, Transform, Vec3 } from "@/types";
import { sceneConfig } from "@/config/floor-plan";
export function findSceneObject(store: Store, id: string | null) {
  return [...store.zones, ...store.fixtures, ...store.supportAreas].find(
    (o) => o.id === id,
  );
}
export function cameraFrame(
  transform: Transform,
  width: number,
  height: number,
  direction: Vec3 = sceneConfig.camera.position,
) {
  const forward = new Vector3(...direction).normalize();
  const right = new Vector3()
    .crossVectors(new Vector3(0, 1, 0), forward)
    .normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();
  let projectedWidth = 0,
    projectedHeight = 0;
  for (const axis of [0, 1, 2] as const) {
    projectedWidth += Math.abs(right.getComponent(axis)) * transform.size[axis];
    projectedHeight += Math.abs(up.getComponent(axis)) * transform.size[axis];
  }
  const zoom = Math.max(
    sceneConfig.minZoom,
    Math.min(
      sceneConfig.maxZoom,
      Math.max(60, width) / Math.max(1, projectedWidth),
      Math.max(60, height) / Math.max(1, projectedHeight),
    ),
  );
  return {
    target: new Vector3(...transform.position),
    offset: forward.multiplyScalar(80),
    right,
    zoom,
  };
}
export function storeBounds(store: Store): Transform {
  const xs = store.boundary.map((p) => p[0]);
  const zs = store.boundary.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  return {
    position: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
    rotation: [0, 0, 0],
    size: [maxX - minX, 5, maxZ - minZ],
  };
}
