# Task 3.4 (b): Test Design for Statement and Branch Coverage

Node numbers, path names (CR-P1, SI-P1, FE-P1 ...) and line numbers are the same as in
`cyclomatic-complexity.md`.
Status: filled on 2026-11-25. Source: `qa/evidence/phase5-rerun-main.log`, `phase5-rerun-known-defects.log` and `phase2-rerun-ui.log`, filled in by `qa/02-stlc-test-cases/fill-results.js`. "Recorded" means the README does not define the case and the test only records what the code does today.

| Test group | Function | Jest file |
|---|---|---|
| WB-CR-xx | `calculateResult()` in `backend/models/Inspection.js` | `qa/05-tdd-bdd/unit/calculateResult.test.js` |
| WB-SI-xx | `submitInspection()` in `backend/controllers/inspectionController.js` | `qa/06-automation-cicd/api/inspections.test.js` |

The name of each Jest test starts with the WB id, so every case here can be found in the Jest output.

- **Statement coverage:** every statement runs at least once.
- **Branch coverage:** every decision gives both true and false at least once.

---

## 1. `calculateResult()` test cases

**Preconditions (all cases):** a new `Inspection` document in memory. No database is needed.
**Steps (all cases):** 1) put the items in `responses`; 2) call `calculateResult()`; 3) read `score` and `riskLevel`.
Items are non-critical unless "critical" is written.

| ID | Description | Input | Path | Expected Result | Actual Result | Status | Jest test |
|---|---|---|---|---|---|---|---|
| WB-CR-01 | All items N/A | 5 na | CR-P1 | Score 100, low (code behaviour, not defined in README, suspect: see DT2-01) | Current behaviour recorded, as in the code (README silent) | Recorded | `WB-CR-01 all N/A` |
| WB-CR-02 | A critical item fails | 3 pass, 1 critical fail | CR-P2 | Score 75, critical | As expected (1 check) | Pass | `WB-CR-02 critical item fails` |
| WB-CR-03 | Score below 60 | 1 pass, 1 fail | CR-P3 | Score 50, high | As expected (1 check) | Pass | `WB-CR-03 score below 60` |
| WB-CR-04 | Score between 60 and 79 | 7 pass, 3 fail | CR-P4 | Score 70, medium | As expected (1 check) | Pass | `WB-CR-04 score 60 to 79` |
| WB-CR-05 | Score 80 or more | 9 pass, 1 fail | CR-P5 | Score 90, low | As expected (1 check) | Pass | `WB-CR-05 score 80 or more` |
| WB-CR-06 | Critical item passes, normal item fails, score exactly 80 | 3 pass, 1 critical pass, 1 fail | CR-P5 | Score 80, low | As expected (1 check) | Pass | `WB-CR-06 critical item passes` |
| WB-CR-07 | Line 36 limit, true side | 59 pass, 41 fail | CR-P3 | Score 59, high | As expected (1 check) | Pass | `WB-CR-07 score 59` |
| WB-CR-08 | Line 36 limit, false side | 3 pass, 2 fail | CR-P4 | Score 60, medium | As expected (1 check) | Pass | `WB-CR-08 score 60` |
| WB-CR-09 | Line 37 limit, true side | 79 pass, 21 fail | CR-P4 | Score 79, medium | As expected (1 check) | Pass | `WB-CR-09 score 79` |
| WB-CR-10 | N/A and pending are ignored | 3 pass, 1 fail, 2 na, 1 pending | CR-P4 | Score 75, medium | As expected (1 check) | Pass | `WB-CR-10 na and pending ignored` |
| WB-CR-11 | Empty list (a template needs at least one item, so this is a method-level test only) | no items | CR-P1 | Score 100, low (code behaviour, not defined in README) | Current behaviour recorded, as in the code (README silent) | Recorded | `WB-CR-11 empty responses` |
| WB-CR-12 | Critical wins over a high score | 9 pass, 1 critical fail | CR-P2 | Score 90, critical | As expected (1 check) | Pass | `WB-CR-12 critical wins over high score` |

