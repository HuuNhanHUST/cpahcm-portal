# Cẩm nang ngày đầu tiếp cận server — Server đã có sẵn hệ điều hành

> Giả định server đã được cài Linux từ trước (nhiều khả năng nhất theo đánh giá của bạn), chỉ là chưa cài Docker/website gì cho dự án này. Làm theo đúng thứ tự các bước dưới đây.

---

## Bước 0 — Chuẩn bị trước khi đi (làm ngay bây giờ)

- [ ] Mang theo laptop này (đã có sẵn SSH key `cpahcm_deploy_key`, toàn bộ code, script).
- [ ] Nếu công ty có sẵn màn hình/bàn phím rời dùng chung cho server thì không cần mang gì thêm. Nếu không chắc, mang theo 1 bàn phím USB nhỏ (phòng hờ) — màn hình thường công ty nào cũng có sẵn cái dùng chung được.
- [ ] Note lại: **KHÔNG được reset/cài lại bất cứ thứ gì trên máy nếu không chắc chắn máy đó không đang chứa dữ liệu/dịch vụ quan trọng khác của công ty.** Nếu nghi ngờ, dừng lại và hỏi (chủ doanh nghiệp/người giao việc), đừng tự quyết.

### Trước khi hỏi ai, nên hỏi những gì (đề phòng server đang chứa sẵn thứ gì đó)

- Server này **trước đây/hiện tại có đang dùng cho việc gì không**?
- Máy này **mới riêng cho dự án này**, hay máy cũ tận dụng lại?
- Có **dữ liệu/file quan trọng nào** đang nằm trên đó cần giữ lại không?
- Máy có **dùng chung** với hệ thống nào khác không (chấm công, camera, file server nội bộ...)?
- **Ai có quyền xác nhận "được phép xoá/cài lại"** nếu phát hiện gì đó không rõ trên máy?

Dù hỏi được câu trả lời gì, vẫn nên **tự kiểm tra lại bằng lệnh ở Bước 3** (mục 8-11) — đáng tin hơn vì không phụ thuộc trí nhớ của ai, nhất là khi không có ai theo dõi hệ thống này trước đó.

---

## Bước 1 — Tìm server và kết nối màn hình/bàn phím

1. Xác định server vật lý (máy tính case riêng, có thể để trong tủ rack, gầm bàn, hoặc phòng kỹ thuật).
2. Cắm màn hình (HDMI/VGA tuỳ cổng máy có) và bàn phím USB vào server.
3. Bật máy lên (nếu đang tắt) hoặc đánh thức (nếu đang chạy sẵn, màn hình có thể đang đen do chế độ tiết kiệm điện — nhấn phím bất kỳ hoặc di chuột nếu có).

---

## Bước 2 — Đăng nhập vào server

**Nếu bạn có sẵn tài khoản/mật khẩu** (được bàn giao lúc nhận việc) → đăng nhập bình thường, bỏ qua phần dưới.

**Nếu KHÔNG ai đưa mật khẩu / không biết đăng nhập bằng gì:**
- Hỏi trực tiếp người giao việc/chủ doanh nghiệp trước — rất có thể họ có ghi lại ở đâu đó (email cũ, file note, hoặc người làm trước để lại).
- Nếu chắc chắn không ai biết và máy chắc chắn là của mình toàn quyền sử dụng, có cách khôi phục kỹ thuật (vào chế độ recovery của Linux qua GRUB để đặt lại mật khẩu root) — cách này cần thao tác cẩn thận, **báo tôi lúc đó** để tôi hướng dẫn từng bước cụ thể theo đúng những gì hiện ra trên màn hình, tránh làm sai lúc không có ai bên cạnh xem cùng.

---

## Bước 3 — Thu thập thông tin hệ thống (chạy các lệnh sau, ghi lại kết quả)

Sau khi đăng nhập được, mở Terminal (hoặc đang ở sẵn màn hình dòng lệnh), chạy lần lượt:

