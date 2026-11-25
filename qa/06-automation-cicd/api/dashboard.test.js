// Dashboard (README section 1: KPIs, score trend, risk chart, incident chart, labs overdue > 90 days).
// The design documents have no own case for the numbers, so these tests have DASH ids.
// Who may open the dashboard is tested in permissions.test.js (DT1-05). DASH-06 fails, so it is in known-defects.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo(); });
afterAll(() => stop());

async function dashboard(who = 'admin') {
  const res = await call('get', '/api/dashboard', d.tokens[who]);
  expectStatus(res, 200);
  return res.body;
}
const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000);

test('DASH-01 totals are the same as the demo data', async () => {
  // scores 88, 100, 63, 88 -> average 84.75
  expect((await dashboard()).totals).toEqual({
    activeLabs: 5, scheduledInspections: 1, completedInspections: 4, openIncidents: 2, averageScore: 85,
  });
});

test('DASH-02 inspections by risk and incidents by severity', async () => {
  const body = await dashboard();
  expect(body.inspectionsByRisk).toEqual({ low: 3, critical: 1 });
  expect(body.incidentsBySeverity).toEqual({ low: 1, medium: 1, high: 1 });
});

test('DASH-03 score trend is ordered from old to new', async () => {
  const trend = (await dashboard()).scoreTrend.map((t) => [t.lab, t.score]);
  expect(trend).toEqual([['PE-03', 63], ['EL-02', 100], ['HV-01', 88], ['CN-04', 88]]);
});

test('DASH-04 overdue: never inspected or more than 90 days ago, only active labs', async () => {
  const set = (code, change) => models.Lab.updateOne({ code }, change);
  await set('HV-01', { lastInspectionDate: daysAgo(91) });
  await set('EL-02', { lastInspectionDate: daysAgo(89) });
  await set('PE-03', { lastInspectionDate: daysAgo(200), status: 'closed' });
  const body = await dashboard();
  expect(body.overdueDays).toBe(90);
  expect(body.overdueLabs.map((l) => l.code).sort()).toEqual(['CH-05', 'HV-01']); // CH-05 was never inspected
  expect(body.totals.activeLabs).toBe(4);
});

test('DASH-05 empty database gives zeros and no error', async () => {
  await Promise.all([models.Lab, models.Inspection, models.Incident].map((m) => m.deleteMany({})));
  const body = await dashboard();
  expect(body.totals).toEqual({ activeLabs: 0, scheduledInspections: 0, completedInspections: 0, openIncidents: 0, averageScore: 0 });
  expect(body.scoreTrend).toEqual([]);
});
