#!/usr/bin/env bash
# BƯỚC 2/2 — CHỈ chạy sau khi đã xác nhận đăng nhập SSH bằng key thành công (xem hướng dẫn
# cuối server-bootstrap-1-setup.sh). Script này tắt đăng nhập bằng mật khẩu và tắt đăng nhập
# root trực tiếp — nếu key chưa hoạt động mà chạy bước này, server sẽ bị KHOÁ HOÀN TOÀN.
#
# Cách chạy: sudo ./server-bootstrap-2-harden-ssh.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Cần chạy bằng sudo/root: sudo $0" >&2
  exit 1
fi

read -r -p "Bạn ĐÃ đăng nhập SSH bằng key thành công ở một phiên khác chưa? Gõ 'yes' để tiếp tục: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Đã huỷ. Hãy xác nhận đăng nhập bằng key thành công trước."
  exit 1
fi

echo "==> Tắt đăng nhập bằng mật khẩu + tắt đăng nhập root trực tiếp qua SSH"
SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%s)"

sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' "$SSHD_CONFIG"

systemctl restart sshd || systemctl restart ssh

echo "✅ Đã khoá SSH — chỉ còn đăng nhập được bằng key, không còn mật khẩu/root trực tiếp."
echo "   File cấu hình cũ đã backup tại ${SSHD_CONFIG}.bak.* (phòng khi cần khôi phục)."
