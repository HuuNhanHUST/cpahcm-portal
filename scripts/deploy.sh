#!/usr/bin/env bash
# Script này được self-hosted GitHub Actions runner gọi trên chính server production
# (xem .github/workflows/cd.yml). Có thể chạy tay khi cần deploy thủ công:
#   IMAGE_TAG=abc1234 ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

STATE_FILE=".deploy_state"
NEW_TAG="${IMAGE_TAG:?Thiếu biến IMAGE_TAG (mã commit của image muốn deploy)}"
PREV_TAG="$(cat "$STATE_FILE" 2>/dev/null || true)"

echo "==> Deploy tag: $NEW_TAG (bản đang chạy trước đó: ${PREV_TAG:-"chưa có, đây là lần đầu"})"

echo "==> [1/5] Backup database trước khi thay đổi bất cứ điều gì..."
./scripts/backup-db.sh

echo "==> [2/5] Kéo Docker image mới nhất từ registry..."
IMAGE_TAG="$NEW_TAG" docker compose pull backend backend-migrate frontend

echo "==> [3/5] Chạy Prisma migration (prisma migrate deploy)..."
if ! IMAGE_TAG="$NEW_TAG" docker compose run --rm backend-migrate; then
  echo "‼️  MIGRATION THẤT BẠI — dừng lại ngay, KHÔNG động vào app đang chạy."
  echo "    App hiện tại (${PREV_TAG:-bản cũ}) vẫn hoạt động bình thường cho người dùng."
  exit 1
fi

echo "==> [4/5] Migration OK — thay container backend/frontend bằng bản mới..."
IMAGE_TAG="$NEW_TAG" docker compose up -d --no-deps backend frontend

echo "==> [5/5] Kiểm tra sức khoẻ (smoke test) sau khi deploy..."
sleep 5
if ! curl -fsS http://127.0.0.1:3001/api/v1 > /dev/null; then
  echo "‼️  Health check THẤT BẠI sau khi deploy bản $NEW_TAG."
  if [ -n "$PREV_TAG" ]; then
    echo "    Tự động rollback về bản trước đó: $PREV_TAG"
    IMAGE_TAG="$PREV_TAG" docker compose up -d --no-deps backend frontend
  else
    echo "    Không có bản nào trước đó để rollback — cần kiểm tra thủ công ngay."
  fi
  exit 1
fi

echo "✅ Deploy thành công với tag $NEW_TAG."
echo "$NEW_TAG" > "$STATE_FILE"
