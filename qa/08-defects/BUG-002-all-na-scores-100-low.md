# BUG-002: An inspection with every item N/A is saved as score 100 and risk "low"

| Field | Value |
|---|---|
| ID | BUG-002 (observation O-01) |
| Type | Functional, scoring rule |
| Title | An inspection where every item is N/A gets score 100 and risk "low", and the lab gets `lastScore` 100 |
| Requirement basis | **Reasonable expectation.** README section 1 line 25: "`score = passed / (passed + failed) x 100` (N/A items are ignored)". With only N/A items this is 0 / 0, so the README does not define the result. We expect that a lab where nothing was checked is not shown as safe |
| Severity | Major (the main job of the system is to show how safe a lab is, and here an unchecked lab looks perfect. Not Critical: the inspector must choose N/A for every item, and nothing crashes or is lost) |
| Priority | High (wrong safety information, small change). The owner must first confirm the rule |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, Jest 30.5.2, Supertest 7.3.2, Express 4.22.3, Mongoose 8.24.5, in-memory MongoDB |
| Found in | Phase 2, API test run, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | TC-INS-05.1, TC-INS-05.2 (2 tests) |
| Code location | `backend/models/Inspection.js:33` (score) and `:38` (risk), `backend/controllers/inspectionController.js:78` (N/A accepted for every item) and `:88` (score copied to the lab) |

## Steps to reproduce
Data: demo data of `backend/seed.js`. Lab CH-05 (hazard level high) has one scheduled inspection with 8 items. Items 1, 2 and 4 are critical.

1. Log in as the assigned inspector: `POST /api/auth/login` `{"email":"inspector@lab.com","password":"Inspector@123"}`.
2. `GET /api/inspections` and copy the id of the scheduled inspection of CH-05.
3. `GET /api/inspections/<id>` and copy the `_id` of the 8 items in `responses`.
4. `PUT /api/inspections/<id>/submit` with all 8 answers "na":
   ```json
   {"summary":"QA run","responses":[{"_id":"<item 1 id>","result":"na","remarks":""}, "... the same for items 2 to 8"]}
   ```
5. `GET /api/labs/<CH-05 id>`.

## Expected result
- Step 4: status 400, or status 200 without score 100 and without risk "low".
- Step 5: `lastScore` is not 100.

## Actual result
Copied from `phase2-known-defects.log`:

```
TC-INS-05.1
Expected pattern: not /score=100|risk=low/
Received string:      "status 200, score=100, risk=low"

TC-INS-05.2
Expected: not "lastScore=100"
```

For TC-INS-05.2 Jest prints only the value that must not appear. The test failed, so the value was `lastScore=100`.

## Evidence
| File | What it shows |
|---|---|
| `qa/evidence/phase2-known-defects.log` lines 429-454 | Both tests fail, values above |
| `qa/evidence/phase2-rerun-known-defects.log` lines 428-449 | Second run, same values |
| `qa/evidence/phase2-jest-all-first-run.log` lines 578-600 | First run, same values |
| `qa/evidence/phase2-rerun-main.log` lines 7, 17, 37 | WB-CR-01, WB-CR-11 and DT2-08 pass. They record that the code gives 100 / low for "all N/A", for no items, and for a critical item marked N/A |
| `qa/06-automation-cicd/known-defects/inspections.test.js:32-47` | The two tests |

## Cause
`Inspection.js:33` is `this.score = total === 0 ? 100 : ...`. When no item is pass or fail, `total` is 0, the score becomes 100, and line 38 sets risk "low". `submitInspection()` line 88 then copies the score to the lab. The full 5 Whys are in `rca-5-whys.md`.

From reading the code only, **not tested**:
- The dashboard average and score trend use the saved score (`dashboardController.js:17` and `:20-24`).
- The lab leaves the "overdue" list, because `lastInspectionDate` is set (`inspectionController.js:88`, `dashboardController.js:25-28`).
- The web page also allows this, because N/A counts as an answer (`InspectionDetail.jsx:39` and `:159`).

## Suggested fix (for the developers)
The owner must choose and write the rule in the README:
- **Option A:** in `submitInspection()`, before line 85, answer 400 "At least one item must be pass or fail" when every answer is N/A.
- **Option B:** save no score and a risk level "not assessed", and do not change `lastScore` of the lab.

Then TC-INS-05.1 and 05.2 should pass. With option B, WB-CR-01 and WB-CR-11 must be changed too.
