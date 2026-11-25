# Shared helper for run-security-checks.sh and run-load-test.sh. Source it (". qa-env.sh"), do not run it.
#
# Safety: backend/seed.js wipes the database it connects to. So every call below passes
# MONGO_URI explicitly and guard() stops the script if it is not exactly the QA database.
# Only 127.0.0.1 is used.

QA_URI='mongodb://127.0.0.1:27017/lab_safety_qa'
QA_DB='lab_safety_qa'
QA_SECRET='qa-only-secret'
QA_PORT="${QA_PORT:-5055}"
BASE="http://127.0.0.1:${QA_PORT}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
EVID="$REPO/qa/evidence"
WORK="${QA_WORK:-$(mktemp -d)}"          # unmasked files stay here, outside the repo
SERVER_LOG="$WORK/server.log"
SRV=''
WINPID=''

die() { echo "STOP: $*" >&2; exit 2; }

guard() {
  [ "$QA_URI" = 'mongodb://127.0.0.1:27017/lab_safety_qa' ] || die "MONGO_URI is not the QA database"
  [ "$QA_DB" = 'lab_safety_qa' ] || die "wrong database name"
  [ ! -e "$REPO/backend/.env" ] || die "backend/.env exists, it could change the settings"
}

port_pid() { netstat -ano | tr -d '\r' | awk -v p=":${QA_PORT}" '$1=="TCP" && $4=="LISTENING" && substr($2,length($2)-length(p)+1)==p {print $5; exit}'; }

seed_db() {
  guard
  local out
  out="$(cd "$REPO/backend" && env -u NODE_ENV MONGO_URI="$QA_URI" JWT_SECRET="$QA_SECRET" node seed.js 2>&1)" || die "seed failed: $out"
  echo "$out" | grep -q "MongoDB connected: 127.0.0.1/${QA_DB}$" || die "seed used another database: $out"
  echo "seed: $(echo "$out" | grep 'MongoDB connected')"
}

# start_server [VAR=value ...]   (a new process = the rate limit counters start at 0)
start_server() {
  guard
  [ -z "$(port_pid)" ] || die "port $QA_PORT is already in use"
  ( cd "$REPO/backend" && exec env -u NODE_ENV -u JWT_EXPIRES_IN -u CLIENT_URL \
      MONGO_URI="$QA_URI" JWT_SECRET="$QA_SECRET" PORT="$QA_PORT" "$@" node server.js ) >"$SERVER_LOG" 2>&1 &
  SRV=$!
  local i
  # "/" is outside /api, so waiting for it does not use up any rate limit
  for i in $(seq 1 50); do
    curl -s -o /dev/null --max-time 2 "$BASE/" && break
    sleep 0.2
  done
  grep -q "MongoDB connected: 127.0.0.1/${QA_DB}$" "$SERVER_LOG" || { stop_server; die "server did not start on $QA_DB"; }
  WINPID="$(port_pid)"
  echo "server: started on $BASE (pid $WINPID)${*:+, with $*}"
}

stop_server() {
  [ -n "$SRV" ] || return 0
  kill "$SRV" 2>/dev/null
  wait "$SRV" 2>/dev/null
  local left; left="$(port_pid)"
  if [ -n "$left" ] && [ "$left" = "$WINPID" ]; then taskkill //PID "$left" //F >/dev/null 2>&1; fi
  SRV=''; WINPID=''
  [ -z "$(port_pid)" ] && echo "server: stopped, port $QA_PORT is free" || echo "server: WARNING port $QA_PORT still in use"
}

# Masks tokens (first 20 characters kept) and private paths or names before a log goes into the repo.
mask() { node "$HERE/scripts/mask-log.js"; }
