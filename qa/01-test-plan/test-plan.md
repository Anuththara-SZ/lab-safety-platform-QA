# Task 3.1: Test Plan

**Module:** EC4206 Software Testing and Quality Assurance
**Option A:** testing an existing MERN application
**System under test:** Smart Laboratory Safety Inspection Platform (git commit `fd3cd24`)
**Prepared by:** [Member 1 Name], [Member 2 Name], [Member 3 Name], [Member 4 Name] (group to fill in)
**Deadline:** 25 November 2026, 23:00

All QA work is kept in `qa/`. The application code in `backend/` and `frontend/src` is not changed.
Defects are reported, not fixed.

---

## 1. Objectives

1. Check that the platform does what `README.md` promises: login, roles, labs, templates, inspections, incidents, users.
2. Check that the score and risk level are correct, because a wrong result can make an unsafe lab look safe.
3. Check that every role (admin, inspector, technician, unauthenticated) can do only what the permission matrix allows.
4. Check that bad input gives a clear 4xx error and not a server crash (500).
5. Measure coverage, response time and code quality, and compare with the baseline.
6. Report each defect with steps, expected result, actual result and evidence.

## 2. Test items

| Item | Details | Evidence |
|---|---|---|
| Backend REST API (Node, Express, Mongoose) | 817 non-blank lines, 29 routes | Lines: `qa/evidence/phase0-baseline.log`. Routes: counted by hand from `backend/app.js` and `backend/routes/*.js` |
| Frontend (React, Vite) | 2,017 non-blank JS/JSX lines + 80 CSS lines | `qa/evidence/phase0-baseline.log` |
| Scoring logic `calculateResult()` | `backend/models/Inspection.js` | Source code |
| Access control `protect`, `authorize` | `backend/middleware/auth.js` | Source code |
| Error handling `errorHandler` | `backend/middleware/errorHandler.js` | Source code |
| Baseline | No test files and no `test` script in the original project | `qa/evidence/phase0-baseline.log` |

## 3. Scope

**In scope**
- All 29 API routes, called as admin, inspector, technician and unauthenticated user.
- Scoring and risk rules, validation, error codes, linked-record protection on delete.
- Main UI flow: login, login error, hiding of admin-only controls.
- Load test of the local API, and manual checks of two OWASP Top 10 items.
- Static measures: coverage, duplication, `npm audit`, SonarCloud.

**Out of scope**
- Changing or fixing the application.
- Testing any system that is not our own local copy.
- Mobile devices and browsers other than Chrome.
- Printed report layout and the appearance of the charts.
- MongoDB Atlas, production hosting and long-run (soak) tests.
- Features the README lists only as "next steps" (pagination, refresh tokens, photo upload, email, QR codes).

## 4. Test approach and levels

| Level / type | What we test | Technique | Tool | Output folder |
|---|---|---|---|---|
| Unit | `calculateResult()` | White-box: V(G), statement and branch coverage | Jest | `qa/04-white-box`, `qa/05-tdd-bdd` |
| Integration / API | Routes, middleware, database | Black-box: equivalence classes, boundary values, decision tables | Jest, Supertest, mongodb-memory-server | `qa/03-black-box` + `qa/06-automation-cicd` |
| System (UI) | 3 cases marked [UI] in `qa/02-stlc-test-cases/test-cases.md` | Scenario based | selenium-webdriver, headless Chrome | `qa/06-automation-cicd` |
| Acceptance (BDD) | Two user scenarios in Gherkin | Scenario based | Cucumber.js | `qa/05-tdd-bdd` |
| Performance | Login and read endpoints | Load test | JMeter | `qa/07-performance-security` |
| Security | Access control and authentication | Manual OWASP checks | curl | `qa/07-performance-security` |
| Static | Code smells, duplication, dependencies | Tool scan | SonarCloud, jscpd, `npm audit` | `qa/09-quality-metrics` |
| Regression | Full automated suite on every push | Re-run | GitHub Actions | CI workflow file |


