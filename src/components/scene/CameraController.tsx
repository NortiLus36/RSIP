"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MathUtils, MOUSE, Vector3, type OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Store } from "@/types";
import { sceneConfig } from "@/config/floor-plan";
import { useExplorer } from "@/stores/explorer";
import { cameraFrame, findSceneObject, storeBounds } from "@/lib/scene/camera";
type Transition = { target: Vector3; position: Vector3; zoom: number };
export function CameraController({ store }: { store: Store }) {
  const ref = useRef<OrbitControlsImpl>(null);
  const goal = useRef<Transition | null>(null);
  const first = useRef(true);
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const reset = useExplorer((s) => s.resetVersion);
  const focus = useExplorer((s) => s.focusVersion);
  const auto = useExplorer((s) => s.autoRotate);
  const lastReset = useRef(reset);
  const lastFocus = useRef(-1);
  useEffect(() => {
    const canvas = get().gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Interactive 3D store");
    const focusCanvas = () => canvas.focus({ preventScroll: true });
    const keyNavigation = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        goal.current = null;
        useExplorer.getState().stopAutoRotate();
        const controls = ref.current;
        if (!controls) return;
        event.preventDefault();
        const camera = get().camera as OrthographicCamera;
        const horizontal =
          event.key === "ArrowLeft" || event.key === "ArrowRight";
        const sign =
          event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
        const offset = new Vector3()
          .setFromMatrixColumn(camera.matrixWorld, horizontal ? 0 : 1)
          .multiplyScalar((sign * 12) / camera.zoom);
        camera.position.add(offset);
        controls.target.add(offset);
        controls.update();
      }
    };
    canvas.addEventListener("pointerdown", focusCanvas);
    canvas.addEventListener("keydown", keyNavigation);
    return () => {
      canvas.removeEventListener("pointerdown", focusCanvas);
      canvas.removeEventListener("keydown", keyNavigation);
    };
  }, [get]);
  useEffect(() => {
    if (!first.current && lastReset.current === reset) return;
    lastReset.current = reset;
    const camera = get().camera as OrthographicCamera;
    const frame = cameraFrame(
      storeBounds(store),
      size.width * 0.9,
      size.height * 0.83,
    );
    const position = frame.target.clone().add(frame.offset);
    if (first.current) {
      camera.position.copy(position);
      camera.zoom = frame.zoom;
      camera.updateProjectionMatrix();
      ref.current?.target.copy(frame.target);
      ref.current?.update();
      first.current = false;
    } else goal.current = { target: frame.target, position, zoom: frame.zoom };
  }, [get, store, size.width, size.height, reset]);
  useEffect(() => {
    if (!focus || lastFocus.current === focus) return;
    lastFocus.current = focus;
    const object = findSceneObject(store, useExplorer.getState().selectedId);
    if (!object) return;
    const camera = get().camera;
    const direction = camera.position
      .clone()
      .sub(ref.current?.target ?? new Vector3())
      .normalize();
    if (direction.y < 0.3) direction.y = 0.7;
    const frame = cameraFrame(
      object.transform,
      Math.max(120, size.width - 60) * 0.75,
      Math.max(120, size.height - 100) * 0.8,
      direction.toArray(),
    );
    goal.current = {
      target: frame.target,
      position: frame.target.clone().add(frame.offset),
      zoom: frame.zoom,
    };
  }, [focus, store, get, size.width, size.height]);
  useFrame((_, delta) => {
    if (!goal.current || !ref.current) return;
    const camera = get().camera as OrthographicCamera;
    const t = 1 - Math.exp(-7 * Math.min(delta, 0.1));
    camera.position.lerp(goal.current.position, t);
    ref.current.target.lerp(goal.current.target, t);
    camera.zoom = MathUtils.lerp(camera.zoom, goal.current.zoom, t);
    camera.updateProjectionMatrix();
    ref.current.update();
    if (
      camera.position.distanceTo(goal.current.position) < 0.005 &&
      Math.abs(camera.zoom - goal.current.zoom) < 0.005
    )
      goal.current = null;
  });
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      autoRotate={auto}
      autoRotateSpeed={0.55}
      minZoom={sceneConfig.minZoom}
      maxZoom={sceneConfig.maxZoom}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.25}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      onStart={() => {
        goal.current = null;
        useExplorer.getState().stopAutoRotate();
      }}
    />
  );
}
