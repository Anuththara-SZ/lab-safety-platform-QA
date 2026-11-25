# Task 3.2: Test Cases

Total: **45** test cases. **32 pass, 13 fail** (run on 2026-11-25). A case fails when at least one of its checks fails.
Source of the Actual Result and Status columns: `qa/evidence/phase2-rerun-main.log`, `phase2-rerun-known-defects.log` and `phase2-rerun-ui.log`,
filled in by `fill-results.js` (output: `qa/evidence/phase4-fill-results.log`). The failed checks are explained in `qa/08-defects`.
The API cases were run as automated tests with the same requests; they were not typed by hand. TC-USR-04 passes as designed. An extra
variation of it (own id in capital letters) fails and belongs to BUG-004.

| Group | Area | Count |
|---|---|---|
| AUTH | Login, registration | 8 |
| LAB | Laboratories | 7 |
| TPL | Checklist templates | 5 |
| INS | Inspections | 9 |
| INC | Incidents | 5 |
| USR | User management | 5 |
| PERM | Permissions | 6 |
| **Total** | | **45** |

Three cases are UI cases for Selenium and have **[UI]** in the description. All the others are API cases.

## 1. How to read and run the cases

- **Base URL:** `http://localhost:5000`. Setup, accounts and extra data D1 to D5 are in `test-environment.md`.
- **SEED** = fresh `npm run seed`. **SEED+** = fresh seed plus D1 to D5. Seed again before a case if an earlier case changed the data it needs.
- After a new seed all ids change and old tokens give 401, so log in again and look up the ids again.
- **ADMIN, ADMIN2, INSP, INSP2, TECH, TEMP** = send `Authorization: Bearer <token>` of that account. **NONE** = no Authorization header.
- Send `Content-Type: application/json` with every body.
- **Source tags:** `[README s.N]` = requirement in that README section. `[Reasonable expectation]` = the README is silent, so this is our judgement.
- Rate limits: `/api/auth` 50 and `/api` 1000 requests per 15 minutes per IP. Log in once per role and reuse the token. If you get 429, restart the backend. Run TC-AUTH-08 last.
- Registration always makes a technician. Other roles must be created by an admin.

**Ids used in the steps**

| Placeholder | How to get it |
|---|---|
| `<HV01_ID>`, `<EL02_ID>`, `<CN04_ID>`, `<CH05_ID>`, `<TMP99_ID>` | `_id` from `GET /api/labs` (match by `code`) |
| `<GENERAL_TPL_ID>`, `<CHEMICAL_TPL_ID>` | `_id` from `GET /api/templates` (match by `title`) |
| `<INSP_USER_ID>`, `<INSP2_USER_ID>`, `<TECH_USER_ID>`, `<TEMP_ID>`, `<ADMIN2_ID>` | `_id` from `GET /api/users` as ADMIN |
| `<CH05_INSP_ID>` | the seeded scheduled inspection of CH-05, from `GET /api/inspections?status=scheduled` as ADMIN |
| `<HV01_INSP_ID>` | the completed inspection of HV-01, from `GET /api/inspections?status=completed` as ADMIN |
| `<INSP2_INSP_ID>` | the inspection created as D5 |
| `<LAMP_ID>`, `<BURN_ID>` | `_id` from `GET /api/incidents` as ADMIN ("Damaged earth-leakage warning lamp", "Minor soldering burn") |

**BODY(r1, ..., r8)** is short for this submit body. It has one object per checklist item, in order. The item ids are the
`_id` values in `responses` from `GET /api/inspections/<id>`. For a `fail`, remarks is "Needs repair" unless the case says otherwise.

```text
{"summary":"QA run","responses":[
  {"_id":"<id of item 1>","result":"r1","remarks":""},
  ... one object for each of the 8 items ...
]}
```

**Example commands (Windows PowerShell)**

```powershell
# log in and keep the token
$ADMIN = (Invoke-RestMethod -Method Post http://localhost:5000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@lab.com","password":"Admin@123"}').token
$INSP  = (Invoke-RestMethod -Method Post http://localhost:5000/api/auth/login -ContentType "application/json" -Body '{"email":"inspector@lab.com","password":"Inspector@123"}').token

# send any request and see the status code and the body
'{"name":"Robotics Lab","code":"RB-10","building":"Block D"}' | Out-File $env:TEMP\body.json -Encoding ascii
curl.exe -i -X POST http://localhost:5000/api/labs -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d "@$env:TEMP\body.json"

# BODY(pass,pass,pass,pass,fail,na,na,na)
$ID = "paste the inspection id here"
$items = (Invoke-RestMethod "http://localhost:5000/api/inspections/$ID" -Headers @{ Authorization = "Bearer $INSP" }).responses
$r = "pass","pass","pass","pass","fail","na","na","na"
$answers = for ($i = 0; $i -lt 8; $i++) { @{ _id = $items[$i]._id; result = $r[$i]; remarks = $(if ($r[$i] -eq "fail") { "Needs repair" } else { "" }) } }
@{ summary = "QA run"; responses = @($answers) } | ConvertTo-Json -Depth 4 | Out-File $env:TEMP\body.json -Encoding ascii
curl.exe -i -X PUT "http://localhost:5000/api/inspections/$ID/submit" -H "Authorization: Bearer $INSP" -H "Content-Type: application/json" -d "@$env:TEMP\body.json"

# 51 failed logins for TC-AUTH-08
'{"email":"admin@lab.com","password":"Wrong@123"}' | Out-File $env:TEMP\bad.json -Encoding ascii
1..51 | ForEach-Object { curl.exe -s -o NUL -w "$_ %{http_code}\n" -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "@$env:TEMP\bad.json" }
```

