#!/usr/bin/env bash
#
# Reset production back to a clean, freshly-planted database.
#
# This is the opposite of `deploy.sh`, which exists to *protect* the production
# database. This script exists to throw it away on purpose — so it is never run
# automatically, only from the "Reset production database" workflow, and only
# with an explicit typed confirmation.
#
# What it does, in order:
#
#   1. Backs up the live database (WAL-safe), keeping it alongside the deploy
#      backups. The old data is always recoverable afterwards.
#   2. Builds a brand new database in a temporary file: schema, guest list, and
#      the documented first-run administrator (admin / admin, which the panel
#      forces to be changed at the next login).
#   3. Verifies the snapshot *before* it goes anywhere near production: every
#      guest on the list registered, every invitation with the right capacity,
#      an administrator present.
#   4. Only then swaps it in, restarts the service and health-checks the site.
#
# The swap is the last destructive step, so a failure at any earlier point
# leaves production exactly as it was.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/baptism}"
DB_PATH="${DB_PATH:-$APP_DIR/prisma/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
SERVICE="${SERVICE:-baptism}"
CONFIRM="${CONFIRM:-}"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if [ "$CONFIRM" != "RESET" ]; then
  echo "Refusing to reset: CONFIRM must be exactly 'RESET'." >&2
  exit 1
fi

cd "$APP_DIR"

if [ -f pnpm-lock.yaml ] && (command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1); then
  RUN="pnpm"
else
  RUN="npm"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SNAPSHOT="$APP_DIR/prisma/reset-$STAMP.db"

cleanup() {
  # A half-built snapshot must never be left lying next to the real database.
  rm -f "$SNAPSHOT" "$SNAPSHOT-wal" "$SNAPSHOT-shm"
}
trap cleanup EXIT

# ------------------------------------------------------------------- backup
if [ -f "$DB_PATH" ]; then
  log "Backing up the database that is about to be replaced"
  mkdir -p "$BACKUP_DIR"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/pre-reset-$STAMP.db'"
  else
    cp "$DB_PATH" "$BACKUP_DIR/pre-reset-$STAMP.db"
  fi
  echo "    saved $BACKUP_DIR/pre-reset-$STAMP.db"
else
  log "No production database yet — the reset simply creates one"
fi

# ----------------------------------------------------------------- snapshot
log "Building a clean database at $SNAPSHOT"
export DATABASE_URL="file:$SNAPSHOT"

npx prisma db push --skip-generate --force-reset

log "Planting the guest list and the first-run administrator"
# RESET_ADMIN is the whole reason this pipeline exists: whatever password the
# last administrator chose, the snapshot goes back to admin / admin.
RESET_ADMIN=1 "$RUN" run seed

log "Verifying the snapshot before it becomes production"
"$RUN" run db:verify

GUESTS="$(sqlite3 "$SNAPSHOT" 'SELECT COUNT(*) FROM Guest;' 2>/dev/null || echo '?')"
echo "    guests in the snapshot: $GUESTS"

# --------------------------------------------------------------------- swap
log "Stopping $SERVICE"
sudo systemctl stop "$SERVICE"

log "Promoting the snapshot to production"
# The service is stopped, so nothing is mid-write. The stale WAL/SHM of the old
# database must go with it, or SQLite will try to replay it over the new file.
rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
mv "$SNAPSHOT" "$DB_PATH"
rm -f "$SNAPSHOT-wal" "$SNAPSHOT-shm"
trap - EXIT

log "Starting $SERVICE"
sudo systemctl start "$SERVICE"

# ------------------------------------------------------------------- verify
log "Health check"
for i in $(seq 1 20); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
  if [ "$CODE" = "200" ]; then
    echo "    app responded 200 after $((i * 3))s"
    echo "    guests in production: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM Guest;' 2>/dev/null || echo '?')"
    log "Reset complete — the admin password is back to admin / admin"
    exit 0
  fi
  sleep 3
done

echo "Health check failed — app did not return 200 after the reset" >&2
sudo systemctl status "$SERVICE" --no-pager --lines 30 || true
exit 1