### 1.1 Branch coverage matrix

X = the test makes the decision give this result.

| Test | 33 true | 33 false | 35 true | 35 false | 36 true | 36 false | 37 true | 37 false |
|---|---|---|---|---|---|---|---|---|
| WB-CR-01 | X | | | X | | X | | X |
| WB-CR-02 | | X | X | | | | | |
| WB-CR-03 | | X | | X | X | | | |
| WB-CR-04 | | X | | X | | X | X | |
| WB-CR-05 | | X | | X | | X | | X |
| WB-CR-06 | | X | | X | | X | | X |
| WB-CR-07 | | X | | X | X | | | |
| WB-CR-08 | | X | | X | | X | X | |
| WB-CR-09 | | X | | X | | X | X | |
| WB-CR-10 | | X | | X | | X | X | |
| WB-CR-11 | X | | | X | | X | | X |
| WB-CR-12 | | X | X | | | | | |

Conditions inside line 34 (`r.result === 'fail' && r.critical`):

| Left side | Right side | Tests |
|---|---|---|
| false | not checked | WB-CR-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12 |
| true | false | WB-CR-03, 04, 05, 06, 07, 08, 09, 10 |
| true | true | WB-CR-02, 12 |

WB-CR-11 has no items, so the condition on line 34 never runs there.

### 1.2 Statement coverage matrix

| Statements | Tests |
|---|---|
| Lines 30 to 34 | All |
| Line 35, `riskLevel = 'critical'` | WB-CR-02, 12 |
| Line 36, `riskLevel = 'high'` | WB-CR-03, 07 |
| Line 37, `riskLevel = 'medium'` | WB-CR-04, 08, 09, 10 |
| Line 38, `riskLevel = 'low'` | WB-CR-01, 05, 06, 11 |

**Smallest sets:** WB-CR-02 to 05 (4 tests) are enough for all statements. WB-CR-01 to 05 (5 tests, equal to
V(G)) are enough for all branches. The other tests check limits and conditions.

---

## 2. `submitInspection()` test cases

**Preconditions (all cases, unless changed in the table):**
- Users: admin, inspector A (assigned), inspector B (not assigned), technician.
- One lab. One template with 3 items: I1 is **critical**, I2 and I3 are not critical.
- A fresh **scheduled** inspection assigned to inspector A.

**Steps (all cases):** send `PUT /api/inspections/:id/submit` as the given user with the given body, then check
the HTTP code, the message and the saved data.