## 2. Authentication (8)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-AUTH-01 | [UI] Valid login lands on the dashboard | SEED; backend and frontend running; browser logged out | 1. Open `http://localhost:5173/login`<br>2. Type `admin@lab.com` in `#email` and `Admin@123` in `#password`<br>3. Click "Sign in" | URL becomes `http://localhost:5173/`. The heading "Safety Dashboard" and the name "Dr. Admin" are visible. [README s.1 login; landing page is a reasonable expectation] | As expected (1 check) | Pass |
| TC-AUTH-02 | [UI] Wrong password shows an error | SEED; backend and frontend running; browser logged out | 1. Open `http://localhost:5173/login`<br>2. Type `admin@lab.com` and `Wrong@123`<br>3. Click "Sign in" | Page stays on `/login`. An element with `role="alert"` shows "Invalid email or password". No `token` in localStorage. [Reasonable expectation] | As expected (1 check) | Pass |
| TC-AUTH-03 | Login API works for the three demo accounts | SEED | 1. NONE `POST /api/auth/login` `{"email":"admin@lab.com","password":"Admin@123"}`<br>2. Same with `inspector@lab.com` / `Inspector@123`<br>3. Same with `tech@lab.com` / `Tech@123` | 200 each time. Body has `token` and `user` with role admin, inspector, technician. No `password` field. [README s.4, s.5] | As expected (3 checks) | Pass |
| TC-AUTH-04 | Login API rejects bad credentials safely | SEED | NONE `POST /api/auth/login` with:<br>a. `{"email":"admin@lab.com","password":"Wrong@123"}`<br>b. `{"email":"nobody@lab.com","password":"Wrong@123"}`<br>c. `{"email":"admin@lab.com","password":123456}` (a number) | a, b: 401 with the same message, so nobody can learn which emails exist. c: 400 or 401, never 500. [README s.4 codes; reasonable expectation] | c: 500 "Illegal arguments: number, string" (BUG-005). a, b as expected | Fail |
| TC-AUTH-05 | Self-registration cannot choose a role | SEED; email `new1@lab.com` not used | 1. NONE `POST /api/auth/register` `{"name":"New Student","email":"new1@lab.com","password":"Student@1","role":"admin"}`<br>2. `GET /api/users` with the new token | 1: 201 with a token, `user.role` is "technician". 2: 403. [README s.4, s.5] | As expected (2 checks) | Pass |
| TC-AUTH-06 | Registration validation and duplicate email | SEED; emails used below do not exist | NONE `POST /api/auth/register` with:<br>a. `{"name":"","email":"a1@lab.com","password":"Abc@12"}`<br>b. `{"name":"A","email":"not-an-email","password":"Abc@12"}`<br>c. `{"name":"A","email":"a3@lab.com","password":"Abc@1"}` (5 characters)<br>d. `{"name":"A","email":"a4@lab.com","password":"Abc@12"}` (6 characters)<br>e. Repeat d | a, b, c: 400 with a message. d: 201. e: 409. [README s.4, s.5. The minimum of 6 is from `authRoutes.js`, README is silent] | As expected (5 checks) | Pass |
| TC-AUTH-07 | Malformed JSON body gives 400 | Backend running | NONE `POST /api/auth/login` with the raw body `{"email":"admin@lab.com",` (cut off) | 400 with a message, not 500, because it is a client mistake. [README s.4 "proper status codes"; reasonable expectation] | 500 instead of 400 (observation O-08) | Fail |
| TC-AUTH-08 | Rate limit on authentication routes (run last) | SEED; backend just restarted, so the counter is 0 | 1. NONE: send `POST /api/auth/login` `{"email":"admin@lab.com","password":"Wrong@123"}` 51 times within 15 minutes<br>2. `GET /api/health`<br>3. Restart the backend | Requests 1 to 50: 401. Request 51: 429 with a message. Step 2: 200. [README s.5 stricter limit on `/auth`. The number 50 is from `backend/app.js`] | As expected (2 checks) | Pass |

