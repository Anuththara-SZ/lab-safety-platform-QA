# BUG-004: An admin can demote or delete the own account by sending the id in capital letters

| Field | Value |
|---|---|
| ID | BUG-004 (observation O-14) |
| Type | Functional / security, business rule can be bypassed |
| Title | The "not on yourself" rule for admins compares the id as text, so the own id in capital letters passes it (change role and delete) |
| Requirement basis | **Reasonable expectation.** The README is silent. The application itself has the rule: "You cannot change your own role" (`userController.js:26`) and "You cannot delete your own account" (`:39`). A rule that is in the code should hold for every way to write the same id |
| Severity | Moderate (a protection rule does not hold, but only an admin can do it, only to the own account, and only with a special request) |
| Priority | Medium (one-line fix in two places) |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, Jest 30.5.2, Supertest 7.3.2, Express 4.22.3, Mongoose 8.24.5, in-memory MongoDB |
| Found in | Phase 2, API test run, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | TC-USR-03.6, TC-USR-04.5 variation (2 tests) |
| Code location | `backend/controllers/userController.js:24` (change role) and `:37` (delete) |

## Steps to reproduce
Data: demo data of `backend/seed.js`, plus a second admin with no linked records. Create it as admin (D2):
`POST /api/users` `{"name":"Second Admin","email":"admin2@lab.com","password":"Admin2@123","role":"admin"}`.

1. Log in as the second admin: `POST /api/auth/login` `{"email":"admin2@lab.com","password":"Admin2@123"}`. Copy `user.id`.
2. Control: `PUT /api/users/<own id>/role` `{"role":"technician"}`. Answer: 400 (correct).
3. Send the same request with the letters of the id in capitals. In our run:
   `PUT /api/users/6B066E233FA2A6F95E8A399D/role` `{"role":"technician"}`.
4. Restore the data, so that the second admin is admin again. Then `DELETE /api/users/6B066E233FA2A6F95E8A399D` (own id in capitals, no body).

## Expected result
Steps 3 and 4: status 400, same as with the normal id. It is the same account. The account stays admin and is not deleted.

## Actual result
Copied from `phase2-known-defects.log`:

```
TC-USR-03.6
PUT /api/users/6B066E233FA2A6F95E8A399D/role
Expected status: 400
Actual status:   200
Actual body:     {"_id":"6b066e233fa2a6f95e8a399d","name":"Second Admin","email":"admin2@lab.com","role":"technician","createdAt":"2026-11-25T05:12:03.389Z","updatedAt":"2026-11-25T05:12:03.907Z","__v":0}

TC-USR-04.5 variation
DELETE /api/users/6B066E233FA2A6F95E8A399D
Expected status: 400
Actual status:   200
Actual body:     {"message":"User deleted"}
```

The `_id` in the answer is the same id in small letters, so the account of the sender was changed.

## Evidence
| File | What it shows |
|---|---|
| `qa/evidence/phase2-known-defects.log` lines 223-228 and 241-246 | Both failing tests |
| `qa/evidence/phase2-rerun-known-defects.log` lines 222-227 and 240-245 | Second run, same result |
| `qa/evidence/phase2-jest-all-first-run.log` lines 324-329 | First run of TC-USR-03.6 (the delete variation was added after this run) |
| `qa/evidence/phase2-rerun-main.log` lines 87 and 93 | TC-USR-03.5 and 04.5 pass: with the normal id the rule works |
| `qa/06-automation-cicd/known-defects/incidents-users-dashboard.test.js:19-32` | The two tests |

## Cause
`String(req.user._id) === req.params.id` compares text. The left side is always in small letters, the right side is what the client sent. The database search on lines 28 and 41 does not depend on the letter case, so it still finds the account. The full 5 Whys are in `rca-5-whys.md`.

## What was not tested
- **Last admin:** in both tests another admin existed. Nobody tested if the last admin can remove the last admin account in this way. "Suspected, not reproduced".
- **Delete with linked records:** the second admin had none. The 409 rule (`userController.js:52`) should still refuse an admin with linked inspections, incidents or labs, but we did not send that request with capital letters.
- **Web page:** the Users page hides the controls on the own row (`Users.jsx:77` and `:88`), so this needs a direct API request.
- The tests stop at the wrong status code, so their later database check did not run. The evidence is the answer of the API.

## Suggested fix (for the developers)
Compare ids as ids, on lines 24 and 37:

```js
if (req.user._id.equals(req.params.id)) {
```

In the installed bson 6.10.4, `ObjectId.equals()` changes a text id to small letters before it compares
(`node_modules/bson/lib/bson.cjs:2626-2627`, read by us). A rule that keeps at least one admin would also help.

We did not run the `equals()` version. We tried a similar fix, `req.params.id.toLowerCase()` on both lines, in a throwaway copy outside
the repository: both tests passed and the main suite stayed at 335 passed (`qa/evidence/phase3-bug004-fix-in-copy.log`).