| ID | Description | User | Input | Path | Expected Result | Actual Result | Status | Jest test |
|---|---|---|---|---|---|---|---|---|
| WB-SI-01 | Inspection does not exist | Inspector A | valid ObjectId that is not in the database | SI-P1 | 404 "Inspection not found" | As expected (1 check) | Pass | `WB-SI-01 inspection not found` |
| WB-SI-02 | Already completed | Inspector A | submit correctly once, then submit again | SI-P2 | Second call: 400 "Inspection already completed" | As expected (1 check) | Pass | `WB-SI-02 already completed` |
| WB-SI-03 | Not the assigned inspector | Inspector B | I1, I2, I3 pass | SI-P3 | 403 "Only the assigned inspector can submit this inspection" | As expected (1 check) | Pass | `WB-SI-03 not assigned inspector` |
| WB-SI-04 | One item not answered | Inspector A | I1, I2 pass, I3 not sent | SI-P4, FE-P1 | 400 "Answer every checklist item before submitting" | As expected (1 check) | Pass | `WB-SI-04 item still pending` |
| WB-SI-05 | Failed item without remarks | Inspector A | I1, I3 pass, I2 fail with no remarks | SI-P5, FE-P1 | 400, message has the text of I2 | As expected (1 check) | Pass | `WB-SI-05 failed item without remarks` |
| WB-SI-06 | Success with pass, fail and N/A | Inspector A | I1 pass, I2 fail with remarks, I3 na, and a summary | SI-P6, FE-P1 | 200, status completed, completedDate set, score 50, risk high, summary saved, lab `lastScore` 50 and `lastInspectionDate` set | As expected (1 check) | Pass | `WB-SI-06 successful submit` |
| WB-SI-07 | Admin who is not assigned can submit | Admin | I1, I2, I3 pass | SI-P6, FE-P1 | 200, score 100, risk low | As expected (1 check) | Pass | `WB-SI-07 admin can submit` |
| WB-SI-08 | Value not in the allowed list is ignored | Inspector A | I1 "maybe", I2, I3 pass | SI-P4, FE-P1, FE-P2 | 400 "Answer every checklist item before submitting" | As expected (1 check) | Pass | `WB-SI-08 invalid result value` |
| WB-SI-09 | Unknown item id is ignored | Inspector A | I1, I2, I3 pass, plus an unknown ObjectId | SI-P6, FE-P1, FE-P2 | 200, inspection still has 3 items (code behaviour, not defined in README) | Current behaviour recorded, as in the code (README silent) | Recorded | `WB-SI-09 unknown item id` |
| WB-SI-10 | No `responses` key in the body | Inspector A | `{}` | SI-P4 | 400 "Answer every checklist item before submitting" | As expected (1 check) | Pass | `WB-SI-10 responses missing` |
| WB-SI-11 | Critical item fails | Inspector A | I1 fail with remarks, I2, I3 pass | SI-P6, FE-P1 | 200, score 67, risk critical | As expected (1 check) | Pass | `WB-SI-11 critical item fails` |
| WB-SI-12 | Refused submit saves nothing | Inspector A | same as WB-SI-05, then read the inspection | SI-P5, FE-P1 | 400, then the inspection is still scheduled and all items are pending | As expected (1 check) | Pass | `WB-SI-12 rejected submit saves nothing` |
| WB-SI-13 | `responses` is not a list | Inspector A | `"responses": "pass"` | Error in N9 (not drawn) | 400. From code reading: TypeError, 500. **Suspect**, see EP-39 | 500 "answers.forEach is not a function" (BUG-005) | Fail | `WB-SI-13 responses not an array` |
| WB-SI-14 | Bad format of id | Inspector A | id = `abc` | Error in N2 (not drawn) | 400 "Invalid _id" | As expected (1 check) | Pass | `WB-SI-14 malformed id` |
| WB-SI-15 | Technician is blocked | Technician | I1, I2, I3 pass | Not reached, stopped by `authorize` | 403 | As expected (1 check) | Pass | `WB-SI-15 technician blocked` |
| WB-SI-16 | No token | Nobody | I1, I2, I3 pass | Not reached, stopped by `protect` | 401 | As expected (1 check) | Pass | `WB-SI-16 unauthenticated blocked` |

WB-SI-15 and WB-SI-16 do not add coverage to `submitInspection()`. They complete the role check (admin,
inspector, technician, unauthenticated).

### 2.1 Branch coverage matrix

| Test | 65 T | 65 F | 66 T | 66 F | 67 T | 67 F | 73 T | 73 F | 78 T | 78 F | 80 T | 80 F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WB-SI-01 | X | | | | | | | | | | | |
| WB-SI-02 (second call) | | X | X | | | | | | | | | |
| WB-SI-03 | | X | | X | X | | | | | | | |
| WB-SI-04 | | X | | X | | X | X | | X | | | |
| WB-SI-05 | | X | | X | | X | X | | | X | X | |
| WB-SI-06 | | X | | X | | X | X | | | X | | X |
| WB-SI-07 | | X | | X | | X | X | | | X | | X |
| WB-SI-08 | | X | | X | | X | X | X | X | | | |
| WB-SI-09 | | X | | X | | X | X | X | | X | | X |
| WB-SI-10 | | X | | X | | X | | | X | | | |
| WB-SI-11 | | X | | X | | X | X | | | X | | X |
| WB-SI-12 | | X | | X | | X | X | | | X | X | |
| WB-SI-13 | | X | | X | | X | | | | | | |
| WB-SI-14 | | | | | | | | | | | | |
| WB-SI-15 | | | | | | | | | | | | |
| WB-SI-16 | | | | | | | | | | | | |

