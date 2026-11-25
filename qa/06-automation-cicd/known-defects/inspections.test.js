const { models, start, stop, seed, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');
const { submit, saved, eight, bodyFor, newInspection, WB_ITEMS } = require('../helpers/inspections');

let d;
beforeAll(() => start());
afterAll(() => stop());

describe('demo data', () => {
  beforeEach(async () => { d = await seedDemo({ plus: true }); });

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toLocaleDateString('en-CA'); // YYYY-MM-DD

  test.each([
    ['TC-INS-02b [reasonable expectation] scheduledDate 2027-02-30 does not exist and is rejected', '2027-02-30'],
    ['BVA-36 [reasonable expectation] scheduledDate 2027-02-29 does not exist and is rejected', '2027-02-29'],
    ['BVA-39 [reasonable expectation] scheduledDate 2028-02-30 does not exist and is rejected', '2028-02-30'],
    ['TC-INS-03 [reasonable expectation] scheduledDate 2020-01-01 is in the past and is rejected', '2020-01-01'],
    ['BVA-29 [reasonable expectation] scheduledDate yesterday is in the past and is rejected', yesterday],
  ])('%s', async (_name, scheduledDate) => {
    const before = await models.Inspection.countDocuments();
    const res = await call('post', '/api/inspections', d.tokens.admin, {
      lab: d.labs['CN-04'], template: d.templates.general, scheduledDate,
    });
    const added = (await models.Inspection.countDocuments()) - before;
    expect({ sent: scheduledDate, status: res.status, savedInspections: added, savedDate: res.body.scheduledDate }).toEqual({
      sent: scheduledDate, status: 400, savedInspections: 0, savedDate: undefined,
    });
  });

  // README section 1: score = passed / (passed + failed). With only N/A this is 0 / 0, so the README is silent.
  describe('TC-INS-05 all items N/A', () => {
    const submitAllNa = async () => submit(d.inspections.ch05, d.tokens.inspector, await bodyFor(d.inspections.ch05, eight('na')));

    test('TC-INS-05.1 [reasonable expectation] all N/A is not reported as score 100 and low risk', async () => {
      const res = await submitAllNa();
      expectStatus(res, 200, 400);
      expect(`status ${res.status}, score=${res.body.score}, risk=${res.body.riskLevel}`).not.toMatch(/score=100|risk=low/);
    });

    test('TC-INS-05.2 [reasonable expectation] after all N/A the last score of the lab is not 100', async () => {
      await submitAllNa();
      const lab = await call('get', `/api/labs/${d.labs['CH-05']}`, d.tokens.inspector);
      expectStatus(lab, 200);
      expect(`lastScore=${lab.body.lastScore}`).not.toBe('lastScore=100');
    });
  });

  test('TC-INS-07 [reasonable expectation] unknown response id is rejected on submit', async () => {
    const id = d.inspections.ch05;
    const body = await bodyFor(id, eight('pass'));
    body.responses.push({ _id: UNKNOWN_ID, result: 'fail', remarks: 'ghost' });
    const res = await submit(id, d.tokens.inspector, body);
    const doc = await saved(id);
    expect({ status: res.status, inspection: doc.status, score: doc.score }).toEqual({ status: 400, inspection: 'scheduled', score: undefined });
  });

  test.each([
    ['TC-INS-08a [reasonable expectation] responses sent as text gives 400, not 500', { responses: 'abc' }],
    ['TC-INS-08b [reasonable expectation] responses sent as an object gives 400, not 500', { responses: { x: 1 } }],
    ['TC-INS-08c / EP-40 [reasonable expectation] null in responses gives 400, not 500', { responses: [null] }],
  ])('%s', async (_name, body) => {
    expectStatus(await submit(d.inspections.ch05, d.tokens.inspector, body), 400);
    expect((await saved(d.inspections.ch05)).status).toBe('scheduled');
  });

  // README section 1, line 37: "View inspections | all | own | completed reports only".
  // Contradiction: README section 4, line 125 says GET /api/inspections/:id is for "any" role.
  // We use section 1, as in the design documents.
  test('TC-INS-09.2 [documented requirement, README s.1 line 37; contradicted by s.4 line 125] inspector cannot open the inspection of another inspector', async () => {
    const res = await call('get', `/api/inspections/${d.inspections.insp2}`, d.tokens.inspector);
    expectStatus(res, 403, 404);
    expect(res.body.responses).toBeUndefined();
  });

  test.each([
    ['DT1-15 [documented requirement, README s.1 line 37; contradicted by s.4 line 125] inspector2 opens a scheduled inspection of another inspector -> 403', 'ch05'],
    ['DT1-16 [documented requirement, README s.1 line 37; contradicted by s.4 line 125] inspector2 opens a completed inspection of another inspector -> 403', 'hv01'],
  ])('%s', async (_name, key) => {
    expectStatus(await call('get', `/api/inspections/${d.inspections[key]}`, d.tokens.inspector2), 403);
  });
});

test('WB-SI-13 / EP-39 [reasonable expectation] responses not an array gives 400, not 500', async () => {
  d = await seed();
  const insp = await newInspection(d, WB_ITEMS);
  expectStatus(await submit(insp.id, d.tokens.inspector, { responses: 'pass' }), 400);
  expect((await saved(insp.id)).status).toBe('scheduled');
});
