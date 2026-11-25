# Task 3.2: Test Environment

## 1. Machine and software

| Item | Version | Evidence |
|---|---|---|
| Operating system | Windows 11 Home Single Language, build 10.0.26200 | `qa/evidence/phase0-versions.log` |
| Node.js | v24.14.0 | `qa/evidence/phase0-frontend-npm-ci.log` |
| npm | 11.9.0 | `qa/evidence/phase0-frontend-npm-ci.log` |
| Google Chrome (headless for UI tests) | 157.0.8103.80 | `qa/evidence/phase0-versions.log` |
| Java (Temurin, needed by JMeter) | 21 | `qa/evidence/phase0-versions.log` |
| JMeter (portable, kept outside the repo) | 5.6.3 | `qa/evidence/phase0-versions.log` |
| MongoDB Community (Windows service) | 8.3.4 | `qa/evidence/phase0-versions.log` |
| Jest | 30.5.2 | `qa/package-lock.json` |
| Supertest | 7.3.2 | `qa/package-lock.json` |
| mongodb-memory-server | 11.4.0 | `qa/package-lock.json` |
| Cucumber | 13.3.0 | `qa/package-lock.json` |
| selenium-webdriver | 4.51.0 | `qa/package-lock.json` |
| Express / Mongoose (application) | 4.22.3 / 8.24.5 | `backend/package-lock.json` |
| React / Vite (application) | 18.3.1 / 8.3.5 | `frontend/package-lock.json` |
| Docker, Sonar scanner | Not installed | `qa/evidence/phase1-sonar-availability.log` |

## 2. Two separate databases

| Use | Database | Why |
|---|---|---|
| Automated tests (Jest, Supertest, Cucumber, Selenium UI) | Temporary instance from mongodb-memory-server | Empty at the start, deleted at the end |
| Manual and load tests | `lab_safety_qa` on the installed MongoDB | `npm run seed` wipes the database it connects to, so we never use the default `lab_safety` |

Locally, mongodb-memory-server starts the installed `mongod` 8.3.4 as a separate temporary process
(the test helper finds it by itself, `MONGOMS_SYSTEM_BINARY` can override it), because the download of its own 8.2.6 binary failed with ECONNRESET (seen during setup, output not saved to a log).
In GitHub Actions it downloads its own binary.

## 3. Start the manual environment (Windows PowerShell)

Open two terminals in the repository root.

```powershell
# Terminal 1: backend
cd backend
npm ci
$env:MONGO_URI  = "mongodb://127.0.0.1:27017/lab_safety_qa"
$env:JWT_SECRET = "qa-only-secret"
npm run seed        # wipes and fills lab_safety_qa only
npm start           # http://localhost:5000

# Terminal 2: frontend
cd frontend
npm ci --legacy-peer-deps
npm run dev         # http://localhost:5173, sends /api to port 5000
```

Check: `curl.exe http://localhost:5000/api/health` must return `"status":"ok"`.
The seed output must show `lab_safety_qa` in the line `MongoDB connected: ...`. If it shows another name, stop.

For TC-LAB-07 part (a), also set `$env:NODE_ENV = "production"` before `npm start`. Remove it afterwards with
`Remove-Item Env:NODE_ENV`.

## 4. Demo accounts (README section 3, `backend/seed.js`)

| Role | Name | Email | Password |
|---|---|---|---|
| admin | Dr. Admin | admin@lab.com | Admin@123 |
| inspector | Nimal Perera | inspector@lab.com | Inspector@123 |
| technician | Kamal Silva | tech@lab.com | Tech@123 |

New accounts made with `POST /api/auth/register` always become technician. Other roles must be created by an admin.

## 5. Seed data (`backend/seed.js`)