## 3. Laboratories (7)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-LAB-01 | Admin creates, reads and updates a lab | SEED; code `RB-10` not used | 1. ADMIN `POST /api/labs` `{"name":"Robotics Lab","code":"RB-10","building":"Block D","capacity":25,"hazardLevel":"low"}`<br>2. `GET /api/labs/<new id>`<br>3. `PUT /api/labs/<new id>` `{"name":"Robotics Laboratory","code":"RB-10","building":"Block D","capacity":30}`<br>4. `GET /api/labs/<new id>` | 1: 201. 2: 200 with the same data. 3: 200. 4: name "Robotics Laboratory", capacity 30. [README s.1, s.4] | As expected (1 check) | Pass |
| TC-LAB-02 | Invalid or duplicate lab data is rejected | SEED (HV-01 exists) | ADMIN `POST /api/labs` with:<br>a. `{"code":"X-1","building":"B"}` (no name)<br>b. `{"name":"X","code":"X-2","building":"B","capacity":0}`<br>c. `{"name":"X","code":"X-3","building":"B","hazardLevel":"extreme"}`<br>d. `{"name":"X","code":"HV-01","building":"B"}`<br>e. `{"name":"X","code":"hv-01","building":"B"}` | a, b, c: 400. d: 409. e: 409, the same code in lower case. Nothing is saved. [README s.2 `code(unique)`, s.5 validation. e is a reasonable expectation] | As expected (5 checks) | Pass |
| TC-LAB-03 | Search and hazard filter | SEED | TECH:<br>1. `GET /api/labs?search=electronics`<br>2. `GET /api/labs?hazardLevel=high`<br>3. `GET /api/labs?search=.*` | 200 each. 1: EL-02 and PE-03. 2: CH-05, HV-01, PE-03. 3: empty list, because the text is escaped and not used as a pattern. [README s.1, s.4, s.5] | As expected (3 checks) | Pass |
| TC-LAB-04 | Search sent as an array must not crash the API | SEED | TECH `GET /api/labs?search[]=x` (with curl use `-g`) | 400, or 200 with the value treated as text. Never 500. [Reasonable expectation] | 500 "req.query.search.replace is not a function" (BUG-005) | Fail |
| TC-LAB-05 | Invalid and unknown lab ids | SEED | ADMIN:<br>1. `GET /api/labs/abc`<br>2. `PUT /api/labs/abc` `{"name":"X","code":"X-1","building":"B"}`<br>3. `DELETE /api/labs/abc`<br>4. `GET /api/labs/000000000000000000000000` | 1, 2, 3: 400, not 500. 4: 404. [README s.4 codes; reasonable expectation] | As expected (4 checks) | Pass |
| TC-LAB-06 | Deleting a lab with linked records leaves no orphans | SEED+ | ADMIN:<br>1. `DELETE /api/labs/<HV01_ID>`<br>2. `GET /api/labs/<HV01_ID>`<br>3. `GET /api/inspections?lab=<HV01_ID>`<br>4. `DELETE /api/labs/<TMP99_ID>`<br>5. `GET /api/labs/<TMP99_ID>` | 1: 409 with a reason. 2: 200, lab still there. 3: inspections still listed with lab data. 4: 200. 5: 404. [README silent on linked records; reasonable expectation] | As expected (2 checks) | Pass |
| TC-LAB-07 | Error body does not show a stack trace | SEED | a. Start the backend with `NODE_ENV=production`. ADMIN `GET /api/labs/000000000000000000000000`<br>b. Start it as in README s.3 (`NODE_ENV` not set). Repeat the request | 404 both times. Body has only `message` and no `stack`. [a: README s.5. b: README s.4 error format `{ "message": "..." }`; reasonable expectation] | b: body also has `stack` (observation O-11). a as expected | Fail |

