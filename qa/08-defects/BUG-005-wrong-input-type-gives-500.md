# BUG-005: Input of the wrong type gives status 500 instead of 400

| Field | Value |
|---|---|
| ID | BUG-005 (observations O-04, O-09 and O-10, one report because the cause is the same kind: the type is not checked) |
| Type | Error handling / input validation |
| Title | Wrong type in `responses` (submit), `search` (labs) and `password` (login) gives 500 |
| Requirement basis | **Reasonable expectation.** README section 4 line 138 says only: "Errors are returned as `{ "message": "..." }` with proper status codes (400, 401, 403, 404, 409, 500)". It does not name these cases. A wrong request should be 400 (client error), not 500 (server error) |
| Severity | Minor (only the status code and message are wrong. The app answered the next requests, and two of the three requests need a login) |
| Priority | Low (only special API requests, not normal use of the web pages) |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, Jest 30.5.2, Supertest 7.3.2, Express 4.22.3, Mongoose 8.24.5, in-memory MongoDB, NODE_ENV=test |
| Found in | Phase 2, API test run, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | TC-INS-08a, TC-INS-08b, TC-INS-08c / EP-40, WB-SI-13 / EP-39, TC-LAB-04, TC-AUTH-04c (6 tests) |
| Code location | `backend/controllers/inspectionController.js:70-72`, `backend/controllers/labController.js:17`, `backend/controllers/authController.js:29` (with `backend/models/User.js:21`) |

## Steps to reproduce
Data: demo data of `backend/seed.js`. The submit requests use the scheduled inspection of CH-05 and the token of its assigned inspector. WB-SI-13 uses its own small test data.

| # | Test | Who | Request | Body |
|---|---|---|---|---|
| 1 | TC-INS-08a | assigned inspector | `PUT /api/inspections/<id>/submit` | `{"responses":"abc"}` |
| 2 | TC-INS-08b | assigned inspector | `PUT /api/inspections/<id>/submit` | `{"responses":{"x":1}}` |
| 3 | TC-INS-08c / EP-40 | assigned inspector | `PUT /api/inspections/<id>/submit` | `{"responses":[null]}` |
| 4 | WB-SI-13 / EP-39 | assigned inspector | `PUT /api/inspections/<id>/submit` | `{"responses":"pass"}` |
| 5 | TC-LAB-04 | technician | `GET /api/labs?search[]=x` (curl needs `-g`) | none |
| 6 | TC-AUTH-04c | nobody logged in | `POST /api/auth/login` | `{"email":"admin@lab.com","password":123456}` |
| 7 | A07-03b (curl) | nobody logged in | `POST /api/auth/login` | `{"email":"admin@lab.com","password":{"$ne":null}}`. No login was possible, only the wrong status code |

## Expected result
Requests 1 to 4: 400. Request 5: 200 or 400. Requests 6 and 7: 400 or 401. Never 500.

## Actual result
Requests 1 to 6 are copied from `phase2-known-defects.log`, request 7 from `phase3-security-a07.log`:

| # | Actual status | Actual body |
|---|---|---|
| 1 | 500 | `{"message":"answers.forEach is not a function"}` |
| 2 | 500 | `{"message":"answers.forEach is not a function"}` |
| 3 | 500 | `{"message":"Cannot read properties of null (reading '_id')"}` |
| 4 | 500 | `{"message":"answers.forEach is not a function"}` |
| 5 | 500 | `{"message":"req.query.search.replace is not a function"}` |
| 6 | 500 | `{"message":"Illegal arguments: number, string"}` |
| 7 | 500 | `Illegal arguments: object, string`, no token (`qa/evidence/phase3-security-a07.log`) |

In requests 1 to 6 the log adds: `(the body also has a "stack" field)`. The stack field is a separate observation (O-11).

## Evidence
| File | What it shows |
|---|---|
| `qa/evidence/phase2-known-defects.log` lines 80-85, 124-129, 488-493, 506-511, 524-529, 596-601 | The six failing tests |
| `qa/evidence/phase2-rerun-known-defects.log` lines 119-124, 159-164, 487-492, 505-510, 523-528, 595-600 | Second run, same messages |
| `qa/evidence/phase2-jest-all-first-run.log` lines 261-266, 378-383, 629-634, 647-652, 665-670, 701-706 | First run, same messages |
| `qa/06-automation-cicd/known-defects/` `inspections.test.js:58-65` and `:84-89`, `labs.test.js:9-11`, `auth.test.js:9-11` | The tests |

## Impact
- **Server keeps running:** after the 500 the same app object answered the next tests with normal codes (for example TC-LAB-07b got 404 after TC-LAB-04, and TC-INS-09.2 got 200 after TC-INS-08c). This was the app in the test process, not a separate server.
- **Login needed:** submit needs an admin or the assigned inspector (the owner check on line 67 comes first), and the lab list needs any login. The login request needs no login.
- **Saved data:** from reading the code, the error comes before `insp.save()` (line 86), so nothing should be saved. The tests stop at the status code, so no log shows the database after the error.
- `{"responses":null}` was not sent. From the code (line 70) it is treated as an empty list.

- **Shows which emails exist (reproduced in Phase 3):** with a number as password, a known email gives 500 and an unknown email gives 401
  (checks A07-02d and A07-02e, `qa/evidence/phase3-security-a07.log` lines 221-290). The cause is `authController.js:29`: the password is only
  compared when the email exists. With text passwords both answers are the same 401. Severity stays Minor, because registration already
  answers 409 "Email already registered" for a known email (check A07-02c), so this shows nothing that registration does not show.

## Suggested fix (for the developers)
Check the type in the routes with express-validator, which the project already uses:
- `inspectionRoutes.js:17`, after `authorize`: `body('responses').optional().isArray()`, `body('responses.*').isObject()` and `validate`.
- `labRoutes.js:17`: `query('search').optional().isString()` and `validate`.
- `authRoutes.js:19`: `body('password').isString()`. The same rule for register (line 12) would also change EP-15, which records that a number is accepted there.
