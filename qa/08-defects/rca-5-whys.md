# Root cause analysis (5 Whys): BUG-002 and BUG-004

**How to read it**
- **Verified**: we read it in the code or a test run shows it. The place is given.
- **Likely, not confirmed**: our assumption about how the developers worked. We did not talk to them.

---

## 1. BUG-002: all items N/A gives score 100 and risk "low"

**Problem:** 8 answers "na" gave `status 200, score=100, risk=low`, and the lab got `lastScore=100` (`phase2-known-defects.log` lines 429-454).

| Why? | Answer | Proof | State |
|---|---|---|---|
| 1. Why is the lab shown as safe? | `calculateResult()` set score 100. 100 is not below 60 or 80, so risk became "low". `submitInspection()` then copied 100 to the lab | `Inspection.js:33`, `:36-38`, `inspectionController.js:88`, TC-INS-05.1 and 05.2 | Verified |
| 2. Why was the score 100? | Only "pass" and "fail" are counted. With N/A only, `total` is 0, and for `total === 0` the code uses the fixed value 100 | `Inspection.js:30-33`, WB-CR-01 | Verified |
| 3. Why is the fixed value 100? | The formula is 0 / 0, so some value was needed. 100 makes "nothing checked" equal to "everything passed" | Guard in `Inspection.js:33` is verified. That it was added only to avoid 0 / 0 is an assumption | Likely, not confirmed |
| 4. Why did no other check stop it? | Submit refuses only "pending" items and failed items without remarks. N/A is accepted for every item, also critical ones, without remarks. The model has no level like "not assessed" | `inspectionController.js:78-80`, `Inspection.js:22`, DT2-08 | Verified |
| 5. Why was the case missed? | The README defines the formula but not the case "no item counts". The project had no automated tests, so no test covered this boundary | README lines 25-26, `phase0-baseline.log` ("none found", "no test script") | Verified |
| | The case was probably not thought of when the rule was written | | Likely, not confirmed |

**Root cause:** the requirement does not say what to do when no item is pass or fail, and the code fills this gap with an unsafe default.
**Place:** `backend/models/Inspection.js:33`

```js
this.score = total === 0 ? 100 : Math.round((passed / total) * 100);
```

**Preventive actions**

| Action | Prevents | Who (proposal) |
|---|---|---|
| Write the rule for "nothing assessed" in the README before coding | Gap in the requirement | Owner |
| Review every formula for division by zero and for empty input. A default in a safety system must be the safe side (not assessed), never the best score | Unsafe default | Developer, reviewer |
| Decide if a critical item may be N/A without remarks | Same effect with one item (DT2-08) | Owner |
| Keep TC-INS-05.1 and 05.2 as regression tests in CI | Coming back later | Tester |

---

## 2. BUG-004: "not on yourself" rule avoided with the id in capital letters

**Problem:** an admin sent the own id in capital letters. Change role gave 200 and role "technician". Delete gave 200 "User deleted" (`phase2-known-defects.log` lines 223-246).

| Why? | Answer | Proof | State |
|---|---|---|---|
| 1. Why was the own account changed? | The self check was false, so the code went on to the change or the delete | `userController.js:24` and `:37`, TC-USR-03.6, TC-USR-04.5 variation | Verified |
| 2. Why was the check false? | It compares two texts with `===`. `String(req.user._id)` is in small letters, `req.params.id` is what the client sent, so `6b06...` and `6B06...` are different | `userController.js:24`, `:37`. With the normal id the check works (TC-USR-03.5 and 04.5 pass) | Verified |
| 3. Why was the account still found? | Mongoose changes the text to an ObjectId, and letter case does not matter there. So the check and the database do not agree on what "the same id" is | `userController.js:28` and `:41`. The answer shows `_id` in small letters for a URL in capitals | Verified |
| 4. Why does the raw URL text reach the check? | The route checks only `role`. There is no rule that checks or normalises `:id`, and the check runs before the user is loaded | `userRoutes.js:23-24`, `userController.js:24-28`, `:37-41` | Verified |
| 5. Why was it missed? | The project had no automated tests, and the Users page hides the controls on the own row, so the pages never send this request | `phase0-baseline.log`, `Users.jsx:77`, `:88` | Verified |
| | The rule was probably checked only by hand with the normal id. It is not in the README, so no one planned a test for it | | Likely, not confirmed |

**Root cause:** ids are compared as text, with unchecked client input on one side.
**Place:** `backend/controllers/userController.js:24` and `:37`

```js
if (String(req.user._id) === req.params.id) {
```

The same pattern in `inspectionController.js:67` is safe, because both ids there come from the database (verified by reading).

**Preventive actions**

| Action | Prevents | Who (proposal) |
|---|---|---|
| Compare ids with `ObjectId.equals()`, or load the user first and compare the two database ids | This bug | Developer |
| Put the "self" rule in one shared function, used by both routes | The same mistake in two places | Developer |
| Check `:id` in the route (`param('id').isMongoId()`) and normalise it | Raw input in rules | Developer |
| Code review question: "Is client input compared as text with an id?" Search the code for it | Same bug elsewhere | Reviewer |
| Do not depend on the web page for protection. Test rules with direct API requests and with another writing of the same value | Missed cases | Tester |
| Write the self rule, and a rule for the last admin, in the README | Gap in the requirement | Owner |
| Keep TC-USR-03.6 and TC-USR-04.5 variation as regression tests in CI | Coming back later | Tester |

---

## 3. What both have in common

| Common point | State |
|---|---|
| The README does not define the special case | Verified |
| The original project had no automated tests | Verified (`phase0-baseline.log`) |
| The normal case works and only an unusual value fails, so a manual check of the normal case would not show it | Verified by the tests that pass (WB-CR-02 to 06, TC-USR-03.5 and 04.5) |
| Boundary and error cases were not part of the development work | Likely, not confirmed |
