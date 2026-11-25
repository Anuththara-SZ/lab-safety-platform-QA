// Checks that the report and the QA documents agree with the logs in qa/evidence.
// Run from the repo root:  node qa/consistency-check.js      (exit code 1 if something does not match)
const fs = require('fs');
const path = require('path');
const qa = __dirname;
const rd = (f) => fs.readFileSync(path.join(qa, f), 'utf8').replace(/\r\n/g, '\n').replace(/\x1b\[[0-9;]*m/g, '');
const log = (f) => rd('evidence/' + f);
const md = rd('final-report.md');
let n = 0, bad = 0;
const groups = {};
let group = '';
const ok = (cond, what) => { n++; groups[group] = groups[group] || [0, 0]; groups[group][0]++; if (!cond) { bad++; groups[group][1]++; console.log('MISMATCH', group, '|', what); } };
const row = (re) => (md.match(re) || [])[1];

// A. JMeter tables in the report against the summary logs
group = 'A. JMeter tables';
const fields = (s, key) => s.split('\n').find((l) => l.trim().startsWith(key)).trim().slice(key.length).trim().split(/\s+/);
for (const run of ['run1', 'run1b', 'run1c', 'run3', 'run3b']) {
  const s = log(`phase3-jmeter-${run}-summary.log`);
  const active = s.match(/allThreads\): (\d+)/)[1];
  for (const [label, key] of [['Login', 'POST /api/auth/login '], ['GET labs', 'GET /api/labs ']]) {
    const f = fields(s, key); // count avg median p95 min max req/s errors error%
    const r = row(new RegExp(`^\\| ${run} \\| ${label} \\| (.*) \\|$`, 'm'));
    ok(r && r.replace(/\*/g, '') === [f[0], f[1], f[2], f[3], f[5], f[6], f[8], active].join(' | '), `${run} ${label}: ${r}`);
  }
}
const s2 = log('phase3-jmeter-run2-summary.log');
for (const [label, key] of [['Login, 200', 'POST /api/auth/login -> 200'], ['Login, 429', 'POST /api/auth/login -> 429'], ['GET labs, 200', 'GET /api/labs -> 200'], ['GET labs, 401 \\(no valid token\\)', 'GET /api/labs -> 401']]) {
  const f = fields(s2, key);
  const r = row(new RegExp(`^\\| ${label} \\| (.*) \\|$`, 'm'));
  ok(r === [f[0], f[1], f[2], f[3], f[5]].join(' | '), `run2 ${label}: ${r}`);
}

// B. Test counts, coverage, metrics
group = 'B. Counts and metrics';
const has = (f, t) => ok(log(f).includes(t), `${f}: ${t}`);
for (const f of ['phase2-rerun-main.log', 'phase4-coverage.log', 'phase5-rerun-main.log']) has(f, '335 passed, 335 total');
has('phase2-jest-all-first-run.log', '28 failed, 335 passed');
for (const f of ['phase2-rerun-known-defects.log', 'phase5-rerun-known-defects.log']) has(f, '29 failed, 29 total');
has('phase2-rerun-bdd.log', '2 scenarios (2 passed)'); has('phase2-rerun-bdd.log', '16 steps (16 passed)');
has('phase2-rerun-ui.log', 'pass 3'); has('phase2-rerun-ui.log', 'fail 0');
for (const t of ['447/474 94.3', '153/180 85', '62/64 96.87', '413/426 96.94', 'lines 10/10, branches 10/10', 'lines 22/22, branches 22/22']) has('phase4-function-coverage.log', t);
for (const t of ['94.3% (447/474)', '85% (153/180)', '96.87% (62/64)', '96.94% (413/426)']) ok(md.includes(t), 'report: ' + t);
for (const t of ['6 / 2.689 = 2.23', '5 / 2.689 = 1.86', '5 / 0.697 = 7.17', '16 / 2.689 = 5.95']) { has('phase4-defect-density.log', t); ok(t.split(' = ').every((x) => md.includes(x)), 'report: ' + t); }
has('phase4-loc.log', '2689 lines = 2.689 KLOC');
has('phase1-jscpd.log', '4.92%'); has('phase1-jscpd.log', '4.86%');
for (const t of ['10.0.26200', '157.0.8103.80', 'v24.14.0', '11.9.0', '8.3.4', '5.6.3', '30.5.2', '7.3.2', '11.4.0', '13.3.0', '4.51.0', '21.0.12.1']) { has('phase0-versions.log', t); ok(md.includes(t), 'report: ' + t); }

