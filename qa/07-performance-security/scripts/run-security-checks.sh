#!/usr/bin/env bash
# Task 3.7 security checks with curl, on 127.0.0.1 and the database lab_safety_qa only.
# Usage (Git Bash):  bash run-security-checks.sh a01 | a07 | all
# Output: qa/evidence/phase3-security-a01.log and phase3-security-a07.log
. "$(dirname "${BASH_SOURCE[0]}")/qa-env.sh"
trap 'stop_server >/dev/null' EXIT

RAW=''; BODY=''; CODE=''; SUM=''

js() { node -e "const o=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(String($1))"; }
say() { printf '%s\n' "$*" >>"$RAW"; }
section() { say; say "=================================================================="; say "$*"; say "=================================================================="; }
add() { SUM+="$(printf "$@")"$'\n'; }

# req ID WHO EXPECTED_CODE METHOD PATH TOKEN BODY [extra curl arguments]
req() {
  local id="$1" who="$2" exp="$3" method="$4" path="$5" token="$6" body="$7"; shift 7
  local a=(-s -S -i -g --max-time 15 -X "$method" "$BASE$path")
  local shown="curl -s -i -g -X $method '$BASE$path'"
  if [ -n "$token" ]; then a+=(-H "Authorization: Bearer $token"); shown+=" -H 'Authorization: Bearer $token'"; fi
  if [ -n "$body" ]; then a+=(-H 'Content-Type: application/json' -d "$body"); shown+=" -H 'Content-Type: application/json' -d '$body'"; fi
  local x; for x in "$@"; do a+=("$x"); shown+=" '$x'"; done
  local out; out="$(curl "${a[@]}" 2>&1 | tr -d '\r')"
  CODE="$(printf '%s\n' "$out" | head -1 | awk '{print $2}')"
  BODY="$(printf '%s\n' "$out" | awk 'f{print} /^$/{f=1}')"
  local res='as expected'; [ "$CODE" = "$exp" ] || res='NOT as expected'
  say; say "--- $id | $who | $(date '+%H:%M:%S')"; say "\$ $shown"; say "$out"
  say ">>> $id expected=$exp actual=$CODE ($res)"
  add '%-9s %-44s %-6s %-46s expected=%s actual=%s %s' "$id" "$who" "$method" "${path:0:46}" "$exp" "$CODE" "$res"
}
# note ID TEXT : a value worked out from the response above it
note() { say ">>> $1 $2"; add '%-9s %s' "$1" "$2"; }
login() { curl -s --max-time 15 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" | js 'o.token'; }

begin() { # log name, title
  RAW="$WORK/$1.raw"; : >"$RAW"; SUM=''
  say "$2"
  say "Date: $(date '+%Y-%m-%dT%H:%M:%S%:z')   Target: $BASE (local only)   Database: $QA_DB"
  say "Tool: $(curl --version 2>/dev/null | head -1 | cut -d' ' -f1-2)   Node: $(node -v)   NODE_ENV not set (README section 3 setup)"
  say "Raw 'curl -i' output. Masked before saving: JWTs after 20 characters, local paths, computer name."
  say "'expected' and 'actual' are HTTP status codes. Verdicts are in qa/07-performance-security/security-checks.md."
}
finish() { say; say "=== SUMMARY (written by the script) ==="; say "$SUM"; mask <"$RAW" >"$EVID/$1.log"; echo "$SUM"; echo "saved qa/evidence/$1.log"; }

# ------------------------------------------------------------------ A01
run_a01() {
  begin phase3-security-a01 "A01:2021 Broken Access Control, manual curl checks"
  seed_db >>"$RAW" || exit 2
  start_server >>"$RAW" || exit 2
  section "SETUP: logins and extra users (created with the admin API)"
  local ADMIN INSP TECH INSP2 ADMIN2 ADMIN3
  ADMIN="$(login admin@lab.com Admin@123)"; INSP="$(login inspector@lab.com Inspector@123)"; TECH="$(login tech@lab.com Tech@123)"
  local INSP2_ID ADMIN2_ID ADMIN3_ID TECH_ID INSP_ID CH05 HV01 LAMP BURN GEN LAB1
  req S-1 "admin" 201 POST /api/users "$ADMIN" '{"name":"Second Inspector","email":"inspector2@lab.com","password":"Inspector2@123","role":"inspector"}'
  INSP2_ID="$(echo "$BODY" | js 'o._id')"
  req S-2 "admin" 201 POST /api/users "$ADMIN" '{"name":"Second Admin","email":"admin2@lab.com","password":"Admin2@123","role":"admin"}'
  ADMIN2_ID="$(echo "$BODY" | js 'o._id')"
  req S-3 "admin" 201 POST /api/users "$ADMIN" '{"name":"Third Admin","email":"admin3@lab.com","password":"Admin3@123","role":"admin"}'
  ADMIN3_ID="$(echo "$BODY" | js 'o._id')"
  INSP2="$(login inspector2@lab.com Inspector2@123)"; ADMIN2="$(login admin2@lab.com Admin2@123)"; ADMIN3="$(login admin3@lab.com Admin3@123)"
  local INSPS INCS LABS
  INSPS="$(curl -s "$BASE/api/inspections" -H "Authorization: Bearer $ADMIN")"
  INCS="$(curl -s "$BASE/api/incidents" -H "Authorization: Bearer $ADMIN")"
  LABS="$(curl -s "$BASE/api/labs" -H "Authorization: Bearer $ADMIN")"
  CH05="$(echo "$INSPS" | js "o.find(i=>i.lab.code==='CH-05')._id")"
  HV01="$(echo "$INSPS" | js "o.find(i=>i.lab.code==='HV-01')._id")"
  INSP_ID="$(echo "$INSPS" | js "o.find(i=>i.lab.code==='CH-05').inspector._id")"
  LAMP="$(echo "$INCS" | js "o.find(i=>/lamp/.test(i.title))._id")"
  BURN="$(echo "$INCS" | js "o.find(i=>/burn/.test(i.title))._id")"
  TECH_ID="$(echo "$INCS" | js "o.find(i=>/lamp/.test(i.title)).reportedBy._id")"
  LAB1="$(echo "$LABS" | js "o[0]._id")"
  GEN="$(curl -s "$BASE/api/templates" -H "Authorization: Bearer $ADMIN" | js "o.find(t=>/General/.test(t.title))._id")"
  say; say "ids: CH-05 inspection (scheduled, inspector Nimal Perera)=$CH05  HV-01 inspection (completed, Nimal Perera)=$HV01"
  say "ids: lamp incident (reported by technician)=$LAMP  burn incident (reported by inspector)=$BURN"

  section "A01-01 Only admin may create a lab (README s.1 line 33, s.4 line 121, s.8 line 181)"
  local L='{"name":"QA Sec Lab","code":"QS-01","building":"Block Q"}'
  req A01-01a "technician" 403 POST /api/labs "$TECH" "$L"
  req A01-01b "inspector" 403 POST /api/labs "$INSP" "$L"
  req A01-01c "no token" 401 POST /api/labs "" "$L"
  req A01-01d "admin: was anything saved? (QS-01)" 200 GET "/api/labs?search=QS-01" "$ADMIN" ""
  note A01-01d "labs found with code QS-01 after the three refused requests: $(echo "$BODY" | js 'o.length')"
  req A01-01e "admin (positive control)" 201 POST /api/labs "$ADMIN" "$L"

  section "A01-02 IDOR read: inspection of another inspector (README s.1 line 37 'own', but s.4 line 125 'any')"
  req A01-02a "owner inspector (positive control)" 200 GET "/api/inspections/$CH05" "$INSP" ""
  req A01-02b "inspector2, scheduled, not own" 403 GET "/api/inspections/$CH05" "$INSP2" ""
  req A01-02c "inspector2, completed, not own" 403 GET "/api/inspections/$HV01" "$INSP2" ""
  req A01-02d "inspector2, list" 200 GET /api/inspections "$INSP2" ""
  note A01-02d "inspections in the list of inspector2 (has none of his own): $(echo "$BODY" | js 'o.length')"
  req A01-02e "no token" 401 GET "/api/inspections/$CH05" "" ""

  section "A01-03 IDOR write: submit the inspection of another inspector (README s.1 line 36, s.4 line 127, s.5 line 153)"
  local ANS
  ANS="$(curl -s "$BASE/api/inspections/$CH05" -H "Authorization: Bearer $INSP" | js 'JSON.stringify({summary:"QA run",responses:o.responses.map(r=>({_id:r._id,result:"pass",remarks:""}))})')"
  req A01-03a "inspector2 (not assigned)" 403 PUT "/api/inspections/$CH05/submit" "$INSP2" "$ANS"
  req A01-03b "technician" 403 PUT "/api/inspections/$CH05/submit" "$TECH" "$ANS"
  req A01-03c "no token" 401 PUT "/api/inspections/$CH05/submit" "" "$ANS"
  req A01-03d "admin: is it unchanged?" 200 GET "/api/inspections/$CH05" "$ADMIN" ""
  note A01-03d "status after the three refused requests: $(echo "$BODY" | js 'o.status')"

  section "A01-04 Technician sees completed reports only (README s.1 line 37)"
  req A01-04a "technician, scheduled inspection" 403 GET "/api/inspections/$CH05" "$TECH" ""
  req A01-04b "technician, completed inspection" 200 GET "/api/inspections/$HV01" "$TECH" ""
  req A01-04c "technician, list with ?status=scheduled" 200 GET "/api/inspections?status=scheduled" "$TECH" ""
  note A01-04c "statuses in the list: $(echo "$BODY" | js '[...new Set(o.map(i=>i.status))].join(",")') ($(echo "$BODY" | js 'o.length') rows)"
  req A01-04d "technician, list with operator filter" 200 GET '/api/inspections?status[$ne]=completed' "$TECH" ""
  note A01-04d "statuses in the list: $(echo "$BODY" | js '[...new Set(o.map(i=>i.status))].join(",")') ($(echo "$BODY" | js 'o.length') rows)"

  section "A01-05 Technician sees own incidents only (README s.4 line 129)"
  req A01-05a "inspector reports an open incident" 201 POST /api/incidents "$INSP" "{\"lab\":\"$LAB1\",\"title\":\"QA private incident\",\"description\":\"Reported by the inspector\",\"severity\":\"high\"}"
  req A01-05b "technician, list" 200 GET /api/incidents "$TECH" ""
  note A01-05b "reporters in the list: $(echo "$BODY" | js '[...new Set(o.map(i=>i.reportedBy.name))].join(",")') ($(echo "$BODY" | js 'o.length') rows)"
  req A01-05c "technician, tries ?reportedBy=<inspector>" 200 GET "/api/incidents?reportedBy=$INSP_ID" "$TECH" ""
  note A01-05c "reporters in the list: $(echo "$BODY" | js '[...new Set(o.map(i=>i.reportedBy.name))].join(",")') ($(echo "$BODY" | js 'o.length') rows)"
  req A01-05d "technician, by id of the burn incident" 404 GET "/api/incidents/$BURN" "$TECH" ""
  req A01-05e "technician, dashboard" 200 GET /api/dashboard "$TECH" ""
  note A01-05e "recentIncidents on the technician dashboard: $(echo "$BODY" | js 'JSON.stringify(o.recentIncidents.map(i=>i.title))')"
  note A01-05e "of these, not reported by this technician: $(echo "$BODY" | js "JSON.stringify(o.recentIncidents.filter(i=>i.reportedBy!=='$TECH_ID').map(i=>i.title+' / '+i.description))")"
  req A01-05f "no token, list" 401 GET /api/incidents "" ""

  section "A01-06 Technician may not change or delete an incident (README s.1 line 39, s.4 lines 131-132)"
  req A01-06a "technician, incident of somebody else" 403 PUT "/api/incidents/$BURN" "$TECH" '{"status":"open"}'
  req A01-06b "technician, own incident" 403 PUT "/api/incidents/$LAMP" "$TECH" '{"status":"resolved"}'
  req A01-06c "no token" 401 PUT "/api/incidents/$LAMP" "" '{"status":"resolved"}'
  req A01-06d "technician, delete own" 403 DELETE "/api/incidents/$LAMP" "$TECH" ""
  req A01-06e "admin: is it unchanged?" 200 GET /api/incidents "$ADMIN" ""
  note A01-06e "lamp=$(echo "$BODY" | js "o.find(i=>i._id==='$LAMP').status") burn=$(echo "$BODY" | js "o.find(i=>i._id==='$BURN').status") (seed: lamp=open burn=resolved)"
  req A01-06f "inspector (positive control)" 200 PUT "/api/incidents/$LAMP" "$INSP" '{"status":"investigating"}'

  section "A01-07 Only admin may manage users (README s.1 line 40, s.4 lines 134-136)"
  req A01-07a "inspector makes himself admin" 403 PUT "/api/users/$INSP_ID/role" "$INSP" '{"role":"admin"}'
  req A01-07b "technician makes himself admin" 403 PUT "/api/users/$TECH_ID/role" "$TECH" '{"role":"admin"}'
  req A01-07c "no token" 401 PUT "/api/users/$TECH_ID/role" "" '{"role":"admin"}'
  req A01-07d "inspector, list users" 403 GET /api/users "$INSP" ""
  req A01-07e "technician, list users" 403 GET /api/users "$TECH" ""
  req A01-07f "admin, list users (positive control)" 200 GET /api/users "$ADMIN" ""
  note A01-07f "inspector role=$(echo "$BODY" | js "o.find(u=>u._id==='$INSP_ID').role") technician role=$(echo "$BODY" | js "o.find(u=>u._id==='$TECH_ID').role") any password field=$(echo "$BODY" | js "o.some(u=>'password' in u)")"

  section "A01-08 Mass assignment: choose a role at registration (README s.4 line 115, s.5 line 154)"
  req A01-08a "public, role=admin in the body" 201 POST /api/auth/register "" '{"name":"Mass Assign","email":"mass@lab.com","password":"Mass@12345","role":"admin","isAdmin":true}'
  note A01-08a "role in the answer: $(echo "$BODY" | js 'o.user.role')"
  local MASS; MASS="$(echo "$BODY" | js 'o.token')"
  req A01-08b "the new account calls an admin route" 403 GET /api/users "$MASS" ""

  section "A01-09 'Not on yourself' rule with the own id in capital letters (README silent, rule is in userController.js lines 24 and 37)"
  req A01-09a "admin2, own id, normal (positive control)" 400 PUT "/api/users/$ADMIN2_ID/role" "$ADMIN2" '{"role":"technician"}'
  req A01-09b "admin2, own id, capitals" 400 PUT "/api/users/${ADMIN2_ID^^}/role" "$ADMIN2" '{"role":"technician"}'
  req A01-09c "admin3, own id, normal (positive control)" 400 DELETE "/api/users/$ADMIN3_ID" "$ADMIN3" ""
  req A01-09d "admin3, own id, capitals" 400 DELETE "/api/users/${ADMIN3_ID^^}" "$ADMIN3" ""
  req A01-09e "admin: users after that" 200 GET /api/users "$ADMIN" ""
  note A01-09e "admin2 role now: $(echo "$BODY" | js "(o.find(u=>u._id==='$ADMIN2_ID')||{}).role")   admin3 still exists: $(echo "$BODY" | js "o.some(u=>u._id==='$ADMIN3_ID')")"

  section "A01-10 Inspector may only schedule for himself (README s.1 line 35)"
  req A01-10a "inspector2 sends inspector=<inspector 1>" 201 POST /api/inspections "$INSP2" "{\"lab\":\"$LAB1\",\"template\":\"$GEN\",\"inspector\":\"$INSP_ID\"}"
  note A01-10a "assigned to: $(echo "$BODY" | js 'o.inspector.name')"
  req A01-10b "technician schedules" 403 POST /api/inspections "$TECH" "{\"lab\":\"$LAB1\",\"template\":\"$GEN\"}"

  section "A01-11 Extra: admin sends calculated fields when creating a lab (README silent; s.1 line 17 'last inspection date and score')"
  req A01-11a "admin, lastScore in the body" 400 POST /api/labs "$ADMIN" '{"name":"Never inspected lab","code":"QS-02","building":"Block Q","lastScore":100,"lastInspectionDate":"2026-11-01"}'
  note A01-11a "stored lastScore=$(echo "$BODY" | js 'o.lastScore') lastInspectionDate=$(echo "$BODY" | js 'o.lastInspectionDate') (no inspection exists for this lab)"

  section "A01-12 Positive control at the end: the assigned inspector can submit"
  req A01-12a "assigned inspector" 200 PUT "/api/inspections/$CH05/submit" "$INSP" "$ANS"
  note A01-12a "status=$(echo "$BODY" | js 'o.status') score=$(echo "$BODY" | js 'o.score')"
  stop_server >>"$RAW"
  finish phase3-security-a01
}

# ------------------------------------------------------------------ A07
b64() { node -e "process.stdout.write(Buffer.from(process.argv[1]).toString('base64url'))" "$1"; }
hs256() { node -e "process.stdout.write(process.argv[1]+'.'+require('crypto').createHmac('sha256',process.argv[2]).update(process.argv[1]).digest('base64url'))" "$1" "$2"; }
counts() { printf '%s\n' "$@" | sort | uniq -c | awk '{printf "%s%s x %s", (NR>1?", ":""), $1, $2}'; }

run_a07() {
  begin phase3-security-a07 "A07:2021 Identification and Authentication Failures, manual curl checks"
  seed_db >>"$RAW" || exit 2
  section "GROUP 1: fresh server, default token lifetime"
  start_server >>"$RAW" || exit 2
  local ADMIN TECH
  ADMIN="$(login admin@lab.com Admin@123)"; TECH="$(login tech@lab.com Tech@123)"

  section "A07-01 Weak passwords at registration (README has no password rule)"
  req A07-01a "public, 5 characters" 400 POST /api/auth/register "" '{"name":"Weak A","email":"weaka@lab.com","password":"12345"}'
  req A07-01b "public, 123456" 400 POST /api/auth/register "" '{"name":"Weak B","email":"weakb@lab.com","password":"123456"}'
  req A07-01c "public, password" 400 POST /api/auth/register "" '{"name":"Weak C","email":"weakc@lab.com","password":"password"}'

  section "A07-02 Does login or register show which emails exist? (README silent)"
  local M1 M2
  req A07-02a "login, known email, wrong password" 401 POST /api/auth/login "" '{"email":"admin@lab.com","password":"Wrong@123"}'
  M1="$(echo "$BODY" | js 'o.message')"
  req A07-02b "login, unknown email" 401 POST /api/auth/login "" '{"email":"nobody@lab.com","password":"Wrong@123"}'
  M2="$(echo "$BODY" | js 'o.message')"
  note A07-02 "messages: known email='$M1' unknown email='$M2' same=$([ "$M1" = "$M2" ] && echo yes || echo no)"
  req A07-02c "register with a known email" 409 POST /api/auth/register "" '{"name":"X","email":"admin@lab.com","password":"Whatever@123"}'
  note A07-02c "message: $(echo "$BODY" | js 'o.message')"
  req A07-02d "login, KNOWN email, password is a number" 401 POST /api/auth/login "" '{"email":"admin@lab.com","password":123456}'
  req A07-02e "login, UNKNOWN email, password is a number" 401 POST /api/auth/login "" '{"email":"nobody@lab.com","password":123456}'

  section "A07-03 Login with MongoDB operators instead of text (README silent for login)"
  req A07-03a "email as operator" 400 POST /api/auth/login "" '{"email":{"$gt":""},"password":"x"}'
  req A07-03b "password as operator" 400 POST /api/auth/login "" '{"email":"admin@lab.com","password":{"$ne":null}}'
  note A07-03b "message: $(echo "$BODY" | js 'o.message'); token in the answer: $(echo "$BODY" | js "'token' in o")"

  section "A07-04 Missing, malformed and changed tokens (README s.5 line 152 'verified on every request', s.4 line 111)"
  req A07-04a "valid token (positive control)" 200 GET /api/labs "$TECH" ""
  req A07-04b "no token" 401 GET /api/labs "" ""
  req A07-04c "garbage token" 401 GET /api/labs "abc.def.ghi" ""
  local H P S ADMIN_ID MID C NOW FAKE
  IFS=. read -r H P S <<<"$TECH"
  MID=$(( ${#P} / 2 )); C="${P:$MID:1}"; if [ "$C" = A ]; then C=B; else C=A; fi
  req A07-04d "middle character of the payload changed" 401 GET /api/labs "$H.${P:0:$MID}$C${P:$((MID+1))}.$S" ""
  ADMIN_ID="$(curl -s "$BASE/api/users" -H "Authorization: Bearer $ADMIN" | js "o.find(u=>u.email==='admin@lab.com')._id")"
  NOW="$(date +%s)"; FAKE="$(b64 "{\"id\":\"$ADMIN_ID\",\"iat\":$NOW,\"exp\":$((NOW+3600))}")"
  req A07-04e "payload = admin id, old signature" 401 GET /api/users "$H.$FAKE.$S" ""
  req A07-04f "alg=none token with the admin id" 401 GET /api/users "$(b64 '{"alg":"none","typ":"JWT"}').$FAKE." ""
  req A07-04g "admin id, signed with another secret" 401 GET /api/users "$(hs256 "$H.$FAKE" other-secret)" ""
  req A07-04h "same, right secret (shows e to g are valid tests)" 200 GET /api/users "$(hs256 "$H.$FAKE" "$QA_SECRET")" ""

  section "A07-05 Old token after a role change and after the user is deleted (README s.5 line 152)"
  local T TID
  req A07-05a "public registers a throwaway user" 201 POST /api/auth/register "" '{"name":"Throw Away","email":"throwaway@lab.com","password":"Throw@12345"}'
  T="$(echo "$BODY" | js 'o.token')"; TID="$(echo "$BODY" | js 'o.user.id')"
  req A07-05b "as technician" 403 GET /api/users/staff "$T" ""
  req A07-05c "admin promotes him to inspector" 200 PUT "/api/users/$TID/role" "$ADMIN" '{"role":"inspector"}'
  req A07-05d "same old token, now inspector" 200 GET /api/users/staff "$T" ""
  req A07-05e "admin changes him back to technician" 200 PUT "/api/users/$TID/role" "$ADMIN" '{"role":"technician"}'
  req A07-05f "same old token, technician again" 403 GET /api/users/staff "$T" ""
  req A07-05g "admin deletes him" 200 DELETE "/api/users/$TID" "$ADMIN" ""
  req A07-05h "same old token, user deleted" 401 GET /api/labs "$T" ""

  section "A07-06 Logout and token lifetime (README s.6 line 164 lists refresh tokens as a next step)"
  req A07-06a "logout on the server" 404 POST /api/auth/logout "$TECH" ""
  req A07-06b "same token after that" 200 GET /api/labs "$TECH" ""
  note A07-06 "lifetime in the token: $(node -e "const p=JSON.parse(Buffer.from(process.argv[1],'base64url'));console.log((p.exp-p.iat)+' seconds = '+(p.exp-p.iat)/86400+' days; fields: '+Object.keys(p).join(','))" "$P")"
  stop_server >>"$RAW"

  section "GROUP 2: fresh server. A07-07 Login rate limit (README s.5 line 155 'rate limiting (stricter on /auth)')"
  start_server >>"$RAW" || exit 2
  local i e codes=()
  for i in $(seq 1 51); do
    if [ "$i" = 1 ] || [ "$i" = 50 ] || [ "$i" = 51 ]; then
      e=401; [ "$i" = 51 ] && e=429
      req "A07-07.$i" "login $i, wrong password" $e POST /api/auth/login "" '{"email":"admin@lab.com","password":"Wrong@123"}'
    else
      CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@lab.com","password":"Wrong@123"}')"
    fi
    codes+=("$CODE"); say "login request $i -> $CODE"
  done
  note A07-07 "51 logins: $(counts "${codes[@]}"); first 429 at request $(printf '%s\n' "${codes[@]}" | grep -n 429 | head -1 | cut -d: -f1)"
  req A07-07b "CORRECT password while blocked" 429 POST /api/auth/login "" '{"email":"admin@lab.com","password":"Admin@123"}'
  req A07-07c "other account, same address" 429 POST /api/auth/login "" '{"email":"tech@lab.com","password":"Tech@123"}'
  req A07-07d "token from group 1 on another route" 200 GET /api/labs "$TECH" ""
  stop_server >>"$RAW"

  section "GROUP 3: fresh server. A07-08 Does GET /api/auth/me use the same counter?"
  start_server >>"$RAW" || exit 2
  codes=()
  for i in $(seq 1 50); do CODE="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/me" -H "Authorization: Bearer $TECH")"; codes+=("$CODE"); done
  note A07-08 "50 x GET /api/auth/me with a valid token: $(counts "${codes[@]}")"
  req A07-08a "first login of this server, correct password" 200 POST /api/auth/login "" '{"email":"tech@lab.com","password":"Tech@123"}'
  stop_server >>"$RAW"

  section "GROUP 4: fresh server. A07-09 Avoid the limit with a false X-Forwarded-For header"
  start_server >>"$RAW" || exit 2
  codes=()
  for i in $(seq 1 50); do CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H "X-Forwarded-For: 10.0.0.$i" -H 'Content-Type: application/json' -d '{"email":"admin@lab.com","password":"Wrong@123"}')"; codes+=("$CODE"); done
  note A07-09 "50 logins, each with another X-Forwarded-For: $(counts "${codes[@]}")"
  req A07-09a "login 51, again a new address" 429 POST /api/auth/login "" '{"email":"admin@lab.com","password":"Wrong@123"}' -H 'X-Forwarded-For: 10.0.0.51'
  req A07-09b "login 52, without the header" 429 POST /api/auth/login "" '{"email":"admin@lab.com","password":"Wrong@123"}'
  say; say "server log, first lines about X-Forwarded-For:"; say "$(grep -m2 -i 'X-Forwarded-For' "$SERVER_LOG")"
  stop_server >>"$RAW"

  section "GROUP 5: server started with JWT_EXPIRES_IN=2s. A07-10 Token expiry (README s.1 line 15, s.5 line 152)"
  start_server JWT_EXPIRES_IN=2s >>"$RAW" || exit 2
  req A07-10a "login" 200 POST /api/auth/login "" '{"email":"tech@lab.com","password":"Tech@123"}'
  local X; X="$(echo "$BODY" | js 'o.token')"
  req A07-10b "at once" 200 GET /api/labs "$X" ""
  sleep 4; say; say "(waited 4 seconds)"
  req A07-10c "after 4 seconds" 401 GET /api/labs "$X" ""
  note A07-10c "message: $(echo "$BODY" | js 'o.message')"
  stop_server >>"$RAW"
  section "GROUP 6: fresh server. A07-11 General limit of 1000 requests (README s.5 line 155, number and answer format not in the README)"
  start_server >>"$RAW" || exit 2
  # one curl process sends 1000 requests: n=1 to n=1000
  local C1000; C1000="$(curl -s -o /dev/null -w '%{http_code} ' "$BASE/api/health?n=[1-1000]")"
  note A07-11 "requests 1 to 1000 on /api/health: $(counts $C1000)"
  req A07-11a "request 1001" 429 GET /api/health "" ""
  note A07-11a "body: $BODY"
  note A07-11a "content type: $(awk '/--- A07-11a/{f=1} f' "$RAW" | grep -i '^content-type' | head -1)"
  stop_server >>"$RAW"
  finish phase3-security-a07
}

case "${1:-}" in
  a01) run_a01 ;;
  a07) run_a07 ;;
  all) run_a01; run_a07 ;;
  *) die "usage: run-security-checks.sh a01|a07|all" ;;
esac
