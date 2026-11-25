// Summarises a JMeter result file (CSV .jtl) per request and per status code.
// Usage: node summarise-jtl.js <file.jtl> [console.log]
// With the console log it also compares the totals with JMeter's own "summary =" line.
const fs = require('fs');

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// Percentile by the nearest-rank method: the smallest value with at least p % of the values at or below it.
const pct = (sorted, p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];

function stats(list) {
  const t = list.map((s) => s.elapsed).sort((a, b) => a - b);
  const start = Math.min(...list.map((s) => s.start));
  const end = Math.max(...list.map((s) => s.start + s.elapsed));
  const errors = list.filter((s) => !s.ok).length;
  return {
    n: list.length,
    avg: t.reduce((a, b) => a + b, 0) / t.length,
    med: pct(t, 50), p95: pct(t, 95), min: t[0], max: t[t.length - 1],
    secs: (end - start) / 1000,
    tps: list.length / ((end - start) / 1000),
    errors, errPct: (errors / list.length) * 100,
  };
}

const [file, consoleFile] = process.argv.slice(2);
const samples = parseCsv(fs.readFileSync(file, 'utf8')).map((r) => ({
  start: +r.timeStamp, elapsed: +r.elapsed, label: r.label, code: r.responseCode, ok: r.success === 'true', threads: +r.allThreads,
}));
const groups = [['TOTAL', samples]];
const labels = [...new Set(samples.map((s) => s.label))].sort().reverse();
for (const l of labels) {
  const ofLabel = samples.filter((s) => s.label === l);
  groups.push([l, ofLabel]);
  for (const c of [...new Set(ofLabel.map((s) => s.code))].sort()) groups.push([`  ${l} -> ${c}`, ofLabel.filter((s) => s.code === c)]);
}

console.log(`File: ${file.split(/[\\/]/).pop()}`);
console.log(`Started: ${new Date(Math.min(...samples.map((s) => s.start))).toISOString()}`);
console.log(`Most users active at the same moment (allThreads): ${Math.max(...samples.map((s) => s.threads))}`);
console.log('Times in ms. Percentiles: nearest rank. Throughput = requests / (end of last - start of first), per row.\n');
const cols = ['count', 'avg', 'median', 'p95', 'min', 'max', 'req/s', 'errors', 'error %'];
console.log('Request'.padEnd(32) + cols.map((c) => c.padStart(9)).join(''));
for (const [name, list] of groups) {
  const s = stats(list);
  const v = [s.n, s.avg.toFixed(1), s.med, s.p95, s.min, s.max, s.tps.toFixed(1), s.errors, s.errPct.toFixed(2)];
  console.log(name.padEnd(32) + v.map((x) => String(x).padStart(9)).join(''));
}
console.log('\nStatus codes: ' + [...new Set(samples.map((s) => s.code))].sort().map((c) => `${c} = ${samples.filter((s) => s.code === c).length}`).join(', '));

// Do slow reads happen while logins are still being handled?
const loginEnd = Math.max(...samples.filter((s) => s.label.startsWith('POST') && s.ok).map((s) => s.start + s.elapsed));
const slowReads = samples.filter((s) => s.label.startsWith('GET') && s.elapsed > 1000);
console.log(`Reads slower than 1000 ms: ${slowReads.length}, of these started before the last successful login finished: ${slowReads.filter((s) => s.start < loginEnd).length}`);

if (consoleFile) {
  const lines = fs.readFileSync(consoleFile, 'utf8').split(/\r?\n/).filter((l) => /^summary =/.test(l));
  const m = lines.length && lines[lines.length - 1].match(/summary =\s+(\d+) in (\S+) =\s+([\d.]+)\/s Avg:\s+(\d+) Min:\s+(\d+) Max:\s+(\d+) Err:\s+(\d+)/);
  console.log('\nCross-check with JMeter console:');
  if (!m) { console.log('  NO "summary =" LINE FOUND'); process.exit(1); }
  console.log(`  ${lines[lines.length - 1].trim()}`);
  const s = stats(samples);
  const pairs = [['count', s.n, +m[1]], ['avg', Math.floor(s.avg), +m[4]], ['min', s.min, +m[5]], ['max', s.max, +m[6]], ['errors', s.errors, +m[7]]];
  let same = true;
  for (const [k, a, b] of pairs) {
    const ok = k === 'avg' ? Math.abs(s.avg - b) <= 1 : a === b;
    if (!ok) same = false;
    console.log(`  ${k.padEnd(7)} jtl=${k === 'avg' ? s.avg.toFixed(1) : a} console=${b} ${ok ? 'same' : 'DIFFERENT'}`);
  }
  console.log(`  ${'req/s'.padEnd(7)} jtl=${s.tps.toFixed(1)} console=${m[3]} (JMeter measures a slightly different time window)`);
  console.log(`  result: ${same ? 'MATCH' : 'DIFFERENCE FOUND'}`);
}