## 4. Checklist templates (5)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-TPL-01 | Admin creates a template with a critical item | SEED | 1. ADMIN `POST /api/templates` `{"title":"QA Checklist","description":"QA","items":[{"text":"Fire door closed","category":"Fire Safety","critical":true},{"text":"Floor is dry","category":"General"}]}`<br>2. TECH `GET /api/templates/<new id>` | 1: 201. 2: 200 with 2 items, the first critical, the second not critical. [README s.1, s.4] | As expected (1 check) | Pass |
| TC-TPL-02 | Invalid templates are rejected | SEED | ADMIN `POST /api/templates` with:<br>a. `{"title":"","items":[{"text":"A"}]}`<br>b. `{"title":"T","items":[]}`<br>c. `{"title":"T","items":[{"text":"   "}]}`<br>d. `{"title":"T","items":[{"text":"A","category":"Magic"}]}` | 400 with a message each time. `GET /api/templates` still shows only the 2 seeded templates. [README s.5 validation. Categories are from `Template.js`] | As expected (4 checks) | Pass |
| TC-TPL-03 | Editing a template does not change existing inspections | SEED | ADMIN:<br>1. `GET /api/inspections/<HV01_INSP_ID>` and `<CH05_INSP_ID>`, save both<br>2. `PUT /api/templates/<GENERAL_TPL_ID>` `{"title":"Changed title","items":[{"text":"Only new item","category":"General"}]}`<br>3. Repeat step 1 | 2: 200. 3: both inspections still have the same 8 items and `templateTitle`; the completed one has the same score and risk. [README s.2] | As expected (1 check) | Pass |
| TC-TPL-04 | Deleting a template used by a scheduled inspection | SEED | ADMIN:<br>1. `DELETE /api/templates/<GENERAL_TPL_ID>`<br>2. `GET /api/templates/<GENERAL_TPL_ID>`<br>3. `GET /api/inspections/<CH05_INSP_ID>` | 1: 409, the same safe-delete rule as labs and users, so no inspection points to a missing template. 2: 200. 3: 200 with 8 items. If step 1 is allowed, the case fails; also record what step 3 shows. [README silent; reasonable expectation] | 1: 200 "Template deleted". 2: 404 (observation O-12). 3 as expected | Fail |
| TC-TPL-05 | Invalid id, unknown id and delete of an unused template | SEED | ADMIN:<br>1. `GET /api/templates/abc`<br>2. `GET /api/templates/000000000000000000000000`<br>3. `DELETE /api/templates/<CHEMICAL_TPL_ID>`<br>4. `GET /api/templates/<CHEMICAL_TPL_ID>` | 1: 400. 2: 404. 3: 200. 4: 404. [README s.4; 400 is a reasonable expectation] | As expected (3 checks) | Pass |

## 5. Inspections (9)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-INS-01 | Scheduling follows the assignment rules | SEED+ | 1. ADMIN `POST /api/inspections` `{"lab":"<CN04_ID>","template":"<GENERAL_TPL_ID>","inspector":"<INSP_USER_ID>","scheduledDate":"2027-01-15"}`<br>2. INSP sends the same with `"inspector":"<INSP2_USER_ID>"`<br>3. ADMIN sends the same with `"inspector":"<TECH_USER_ID>"` | 1: 201, status "scheduled", inspector Nimal Perera, 8 items all "pending". 2: never assigned to INSP2; either 201 with Nimal Perera or 403. 3: 400. [README s.1 permission matrix; 3 is a reasonable expectation] | As expected (3 checks) | Pass |
| TC-INS-02 | Invalid scheduled date is rejected | SEED | ADMIN `POST /api/inspections` `{"lab":"<CN04_ID>","template":"<GENERAL_TPL_ID>","scheduledDate":"<date>"}` with:<br>a. `not-a-date`<br>b. `2027-02-30` (this day does not exist) | 400 with a message each time. Nothing is saved. b must not be changed silently to another day. [README s.5 validation; reasonable expectation] | b: 201, saved as 2027-03-02 (BUG-006). a as expected | Fail |
| TC-INS-03 | Scheduled date in the past is rejected | SEED | ADMIN `POST /api/inspections` `{"lab":"<CN04_ID>","template":"<GENERAL_TPL_ID>","scheduledDate":"2020-01-01"}` | 400 with a message, because a future visit cannot be planned in the past. Nothing is saved. [README silent; reasonable expectation] | 201, saved as 2020-01-01 (observation O-07) | Fail |
| TC-INS-04 | Score and risk level are calculated correctly | SEED | INSP:<br>1. `PUT /api/inspections/<CH05_INSP_ID>/submit` BODY(pass,pass,pass,pass,fail,na,na,na)<br>2. `GET /api/labs/<CH05_ID>`<br>3. `POST /api/inspections` `{"lab":"<CH05_ID>","template":"<GENERAL_TPL_ID>"}`<br>4. `PUT /api/inspections/<new id>/submit` BODY(fail,pass,pass,pass,pass,na,na,na). Item 1 is critical | 1: 200, status "completed", score 80 (4 of 5, N/A ignored), risk "low". 2: `lastScore` 80 and `lastInspectionDate` is today. 3: 201. 4: 200, score 80, risk "critical". [README s.1 scoring and risk] | As expected (2 checks) | Pass |
| TC-INS-05 | All items N/A must not be reported as 100 / low | SEED | INSP:<br>1. `PUT /api/inspections/<CH05_INSP_ID>/submit` BODY(na,na,na,na,na,na,na,na)<br>2. `GET /api/labs/<CH05_ID>` | Not score 100 and not risk "low", because nothing was checked. Either 400, or 200 without a score and without "low". Lab `lastScore` is not 100. [README s.1 formula gives 0/0, so README is silent; reasonable expectation] | 200, score 100, risk low; lab lastScore 100 (BUG-002) | Fail |
| TC-INS-06 | Incomplete or repeated submit is rejected | SEED | INSP:<br>a. `PUT /api/inspections/<CH05_INSP_ID>/submit` with items 1 to 7 "pass" and item 8 left out<br>b. Same id, BODY(pass,pass,pass,pass,fail,pass,pass,pass) with empty remarks on item 5<br>c. `PUT /api/inspections/<HV01_INSP_ID>/submit` (already completed) BODY(pass x 8) | a, b: 400, inspection stays "scheduled". c: 400 (409 is also acceptable), score and answers do not change. [b: README s.8. a, c: reasonable expectation] | As expected (3 checks) | Pass |
| TC-INS-07 | Unknown response id is rejected on submit | SEED | INSP `PUT /api/inspections/<CH05_INSP_ID>/submit` BODY(pass x 8) plus one more object `{"_id":"000000000000000000000000","result":"fail","remarks":"ghost"}` | 400 that says an item is unknown. Inspection stays "scheduled". The extra answer must not be ignored silently. [README silent; reasonable expectation] | 200, inspection completed, score 100, extra id ignored (observation O-05) | Fail |
| TC-INS-08 | Wrong type for responses must not crash the API | SEED | INSP `PUT /api/inspections/<CH05_INSP_ID>/submit` with:<br>a. `{"responses":"abc"}`<br>b. `{"responses":{"x":1}}`<br>c. `{"responses":[null]}` | 400 each time, never 500. Inspection stays "scheduled". [README s.4 codes; reasonable expectation] | a, b, c: 500 (BUG-005) | Fail |
| TC-INS-09 | Inspections are visible only to the right role | SEED+ | 1. INSP `GET /api/inspections`<br>2. INSP `GET /api/inspections/<INSP2_INSP_ID>`<br>3. TECH `GET /api/inspections`<br>4. TECH `GET /api/inspections/<CH05_INSP_ID>` | 1: 200, only own inspections. 2: 403 (404 is also acceptable) and no inspection data. 3: 200, completed ones only. 4: 403. [README s.1 permission matrix "View inspections"] | 2: 200 with inspection data (BUG-003). 1, 3, 4 as expected | Fail |