Conditions with `&&` and `||`:

| Line | Condition | Outcome | Tests |
|---|---|---|---|
| 67 | not admin AND not assigned | admin, right side not checked | WB-SI-07 |
| 67 | | not admin, but assigned | WB-SI-02 (first call), 04, 05, 06, 08, 09, 10, 11, 12, 13 |
| 67 | | not admin and not assigned | WB-SI-03 |
| 70 | `responses` OR empty list | `responses` used | WB-SI-04 to 09, 11, 12, 13 |
| 70 | | empty list used | WB-SI-10 |
| 73 | item found AND result allowed | item not found | WB-SI-09 |
| 73 | | item found, result not allowed | WB-SI-08 |
| 73 | | both true | WB-SI-04 to 09, 11, 12 |
| 75 | `remarks` OR empty text | remarks used | WB-SI-06, 11 |
| 75 | | empty text used | WB-SI-04 to 09, 11, 12 |
| 79 | failed AND no remarks | not failed | WB-SI-05, 06, 07, 09, 11, 12 |
| 79 | | failed, remarks present | WB-SI-06, 11 |
| 79 | | failed, no remarks | WB-SI-05, 12 |

### 2.2 Statement coverage matrix

| Statements | Tests |
|---|---|
| Line 64 | WB-SI-01 to 14 |
| Line 65, fail 404 | WB-SI-01 |
| Line 66, fail 400 | WB-SI-02 |
| Line 68, fail 403 | WB-SI-03 |
| Lines 70 to 71 | WB-SI-04 to 13 |
| Lines 72 to 73 | WB-SI-04 to 09, 11, 12 |
| Lines 74 to 75 | WB-SI-04 to 09, 11, 12 |
| Line 78, fail 400 | WB-SI-04, 08, 10 |
| Line 79 | WB-SI-05, 06, 07, 09, 11, 12 |
| Line 80, fail 400 | WB-SI-05, 12 |
| Lines 82 to 89 | WB-SI-06, 07, 09, 11 |

The first call of WB-SI-02 is only preparation. It also runs the success path, like WB-SI-06.

**Smallest sets:**
- WB-SI-01 to 06 (6 tests, equal to V(G)) are enough for all statements.
- WB-SI-01 to 06 plus WB-SI-08 are enough for both sides of every `if`. WB-SI-08 is needed for line 73 false.
- Adding WB-SI-10 also covers the empty list on line 70, and WB-SI-07 and WB-SI-09 complete the conditions on
  lines 67 and 73.

Jest also counts each side of `&&` and `||` as a branch. By hand we count **10** branches in
`calculateResult()` (line 33: 2, line 34: 2, lines 35, 36, 37: 2 each) and **22** in `submitInspection()`
(six `if`: 12, five `&&` or `||`: 10). The real Jest report gives the same numbers (section 3).

---

## 3. Coverage results

| Function | Line coverage | Branch coverage |
|---|---|---|
| `calculateResult()` | 10/10 (100%) | 10/10 (100%) |
| `submitInspection()` | 22/22 (100%) | 22/22 (100%) |

Source: `qa/evidence/phase4-function-coverage.log`, made by `qa/09-quality-metrics/function-coverage.js` from the Jest LCOV file. LCOV counts
executed **lines**, so line coverage is shown instead of statement coverage. The branch numbers match our hand count (10 and 22).

Jest reports coverage per file. `inspectionController.js` also has other functions, so its file percentage is
not the same as the percentage of `submitInspection()` alone. Use the uncovered line numbers in the report:
lines 29 to 39 in `Inspection.js` and lines 63 to 90 in `inspectionController.js` should not be listed.

## 4. Summary

| Group | Cases |
|---|---|
| WB-CR (`calculateResult`) | 12 |
| WB-SI (`submitInspection`) | 16 |
| **Total** | **28** |
