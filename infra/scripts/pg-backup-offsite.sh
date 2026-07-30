#!/bin/sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/var/backups/portfolio}
: "${BACKUP_REMOTE:?Set BACKUP_REMOTE in /etc/default/portfolio-pg-backup-offsite}"

latest=$(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'pg_dumpall-*.sql.gz' -print |
    sort |
    tail -n 1
)

if [ -z "$latest" ]; then
  echo "no completed Postgres dump found in $BACKUP_DIR" >&2
  exit 1
fi

gzip -t "$latest"
rsync --archive --compress --ignore-existing -- "$latest" "$BACKUP_REMOTE"

echo "[pg-backup-offsite] transferred $(basename "$latest")"
