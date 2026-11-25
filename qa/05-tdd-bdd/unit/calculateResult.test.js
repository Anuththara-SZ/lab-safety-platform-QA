// Unit tests for calculateResult() in backend/models/Inspection.js. No database is used.
// Design: qa/04-white-box/coverage-test-design.md (WB-CR), qa/03-black-box (BVA and DT2).
// When two designs use the same input, one test has both ids.
const Inspection = require('../../../backend/models/Inspection');

// n items with the same result
const items = (n = 0, result, critical = false) =>
  Array.from({ length: n }, (_, i) => ({ text: `${result} ${i + 1}`, result, critical }));

function calculate({ pass, fail, na, pending, criticalPass, criticalFail, criticalNa }) {
  const inspection = new Inspection({
    responses: [
      ...items(pass, 'pass'),
      ...items(fail, 'fail'),
      ...items(na, 'na'),
      ...items(pending, 'pending'),
      ...items(criticalPass, 'pass', true),
      ...items(criticalFail, 'fail', true),
      ...items(criticalNa, 'na', true),
    ],
  });
  inspection.calculateResult();
  return { score: inspection.score, riskLevel: inspection.riskLevel };
}

describe('White-box cases (WB-CR)', () => {
  test.each([
    ['WB-CR-01 all N/A (= BVA-11, DT2-01) (characterisation, README silent)', { na: 5 }, 100, 'low'],
    ['WB-CR-02 critical item fails (= DT2-03)', { pass: 3, criticalFail: 1 }, 75, 'critical'],
    ['WB-CR-03 score below 60 (= DT2-05)', { pass: 1, fail: 1 }, 50, 'high'],
    ['WB-CR-04 score 60 to 79 (= DT2-06)', { pass: 7, fail: 3 }, 70, 'medium'],
    ['WB-CR-05 score 80 or more (= DT2-07)', { pass: 9, fail: 1 }, 90, 'low'],
    ['WB-CR-06 critical item passes', { pass: 3, criticalPass: 1, fail: 1 }, 80, 'low'],
    ['WB-CR-07 score 59 (= BVA-03)', { pass: 59, fail: 41 }, 59, 'high'],
    ['WB-CR-08 score 60 (= BVA-04)', { pass: 3, fail: 2 }, 60, 'medium'],
    ['WB-CR-09 score 79 (= BVA-06)', { pass: 79, fail: 21 }, 79, 'medium'],
    ['WB-CR-10 na and pending ignored', { pass: 3, fail: 1, na: 2, pending: 1 }, 75, 'medium'],
    ['WB-CR-11 empty responses (characterisation, README silent)', {}, 100, 'low'],
    ['WB-CR-12 critical wins over high score (= DT2-04)', { pass: 9, criticalFail: 1 }, 90, 'critical'],
  ])('%s', (_name, input, score, riskLevel) => {
    expect(calculate(input)).toEqual({ score, riskLevel });
  });
});

describe('Boundary values of the score (BVA-01 to BVA-13, the others are WB-CR cases above)', () => {
  test.each([
    ['BVA-01 minimum score 0', { fail: 5 }, 0, 'high'],
    ['BVA-02 just above 0', { pass: 1, fail: 99 }, 1, 'high'],
    ['BVA-05 just above 60', { pass: 61, fail: 39 }, 61, 'medium'],
    ['BVA-07 on 80', { pass: 4, fail: 1 }, 80, 'low'],
    ['BVA-08 just above 80', { pass: 81, fail: 19 }, 81, 'low'],
    ['BVA-09 just below 100', { pass: 99, fail: 1 }, 99, 'low'],
    ['BVA-10 maximum score 100', { pass: 5 }, 100, 'low'],
    ['BVA-12 smallest total, passed', { pass: 1, na: 4 }, 100, 'low'],
    ['BVA-13 smallest total, failed', { fail: 1, na: 4 }, 0, 'high'],
  ])('%s', (_name, input, score, riskLevel) => {
    expect(calculate(input)).toEqual({ score, riskLevel });
  });
});

// Expected risk = strict reading of the README: the raw percentage is compared with 60 and 80.
// The README does not mention rounding, so the exact value of the score is not checked here.
// BVA-15, 17, 18 and 19 fail, so they are in 06-automation-cicd/known-defects.
describe('Rounding near the limits (BVA-14, 16, 20, 21, 22)', () => {
  test.each([
    ['BVA-14 raw 59.49', 47, 32, 'high'],
    ['BVA-16 raw 79.49', 31, 8, 'medium'],
    ['BVA-20 raw 99.5', 199, 1, 'low'],
    ['BVA-21 raw 0.5', 1, 199, 'high'],
    ['BVA-22 raw 0.4975', 1, 200, 'high'],
  ])('%s', (_name, pass, fail, riskLevel) => {
    expect(calculate({ pass, fail }).riskLevel).toBe(riskLevel);
  });
});

describe('Decision table DT2 (the other rules are WB-CR cases above)', () => {
  test('DT2-02 rule R2, 1 pass and 1 critical fail', () => {
    expect(calculate({ pass: 1, criticalFail: 1 })).toEqual({ score: 50, riskLevel: 'critical' });
  });

  test('DT2-08 rule R7, a critical item marked N/A (characterisation, README silent)', () => {
    expect(calculate({ pass: 4, criticalNa: 1 })).toEqual({ score: 100, riskLevel: 'low' });
  });
});
