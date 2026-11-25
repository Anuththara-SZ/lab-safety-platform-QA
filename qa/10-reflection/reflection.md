# Task 3.10: Reflection on Agile and DevOps practices in our testing

**Shift-left.** The application was already finished, so we could not test during its development. We still moved testing as
early as we could. Before writing any test we read the README and the code and listed unclear requirements. This found
problems without running anything: the README says an inspector sees only "own" inspections in one place and "any" in
another, and it does not say what the score is when every item is N/A. Both later became bugs (BUG-003, BUG-002). Our first
defect, BUG-001, was found while installing the project. A team that checked these points at the start would have paid
much less to fix them.

**Continuous integration.** The original project had no tests and no pipeline. We made a GitHub Actions workflow that
installs everything, runs unit, API, BDD and UI tests with coverage on every push, and can send the result to SonarCloud.
Known defects run in a separate step that is allowed to fail. This keeps the main result useful (red means something new
broke) but does not hide the open bugs. A risk is that people stop looking at a step that always fails, so each of those
tests has a defect report or an entry in the observations table.

**TDD and BDD.** We have to be honest here: our unit tests are test-after, not real TDD. What we did have is the red step,
because 29 checks describe the expected behaviour and fail today. For BUG-004 we also tried a fix in a throwaway copy: two
tests went from red to green and the other 335 still passed. That showed us how useful a failing test is as a definition of
"done". BDD helped in another way. Writing the two Gherkin scenarios in plain words made us take the expected result from
the README and not from the code.

**Defect feedback loop.** Each failure went the same way: test, log, observation, then a bug report with steps, evidence and
a suggested fix. For every bug we wrote if it breaks a documented requirement or only a reasonable expectation. This stopped
us from giving a high severity to everything. Two of our five first suspects (invalid ids, orphan records) did not reproduce,
and we reported that too. The loop is not complete, because our rules did not allow us to change the application. The
life cycle of BUG-004 is therefore marked as simulated.

**What was hard.** The login limit of 50 requests in 15 minutes is good security, but it meant a load test with the planned
numbers had 90% errors. We learned to ask what a test really measures, and we ran it again inside the limits. All tools ran
on one laptop, so our performance numbers are only a rough guide. We also saw that coverage can mislead:
`calculateResult()` has 100% branch coverage and still contains BUG-002.

**What we would do differently.** We would ask the owner to settle unclear requirements first, agree on a "definition of
done" that includes a test, start CI on the first day, and run tests on every pull request before merging. We would also add
frontend component tests, because our tests of the web pages are only three UI cases.
