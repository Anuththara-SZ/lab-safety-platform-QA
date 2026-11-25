// Rounding near 60 and 80 (qa/03-black-box/boundary-value-analysis.md, section 2.2). No database.
// README section 1: "high (<60%), medium (<80%), low (>=80%)". Strict reading: 59.5 is below 60.
// The README does not mention rounding, so the owner must confirm the rule.
const Inspection = require('../../../backend/models/Inspection');

const items = (n, result) => Array.from({ length: n }, (_, i) => ({ text: `${result} ${i + 1}`, result, critical: false }));

const BASIS = '[documented requirement, README s.1 line 26, strict reading]';

test.each([
  [`BVA-15 ${BASIS} raw 59.5 is high`, 119, 81, 'high'],
  [`BVA-17 ${BASIS} raw 79.5 is medium`, 159, 41, 'medium'],
  [`BVA-18 ${BASIS} raw 59.52 is high, smallest list that crosses 60`, 25, 17, 'high'],
  [`BVA-19 ${BASIS} raw 79.55 is medium, smallest list that crosses 80`, 35, 9, 'medium'],
])('%s', (_name, pass, fail, riskLevel) => {
  const inspection = new Inspection({ responses: [...items(pass, 'pass'), ...items(fail, 'fail')] });
  inspection.calculateResult();
  expect(`${pass} pass, ${fail} fail: ${inspection.riskLevel}`).toBe(`${pass} pass, ${fail} fail: ${riskLevel}`);
});
