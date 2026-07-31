# CPA HCM Portal — Project State

## Current Position
- **Status**: Production Ready & Fully Detailed Admin Management Portal

## Quick Reference
- **Frontend App**: `http://localhost:3000`
- **Admin Center**: `http://localhost:3000/admin` (Full Interactive CRUD, Search, Filters, View Modals, Courses & Users RBAC)
- **Backend API**: `http://localhost:3001/api/v1` (Swagger: `http://localhost:3001/api/docs`)
- **Database**: PostgreSQL (5432) & Redis (6379) via Docker

## Detailed Admin Portal Features:
1. **Yêu cầu Báo giá & Tư vấn (Leads Management)**:
   - **Thanh Tìm kiếm & Bộ lọc**: Tìm kiếm theo tên doanh nghiệp, SĐT, email, dịch vụ và lọc theo trạng thái.
   - **Thao tác Thêm / Sửa / Xóa / Xem chi tiết**: Đầy đủ 4 nút hành động đi kèm Modal popup xem nội dung ghi chú chi tiết của doanh nghiệp.
2. **Quản lý Dịch vụ (Services Management)**: CRUD thật nối API `/admin/services`, Rich Text Editor (Tiptap) cho mô tả chi tiết, dynamic list cho Features/Deliverables, upload ảnh cover.
3. **Quản lý Đào tạo CPA Academy (Courses Management)**: CRUD thật nối API `/admin/courses` (trước đây là mock cục bộ, đã nối lại), Curriculum Builder (module + bài học), quản lý Đăng ký khóa học (`/admin/enrollments`).
4. **Quản lý Tin Tức (Posts Management)**: CRUD bài viết Markdown, upload ảnh cover.
5. **Quản lý Tuyển dụng & ATS (Job Postings & Candidate Applications)**:
   - Đăng tin tuyển dụng mới, quản lý các vị trí tuyển dụng và duyệt danh sách CV ứng viên.
6. **Quản lý Users & RBAC Phân quyền**:
   - Thêm tài khoản người dùng mới, chuyển đổi Role (`ADMIN`, `MEMBER`, `BUSINESS`), khóa/mở khóa tài khoản hoặc xóa tài khoản.
7. **Testing**: Unit test Jest (backend, `*.spec.ts`) + E2E Playwright thật (`frontend/e2e/`), cả hai đều commit vào repo và chạy lại được.

## Lưu ý kỹ thuật quan trọng
- `ValidationPipe` toàn cục bật `enableImplicitConversion: true` — mọi field DTO kiểu `boolean` nhận từ `multipart/form-data` PHẢI khai kiểu `any` (không phải `boolean`), nếu không `"false"` (string) sẽ bị ép nhầm thành `true`. Xem `backend/src/common/utils/to-boolean.util.ts`.
- `/dich-vu` và `/dao-tao` dùng Server Component + ISR (`revalidate = 300`), khác với các trang khác (client-fetch) — chủ đích cho SEO trang catalog/marketing.