| Lab | Hazard | Linked inspections | Linked incidents |
|---|---|---|---|
| HV-01 High Voltage Laboratory | high | 1 completed | 1 (medium, open, by technician) |
| EL-02 Electronics Laboratory | medium | 1 completed | 1 (low, resolved, by inspector) |
| PE-03 Power Electronics Laboratory | high | 1 completed | 1 (high, investigating, by technician) |
| CN-04 Computer Networks Laboratory | low | 1 completed | 0 |
| CH-05 Chemistry Support Laboratory | high | 1 scheduled | 0 |

- All 5 inspections are assigned to Nimal Perera (inspector) and use the template "General Laboratory Safety Checklist".
- That template has 8 items. Items 1, 2 and 4 are critical.
- The template "Chemical Storage & Handling Checklist" has 6 items and is not used by any inspection.
- All three demo users are linked to labs, inspections or incidents, so none of them can be used for a successful delete test.

Scores of the seeded inspections, worked out by hand from the seed data and `calculateResult()` (not yet checked by running):

| Lab | Failed items | Calculation | Score | Risk |
|---|---|---|---|---|
| HV-01 | item 5 (not critical) | 7 / 8 = 87.5 | 88 | low |
| EL-02 | none | 8 / 8 | 100 | low |
| PE-03 | items 1 (critical), 6, 8 | 5 / 8 = 62.5 | 63 | critical |
| CN-04 | item 8 (not critical) | 7 / 8 = 87.5 | 88 | low |

## 6. Extra test data (create after the seed, as admin)

| ID | Request | Used as |
|---|---|---|
| D1 | `POST /api/users` `{"name":"Second Inspector","email":"inspector2@lab.com","password":"Inspector2@123","role":"inspector"}` | second inspector, `INSP2` |
| D2 | `POST /api/users` `{"name":"Second Admin","email":"admin2@lab.com","password":"Admin2@123","role":"admin"}` | second admin, `ADMIN2` |
| D3 | `POST /api/users` `{"name":"Temp User","email":"temp@lab.com","password":"Temp@123","role":"technician"}` | user with no linked records, `TEMP` |
| D4 | `POST /api/labs` `{"name":"Temp Lab","code":"TMP-99","building":"Block T"}` | lab with no linked records |
| D5 | `POST /api/inspections` `{"lab":"<HV01_ID>","template":"<GENERAL_TPL_ID>","inspector":"<INSP2_USER_ID>"}` | scheduled inspection of the second inspector |

To go back to a clean state: run `npm run seed` again, then create D1 to D5 again. All ids change after a seed.

## 7. Limits to remember

- `/api/auth/*`: 50 requests per 15 minutes per IP (login, register and `/me` together). `/api/*`: 1000 per 15 minutes per IP (`backend/app.js`).
- Log in once per role and keep the token (it lasts 7 days by default).
- The app does not set up a rate-limit store, so it uses the default one, which is in memory. Restarting the backend resets it.

## 8. Known environment problems

| Problem | What we do | Evidence |
|---|---|---|
| Frontend `npm ci` fails with ERESOLVE: vite 8.3.5 is outside the peer range of @vitejs/plugin-react 4.7.0 | `npm ci --legacy-peer-deps`. Reported as BUG-001 | `qa/evidence/phase0-frontend-npm-ci.log`, `qa/evidence/phase0-frontend-workaround.log` |
| 1 high severity package (mongoose) reported by npm audit, exploitability not tested | Noted only, not a confirmed vulnerability | `qa/evidence/phase0-npm-audit-backend.log` |
| 1 high severity package (follow-redirects) reported by npm audit in the frontend, exploitability not tested | Noted only, not a confirmed vulnerability | `qa/evidence/phase1-npm-audit-frontend.log` |
| Original project has no tests and no `test` script | Our tests have their own `qa/package.json` | `qa/evidence/phase0-baseline.log` |
| Docker and Sonar scanner are missing | SonarCloud through GitHub Actions, run by a group member | `qa/evidence/phase1-sonar-availability.log` |

Tool versions are recorded in `qa/evidence/phase0-versions.log`.
