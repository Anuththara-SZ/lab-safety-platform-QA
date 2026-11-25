# Task 3.7: Load test report (JMeter)

## 1. Result in short

- Inside the rate limits, the API answered **all** requests: 0 % errors in 5 runs with 950 requests each.
- With the numbers from the task (50 users, 10 loops) **90 % of the requests were refused**, because the application allows only 50 logins per
  15 minutes and address. This run tests the limiter, not the capacity.
- The weak point is login: when 50 users log in within 1 second, the 95th percentile is **4230 ms and 4322 ms** (2 runs). About 11 logins per second is the most we saw.
- All numbers are from one laptop. They are not production figures.

## 2. Targets

The README gives no performance target. **These targets were proposed by the AI assistant, to be confirmed by the group (reasonable expectation).** They were written into
`load-test.jmx` and `qa/evidence/phase3-jmeter-environment.log` before the first run.

| Target | Value |
|---|---|
| `GET /api/labs`, 95th percentile | below 1000 ms |
| `POST /api/auth/login`, 95th percentile | below 2000 ms (password hashing is slow on purpose, README s.5 line 151: bcrypt, 10 rounds) |
| Errors while inside the rate limits | 0 % |

## 3. Environment and limits of the test

From `qa/evidence/phase3-jmeter-environment.log`:

| Item | Value |
|---|---|
| Machine | Windows 11 Home 10.0.26200, Intel Core i7-1355U (10 cores, 12 logical), 15.7 GB RAM |
| Backend | `node server.js`, one process, port 5055, Node v24.14.0, NODE_ENV not set |
| Database | MongoDB 8.3.4 on the same laptop, database `lab_safety_qa`, fresh seed before each run (5 labs) |
| JMeter | 5.6.3, Java 21, non-GUI mode |

**Limitations**
- JMeter, backend and MongoDB share one laptop, so they compete for the CPU. There is no real network. Chrome was open (27 processes).
- We did not record the CPU load during the runs.
- Each run is short (7 to 10 seconds), the data is small, all users use one account (`tech@lab.com`), and there is no think time.

## 4. Test plan

`load-test.jmx`: each user logs in (token is read with a JSON extractor, status must be 200) and then reads `GET /api/labs` with the token.
Users, ramp-up, loops and reads are `-J` properties.

**Why the runs look like this.** `backend/app.js` lines 16 and 17 allow 50 requests to `/api/auth` and 1000 requests to `/api` per 15 minutes and address.
The counters are in memory, so the backend was restarted before every run. We did not change the application to switch the limits off.

| Run | Users | Ramp-up | Loops | Reads per login | Requests | Purpose |
|---|---|---|---|---|---|---|
| run1 | 50 | 10 s | 1 | 18 | 50 logins + 900 reads = 950 | Normal use inside the limits |
| run1b, run1c | same | same | same | same | 950 each | Repeats, to see the variance |
| run2 | 50 | 10 s | 10 | 1 | 500 logins + 500 reads = 1000 | Task numbers, limiter active |
| run3, run3b (extra) | 50 | 1 s | 1 | 18 | 950 each | All 50 users at the same moment, inside the limits |

In run2 a user whose login fails has no token. JMeter then sends `Bearer NO_TOKEN`, so the read gets 401. This is wanted in the test design.

### Commands
Git Bash, in `qa/07-performance-security`. The script seeds `lab_safety_qa`, starts the backend, runs JMeter, stops the backend and writes the summary.

```bash
export JMETER="<jmeter folder>/bin/jmeter.bat"
bash scripts/run-load-test.sh run1  50 10 1 18
bash scripts/run-load-test.sh run1b 50 10 1 18
bash scripts/run-load-test.sh run1c 50 10 1 18
bash scripts/run-load-test.sh run2  50 10 10 1
bash scripts/run-load-test.sh run3  50 1 1 18
bash scripts/run-load-test.sh run3b 50 1 1 18
```

The JMeter command inside (example run1; in the console logs the `-l` and `-j` paths are shortened):

