// Permission matrix: DT1-01 to DT1-29 (qa/03-black-box/decision-tables.md) for all roles, together with
// TC-PERM-01 and TC-PERM-03 to TC-PERM-06 (the same cells). TC-PERM-02 is a UI case.
const { models, start, stop, seedDemo, tokenFor } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo({ plus: true }); });
afterAll(() => stop());

// inspector = assigned to the inspections used here, inspector2 = not assigned
const WHO = ['admin', 'inspector', 'inspector2', 'technician', 'unauthenticated'];

const allPass = async (id) => {
  const { responses } = await models.Inspection.findById(id);
  return { summary: 'QA run', responses: responses.map((r) => ({ _id: r._id, result: 'pass', remarks: '' })) };
};
const names = (res) => res.body.map((i) => i.inspector.name);
const perLab = () => ({ lab: d.labs['CN-04'], template: d.templates.general });
const newUser = { name: 'P', email: 'perm@lab.com', password: 'Perm@123', role: 'technician' };
const A = 'Nimal Perera';
const N = 'Second Inspector';
const SENDER = { admin: 'Dr. Admin', inspector: A, inspector2: N };

// codes: in the order of WHO. null = this cell fails and is in known-defects. send: the request. check: extra checks when the request is allowed.
const MATRIX = [
  { id: 'DT1-01', name: 'health check', codes: [200, 200, 200, 200, 200], send: (t) => call('get', '/api/health', t) },
  { id: 'DT1-02', name: 'register', codes: [201, 201, 201, 201, 201], send: (t) => call('post', '/api/auth/register', t, { name: 'R', email: 'r@lab.com', password: 'Abc@123' }) },
  { id: 'DT1-03', name: 'log in', codes: [200, 200, 200, 200, 200], send: (t) => call('post', '/api/auth/login', t, { email: 'tech@lab.com', password: 'Tech@123' }) },
  {
    id: 'DT1-04 / TC-PERM-01.1', name: 'own profile', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/auth/me', t),
    check: (res, who) => expect(res.body.email).toBe(d.users[who].email),
  },
  { id: 'DT1-05', name: 'dashboard', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/dashboard', t) },
  { id: 'DT1-06', name: 'list labs', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/labs', t) },
  { id: 'DT1-06', name: 'open a lab', codes: [200, 200, 200, 200, 401], send: (t) => call('get', `/api/labs/${d.labs['HV-01']}`, t) },
  { id: 'DT1-07 / TC-PERM-03.1', name: 'create lab', codes: [201, 403, 403, 403, 401], send: (t) => call('post', '/api/labs', t, { name: 'Perm Lab', code: 'PL-01', building: 'Block P' }) },
  { id: 'DT1-08 / TC-PERM-03.2', name: 'edit lab', codes: [200, 403, 403, 403, 401], send: (t) => call('put', `/api/labs/${d.labs['TMP-99']}`, t, { name: 'Temp Lab 2', code: 'TMP-99', building: 'Block T' }) },
  { id: 'DT1-09 / TC-PERM-03.3', name: 'delete lab', codes: [200, 403, 403, 403, 401], send: (t) => call('delete', `/api/labs/${d.labs['TMP-99']}`, t) },
  { id: 'DT1-10', name: 'list templates', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/templates', t) },
  { id: 'DT1-10', name: 'open a template', codes: [200, 200, 200, 200, 401], send: (t) => call('get', `/api/templates/${d.templates.general}`, t) },
  { id: 'DT1-11 / TC-PERM-04.1', name: 'create template', codes: [201, 403, 403, 403, 401], send: (t) => call('post', '/api/templates', t, { title: 'Perm Template', items: [{ text: 'A' }] }) },
  { id: 'DT1-12 / TC-PERM-04.2', name: 'edit template', codes: [200, 403, 403, 403, 401], send: (t) => call('put', `/api/templates/${d.templates.chemical}`, t, { title: 'Chemical v2', items: [{ text: 'A' }] }) },
  { id: 'DT1-13 / TC-PERM-04.3', name: 'delete template', codes: [200, 403, 403, 403, 401], send: (t) => call('delete', `/api/templates/${d.templates.chemical}`, t) },
  {
    id: 'DT1-14', name: 'list inspections (content)', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/inspections', t),
    check: (res, who) => {
      if (who === 'admin') expect(names(res).sort()).toEqual([A, A, A, A, A, N]);
      if (who === 'inspector') expect(names(res)).toEqual([A, A, A, A, A]);
      if (who === 'inspector2') expect(names(res)).toEqual([N]);
      if (who === 'technician') expect(res.body.map((i) => i.status)).toEqual(Array(4).fill('completed'));
    },
  },
  { id: 'DT1-15', name: 'open a scheduled inspection', codes: [200, 200, null, 403, 401], send: (t) => call('get', `/api/inspections/${d.inspections.ch05}`, t) },
  { id: 'DT1-16', name: 'open a completed inspection', codes: [200, 200, null, 200, 401], send: (t) => call('get', `/api/inspections/${d.inspections.hv01}`, t) },
  {
    id: 'DT1-17 / TC-PERM-05.1', name: 'schedule for self', codes: [201, 201, 201, 403, 401], send: (t) => call('post', '/api/inspections', t, perLab()),
    check: (res, who) => expect(res.body.inspector.name).toBe(SENDER[who]),
  },
  {
    id: 'DT1-18', name: 'schedule for another inspector', codes: [201, 201, 201, 403, 401],
    send: (t, who) => call('post', '/api/inspections', t, { ...perLab(), inspector: d.users[who === 'inspector2' ? 'inspector' : 'inspector2']._id }),
    check: (res, who) => expect(res.body.inspector.name).toBe(who === 'admin' ? N : SENDER[who]),
  },
  { id: 'DT1-19 / TC-PERM-05.2', name: 'submit an inspection', codes: [200, 200, 403, 403, 401], send: async (t) => call('put', `/api/inspections/${d.inspections.ch05}/submit`, t, await allPass(d.inspections.ch05)) },
  { id: 'DT1-20 / TC-PERM-05.4', name: 'delete inspection', codes: [200, 403, 403, 403, 401], send: (t) => call('delete', `/api/inspections/${d.inspections.ch05}`, t) },
  {
    id: 'DT1-21', name: 'list incidents (content)', codes: [200, 200, 200, 200, 401], send: (t) => call('get', '/api/incidents', t),
    check: (res, who) => {
      if (who === 'technician') expect(res.body.map((i) => i.reportedBy.name)).toEqual(['Kamal Silva', 'Kamal Silva']);
      else expect(res.body).toHaveLength(3);
    },
  },
  { id: 'DT1-22', name: 'report incident', codes: [201, 201, 201, 201, 401], send: (t) => call('post', '/api/incidents', t, { lab: d.labs['EL-02'], title: 'T', description: 'D' }) },
  { id: 'DT1-23 / TC-PERM-06.1', name: 'update incident', codes: [200, 200, 200, 403, 401], send: (t) => call('put', `/api/incidents/${d.incidents.lamp}`, t, { status: 'investigating' }) },
  { id: 'DT1-24 / TC-PERM-06.2', name: 'delete incident', codes: [200, 403, 403, 403, 401], send: (t) => call('delete', `/api/incidents/${d.incidents.lamp}`, t) },
  { id: 'DT1-25', name: 'list staff names', codes: [200, 200, 200, 403, 401], send: (t) => call('get', '/api/users/staff', t) },
  { id: 'DT1-26 / TC-PERM-06.3', name: 'list users', codes: [200, 403, 403, 403, 401], send: (t) => call('get', '/api/users', t) },
  { id: 'DT1-27 / TC-PERM-06.4', name: 'create user', codes: [201, 403, 403, 403, 401], send: (t) => call('post', '/api/users', t, newUser) },
  { id: 'DT1-28 / TC-PERM-06.5', name: 'change role', codes: [200, 403, 403, 403, 401], send: (t) => call('put', `/api/users/${d.users.temp._id}/role`, t, { role: 'inspector' }) },
  { id: 'DT1-29 / TC-PERM-06.6', name: 'delete user', codes: [200, 403, 403, 403, 401], send: (t) => call('delete', `/api/users/${d.users.temp._id}`, t) },
];

const database = async () => JSON.stringify(await Promise.all(Object.values(models).map((m) => m.find().sort('_id').lean())));

describe.each(MATRIX)('$id $name', ({ id, codes, send, check }) => {
  const cells = WHO.map((who, i) => [who, codes[i]]).filter(([, code]) => code !== null);
  test.each(cells)(`${id} %s -> %i`, async (who, code) => {
    const before = await database();
    const res = await send(d.tokens[who], who); // unauthenticated has no token
    expectStatus(res, code);
    if (code >= 400) expect(await database()).toBe(before); // a refused request changes nothing
    else if (check) check(res, who);
  });
});

test('TC-PERM-05.3 admin submits the inspection of another inspector', async () => {
  const id = d.inspections.insp2;
  expectStatus(await call('put', `/api/inspections/${id}/submit`, d.tokens.admin, await allPass(id)), 200);
});

describe('TC-PERM-01 only a valid token gives access', () => {
  const me = (token) => call('get', '/api/auth/me', token);

  test('TC-PERM-01.2 one character changed in the middle part of the token', async () => {
    const parts = d.tokens.admin.split('.');
    const i = 10;
    parts[1] = parts[1].slice(0, i) + (parts[1][i] === 'A' ? 'B' : 'A') + parts[1].slice(i + 1);
    expectStatus(await me(parts.join('.')), 401);
  });

  test('TC-PERM-01.3 token of a deleted user', async () => {
    expectStatus(await me(d.tokens.temp), 200);
    expectStatus(await call('delete', `/api/users/${d.users.temp._id}`, d.tokens.admin), 200);
    expectStatus(await me(d.tokens.temp), 401);
  });

  test('TC-PERM-01.4 expired token', async () => {
    expectStatus(await me(tokenFor(d.users.admin, { expiresIn: -10 })), 401);
  });
});

describe('DT1-A the permission is checked before the input', () => {
  test.each([
    ['admin', 400],
    ['inspector', 403],
    ['technician', 403],
    ['unauthenticated', 401],
  ])('DT1-A %s sends a bad body to POST /api/labs -> %i', async (who, code) => {
    expectStatus(await call('post', '/api/labs', d.tokens[who], {}), code);
  });
});
