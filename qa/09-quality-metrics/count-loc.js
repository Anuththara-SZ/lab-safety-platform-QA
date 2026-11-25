// Counts lines of code for the KLOC value used in defect density.
// Run from the repo root:  node qa/09-quality-metrics/count-loc.js
// Uses the TypeScript-free Babel parser that Jest already installs, so comments
// are found by a real parser (a "//" inside a string is not counted as a comment).
const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');

const root = path.join(__dirname, '..', '..');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : walk(p);
    return /\.jsx?$/.test(e.name) ? [p] : [];
  });

const totals = {};
for (const f of [...walk(path.join(root, 'backend')), ...walk(path.join(root, 'frontend', 'src'))]) {
  const src = fs.readFileSync(f, 'utf8');
  const ast = parse(src, { sourceType: 'unambiguous', plugins: ['jsx'] });
  let text = src;
  for (const c of ast.comments) {
    // blank out the comment text but keep the line breaks
    const blank = src.slice(c.start, c.end).replace(/[^\r\n]/g, ' ');
    text = text.slice(0, c.start) + blank + text.slice(c.end);
  }
  const nonBlank = src.split(/\r?\n/).filter((l) => l.trim()).length;
  // a JSX comment leaves an empty "{ }" behind, which is not code
  const code = text.split(/\r?\n/).filter((l) => l.trim() && !/^\{\s*\}$/.test(l.trim())).length;
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const key = rel === 'backend/seed.js' ? 'seed.js' : rel.startsWith('backend') ? 'backend (without seed.js)' : 'frontend/src';
  totals[key] = totals[key] || { files: 0, nonBlank: 0, code: 0 };
  totals[key].files++;
  totals[key].nonBlank += nonBlank;
  totals[key].code += code;
  console.log(`${String(nonBlank).padStart(5)} ${String(code).padStart(5)}  ${rel}`);
}
console.log('\n(columns above: non-blank lines, code lines without comments)');
console.table(totals);
const product = totals['backend (without seed.js)'].code + totals['frontend/src'].code;
console.log(`KLOC for defect density (backend + frontend/src, no seed.js, no blanks/comments): ${product} lines = ${(product / 1000).toFixed(3)} KLOC`);
