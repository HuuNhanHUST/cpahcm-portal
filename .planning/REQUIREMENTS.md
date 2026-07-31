# CPA HCM Portal — Functional & Technical Requirements

## 1. Core Modules

### REQ-01: Public Website & Design System
- **REQ-01.1**: Giao diện đồng bộ theo tone màu Navy `#0F1C47`, Vàng `#C9973C`, trắng & xám nhạt `#F8F9FA`.
- **REQ-01.2**: Đáp ứng hoàn hảo trên mọi kích thước màn hình (Mobile, Tablet, Desktop).
- **REQ-01.3**: Hỗ trợ 2 ngôn ngữ Tiếng Việt (VI) và Tiếng Anh (EN) thông qua `LanguageContext`.
- **REQ-01.4**: Các trang tĩnh/nội dung: Trang chủ, Giới thiệu, Dịch vụ, Đào tạo, Tuyển dụng, Tin tức, Liên hệ.

### REQ-02: Authentication & Security
- **REQ-02.1**: Đăng ký tài khoản với validation email, SĐT Việt Nam, độ mạnh mật khẩu real-time.
- **REQ-02.2**: Đăng nhập trả về JWT Access Token & Refresh Token, lưu trữ an toàn.
- **REQ-02.3**: Hỗ trợ xác thực 2 lớp (MFA/OTP) khi được yêu cầu từ Backend.
- **REQ-02.4**: Quên mật khẩu gửi email OTP xác nhận qua mail service.

### REQ-03: Services & Consultation Booking
- **REQ-03.1**: Danh mục các gói dịch vụ (Kiểm toán BCTC, Tư vấn Thuế, Kế toán trọn gói, Thẩm định giá) quản lý động qua model `Service` (Admin CRUD, không hardcode).
- **REQ-03.2**: Form gửi yêu cầu báo giá và tư vấn trực tiếp từ website đến Backend database (`ServiceRequest`).
- **REQ-03.3**: Category cố định (`@IsIn`), không cho Admin tự thêm category tự do.

### REQ-04: CPA Academy Training
- **REQ-04.1**: Danh sách khóa học đào tạo kế toán trưởng, ôn thi chứng chỉ CPA, quản lý động qua model `Course` + `CourseModule` (giáo trình).
- **REQ-04.2**: Đăng ký khóa học (`CourseEnrollment`) yêu cầu đăng nhập, role MEMBER; chặn đăng ký trùng khi đang `PENDING/PAID/STUDYING`.
- **REQ-04.3**: Không cho xóa cứng khóa học đã có học viên đăng ký (audit history) — chỉ cho ẩn (`isActive=false`).

### REQ-05: Backend & Infrastructure
- **REQ-05.1**: Backend NestJS kết nối PostgreSQL (Prisma ORM) & Redis cache.
- **REQ-05.2**: Quản lý Docker Compose khởi chạy db/redis mượt mà.

---

## 2. Definition of Done
1. Mã nguồn Frontend không có lỗi TypeScript (`npm run build` thành công).
2. Mã nguồn Backend biên dịch thành công (`npm run start`).
3. Giao diện mượt mà, i18n chuyển đổi đúng 100% ngữ cảnh.
