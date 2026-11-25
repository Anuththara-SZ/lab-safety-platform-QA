# Task 3.2: STLC Mapping

This page shows how each phase of the Software Testing Life Cycle (STLC) is done in this project.
State on 2026-11-25. The evidence for each state is in the deliverable named in the same row.

## 1. STLC phases

| # | STLC phase | What we do in this project | Entry criteria | Exit criteria | Deliverable | State |
|---|---|---|---|---|---|---|
| 1 | Requirement analysis | Read `README.md`, the backend routes, controllers, models and middleware, and the main frontend pages. List the requirements and the unclear points | Source code and README are available | Each requirement has an id; unclear points are listed | This file, sections 2 and 3 | Written |
| 2 | Test planning | Scope, levels, tools, roles, risks, ISO 25010 targets, order of work | Requirements are listed | Plan is complete and checked by a group member | `qa/01-test-plan/test-plan.md` | Written, group review pending |
| 3 | Test case design | 45 test cases, permission matrix, black-box and white-box design | Test plan is ready | Every in-scope requirement has at least one case | `qa/02-stlc-test-cases/test-cases.md`, `qa/03-black-box`, `qa/04-white-box` | Written: 45 cases, 42 EP, 40 BVA, 2 decision tables, 28 white-box cases |
| 4 | Test environment setup | Install tools, separate database, seed data, baseline measures, build check | Tool list from the plan | Health check is 200, demo logins work, frontend opens | `qa/02-stlc-test-cases/test-environment.md`, `qa/evidence/phase0-*.log` | Done, logs saved |
| 5 | Test execution | Run the automated tests, UI cases, load test and security checks. Fill in actual results. Report defects and re-run in CI | Environment is ready; cases are reviewed | Every case has Pass / Fail or "NOT EXECUTED" with a reason; every failure has a defect report or an observations row | `qa/05-tdd-bdd`, `qa/06-automation-cicd`, `qa/07-performance-security`, `qa/08-defects`, `qa/evidence` | Run locally: 32 pass, 13 fail. The CI run in GitHub Actions is NOT EXECUTED until a group member pushes |
| 6 | Test cycle closure | Compare coverage and quality with the baseline, defect density, lessons learned | Execution is finished | Report is complete and every number has an evidence file | `qa/09-quality-metrics`, `qa/10-reflection` | Written. SonarCloud values are NOT EXECUTED (`sonarcloud-steps.md`) |

Environment setup (phase 4) was started before test design, because a baseline is needed before any new tests are added.

## 2. Requirements and traceability

| Req | Requirement (README section) | Test cases |
|---|---|---|
| R1 | Register, login, hashed password, JWT, deleted user loses access (s.1, s.5) | TC-AUTH-01 to 06, TC-PERM-01, TC-USR-01 |
| R2 | Stricter rate limit on `/auth` (s.5) | TC-AUTH-08 |
| R3 | Roles enforced in the API and the UI (s.1) | TC-PERM-01 to 06, TC-AUTH-05 |
| R4 | Labs: CRUD, search, hazard filter (s.1) | TC-LAB-01 to 06 |
| R5 | Checklist templates, critical items, copies in inspections (s.1, s.2) | TC-TPL-01 to 05 |
| R6 | Schedule an inspection; inspector for self only (s.1) | TC-INS-01 to 03, TC-PERM-05 |
| R7 | Score and risk level (s.1) | TC-INS-04, TC-INS-05, plus `qa/03-black-box` and `qa/04-white-box` |
| R8 | Submit rules: own only, remarks for failed items (s.1, s.8) | TC-INS-06 to 08, TC-PERM-05 |
| R9 | View inspections by role (s.1) | TC-INS-09 |
| R10 | Incidents: report, triage, resolution, own list for technician (s.1, s.4) | TC-INC-01 to 05, TC-PERM-06 |
| R11 | User management by admin (s.1) | TC-USR-01 to 05, TC-PERM-06 |
| R12 | Errors as `{ "message": "..." }` with proper codes, no stack trace in production (s.4, s.5) | TC-AUTH-04, TC-AUTH-07, TC-LAB-04, TC-LAB-05, TC-LAB-07, TC-INS-08, TC-USR-05 |
| R13 | Dashboard figures and charts (s.1) | Only opened in TC-AUTH-01 and listed in the permission matrix. The figures are **not checked** in these 45 cases |
| R14 | Printable report (s.1) | Out of scope (see test plan) |
| R15 | Security headers and CORS (s.5) | **Not covered** in these 45 cases. Can be added to the manual security checks |

## 3. Unclear points and what we assumed

| # | Unclear point | What the code does (from reading it) | Our assumption for testing |
|---|---|---|---|
| G1 | README s.1 says an inspector views "own" inspections, but s.4 says "any" for `GET /api/inspections/:id` | List is filtered, get-by-id has no owner check | s.1 is the rule, so 403 is expected (TC-INS-09) |
| G2 | Score when every item is N/A: the formula gives 0/0 | Score 100, risk "low" | Must not be 100 / "low" (TC-INS-05) |
| G3 | Rules for `scheduledDate` | Any value that can be read as a date is accepted | Invalid and past dates should be rejected (TC-INS-02, TC-INS-03) |
| G4 | Deleting a template that is in use | Deleted without a check | Should be refused like labs and users (TC-TPL-04) |
| G5 | Deleting labs and users with linked records | Refused with 409 | 409 is correct (TC-LAB-06, TC-USR-04) |
| G6 | Rounding of the score is not mentioned | Rounds first, then picks the risk level, so 79.5 becomes 80 and "low" | Studied in `qa/03-black-box`; here we use whole scores |
| G7 | Error format: s.4 says only `message`, s.5 says no stack trace "in production" | `stack` is added unless `NODE_ENV` is "production"; `.env.example` does not set it | `stack` should not be shown in either case (TC-LAB-07) |
| G8 | Resolved date when a resolved incident is edited, and whether a resolution text is required | Date is set again each time status "resolved" is sent; text is optional | Date should stay (TC-INC-05). Text rule not tested |
| G9 | Can a technician read templates? The README API table says any role; the UI hides the page | API returns 200, UI sends the technician back to `/` | 200 from the API is expected (matrix rows 11, 12) |
| G10 | Scheduling for an inactive or closed lab | UI lists only active labs, API does not check | Not tested in these 45 cases |
| G11 | Password rules | At least 6 characters (`authRoutes.js`) | 6 is used as the boundary (TC-AUTH-06) |
