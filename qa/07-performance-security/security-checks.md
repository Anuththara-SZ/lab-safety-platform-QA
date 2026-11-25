# Task 3.7: Security checks (OWASP Top 10: A01 and A07)

## 1. Result in short

| OWASP item | Requests in the log | Status code as expected | Not as expected | Verdict |
|---|---|---|---|---|
| A01:2021 Broken Access Control | 50 (3 are setup) | 45 | 5 | 9 of 12 checks PASS, **2 FAIL** (A01-02, A01-09), 2 OBSERVATIONS (A01-05e, A01-11) |
| A07:2021 Identification and Authentication Failures | 41, plus the loops | 36 | 5 | Tokens, expiry and login limit PASS, **1 FAIL** (A07-02d/e), 7 OBSERVATIONS (01b/c, 02c, 03b, 06, 07c, 08, 11a) |

A01-05 counts as PASS for its list requests and has one observation (A01-05e), so it appears in both numbers.

**Main points**
- Role rules hold. Every request with the wrong role got 403 and every request without a token got 401. Where we looked afterwards (lab, inspection, incidents, user roles), a refused request had changed nothing.
- Not OK: reading another inspector's inspection (BUG-003, the README contradicts itself), the "not on yourself" rule (BUG-004), and
  login shows which emails exist when the password is a number. The last one was only **suspected** in BUG-005 and is **now reproduced**.

## 2. How the checks were done

| Item | Value |
|---|---|
| Date | 2026-11-25 |
| Target | `http://127.0.0.1:5055`, local copy only. Nothing else was tested |
| Database | `lab_safety_qa`, fresh `seed.js` before A01 and before A07, dropped afterwards |
| Tool | curl (`curl -s -i`), started by `scripts/run-security-checks.sh` |
| NODE_ENV | not set, as in README section 3. So the error bodies also contain a `stack` (known observation O-11). Left out of the tables below |
| Raw logs | `qa/evidence/phase3-security-a01.log`, `qa/evidence/phase3-security-a07.log`. Search for the check id |
| Masked in the logs | Tokens after 20 characters, local paths, computer name |

Run again (Git Bash): `bash qa/07-performance-security/scripts/run-security-checks.sh all`. The script stops if the database name is not `lab_safety_qa`.
The A07 script was run three times because two checks were added (A07-11, then A07-02d/e). Only the last log is kept.

**Tokens:** "As TECH" means `-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."` with the token of that user.
TECH, INSP, ADMIN are the demo accounts. INSP2, ADMIN2, ADMIN3 were made with `POST /api/users` as ADMIN (S-1 to S-3 in the log). NONE = no header.

**Verdicts**

| Verdict | Meaning |
|---|---|
| PASS | Actual result is the expected result |
| FAIL | Not as expected, and the expectation comes from the README or from a rule the application already has |
| OBSERVATION | The README is silent and it is a design decision. The owner must decide. Not claimed as a defect |

**Basis:** DOC = Documented requirement (README section and line). RE = Reasonable expectation (README silent). No severity is given here.

## 3. A01:2021 Broken Access Control

`<CH05>` = scheduled inspection of CH-05, `<HV01>` = completed inspection of HV-01, both assigned to INSP (Nimal Perera).
`<burn>` = incident reported by INSP, `<lamp>` = incident reported by TECH.

