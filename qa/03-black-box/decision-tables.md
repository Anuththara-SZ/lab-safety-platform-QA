# Task 3.3 (c): Decision Tables

System under test: Lab Safety Inspection Platform (backend REST API)
Status: filled on 2026-11-25. Source: `qa/evidence/phase5-rerun-main.log`, `phase5-rerun-known-defects.log` and `phase2-rerun-ui.log`, filled in by `qa/02-stlc-test-cases/fill-results.js`. "Recorded" means the README does not define the case and the test only records what the code does today.

- **DT1** tests who is allowed to do what (role x action).
- **DT2** tests how the risk level is chosen.

In the tables: **Y** = condition is true, **N** = condition is false, **-** = does not matter.

---

## DT1: Role x action permissions

Sources: permissions matrix in `README.md` (sections 1 and 4), `backend/middleware/auth.js`
(`protect`, `authorize`), files in `backend/routes/`, `backend/controllers/inspectionController.js`.

### DT1-A: General rule for every protected route

| | R1 | R2 | R3 |
|---|---|---|---|
| C1: a valid Bearer token is sent | N | Y | Y |
| C2: the role is in the allowed list of the route | - | N | Y |
| **Action** | **401** | **403** | **Continue to validation and controller** |

`protect` runs before `authorize`, and `authorize` runs before the input checks. So a technician who sends a
bad body to an admin route should get 403, not 400.

### DT1-B: Rule for `PUT /api/inspections/:id/submit`

The order of the conditions is the order in the code (`submitInspection`, lines 64 to 80).

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| C1: valid token | N | Y | Y | Y | Y | Y | Y |
| C2: role is admin or inspector | - | N | Y | Y | Y | Y | Y |
| C3: inspection exists | - | - | N | Y | Y | Y | Y |
| C4: inspection is not completed yet | - | - | - | N | Y | Y | Y |
| C5: user is admin or the assigned inspector | - | - | - | - | N | Y | Y |
| C6: all items answered, failed items have remarks | - | - | - | - | - | N | Y |
| **Expected HTTP code** | **401** | **403** | **404** | **400** | **403** | **400** | **200** |
| Actual Result | 401 | 403 | 404 | 400 | 403 | 400 | 200 |
| Status | Pass (WB-SI-16) | Pass (WB-SI-15) | Pass (WB-SI-01) | Pass (WB-SI-02) | Pass (WB-SI-03) | Pass (WB-SI-04, 05) | Pass (WB-SI-06) |

Note: C4 is checked before C5. From code reading, an inspector who is not assigned and who tries to submit a
**completed** inspection gets 400 and not 403.

### DT1-C: Full matrix

Columns: **Insp-A** = inspector assigned to the inspection, **Insp-N** = inspector not assigned to it.
For routes that are not about inspections, the two inspectors should give the same result.
Valid input is used, so the code shows only the permission decision. Each cell is one check (29 x 5 = 145).

