#!/usr/bin/env bash
# BƯỚC 1/2 dựng server từ đầu — chạy 1 LẦN trên server MỚI (Ubuntu/Debian), bằng tài khoản
# có quyền sudo/root mà IT cấp ban đầu (vd. root hoặc user có sẵn).
#
# Cách chạy: sudo ./server-bootstrap-1-setup.sh
#
# Script này KHÔNG tắt đăng nhập bằng mật khẩu / root — cố ý để vậy, vì nếu tắt ngay mà SSH
# key chưa chắc hoạt động thì sẽ bị KHOÁ HẲN không vào lại được server nữa. Phải tự tay xác nhận
# đăng nhập bằng key thành công (xem hướng dẫn cuối script) rồi mới chạy script bước 2.
set -euo pipefail

DEPLOY_USER="${1:-deploy}"
# Public key của Claude (máy dev) — dùng để SSH vào server làm việc quản trị/CI-CD.
# Đây LÀ public key, an toàn để nằm trong source code, không phải bí mật.
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDgU41+DMqs0Ak3y+t8lm0U9buho0PyJ6oF38MOpMIXE cpahcm-portal-deploy"

if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng sudo/root: sudo $0" >&2
  exit 1
fi

echo "==> [1/6] Cập nhật hệ thống"
apt-get update -y
apt-get upgrade -y

echo "==> [2/6] Tạo user '$DEPLOY_USER' (KHÔNG dùng root để deploy hằng ngày)"
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
else
  echo "User '$DEPLOY_USER' đã tồn tại, bỏ qua bước tạo."
fi

echo "==> [3/6] Thêm SSH public key cho user '$DEPLOY_USER'"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH_KEYS="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH_KEYS"
grep -qxF "$PUBKEY" "$AUTH_KEYS" || echo "$PUBKEY" >> "$AUTH_KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

echo "==> [4/6] Cài + bật UFW firewall (chỉ mở 22 SSH, 80, 443)"
apt-get install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> [5/6] Cài fail2ban (chặn brute-force SSH)"
apt-get install -y fail2ban
systemctl enable --now fail2ban

echo "==> [6/6] Cài Docker Engine + Compose plugin"
curl -fsSL https://get.docker.com | sh
usermod -aG docker "$DEPLOY_USER"

cat <<EOF

======================================================================
XONG BƯỚC 1. TUYỆT ĐỐI KHÔNG ĐÓNG PHIÊN SSH HIỆN TẠI.

Mở một CỬA SỔ TERMINAL MỚI (giữ nguyên cửa sổ đang chạy script này) và thử đăng nhập:

    ssh -i cpahcm_deploy_key $DEPLOY_USER@<ip-server-thật>

Nếu vào được KHÔNG cần nhập mật khẩu → thành công, tiếp tục chạy:
    sudo ./server-bootstrap-2-harden-ssh.sh $DEPLOY_USER

Nếu đăng nhập LỖI → đừng chạy bước 2, báo lại ngay để kiểm tra lại key/quyền
trước khi khoá đường mật khẩu — nếu không sẽ mất quyền truy cập server hoàn toàn.
======================================================================
EOF