| ID | As | Request | Expected | Actual (status, body excerpt) | Verdict | Basis |
|---|---|---|---|---|---|---|
| A01-01a | TECH | `POST /api/labs` `{"name":"QA Sec Lab","code":"QS-01",...}` | 403 | 403 `{"message":"Role 'technician' is not allowed to perform this action"}` | PASS | DOC s.1 line 33, s.4 line 121, s.8 line 181 |
| A01-01b | INSP | same | 403 | 403 `{"message":"Role 'inspector' is not allowed to perform this action"}` | PASS | DOC same |
| A01-01c | NONE | same | 401 | 401 `{"message":"Not authenticated: token missing"}` | PASS | DOC s.4 line 111 |
| A01-01d | ADMIN | `GET /api/labs?search=QS-01` (was it saved?) | empty list | 200 `[]` | PASS | DOC same as a |
| A01-01e | ADMIN | `POST /api/labs` (positive control) | 201 | 201 `{"name":"QA Sec Lab","code":"QS-01",...}` | PASS | DOC same as a |
| A01-02a | INSP | `GET /api/inspections/<CH05>` (owner, control) | 200 | 200, full inspection | PASS | DOC s.1 line 37 |
| **A01-02b** | INSP2 | `GET /api/inspections/<CH05>` (not own, scheduled) | 403 | **200** `..."inspector":{...,"name":"Nimal Perera","email":"inspector@lab.com"},...,"status":"scheduled","responses":[{"text":"Fire extinguishers...` | **FAIL** | DOC s.1 line 37, contradicted by s.4 line 125 (see below). **BUG-003** |
| **A01-02c** | INSP2 | `GET /api/inspections/<HV01>` (not own, completed) | 403 | **200**, full inspection | **FAIL** | same. **BUG-003** |
| A01-02d | INSP2 | `GET /api/inspections` | own only (none) | 200 `[]` | PASS | DOC s.1 line 37, s.4 line 124 |
| A01-02e | NONE | `GET /api/inspections/<CH05>` | 401 | 401 `{"message":"Not authenticated: token missing"}` | PASS | DOC s.4 line 111 |
| A01-03a | INSP2 | `PUT /api/inspections/<CH05>/submit` with 8 x "pass" | 403 | 403 `{"message":"Only the assigned inspector can submit this inspection"}` | PASS | DOC s.1 line 36, s.4 line 127, s.5 line 153 |
| A01-03b | TECH | same | 403 | 403 `{"message":"Role 'technician' is not allowed..."}` | PASS | DOC same |
| A01-03c | NONE | same | 401 | 401 `{"message":"Not authenticated: token missing"}` | PASS | DOC s.4 line 111 |
| A01-03d | ADMIN | `GET /api/inspections/<CH05>` (changed?) | still scheduled | 200, `status` = scheduled | PASS | DOC same as a |
| A01-04a | TECH | `GET /api/inspections/<CH05>` (scheduled) | 403 | 403 `{"message":"Report not available yet"}` | PASS | DOC s.1 line 37 |
| A01-04b | TECH | `GET /api/inspections/<HV01>` (completed, control) | 200 | 200, full report | PASS | DOC s.1 line 37 |
| A01-04c | TECH | `GET /api/inspections?status=scheduled` | completed only | 200, 4 rows, all completed | PASS | DOC s.1 line 37 |
| A01-04d | TECH | `GET /api/inspections?status[$ne]=completed` | completed only | 200, 4 rows, all completed | PASS | DOC s.1 line 37 |
| A01-05a | INSP | `POST /api/incidents` "QA private incident" (setup) | 201 | 201 | PASS | DOC s.1 line 38 |
| A01-05b | TECH | `GET /api/incidents` | own only | 200, 2 rows, reporter Kamal Silva (TECH) only | PASS | DOC s.4 line 129 |
| A01-05c | TECH | `GET /api/incidents?reportedBy=<id of INSP>` | own only | 200, 2 rows, reporter Kamal Silva only | PASS | DOC s.4 line 129 |
| A01-05d | TECH | `GET /api/incidents/<burn>` | no data | 404 `{"message":"Route not found: GET /api/incidents/..."}` (there is no such route) | PASS | DOC s.4 line 129 |
| A01-05e | TECH | `GET /api/dashboard` | no incident of other people | 200, `recentIncidents` contains "QA private incident" with its description, reported by INSP | OBSERVATION | RE. README does not say what `recentIncidents` may show. Same as O-15 |
| A01-05f | NONE | `GET /api/incidents` | 401 | 401 | PASS | DOC s.4 line 111 |
| A01-06a | TECH | `PUT /api/incidents/<burn>` `{"status":"open"}` | 403 | 403 `{"message":"Role 'technician' is not allowed..."}` | PASS | DOC s.1 line 39, s.4 line 131 |
| A01-06b | TECH | `PUT /api/incidents/<lamp>` (own) `{"status":"resolved"}` | 403 | 403, same message | PASS | DOC same |
| A01-06c | NONE | same as b | 401 | 401 | PASS | DOC s.4 line 111 |
| A01-06d | TECH | `DELETE /api/incidents/<lamp>` | 403 | 403, same message | PASS | DOC s.4 line 132 |
| A01-06e | ADMIN | `GET /api/incidents` (changed?) | lamp open, burn resolved | 200, lamp = open, burn = resolved | PASS | DOC same |
| A01-06f | INSP | `PUT /api/incidents/<lamp>` `{"status":"investigating"}` (control) | 200 | 200 | PASS | DOC s.1 line 39 |
| A01-07a | INSP | `PUT /api/users/<own id>/role` `{"role":"admin"}` | 403 | 403 `{"message":"Role 'inspector' is not allowed..."}` | PASS | DOC s.1 line 40, s.4 line 135 |
| A01-07b | TECH | same with own id | 403 | 403 `{"message":"Role 'technician' is not allowed..."}` | PASS | DOC same |
| A01-07c | NONE | same | 401 | 401 | PASS | DOC s.4 line 111 |
| A01-07d, e | INSP, TECH | `GET /api/users` | 403, 403 | 403, 403 | PASS | DOC s.4 line 134 |
| A01-07f | ADMIN | `GET /api/users` (control) | 200, roles unchanged, no password | 200, inspector and technician roles unchanged, no password field | PASS | DOC s.4 line 134, s.5 line 151 |
| A01-08a | public | `POST /api/auth/register` with `"role":"admin","isAdmin":true` | role technician | 201 `..."role":"technician"` | PASS | DOC s.4 line 115, s.5 line 154 |
| A01-08b | the new account | `GET /api/users` | 403 | 403 | PASS | DOC s.4 line 134 |
| A01-09a | ADMIN2 | `PUT /api/users/6b06733e2a62d31564c8d50b/role` (own id) `{"role":"technician"}` (control) | 400 | 400 `{"message":"You cannot change your own role"}` | PASS | RE, rule in `userController.js:24` |
| **A01-09b** | ADMIN2 | `PUT /api/users/6B06733E2A62D31564C8D50B/role` (own id in capitals) | 400 | **200** `{..."name":"Second Admin",...,"role":"technician"...}` | **FAIL** | RE, rule of the application avoided. **BUG-004** |
| A01-09c | ADMIN3 | `DELETE /api/users/6b06733f2a62d31564c8d50e` (own id, control) | 400 | 400 `{"message":"You cannot delete your own account"}` | PASS | RE, rule in `userController.js:37` |
| **A01-09d** | ADMIN3 | `DELETE /api/users/6B06733F2A62D31564C8D50E` (own id in capitals) | 400 | **200** `{"message":"User deleted"}` | **FAIL** | same as 09b. **BUG-004** |
| A01-09e | ADMIN | `GET /api/users` (what happened?) | 200 | 200, ADMIN2 is now technician, ADMIN3 does not exist any more | confirms 09b, 09d | |
| A01-10a | INSP2 | `POST /api/inspections` with `"inspector":"<id of INSP>"` | assigned to INSP2 | 201, assigned to Second Inspector (INSP2) | PASS | DOC s.1 line 35 |
| A01-10b | TECH | `POST /api/inspections` | 403 | 403 | PASS | DOC s.1 line 35, s.4 line 126 |
| A01-11a | ADMIN | `POST /api/labs` with `"lastScore":100,"lastInspectionDate":"2026-11-01"` | refused or ignored | 201, stored `lastScore` 100 for a lab without any inspection | OBSERVATION | RE. Only an admin can do it. The fields should come from inspections (s.1 line 17), but the README has no rule |
| A01-12a | INSP | `PUT /api/inspections/<CH05>/submit` (assigned, control) | 200 | 200, status completed | PASS | DOC s.1 line 36 |

