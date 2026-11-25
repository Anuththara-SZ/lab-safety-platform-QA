# Task 3.3 (a): Equivalence Partitioning

System under test: Lab Safety Inspection Platform (backend REST API)
Status: filled on 2026-11-25. Source: `qa/evidence/phase5-rerun-main.log`, `phase5-rerun-known-defects.log` and `phase2-rerun-ui.log`, filled in by `qa/02-stlc-test-cases/fill-results.js`. "Recorded" means the README does not define the case and the test only records what the code does today.

## 1. Method

Equivalence partitioning (EP) splits the possible values of an input into groups (classes). The program
should treat every value in one class in the same way, so one value from each class is enough.

| Class type | Meaning |
|---|---|
| Valid | The value should be accepted |
| Invalid | The value should be rejected with a clear 4xx error |
| Not specified | The README does not say what should happen. We record what the code seems to do and ask for a decision |

Only one input is changed in each case. All other inputs are kept valid, so a failure has one cause.

The column **"From code reading, not executed"** says what we think the code does after reading it. It is
filled only when it adds something to the expected result. It is not a test result.

Sources: `README.md`, `backend/routes/authRoutes.js`, `backend/routes/labRoutes.js`,
`backend/controllers/inspectionController.js`, `backend/models/User.js`, `Lab.js`, `Inspection.js`.
Library versions in `backend/package-lock.json`: express-validator 7.3.2, validator 13.15.35, mongoose 8.24.5.

---

## 2. Input 1: email and password, `POST /api/auth/register`

**Rules found in code:** email must pass `isEmail()` and is then changed by `normalizeEmail()`; password must
pass `isLength({ min: 6 })`; email must not exist already (409).

**Preconditions:** database is running; the email in the case is not registered unless stated.
**Steps:** send `POST /api/auth/register` with `{ "name": "Test User", "email": ..., "password": ... }`.

Caution when running: `backend/app.js` allows only 50 requests per 15 minutes to `/api/auth`. After that the
API answers 429, so keep the number of calls low or restart the app between groups.

### 2.1 Email classes (password fixed as `Passw0rd`)

| ID | Type | Class | Representative value | Expected Result | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| EP-01 | Valid | Correct format, new email | `new.user@example.com` | 201, token returned, role is `technician` | | As expected (1 check) | Pass |
| EP-02 | Valid | Correct format with capital letters | `New.User2@Example.COM` | 201 | Stored and returned in lower case | As expected (1 check) | Pass |
| EP-03 | Invalid | Already registered | an existing email | 409 "Email already registered" | | As expected (1 check) | Pass |
| EP-04 | Invalid | Already registered, different letter case | existing email in capitals | 409 | Email is made lower case before the search | As expected (1 check) | Pass |
| EP-05 | Invalid | No `@` sign | `newuser.example.com` | 400 "Valid email is required" | | As expected (1 check) | Pass |
| EP-06 | Invalid | No domain part | `newuser@` | 400 | | As expected (1 check) | Pass |
| EP-07 | Invalid | Empty string | `""` | 400 | | As expected (1 check) | Pass |
| EP-08 | Invalid | Field missing | no `email` key | 400 | | As expected (1 check) | Pass |
| EP-09 | Not specified | Gmail alias of a registered address | register `ab@gmail.com`, then `a.b+lab@gmail.com` | README does not say | `normalizeEmail()` removes dots and `+lab` for Gmail, so both become `ab@gmail.com` and the second call gives 409 | Current behaviour recorded, as in the code (README silent) | Recorded |

### 2.2 Password classes (email fixed as a new valid address)

| ID | Type | Class | Representative value | Expected Result | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| EP-10 | Valid | 6 or more characters | `Passw0rd` | 201, password is not in the response | Saved as a bcrypt hash | As expected (1 check) | Pass |
| EP-11 | Invalid | Shorter than 6 | `abc` | 400 "Password must be at least 6 characters" | | As expected (1 check) | Pass |
| EP-12 | Invalid | Empty string | `""` | 400 | | As expected (1 check) | Pass |
| EP-13 | Invalid | Field missing | no `password` key | 400 | Missing value is treated as an empty string | As expected (1 check) | Pass |
| EP-14 | Not specified | Only spaces, 6 or more | 8 spaces | README does not say | Password is not trimmed, so 201. Suspected weakness | Current behaviour recorded, as in the code (README silent) | Recorded |
| EP-15 | Not specified | Number instead of text | `12345678` (JSON number) | README does not say | Validator turns it into text, so 201 | Current behaviour recorded, as in the code (README silent) | Recorded |
| EP-16 | Not specified | Very long password | 100 characters | README gives no maximum | No maximum in code, so 201. bcrypt uses only the first 72 bytes, so the rest may not matter. Must be checked by running | Current behaviour recorded, as in the code (README silent) | Recorded |

---

## 3. Input 2: lab capacity, `POST /api/labs`

**Rules found in code:** route uses `body('capacity').optional().isInt({ min: 1 })`; the model has
`default: 20, min: 1`. No maximum is set.

**Preconditions:** logged in as admin; lab `code` in each case is new.
**Steps:** send `POST /api/labs` with `{ "name": "EP Lab", "code": "EP-xx", "building": "Block A", "capacity": ... }`.

