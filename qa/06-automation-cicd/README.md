# Task 3.6: Test automation and CI

## 1. How to run

Install once, from the repo root:

```bash
cd backend  && npm ci && cd ..
cd frontend && npm ci --legacy-peer-deps && cd ..   # flag needed because of BUG-001
cd qa       && npm ci
```

Then run in the `qa` folder:

| Command | What it runs | Expected exit code |
|---|---|---|
| `npm test` / `npm run test:coverage` | Unit and API tests (with coverage) | 0 |
| `npm run test:defects` | Known defects | 1 until the application is fixed |
| `npm run test:bdd` | Cucumber | 0 |
| `npm run test:ui` | Selenium, headless Chrome. Ports 5000 and 5173 must be free | 0 |

All tests use an in-memory MongoDB. On Windows the installed `mongod.exe` is started as a separate temporary process,
so nothing is downloaded. The MongoDB service on port 27017 is never used.

## 2. Folders

| Folder | Content |
|---|---|
| `helpers/` | `testApp.js` (database, demo data, tokens), `http.js` (requests), `inspections.js`, `lcovReporter.js` |
| `api/` | API tests with Supertest |
| `known-defects/` | Tests of the correct behaviour that fail because of the application. Own Jest settings, no skip |
| `ui/` | `run-ui.js` starts database, backend and frontend, runs `ui.test.js`, and stops everything again |

**Demo data:** the real `backend/seed.js` runs on the in-memory database only. **Tokens** are signed by the helper, because
the application allows only 50 calls to `/api/auth` in 15 minutes. This limit stays active and is tested (TC-AUTH-08).

## 3. Real results (2026-11-25, Windows 11, Node v24.14.0)

| Suite | Passed | Failed | Log in `qa/evidence` |
|---|---|---|---|
| First run of all unit and API tests, before moving anything | 335 | 28 | `phase2-jest-all-first-run.log` |
| Main suite: unit 28 + API 307 | 335 | 0 | `phase2-jest-coverage.log` |
| Known defects (28 moved + 1 added) | 0 | 29 | `phase2-known-defects.log` |
| BDD scenarios | 2 | 0 | `phase2-bdd.log` |
| UI cases TC-AUTH-01, TC-AUTH-02, TC-PERM-02 | 3 | 0 | `phase2-ui.log`, `ui-*.png` |

| API test file | Tests | Covers |
|---|---|---|
| `auth.test.js` | 26 | TC-AUTH-03 to 06, EP-01 to 16, BVA-23 to 25 |
| `rateLimit.test.js` | 2 | TC-AUTH-08 |
| `labs.test.js` | 28 | TC-LAB, EP-17 to 26, BVA-26 to 28 |
| `templates.test.js` | 10 | TC-TPL |
| `inspections.test.js` | 47 | TC-INS, WB-SI, EP-27 to 42, BVA-30 to 40 |
| `incidents.test.js` | 12 | TC-INC |
| `users.test.js` | 16 | TC-USR |
| `permissions.test.js` | 161 | DT1-01 to 29 for all roles, TC-PERM-01, 03 to 06 |
| `dashboard.test.js` | 5 | DASH-01 to 05 (not in the design documents) |

Every one of the 45 TC, 28 WB, 42 EP, 40 BVA, 29 DT1 and 8 DT2 ids has at least one test in the logs.
Details of every failing check: `qa/evidence/phase2-defect-observations.md`.

**Coverage of backend** (without `seed.js` and `server.js`, main suite only):

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 94.3% (447/474) | 85% (153/180) | 96.87% (62/64) | 96.94% (413/426) |

`calculateResult()` and `submitInspection()` have no uncovered line or branch (10 of 10 and 22 of 22 branches in
`qa/coverage/lcov.info`). `config/db.js` is 0%, because it connects to a real database and no test loads it.

## 4. Moving a test out of known-defects
When the application is fixed and the test passes, move it to the matching file in `api/` (or `05-tdd-bdd/unit/`).
For DT1-15 and DT1-16, write 403 in place of `null` in `permissions.test.js`.

## 5. CI: `.github/workflows/qa.yml`

Runs on every push and pull request: install, unit and API tests with coverage, BDD, UI, known defects, SonarCloud
(only with `SONAR_TOKEN`), and uploads coverage and screenshots.

- The runner is fixed to `ubuntu-24.04`, the newest Ubuntu that MongoDB 8.2 binaries exist for.
- "Known defects (expected to fail until the app is fixed)" may fail without failing the build (`continue-on-error`).
- The frontend needs `--legacy-peer-deps` (BUG-001).

Status on GitHub: **NOT EXECUTED**. Locally we only parsed the YAML and checked that every `npm run` command exists.
To run it, a group member does:

1. `git add qa .github`, commit and push to GitHub.
2. Open the repository, **Actions > QA**, and wait for the run.
3. Save screenshots of the run and of the artifact `qa-reports` in `qa/evidence`.
