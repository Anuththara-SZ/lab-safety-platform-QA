#!/usr/bin/env bash
# Task 3.7 load test. Seeds lab_safety_qa, starts a fresh backend (rate limit counters at 0), runs JMeter
# without GUI, stops the backend and writes the summary. Local instance only.
# Usage (Git Bash):  JMETER=<path to jmeter or jmeter.bat> bash run-load-test.sh NAME USERS RAMP LOOPS GETS
#   run1   50 10 1 18     run1b  50 10 1 18     run2   50 10 10 1     run3   50 1 1 18
. "$(dirname "${BASH_SOURCE[0]}")/qa-env.sh"
trap 'stop_server >/dev/null' EXIT
[ $# -eq 5 ] || die "usage: run-load-test.sh NAME USERS RAMP LOOPS GETS"
[ -n "$JMETER" ] || die "set JMETER to the jmeter start script"
NAME="$1"; OUT="phase3-jmeter-$NAME"
ARGS=(-n -t load-test.jmx -Jhost=127.0.0.1 -Jport="$QA_PORT" -Jusers="$2" -Jramp="$3" -Jloops="$4" -Jgets="$5"
  -Jjmeter.save.saveservice.output_format=csv -Jjmeter.save.saveservice.response_data=false -Jjmeter.save.saveservice.url=false)

RAWCON="$WORK/console.raw"
{
  echo "Run: $NAME   Date: $(date '+%Y-%m-%dT%H:%M:%S%:z')"
  seed_db; start_server
  echo "\$ jmeter ${ARGS[*]} -l $OUT.jtl -j $OUT-jmeter.log"
} >"$RAWCON" 2>&1 || { cat "$RAWCON"; exit 2; }

rm -f "$EVID/$OUT.jtl"
cd "$HERE" || exit 2
"$JMETER" "${ARGS[@]}" -l "../evidence/$OUT.jtl" -j "$(cygpath -w "$WORK")\\jmeter.log" </dev/null >>"$RAWCON" 2>&1
echo "JMeter exit code: $?" >>"$RAWCON"

# Cross-check on the server side: morgan writes one line per request
{
  echo "Server log (morgan), requests per route and status:"
  sed 's/\x1b\[[0-9;]*m//g' "$SERVER_LOG" | tr -d '\r' | awk '$1=="POST"||$1=="GET"{if($2 ~ /^\/api/) c[$1" "$2" -> "$3]++} END{for(k in c) print "  "k" = "c[k]}' | sort
  stop_server
} >>"$RAWCON" 2>&1

mask <"$RAWCON" >"$EVID/$OUT-console.log"
mask <"$WORK/jmeter.log" >"$EVID/$OUT-jmeter.log"
node summarise-jtl.js "$EVID/$OUT.jtl" "$EVID/$OUT-console.log" >"$EVID/$OUT-summary.log"
cat "$EVID/$OUT-console.log" "$EVID/$OUT-summary.log"
