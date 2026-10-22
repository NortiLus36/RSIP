"use client";
import {
  createContext,
  useContext,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { Html as DreiHtml } from "@react-three/drei";

const LabelPortal = createContext<RefObject<HTMLDivElement> | null>(null);
export function SceneHtmlLayer({ children }: { children: ReactNode }) {
  const portal = useRef<HTMLDivElement>(null!);
  return (
    <LabelPortal value={portal}>
      {children}
      <div className="scene-html-layer" ref={portal} />
    </LabelPortal>
  );
}
// Keep independently rendered Drei roots out of React's Canvas DOM children.
export function SceneHtml(props: ComponentProps<typeof DreiHtml>) {
  const portal = useContext(LabelPortal);
  return <DreiHtml {...props} portal={portal ?? undefined} />;
}