## 6. Incidents (5)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-INC-01 | Technician reports an incident but cannot set its status | SEED | TECH `POST /api/incidents` `{"lab":"<EL02_ID>","title":"Broken socket","description":"Socket cover is cracked","severity":"medium","status":"resolved"}` | 201, severity "medium", reported by Kamal Silva, status "open". [README s.1: anyone reports, admin and inspector triage] | As expected (1 check) | Pass |
| TC-INC-02 | Invalid incident data is rejected | SEED | TECH `POST /api/incidents` with:<br>a. `{"lab":"<EL02_ID>","title":"T"}` (no description)<br>b. `{"lab":"<EL02_ID>","title":"T","description":"D","severity":"extreme"}`<br>c. `{"lab":"abc","title":"T","description":"D"}`<br>d. `{"lab":"000000000000000000000000","title":"T","description":"D"}` | a, b, c: 400. d: 404. Nothing is saved. [README s.4, s.5] | As expected (4 checks) | Pass |
| TC-INC-03 | Technician sees only own incidents | SEED | 1. TECH `GET /api/incidents`<br>2. TECH `GET /api/incidents?severity=low`<br>3. INSP `GET /api/incidents`<br>4. ADMIN `GET /api/incidents` | 200 each. 1: 2 incidents, all by Kamal Silva. 2: empty list. 3 and 4: 3 incidents. [README s.4] | As expected (4 checks) | Pass |
| TC-INC-04 | Inspector triages an incident | SEED | INSP `PUT /api/incidents/<LAMP_ID>` with:<br>a. `{"status":"investigating"}`<br>b. `{"status":"resolved","resolution":"Lamp replaced"}`<br>c. `{"status":"closed"}` | a: 200, status "investigating". b: 200, status "resolved", resolution saved, `resolvedAt` set. c: 400, the record does not change. [README s.1, s.2] | As expected (3 checks) | Pass |
| TC-INC-05 | Editing a resolved incident keeps the original resolved date | SEED (the burn incident was resolved 3 days before the seed) | ADMIN:<br>1. `GET /api/incidents?status=resolved`, note `resolvedAt`<br>2. `PUT /api/incidents/<BURN_ID>` `{"status":"resolved","severity":"low","resolution":"Stand is now required"}` (the same fields the UI form sends) | 200, new resolution text, `resolvedAt` is the same as before, because only the text was edited. [README silent; reasonable expectation] | 200, but resolvedAt changed to the time of the edit (observation O-13) | Fail |

