"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useInViewport } from "../hooks/useInViewport";

// WebGL/three.js không thể render phía server — tách riêng bundle này và chỉ load ở client,
// tránh lỗi SSR và không làm nặng bundle JS tải lần đầu cho phần còn lại của trang.
const FinanceHeroScene = dynamic(() => import("./three/FinanceHeroScene"), {
  ssr: false,
  loading: () => null,
});

export default function HeroScene3D() {
  const reduceMotion = !!useReducedMotion();
  // Hero thường hiện ngay khi tải trang nên gần như luôn "visible" lúc đầu — gate này chủ yếu có
  // tác dụng khi người dùng cuộn xa khỏi hero: ngắt hẳn Canvas/RAF thay vì để chạy nền vô ích.
  const [ref, isVisible] = useInViewport<HTMLDivElement>("100px 0px");

  return (
    <div ref={ref} className="absolute inset-0">
      {isVisible && <FinanceHeroScene reduceMotion={reduceMotion} />}
    </div>
  );
}