// C. Every ID row in the report exists in the logs
group = 'C. IDs exist in the logs';
for (const [f, p] of [['phase3-security-a01.log', 'A01'], ['phase3-security-a07.log', 'A07']]) for (const m of md.matchAll(new RegExp(`^\\| (${p}-\\d+\\w?)`, 'gm'))) ok(log(f).includes(m[1]), m[1]);
const all = log('phase5-rerun-main.log') + log('phase5-rerun-known-defects.log');
for (const m of md.matchAll(/^\| ((?:EP|BVA|WB-CR|WB-SI|DT1)-\d+) \|/gm)) ok(new RegExp(m[1] + '(?!\\d)').test(all), m[1]);

// D. Status column of every design row against the re-run logs
group = 'D. Status of design rows';
const tests = [];
for (const f of ['phase5-rerun-main.log', 'phase5-rerun-known-defects.log']) for (const l of log(f).split('\n')) { const m = l.match(/^\s*([√×✓✕])\s+(.*)$/); if (m) tests.push({ ok: /[√✓]/.test(m[1]), name: m[2] }); }
for (const l of log('phase2-rerun-ui.log').split('\n')) { const m = l.match(/\[ui-test\]\s+([✔✖])\s+(.*)$/); if (m) tests.push({ ok: m[1] === '✔', name: m[2] }); }
const count = {};
const status = {};
for (const f of ['02-stlc-test-cases/test-cases.md', '03-black-box/equivalence-partitioning.md', '03-black-box/boundary-value-analysis.md', '03-black-box/decision-tables.md', '04-white-box/coverage-test-design.md']) {
  let cols = {};
  for (const l of rd(f).split('\n')) {
    if (!l.startsWith('|')) cols = {};
    const c = l.split(/(?<!\\)\|/).map((x) => x.trim());
    if (c[1] === 'ID') cols = Object.fromEntries(c.map((h, i) => [h, i]));
    else if (cols.Status && /^(TC-|EP-|BVA-|WB-|DT[12]-)/.test(c[1] || '')) {
      const id = c[1];
      const hit = tests.filter((t) => new RegExp(`(^|[^A-Za-z0-9])${id}(?!\\d)`).test(t.name) && !/variation/.test(t.name));
      const want = !hit.length ? 'no test' : hit.some((t) => !t.ok) ? 'Fail' : hit.every((t) => /characterisation, README silent/.test(t.name)) ? 'Recorded' : 'Pass';
      const got = c[cols.Status].split(' ')[0];
      status[id] = got;
      ok(got === want, `${id}: document "${got}", log "${want}"`);
      const g = id.startsWith('TC') ? 'TC' : id.replace(/-\d+$/, '');
      count[g] = count[g] || { Pass: 0, Fail: 0, Recorded: 0 }; count[g][got]++;
    }
  }
}
const tc = (g) => `${count[g].Pass} | ${count[g].Fail} | ${count[g].Recorded}`;
ok(md.includes(`| Equivalence partitioning | 42 | ${tc('EP')} |`), 'report EP counts');
ok(md.includes(`| Boundary value analysis | 40 | ${tc('BVA')} |`), 'report BVA counts');
ok(md.includes(`| Decision table DT1, role x action | 29 | ${tc('DT1')} |`), 'report DT1 counts');
ok(md.includes(`| Decision table DT2, risk level | 8 | ${tc('DT2')} |`), 'report DT2 counts');
ok(md.includes(`| **Total** | | **45** | **${count.TC.Pass}** | **${count.TC.Fail}** | |`), 'report TC counts');

