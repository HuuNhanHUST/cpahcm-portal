# CPA HCM Portal — Hướng Dẫn Khởi Chạy Hệ Thống

## Tổng Quan Hệ Thống

**CPA HCM Portal** là nền tảng Kế Toán, Kiểm Toán & Đào Tạo chuyên nghiệp với đầy đủ tính năng:
- 🌐 **Frontend**: Next.js 16 (TypeScript, Tailwind CSS, i18n Việt/Anh)
- ⚙️ **Backend**: NestJS 11 (REST API, JWT Auth, Swagger Docs)
- 🗄️ **Database**: PostgreSQL 15 + Redis 7 (via Docker)
- 🔒 **Auth**: JWT Access/Refresh Token + RBAC (Admin/Member/Business)

---

## Cấu Trúc Thư Mục

```
cpahcm-portal-master/
├── frontend/          # Next.js 16 App
├── backend/           # NestJS 11 API Server
├── docker-compose.yml # PostgreSQL + Redis containers
└── .planning/         # GSD Planning artifacts
```

---

## Hướng Dẫn Khởi Chạy

### Bước 1 — Khởi động Database (PostgreSQL + Redis)
```powershell
docker-compose up -d
```
> Chạy lần đầu sẽ download images (~300MB). Các lần sau chỉ mất vài giây.

### Bước 2 — Khởi động Backend API
```powershell
cd backend
npm run build        # Biên dịch TypeScript → JavaScript
npm start            # Chạy từ dist/main (nhanh nhất)
```
> Backend chạy tại: **http://localhost:3001**
> Swagger API Docs: **http://localhost:3001/api/docs**

### Bước 3 — Khởi động Frontend
```powershell
cd frontend
npm run dev          # Dev Server với Hot Reload
```
> Frontend chạy tại: **http://localhost:3000**

---

## Tài Khoản Admin Mặc Định

| Email | Mật khẩu | Quyền |
|-------|----------|-------|
| `testadmin@cpahcm.vn` | `TestPass123!` | SUPER ADMIN |

---

## Danh Sách API Endpoints Chính

### Auth
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| POST | `/api/v1/auth/register` | Đăng ký tài khoản |
| POST | `/api/v1/auth/login` | Đăng nhập → JWT Token |
| POST | `/api/v1/auth/refresh` | Làm mới Access Token |
| POST | `/api/v1/auth/logout` | Đăng xuất |

### Admin (Yêu cầu ADMIN Token)
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| POST | `/api/v1/admin/service-requests` | Tạo yêu cầu tư vấn (Public) |
| GET | `/api/v1/admin/service-requests` | Danh sách yêu cầu tư vấn |
| PATCH | `/api/v1/admin/service-requests/:id/status` | Cập nhật trạng thái |
| DELETE | `/api/v1/admin/service-requests/:id` | Xóa yêu cầu tư vấn |
| GET | `/api/v1/admin/stats` | Thống kê Dashboard |
| GET | `/api/v1/admin/users` | Danh sách người dùng |
| PATCH | `/api/v1/admin/users/:id/role` | Cập nhật Role |
| DELETE | `/api/v1/admin/users/:id` | Xóa tài khoản |
| GET | `/api/v1/admin/courses` | Danh sách khóa học (Admin) |
| POST | `/api/v1/admin/courses` | Thêm khóa học mới |
| PUT | `/api/v1/admin/courses/:id` | Sửa khóa học |
| DELETE | `/api/v1/admin/courses/:id` | Xóa khóa học (chặn nếu đã có học viên đăng ký) |
| GET | `/api/v1/admin/enrollments` | Danh sách đăng ký khóa học |
| PATCH | `/api/v1/admin/enrollments/:id/status` | Duyệt/đổi trạng thái đăng ký |
| POST/GET/PUT/DELETE | `/api/v1/admin/services` | CRUD Dịch vụ |
| GET | `/api/v1/admin/applications` | Danh sách hồ sơ ATS |
| PATCH | `/api/v1/admin/applications/:id/status` | Duyệt hồ sơ |
| DELETE | `/api/v1/admin/applications/:id` | Xóa hồ sơ |

### Services & Courses (Public)
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/api/v1/services` | Danh sách dịch vụ (lọc `?category=`) |
| GET | `/api/v1/services/:slug` | Chi tiết dịch vụ |
| GET | `/api/v1/services/:slug/related` | Dịch vụ liên quan |
| GET | `/api/v1/courses` | Danh sách khóa học (lọc `?category=`) |
| GET | `/api/v1/courses/:slug` | Chi tiết khóa học (kèm giáo trình) |
| GET | `/api/v1/courses/:slug/related` | Khóa học liên quan |
| POST | `/api/v1/courses/:id/enroll` | Đăng ký khóa học (yêu cầu đăng nhập, role MEMBER) |

### Recruitment (Tuyển dụng)
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/api/v1/recruitment/jobs` | Danh sách việc làm (Public) |
| POST | `/api/v1/recruitment/apply` | Nộp CV ứng tuyển |
| POST | `/api/v1/recruitment/candidates` | Tạo hồ sơ ứng viên |

---

## Các Trang Website

| URL | Mô Tả |
|-----|-------|
| `/` | Trang chủ |
| `/gioi-thieu` | Giới thiệu CPA HCM |
| `/dich-vu` | Dịch vụ Kiểm toán & Tư vấn |
| `/dao-tao` | Chương trình Đào tạo CPA Academy |
| `/tuyen-dung` | Tuyển dụng & ATS Nộp CV |
| `/tin-tuc` | Tin tức & Cập nhật |
| `/lien-he` | Liên hệ & Đặt lịch tư vấn |
| `/login` | Đăng nhập / Đăng ký |
| `/admin` | Trung tâm quản lý Admin (CRUD) |

---

## Lưu Ý Quan Trọng

> **Lỗi P1001 khi start backend**: Đảm bảo Docker đang chạy (`docker-compose up -d`) trước khi start backend.

> **Lỗi EADDRINUSE port 3001**: Backend đang chạy rồi. Dừng process cũ trước: `npx kill-port 3001`

> **Rebuild trước khi start**: Luôn chạy `npm run build` trước `npm start` nếu có thay đổi code.