Rule for expected results: they come from the README. Where the README says nothing, the test case says
"reasonable expectation", so the reader can see it is our judgement and not a stated requirement.

## 5. Resources

**People** (placeholders; the group must enter real names and confirm who did each part)

| Role | Planned responsibility | Person |
|---|---|---|
| Test lead | Plan, schedule, final check | [Member 1 Name] |
| Test designer | Test cases, black-box, white-box | [Member 2 Name] |
| Automation tester | Jest, Supertest, Cucumber, Selenium, CI | [Member 3 Name] |
| Performance / security tester and defect manager | JMeter, OWASP checks, defect reports, metrics | [Member 4 Name] |

**Tools:** Jest 30.5.2, Supertest 7.3.2, mongodb-memory-server 11.4.0, Cucumber 13.3.0, selenium-webdriver 4.51.0
(versions from `qa/package-lock.json`), JMeter 5.6.3, GitHub Actions, SonarCloud, jscpd, `npm audit`.
The full environment is in `qa/02-stlc-test-cases/test-environment.md`.

**AI assistance:** an AI coding assistant was used to help draft documents and tests; group to confirm and declare per the module's AI policy.

**Hardware:** one Windows 11 laptop. The client, server and database run on the same machine.

## 6. Schedule (planned order)

All phases are planned for 25 November 2026, before 23:00. Only the order is fixed here.

| Order | Phase | Main work | Main output |
|---|---|---|---|
| 1 | Setup and baseline | Install, run the app, baseline metrics | `qa/evidence/`, `qa/09-quality-metrics/baseline-metrics.md` |
| 2 | Test design | Tasks 3.1 to 3.4 | `qa/01-test-plan` to `qa/04-white-box` |
| 3 | Automation | Tasks 3.5 and 3.6: unit, API, BDD, UI, CI | `qa/05-tdd-bdd`, `qa/06-automation-cicd`, run logs |
| 4 | Performance, security and defects | Tasks 3.7 and 3.8 | `qa/07-performance-security`, `qa/08-defects` |
| 5 | Metrics and reflection | Task 3.9, compare with the baseline, lessons learned | `qa/09-quality-metrics`, reflection |
| 6 | Submission | Check links and evidence, submit | Final report |

## 7. Entry and exit criteria

**Entry (start test execution when)**
- Backend starts and `GET /api/health` returns 200.
- The database `lab_safety_qa` is seeded and the three demo accounts can log in.
- The frontend opens at http://localhost:5173.
- Test cases are written and reviewed by another group member.

**Exit (stop when)**
- All 45 test cases have an actual result and Pass / Fail, or "NOT EXECUTED" with a reason.
- Every failed test has a defect report or a row in the observations table in `qa/08-defects`.
- Backend statement coverage is measured (our own target: 80% or more, the README gives no target).
- Both OWASP checks and the load test are done, or marked "NOT EXECUTED" with steps.
- Every number in the report names its evidence file.

**Suspend and resume:** stop if the server cannot start or the seed fails. Fix the environment, re-seed, then repeat the failed group from its first test.

## 8. Deliverables

| Task | Deliverable |
|---|---|
| 3.1 | `qa/01-test-plan/test-plan.md` |
| 3.2 | `qa/02-stlc-test-cases/stlc-mapping.md`, `test-environment.md`, `test-cases.md` |
| 3.3 | `qa/03-black-box` |
| 3.4 | `qa/04-white-box` |
| 3.5, 3.6 | Automated tests, coverage report, GitHub Actions workflow |
| 3.7 | `qa/07-performance-security` |
| 3.8 | `qa/08-defects` |
| 3.9 | `qa/09-quality-metrics` |
| Evidence | `qa/evidence` |

## 9. Risks and mitigation