| ID | Action | Route | Admin | Insp-A | Insp-N | Technician | No token | Note | Status |
|---|---|---|---|---|---|---|---|---|---|
| DT1-01 | Health check | `GET /api/health` | 200 | 200 | 200 | 200 | 200 | Public | Pass (5 cells) |
| DT1-02 | Register | `POST /api/auth/register` | 201 | 201 | 201 | 201 | 201 | Public, token is not checked | Pass (5 cells) |
| DT1-03 | Log in | `POST /api/auth/login` | 200 | 200 | 200 | 200 | 200 | Public, with correct email and password | Pass (5 cells) |
| DT1-04 | See own profile | `GET /api/auth/me` | 200 | 200 | 200 | 200 | 401 | | Pass (5 cells) |
| DT1-05 | View dashboard | `GET /api/dashboard` | 200 | 200 | 200 | 200 | 401 | | Pass (5 cells) |
| DT1-06 | View labs | `GET /api/labs`, `GET /api/labs/:id` | 200 | 200 | 200 | 200 | 401 | | Pass (10 cells) |
| DT1-07 | Create lab | `POST /api/labs` | 201 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-08 | Edit lab | `PUT /api/labs/:id` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-09 | Delete lab | `DELETE /api/labs/:id` | 200 | 403 | 403 | 403 | 401 | Admin gets 409 if the lab has inspections or incidents | Pass (5 cells) |
| DT1-10 | View templates | `GET /api/templates`, `GET /api/templates/:id` | 200 | 200 | 200 | 200 | 401 | | Pass (10 cells) |
| DT1-11 | Create template | `POST /api/templates` | 201 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-12 | Edit template | `PUT /api/templates/:id` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-13 | Delete template | `DELETE /api/templates/:id` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-14 | List inspections | `GET /api/inspections` | 200 all | 200 own only | 200 own only, this one is not in the list | 200 completed only | 401 | Check the content, not only the code | Pass (5 cells) |
| DT1-15 | Open a **scheduled** inspection | `GET /api/inspections/:id` | 200 | 200 | **403 (suspect)** | 403 | 401 | See remark 1 | Fail (4 of 5 cells pass): Insp-N got 200 (BUG-003) |
| DT1-16 | Open a **completed** inspection | `GET /api/inspections/:id` | 200 | 200 | **403 (suspect)** | 200 | 401 | See remark 1 | Fail (4 of 5 cells pass): Insp-N got 200 (BUG-003) |
| DT1-17 | Schedule for self | `POST /api/inspections` | 201 | 201 | 201 | 403 | 401 | Assignment does not exist yet, so both inspectors are the same | Pass (5 cells) |
| DT1-18 | Schedule for another inspector | `POST /api/inspections` with `inspector` = other user | 201, other user | 201, but assigned to self | 201, but assigned to self | 403 | 401 | See remark 2 | Pass (5 cells) |
| DT1-19 | Submit a scheduled inspection | `PUT /api/inspections/:id/submit` | 200 | 200 | 403 | 403 | 401 | Use a fresh inspection for each 200 cell | Pass (5 cells) |
| DT1-20 | Delete inspection | `DELETE /api/inspections/:id` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-21 | List incidents | `GET /api/incidents` | 200 all | 200 all | 200 all | 200 own only | 401 | Check the content, not only the code | Pass (5 cells) |
| DT1-22 | Report incident | `POST /api/incidents` | 201 | 201 | 201 | 201 | 401 | | Pass (5 cells) |
| DT1-23 | Update incident | `PUT /api/incidents/:id` | 200 | 200 | 200 | 403 | 401 | | Pass (5 cells) |
| DT1-24 | Delete incident | `DELETE /api/incidents/:id` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-25 | List staff names | `GET /api/users/staff` | 200 | 200 | 200 | 403 | 401 | | Pass (5 cells) |
| DT1-26 | List users | `GET /api/users` | 200 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-27 | Create user | `POST /api/users` | 201 | 403 | 403 | 403 | 401 | | Pass (5 cells) |
| DT1-28 | Change role | `PUT /api/users/:id/role` | 200 | 403 | 403 | 403 | 401 | Admin gets 400 on own account | Pass (5 cells) |
| DT1-29 | Delete user | `DELETE /api/users/:id` | 200 | 403 | 403 | 403 | 401 | Admin gets 400 on own account, 409 if linked records exist | Pass (5 cells) |

**Remark 1 (suspect, from code reading, not executed).** The README permissions matrix says an inspector can
view **own** inspections. `listInspections` follows this rule, but `getInspection` (lines 29 to 34) checks
only the technician role. So an inspector who knows the id of another inspector's inspection should get
**200** and see it. The README is also not consistent: section 4 says `GET /api/inspections/:id` is for
"any" role. We used the permissions matrix for the expected result. The owner should confirm the rule.

**Remark 2.** The README says an inspector can schedule for "self only" but does not give an HTTP code. From
code reading (line 40), the `inspector` field sent by an inspector is ignored and the inspection is assigned
to the sender. The main check is that it is **not** assigned to the other person.

