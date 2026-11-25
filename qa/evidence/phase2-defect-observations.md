# Phase 2: observations from failing tests (input for Phase 3)

Source of every value below: `qa/evidence/phase2-known-defects.log` (29 tests, 29 failed, 0 passed, 2026-11-25).
Raw first run of all tests, before anything was moved: `phase2-jest-all-first-run.log` (363 tests: 335 passed, 28 failed).
The 28 failed tests were moved to `qa/06-automation-cicd/known-defects`. One more was added there afterwards (O-14).
No severity is given here; that is decided in Phase 3. These are observations, not yet confirmed defects.

**Basis** = what the failing check breaks:
- **Documented requirement**: the README says it. Section and line are quoted.
- **Reasonable expectation**: the README is silent about this case. A general README sentence is quoted if it helps.

Test data: demo data of `backend/seed.js` plus D1 to D5 (`qa/02-stlc-test-cases/test-environment.md`), in an in-memory database.
`<id>` = an id that is different in every run.

## 1. Failing checks

### O-01 All items N/A is reported as 100 and low
| Test | Request | Expected | Actual (real run) |
|---|---|---|---|
| TC-INS-05.1 | `PUT /api/inspections/<CH-05>/submit`, 8 answers "na", as assigned inspector | Not score 100 and not low risk | `status 200, score=100, risk=low` |
| TC-INS-05.2 | then `GET /api/labs/<CH-05>` | `lastScore` is not 100 | `lastScore=100` |

Basis: **Reasonable expectation.** README s.1 line 25 `score = passed / (passed + failed) x 100` gives 0 / 0, so it is not defined.
Code: `backend/models/Inspection.js:33`. Also seen on method level: WB-CR-01 and WB-CR-11 (characterisation).

### O-02 Rounding moves a score into a safer risk band
| Test | Input (no critical items) | Expected risk | Actual |
|---|---|---|---|
| BVA-15 | 119 pass, 81 fail (59.5) | high | `medium` |
| BVA-17 | 159 pass, 41 fail (79.5) | medium | `low` |
| BVA-18 | 25 pass, 17 fail (59.52) | high | `medium` |
| BVA-19 | 35 pass, 9 fail (79.55) | medium | `low` |

Basis: **Documented requirement (strict reading).** README s.1 line 26: "else **high** (<60%), **medium** (<80%), **low** (>=80%)".
The README does not mention rounding, so the owner must confirm the rule. Code: `Inspection.js:33` rounds before the comparison.
Needs at least 42 counted items (60 limit) or 44 (80 limit), see the BVA document.

### O-03 Inspector can read the inspection of another inspector
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-INS-09.2 | Nimal Perera: `GET /api/inspections/<scheduled, of Second Inspector>` | 403 or 404 | 200, `"inspector":{..."name":"Second Inspector","email":"inspector2@lab.com"},"status":"scheduled","responses":[...` |
| DT1-15 | Second Inspector: `GET /api/inspections/<CH-05 scheduled, of Nimal Perera>` | 403 | 200 (the log shows only the first 400 characters of the body) |
| DT1-16 | Second Inspector: `GET /api/inspections/<HV-01 completed, of Nimal Perera>` | 403 | 200 (first 400 characters) |

Basis: **Documented requirement.** README s.1 line 37: "| View inspections | all | own | completed reports only |".
**README contradiction:** s.4 line 125 says "| GET | `/api/inspections/:id` | any | Full inspection with responses |".
We followed s.1, like the design documents. The list route does follow "own" (TC-INS-09.1 and DT1-14 pass).
Code: `inspectionController.js:29-34` checks only the technician role.

### O-04 Wrong type in `responses` gives 500
| Test | Body of `PUT /api/inspections/<id>/submit` | Expected | Actual |
|---|---|---|---|
| TC-INS-08a | `{"responses":"abc"}` | 400 | 500 `{"message":"answers.forEach is not a function"}` |
| TC-INS-08b | `{"responses":{"x":1}}` | 400 | 500 `{"message":"answers.forEach is not a function"}` |
| TC-INS-08c / EP-40 | `{"responses":[null]}` | 400 | 500 `{"message":"Cannot read properties of null (reading '_id')"}` |
| WB-SI-13 / EP-39 | `{"responses":"pass"}` | 400 | 500 `{"message":"answers.forEach is not a function"}` |

