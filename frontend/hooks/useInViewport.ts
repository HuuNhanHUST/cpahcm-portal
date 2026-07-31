"use client";

import { useEffect, useRef, useState, RefObject } from "react";

/**
 * Chỉ báo "đang gần/trong viewport" cho 1 phần tử — dùng để lazy-mount các Canvas 3D (WebGL)
 * theo scroll thay vì giữ tất cả chạy song song suốt trang. Mỗi Canvas tốn 1 WebGL context +
 * 1 vòng lặp render riêng; trang chủ có nhiều khối trang trí 3D nên cần tắt/mở theo vị trí cuộn
 * để không giữ nhiều context/RAF chạy nền không cần thiết.
 */
export function useInViewport<T extends HTMLElement>(
  rootMargin = "200px 0px",
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, isVisible];
}