// E. The four corrections
group = 'E. Four corrections';
const bva = rd('03-black-box/boundary-value-analysis.md'), obs = log('phase2-defect-observations.md'), cases = rd('02-stlc-test-cases/test-cases.md'), def = rd('08-defects/README.md');
const bva29 = bva.match(/^\| BVA-29 .*$/m)[0];
ok(/400 \(\*\*reasonable expectation\*\*/.test(bva29) && !/Not specified/.test(bva29), 'BVA-29 design');
ok(/× BVA-29 \[reasonable expectation\]/.test(all) && status['BVA-29'] === 'Fail', 'BVA-29 test and status');
ok(/BVA-29 .*reasonable expectation/.test(obs), 'BVA-29 observations');
ok(/O-07 .*Reasonable expectation .*BVA-29/.test(def) && /^\| O-07 .*Reasonable expectation .*BVA-29/m.test(md), 'BVA-29 defect index and report');
ok(!/\[VERIFY\] (BVA-29|EP-02|TC-LAB-07b)/.test(md), 'report has no open mark for points 1 to 3');
ok(status['EP-02'] === 'Pass' && /√ EP-02 /.test(all), 'EP-02 status');
ok(!/\(12, README silent\)|include 12 |these 12/.test(md + rd('09-quality-metrics/quality-report.md')), 'old count 12');
ok(tests.filter((t) => /characterisation, README silent/.test(t.name)).length === 11 && /include 11 checks/.test(md) && /include 11 that/.test(rd('09-quality-metrics/quality-report.md')), 'count 11 of record-only checks');
ok(/× TC-LAB-07b \[reasonable expectation/.test(all) && !/TC-LAB-07b \[documented/.test(all + rd('06-automation-cicd/known-defects/labs.test.js')), 'TC-LAB-07b test name');
ok(/^\| TC-LAB-07 .*b: reasonable expectation/m.test(cases), 'TC-LAB-07b test case');
ok(/### O-11[\s\S]*?Basis: \*\*Reasonable expectation\*\*/.test(obs), 'TC-LAB-07b observations');
ok(/^\| O-11 .*\| Reasonable expectation/m.test(def) && /^\| O-11 .*\| Reasonable expectation \| TC-LAB-07b/m.test(md), 'TC-LAB-07b defect index and report');
ok(/TC-LAB-07b/.test(rd('02-stlc-test-cases/stlc-mapping.md').match(/^\| G7 .*$/m)[0]), 'TC-LAB-07b gap list');
const kd = log('phase5-rerun-known-defects.log').split('\n').filter((l) => /^\s*[×✕] /.test(l));
ok(kd.filter((l) => l.includes('[reasonable expectation')).length === 22 && md.includes('22 of 29 are reasonable expectations'), '22 reasonable expectations');
ok(kd.filter((l) => l.includes('[documented requirement')).length === 7 && md.includes('The other 7 are marked as documented'), '7 documented requirements');
const list = md.match(/\*\*b\) Failing known-defect checks[\s\S]*?The other 7/)[0];
for (const l of kd.filter((x) => x.includes('[reasonable expectation'))) { const id = l.match(/[×✕] (\S+)/)[1]; ok(list.includes(id), `report list b) has ${id}`); }
const P = 'proposed by the AI assistant, to be confirmed by the group';
for (const f of ['evidence/phase3-jmeter-environment.log', '07-performance-security/load-test.jmx', '07-performance-security/load-test-report.md', '01-test-plan/test-plan.md', 'final-report.md']) ok(rd(f).includes(P), `target wording in ${f}`);
for (const f of ['evidence/phase3-jmeter-environment.log', '07-performance-security/load-test.jmx', '07-performance-security/load-test-report.md', '01-test-plan/test-plan.md', 'final-report.md']) ok(!/(?:Targets|targets were) set by the group|the group sets one|targets are our(?: own)? assumption/.test(rd(f).replace(/^Note added.*$/m, '')), `old target wording in ${f}`);
for (const t of ['GET /api/labs p95 < 1000 ms; POST /api/auth/login p95 < 2000 ms; 0 % errors']) has('phase3-jmeter-environment.log', t);

// F. Links and evidence paths in all documents
group = 'F. Links and paths';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (['node_modules', 'coverage'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(qa).filter((x) => x.endsWith('.md'))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\]\((?!https?:|#)([^)\s]+)\)/g)) ok(fs.existsSync(path.join(path.dirname(f), m[1].split('#')[0])), `${path.basename(f)} link ${m[1]}`);
  for (const m of s.matchAll(/`((?:qa\/|phase\d-|bug-001-)[A-Za-z0-9_.\/-]+\.(?:log|md|js|jsx|jtl|jmx|png|yml|properties|json))`/g)) ok(m[1] === 'phase5-consistency-check.log' || fs.existsSync(m[1].startsWith('qa/') ? path.join(qa, '..', m[1]) : path.join(qa, 'evidence', m[1])), `${path.basename(f)} path ${m[1]}`);
}
group = 'G. Evidence index';
for (const f of fs.readdirSync(path.join(qa, 'evidence'))) if (!/jmeter-run/.test(f) && fs.statSync(path.join(qa, 'evidence', f)).isFile()) ok(md.includes('`' + f + '`'), `${f} is named in the report`);

for (const [g, [c, b]] of Object.entries(groups)) console.log(`${g}: ${c} checks, ${b} mismatches`);
console.log(`TOTAL: ${n} checks, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