Basis: **Reasonable expectation.** README s.4 line 138 only says "proper status codes (400, 401, 403, 404, 409, 500)".
Whether the inspection stays "scheduled" was not shown by these runs, because the test stops at the status check. Code: `inspectionController.js:70-72`.

### O-05 Unknown response id is ignored silently
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-INS-07 | submit 8 "pass" plus `{"_id":"000000000000000000000000","result":"fail","remarks":"ghost"}` | 400, inspection stays "scheduled" | status 200, inspection "completed", score 100 |

Basis: **Reasonable expectation.** README silent. The same behaviour is characterised by WB-SI-09 (= EP-41).
Code: `inspectionController.js:72-73`.

### O-06 A date that does not exist is saved as another day
| Test | `scheduledDate` sent in `POST /api/inspections` | Expected | Actual |
|---|---|---|---|
| TC-INS-02b | `2027-02-30` | 400, nothing saved | 201, saved as `2027-03-02T00:00:00.000Z` |
| BVA-36 | `2027-02-29` | 400, nothing saved | 201, saved as `2027-03-01T00:00:00.000Z` |
| BVA-39 | `2028-02-30` | 400, nothing saved | 201, saved as `2028-03-01T00:00:00.000Z` |

Basis: **Reasonable expectation.** README s.5 line 156 only says "Input validation with **express-validator** + Mongoose schema validation".
Code: `inspectionRoutes.js` has no rule for `scheduledDate`.

### O-07 A date in the past is accepted
| Test | `scheduledDate` | Expected | Actual |
|---|---|---|---|
| TC-INS-03 | `2020-01-01` | 400, nothing saved | 201, saved as `2020-01-01T00:00:00.000Z` |
| BVA-29 | yesterday (`2026-11-24`) | 400 (expectation of TC-INS-03; the BVA document says "Not specified") | 201, saved as `2026-11-24T00:00:00.000Z` |

Basis: **Reasonable expectation.** README silent.

### O-08 Malformed JSON gives 500
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-AUTH-07 | `POST /api/auth/login`, raw body `{"email":"admin@lab.com",` | 400 | 500 `{"message":"Expected double-quoted property name in JSON at position 25 (line 1 column 26)"}` |

Basis: **Reasonable expectation.** README s.4 line 138 only says "proper status codes". Code: `errorHandler.js:7` does not use the status of the parser error.

### O-09 Password sent as a number gives 500
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-AUTH-04c | `POST /api/auth/login` `{"email":"admin@lab.com","password":123456}` | 400 or 401 | 500 `{"message":"Illegal arguments: number, string"}` |

Basis: **Reasonable expectation.** README s.4 line 138 as in O-08. Code: `authController.js:29`.

### O-10 Search sent as an array gives 500
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-LAB-04 | technician: `GET /api/labs?search[]=x` | 200 or 400 | 500 `{"message":"req.query.search.replace is not a function"}` |

Basis: **Reasonable expectation.** README s.4 line 138 as in O-08. Code: `labController.js:17`.

### O-11 Stack trace in the error body when NODE_ENV is not set
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-LAB-07b | NODE_ENV not set (README s.3 setup): `GET /api/labs/000000000000000000000000` | 404, body has only `message` | 404, body has `message` and `stack` |

Basis: **Documented requirement.** README s.4 line 138: "Errors are returned as `{ "message": "..." }`".
**README is not consistent:** s.5 line 157 promises "no stack traces in production" only, and `.env.example` does not set NODE_ENV.
With `NODE_ENV=production` there is no stack (TC-LAB-07a passes). Code: `errorHandler.js:23`.

### O-12 A template used by a scheduled inspection can be deleted
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-TPL-04.1 | admin: `DELETE /api/templates/<General, used by CH-05>` | 409 | 200 `{"message":"Template deleted"}` |
| TC-TPL-04.2 | then `GET` the same template | 200 | 404 `{"message":"Template not found"}` |

Basis: **Reasonable expectation.** README silent (labs and users do have a 409 rule in the code).
TC-TPL-04.3 passes: the inspection still opens with its 8 items, because items are copied. Code: `templateController.js:31-35`.

### O-13 Editing a resolved incident changes the resolved date
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-INC-05 | admin: `PUT /api/incidents/<burn>` `{"status":"resolved","severity":"low","resolution":"Stand is now required"}` | `resolvedAt` stays `2026-11-22T05:12:03.170Z` | 200, `resolvedAt` is now `2026-11-25T05:12:03.798Z` |

