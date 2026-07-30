#!/bin/sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/var/backups/portfolio}
RETENTION_DAYS=${RETENTION_DAYS:-14}
CONTAINER=${CONTAINER:-portfolio-pg}
DB_USER=${DB_USER:-portfolio}

stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"

# Write to a dot-prefixed temp name and rename: a dump interrupted mid-write
# must never be mistaken for a complete one by the restore procedure.
tmp="$BACKUP_DIR/.pg_dumpall-$stamp.sql.gz"
out="$BACKUP_DIR/pg_dumpall-$stamp.sql.gz"

# pg_dumpall covers both databases (portfolio + umami) and the roles.
# It connects over the container's unix socket, which the postgres image
# trusts, so no password is needed here.
docker exec "$CONTAINER" pg_dumpall -U "$DB_USER" | gzip -9 >"$tmp"
mv "$tmp" "$out"

find "$BACKUP_DIR" -maxdepth 1 -name 'pg_dumpall-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name '.pg_dumpall-*.sql.gz' -mtime +1 -delete

echo "[pg-backup] wrote $out ($(du -h "$out" | cut -f1))"
