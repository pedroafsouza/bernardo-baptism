#!/usr/bin/env bash
#
# Server-side deployment for the baptism site.
#
# The production database is the one irreplaceable thing on this box — it holds
# real RSVPs from real people. Everything here is built around never destroying
# it by accident:
#
#   * The live DB is backed up before anything else happens.
#   * `prisma db push` runs WITHOUT --accept-data-loss, so a schema change that
#     would drop a column fails the deploy instead of silently deleting answers.
#   * Seeding is opt-in. By default the guest list is only planted when there is
#     no database yet (a first deploy). An existing DB is never re-seeded unless
#     you explicitly ask for it.
#
# SEED_MODE:
#   if-missing  (default) seed only when the production DB did not exist
#   never                 never seed, even on a fresh database
#   force                 run the seed against an existing database. The seed
#                         upserts, so it refreshes names/groups and adds new
#                         guests but preserves every RSVP, score and sent-flag.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/baptism}"
DB_PATH="${DB_PATH:-$APP_DIR/prisma/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
SEED_MODE="${SEED_MODE:-if-missing}"
DEPLOY_REF="${DEPLOY_REF:-origin/main}"
SERVICE="${SERVICE:-baptism}"
KEEP_BACKUPS="${KEEP_BACKUPS:-20}"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

cd "$APP_DIR"

# ---------------------------------------------------------------- pre-flight
DB_EXISTED=false
if [ -f "$DB_PATH" ]; then
  DB_EXISTED=true
fi
log "Production database present: $DB_EXISTED ($DB_PATH)"

if [ "$DB_EXISTED" = true ]; then
  log "Backing up the production database"
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  # .backup is the only safe way to copy a live SQLite file (respects WAL).
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/prod-$STAMP.db'"
  else
    cp "$DB_PATH" "$BACKUP_DIR/prod-$STAMP.db"
  fi
  echo "    saved $BACKUP_DIR/prod-$STAMP.db"

  # Keep the most recent N backups, drop the rest.
  ls -1t "$BACKUP_DIR"/prod-*.db 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | while read -r old; do
    rm -f "$old"
    echo "    pruned $old"
  done
fi

# ------------------------------------------------------------------- source
log "Fetching $DEPLOY_REF"
git fetch --all --prune --quiet
git reset --hard "$DEPLOY_REF" --quiet
git --no-pager log --oneline -1

log "Installing dependencies"
# The repository is a pnpm project; fall back to npm only if pnpm is genuinely
# unavailable, so a server without corepack can still deploy.
if [ -f pnpm-lock.yaml ] && (command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1); then
  RUN="pnpm"
  pnpm install --frozen-lockfile
else
  RUN="npm"
  npm install --no-audit --no-fund --silent
fi

# ------------------------------------------------------------------ schema
log "Applying the Prisma schema"
# No --accept-data-loss on purpose: a destructive migration must stop the deploy.
npx prisma db push --skip-generate

# Columns added after the guest list existed start on their defaults, which
# would shrink invitations already accepted. Idempotent, so it runs every time.
log "Backfilling invitation capacity"
"$RUN" run db:backfill

# -------------------------------------------------------------------- seed
case "$SEED_MODE" in
  force)
    log "Seeding (SEED_MODE=force) — upsert keeps existing answers"
    "$RUN" run seed
    ;;
  if-missing)
    if [ "$DB_EXISTED" = false ]; then
      log "Fresh database — planting the guest list with no answers"
      "$RUN" run seed
    else
      log "Existing database left untouched (SEED_MODE=if-missing)"
    fi
    ;;
  never)
    log "Skipping seed (SEED_MODE=never)"
    ;;
  *)
    echo "Unknown SEED_MODE: $SEED_MODE" >&2
    exit 1
    ;;
esac

# ------------------------------------------------------------------- build
log "Building"
"$RUN" run build

log "Restarting $SERVICE"
sudo systemctl restart "$SERVICE"

# ------------------------------------------------------------------ verify
log "Health check"
for i in $(seq 1 20); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
  if [ "$CODE" = "200" ]; then
    echo "    app responded 200 after $((i * 3))s"
    GUESTS="$(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM Guest;' 2>/dev/null || echo '?')"
    echo "    guests in database: $GUESTS"
    log "Deploy complete"
    exit 0
  fi
  sleep 3
done

echo "Health check failed — app did not return 200" >&2
sudo systemctl status "$SERVICE" --no-pager --lines 30 || true
exit 1