```bash
jmeter -n -t load-test.jmx -Jhost=127.0.0.1 -Jport=5055 -Jusers=50 -Jramp=10 -Jloops=1 -Jgets=18 \
  -Jjmeter.save.saveservice.output_format=csv -Jjmeter.save.saveservice.response_data=false \
  -Jjmeter.save.saveservice.url=false -l ../evidence/phase3-jmeter-run1.jtl -j <temp folder>/jmeter.log
node summarise-jtl.js ../evidence/phase3-jmeter-run1.jtl ../evidence/phase3-jmeter-run1-console.log
```

## 5. Results

All times in ms. Source: `qa/evidence/phase3-jmeter-<run>-summary.log`, made from `phase3-jmeter-<run>.jtl`.
p95 = 95th percentile (nearest rank).

### 5.1 Inside the limits

| Run | Request | Count | Avg | Median | p95 | Min | Max | Req/s | Error % | Most users active at once |
|---|---|---|---|---|---|---|---|---|---|---|
| run1 | Login | 50 | 145.7 | 155 | 200 | 83 | 215 | 5.1 | 0.00 | 15 |
| | GET labs | 900 | 67.6 | 34 | 181 | 3 | 360 | 93.3 | 0.00 | |
| | **Total** | 950 | 71.7 | 40 | 186 | 3 | 360 | 96.5 | **0.00** | |
| run1b | Login | 50 | 97.3 | 94 | 116 | 81 | 147 | 5.1 | 0.00 | 4 |
| | GET labs | 900 | 5.4 | 4 | 10 | 2 | 94 | 92.9 | 0.00 | |
| | **Total** | 950 | 10.2 | 4 | 86 | 2 | 147 | 96.4 | **0.00** | |
| run1c | Login | 50 | 156.3 | 154 | 205 | 125 | 251 | 5.1 | 0.00 | 11 |
| | GET labs | 900 | 73.8 | 40 | 166 | 5 | 350 | 91.6 | 0.00 | |
| | **Total** | 950 | 78.1 | 42 | 168 | 5 | 350 | 95.0 | **0.00** | |
| run3 | Login | 50 | 3280.9 | 3697 | **4230** | 821 | 4325 | 11.1 | 0.00 | 50 |
| | GET labs | 900 | 173.5 | 127 | 345 | 12 | 3689 | 152.6 | 0.00 | |
| | **Total** | 950 | 337.0 | 129 | 3443 | 12 | 4325 | 139.1 | **0.00** | |
| run3b | Login | 50 | 2885.7 | 3186 | **4322** | 545 | 4444 | 10.9 | 0.00 | 50 |
| | GET labs | 900 | 210.3 | 126 | 461 | 40 | 3944 | 139.2 | 0.00 | |
| | **Total** | 950 | 351.1 | 130 | 2916 | 40 | 4444 | 133.9 | **0.00** | |

### 5.2 Run2, limiter active

| Request and status | Count | Avg | Median | p95 | Min | Max | Req/s |
|---|---|---|---|---|---|---|---|
| Login -> 200 | 50 | 480.6 | 434 | 927 | 138 | 1134 | 11.1 |
| Login -> 429 | **450** | 10.3 | 5 | 21 | 0 | 336 | 79.3 |
| GET labs -> 200 | 50 | 600.3 | 538 | 1128 | 18 | 1490 | 11.3 |
| GET labs -> 401 (sent without a valid token) | **450** | 9.4 | 4 | 21 | 0 | 272 | 81.7 |
| **Total** | 1000 | 62.9 | 7 | 514 | 0 | 1490 | 102.6 |

Status codes: 200 = 100, 401 = 450, 429 = 450. Errors: 900 of 1000 = **90.00 %**. Most users active at once: 24.

### 5.3 Cross-check

| Check | Result |
|---|---|
| Our script against JMeter's own `summary =` line (count, avg, min, max, errors) | MATCH in all 6 runs (end of each summary log) |
| Backend log (morgan) against JMeter | Same counts in all 6 runs, for example run2: login 200 = 50, login 429 = 450, GET 200 = 50, GET 401 = 450 (console logs) |
| JMeter exit code | 0 in all 6 runs |

## 6. How to read the numbers

