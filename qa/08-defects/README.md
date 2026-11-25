# Task 3.8: Defect reports

## 1. Reported defects

| ID | Title | Basis | Severity | Priority | Status | Failing tests |
|---|---|---|---|---|---|---|
| [BUG-001](BUG-001-frontend-install-eresolve.md) | Frontend dependencies cannot be installed (ERESOLVE) | Documented requirement | Major | High | New | 0 (found by running the commands) |
| [BUG-002](BUG-002-all-na-scores-100-low.md) | Inspection with every item N/A is saved as 100 / low | Reasonable expectation | Major | High | New | 2 |
| [BUG-003](BUG-003-inspector-reads-other-inspection.md) | Inspector can read the inspection of another inspector | Documented requirement (the README contradicts itself, owner must rule) | Moderate | Medium | New | 3 |
| [BUG-004](BUG-004-admin-self-protection-bypass.md) | Admin can demote or delete the own account with the id in capital letters | Reasonable expectation | Moderate | Medium | New | 2 |
| [BUG-005](BUG-005-wrong-input-type-gives-500.md) | Input of the wrong type gives 500 instead of 400 | Reasonable expectation | Minor | Low | New | 6 |
| [BUG-006](BUG-006-impossible-date-saved-as-another-day.md) | A date that does not exist is saved as another day | Reasonable expectation | Minor | Medium | New | 3 |

Total failing tests in the six reports: **16 of 29**. The other 13 are in section 4, so every failing test has a record in this folder.

All six are still open in the repository, because the application files must not be changed.

**Other files:** [rca-5-whys.md](rca-5-whys.md) (BUG-002, BUG-004), [bug-lifecycle.md](bug-lifecycle.md) (BUG-004), `github-issues/` (text to paste).

## 2. Scales

| Severity | Meaning |
|---|---|
| Critical | The system cannot be used, data is lost, or a person without rights gets control |
| Major | A main function does not work, or gives a wrong result that people may trust. It can happen in normal use |
| Moderate | A rule or an access limit does not hold, but only for a special request or a special role. Main functions work |
| Minor | Bad input is not refused properly. Normal use of the web pages is not affected |

| Priority | Meaning |
|---|---|
| High | Fix first |
| Medium | Plan for the next release |
| Low | Fix when there is time |

Severity is set from the basis and the real effect together:
- A bug that only breaks a reasonable expectation is Moderate or lower. **One exception: BUG-002 is Major**, because it shows an unchecked
  lab as safe, which is the main purpose of the system. If the owner decides that all-N/A may be 100, it is not a defect.
- A bug that breaks a documented requirement can be higher, but not automatically. BUG-003 stays Moderate because the README contradicts itself.

## 3. Counts

| Count | Value |
|---|---|
| Reported defects | **6**: BUG-001 (setup) and 5 from the failing tests |
| Issues observed in total | **16**: 15 from the tests (O-01 to O-15) and BUG-001 |
| of the 15: inside the five reports | 7 (BUG-005 joins O-04, O-09 and O-10) |
| of the 15: not raised as separate bugs | 8 (section 4) |

**Defect density uses 6** (reported defects), see `qa/09-quality-metrics`. Note: BUG-001 is in `frontend/package.json`, which is not part of the counted source lines.

**How they were reproduced:** `npm run test:defects` in `qa` (29 failed, 0 passed). The five test-based bugs failed in three runs on
2026-11-25: `phase2-jest-all-first-run.log`, `phase2-known-defects.log` and `phase2-rerun-known-defects.log`. One test, TC-USR-04.5
variation, was added after the first run, so it has two runs. The tests send the same requests as the steps in the reports, but they
make the login token with a helper. Details: `qa/evidence/phase2-defect-observations.md`.

## 4. Other observations not raised as separate bugs

Real results of failing tests, but not among the six.

