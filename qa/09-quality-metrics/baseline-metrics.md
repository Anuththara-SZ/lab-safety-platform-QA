# Task 3.9: Baseline metrics (before our tests)

Measured on 2026-11-25. Every value names the log it came from, inside `qa/evidence/`.

## 1. Tests and coverage

| Metric | Baseline value | Evidence |
|---|---|---|
| Test files in the original project | 0 | `phase0-baseline.log` |
| `test` script in backend / frontend `package.json` | None | `phase0-baseline.log` |
| Backend coverage | 0 tests ran. Jest printed 0% with an empty file list | `phase1-baseline-coverage.log` |

Note: with no test files, Jest did not load the source files, so its 0% row only tells us that
nothing was tested. The useful coverage figure is the one measured after Phase 2.

## 2. Size (KLOC)

| Part | Files | Non-blank lines | Code lines (no comments) |
|---|---|---|---|
| backend (without `seed.js`) | 27 | 714 | 697 |
| backend/seed.js | 1 | 103 | 100 |
| frontend/src (JS/JSX) | 19 | 2,017 | 1,992 |
| frontend/src CSS | 1 | 80 | not used |

Evidence: `phase1-loc.log` (made by `count-loc.js`); CSS from `phase0-baseline.log`.

**KLOC used for defect density = (697 + 1,992) / 1000 = 2.689 KLOC.**
`seed.js` is left out because it only loads demo data. CSS is left out because it is not program logic.

## 3. Duplication (jscpd, not SonarQube)

| Part | Duplicated lines | Evidence |
|---|---|---|
| backend and frontend, rows per format | javascript 4.92%, jsx 4.86% | `phase1-jscpd.log` |

Note: jscpd reads each `.jsx` file once as JSX and again as JavaScript, so its "Total" row counts
those files twice. We do not use that row. Most clones are between `Login.jsx` and `Register.jsx`,
and between `Incidents.jsx` and `Inspections.jsx`. SonarQube uses a different method, so its
percentage may not match.

## 4. npm audit

| Part | Reported by npm audit | Evidence |
|---|---|---|
| backend | 1 high severity package (mongoose) | `phase0-npm-audit-backend.log` |
| frontend | 1 high severity package (follow-redirects) | `phase1-npm-audit-frontend.log` |

These are **reported by npm audit, exploitability not tested**. We do not count them as confirmed
vulnerabilities or as defects.

## 5. Build

Frontend `npm ci` fails with ERESOLVE (`phase0-frontend-npm-ci.log`). Logged as BUG-001.

## 6. SonarQube / SonarCloud values

Docker and the Sonar scanner are not installed on the test machine
(`phase1-sonar-availability.log`). The scan is prepared for SonarCloud; see `sonarcloud-steps.md`.

| Metric | Value |
|---|---|
| Bugs | NOT EXECUTED |
| Vulnerabilities | NOT EXECUTED |
| Code smells | NOT EXECUTED |
| Duplication % (Sonar) | NOT EXECUTED |
| Technical debt | NOT EXECUTED |
| Coverage % in Sonar | NOT EXECUTED |

## 7. Defect density

See section 4 of `quality-report.md`.