**README contradiction for A01-02**
- Section 1, line 37: "| View inspections | all | own | completed reports only |"
- Section 4, line 125: "| GET | `/api/inspections/:id` | any | Full inspection with responses |"

We follow line 37, like the other test documents. If the owner says line 125 is right, A01-02b and c are not defects.

## 4. A07:2021 Identification and Authentication Failures

The server was restarted between the groups in the log, because the rate limit counters are kept in memory.

| ID | Request | Expected | Actual (status, body excerpt) | Verdict | Basis |
|---|---|---|---|---|---|
| A07-01a | `POST /api/auth/register`, password `12345` | 400 | 400 `{"message":"Password must be at least 6 characters"}` | PASS | RE (README has no password rule) |
| A07-01b | same, password `123456` | refused | **201**, account created, token returned | OBSERVATION | RE |
| A07-01c | same, password `password` | refused | **201**, account created, token returned | OBSERVATION | RE |
| A07-02a | `POST /api/auth/login`, known email, wrong password | 401 | 401 `{"message":"Invalid email or password"}` | PASS | RE |
| A07-02b | same, unknown email | 401, same message | 401 `{"message":"Invalid email or password"}`, same message | PASS | RE |
| A07-02c | `POST /api/auth/register` with a known email | does not tell that it exists | 409 `{"message":"Email already registered"}` | OBSERVATION | RE. README line 138 lists 409, so this is probably wanted. Common trade-off |
| **A07-02d** | `POST /api/auth/login` `{"email":"admin@lab.com","password":123456}` (known email, password as a number) | 401 | **500** `{"message":"Illegal arguments: number, string"}` | **FAIL** | RE. d and e together show which emails exist. The application gives the same answer in a and b, but not here. Suspected in **BUG-005**, now reproduced |
| A07-02e | same with `nobody@lab.com` (unknown email) | 401 | 401 `{"message":"Invalid email or password"}` | see d | |
| A07-03a | login `{"email":{"$gt":""},"password":"x"}` | 400 | 400 `{"message":"Valid email is required"}` | PASS | RE |
| A07-03b | login `{"email":"admin@lab.com","password":{"$ne":null}}` | 400, no login | 500 `{"message":"Illegal arguments: object, string"}`, no token | OBSERVATION | RE. **No bypass.** Wrong status code, same cause as BUG-005 |
| A07-04a | `GET /api/labs` with a valid token (control) | 200 | 200 | PASS | DOC s.5 line 152 |
| A07-04b | `GET /api/labs` without token | 401 | 401 `{"message":"Not authenticated: token missing"}` | PASS | DOC s.4 line 111 |
| A07-04c | `GET /api/labs`, token `abc.def.ghi` | 401 | 401 `{"message":"Not authenticated: invalid or expired token"}` | PASS | DOC s.5 line 152 |
| A07-04d | `GET /api/labs`, middle character of the payload changed | 401 | 401, same message | PASS | DOC s.5 line 152 |
| A07-04e | `GET /api/users`, payload replaced by the admin id, old signature | 401 | 401, same message | PASS | DOC s.5 line 152 |
| A07-04f | `GET /api/users`, `alg=none` token with the admin id | 401 | 401, same message | PASS | DOC s.5 line 152 |
| A07-04g | `GET /api/users`, admin id, signed with another secret | 401 | 401, same message | PASS | DOC s.5 line 152 |
| A07-04h | same, signed with the test secret (control: e to g are real tests) | 200 | 200 | PASS | |
| A07-05a to d | register a throwaway user, `GET /api/users/staff` 403, ADMIN makes him inspector, same old token again | 403, then 200 | 403, then 200 | PASS | RE: role change works at once |
| A07-05e, f | ADMIN changes him back, same old token | 403 | 403 | PASS | RE: same |
| A07-05g, h | ADMIN deletes him, same old token | 401 | 401 `{"message":"User no longer exists"}` | PASS | DOC s.5 line 152 "deleted users lose access" |
| A07-06a | `POST /api/auth/logout` | README lists no logout route | 404 `{"message":"Route not found: POST /api/auth/logout"}` | OBSERVATION | RE. Logout only deletes the token in the browser (`AuthContext.jsx`) |
| A07-06b | `GET /api/labs`, same token afterwards | | 200. Lifetime in the token: 604800 seconds = 7 days | OBSERVATION | RE. A stolen token works for up to 7 days. README s.6 line 164 lists refresh tokens as a "next step" |
| A07-07 | 51 x `POST /api/auth/login` with a wrong password, fresh server | limit exists | 50 x 401, then 1 x 429. First 429 at **request 51** `{"message":"Too many attempts, try again later"}`, `X-RateLimit-Limit: 50`, with `Retry-After` | PASS | DOC s.5 line 155 "rate limiting (stricter on `/auth`)". The number 50 is only in `app.js:17` |
| A07-07b | login with the **correct** password while blocked | blocked | 429 | PASS | DOC same |
| A07-07c | login of **another account** from the same address | | 429 | OBSERVATION | RE. The limit is per address, not per account. See below |
| A07-07d | `GET /api/labs` with an older token | 200 | 200 | PASS | RE: logged-in users can go on |
| A07-08 | 50 x `GET /api/auth/me` (valid token, 50 x 200), then the first login | 200 | **429** | OBSERVATION | RE. `/me` uses the same counter as login. We found no call of `/auth/me` in `frontend/src`, so the web page is not affected today |
| A07-09 | 50 wrong logins, each with another `X-Forwarded-For`, then login 51 (09a) and 52 without the header (09b) | 429 for 51 | 50 x 401, then 429 and 429 | PASS | RE. A false header does not avoid the limit. express-rate-limit writes a warning in the server log |
| A07-10 | server with `JWT_EXPIRES_IN=2s`: login, `GET /api/labs` at once, again after 4 s | 200, then 401 | 200, then 401 `{"message":"Not authenticated: invalid or expired token"}` | PASS | DOC s.1 line 15, s.5 line 152 |
| A07-11 | 1000 x `GET /api/health`, then request 1001 | 429 for 1001 | 1000 x 200, then 429 | PASS | DOC s.5 line 155 |
| A07-11a | body of request 1001 | `{"message": "..."}` | text/html: `Too many requests, please try again later.` | OBSERVATION | DOC s.4 line 138 in a strict reading ("Errors are returned as `{ "message": "..." }`"), but 429 is not in its list of codes |