1. **Throughput of run1 is set by our test, not by the server.** 5 users start per second and each sends 19 requests, so about 95 requests per second. It was
   95.0 to 96.5 in all three runs, although the average time changed from 10.2 to 78.1 ms. It is not the capacity.
2. **"50 users" is not 50 at the same time.** In run1 the users are so quick that only 4 to 15 were active at once. Run3 was added for this reason (50 active).
3. **Run2 measures the limiter.** Exactly 50 logins passed, so the limiter also counts correctly when many users come together. The average of 62.9 ms looks
   good, but 90 % of the answers are quick refusals: in the second half of the run JMeter counted 845 requests with 844 errors and an average of 6 ms (console log).
   So the times must be read per status code, as in 5.2.
4. **Login is the slow part.** A single login took at least 81 ms (run1b) when the server was not busy. In the three runs where more users wanted to log in than the server could
   handle (run2, run3, run3b) the successful logins ran at 11.1, 11.1 and 10.9 per second. Our explanation (not profiled): `bcryptjs` is a pure JavaScript package and all
   requests share one Node process. Then 1 s / 0.081 s is about 12 logins per second, close to what we saw. Reads that arrive at the same time wait too: run3 had 9 and run3b had 38 reads slower than
   1000 ms, and all of them started before the last login was finished (summary logs).
5. **Variance is large.** The same test gave an average of 71.7, 10.2 and 78.1 ms. We do not know the reason, because we did not record the CPU load. We use the worst run for the targets.

## 7. Compared with our targets

| Target | run1 | run1b | run1c | run2 (200 only) | run3 | run3b | Met? |
|---|---|---|---|---|---|---|---|
| GET labs p95 < 1000 ms | 181 | 10 | 166 | **1128** | 345 | 461 | Yes inside the limits (run1, run3). In run2 no, but only 50 samples and many refused requests at the same time |
| Login p95 < 2000 ms | 200 | 116 | 205 | 927 | **4230** | **4322** | Yes for arrival over 10 s, **no when 50 users log in within 1 s** |
| 0 % errors inside the limits | 0 | 0 | 0 | does not apply | 0 | 0 | Yes |

The targets were proposed by the AI assistant, to be confirmed by the group, so a missed target is an **observation**, not a defect. No bug report was made from this test.

## 8. What the limits hide

- **Real capacity is unknown.** With at most 1000 requests per 15 minutes and address we could only look at about 10 seconds. We cannot say how many users the system
  can handle, or what happens after an hour. Memory and long runs were not tested.
- **The limit is per address.** In a real laboratory many users can share one public address. Then 50 logins per 15 minutes is a limit for the whole group (`security-checks.md`, A07-07).
  Run1 already used 950 of the 1000 allowed requests with only 19 requests per user.
- Only one read endpoint was tested. The dashboard (several database queries) and all write requests were not load tested.

## 9. Recommendations (for the developers, not implemented by us)

1. Make both limits configurable (environment variable), so that a test environment can run a real capacity test with more load and longer time.
2. Count failed logins only (`skipSuccessfulRequests` in express-rate-limit) or count per address **and** account, and keep `/api/auth/me` out of the strict limit.
3. Try the native `bcrypt` package or a worker thread for hashing and repeat run3. Keep 10 rounds: fewer rounds would be faster but less safe.
4. Repeat the test with JMeter on a second machine, record the CPU load, and add the dashboard and write requests.

## 10. Evidence

| File in `qa/evidence` | Content |
|---|---|
| `phase3-jmeter-environment.log` | Machine, versions, targets (before the first run) |
| `phase3-jmeter-<run>.jtl` | Raw JMeter results (CSV, no response bodies) |
| `phase3-jmeter-<run>-console.log` | Seed, command, JMeter console, request counts from the backend log |
| `phase3-jmeter-<run>-jmeter.log` | JMeter log |
| `phase3-jmeter-<run>-summary.log` | Output of `summarise-jtl.js` with the cross-check |

`<run>` = run1, run1b, run1c, run2, run3, run3b. Local paths, the computer name and the network address are masked in the text logs.
After the tests the backend was stopped and only the database `lab_safety_qa` was dropped (`phase3-task37-cleanup.log`).
