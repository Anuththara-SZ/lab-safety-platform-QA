# Task 3.3 (b): Boundary Value Analysis

System under test: Lab Safety Inspection Platform (backend REST API)
Status: filled on 2026-11-25. Source: `qa/evidence/phase2-rerun-main.log`, `phase2-rerun-known-defects.log` and `phase2-rerun-ui.log`, filled in by `qa/02-stlc-test-cases/fill-results.js`. "Recorded" means the README does not define the case and the test only records what the code does today.

## 1. Method

Boundary value analysis (BVA) tests the values on and next to a limit, because mistakes such as using `<=`
instead of `<` happen there. For most limits we use three values: just below, on, and just above.

The column **"From code reading, not executed"** says what the code seems to do. It is filled only when it
is different from the expected result, or when the expected result is not written in the README.

---

## 2. Score thresholds (60 and 80) and score limits (0 and 100)

**README rule:** `score = passed / (passed + failed) x 100`, N/A items ignored. Risk is **critical** if a
critical item fails, else **high** (below 60%), **medium** (below 80%), **low** (80% or more).

**Code:** `calculateResult()` in `backend/models/Inspection.js`, lines 29 to 39. The code also **rounds** the
score with `Math.round` (line 33) before it compares with 60 and 80. The README does not mention rounding.

**Preconditions:** every item is **non-critical**, so the "critical" rule does not change the result.
**Steps:** build an inspection with the given number of pass, fail and N/A items, run `calculateResult()`,
read `score` and `riskLevel`. Large counts are easiest in a unit test: `new Inspection({ responses: [...] })`.

### 2.1 Exact scores

| ID | Boundary | Pass | Fail | N/A | Expected score | Expected riskLevel | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| BVA-01 | Minimum score 0 | 0 | 5 | 0 | 0 | high | | As expected (1 check) | Pass |
| BVA-02 | Just above 0 | 1 | 99 | 0 | 1 | high | | As expected (1 check) | Pass |
| BVA-03 | Just below 60 | 59 | 41 | 0 | 59 | high | | As expected (1 check) | Pass |
| BVA-04 | On 60 | 3 | 2 | 0 | 60 | medium | | As expected (1 check) | Pass |
| BVA-05 | Just above 60 | 61 | 39 | 0 | 61 | medium | | As expected (1 check) | Pass |
| BVA-06 | Just below 80 | 79 | 21 | 0 | 79 | medium | | As expected (1 check) | Pass |
| BVA-07 | On 80 | 4 | 1 | 0 | 80 | low | | As expected (1 check) | Pass |
| BVA-08 | Just above 80 | 81 | 19 | 0 | 81 | low | | As expected (1 check) | Pass |
| BVA-09 | Just below 100 | 99 | 1 | 0 | 99 | low | | As expected (1 check) | Pass |
| BVA-10 | Maximum score 100 | 5 | 0 | 0 | 100 | low | | As expected (1 check) | Pass |
| BVA-11 | All N/A, total = 0 | 0 | 0 | 5 | Not specified (0 / 0) | Not specified | Score 100, risk low. **Suspect:** nothing was checked but the lab is shown as fully safe | Current behaviour recorded, as in the code (README silent) | Recorded |
| BVA-12 | Smallest total (1), passed | 1 | 0 | 4 | 100 | low | | As expected (1 check) | Pass |
| BVA-13 | Smallest total (1), failed | 0 | 1 | 4 | 0 | high | | As expected (1 check) | Pass |

### 2.2 Rounding near the thresholds

A raw score from 59.5 up to (not including) 60 is **below 60%** in the README, but the code rounds it to 60
first. The same happens from 79.5 up to 80. This can move an inspection to a safer risk band.

| ID | Boundary | Pass | Fail | Raw score | Expected riskLevel (strict README) | From code reading, not executed | Same? | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| BVA-14 | Just under 59.5 | 47 | 32 | 59.49 | high | 59, high | Yes | As expected (1 check) | Pass |
| BVA-15 | Exactly 59.5 | 119 | 81 | 59.5 | high | 60, medium | **No** | medium (observation O-02) | Fail |
| BVA-16 | Just under 79.5 | 31 | 8 | 79.49 | medium | 79, medium | Yes | As expected (1 check) | Pass |
| BVA-17 | Exactly 79.5 | 159 | 41 | 79.5 | medium | 80, low | **No** | low (observation O-02) | Fail |
| BVA-18 | Smallest list that crosses 60 | 25 | 17 | 59.52 | high | 60, medium | **No** | medium (observation O-02) | Fail |
| BVA-19 | Smallest list that crosses 80 | 35 | 9 | 79.55 | medium | 80, low | **No** | low (observation O-02) | Fail |
| BVA-20 | Rounds up to 100 | 199 | 1 | 99.5 | low | 100, low. Score shows 100 although one item failed | Yes (risk) | As expected (1 check) | Pass |
| BVA-21 | Rounds up from 0.5 | 1 | 199 | 0.5 | high | 1, high | Yes | As expected (1 check) | Pass |
| BVA-22 | Rounds down to 0 | 1 | 200 | 0.4975 | high | 0, high. Score shows 0 although one item passed | Yes (risk) | As expected (1 check) | Pass |

Notes:
- The README is **not clear** here. If rounding is intended, the code is correct and the README should say
  so. If it is not intended, BVA-15, 17, 18 and 19 are defects. The team must decide before logging.
- By our calculation the smallest number of counted items (pass + fail) where the rounding changes the band
  is **42** at the 60 limit (25/42) and **44** at the 80 limit (35/44). The two checklists in
  `backend/seed.js` have 8 and 6 items, so the problem cannot appear with the demo data.
