# EC4206 STQA Group Project: index

**System under test:** Lab Safety Inspection Platform (Option A, existing MERN project). The application source was not changed.
**Group members and task allocation:** see the table in [HUMAN-TODO.md](HUMAN-TODO.md) (to be filled in by the group).

## 1. Task list and files

| Task | What | File |
|---|---|---|
| 3.1 | Test plan, ISO 25010, verification and validation | [test-plan.md](01-test-plan/test-plan.md) |
| 3.2 | STLC phases mapped to this project | [stlc-mapping.md](02-stlc-test-cases/stlc-mapping.md) |
| 3.2 | 45 test cases with results, role and endpoint matrix | [test-cases.md](02-stlc-test-cases/test-cases.md) |
| 3.2 | Test environment | [test-environment.md](02-stlc-test-cases/test-environment.md) |
| 3.3 | Equivalence partitioning | [equivalence-partitioning.md](03-black-box/equivalence-partitioning.md) |
| 3.3 | Boundary value analysis | [boundary-value-analysis.md](03-black-box/boundary-value-analysis.md) |
| 3.3 | Decision tables | [decision-tables.md](03-black-box/decision-tables.md) |
| 3.4 | Cyclomatic complexity and control-flow graphs | [cyclomatic-complexity.md](04-white-box/cyclomatic-complexity.md) |
| 3.4 | Statement and branch coverage design, mapped to Jest | [coverage-test-design.md](04-white-box/coverage-test-design.md) |
| 3.5 | Unit tests, TDD notes, 2 Cucumber scenarios | [05-tdd-bdd](05-tdd-bdd/README.md) |
| 3.6 | API automation, 3 Selenium cases, known-defect tests | [06-automation-cicd](06-automation-cicd/README.md) |
| 3.6 | GitHub Actions workflow | [qa.yml](../.github/workflows/qa.yml) |
| 3.7 | JMeter plan and load test report | [load-test.jmx](07-performance-security/load-test.jmx), [load-test-report.md](07-performance-security/load-test-report.md) |
| 3.7 | OWASP A01 and A07 checks | [security-checks.md](07-performance-security/security-checks.md) |
| 3.8 | Defect index and 6 bug reports | [08-defects](08-defects/README.md) |
| 3.8 | 5-Whys root cause analysis | [rca-5-whys.md](08-defects/rca-5-whys.md) |
| 3.8 | Bug life cycle (simulated, with a real fix test in a copy) | [bug-lifecycle.md](08-defects/bug-lifecycle.md) |
| 3.8 | Text for GitHub Issues | [github-issues](08-defects/github-issues/) |
| 3.9 | Quality report, defect density, improvements | [quality-report.md](09-quality-metrics/quality-report.md) |
| 3.9 | Baseline before testing | [baseline-metrics.md](09-quality-metrics/baseline-metrics.md) |
| 3.9 | SonarCloud settings and steps | [sonar-project.properties](09-quality-metrics/sonar-project.properties), [sonarcloud-steps.md](09-quality-metrics/sonarcloud-steps.md) |
| 3.10 | Reflection | [reflection.md](10-reflection/reflection.md) |
| All | Logs and screenshots | [evidence](evidence/) |
| All | Work that only a person can do | [HUMAN-TODO.md](HUMAN-TODO.md) |

## 2. Results in short (2026-11-25)

| Item | Result | Evidence in `qa/evidence` |
|---|---|---|
| Test cases (3.2) | 32 pass, 13 fail, 45 in total | `phase5-fill-results.log` |
| Main automated suite | 335 passed, 0 failed | `phase4-coverage.log` |
| Known-defect checks | 29 failing, on purpose not hidden | `phase2-rerun-known-defects.log` |
| BDD / UI | 2 scenarios passed / 3 cases passed | `phase2-rerun-bdd.log`, `phase2-rerun-ui.log` |
| Backend coverage | Statements 94.3%, branches 85% | `phase4-function-coverage.log` |
| Defects | 6 reported. 2.23 per KLOC | `phase4-defect-density.log` |
| GitHub Actions run | NOT EXECUTED | - |
| SonarCloud scan | NOT EXECUTED | - |

Why the main suite has 0 failures: checks that fail because of the application are kept in a separate suite. The first run of
everything together was 335 passed and 28 failed (`phase2-jest-all-first-run.log`); one more check was added to the known-defects suite later.

## 3. How to run

```bash
cd backend  && npm ci && cd ..
cd frontend && npm ci --legacy-peer-deps && cd ..   # BUG-001
cd qa       && npm ci
npm run test:coverage   # unit + API
npm run test:bdd        # Cucumber
npm run test:ui         # Selenium, headless Chrome
npm run test:defects    # fails until the application is fixed
cd .. && node qa/consistency-check.js   # report and documents against the logs
```

Make the submission file, from the repo root: `bash qa/submission.sh`

Local file paths and tokens in the evidence logs were masked (`<home>`, `<user>`, `<repo>`), and one wording about the load-test targets was corrected. Results were not changed.