```bash
# 1. Xem hệ điều hành + phiên bản
cat /etc/os-release

# 2. Xem có Docker chưa
docker --version 2>/dev/null || echo "Chưa cài Docker"

# 3. Xem máy đang chạy container gì sẵn (nếu có Docker)
docker ps -a 2>/dev/null

# 4. Xem có phần mềm/service nào đang nghe ở cổng 80, 443, 5432, 6379 không
# (tránh xung đột khi mình cài web mới vào)
sudo ss -tlnp

# 5. Xem địa chỉ IP nội bộ hiện tại của server
ip addr show

# 6. Xem địa chỉ router (gateway) — để sau này vào trang quản trị router mở port
ip route show default

# 7. Xem còn bao nhiêu RAM / ổ đĩa trống (Postgres + Redis + backend + frontend cần khoảng 2-4GB RAM trống)
free -h
df -h

# 8. Xem có service/phần mềm nào đang TỰ CHẠY sẵn không (kể cả không liên quan Docker) —
# quan trọng để biết máy này có đang "âm thầm" phục vụ việc gì khác của công ty không
sudo systemctl list-units --type=service --state=running

# 9. Xem có cron job nào đã đặt sẵn không (backup tự động, tác vụ định kỳ đã có từ trước)
sudo crontab -l 2>/dev/null; sudo ls /etc/cron.d/ /etc/cron.daily/ 2>/dev/null

# 10. Xem những thư mục nào đang chiếm nhiều dung lượng nhất — gợi ý có dữ liệu quan trọng
# nằm ở đâu đó cần hỏi lại trước khi động vào
sudo du -sh /var/* /home/* /opt/* 2>/dev/null | sort -rh | head -20

# 11. Xem có tài khoản người dùng nào khác ngoài mình không (biết ai từng/đang dùng máy)
cut -d: -f1 /etc/passwd | grep -vE "^(root|daemon|bin|sys|sync|games|man|lp|mail|news|uucp|proxy|www-data|backup|list|irc|gnats|nobody|systemd.*|messagebus|sshd|_apt)$"
```

**Gửi lại cho tôi toàn bộ kết quả 11 lệnh trên** (copy-paste nguyên văn) — tôi sẽ đọc và nói chính xác bước tiếp theo, gồm cả việc có xung đột/dữ liệu quan trọng nào cần hỏi lại trước khi động vào không.

---

## Bước 4 — Chuyển sang làm việc từ xa bằng laptop (đỡ phải ngồi cạnh server)

1. Ghi nhớ địa chỉ IP lấy được ở lệnh `ip addr show` (Bước 3, mục 5) — dạng `192.168.x.x` hoặc tương tự.
2. Nối laptop này vào **cùng mạng WiFi/LAN công ty** với server (không cần dây nối thẳng, xem giải thích ở tin nhắn trước).
3. Thử SSH từ laptop:
   ```
   ssh <username-của-bạn>@<ip-server>
   ```
   Nếu vào được (dùng mật khẩu tạm thời lúc này, chưa dùng key) → từ giờ có thể ngồi từ xa bằng laptop, không cần quay lại màn hình rời nữa (trừ khi có sự cố mạng).

---

## Bước 5 — Chạy script dựng server (đã chuẩn bị sẵn trong repo)

Clone repo về server trước:
```bash
git clone https://github.com/HuuNhanHUST/cpahcm-portal.git
cd cpahcm-portal
```

Chạy bước 1 (tạo user riêng, thêm SSH key, cài UFW/fail2ban/Docker — **chưa khoá mật khẩu**):
```bash
sudo ./scripts/server-bootstrap-1-setup.sh
```

**Mở một cửa sổ terminal MỚI trên laptop** (giữ nguyên cửa sổ cũ đang đăng nhập), thử:
```bash
ssh -i cpahcm_deploy_key deploy@<ip-server>
```
Vào được **không cần nhập mật khẩu** → thành công. Lúc này mới quay lại chạy tiếp bước 2 (khoá hẳn đăng nhập bằng mật khẩu/root):
```bash
sudo ./scripts/server-bootstrap-2-harden-ssh.sh
```

⚠️ Nếu bước test SSH bằng key **không vào được** → **DỪNG LẠI, không chạy bước 2** — báo tôi ngay để kiểm tra nguyên nhân (sai quyền file, sai key...) trước khi khoá đường mật khẩu, tránh bị khoá luôn quyền truy cập server.

---

## Bước 6 — Sau khi xong Bước 5

Quay lại làm tiếp theo đúng thứ tự trong [.planning/CICD_CHECKLIST.md](CICD_CHECKLIST.md) mục **B2** (copy `.env`, chạy migration lần đầu, bootstrap SSL...) — báo tôi khi tới đây để tôi dẫn tiếp từng bước theo đúng tình hình thực tế lúc đó.

---
*Cập nhật 2026-07-31 — tập trung vào kịch bản server đã có sẵn hệ điều hành, dùng kèm [.planning/CICD_CHECKLIST.md](CICD_CHECKLIST.md).*
