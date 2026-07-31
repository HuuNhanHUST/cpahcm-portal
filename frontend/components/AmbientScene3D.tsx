"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useInViewport } from "../hooks/useInViewport";
import type { AmbientNetworkSceneProps } from "./three/AmbientNetworkScene";

const AmbientNetworkScene = dynamic(() => import("./three/AmbientNetworkScene"), {
  ssr: false,
  loading: () => null,
});

interface AmbientScene3DProps extends Omit<AmbientNetworkSceneProps, "reduceMotion"> {
  className?: string;
}

// Wrapper dùng chung cho các khối trang trí 3D nền (khác với HeroScene3D — cảnh chính của hero).
// Chỉ mount Canvas (tạo WebGL context + vòng lặp render) khi phần tử ở gần viewport, và unmount
// khi cuộn ra xa — trang chủ giờ có nhiều khối 3D nên cần tránh chạy song song không cần thiết.
export default function AmbientScene3D({ className, ...sceneProps }: AmbientScene3DProps) {
  const reduceMotion = !!useReducedMotion();
  const [ref, isVisible] = useInViewport<HTMLDivElement>("250px 0px");

  return (
    <div ref={ref} className={className}>
      {isVisible && <AmbientNetworkScene reduceMotion={reduceMotion} {...sceneProps} />}
    </div>
  );
}
