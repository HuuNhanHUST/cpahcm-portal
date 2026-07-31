#!/usr/bin/env bash
# Khôi phục database từ 1 file backup — dùng khi cần rollback dữ liệu hoặc TEST RESTORE
# định kỳ hằng tháng (backup chưa từng thử restore thì không thể tin tưởng được).
# Cách dùng: ./scripts/restore-db.sh backups/db/cpahcm_db_20260101_030000.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:?Cách dùng: ./scripts/restore-db.sh <đường-dẫn-file-backup.sql.gz>}"
set -a; source .env 2>/dev/null || true; set +a

echo "⚠️  Thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại trong database '${POSTGRES_DB}'."
read -r -p "Gõ đúng chữ 'yes' để xác nhận tiếp tục: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Đã huỷ, không có gì thay đổi."
  exit 1
fi

gunzip -c "$FILE" | docker compose exec -T postgres psql -U "${POSTGRES_USER}" "${POSTGRES_DB}"
echo "✅ Khôi phục xong từ file: $FILE"