| ID | Type | Class | Representative value | Expected Result | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| EP-17 | Valid | Whole number, 1 or more | `30` | 201, capacity 30 | | As expected (1 check) | Pass |
| EP-18 | Valid | Whole number sent as text | `"25"` | 201, capacity 25 | Mongoose changes it to a number. In `Labs.jsx` (line 62) the form keeps the typed value as text, so this can happen in real use | As expected (1 check) | Pass |
| EP-19 | Valid | Field missing | no `capacity` key | 201, capacity 20 (default) | | As expected (1 check) | Pass |
| EP-20 | Invalid | Negative number | `-5` | 400 "Capacity must be a positive number" | | As expected (1 check) | Pass |
| EP-21 | Invalid | Decimal number | `12.5` | 400 | | As expected (1 check) | Pass |
| EP-22 | Invalid | Text that is not a number | `"abc"` | 400 | | As expected (1 check) | Pass |
| EP-23 | Invalid | Empty string | `""` | 400 | `optional()` skips only a missing key, so `""` is checked and fails | As expected (1 check) | Pass |
| EP-24 | Invalid | Null | `null` | 400 | Same reason as EP-23 | As expected (1 check) | Pass |
| EP-25 | Invalid | Wrong type (boolean) | `true` | 400 | Changed to the text "true", which is not an integer | As expected (1 check) | Pass |
| EP-26 | Not specified | Very large number | `1000000` | README gives no maximum | No maximum in code, so 201 | Current behaviour recorded, as in the code (README silent) | Recorded |

Zero is tested in `boundary-value-analysis.md` (BVA-26). `PUT /api/labs/:id` uses the same rules.

---

## 4. Input 3: checklist result, `PUT /api/inspections/:id/submit`

**Rules found in code:** the model allows `pending`, `pass`, `fail`, `na`. The controller accepts only `pass`,
`fail` and `na` from the user (line 73). Any other value is skipped, so the item stays `pending` and the
request is refused at line 78. Failed items need remarks (line 80).

**Preconditions:** a scheduled inspection with two non-critical items, A and B; logged in as the assigned
inspector; a fresh inspection is used for each case.
**Steps:** send `PUT /api/inspections/:id/submit` with B = `pass` and A as shown in the table.

| ID | Type | Class | Representative value for item A | Expected Result | From code reading, not executed | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| EP-27 | Valid | `pass` | `result: "pass"` | 200, completed, score 100, risk low | | As expected (1 check) | Pass |
| EP-28 | Valid | `fail` with remarks | `result: "fail", remarks: "Broken"` | 200, completed, score 50, risk high | | As expected (1 check) | Pass |
| EP-29 | Valid | `na` | `result: "na"` | 200, completed, score 100 (only B counts), risk low | | As expected (1 check) | Pass |
| EP-30 | Invalid | `fail` without remarks | `result: "fail"` | 400 "Remarks are required for failed item..." | | As expected (1 check) | Pass |
| EP-31 | Invalid | `fail` with only spaces as remarks | `remarks: "   "` | 400 | The schema trims remarks to an empty string, so line 80 should reject it | As expected (1 check) | Pass |
| EP-32 | Invalid | `pending` | `result: "pending"` | 400 "Answer every checklist item before submitting" | | As expected (1 check) | Pass |
| EP-33 | Invalid | Text not in the list | `result: "maybe"` | 400 | Value is skipped without its own message. The user sees "Answer every checklist item...", which does not name the bad value | As expected (1 check) | Pass |
| EP-34 | Invalid | Right word, wrong letter case | `result: "PASS"` | 400 | Same as EP-33 | As expected (1 check) | Pass |
| EP-35 | Invalid | Wrong type | `result: 1` | 400 | Same as EP-33 | As expected (1 check) | Pass |
| EP-36 | Invalid | `result` key missing | `{ "_id": "<A>" }` | 400 | | As expected (1 check) | Pass |
| EP-37 | Invalid | Item left out of the list | only B is sent | 400 | | As expected (1 check) | Pass |
| EP-38 | Invalid | `responses` key missing | `{}` | 400 | Line 70 uses an empty list instead | As expected (1 check) | Pass |
| EP-39 | Invalid | `responses` is not a list | `"responses": "pass"` | 400 | **Suspect:** `answers.forEach` does not exist on text, so a TypeError and 500 | 500 "answers.forEach is not a function" (BUG-005) | Fail |
| EP-40 | Invalid | List contains null | `"responses": [null]` | 400 | **Suspect:** reading `a._id` of null gives a TypeError and 500 | 500 "Cannot read properties of null (reading '_id')" (BUG-005) | Fail |
| EP-41 | Not specified | Extra answer with an unknown item id | A and B `pass`, plus an unused ObjectId | README does not say | The extra answer is ignored, 200 | Current behaviour recorded, as in the code (README silent) | Recorded |
| EP-42 | Not specified | Same item answered twice | A `pass`, then A `fail` with remarks | README does not say | The last answer wins, so A is `fail`, 200, score 50 | Current behaviour recorded, as in the code (README silent) | Recorded |

---

## 5. Summary

| Input | Valid | Invalid | Not specified | Total |
|---|---|---|---|---|
| Email | 2 (EP-01, 02) | 6 (EP-03 to 08) | 1 (EP-09) | 9 |
| Password | 1 (EP-10) | 3 (EP-11 to 13) | 3 (EP-14 to 16) | 7 |
| Lab capacity | 3 (EP-17 to 19) | 6 (EP-20 to 25) | 1 (EP-26) | 10 |
| Checklist result | 3 (EP-27 to 29) | 11 (EP-30 to 40) | 2 (EP-41, 42) | 16 |
| **Total** | **9** | **26** | **7** | **42** |

**Cases most likely to show a defect:** EP-39 and EP-40 (500 instead of 400), EP-33 to EP-35 (message does not
name the bad value). These are suspects only. They become defects only after a real run confirms them.