## 7. User management (5)

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-USR-01 | Admin creates a user and the password is never returned | SEED | 1. ADMIN `POST /api/users` `{"name":"QA Inspector","email":"qa.insp@lab.com","password":"QaInsp@1","role":"inspector"}`<br>2. NONE `POST /api/auth/login` `{"email":"qa.insp@lab.com","password":"QaInsp@1"}`<br>3. ADMIN `GET /api/users` | 1: 201, role "inspector". 2: 200. 3: 200 and the user is in the list. No `password` field in any response. [README s.1, s.4, s.5] | As expected (1 check) | Pass |
| TC-USR-02 | Invalid or duplicate user data is rejected | SEED | ADMIN `POST /api/users` with:<br>a. `{"name":"A","email":"u1@lab.com","password":"Abc@12","role":"manager"}`<br>b. `{"name":"A","email":"u2@lab.com","password":"Abc@1","role":"inspector"}`<br>c. `{"name":"A","email":"x@","password":"Abc@12","role":"inspector"}`<br>d. `{"name":"A","email":"tech@lab.com","password":"Abc@12","role":"inspector"}` | a, b, c: 400. d: 409. Nothing is saved. [README s.1 roles, s.4 codes, s.5 validation] | As expected (4 checks) | Pass |
| TC-USR-03 | Changing roles works at once, and not on yourself | SEED+; TEMP has logged in | 1. TEMP `GET /api/users/staff`<br>2. ADMIN `PUT /api/users/<TEMP_ID>/role` `{"role":"inspector"}`<br>3. TEMP (same token) `GET /api/users/staff`<br>4. ADMIN `PUT /api/users/<TEMP_ID>/role` `{"role":"boss"}`<br>5. ADMIN2 `PUT /api/users/<ADMIN2_ID>/role` `{"role":"technician"}`<br>6. Repeat step 5 with `<ADMIN2_ID>` in capital letters | 1: 403. 2: 200. 3: 200. 4: 400. 5: 400. 6: 400, it is the same id. ADMIN2 is still admin. [1 to 3: README s.1, s.5. 4: README s.5. 5, 6: README silent; reasonable expectation] | 6: 200, own role changed to technician (BUG-004). 1 to 5 as expected | Fail |
| TC-USR-04 | Deleting a user with linked records leaves no orphans | SEED+ | 1. ADMIN `DELETE /api/users/<INSP_USER_ID>`<br>2. ADMIN `DELETE /api/users/<TECH_USER_ID>`<br>3. ADMIN `GET /api/inspections/<HV01_INSP_ID>`<br>4. ADMIN `DELETE /api/users/<TEMP_ID>`<br>5. ADMIN2 `DELETE /api/users/<ADMIN2_ID>` | 1, 2: 409 with a reason. 3: inspector name is still shown. 4: 200. 5: 400, you cannot delete yourself. [4: README s.4. Others: README silent; reasonable expectation] | As expected (5 checks) | Pass |
| TC-USR-05 | Invalid and unknown user ids | SEED | ADMIN:<br>1. `PUT /api/users/abc/role` `{"role":"inspector"}`<br>2. `DELETE /api/users/abc`<br>3. `DELETE /api/users/000000000000000000000000` | 1, 2: 400, not 500. 3: 404. [README s.4 codes; reasonable expectation] | As expected (3 checks) | Pass |

## 8. Permissions (6)

The four codes are always in this order: **Admin / Inspector / Technician / Unauthenticated**.
Send the request as NONE, TECH and INSP before ADMIN, so the record still exists for each role.

| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-PERM-01 | Only a valid token gives access | SEED+; TEMP has logged in | 1. `GET /api/auth/me` as ADMIN, INSP, TECH, NONE<br>2. Same with the ADMIN token after changing one character in its middle part<br>3. ADMIN `DELETE /api/users/<TEMP_ID>`, then `GET /api/auth/me` with the old TEMP token<br>4. Same with an expired token (automated test: sign it with the same secret and `expiresIn: -10`) | 1: 200 / 200 / 200 / 401. 2: 401. 3: delete 200, then 401. 4: 401. [README s.4, s.5] | As expected (8 checks) | Pass |
| TC-PERM-02 | [UI] Technician does not see admin-only controls | SEED; backend and frontend running | Log in and open `http://localhost:5173/labs` as:<br>a. `tech@lab.com`, then also open `/users`<br>b. `inspector@lab.com`<br>c. `admin@lab.com`<br>d. Not logged in | a: labs are listed but no "+ Add laboratory", "Edit" or "Delete" button, no "Users" menu; `/users` goes back to `/`. b: same controls hidden. c: buttons and "Users" menu visible. d: sent to `/login`. [README s.1 role-based access in the UI] | As expected (1 check) | Pass |
| TC-PERM-03 | Only admin manages labs | SEED+ | As each role:<br>1. `POST /api/labs` `{"name":"Perm Lab","code":"PL-01","building":"Block P"}`<br>2. `PUT /api/labs/<TMP99_ID>` `{"name":"Temp Lab 2","code":"TMP-99","building":"Block T"}`<br>3. `DELETE /api/labs/<TMP99_ID>` | 1: 201 / 403 / 403 / 401. 2: 200 / 403 / 403 / 401. 3: 200 / 403 / 403 / 401. [README s.1, s.4, s.8] | As expected (15 checks) | Pass |
| TC-PERM-04 | Only admin manages templates | SEED (the Chemical template is unused) | As each role:<br>1. `POST /api/templates` `{"title":"Perm Template","items":[{"text":"A"}]}`<br>2. `PUT /api/templates/<CHEMICAL_TPL_ID>` `{"title":"Chemical v2","items":[{"text":"A"}]}`<br>3. `DELETE /api/templates/<CHEMICAL_TPL_ID>` | 1: 201 / 403 / 403 / 401. 2: 200 / 403 / 403 / 401. 3: 200 / 403 / 403 / 401. [README s.1, s.4] | As expected (15 checks) | Pass |
| TC-PERM-05 | Schedule, submit and delete inspections | SEED+ | 1. As each role: `POST /api/inspections` `{"lab":"<CN04_ID>","template":"<GENERAL_TPL_ID>"}`<br>2. `PUT /api/inspections/<CH05_INSP_ID>/submit` BODY(pass x 8) as NONE, TECH, INSP2 (not assigned), then INSP (assigned)<br>3. ADMIN `PUT /api/inspections/<INSP2_INSP_ID>/submit` BODY(pass x 8)<br>4. `DELETE /api/inspections/<CH05_INSP_ID>` as NONE, TECH, INSP, ADMIN | 1: 201 / 201 / 403 / 401. 2 and 3: 200 / 200 assigned and 403 not assigned / 403 / 401. 4: 200 / 403 / 403 / 401. [README s.1, s.4, s.5] | As expected (16 checks) | Pass |
| TC-PERM-06 | Incident triage and user management | SEED+ | As each role:<br>1. `PUT /api/incidents/<LAMP_ID>` `{"status":"investigating"}`<br>2. `DELETE /api/incidents/<LAMP_ID>`<br>3. `GET /api/users`<br>4. `POST /api/users` `{"name":"P","email":"perm@lab.com","password":"Perm@123","role":"technician"}`<br>5. `PUT /api/users/<TEMP_ID>/role` `{"role":"inspector"}`<br>6. `DELETE /api/users/<TEMP_ID>` | 1: 200 / 200 / 403 / 401. 2: 200 / 403 / 403 / 401. 3: 200 / 403 / 403 / 401. 4: 201 / 403 / 403 / 401. 5: 200 / 403 / 403 / 401. 6: 200 / 403 / 403 / 401. [README s.1, s.4] | As expected (30 checks) | Pass |

## 9. Suspected weak points and where they are tested

