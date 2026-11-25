# Things only a person can do

Deadline: 25 November 2026, 23:00. Do part A first.

## A. Must do

- [ ] **Group members and task allocation.** Fill in this table, and replace `[Member 1 Name]` etc. in `01-test-plan/test-plan.md`,
      `[Member Name]` in `08-defects/BUG-00X` and the role placeholders in `08-defects/bug-lifecycle.md`.

| Member | Index no. | Tasks (3.1 to 3.10) | Contribution |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |

- [ ] **AI use.** Check the module's AI policy and finish the "AI assistance" line in section 5 of `01-test-plan/test-plan.md`.
- [ ] **Review.** Every member reads their part and can explain it. Rewrite `10-reflection/reflection.md` until it matches your real experience.
- [ ] **Push to GitHub** (commands in part D). Then open **Actions > QA** and wait for the run.
- [ ] **Screenshots of the Actions run** into `qa/evidence/`: the green run, the test step with the counts, the "Known defects" step, the uploaded artifact.
      Then change "GitHub Actions run: NOT EXECUTED" in `qa/README.md`, and phase 5 in `02-stlc-test-cases/stlc-mapping.md`.
      If the run is red, read the log first. This workflow has never run on GitHub.
- [ ] **Create the 6 GitHub Issues** from `08-defects/github-issues/`. Steps are in section 6 of `08-defects/README.md`. Take a screenshot of the list.
- [ ] **Make the zip** after all edits: `bash qa/submission.sh`. Open it once and check it.

## B. SonarCloud (NOT EXECUTED)

- [ ] Follow `09-quality-metrics/sonarcloud-steps.md`.
- [ ] Put the two keys in `sonar-project.properties` **before** you add the `SONAR_TOKEN` secret. With the secret but without the keys, the Sonar step fails.
- [ ] Copy the values into section 5 of `09-quality-metrics/quality-report.md` and take screenshots.

If there is no time, leave the values as NOT EXECUTED. Do not guess them.

## C. Decisions and optional work

- [ ] BUG-002 is rated Major although it only breaks a reasonable expectation. The reason is in `08-defects/README.md` section 2. Agree or change it.
- [ ] BUG-003: the README contradicts itself (line 37 "own", line 125 "any"). Ask the owner, if possible.
- [ ] JMeter was run on one laptop (`07-performance-security/load-test-report.md`). Optional: run it again with the server on another machine.
- [ ] Optional: the login timing comparison, NOT EXECUTED, steps in `07-performance-security/security-checks.md`.
- [ ] Optional: run some cases of `02-stlc-test-cases/test-cases.md` by hand. They were run as automated tests.
- [ ] Optional: add the other observations (`08-defects/README.md` section 4) as GitHub Issues.

## D. Git commands (from the repo root, in Git Bash)

```bash
git status --short                 # only .github/ and qa/ should be listed
git add qa .github/workflows/qa.yml
git diff --cached --name-only      # read the list before you commit
git commit -m "Add QA deliverables for EC4206 STQA project"
git push origin main
```

Use these exact paths and not `git add .`, so that private files and `STQA_Project.zip` are not added by mistake.