| # | Risk | Chance | Impact | Mitigation |
|---|---|---|---|---|
| 1 | `npm run seed` wipes the database | High | High | Use a separate database `lab_safety_qa`, passed by environment variable |
| 2 | Rate limits block tests (`/api/auth` 50, `/api` 1000 requests per 15 min per IP, `backend/app.js`) | High | High | Log in once per role and reuse the token; restart the server between groups; run TC-AUTH-08 last; count 429 separately in JMeter |
| 3 | Frontend install fails (ERESOLVE) | Happened | Medium | Use `npm ci --legacy-peer-deps`; logged as BUG-001. Evidence: `qa/evidence/phase0-frontend-npm-ci.log`, `phase0-frontend-workaround.log` |
| 4 | mongodb-memory-server cannot download its MongoDB binary | Happened (output not saved to a log) | Medium | Start it on the installed `mongod` with `MONGOMS_SYSTEM_BINARY`; CI downloads its own binary |
| 5 | Local and CI MongoDB versions are different | Medium | Low | State both versions with the results; use simple queries only |
| 6 | Docker and the Sonar scanner are not installed (`qa/evidence/phase1-sonar-availability.log`) | Happened | Medium | A group member runs SonarCloud through GitHub Actions; until then write "NOT EXECUTED" |
| 7 | README does not cover some cases (for example all N/A, past dates) | High | Medium | Mark as "reasonable expectation" and list the gaps in `stlc-mapping.md` |
| 8 | Load test runs on one laptop, so results are not production figures | High | Medium | Report as local results only, with machine details |
| 9 | Date-based tests give different results on another day | Medium | Low | Use clearly past or clearly future dates |
| 10 | Only one day is left | High | High | Test the highest risk first: access control, scoring, submit |

## 10. ISO 25010 quality attributes

Names follow the 2011 edition. The 2023 edition renamed "usability" to "interaction capability".

| Attribute | Why it matters here | How measured | Our target | Folder |
|---|---|---|---|---|
| Functional suitability | Wrong scores hide unsafe labs | Pass rate of functional test cases; boundary values and decision tables for the score | 100% executed, every failure reported | `qa/02-stlc-test-cases`, `qa/03-black-box`, `qa/04-white-box` |
| Security | Three roles and private data | Permission matrix for 4 roles; 2 OWASP checks; stack trace check; `npm audit` | No wrong cell in the matrix, or a defect is logged | `qa/02-stlc-test-cases`, `qa/07-performance-security` |
| Reliability | One bad request must not crash the API | Number of 500 responses for invalid input; orphan records after a delete; error % under load | 0 responses with 500 for client mistakes | `qa/02-stlc-test-cases`, `qa/07-performance-security` |
| Usability | Users must understand errors and see only useful controls | 3 Selenium UI cases; check that messages are clear. No user survey is planned | All 3 UI cases executed | `qa/02-stlc-test-cases` + `qa/06-automation-cicd` |
| Performance efficiency | Many students use it at the same time | JMeter: average, 95th percentile, throughput, error % | README gives no target; targets proposed by the AI assistant, to be confirmed by the group | `qa/07-performance-security` |

`npm audit` note: 1 high severity package (mongoose) reported by npm audit for the backend, exploitability not tested
(`qa/evidence/phase0-npm-audit-backend.log`). It is not counted as a confirmed vulnerability.

## 11. Verification and validation

| | Verification | Validation |
|---|---|---|
| Question | Are we building the product right? | Are we building the right product? |
| Compared with | README, design, code rules | Real needs of lab staff |
| Example 1 | Compare the README permission matrix with `authorize(...)` in `backend/routes/*.js` | Log in as a technician in the browser and check that lab work is possible but admin controls are hidden (TC-PERM-02) |
| Example 2 | V(G) and branch tests for `calculateResult()` | Cucumber scenario: an inspector fails a critical item and sees "critical" risk |
| Example 3 | Read the code: when all items are N/A the score is set to 100 | Ask: should a lab where nothing was checked be shown as 100 and "low" risk? (TC-INS-05) |
| Example 4 | SonarCloud, jscpd and `npm audit` (no need to run the app) | JMeter: is the app still quick enough when many users work at once? |
| When | From the first phase, on documents and code | After the app runs, on real screens and responses |
