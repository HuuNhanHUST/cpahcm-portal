# CPA HCM Portal — Project Summary

## Overview
**CPA HCM Portal** là hệ thống Website Portal đồng nhất dành cho **Công ty TNHH Kiểm toán và Tư vấn CPA HCM** (đơn vị kiểm toán uy tín được Bộ Tài chính cấp phép).

Tất cả các tính năng sử dụng chung một hệ thống giao diện nhất nhất (Header + Footer tiêu chuẩn), không chia tách thành Portal riêng biệt, đảm bảo trải nghiệm người dùng liền mạch và tinh tế.

## Tech Stack
- **Frontend**: Next.js 16 (App Router, Turbopack, TailwindCSS, Framer Motion, Lucide Icons)
- **Backend**: NestJS (TypeScript, Prisma ORM, PostgreSQL, Redis, JWT Auth, Mailer)
- **i18n**: Đa ngôn ngữ Việt - Anh (VI / EN)
- **Design System**: Executive Consulting / Editorial Design (Navy `#0F1C47`, Gold `#C9973C`, Glassmorphism, Micro-animations)

## Key Features & Pages
1. **Trang chủ (`/`)**: Hero Parallax, Thống kê, Dịch vụ nổi bật, Đội ngũ chuyên gia.
2. **Giới thiệu (`/gioi-thieu`)**: Cấu trúc Magazine/Editorial, Lịch sử 14 năm, Sơ đồ tổ chức, i18n VI/EN.
3. **Dịch vụ (`/dich-vu`)**: Kiểm toán BCTC, Tư vấn Thuế, Kế toán trọn gói, Thành lập DN với bộ lọc danh mục, dữ liệu động qua `ServicesModule` (Server Component + ISR), trang chi tiết `[slug]` + form Nhận báo giá.
4. **Đào tạo (`/dao-tao`)**: Trung tâm CPA Academy, danh sách khóa học động qua `CoursesModule`, trang chi tiết `[slug]` với giáo trình dạng accordion, đăng ký khóa học yêu cầu đăng nhập (role MEMBER).
5. **Tuyển dụng (`/tuyen-dung`)**: Danh sách vị trí tuyển dụng & Nộp CV.
6. **Tin tức (`/tin-tuc`)**: Bản tin pháp luật thuế & chuẩn mực kế toán.
7. **Đăng nhập & Đăng ký (`/login`, `/register`)**: Luồng xác thực an toàn với JWT, OTP MFA.
8. **Liên hệ (`/lien-he`)**: Form gửi tư vấn & báo giá trực tiếp.

---
*Last updated: 2026-07-27 sau khi hoàn thiện full-stack Dịch Vụ & Đào Tạo (schema, API, Admin CRUD, testing)*
