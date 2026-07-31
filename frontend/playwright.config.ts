import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // các test tạo/xóa dữ liệu thật qua API — chạy tuần tự để tránh đụng nhau
  // workers: 1 — bắt buộc, vì backend có rate-limit đăng nhập (10 req/60s, xem throttleConfig).
  // Chạy 2+ worker song song sẽ gọi /auth/login đồng thời từ nhiều file test và dễ bị 429,
  // khiến các bước sau đó "Cannot read accessToken of undefined" — không phải lỗi thật của app.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  // Giả định BE (:3001) và FE (:3000) đã chạy sẵn (dev server thủ công) — không tự khởi động
  // để tránh phức tạp hóa việc test trên máy đã có cả 2 server đang chạy song song.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
