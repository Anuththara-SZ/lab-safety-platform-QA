# Task 3.5: Unit tests (TDD) and BDD

## 1. How to run

Needed once (from the repo root): `npm ci` in `backend`, `npm ci` in `qa`. Then, in the `qa` folder:

| Command | What it runs |
|---|---|
| `npm test` | Unit tests (this folder) and API tests |
| `npm run test:coverage` | The same with coverage in `qa/coverage` |
| `npm run test:bdd` | The 2 Cucumber scenarios |
| `npm run test:defects` | Tests of known application problems (they fail on purpose, see section 3) |

The tests use an in-memory MongoDB. They never connect to the MongoDB service on port 27017.

## 2. What is here

| Part | Files | Real result | Log in `qa/evidence` |
|---|---|---|---|
| Unit tests of `calculateResult()` | `unit/calculateResult.test.js`: WB-CR-01 to 12, BVA-01 to 22, DT2-01 to 08. No database | 28 passed, 0 failed | `phase2-jest-coverage.log` |
| Unit checks that fail | `../06-automation-cicd/known-defects/calculateResult.test.js`: BVA-15, 17, 18, 19 | 0 passed, 4 failed | `phase2-known-defects.log` |
| BDD | `features/` (2 scenarios), `step_definitions/`, `support/hooks.js` | 2 scenarios and 16 steps passed | `phase2-bdd.log` |

Coverage of `backend/models/Inspection.js`: 100% statements, 100% branches (10 of 10).

**BDD scenarios.** The expected results come from the README, not from the code.

| Scenario | README source |
|---|---|
| Every role can log in, but only the admin can add a laboratory (admin, inspector, technician, not logged in) | Section 1 permissions matrix, section 4 |
| One failed critical item gives critical risk even when the score is 80 | Section 1 scoring and risk logic |

**Test names.** Every name starts with the id from the design documents. "(characterisation, README silent)" means: the
README does not say what is right, so the test only records what the code does now.

## 3. TDD: what we really did

The application was finished before our project started. So our unit tests are **test-after**: we wrote tests for existing
code. This is not real TDD, where the test is written first (red), then the code (green), then the code is cleaned
(refactor). We do not claim that we did red-green-refactor.

What we can show honestly is the **red** step: a test of the expected behaviour that fails today. The green step
changes application code, which our project rules do not allow, so it is only a **proposal**.

Example with TC-INS-05 (all items N/A):

| Step | What | State |
|---|---|---|
| 1. Red | `TC-INS-05.1` in `known-defects/inspections.test.js` expects "not score 100 and not low risk". Real result: `status 200, score=100, risk=low` | Done, see `phase2-known-defects.log` |
| 2. Green (proposed) | In `submitInspection()`, before `calculateResult()`: if every answer is `na`, answer 400 "At least one item must be pass or fail" | NOT EXECUTED (application code must not change) |
| 3. Check (proposed) | Run `npm run test:defects`: TC-INS-05.1 and 05.2 should pass. Run `npm test`: nothing else should break | NOT EXECUTED |
| 4. Refactor and keep (proposed) | Clean the code, then move both tests to `api/inspections.test.js` as regression tests | NOT EXECUTED |

For **BUG-004** we did try red and green for real, in a throwaway copy outside the repository: TC-USR-03.6 and the TC-USR-04.5
variation failed before the change and passed after it, and the main suite stayed at 335 passed
(`qa/evidence/phase3-bug004-fix-in-copy.log`). The repository itself was not changed.

The TC-INS-05 rule is a reasonable expectation, because the README does not define the score when all items are N/A. The owner must
agree with the rule first.