- `(119 / 200) * 100` and `(159 / 200) * 100` use floating-point numbers. By hand calculation they give
  exactly 59.5 and 79.5, but this must be checked by running the commands in section 6.

---

## 3. Password length, `POST /api/auth/register`

**Rule:** at least 6 characters (`isLength({ min: 6 })` in `authRoutes.js`, `minlength: 6` in `User.js`).
**Preconditions:** new valid email, valid name. **Steps:** send the register request with the given password.

| ID | Boundary | Password | Length | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| BVA-23 | Just below | `abcde` | 5 | 400 "Password must be at least 6 characters" | As expected (1 check) | Pass |
| BVA-24 | On the limit | `abcdef` | 6 | 201, account created | As expected (1 check) | Pass |
| BVA-25 | Just above | `abcdefg` | 7 | 201, account created | As expected (1 check) | Pass |

---

## 4. Lab capacity, `POST /api/labs`

**Rule:** whole number, minimum 1 (`isInt({ min: 1 })` in `labRoutes.js`, `min: 1` in `Lab.js`).
**Preconditions:** logged in as admin, new lab code. **Steps:** send the create request with the given capacity.

| ID | Boundary | Capacity | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| BVA-26 | Just below | 0 | 400 "Capacity must be a positive number" | As expected (1 check) | Pass |
| BVA-27 | On the limit | 1 | 201, capacity 1 | As expected (1 check) | Pass |
| BVA-28 | Just above | 2 | 201, capacity 2 | As expected (1 check) | Pass |

There is no upper limit in the code or README, so there is no upper boundary to test.

---

## 5. Scheduled date, `POST /api/inspections`

**Rules found in code:** `inspectionRoutes.js` checks only `lab` and `template`. There is **no rule for
`scheduledDate`**, so only the Mongoose `Date` type checks it. Line 56 of `inspectionController.js` uses the
current time when the value is missing or empty. The README has no rule about past dates.

**Preconditions:** logged in as admin; a lab and a template exist. D = the day the test is run.
**Steps:** send `{ lab, template, scheduledDate }`, then read `scheduledDate` in the response.

| ID | Boundary | scheduledDate | Expected Result | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|
| BVA-29 | Yesterday | D - 1 | Not specified. Scheduling in the past does not look sensible | 201, past date is saved. **Suspect**, needs a decision | 201, saved as yesterday (observation O-07) | Fail |
| BVA-30 | Today | D | 201 | | As expected (1 check) | Pass |
| BVA-31 | Tomorrow | D + 1 | 201 | | As expected (1 check) | Pass |
| BVA-32 | Not a date | `"not-a-date"` | 400 | Mongoose cannot cast it, ValidationError, 400 | As expected (1 check) | Pass |
| BVA-33 | Missing | no key | 201, date is the time of the request | | As expected (1 check) | Pass |
| BVA-34 | Empty text | `""` | Not specified | 201, current time is used | Current behaviour recorded, as in the code (README silent) | Recorded |
| BVA-35 | Last day of February, normal year | `2027-02-28` | 201, saved as 2027-02-28 | | As expected (1 check) | Pass |
| BVA-36 | **Invalid leap day** | `2027-02-29` | 400, this date does not exist | Probably 201 and saved as 2027-03-01. **Suspect**, must be run (see below) | 201, saved as 2027-03-01 (BUG-006) | Fail |
| BVA-37 | First day of March | `2027-03-01` | 201, saved as 2027-03-01 | | As expected (1 check) | Pass |
| BVA-38 | **Valid leap day** | `2028-02-29` | 201, saved as 2028-02-29 | | As expected (1 check) | Pass |
| BVA-39 | Day after a valid leap day | `2028-02-30` | 400, this date does not exist | Probably 201 and saved as 2028-03-01. **Suspect**, must be run | 201, saved as 2028-03-01 (BUG-006) | Fail |
| BVA-40 | Day above 31 | `2027-02-32` | 400 | Probably an invalid date in JavaScript, so 400. Must be run | As expected (1 check) | Pass |

### What JavaScript does with 2027-02-29

1. Mongoose (`backend/node_modules/mongoose/lib/cast/date.js`) passes a text date to `new Date(value)` and
   reports an error only if the result is an invalid date.
2. The JavaScript standard says `2027-02-29` is not a correct ISO date, but it lets each engine decide what
   to do with such text.
3. Node.js uses the V8 engine. As far as we know, V8 only checks that the day is between 1 and 31 and does
   not check the length of the month. So it should **roll over** to 2027-03-01T00:00:00.000Z and give no error.
4. We have **not run this**. The result must be confirmed with the command in section 6 and then with BVA-36.

If this is confirmed, the API would accept a date that does not exist and silently save another day.

In the UI the date comes from `<input type="date">` in `frontend/src/pages/Inspections.jsx` (line 160, no
`min` value). A browser date picker normally does not let the user pick 29 February 2027, so BVA-36 and
BVA-39 should be run against the API.

---

## 6. Commands to check the JavaScript behaviour (not executed yet)

```bash
node -v
node -e "console.log((119/200)*100, Math.round((119/200)*100))"
node -e "console.log((159/200)*100, Math.round((159/200)*100))"
node -e "console.log(new Date('2027-02-29'))"
node -e "console.log(new Date('2028-02-29'))"
node -e "console.log(new Date('2028-02-30'))"
node -e "console.log(new Date('2027-02-32'))"
```

## 7. Summary

| Group | IDs | Count |
|---|---|---|
| Exact scores | BVA-01 to BVA-13 | 13 |
| Rounding | BVA-14 to BVA-22 | 9 |
| Password length | BVA-23 to BVA-25 | 3 |
| Capacity | BVA-26 to BVA-28 | 3 |
| Scheduled date | BVA-29 to BVA-40 | 12 |
| **Total** | | **40** |
