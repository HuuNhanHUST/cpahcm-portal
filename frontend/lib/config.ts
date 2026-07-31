/**
 * Base URL của backend API — đọc từ biến môi trường NEXT_PUBLIC_API_BASE_URL. Next.js inline
 * biến NEXT_PUBLIC_* vào bundle NGAY LÚC `next build`, không phải lúc chạy `next start` — vì vậy
 * khi deploy production PHẢI đặt biến này TRƯỚC khi build (vd. trong .env.production hoặc biến
 * môi trường của CI/CD), đặt sau khi build sẽ không có tác dụng gì.
 *
 * Không set thì mặc định về localhost cho môi trường dev — khớp cách dự án đang chạy trên máy.
 */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
export const API_BASE = `${API_ORIGIN}/api/v1`;
