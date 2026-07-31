import type { NextConfig } from "next";

// next/image chỉ cho phép tải ảnh từ domain đã khai báo trước (chặn SSRF qua URL ảnh tuỳ ý) —
// phải khai báo domain backend (nơi lưu ảnh khóa học/tin tức/tuyển dụng do Admin upload) và
// Unsplash (ảnh nền trang trí). Domain backend đọc từ cùng biến env mà lib/config.ts dùng, nên
// tự khớp môi trường dev/production mà không cần khai báo tay 2 nơi.
const backendOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const backendUrl = new URL(backendOrigin);

const nextConfig: NextConfig = {
  // "standalone": next build tự gom riêng 1 bộ node_modules tối giản (chỉ chứa package thật
  // sự được dùng) + server.js độc lập vào .next/standalone — giúp Docker image runtime
  // không cần copy toàn bộ node_modules (nhẹ hơn nhiều, không cần chạy npm install lại).
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
        hostname: backendUrl.hostname,
        port: backendUrl.port || undefined,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
