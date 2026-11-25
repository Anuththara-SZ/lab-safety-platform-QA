// TC-AUTH-03 to TC-AUTH-06, EP-01 to EP-16 and BVA-23 to BVA-25.
// TC-AUTH-04c and TC-AUTH-07 fail, so they are in known-defects.
// This file must stay below 50 calls to /api/auth, because the rate limit is active.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

beforeAll(() => start());
beforeEach(() => seedDemo());
afterAll(() => stop());

const login = (email, password) => call('post', '/api/auth/login', null, { email, password });
const register = (body) => call('post', '/api/auth/register', null, { name: 'Test User', ...body });
const isSaved = (email) => models.User.exists({ email });

describe('TC-AUTH-03 login API works for the three demo accounts', () => {
  test.each([
    ['TC-AUTH-03.1', 'admin', 'admin@lab.com', 'Admin@123'],
    ['TC-AUTH-03.2', 'inspector', 'inspector@lab.com', 'Inspector@123'],
    ['TC-AUTH-03.3', 'technician', 'tech@lab.com', 'Tech@123'],
  ])('%s %s', async (_id, role, email, password) => {
    const res = await login(email, password);
    expectStatus(res, 200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email, role });
    expect(JSON.stringify(res.body)).not.toContain('"password"');
  });
});

describe('TC-AUTH-04 login API rejects bad credentials safely', () => {
  test('TC-AUTH-04a, 04b wrong password and unknown email give the same 401', async () => {
    const wrong = await login('admin@lab.com', 'Wrong@123');
    const unknown = await login('nobody@lab.com', 'Wrong@123');
    expectStatus(wrong, 401);
    expectStatus(unknown, 401);
    expect(unknown.body.message).toBe(wrong.body.message);
    expect(wrong.body.token).toBeUndefined();
  });
});

describe('TC-AUTH-05 self-registration cannot choose a role', () => {
  const body = { name: 'New Student', email: 'new1@lab.com', password: 'Student@1', role: 'admin' };

  test('TC-AUTH-05.1 the new user is a technician', async () => {
    const res = await register(body);
    expectStatus(res, 201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('technician');
  });

  test('TC-AUTH-05.2 the new user cannot list users', async () => {
    const { body: created } = await register(body);
    expectStatus(await call('get', '/api/users', created.token), 403);
  });
});

describe('TC-AUTH-06 registration validation and duplicate email', () => {
  test('TC-AUTH-06a empty name', async () => {
    const res = await register({ name: '', email: 'a1@lab.com', password: 'Abc@12' });
    expectStatus(res, 400);
    expect(res.body.message).toBeTruthy();
    expect(await isSaved('a1@lab.com')).toBeNull();
  });

  test('TC-AUTH-06b / EP-05 email without @', async () => {
    for (const email of ['not-an-email', 'newuser.example.com']) {
      const res = await register({ email, password: 'Abc@12' });
      expectStatus(res, 400);
      expect(res.body.message).toBe('Valid email is required');
    }
  });

  test('TC-AUTH-06c / BVA-23 password with 5 characters', async () => {
    for (const password of ['Abc@1', 'abcde']) {
      const res = await register({ email: 'a3@lab.com', password });
      expectStatus(res, 400);
      expect(res.body.message).toBe('Password must be at least 6 characters');
      expect(await isSaved('a3@lab.com')).toBeNull();
    }
  });

  test('TC-AUTH-06d / BVA-24 password with 6 characters', async () => {
    expectStatus(await register({ email: 'a4@lab.com', password: 'Abc@12' }), 201);
    expectStatus(await register({ email: 'a5@lab.com', password: 'abcdef' }), 201);
  });

  test('TC-AUTH-06e / EP-03 email already registered', async () => {
    expectStatus(await register({ email: 'a4@lab.com', password: 'Abc@12' }), 201);
    const res = await register({ email: 'a4@lab.com', password: 'Abc@12' });
    expectStatus(res, 409);
    expect(res.body.message).toBe('Email already registered');
  });

  test('BVA-25 password with 7 characters', async () => {
    expectStatus(await register({ email: 'a7@lab.com', password: 'abcdefg' }), 201);
  });
});

describe('Equivalence classes: email (EP-01 to EP-09)', () => {
  const password = 'Passw0rd';

  test('EP-01 correct new email', async () => {
    const res = await register({ email: 'new.user@example.com', password });
    expectStatus(res, 201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('technician');
  });

  test('EP-02 capital letters (lower case in the answer: characterisation)', async () => {
    const res = await register({ email: 'New.User2@Example.COM', password });
    expectStatus(res, 201);
    expect(res.body.user.email).toBe('new.user2@example.com');
  });

  test('EP-04 existing email in capital letters', async () => {
    expectStatus(await register({ email: 'ADMIN@LAB.COM', password }), 409);
  });

  test('EP-06 no domain part', async () => expectStatus(await register({ email: 'newuser@', password }), 400));
  test('EP-07 empty email', async () => expectStatus(await register({ email: '', password }), 400));
  test('EP-08 email missing', async () => expectStatus(await register({ password }), 400));

  test('EP-09 Gmail alias of a registered address (characterisation, README silent)', async () => {
    expectStatus(await register({ email: 'ab@gmail.com', password }), 201);
    expectStatus(await register({ email: 'a.b+lab@gmail.com', password }), 409);
  });
});

describe('Equivalence classes: password (EP-10 to EP-16)', () => {
  test('EP-10 six or more characters, password is not returned and is stored as a hash', async () => {
    const res = await register({ email: 'ep10@example.com', password: 'Passw0rd' });
    expectStatus(res, 201);
    expect(JSON.stringify(res.body)).not.toContain('Passw0rd');
    const user = await models.User.findOne({ email: 'ep10@example.com' }).select('+password');
    expect(user.password).toMatch(/^\$2[aby]\$10\$/); // bcrypt, 10 rounds (README section 5)
  });

  test('EP-11 shorter than 6', async () => {
    const res = await register({ email: 'ep11@example.com', password: 'abc' });
    expectStatus(res, 400);
    expect(res.body.message).toBe('Password must be at least 6 characters');
  });

  test('EP-12 empty password', async () => expectStatus(await register({ email: 'ep12@example.com', password: '' }), 400));
  test('EP-13 password missing', async () => expectStatus(await register({ email: 'ep13@example.com' }), 400));

  test('EP-14 only spaces (characterisation, README silent)', async () => {
    expectStatus(await register({ email: 'ep14@example.com', password: '        ' }), 201);
  });

  test('EP-15 number instead of text (characterisation, README silent)', async () => {
    expectStatus(await register({ email: 'ep15@example.com', password: 12345678 }), 201);
  });

  test('EP-16 100 characters, only the first 72 matter (characterisation, README silent)', async () => {
    const email = 'ep16@example.com';
    expectStatus(await register({ email, password: 'x'.repeat(100) }), 201);
    expectStatus(await login(email, 'x'.repeat(72) + 'different ending'), 200);
    expectStatus(await login(email, 'x'.repeat(71)), 401);
  });
});
