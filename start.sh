#!/bin/sh
set -e

log() {
  printf '%s [start.sh] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

log "Bootstrap starting."
log "Runtime: node $(node -v), npm $(npm -v)"

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL is not set"
  exit 1
fi

log "Applying database migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

log "Migrations completed successfully."
log "Starting application..."
exec node dist/main
