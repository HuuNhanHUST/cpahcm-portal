# CI/CD — Checklist những gì cần bạn cung cấp / tự thực hiện

> File này liệt kê **TOÀN BỘ** những gì tôi (Claude) không thể tự làm được — vì cần quyền truy cập tài khoản GitHub, server vật lý, domain, hoặc là quyết định business mà chỉ bạn mới trả lời được. Phần code/cấu hình (Dockerfile, docker-compose, CI/CD workflow, script deploy/backup) đã xong, xem [.planning/CICD_ROADMAP.md](CICD_ROADMAP.md) Mục 8.
>
> Đánh dấu `[x]` khi làm xong từng mục để tiện theo dõi.

---

## A. Thông tin cần cung cấp (trả lời câu hỏi)

- [x] **1. Bạn đã có GitHub repository chưa?** — **XONG.** Repo: [HuuNhanHUST/cpahcm-portal](https://github.com/HuuNhanHUST/cpahcm-portal) (Public — đổi từ Private để dùng được "Required reviewers" miễn phí, đã kiểm tra kỹ không có secret nào bị lộ trước khi đổi). Code đã push lên nhánh `main`.

- [ ] **2. Thông tin server vật lý (on-prem)**
  - Hệ điều hành server là gì? (Ubuntu 22.04? Debian? CentOS?) — lệnh cài Docker khác nhau tuỳ hệ điều hành.
  - Server đã cài Docker chưa, hay cần cài từ đầu?
  - Bạn (hoặc ai) có quyền truy cập SSH/console vào server đó để chạy lệnh không? Tôi **không** có quyền truy cập server thật, chỉ có thể viết sẵn lệnh/script để bạn (hoặc người quản trị) tự chạy.

- [ ] **3. Domain thật** *(NEXT_PUBLIC_API_BASE_URL đang tạm để `https://api.your-domain.com` — cần sửa lại khi có domain thật)*
  - Domain sẽ dùng cho website là gì? (vd. `cpahcm.vn`, `portal.cpahcm.vn`...)
  - Domain đã có sẵn/đã mua chưa? Đã trỏ DNS (bản ghi A) về IP server công ty chưa?
  - Email dùng để đăng ký SSL Let's Encrypt (certbot) là gì?
  - → Cần điền vào: `nginx/nginx.conf` (2 chỗ `your-domain.com`), `.env` root (`DOMAIN`, `CERTBOT_EMAIL`, `NEXT_PUBLIC_API_BASE_URL`).

- [ ] **4. Có muốn nhận thông báo deploy qua Slack/Telegram không?**
  - Nếu có: cần Webhook URL (Slack Incoming Webhook hoặc Telegram Bot API) để tôi điền vào GitHub Secret `DEPLOY_NOTIFY_WEBHOOK_URL`.
  - Nếu không cần: bỏ qua, `cd.yml` đã tự động skip bước này nếu thiếu secret.

- [ ] **5. Có cần thêm Playwright E2E test vào CI không?**
  - Hiện `ci.yml` mới chạy lint/unit test/build, chưa chạy E2E (cần thêm Postgres tạm trong job CI, hơi tốn thời gian chạy hơn). Bạn có muốn thêm không, hay để CI nhanh trước rồi tính sau?

---

## B. Việc cần bạn (hoặc người quản trị hệ thống) tự thực hiện

### B1. Trên GitHub — ĐÃ TỰ ĐỘNG HOÀN THÀNH (qua `gh` CLI + GitHub API, 2026-07-31)

- [x] Repo tạo xong, code đã push: [HuuNhanHUST/cpahcm-portal](https://github.com/HuuNhanHUST/cpahcm-portal), nhánh `main`.
- [x] Environment `production` đã tạo, **Required reviewers** = `HuuNhanHUST`.
- [x] Repository Variable `NEXT_PUBLIC_API_BASE_URL` = `https://api.your-domain.com` (placeholder — **cần bạn sửa lại giá trị thật** bằng `gh variable set NEXT_PUBLIC_API_BASE_URL --repo HuuNhanHUST/cpahcm-portal --body "https://domain-that-cua-ban"` khi có domain, xem mục A.3).
- [ ] `DEPLOY_NOTIFY_WEBHOOK_URL` — chưa thêm, chờ câu trả lời mục A.4.
- [x] Branch protection cho `main`: bắt buộc 2 status check `backend` + `frontend` (tên job trong `ci.yml`) phải pass mới merge được.

### B2. Trên server vật lý (cần quyền truy cập server thật)

- [ ] Cài Docker Engine + Docker Compose plugin.
- [ ] Tạo user riêng để deploy (không dùng `root`), chỉ cho SSH đăng nhập bằng key.
- [ ] Cấu hình firewall (UFW): chỉ mở cổng 22 (SSH), 80, 443.
- [ ] Cài `fail2ban`.
- [ ] Clone repo về server (vào đúng thư mục sẽ dùng làm nơi chạy `docker-compose.yml` lâu dài — đây cũng chính là thư mục self-hosted runner sẽ dùng, xem B3).
- [ ] Copy `.env.example` (root) → `.env`, điền giá trị thật:
  - `POSTGRES_PASSWORD` — mật khẩu mạnh, khác với giá trị cũ `CpaHcm_Password_2026!` đang lộ trong lịch sử code.
  - `BACKEND_IMAGE` / `FRONTEND_IMAGE` — đúng tên GitHub repo, **viết thường toàn bộ** (ghcr.io bắt buộc lowercase).
  - `NEXT_PUBLIC_API_BASE_URL`, `DOMAIN`, `CERTBOT_EMAIL` — theo domain thật ở mục A.3.
- [ ] Copy `backend/.env` từ máy dev hiện tại sang server, rồi **sửa 1 dòng quan trọng**:
  ```
  # Máy dev (backend chạy trực tiếp trên host):
  DATABASE_URL="postgresql://...@localhost:5432/cpahcm_db?schema=public"
  # Server (backend chạy trong docker-compose, cùng mạng với container postgres):
  DATABASE_URL="postgresql://...@postgres:5432/cpahcm_db?schema=public"
  ```
  Tương tự `REDIS_HOST=localhost` → `REDIS_HOST=redis`.
- [ ] Chạy `docker compose up -d postgres redis` lần đầu, đợi healthy, rồi `docker compose run --rm backend-migrate` để tạo schema ban đầu.
- [ ] Bootstrap SSL lần đầu (certbot) — cần domain đã trỏ DNS xong (mục A.3) trước khi làm bước này; tôi sẽ hướng dẫn lệnh cụ thể khi bạn xác nhận domain đã sẵn sàng.
- [ ] Thêm cron job backup hằng ngày:
  ```
  crontab -e
  0 3 * * * cd /đường-dẫn-repo && ./scripts/backup-db.sh >> ./backups/backup.log 2>&1
  0 4 * * * cd /đường-dẫn-repo && ./scripts/backup-uploads.sh >> ./backups/backup.log 2>&1
  ```
- [ ] Thiết lập đồng bộ thư mục `backups/` sang một ổ đĩa/máy khác (rsync/NAS) — script chỉ lưu cục bộ, không tự đẩy đi nơi khác.

### B3. Self-hosted GitHub Actions Runner (cần làm SAU khi đã có repo GitHub — mục B1)

- [ ] Vào repo trên GitHub → **Settings > Actions > Runners > New self-hosted runner** → chọn Linux.
- [ ] GitHub sẽ cho bạn đoạn lệnh có kèm **token đăng ký** (chỉ hiện 1 lần, hết hạn nhanh) — chạy đúng đoạn lệnh đó trên server, tại **đúng thư mục** đã clone repo ở bước B2 (vì `cd.yml` giả định thư mục làm việc của runner cũng là nơi có `docker-compose.yml`/`scripts/`/`.env`/`data/`).
- [ ] Khi cấu hình runner, đặt label là `production` (khớp với `runs-on: [self-hosted, production]` đã khai trong `cd.yml`):
  ```
  ./config.sh --url <repo-url> --token <token> --labels production
  ```
- [ ] Cài runner chạy như service (`./svc.sh install && ./svc.sh start`) để tự khởi động lại khi server reboot.

---

## C. Việc tôi có thể làm tiếp (không cần chờ bạn)

- [ ] Dọn dần ~181 lỗi ESLint có sẵn trong `backend/src` (hiện `ci.yml` đang tạm bỏ qua bước này) — có thể làm thành nhiệm vụ riêng bất cứ lúc nào bạn muốn, không phụ thuộc server/GitHub.
- [ ] Thêm Playwright E2E vào `ci.yml` (nếu bạn chọn "có" ở mục A.5).

---
*Tạo ngày 2026-07-30, đi kèm [.planning/CICD_ROADMAP.md](CICD_ROADMAP.md).*
