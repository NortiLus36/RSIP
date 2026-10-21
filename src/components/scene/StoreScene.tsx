"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Shape, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Store, Transform } from "@/types";
import { sceneConfig } from "@/config/floor-plan";
import { useExplorer } from "@/stores/explorer";
function Controls() {
  const ref = useRef<OrbitControlsImpl>(null);
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const reset = useExplorer((s) => s.resetVersion);
  const auto = useExplorer((s) => s.autoRotate);
  useEffect(() => {
    const camera = get().camera;
    camera.position.set(...sceneConfig.camera.position);
    if ("zoom" in camera)
      camera.zoom = Math.min(size.width / 52, size.height / 46);
    camera.lookAt(new Vector3(...sceneConfig.target));
    camera.updateProjectionMatrix();
    ref.current?.target.set(...sceneConfig.target);
    ref.current?.update();
  }, [get, reset, size.width, size.height]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      autoRotate={auto}
      autoRotateSpeed={0.55}
      minZoom={3}
      maxZoom={35}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}
function Block({ transform, color }: { transform: Transform; color: string }) {
  return (
    <mesh
      position={transform.position}
      rotation={transform.rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={transform.size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Floor({ store }: { store: Store }) {
  const shape = useMemo(() => {
    const s = new Shape();
    store.boundary.forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, -z);
      else s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, [store.boundary]);
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        receiveShadow
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#fdfdfb" side={2} />
      </mesh>
      {store.boundary.map(([x, z], i) => {
        const [nx, nz] = store.boundary[(i + 1) % store.boundary.length];
        const length = Math.hypot(nx - x, nz - z);
        return (
          <mesh
            key={i}
            position={[(x + nx) / 2, 0.3, (z + nz) / 2]}
            rotation={[0, -Math.atan2(nz - z, nx - x), 0]}
          >
            <boxGeometry args={[length, 0.65, 0.16]} />
            <meshStandardMaterial
              color="#64748b"
              transparent
              opacity={i === 0 ? 0.2 : 0.75}
            />
          </mesh>
        );
      })}
    </>
  );
}
function Content({ store }: { store: Store }) {
  const [labelsReady, setLabelsReady] = useState(false);
  useEffect(() => {
    // Mount DOM labels after Canvas has committed its container.
    const frame = requestAnimationFrame(() => setLabelsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const labels = useExplorer((s) => s.labels);
  const grid = useExplorer((s) => s.grid);
  const selected = useExplorer((s) => s.selectedId);
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight
        position={[10, 30, 15]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 0]}
        receiveShadow
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#edf1f5" />
      </mesh>
      {grid && (
        <gridHelper
          args={[100, 50, "#b8c5d4", "#d7dfe8"]}
          position={[0, -0.15, 0]}
        />
      )}
      <Floor store={store} />
      {store.zones.map((z) => (
        <group key={z.id}>
          <Block
            transform={z.transform}
            color={selected === z.id ? "#fff1bf" : z.color}
          />
          {labelsReady && labels && (
            <Html
              center
              position={[z.transform.position[0], 0.3, z.transform.position[2]]}
              zIndexRange={[5, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                className={`map-label ${selected === z.id ? "map-selected" : ""}`}
              >
                <b style={{ background: z.color }}>{z.id}</b>
                <span>
                  {z.name}
                  <small>{z.nameTh}</small>
                </span>
              </div>
            </Html>
          )}
        </group>
      ))}
      {store.fixtures.map((f) => (
        <Block key={f.id} transform={f.transform} color="#f4f6f8" />
      ))}
      {store.supportAreas.map((s) => (
        <group key={s.id}>
          <Block
            transform={s.transform}
            color={selected === s.id ? "#fff1bf" : "#dde4ec"}
          />
          {labelsReady && labels && (
            <Html
              center
              position={[s.transform.position[0], 0.4, s.transform.position[2]]}
              zIndexRange={[4, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div className="support-map-label">{s.nameTh}</div>
            </Html>
          )}
        </group>
      ))}
      <Controls />
    </>
  );
}
export default function StoreScene({ store }: { store: Store }) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: sceneConfig.camera.position,
        zoom: sceneConfig.camera.zoom,
        near: 0.1,
        far: 500,
      }}
      gl={{ antialias: true }}
      fallback={
        <div className="scene-loading">
          เบราว์เซอร์นี้ไม่รองรับ WebGL · ใช้รายการโซนเพื่อสำรวจข้อมูล
        </div>
      }
    >
      <Content store={store} />
    </Canvas>
  );
}
