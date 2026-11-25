// TC-INS-01 to TC-INS-09, WB-SI-01 to WB-SI-16, EP-27 to EP-42 and BVA-29 to BVA-40.
// These fail, so they are in known-defects: TC-INS-02b, 03, 05, 07, 08 (EP-40), 09.2, WB-SI-13 (EP-39), BVA-29, 36, 39.
const { models, start, stop, seed, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');
const { submit, saved, eight, bodyFor, newInspection, WB_ITEMS } = require('../helpers/inspections');

let d;
beforeAll(() => start());
afterAll(() => stop());

const aMinuteAgo = () => Date.now() - 60 * 1000;

describe('Test cases TC-INS (demo data)', () => {
  beforeEach(async () => { d = await seedDemo({ plus: true }); });

  const schedule = (who, extra = {}) =>
    call('post', '/api/inspections', d.tokens[who], { lab: d.labs['CN-04'], template: d.templates.general, ...extra });

  describe('TC-INS-01 scheduling follows the assignment rules', () => {
    test('TC-INS-01.1 admin assigns an inspector', async () => {
      const res = await schedule('admin', { inspector: d.users.inspector._id, scheduledDate: '2027-01-15' });
      expectStatus(res, 201);
      expect(res.body).toMatchObject({ status: 'scheduled', inspector: { name: 'Nimal Perera' } });
      expect(res.body.responses.map((r) => r.result)).toEqual(eight('pending'));
    });

    test('TC-INS-01.2 inspector cannot assign another inspector', async () => {
      const inspector2 = d.users.inspector2._id;
      const before = await models.Inspection.countDocuments({ inspector: inspector2 });
      const res = await schedule('inspector', { inspector: inspector2, scheduledDate: '2027-01-15' });
      expectStatus(res, 201, 403);
      if (res.status === 201) expect(res.body.inspector.name).toBe('Nimal Perera');
      expect(await models.Inspection.countDocuments({ inspector: inspector2 })).toBe(before);
    });

    test('TC-INS-01.3 a technician cannot be assigned', async () => {
      expectStatus(await schedule('admin', { inspector: d.users.technician._id, scheduledDate: '2027-01-15' }), 400);
    });
  });

  describe('TC-INS-02 invalid scheduled date is rejected', () => {
    test.each([
      ['TC-INS-02a / BVA-32 not a date', 'not-a-date'],
      ['BVA-40 2027-02-32 does not exist', '2027-02-32'],
    ])('%s', async (_name, scheduledDate) => {
      const before = await models.Inspection.countDocuments();
      const res = await schedule('admin', { scheduledDate });
      expectStatus(res, 400);
      expect(res.body.message).toBeTruthy();
      expect(await models.Inspection.countDocuments()).toBe(before);
    });
  });

  describe('Valid scheduled dates', () => {
    const day = (offset) => new Date(Date.now() + offset * 24 * 3600 * 1000).toLocaleDateString('en-CA');
    test.each([
      ['BVA-30 today', day(0)],
      ['BVA-31 tomorrow', day(1)],
      ['BVA-35 last day of February, normal year', '2027-02-28'],
      ['BVA-37 first day of March', '2027-03-01'],
      ['BVA-38 valid leap day', '2028-02-29'],
    ])('%s', async (_name, scheduledDate) => {
      const res = await schedule('admin', { scheduledDate });
      expectStatus(res, 201);
      expect(res.body.scheduledDate.slice(0, 10)).toBe(scheduledDate);
    });

    test.each([
      ['BVA-33 missing, time of the request is used', {}],
      ['BVA-34 empty text, time of the request is used (characterisation, README silent)', { scheduledDate: '' }],
    ])('%s', async (_name, extra) => {
      const res = await schedule('admin', extra);
      expectStatus(res, 201);
      expect(Date.parse(res.body.scheduledDate)).toBeGreaterThan(aMinuteAgo());
    });
  });

  describe('TC-INS-04 score and risk level are calculated correctly', () => {
    test('TC-INS-04.1, 04.2 4 of 5 passed, N/A ignored, lab is updated', async () => {
      const id = d.inspections.ch05;
      const res = await submit(id, d.tokens.inspector, await bodyFor(id, ['pass', 'pass', 'pass', 'pass', 'fail', 'na', 'na', 'na']));
      expectStatus(res, 200);
      expect(res.body).toMatchObject({ status: 'completed', score: 80, riskLevel: 'low' });
      const lab = await call('get', `/api/labs/${d.labs['CH-05']}`, d.tokens.inspector);
      expect(lab.body.lastScore).toBe(80);
      expect(Date.parse(lab.body.lastInspectionDate)).toBeGreaterThan(aMinuteAgo());
    });

    test('TC-INS-04.3, 04.4 a failed critical item gives critical risk', async () => {
      const created = await schedule('inspector', { lab: d.labs['CH-05'] });
      expectStatus(created, 201);
      const id = created.body._id;
      const res = await submit(id, d.tokens.inspector, await bodyFor(id, ['fail', 'pass', 'pass', 'pass', 'pass', 'na', 'na', 'na']));
      expectStatus(res, 200);
      expect(res.body).toMatchObject({ score: 80, riskLevel: 'critical' });
    });
  });

  describe('TC-INS-06 incomplete or repeated submit is rejected', () => {
    test('TC-INS-06a item 8 left out', async () => {
      const id = d.inspections.ch05;
      expectStatus(await submit(id, d.tokens.inspector, await bodyFor(id, eight('pass').slice(0, 7))), 400);
      expect((await saved(id)).status).toBe('scheduled');
    });

    test('TC-INS-06b failed item without remarks', async () => {
      const id = d.inspections.ch05;
      const body = await bodyFor(id, ['pass', 'pass', 'pass', 'pass', 'fail', 'pass', 'pass', 'pass'], '');
      expectStatus(await submit(id, d.tokens.inspector, body), 400);
      expect((await saved(id)).status).toBe('scheduled');
    });

    test('TC-INS-06c already completed', async () => {
      const id = d.inspections.hv01;
      const before = await saved(id);
      expectStatus(await submit(id, d.tokens.inspector, await bodyFor(id, eight('pass'))), 400, 409);
      expect(await saved(id)).toEqual(before);
    });
  });

  describe('TC-INS-09 inspections are visible only to the right role', () => {
    test('TC-INS-09.1 inspector sees only own inspections in the list', async () => {
      const res = await call('get', '/api/inspections', d.tokens.inspector);
      expectStatus(res, 200);
      expect(res.body.map((i) => i.inspector.name)).toEqual(Array(5).fill('Nimal Perera'));
    });

    test('TC-INS-09.3 technician sees only completed inspections in the list', async () => {
      const res = await call('get', '/api/inspections', d.tokens.technician);
      expectStatus(res, 200);
      expect(res.body.map((i) => i.status)).toEqual(Array(4).fill('completed'));
    });

    test('TC-INS-09.4 technician cannot open a scheduled inspection', async () => {
      expectStatus(await call('get', `/api/inspections/${d.inspections.ch05}`, d.tokens.technician), 403);
    });
  });
});

describe('White-box cases WB-SI for submitInspection()', () => {
  let insp;
  beforeEach(async () => {
    d = await seed();
    insp = await newInspection(d, WB_ITEMS);
  });

  const allPass = () => ({ responses: insp.answers(['pass'], ['pass'], ['pass']) });
  const asA = (body) => submit(insp.id, d.tokens.inspector, body);
  const expectError = (res, status, message) => {
    expectStatus(res, status);
    expect(res.body.message).toContain(message);
  };

  test('WB-SI-01 inspection not found (DT1-B R3)', async () => {
    expectError(await submit(UNKNOWN_ID, d.tokens.inspector, allPass()), 404, 'Inspection not found');
  });

  test('WB-SI-02 already completed (DT1-B R4)', async () => {
    expectStatus(await asA(allPass()), 200);
    expectError(await asA(allPass()), 400, 'Inspection already completed');
  });

  test('WB-SI-03 not assigned inspector (DT1-B R5)', async () => {
    const res = await submit(insp.id, d.tokens.inspector2, allPass());
    expectError(res, 403, 'Only the assigned inspector can submit this inspection');
  });

  test('WB-SI-04 item still pending (DT1-B R6)', async () => {
    expectError(await asA({ responses: insp.answers(['pass'], ['pass']) }), 400, 'Answer every checklist item before submitting');
  });

  test('WB-SI-05 failed item without remarks (DT1-B R6)', async () => {
    expectError(await asA({ responses: insp.answers(['pass'], ['fail'], ['pass']) }), 400, 'I2 cables');
  });

  test('WB-SI-06 successful submit (DT1-B R7)', async () => {
    const res = await asA({ responses: insp.answers(['pass'], ['fail', 'Broken'], ['na']), summary: 'Two items checked' });
    expectStatus(res, 200);
    const doc = await saved(insp.id);
    expect(doc).toMatchObject({ status: 'completed', score: 50, riskLevel: 'high', summary: 'Two items checked' });
    expect(doc.completedDate.getTime()).toBeGreaterThan(aMinuteAgo());
    const lab = await models.Lab.findById(d.lab._id);
    expect(lab.lastScore).toBe(50);
    expect(lab.lastInspectionDate.getTime()).toBeGreaterThan(aMinuteAgo());
  });

  test('WB-SI-07 admin can submit', async () => {
    const res = await submit(insp.id, d.tokens.admin, allPass());
    expectStatus(res, 200);
    expect(res.body).toMatchObject({ score: 100, riskLevel: 'low' });
  });

  test('WB-SI-08 invalid result value', async () => {
    expectError(await asA({ responses: insp.answers(['maybe'], ['pass'], ['pass']) }), 400, 'Answer every checklist item before submitting');
  });

  test('WB-SI-09 unknown item id (= EP-41) (characterisation, README silent)', async () => {
    const body = allPass();
    body.responses.push({ _id: UNKNOWN_ID, result: 'fail', remarks: 'ghost' });
    expectStatus(await asA(body), 200);
    expect((await saved(insp.id)).responses).toHaveLength(3);
  });

  test('WB-SI-10 responses missing (= EP-38)', async () => {
    expectError(await asA({}), 400, 'Answer every checklist item before submitting');
  });

  test('WB-SI-11 critical item fails', async () => {
    const res = await asA({ responses: insp.answers(['fail', 'Empty'], ['pass'], ['pass']) });
    expectStatus(res, 200);
    expect(res.body).toMatchObject({ score: 67, riskLevel: 'critical' });
  });

  test('WB-SI-12 rejected submit saves nothing', async () => {
    expectStatus(await asA({ responses: insp.answers(['pass'], ['fail'], ['pass']) }), 400);
    const doc = await saved(insp.id);
    expect(doc.status).toBe('scheduled');
    expect(doc.responses.map((r) => r.result)).toEqual(['pending', 'pending', 'pending']);
  });

  test('WB-SI-14 malformed id', async () => {
    expectError(await submit('abc', d.tokens.inspector, allPass()), 400, 'Invalid _id');
  });

  test('WB-SI-15 technician blocked (DT1-B R2)', async () => {
    expectStatus(await submit(insp.id, d.tokens.technician, allPass()), 403);
  });

  test('WB-SI-16 unauthenticated blocked (DT1-B R1)', async () => {
    expectStatus(await submit(insp.id, null, allPass()), 401);
  });
});

describe('Equivalence classes of a checklist result (EP-27 to EP-42)', () => {
  let insp;
  beforeEach(async () => {
    d = await seed();
    insp = await newInspection(d, [{ text: 'Item A' }, { text: 'Item B' }]); // both not critical
  });

  // item A as given, item B always "pass"
  const submitA = (a, ...extra) =>
    submit(insp.id, d.tokens.inspector, {
      responses: [{ _id: insp.itemIds[0], ...a }, { _id: insp.itemIds[1], result: 'pass' }, ...extra],
    });

  test.each([
    ['EP-27 pass', { result: 'pass' }, 100, 'low'],
    ['EP-28 fail with remarks', { result: 'fail', remarks: 'Broken' }, 50, 'high'],
    ['EP-29 na', { result: 'na' }, 100, 'low'],
  ])('%s is accepted', async (_name, a, score, riskLevel) => {
    const res = await submitA(a);
    expectStatus(res, 200);
    expect(res.body).toMatchObject({ status: 'completed', score, riskLevel });
  });

  test.each([
    ['EP-30 fail without remarks', { result: 'fail' }, 'Remarks are required for failed item'],
    ['EP-31 fail with only spaces as remarks', { result: 'fail', remarks: '   ' }, 'Remarks are required for failed item'],
    ['EP-32 pending', { result: 'pending' }, 'Answer every checklist item before submitting'],
    ['EP-33 text not in the list', { result: 'maybe' }, ''],
    ['EP-34 wrong letter case', { result: 'PASS' }, ''],
    ['EP-35 wrong type', { result: 1 }, ''],
    ['EP-36 result missing', {}, ''],
  ])('%s is rejected', async (_name, a, message) => {
    const res = await submitA(a);
    expectStatus(res, 400);
    expect(res.body.message).toContain(message);
    expect((await saved(insp.id)).status).toBe('scheduled');
  });

  test('EP-37 item left out of the list is rejected', async () => {
    const res = await submit(insp.id, d.tokens.inspector, { responses: [{ _id: insp.itemIds[1], result: 'pass' }] });
    expectStatus(res, 400);
    expect((await saved(insp.id)).status).toBe('scheduled');
  });

  test('EP-42 same item answered twice, the last answer wins (characterisation, README silent)', async () => {
    const res = await submitA({ result: 'pass' }, { _id: insp.itemIds[0], result: 'fail', remarks: 'Broken' });
    expectStatus(res, 200);
    expect(res.body).toMatchObject({ score: 50, riskLevel: 'high' });
  });
});
