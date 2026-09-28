#!/usr/bin/env sh
# Backup SIMS PostgreSQL database
# Usage: ./scripts/backup.sh
# Cron example (daily 2am): 0 2 * * * cd /path/to/SIMS && ./scripts/backup.sh

set -e
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/sims_$STAMP.sql.gz"

# Prefer docker exec if container is running
if docker ps --format '{{.Names}}' | grep -q '^sims-postgres$'; then
  docker exec sims-postgres pg_dump -U sims sims | gzip > "$FILE"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-sims}" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5433}" -U "${POSTGRES_USER:-sims}" sims | gzip > "$FILE"
fi

echo "Backup written to $FILE"
# Keep last 14 backups
ls -1t "$BACKUP_DIR"/sims_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
