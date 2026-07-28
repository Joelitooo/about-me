#!/bin/sh
set -eu

echo "[entrypoint] applying database migrations"
# Idempotent: applies only migrations not yet recorded in _prisma_migrations.
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting API"
# exec so Node becomes PID 1 and receives SIGTERM from `docker stop` directly.
exec node dist/main.js