| Suspected weak point (from reading the code) | Checked by |
|---|---|
| All-N/A inspection becomes score 100 and risk "low" (`backend/models/Inspection.js`) | TC-INS-05 |
| Invalid id gives 500 instead of 400 | TC-LAB-05, TC-TPL-05, TC-USR-05 |
| Unknown response `_id` is ignored on submit (`inspectionController.js`) | TC-INS-07 |
| Deleting a lab or user leaves orphans (the code has a 409 guard) | TC-LAB-06, TC-USR-04 |
| Deleting a template used by scheduled inspections (no guard in `templateController.js`) | TC-TPL-04 |
| Invalid or past `scheduledDate` (no date rule in `inspectionRoutes.js`) | TC-INS-02, TC-INS-03 |
| Inspector reads another inspector's inspection by id (no owner check in `getInspection`) | TC-INS-09 |
| Malformed JSON gives 500 (`errorHandler.js` does not use the parser's status) | TC-AUTH-07 |
| `search` sent as an array (`labController.js` calls `.replace` on it) | TC-LAB-04 |
| `responses` is not an array (`submitInspection` calls `.forEach` on it) | TC-INS-08 |
| Stack trace in the error body when `NODE_ENV` is not "production" (`errorHandler.js`) | TC-LAB-07 |
| Password sent as a number on login (`bcrypt.compare` needs a string) | TC-AUTH-04 |
| `resolvedAt` is set again when a resolved incident is edited (`incidentController.js`) | TC-INC-05 |
| Self-protection compares id text, so capital letters may pass it (`userController.js`) | TC-USR-03 |

These are suspicions only. They become defects only if the tests confirm them.

## 10. Role x endpoint permission matrix (expected HTTP codes)

Each code is for a valid request on an existing record. Read from `backend/app.js`, `backend/routes/*.js` and
`backend/controllers/*.js`, and compared with the README. "protect" means a valid token is needed (else 401).
29 routes, 32 rows, because rows 17 and 20 are split by condition.

| # | Method and endpoint | Admin | Inspector | Technician | Unauthenticated | Guard in the code |
|---|---|---|---|---|---|---|
| 1 | `GET /api/health` | 200 | 200 | 200 | 200 | none (public) |
| 2 | `POST /api/auth/register` | 201 | 201 | 201 | 201 | none (public) |
| 3 | `POST /api/auth/login` | 200 | 200 | 200 | 200 | none (public) |
| 4 | `GET /api/auth/me` | 200 | 200 | 200 | 401 | protect |
| 5 | `GET /api/dashboard` | 200 | 200 | 200 | 401 | protect |
| 6 | `GET /api/labs` | 200 | 200 | 200 | 401 | protect |
| 7 | `GET /api/labs/:id` | 200 | 200 | 200 | 401 | protect |
| 8 | `POST /api/labs` | 201 | 403 | 403 | 401 | protect + authorize admin |
| 9 | `PUT /api/labs/:id` | 200 | 403 | 403 | 401 | protect + authorize admin |
| 10 | `DELETE /api/labs/:id` (no linked records) | 200 | 403 | 403 | 401 | protect + authorize admin |
| 11 | `GET /api/templates` | 200 | 200 | 200 | 401 | protect |
| 12 | `GET /api/templates/:id` | 200 | 200 | 200 | 401 | protect |
| 13 | `POST /api/templates` | 201 | 403 | 403 | 401 | protect + authorize admin |
| 14 | `PUT /api/templates/:id` | 200 | 403 | 403 | 401 | protect + authorize admin |
| 15 | `DELETE /api/templates/:id` (not in use) | 200 | 403 | 403 | 401 | protect + authorize admin |
| 16 | `GET /api/inspections` | 200 (all) | 200 (own) | 200 (completed) | 401 | protect, filter by role in `listInspections` |
| 17a | `GET /api/inspections/:id`, completed, assigned to this inspector | 200 | 200 | 200 | 401 | protect |
| 17b | `GET /api/inspections/:id`, scheduled, assigned to this inspector | 200 | 200 | 403 | 401 | protect + technician check in `getInspection` |
| 17c | `GET /api/inspections/:id`, assigned to another inspector | 200 | **403** (note 1) | 200 if completed, 403 if scheduled | 401 | protect + technician check; no owner check |
| 18 | `POST /api/inspections` | 201 | 201 (self only) | 403 | 401 | protect + authorize admin, inspector |
| 19 | `DELETE /api/inspections/:id` | 200 | 403 | 403 | 401 | protect + authorize admin |
| 20a | `PUT /api/inspections/:id/submit`, assigned to this inspector | 200 | 200 | 403 | 401 | protect + authorize admin, inspector + owner check |
| 20b | `PUT /api/inspections/:id/submit`, assigned to another inspector | 200 | 403 | 403 | 401 | protect + authorize admin, inspector + owner check |
| 21 | `GET /api/incidents` | 200 (all) | 200 (all) | 200 (own) | 401 | protect, filter by role in `listIncidents` |
| 22 | `POST /api/incidents` | 201 | 201 | 201 | 401 | protect |
| 23 | `PUT /api/incidents/:id` | 200 | 200 | 403 | 401 | protect + authorize admin, inspector |
| 24 | `DELETE /api/incidents/:id` | 200 | 403 | 403 | 401 | protect + authorize admin |
| 25 | `GET /api/users/staff` | 200 | 200 | 403 | 401 | protect + authorize admin, inspector |
| 26 | `GET /api/users` | 200 | 403 | 403 | 401 | protect + authorize admin |
| 27 | `POST /api/users` | 201 | 403 | 403 | 401 | protect + authorize admin |
| 28 | `PUT /api/users/:id/role` (another user) | 200 | 403 | 403 | 401 | protect + authorize admin |
| 29 | `DELETE /api/users/:id` (another user, no linked records) | 200 | 403 | 403 | 401 | protect + authorize admin |

**Note 1:** README section 1 says an inspector views only "own" inspections, so 403 is expected (404 is also acceptable).
README section 4 says "any" for this route, and `getInspection` has no owner check, so from reading the code it would return 200.
TC-INS-09 checks this. All the other cells match the code.

**Note 2:** There is no `GET /api/incidents/:id` route, so the matrix has no row for it.
