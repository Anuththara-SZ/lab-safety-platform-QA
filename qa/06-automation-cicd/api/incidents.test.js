// TC-INC-01 to TC-INC-04. TC-INC-05 fails, so it is in known-defects.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo(); });
afterAll(() => stop());

test('TC-INC-01 technician reports an incident but cannot set its status', async () => {
  const res = await call('post', '/api/incidents', d.tokens.technician, {
    lab: d.labs['EL-02'], title: 'Broken socket', description: 'Socket cover is cracked', severity: 'medium', status: 'resolved',
  });
  expectStatus(res, 201);
  expect(res.body).toMatchObject({ severity: 'medium', status: 'open', reportedBy: { name: 'Kamal Silva' } });
});

describe('TC-INC-02 invalid incident data is rejected', () => {
  test.each([
    ['TC-INC-02a no description', () => ({ lab: d.labs['EL-02'], title: 'T' }), 400],
    ['TC-INC-02b unknown severity', () => ({ lab: d.labs['EL-02'], title: 'T', description: 'D', severity: 'extreme' }), 400],
    ['TC-INC-02c invalid lab id', () => ({ lab: 'abc', title: 'T', description: 'D' }), 400],
    ['TC-INC-02d unknown lab id', () => ({ lab: UNKNOWN_ID, title: 'T', description: 'D' }), 404],
  ])('%s', async (_name, body, status) => {
    expectStatus(await call('post', '/api/incidents', d.tokens.technician, body()), status);
    expect(await models.Incident.countDocuments()).toBe(3);
  });
});

describe('TC-INC-03 technician sees only own incidents', () => {
  const list = async (who, query = '') => {
    const res = await call('get', `/api/incidents${query}`, d.tokens[who]);
    expectStatus(res, 200);
    return res.body;
  };

  test('TC-INC-03.1 technician sees 2 own incidents', async () => {
    const body = await list('technician');
    expect(body.map((i) => i.reportedBy.name)).toEqual(['Kamal Silva', 'Kamal Silva']);
  });
  test('TC-INC-03.2 filter does not show incidents of others', async () => {
    expect(await list('technician', '?severity=low')).toEqual([]);
  });
  test('TC-INC-03.3 inspector sees all 3', async () => expect(await list('inspector')).toHaveLength(3));
  test('TC-INC-03.4 admin sees all 3', async () => expect(await list('admin')).toHaveLength(3));
});

describe('TC-INC-04 inspector triages an incident', () => {
  const update = (body) => call('put', `/api/incidents/${d.incidents.lamp}`, d.tokens.inspector, body);

  test('TC-INC-04a investigating', async () => {
    const res = await update({ status: 'investigating' });
    expectStatus(res, 200);
    expect(res.body.status).toBe('investigating');
  });

  test('TC-INC-04b resolved with a resolution', async () => {
    const res = await update({ status: 'resolved', resolution: 'Lamp replaced' });
    expectStatus(res, 200);
    expect(res.body).toMatchObject({ status: 'resolved', resolution: 'Lamp replaced' });
    expect(res.body.resolvedAt).toBeTruthy();
  });

  test('TC-INC-04c unknown status is rejected and the record does not change', async () => {
    const before = await models.Incident.findById(d.incidents.lamp).lean();
    expectStatus(await update({ status: 'closed' }), 400);
    expect(await models.Incident.findById(d.incidents.lamp).lean()).toEqual(before);
  });
});
