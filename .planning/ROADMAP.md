# CPA HCM Portal — Development Roadmap

## System Architecture

### Phase 1: Core Foundation & UI/UX Perfection (Đã hoàn thành)
- [x] Fix TypeScript build errors on Frontend.
- [x] Redesign trang `/gioi-thieu` theo chuẩn Editorial Luxury.
- [x] Cập nhật i18n VI/EN cho trang Giới thiệu.
- [x] Tối ưu hóa trang Đăng nhập / Đăng ký (`/login`).

### Phase 2: Database Infrastructure & API Integration (Đã hoàn thành)
- [x] Khởi chạy PostgreSQL & Redis via Docker Compose.
- [x] Đồng bộ Prisma Schema với PostgreSQL database (`cpahcm_db`).
- [x] Khởi chạy NestJS Backend API tại `http://localhost:3001`.
- [x] Kiểm thử API Đăng ký (`POST /api/v1/auth/register`) & Đăng nhập (`POST /api/v1/auth/login`) trả về JWT Token.

### Phase 3: Services & Training Modules Enhancement (Đã hoàn thành)
- [x] Redesign trang Dịch vụ (`/dich-vu`) theo phong cách Executive Editorial với bộ lọc danh mục & thông số sản phẩm bàn giao.
- [x] Redesign trang Đào tạo (`/dao-tao`) với bộ lọc khóa học CPA Academy, thông tin giảng viên & ưu thế đào tạo.
- [x] Tích hợp i18n VI / EN chuẩn xác cho toàn bộ các trang.

### Phase 6: Full Admin CRUD Capabilities (Đã hoàn thành)
- [x] NestJS Backend Admin API hỗ trợ đầy đủ các thao tác CRUD (Create, Read, Update, Delete):
  - `POST`, `GET`, `PATCH`, `DELETE` cho Yêu cầu báo giá & Tư vấn dịch vụ (`/api/v1/admin/service-requests`)
  - `POST`, `GET`, `PUT`, `DELETE` cho Khóa học CPA Academy (`/api/v1/admin/courses`)
  - `GET`, `PATCH`, `DELETE` cho Người dùng & Phân quyền Role (`/api/v1/admin/users`)
  - `GET`, `PATCH`, `DELETE` cho Tuyển dụng & ATS (`/api/v1/admin/applications`)
- [x] Frontend Admin (`/admin`) xây dựng hệ thống Modal tương tác trực tiếp (Thêm mới, Cập nhật trạng thái, Xóa dữ liệu có popup xác nhận).

### Phase 7: Tin Tức & Tuyển Dụng full-stack (Đã hoàn thành)
- [x] Model `Post` (Tin tức, Markdown) + `JobPosting`/`JobApplication`/`CandidateProfile` (ATS) nối API thật, thay thế mock data trước đó.
- [x] Trang `/tin-tuc`, `/tuyen-dung` + chi tiết `[slug]`/`[id]`, Admin CRUD upload ảnh.

### Phase 8: Dịch Vụ & Đào Tạo full-stack (Đã hoàn thành)
- [x] Model `Service` (mới) + mở rộng `Course`/`CourseModule` trong Prisma schema.
- [x] `ServicesModule`/`CoursesModule` (public reads) + `POST /courses/:id/enroll` (RBAC MEMBER).
- [x] Admin CRUD `/admin/services` + `/admin/courses` nối lại API thật (trước đó Admin UI Đào tạo dùng mock cục bộ, không gọi API) + quản lý đăng ký khóa học (`/admin/enrollments`).
- [x] Rich text editor (Tiptap) + sanitize-html chống XSS, Curriculum Builder cho khóa học.
- [x] Trang `/dich-vu`, `/dao-tao` nâng cấp lên Server Component + ISR (revalidate 5 phút) thay vì client-fetch, phục vụ SEO.
- [x] Phát hiện & sửa bug hệ thống: `enableImplicitConversion` trong `ValidationPipe` toàn cục ép nhầm mọi field `boolean` từ multipart form ("false" → `true`) — ảnh hưởng cả Jobs/Posts/Courses/Services, đã sửa toàn bộ 8 DTO liên quan + test hồi quy.
- [x] Bổ sung unit test Jest thật (backend) + Playwright E2E thật commit vào `frontend/e2e/` (trước đó chỉ verify bằng script thủ công không lưu lại).

---
*Roadmap updated after Dịch Vụ & Đào Tạo full-stack completion*
