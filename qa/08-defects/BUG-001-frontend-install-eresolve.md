# BUG-001: Frontend dependencies cannot be installed (ERESOLVE conflict)

| Field | Value |
|---|---|
| ID | BUG-001 |
| Type | Build / configuration |
| Title | `npm ci` and `npm install` fail in `frontend/`: vite 8.3.5 is outside the peer range of @vitejs/plugin-react 4.7.0 |
| Requirement basis | **Documented requirement**: README section 3 gives `npm install` in `frontend/` as a setup step (README line 92) |
| Severity | Major (the frontend cannot be set up with the README steps, but a workaround exists) |
| Priority | High (blocks every new developer and the CI pipeline) |
| Environment | Windows 11 Home Single Language 10.0.26200, Node v24.14.0, npm 11.9.0 |
| Found in | Phase 0, environment setup, 2026-11-25 |
| Reported by | [Member Name] |
| Status | New (not fixed, because application files must not be changed) |
| Failing tests | None. Found by running the commands, see Evidence |
| Code location | `frontend/package.json:21` and `:25` |

## Steps to reproduce
1. Clone the repository (no `node_modules` in `frontend/`).
2. `cd frontend`
3. Run `npm ci`. The README (line 92) says `npm install`; that gives the same error.

## Expected result
Dependencies install with exit code 0.

## Actual result
Both commands stop with exit code 1 and `ERESOLVE could not resolve`:

```
While resolving: @vitejs/plugin-react@4.7.0
Found: vite@8.3.5
peer vite@"^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" from @vitejs/plugin-react@4.7.0
```

## Evidence
| Log | What it shows |
|---|---|
| `qa/evidence/phase0-frontend-npm-ci.log` | `npm ci` fails, exit code 1 |
| `qa/evidence/bug-001-npm-install.log` | `npm install --dry-run` on a clean copy fails, exit code 1 |
| `qa/evidence/bug-001-lockfile-check.log` | Versions in the lock file and the peer range |
| `qa/evidence/phase0-frontend-workaround.log` | `npm ci --legacy-peer-deps` and `npm run build` both end with exit code 0 |

## Cause
`frontend/package.json` line 25 asks for `vite ^8.3.5`, and line 21 asks for
`@vitejs/plugin-react ^4.3.1`. The locked plugin version (4.7.0) supports Vite 4 to 7 only.

## Workaround used for testing
`npm ci --legacy-peer-deps`. It changes no files. The build passes with it, but this ignores
the conflict and does not fix it.

## Suggested fix (for the developers)
Use a Vite version the plugin supports (`^7`), or move to a plugin release that supports
Vite 8. Then regenerate `package-lock.json` and run `npm ci` in CI.
