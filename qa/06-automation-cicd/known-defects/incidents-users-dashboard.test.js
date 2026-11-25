const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo({ plus: true }); });
afterAll(() => stop());

test('TC-INC-05 [reasonable expectation] editing a resolved incident keeps the original resolved date', async () => {
  const before = await models.Incident.findById(d.incidents.burn).lean();
  const res = await call('put', `/api/incidents/${d.incidents.burn}`, d.tokens.admin, {
    status: 'resolved', severity: 'low', resolution: 'Stand is now required',
  });
  expectStatus(res, 200);
  expect(res.body.resolution).toBe('Stand is now required');
  expect(res.body.resolvedAt).toBe(before.resolvedAt.toISOString());
});

const ownIdInCapitals = () => String(d.users.admin2._id).toUpperCase();

test('TC-USR-03.6 [reasonable expectation] an admin cannot change the own role with the id in capital letters', async () => {
  const res = await call('put', `/api/users/${ownIdInCapitals()}/role`, d.tokens.admin2, { role: 'technician' });
  expectStatus(res, 400);
  expect((await models.User.findById(d.users.admin2._id)).role).toBe('admin');
});

// Not in the design documents. Added after the first run, because TC-USR-03.6 failed and
// deleteUser() compares the id in the same way.
test('TC-USR-04.5 variation [reasonable expectation] an admin cannot delete the own account with the id in capital letters', async () => {
  expectStatus(await call('delete', `/api/users/${ownIdInCapitals()}`, d.tokens.admin2), 400);
  expect(await models.User.findById(d.users.admin2._id)).not.toBeNull();
});

// Not in the design documents. Found while testing the dashboard.
// README section 4: GET /api/incidents is "any (technician: own)", and GET /api/dashboard is "Aggregated statistics".
test('DASH-06 [reasonable expectation] technician does not see incidents of other people on the dashboard', async () => {
  const title = 'Reported by the inspector';
  await models.Incident.create({ lab: d.labs['EL-02'], reportedBy: d.users.inspector._id, title, description: 'x' });
  const list = await call('get', '/api/incidents', d.tokens.technician);
  expectStatus(list, 200);
  expect(list.body.map((i) => i.title)).not.toContain(title); // hidden here, as documented
  const dashboard = await call('get', '/api/dashboard', d.tokens.technician);
  expectStatus(dashboard, 200);
  expect(dashboard.body.recentIncidents.map((i) => i.title)).not.toContain(title);
});
