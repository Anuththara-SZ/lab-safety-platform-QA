// Fills the Actual Result and Status columns of the design documents from the saved test logs.
// Run from the qa folder:  node 02-stlc-test-cases/fill-results.js
// A row is filled only when a test with its ID is found in a log. Rows without a test are listed at the end.
const fs = require('fs');
const path = require('path');
const qa = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(qa, f), 'utf8');

const tests = [];
const addJest = (file) => {
  for (const line of read(file).split(/\r?\n/)) {
    const m = line.match(/^\s*([√×✓✕])\s+(.*?)(?:\s+\([\d.]+ m?s\))?$/);
    if (m) tests.push({ ok: m[1] === '√' || m[1] === '✓', name: m[2], log: path.basename(file) });
  }
};
addJest('evidence/phase2-rerun-main.log');
addJest('evidence/phase2-rerun-known-defects.log');
for (const line of read('evidence/phase2-rerun-ui.log').split(/\r?\n/)) {
  const m = line.match(/\[ui-test\]\s+([✔✖])\s+(.*?)\s+\([\d.]+ms\)/);
  if (m) tests.push({ ok: m[1] === '✔', name: m[2], log: 'phase2-rerun-ui.log' });
}

// What really happened for failing checks. Copied from evidence/phase2-defect-observations.md.
const ACTUAL = {
  'TC-AUTH-04': 'c: 500 "Illegal arguments: number, string" (BUG-005). a, b as expected',
  'TC-AUTH-07': '500 instead of 400 (observation O-08)',
  'TC-LAB-04': '500 "req.query.search.replace is not a function" (BUG-005)',
  'TC-LAB-07': 'b: body also has `stack` (observation O-11). a as expected',
  'TC-TPL-04': '1: 200 "Template deleted". 2: 404 (observation O-12). 3 as expected',
  'TC-INS-02': 'b: 201, saved as 2027-03-02 (BUG-006). a as expected',
  'TC-INS-03': '201, saved as 2020-01-01 (observation O-07)',
  'TC-INS-05': '200, score 100, risk low; lab lastScore 100 (BUG-002)',
  'TC-INS-07': '200, inspection completed, score 100, extra id ignored (observation O-05)',
  'TC-INS-08': 'a, b, c: 500 (BUG-005)',
  'TC-INS-09': '2: 200 with inspection data (BUG-003). 1, 3, 4 as expected',
  'TC-INC-05': '200, but resolvedAt changed to the time of the edit (observation O-13)',
  'TC-USR-03': '6: 200, own role changed to technician (BUG-004). 1 to 5 as expected',
  'WB-SI-13': '500 "answers.forEach is not a function" (BUG-005)',
  'EP-39': '500 "answers.forEach is not a function" (BUG-005)',
  'EP-40': '500 "Cannot read properties of null (reading \'_id\')" (BUG-005)',
  'BVA-15': 'medium (observation O-02)',
  'BVA-17': 'low (observation O-02)',
  'BVA-18': 'medium (observation O-02)',
  'BVA-19': 'low (observation O-02)',
  'BVA-29': '201, saved as yesterday (observation O-07)',
  'BVA-36': '201, saved as 2027-03-01 (BUG-006)',
  'BVA-39': '201, saved as 2028-03-01 (BUG-006)',
  'DT1-15': '',
  'DT1-16': '',
};

const find = (id) => {
  const re = new RegExp(`(^|[^A-Za-z0-9])${id}(?!\\d)`);
  return tests.filter((t) => re.test(t.name) && !/variation/.test(t.name));
};

const missing = [];
const stats = {};
const result = (id) => {
  const hit = find(id);
  if (!hit.length) return null;
  const bad = hit.filter((t) => !t.ok);
  if (bad.length) {
    if (ACTUAL[id] === undefined) throw new Error('no actual text for failing ' + id);
    return { actual: ACTUAL[id], status: 'Fail', bad, hit };
  }
  const rec = hit.every((t) => /characterisation/.test(t.name));
  return {
    actual: rec ? 'Current behaviour recorded, as in the code (README silent)' : `As expected (${hit.length} check${hit.length > 1 ? 's' : ''})`,
    status: rec ? 'Recorded' : 'Pass',
    bad,
    hit,
  };
};

const fill = (file, note) => {
  let out = read(file).split(/\r?\n/).map((line) => {
    const m = line.match(/^\| (TC-[A-Z]+-\d+|EP-\d+|BVA-\d+|WB-(?:CR|SI)-\d+|DT[12]-\d+) \|/);
    if (!m || !line.includes('| Not executed |')) return line;
    const id = m[1];
    const r = result(id);
    if (!r) { missing.push(id); return line; }
    const group = id.replace(/-\d+$/, '').replace(/^TC-.*/, 'TC');
    stats[group] = stats[group] || {};
    stats[group][r.status] = (stats[group][r.status] || 0) + 1;
    if (id.startsWith('DT1-')) {
      const passed = r.hit.length - r.bad.length;
      const cell = r.bad.length ? `Fail (${passed} of ${r.hit.length} cells pass): Insp-N got 200 (BUG-003)` : `Pass (${r.hit.length} cells)`;
      return line.replace('| Not executed |', () => `| ${cell} |`);
    }
    return line.replace('| Not executed | Not executed |', () => `| ${r.actual} | ${r.status} |`);
  }).join('\n');
  out = out.replace('Status of all cases: **Not executed**', () => `Status: filled on 2026-11-25. ${note}`);
  fs.writeFileSync(path.join(qa, file), out);
};

const note =
  'Source: `qa/evidence/phase2-rerun-main.log`, `phase2-rerun-known-defects.log` and `phase2-rerun-ui.log`, filled in by `qa/02-stlc-test-cases/fill-results.js`. ' +
  '"Recorded" means the README does not define the case and the test only records what the code does today.';
fill('02-stlc-test-cases/test-cases.md', note);
fill('03-black-box/equivalence-partitioning.md', note);
fill('03-black-box/boundary-value-analysis.md', note);
fill('03-black-box/decision-tables.md', note);
fill('04-white-box/coverage-test-design.md', note);

console.log(`${tests.length} checks read: ${tests.filter((t) => t.ok).length} passed, ${tests.filter((t) => !t.ok).length} failed`);
console.table(stats);
console.log('Rows without a test in the logs:', missing.length ? missing.join(', ') : 'none');