| ID | Observation | Basis | Failing tests | Why not among the six |
|---|---|---|---|---|
| O-02 | Rounding moves a score into a safer risk band | Documented requirement (strict reading, README line 26) | BVA-15, 17, 18, 19 (4) | The README does not mention rounding, so the owner must confirm. Needs 42 or more counted items, the demo templates have 8 and 6 |
| O-05 | Unknown response id is ignored silently on submit | Reasonable expectation | TC-INS-07 (1) | All real items are still answered and scored, the extra entry has no effect |
| O-07 | A date in the past is accepted | Reasonable expectation | TC-INS-03, BVA-29 (2) | Entering a past visit later may be wanted, the README is silent |
| O-08 | Malformed JSON gives 500 | Reasonable expectation | TC-AUTH-07 (1) | Only the status code is wrong, like BUG-005 but with another cause (`errorHandler.js:7`) |
| O-11 | Stack trace in the error body when NODE_ENV is not set | Reasonable expectation (README line 157 forbids it only in production, line 138 gives only the general error format) | TC-LAB-07b (1) | Depends on the setup. With NODE_ENV=production there is no stack (TC-LAB-07a passes) |
| O-12 | A template used by a scheduled inspection can be deleted | Reasonable expectation | TC-TPL-04.1, 04.2 (2) | The inspection keeps its own copy of the items (README line 73, TC-TPL-04.3 passes) |
| O-13 | Editing a resolved incident changes the resolved date | Reasonable expectation | TC-INC-05 (1) | The README does not say what the date means after an edit, owner must decide |
| O-15 | Dashboard shows a technician the incidents of other people | Reasonable expectation | DASH-06 (1) | All roles may see the dashboard (README line 32) and its content is not defined, owner must decide |

Two more things were seen without a test (demo passwords on the login page, red "-" for a lab that was never inspected).
They are in section 4 of the observations file and are not counted.

## 5. Suspects not reproduced

The tests for these passed (`phase2-rerun-main.log`), so they are **not** defects.

| Suspect | Test | Real result |
|---|---|---|
| Invalid ObjectId gives 500 | TC-LAB-05, TC-TPL-05, TC-USR-05, WB-SI-14 | 400 (unknown id: 404) |
| Deleting a lab or a user leaves orphans | TC-LAB-06, TC-USR-04.1 to 04.3 | 409, records kept |
| `2027-02-32` is accepted | BVA-40 | 400 |
| Remarks with only spaces are accepted | EP-31 | 400 |
| "maybe", "PASS" or 1 is accepted as a result | EP-33, EP-34, EP-35 | 400 |
| Same lab code in lower case is accepted | TC-LAB-02e | 409 |
| Technician can set the incident status when reporting | TC-INC-01 | 201, status "open" |
| Role can be chosen at registration | TC-AUTH-05 | role "technician" |
| Search text is used as a pattern | TC-LAB-03.3 | empty list |
| Inspector assigns another inspector | TC-INS-01.2, DT1-18 | 201, assigned to the sender |
| Stack trace in production | TC-LAB-07a | no stack |
| Login shows which emails exist | TC-AUTH-04a, 04b | same 401 message (text passwords) |
| Other permission cells | DT1 and TC-PERM | 153 of the 155 matrix requests as designed. The other 2 are BUG-003 |

**Suspected, not reproduced (from reading the code, no test was run):**
- The last admin can remove the last admin account with BUG-004.

**Suspected first, reproduced later in Phase 3:** login with a number as password answers 500 for a known email and 401 for an unknown one
(A07-02d/e, `qa/evidence/phase3-security-a07.log`). Added to BUG-005.

**Extra evidence from Phase 3 on a real server (curl):** BUG-003 in A01-02, BUG-004 in A01-09 (`qa/evidence/phase3-security-a01.log`).

## 6. GitHub Issues

Creating the issues: **NOT EXECUTED**. Steps for a group member:
1. Open the repository on GitHub, then **Issues > New issue**.
2. Open `github-issues/BUG-00X.md`. Copy the text after `Title:` into the title field.
3. Create the labels after `Labels:` if they do not exist, and select them.
4. Paste the rest as the body and submit. Write the issue number into the bug report and save a screenshot in `qa/evidence`.
