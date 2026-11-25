# Task 3.9: Software quality report (after testing)

Measured on 2026-11-25. Log names are files in `qa/evidence/`. The values before testing are in `baseline-metrics.md`.

## 1. Before and after

| Metric | Before | After | Evidence |
|---|---|---|---|
| Automated checks (unit + API, main suite) | 0 | 335 passed, 0 failed | `phase0-baseline.log`, `phase4-coverage.log` |
| Known-defect checks | 0 | 29, all failing (they show real problems) | `phase2-rerun-known-defects.log` |
| BDD scenarios | 0 | 2 passed (16 steps) | `phase2-rerun-bdd.log` |
| UI cases | 0 | 3 passed | `phase2-rerun-ui.log` |
| Backend statement coverage | Nothing tested | **94.3%** (447/474) | `phase4-function-coverage.log` |
| Backend branch coverage | Nothing tested | **85%** (153/180) | same |
| Backend function coverage | Nothing tested | **96.87%** (62/64) | same |
| Backend line coverage | Nothing tested | **96.94%** (413/426) | same |
| Code size | 2.689 KLOC | 2.689 KLOC (not changed) | `phase1-loc.log`, `phase4-loc.log` |

**Notes**
- Coverage is for the backend without `seed.js` and `server.js`. The frontend has no unit tests, so it has no coverage value.
- The 335 passing checks include 11 that only record what the code does today, because the README is silent. Two of them (all N/A, unknown item id) record behaviour that our known-defect checks say is wrong.
- High coverage does not mean no bugs. `calculateResult()` has 100% branch coverage and still has BUG-002.

## 2. Test case results

| | Pass | Fail | Total |
|---|---|---|---|
| Test cases (task 3.2) | 32 | 13 | 45 |

Pass rate: 32 / 45 = **71.1%**. Evidence: `phase5-fill-results.log`.

## 3. Where coverage is missing

From `phase4-coverage.log`:

| File | Branch % | Lines not fully covered |
|---|---|---|
| `config/db.js` | 0 | 1-6 (tests use their own connection) |
| `models/User.js` | 50 | 15 |
| `utils/sort.js` | 66.66 | 3, 5 |
| `controllers/dashboardController.js` | 75 | 48 |
| `controllers/templateController.js` | 75 | 23, 33 |
| `controllers/incidentController.js` | 77.77 | 29-30, 46-47 |

## 4. Defect density

Formula: defect density = defects / KLOC

| Count used | Calculation | Result |
|---|---|---|
| **Reported defects (BUG-001 to BUG-006)** | 6 / 2.689 | **2.23 per KLOC** |
| Without BUG-001 (it is in `package.json`, not in the counted lines) | 5 / 2.689 | 1.86 per KLOC |
| Backend only (BUG-002 to BUG-006) | 5 / 0.697 | 7.17 per KLOC |
| All observed issues (15 from tests + BUG-001) | 16 / 2.689 | 5.95 per KLOC |

Evidence: `phase4-defect-density.log`, `phase4-loc.log`. KLOC has no blank lines, comments, CSS or `seed.js`.
We tested the backend much more than the frontend, so the frontend may have defects we did not find. Extra observations from the security checks (3.7) are not counted.

## 5. SonarQube / SonarCloud

Docker and the scanner are not installed here (`phase1-sonar-availability.log`). The scan is ready for SonarCloud through
GitHub Actions: follow `sonarcloud-steps.md`, then fill in this table.

| Metric | Value |
|---|---|
| Bugs | NOT EXECUTED |
| Vulnerabilities | NOT EXECUTED |
| Code smells | NOT EXECUTED |
| Duplication % | NOT EXECUTED |
| Technical debt | NOT EXECUTED |
| Coverage % shown in Sonar | NOT EXECUTED |

**Values we could measure without Sonar**

| Metric | Value | Evidence |
|---|---|---|
| Duplicated lines (jscpd, a different method) | javascript 4.92%, jsx 4.86% | `phase1-jscpd.log` |
| Reported by npm audit, exploitability not tested | backend: 1 high (mongoose). frontend: 1 high (follow-redirects) | `phase0-npm-audit-backend.log`, `phase1-npm-audit-frontend.log` |

## 6. Three improvements we propose

| # | Improvement | Why (our evidence) | How to check it |
|---|---|---|---|
| 1 | Validate input types and dates on every route with express-validator (`responses` is a list, `search` and `password` are text, `scheduledDate` is a real date), and let `errorHandler.js` use the parser's status code | BUG-005, BUG-006 and observation O-08 all come from missing checks | Their checks in `npm run test:defects` pass |
| 2 | Write the missing rules in the README and then fix the code: score when nothing was checked, who may read an inspection, and id comparison with `ObjectId.equals()` | BUG-002, BUG-003, BUG-004. The README is silent or contradicts itself | TC-INS-05, TC-INS-09 and TC-USR-03 pass |
| 3 | Make the build reliable: fix the Vite conflict, review the two `npm audit` findings, and keep `qa.yml` running on every push | BUG-001. The original project had no tests or CI | `npm ci` works without `--legacy-peer-deps` |
