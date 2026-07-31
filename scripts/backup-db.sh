#!/usr/bin/env bash
# Backup PostgreSQL — gọi tự động trước mỗi lần deploy (xem scripts/deploy.sh), và nên
# đặt thêm cron job riêng để chạy định kỳ hằng ngày kể cả những ngày không deploy.
# Cách thêm cron (chạy 3h sáng mỗi ngày):
#   crontab -e
#   0 3 * * * cd /path/to/cpahcm-portal-master && ./scripts/backup-db.sh >> ./backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env 2>/dev/null || true; set +a

BACKUP_DIR="${DB_BACKUP_DIR:-./backups/db}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/cpahcm_db_${TIMESTAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "$FILE"
echo "✅ Backup database: $FILE"

# Chỉ giữ lại backup trong 30 ngày gần nhất trên server — bản backup thật sự quan trọng
# nên đồng bộ (rsync) thư mục này sang một ổ đĩa/máy khác, KHÔNG chỉ dựa vào 1 ổ đĩa duy nhất.
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
