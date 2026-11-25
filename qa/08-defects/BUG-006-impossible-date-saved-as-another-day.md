# BUG-006: A date that does not exist is saved as another day

| Field | Value |
|---|---|
| ID | BUG-006 (observation O-06) |
| Type | Input validation / data quality |
| Title | `POST /api/inspections` accepts an impossible `scheduledDate` (for example 2027-02-30) and saves another day without an error |
| Requirement basis | **Reasonable expectation.** README section 5 line 156 says only: "Input validation with **express-validator** + Mongoose schema validation". It does not name this case. An impossible date should be refused and not changed silently |
| Severity | Minor (the saved day is 1 or 2 days wrong and only direct API requests were affected in our tests. A browser date picker normally does not offer such a day) |
| Priority | Medium (wrong data is saved with no error, and one validation rule fixes it) |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, Jest 30.5.2, Supertest 7.3.2, Express 4.22.3, Mongoose 8.24.5, in-memory MongoDB |
| Found in | Phase 2, API test run, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | TC-INS-02b, BVA-36, BVA-39 (3 tests) |
| Code location | `backend/routes/inspectionRoutes.js:13` (no rule for `scheduledDate`), `backend/controllers/inspectionController.js:56` (value passed on unchanged), `backend/models/Inspection.js:17` (converted to a Date) |

## Steps to reproduce
Data: demo data of `backend/seed.js`.

1. Log in as admin: `POST /api/auth/login` `{"email":"admin@lab.com","password":"Admin@123"}`.
2. `GET /api/labs` and copy the id of CN-04. `GET /api/templates` and copy the id of "General Laboratory Safety Checklist".
3. `POST /api/inspections` `{"lab":"<CN-04 id>","template":"<template id>","scheduledDate":"2027-02-30"}`.
4. Repeat step 3 with `"2027-02-29"` (2027 is not a leap year) and `"2028-02-30"`.

## Expected result
Status 400 each time, and no inspection is saved.

## Actual result
Copied from `phase2-known-defects.log`:

| Test | Sent | Status | `savedInspections` | `savedDate` |
|---|---|---|---|---|
| TC-INS-02b | `2027-02-30` | 201 | 1 | `2027-03-02T00:00:00.000Z` |
| BVA-36 | `2027-02-29` | 201 | 1 | `2027-03-01T00:00:00.000Z` |
| BVA-39 | `2028-02-30` | 201 | 1 | `2028-03-01T00:00:00.000Z` |

## Evidence
| File | What it shows |
|---|---|
| `qa/evidence/phase2-known-defects.log` lines 294-309, 321-336, 348-363 | The three failing tests with the saved dates |
| `qa/evidence/phase2-rerun-known-defects.log` lines 293-308, 320-335, 347-362 | Second run, same values |
| `qa/evidence/phase2-jest-all-first-run.log` lines 488-493, 506-511, 524-529 | First run: 201 for the same dates (the saved date is not visible in this log) |
| `qa/evidence/phase2-rerun-main.log` lines 141, 142, 148 | Controls that pass: "not a date" 400, `2027-02-32` 400, valid leap day `2028-02-29` accepted |
| `qa/06-automation-cicd/known-defects/inspections.test.js:14-29` | The tests |

## Cause
The route checks only `lab` and `template`. Mongoose changes the text to a date with `new Date(...)`
(`node_modules/mongoose/lib/cast/date.js:30`) and refuses it only when the result is not a date. Our tests show that
day 29 or 30 of February moves to March, but day 32 is refused.

**Limits of the impact:** there is no route to edit the date (`inspectionRoutes.js:8-18`), so a wrong date can only be
corrected by deleting the inspection (admin) and scheduling it again. The web page uses `<input type="date">`
(`Inspections.jsx:160`). We did not test this in the browser.

## Suggested fix (for the developers)
Add a rule to `inspectionRoutes.js:13`:

```js
body('scheduledDate').optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage('Invalid date')
```

`strict: true` also checks that the day exists in the month (`node_modules/validator/lib/isISO8601.js`, read by us).
A date in the past (O-07) is a separate question for the owner.
