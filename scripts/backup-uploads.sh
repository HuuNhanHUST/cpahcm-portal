#!/usr/bin/env bash
# Backup thư mục file upload (ảnh public + chứng từ khách hàng riêng tư) — chạy ĐỘC LẬP
# với backup database, đặt cron riêng (khuyến nghị 1 lần/ngày, giờ ít traffic):
#   0 4 * * * cd /path/to/cpahcm-portal-master && ./scripts/backup-uploads.sh >> ./backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="${UPLOADS_BACKUP_DIR:-./backups/uploads}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

tar -czf "$FILE" -C ./data uploads uploads-private
echo "✅ Backup file upload: $FILE"

find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
