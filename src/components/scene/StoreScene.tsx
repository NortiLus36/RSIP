"use client";
import { Canvas } from "@react-three/fiber";
import type { Store } from "@/types";
import { sceneConfig } from "@/config/floor-plan";
import { useExplorer } from "@/stores/explorer";
import { SceneAssets } from "./SceneAssets";
import { CameraController } from "./CameraController";
import {
  StoreEnvironment,
  StoreFloor,
  StoreWalls,
  ZoneRenderer,
} from "./StoreEnvironment";
import { FixtureRenderer } from "./FixtureRenderer";
import { SceneLabels } from "./SceneLabels";
export default function StoreScene({ store }: { store: Store }) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.5]}
      camera={{
        position: sceneConfig.camera.position,
        zoom: sceneConfig.camera.zoom,
        near: 0.1,
        far: 400,
      }}
      gl={{ antialias: true }}
      onPointerMissed={(e) => {
        if (e.type === "click") useExplorer.getState().select(null, false);
      }}
      fallback={
        <div className="scene-loading">
          เบราว์เซอร์นี้ไม่รองรับ WebGL · ใช้รายการโซนเพื่อสำรวจข้อมูล
        </div>
      }
    >
      <SceneAssets>
        <StoreEnvironment />
        <StoreFloor store={store} />
        <StoreWalls store={store} />
        <ZoneRenderer store={store} />
        {store.fixtures.map((f) => (
          <FixtureRenderer key={f.id} fixture={f} />
        ))}
        <CameraController store={store} />
        <SceneLabels store={store} />
      </SceneAssets>
    </Canvas>
  );
}
