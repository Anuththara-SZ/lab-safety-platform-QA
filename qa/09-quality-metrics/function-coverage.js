// Coverage of the two white-box functions, read from qa/coverage/lcov.info (made by npm run test:coverage).
// Run from the qa folder: node 09-quality-metrics/function-coverage.js
const fs = require('fs');
const recs = fs.readFileSync('coverage/lcov.info', 'utf8').split('end_of_record');
for (const [name, file, a, b] of [['calculateResult()', 'backend/models/Inspection.js', 29, 39], ['submitInspection()', 'backend/controllers/inspectionController.js', 63, 90]]) {
  const r = recs.find((x) => x.includes('SF:' + file));
  const inR = (n) => n >= a && n <= b;
  const da = [...r.matchAll(/^DA:(\d+),(\d+)/gm)].filter((m) => inR(+m[1]));
  const br = [...r.matchAll(/^BRDA:(\d+),\d+,\d+,(\S+)/gm)].filter((m) => inR(+m[1]));
  console.log(`${name} lines ${a}-${b}: lines ${da.filter((m) => +m[2] > 0).length}/${da.length}, branches ${br.filter((m) => m[2] !== '-' && +m[2] > 0).length}/${br.length}`);
}
console.log('SF paths relative to repo root: ' + recs.filter((x) => /SF:backend\//.test(x)).length + ' of ' + recs.filter((x) => /SF:/.test(x)).length);