**Two sides of the login limit (A07-07)**
- *Too strict for a shared address:* 50 users who share one public address (for example one laboratory network) can use up the 50 logins. After that everybody on this address is blocked until the 15 minutes are over, also with the correct password.
- *Not per account:* one address may try 50 passwords per 15 minutes. That is 4,800 per day (calculated, not tested). With A07-01b this means that a password like `123456` can be guessed.

## 5. For the bug analyst

| Finding | Status |
|---|---|
| A01-02b, c | Confirmed again on a real server with curl. Belongs to BUG-003 |
| A01-09b, d | Confirmed again on a real server with curl. Belongs to BUG-004 |
| A07-02d with e | **New evidence.** BUG-005 says "Suspected, not reproduced": a number as password may show which emails exist. Reproduced: known email 500, unknown email 401 |
| A07-03b | Same cause as BUG-005 (object instead of number) |
| A01-05e | Same as O-15 |
| A01-11, A07-01b/c, A07-02c, A07-06, A07-07c, A07-08, A07-11a | Observations for the owner. Not claimed as defects |

## 6. Not tested

| Item | Reason or steps |
|---|---|
| Login time for known and unknown email | **NOT EXECUTED.** Steps: fresh server, 20 x login known email + wrong password, 20 x unknown email, both with `curl -s -o /dev/null -w "%{time_total}\n"`, compare the medians. (In `authController.js:29` the password is only compared when the email exists, so a difference is possible.) |
| Password change | There is no such route in README section 4 |
| Behind a proxy, HTTPS, CORS, other machines | Not part of the local copy |
| BUG-003 in the browser (opening the page by URL) | Not tested here, only the API |
| Last remaining admin with BUG-004 | Not tested, other admins existed |
| Other OWASP items (A02 to A06, A08 to A10) | The task asks for two items |
