#!/bin/sh
set -e

log() {
  printf '%s [start.sh] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

SCHEMA_PATH="prisma/schema.prisma"
NODE_VERSION="$(node -v 2>/dev/null || echo 'unavailable')"
NPM_VERSION="$(npm -v 2>/dev/null || echo 'unavailable')"

log "Bootstrap starting."
log "Runtime versions: node ${NODE_VERSION}, npm ${NPM_VERSION}"

if [ -z "${DATABASE_URL:-}" ]; then
  log "Warning: DATABASE_URL is not set; Prisma commands may fail."
fi

log "Checking Prisma migration status..."
if ! npx prisma migrate status --schema "$SCHEMA_PATH"; then
  log "Migration status check failed."
  exit 1
fi

log "Applying pending Prisma migrations..."
if ! npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
  log "Migration deploy failed."
  exit 1
fi

log "Database migrations applied successfully."
log "Starting NestJS application..."
exec node dist/main
