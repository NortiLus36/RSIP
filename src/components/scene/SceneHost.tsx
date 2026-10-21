"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { Store } from "@/types";
const StoreScene = dynamic(() => import("./StoreScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <span />
      กำลังเตรียมพื้นที่ 3D...
    </div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-loading">
        <strong>ไม่สามารถแสดงผล 3D ได้</strong>
        <span>
          โปรดเปิด WebGL หรือลองใช้เบราว์เซอร์อื่น · รายการโซนและ KPI
          ยังใช้งานได้
        </span>
        <button onClick={() => this.setState({ failed: false })}>
          ลองอีกครั้ง
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function SceneHost({ store }: { store: Store }) {
  return (
    <div className="canvas-container">
      <SceneBoundary>
        <StoreScene store={store} />
      </SceneBoundary>
    </div>
  );
}
