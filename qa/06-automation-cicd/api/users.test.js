// TC-USR-01 to TC-USR-05. TC-USR-03.6 fails, so it is in known-defects.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo({ plus: true }); });
afterAll(() => stop());

const asAdmin = (method, url, body) => call(method, url, d.tokens.admin, body);
const roleOf = async (key) => (await models.User.findById(d.users[key]._id)).role;

test('TC-USR-01 admin creates a user and the password is never returned', async () => {
  const created = await asAdmin('post', '/api/users', { name: 'QA Inspector', email: 'qa.insp@lab.com', password: 'QaInsp@1', role: 'inspector' });
  expectStatus(created, 201);
  expect(created.body.role).toBe('inspector');

  const login = await call('post', '/api/auth/login', null, { email: 'qa.insp@lab.com', password: 'QaInsp@1' });
  expectStatus(login, 200);

  const list = await asAdmin('get', '/api/users');
  expectStatus(list, 200);
  expect(list.body.map((u) => u.email)).toContain('qa.insp@lab.com');
  for (const res of [created, login, list]) expect(JSON.stringify(res.body)).not.toContain('"password"');
});

describe('TC-USR-02 invalid or duplicate user data is rejected', () => {
  test.each([
    ['TC-USR-02a unknown role', { name: 'A', email: 'u1@lab.com', password: 'Abc@12', role: 'manager' }, 400],
    ['TC-USR-02b password with 5 characters', { name: 'A', email: 'u2@lab.com', password: 'Abc@1', role: 'inspector' }, 400],
    ['TC-USR-02c invalid email', { name: 'A', email: 'x@', password: 'Abc@12', role: 'inspector' }, 400],
    ['TC-USR-02d duplicate email', { name: 'A', email: 'tech@lab.com', password: 'Abc@12', role: 'inspector' }, 409],
  ])('%s', async (_name, body, status) => {
    const before = await models.User.countDocuments();
    expectStatus(await asAdmin('post', '/api/users', body), status);
    expect(await models.User.countDocuments()).toBe(before);
  });
});

describe('TC-USR-03 changing roles works at once, and not on yourself', () => {
  test('TC-USR-03.1 to 03.3 the new role works with the old token', async () => {
    expectStatus(await call('get', '/api/users/staff', d.tokens.temp), 403);
    expectStatus(await asAdmin('put', `/api/users/${d.users.temp._id}/role`, { role: 'inspector' }), 200);
    expectStatus(await call('get', '/api/users/staff', d.tokens.temp), 200);
  });

  test('TC-USR-03.4 unknown role', async () => {
    expectStatus(await asAdmin('put', `/api/users/${d.users.temp._id}/role`, { role: 'boss' }), 400);
    expect(await roleOf('temp')).toBe('technician');
  });

  test('TC-USR-03.5 an admin cannot change the own role', async () => {
    expectStatus(await call('put', `/api/users/${d.users.admin2._id}/role`, d.tokens.admin2, { role: 'technician' }), 400);
    expect(await roleOf('admin2')).toBe('admin');
  });
});

describe('TC-USR-04 deleting a user with linked records leaves no orphans', () => {
  const del = (token, key) => call('delete', `/api/users/${d.users[key]._id}`, token);

  test('TC-USR-04.1 inspector with linked records', async () => {
    const res = await del(d.tokens.admin, 'inspector');
    expectStatus(res, 409);
    expect(res.body.message).toBeTruthy();
  });

  test('TC-USR-04.2 technician with linked records', async () => {
    const res = await del(d.tokens.admin, 'technician');
    expectStatus(res, 409);
    expect(res.body.message).toBeTruthy();
  });

  test('TC-USR-04.3 the inspector name is still shown in the inspection', async () => {
    await del(d.tokens.admin, 'inspector');
    const res = await asAdmin('get', `/api/inspections/${d.inspections.hv01}`);
    expectStatus(res, 200);
    expect(res.body.inspector.name).toBe('Nimal Perera');
  });

  test('TC-USR-04.4 user without linked records is deleted', async () => {
    expectStatus(await del(d.tokens.admin, 'temp'), 200);
    expect(await models.User.findById(d.users.temp._id)).toBeNull();
  });

  test('TC-USR-04.5 an admin cannot delete the own account', async () => {
    expectStatus(await del(d.tokens.admin2, 'admin2'), 400);
    expect(await roleOf('admin2')).toBe('admin');
  });
});

describe('TC-USR-05 invalid and unknown user ids', () => {
  test('TC-USR-05.1 PUT abc', async () => expectStatus(await asAdmin('put', '/api/users/abc/role', { role: 'inspector' }), 400));
  test('TC-USR-05.2 DELETE abc', async () => expectStatus(await asAdmin('delete', '/api/users/abc'), 400));
  test('TC-USR-05.3 DELETE unknown id', async () => expectStatus(await asAdmin('delete', `/api/users/${UNKNOWN_ID}`), 404));
});
