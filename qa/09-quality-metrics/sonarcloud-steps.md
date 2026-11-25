# How to run the SonarCloud scan

Status: **NOT EXECUTED**. A group member must do these steps, because they need our GitHub account.
Screen names on the website may be slightly different.

## A. One-time setup
1. Go to https://sonarcloud.io and log in with GitHub.
2. Import the GitHub organization/account that owns `lab-safety-platform-QA`, then choose that
   repository. Check that the free plan allows it (public repositories are normally free).
3. In the project: **Administration > Analysis Method**, turn **Automatic Analysis OFF**.
   CI analysis and automatic analysis cannot both be on.
4. Copy the **organization key** and **project key** from the project's Information page.
5. Put both values in `qa/09-quality-metrics/sonar-project.properties` (the two `REPLACE_ME` lines).
6. **My Account > Security > Generate Token**. Copy it. Never put it in a file or a commit.
7. On GitHub: repository **Settings > Secrets and variables > Actions > New repository secret**.
   Name: `SONAR_TOKEN`. Value: the token.

## B. Run it
Push any commit. The `qa.yml` workflow runs the tests, creates `qa/coverage/lcov.info`, then scans.
Without the secret the Sonar step is skipped, so the rest of the workflow still works.

Steps used in `qa.yml` (the job needs `env: SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}`, because
GitHub does not allow `secrets` directly inside `if`):

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0   # Sonar needs the full history

# ... install, tests and coverage ...

- name: SonarCloud scan
  if: ${{ env.SONAR_TOKEN != '' }}
  uses: SonarSource/sonarqube-scan-action@v5   # check the latest version
  with:
    args: >
      -Dproject.settings=qa/09-quality-metrics/sonar-project.properties
```

## C. Record the results
From the project **Overview** and **Measures** pages, note these values and take screenshots into
`qa/evidence/`: bugs, vulnerabilities, code smells, duplication %, technical debt, coverage %.
Newer screens may call them Reliability, Security and Maintainability issues.
Then replace NOT EXECUTED in the metrics report.

## D. Alternative: local SonarQube with Docker
Needs Docker Desktop, about 4 GB free memory and several GB of disk.

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
# open http://localhost:9000, log in as admin/admin, change the password,
# create a local project with key lab-safety, and generate a token
docker run --rm -e SONAR_HOST_URL=http://host.docker.internal:9000 -e SONAR_TOKEN=<token> \
  -v "$PWD:/usr/src" sonarsource/sonar-scanner-cli \
  -Dproject.settings=qa/09-quality-metrics/sonar-project.properties -Dsonar.projectKey=lab-safety
```

Run the second command from the repo root, after the tests have created `qa/coverage/lcov.info`.
In Windows PowerShell, put the command on one line and use `${PWD}` instead of `$PWD`.