Basis: **Reasonable expectation.** README silent. Code: `incidentController.js:36`.

### O-14 "Not on yourself" rule can be avoided with the id in capital letters
| Test | Request | Expected | Actual |
|---|---|---|---|
| TC-USR-03.6 | Second Admin: `PUT /api/users/6B066E233FA2A6F95E8A399D/role` `{"role":"technician"}` (own id in capitals) | 400 | 200 `{"_id":"6b066e233fa2a6f95e8a399d","name":"Second Admin","email":"admin2@lab.com","role":"technician",...}` |
| TC-USR-04.5 variation | Second Admin: `DELETE /api/users/6B066E233FA2A6F95E8A399D` (own id in capitals) | 400 | 200 `{"message":"User deleted"}` |

Basis: **Reasonable expectation.** README silent. With the normal id the rule works (TC-USR-03.5 and 04.5 pass).
The second row is not in the design documents; it was added after TC-USR-03.6 failed. Code: `userController.js:24` and `:37`.

### O-15 Dashboard shows a technician the incidents of other people
| Test | Request | Expected | Actual |
|---|---|---|---|
| DASH-06 | technician: `GET /api/dashboard` (an inspector reported an open incident) | `recentIncidents` does not show it | `["Reported by the inspector", "Capacitor bank discharge spark", "Damaged earth-leakage warning lamp"]` |

Basis: **Reasonable expectation.** Not in the design documents; found while testing the dashboard. The README does not say what
`recentIncidents` may show. Related text: s.4 line 129 "`/api/incidents` ... any (technician: own)" and line 118
"`/api/dashboard` | any | Aggregated statistics". Code: `dashboardController.js:31`.

## 2. Suspects that did NOT reproduce

| Suspect | Test | Real result |
|---|---|---|
| Invalid id gives 500 | TC-LAB-05, TC-TPL-05, TC-USR-05, WB-SI-14 | 400 (unknown id: 404) |
| Deleting a lab or a user leaves orphans | TC-LAB-06, TC-USR-04.1 to 04.3 | 409, records kept |
| `2027-02-32` accepted | BVA-40 | 400 |
| Remarks with only spaces accepted | EP-31 | 400 |
| Values "maybe", "PASS", 1 accepted as a result | EP-33, EP-34, EP-35 | 400. The message is general and does not name the bad value (WB-SI-08) |
| Same lab code in lower case accepted | TC-LAB-02e | 409 |
| Technician can set the incident status when reporting | TC-INC-01 | 201, status "open" |
| Role can be chosen at registration | TC-AUTH-05 | role "technician" |
| Search text used as a pattern | TC-LAB-03.3 | empty list |
| Inspector assigns another inspector | TC-INS-01.2, DT1-18 | 201, assigned to the sender |
| Stack trace in production | TC-LAB-07a | no stack |
| Login shows which emails exist | TC-AUTH-04a, 04b | same 401 message |
| Other permission cells | DT1 and TC-PERM (153 of the 155 matrix requests) | all as designed, refused requests changed nothing in the database |

## 3. README silent, behaviour only recorded (characterisation tests pass, owner must decide)

| Test | Recorded behaviour |
|---|---|
| WB-CR-01, WB-CR-11 | All N/A or no items: score 100, low (see O-01) |
| WB-SI-09 (= EP-41) | Unknown item id is ignored, 200 (see O-05) |
| DT2-08 | Critical item marked N/A without remarks: still 100, low |
| EP-09 | `a.b+lab@gmail.com` counts as `ab@gmail.com`: 409 |
| EP-14 | Password of 8 spaces accepted: 201 |
| EP-15 | Password sent as a number accepted at registration: 201 (login with a number gives 500, O-09) |
| EP-16 | 100-character password: login works when only the first 72 characters are correct |
| EP-26 | Lab capacity 1000000 accepted |
| EP-42 | Same item answered twice: the last answer is used |
| BVA-34 | Empty `scheduledDate`: the time of the request is used |

## 4. Seen while running, no test
- The login page code (`frontend/src/pages/Login.jsx`) contains the three demo emails and passwords and shows them as
  "Quick demo login" buttons, also in the production build (`ui-TC-AUTH-02-wrong-password.png`).
- A lab that was never inspected shows its "-" score in red, the same colour as a bad score
  (CH-05 in `ui-TC-PERM-02-admin.png`; `scoreColor` in `frontend/src/components/ui.jsx`).