---

## DT2: Risk level calculation

Source: `calculateResult()` in `backend/models/Inspection.js`, lines 29 to 39.

Conditions:
- **C1:** total = 0 (no item is pass or fail)
- **C2:** at least one critical item failed
- **C3:** score is below 60
- **C4:** score is below 80

Four conditions give 2^4 = **16** combinations.

### DT2-A: Possible combinations (7)

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| C1: total = 0 | Y | N | N | N | N | N | N |
| C2: critical item failed | N | Y | Y | Y | N | N | N |
| C3: score below 60 | N | Y | N | N | Y | N | N |
| C4: score below 80 | N | Y | Y | N | Y | Y | N |
| **Risk level** | **low (suspect)** | **critical** | **critical** | **critical** | **high** | **medium** | **low** |
| **Score** | 100 in code | 0 to 59 | 60 to 79 | 80 to 100 | 0 to 59 | 60 to 79 | 80 to 100 |

R2, R3 and R4 give the same result, so they can be joined: if C2 is Y, the risk is **critical** and the score
does not matter.

In R4 the score can even be shown as 100: 199 pass and 1 critical fail give 99.5, which rounds to 100.

### DT2-B: Impossible combinations (9)

| C1 | C2 | C3 | C4 | Number of combinations | Why it cannot happen |
|---|---|---|---|---|---|
| - | - | Y | N | 4 | A score below 60 is always below 80 |
| Y | Y | Y | Y | 1 | A critical fail is a fail, so total is at least 1. Also, the score is 100 when total = 0 |
| Y | Y | N | Y | 1 | Same reason |
| Y | Y | N | N | 1 | A critical fail is a fail, so total is at least 1 |
| Y | N | Y | Y | 1 | When total = 0 the code sets the score to 100, so it is not below 60 or 80 |
| Y | N | N | Y | 1 | Same reason |

Check: 7 possible + 9 impossible = 16.

### DT2-C: Test cases

**Preconditions:** an inspection with the items shown. "Fail" means a non-critical item failed unless
"critical fail" is written. **Steps:** run `calculateResult()` (or submit through the API) and read the result.

| ID | Rule | Items | Expected score | Expected riskLevel | Actual Result | Status |
|---|---|---|---|---|---|---|
| DT2-01 | R1 | 5 N/A | Not specified in README (code gives 100) | Not specified in README (code gives low) | Current behaviour recorded, as in the code (README silent) | Recorded |
| DT2-02 | R2 | 1 pass, 1 critical fail | 50 | critical | As expected (1 check) | Pass |
| DT2-03 | R3 | 3 pass, 1 critical fail | 75 | critical | As expected (1 check) | Pass |
| DT2-04 | R4 | 9 pass, 1 critical fail | 90 | critical | As expected (1 check) | Pass |
| DT2-05 | R5 | 1 pass, 1 fail | 50 | high | As expected (1 check) | Pass |
| DT2-06 | R6 | 7 pass, 3 fail | 70 | medium | As expected (1 check) | Pass |
| DT2-07 | R7 | 9 pass, 1 fail | 90 | low | As expected (1 check) | Pass |
| DT2-08 | R7 | 4 pass, 1 critical item marked N/A | 100 | low | Current behaviour recorded, as in the code (README silent) | Recorded |

**Defect suspect (R1 / DT2-01).** When every item is N/A, nothing was checked. The README formula is 0 / 0 and
is not defined. The code reports score 100 and **low** risk, and `submitInspection` then saves 100 as the
`lastScore` of the lab. For a safety system this looks wrong, because an inspection where nothing was checked
looks the same as a perfect one. A value such as "not assessed" may be safer. This needs a run to confirm and
a decision from the owner.

**Not clear (DT2-08).** A critical item can be marked N/A with no remarks and the risk is still low. The
README does not say if this is allowed.

**Rounding.** C3 and C4 use the rounded score. See BVA-15 and BVA-17 in `boundary-value-analysis.md`.
