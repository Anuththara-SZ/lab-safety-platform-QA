# BUG-003: An inspector can read the inspection of another inspector

| Field | Value |
|---|---|
| ID | BUG-003 (observation O-03) |
| Type | Security, access control (broken object level authorization) |
| Title | `GET /api/inspections/:id` does not check the owner, so an inspector can read the inspection of another inspector |
| Requirement basis | **Documented requirement**: README section 1 line 37: "\| View inspections \| all \| own \| completed reports only \|". **The README contradicts itself**, see below |
| Severity | Moderate (read only, only for a logged-in inspector who knows the id, and nothing can be changed. It is still an access rule that does not hold) |
| Priority | Medium (the owner must first decide which README line is right) |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, Jest 30.5.2, Supertest 7.3.2, Express 4.22.3, Mongoose 8.24.5, in-memory MongoDB |
| Found in | Phase 2, API test run, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | TC-INS-09.2, DT1-15 (inspector2), DT1-16 (inspector2) (3 tests) |
| Code location | `backend/controllers/inspectionController.js:29-34`. Line 32 checks only the technician role |

## README contradiction
| Place | Text |
|---|---|
| Section 1, line 37 | "\| View inspections \| all \| own \| completed reports only \|" (admin, inspector, technician) |
| Section 4, line 125 | "\| GET \| `/api/inspections/:id` \| any \| Full inspection with responses \|" |

We follow section 1, because:
- The list route follows it: TC-INS-09.1 and DT1-14 pass. The comment in `inspectionController.js:21` also says "Inspectors only see their own assignments".
- "any" is not the full rule: a technician gets 403 for a scheduled inspection (TC-INS-09.4 and DT1-15 technician pass).

If the owner decides that "any" is right, this report is closed as "not a defect" and README line 37 must be corrected.

## Steps to reproduce
Data: demo data of `backend/seed.js`, plus a second inspector (D1) with one scheduled inspection of HV-01 (D5), see `qa/02-stlc-test-cases/test-environment.md` section 6.

1. Log in as inspector A: `POST /api/auth/login` `{"email":"inspector@lab.com","password":"Inspector@123"}`.
2. `GET /api/inspections`. The inspection of inspector B is not in the list (correct).
3. `GET /api/inspections/<id of the scheduled inspection of inspector B>` with the token of inspector A. No body.
4. Log in as inspector B: `{"email":"inspector2@lab.com","password":"Inspector2@123"}`.
5. `GET /api/inspections/<id of the CH-05 scheduled inspection of inspector A>`.
6. `GET /api/inspections/<id of the HV-01 completed inspection of inspector A>`.

## Expected result
| Step | Test | Expected |
|---|---|---|
| 3 | TC-INS-09.2 | 403 or 404, no inspection data |
| 5 | DT1-15 | 403 |
| 6 | DT1-16 | 403 |

## Actual result
All three requests get status 200 with the inspection. Copied from `phase2-known-defects.log`, shortened by us at `...`:

```
TC-INS-09.2
GET /api/inspections/6b066e23c2e3f3f0731d5975
Expected status: 403 or 404
Actual status:   200
Actual body:     {"_id":"6b066e23c2e3f3f0731d5975","lab":{...,"code":"HV-01",...},...,"inspector":{"_id":"6b066e23c2e3f3f0731d5963","name":"Second Inspector","email":"inspector2@lab.com"},"status":"scheduled","responses":[{"t

DT1-15
GET /api/inspections/6b066e23dadaa52c6643fa3f
Expected status: 403
Actual status:   200
Actual body:     {"_id":"6b066e23dadaa52c6643fa3f","lab":{...,"code":"CH-05",...},...,"inspector":{"_id":"6b066e22dadaa52c6643f9f7","name":"Nimal Perera","email":"inspector@lab.com"},...

DT1-16
GET /api/inspections/6b066e23dadaa52c6643fa13
Expected status: 403
Actual status:   200
Actual body:     {"_id":"6b066e23dadaa52c6643fa13","lab":{...,"code":"HV-01",...},...,"inspector":{"_id":"6b066e22dadaa52c6643f9f7","name":"Nimal Perera","email":"inspector@lab.com"},...
```

The test prints only the first 400 characters of a body. So the answers list is visible in the log only for TC-INS-09.2 (its start).

## Evidence
| File | What it shows |
|---|---|
| `qa/evidence/phase2-known-defects.log` lines 542-547, 560-565, 578-583 | The three failing tests |
| `qa/evidence/phase2-rerun-known-defects.log` lines 541-546, 559-564, 577-582 | Second run, same status codes |
| `qa/evidence/phase2-jest-all-first-run.log` lines 683-688, 921-926, 939-944 | First run, same status codes |
| `qa/evidence/phase2-rerun-main.log` lines 159, 161, 324-325, 331, 336, 353 | Controls that pass: own list only, technician 403 for scheduled, technician 200 for completed, other inspector 403 for submit |
| `qa/06-automation-cicd/known-defects/inspections.test.js:70-81` | The three tests |

## Cause and limits of the impact
`getInspection()` loads the record by id and only blocks the technician. `submitInspection()` does check the owner (line 67).

- The other inspector cannot submit: DT1-19 (inspector2) gets 403.
- A technician may already read a **completed** inspection (DT1-16 technician gets 200), so the main extra exposure is scheduled inspections.
- Opening the page `/inspections/<id>` in the browser as another inspector was **not tested**.

## Suggested fix (for the developers)
After the owner confirms section 1, add an owner check after line 32:

```js
if (req.user.role === 'inspector' && String(insp.inspector?._id) !== String(req.user._id))
  fail(res, 403, 'You can only view your own inspections');
```

Also correct README line 125 to "any (filtered by role)", like line 124.
