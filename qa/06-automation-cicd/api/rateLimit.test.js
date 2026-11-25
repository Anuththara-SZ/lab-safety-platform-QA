// TC-AUTH-08. In its own file, because it uses up the rate limit of /api/auth.
// (Jest loads the application again for every file, so the counter starts at 0 here.)
const { start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

beforeAll(async () => {
  await start();
  await seedDemo();
});
afterAll(() => stop());

test('TC-AUTH-08.1 requests 1 to 50 give 401, request 51 gives 429 with a message', async () => {
  const codes = [];
  let last;
  for (let i = 1; i <= 51; i++) {
    last = await call('post', '/api/auth/login', null, { email: 'admin@lab.com', password: 'Wrong@123' });
    codes.push(last.status);
  }
  expect(codes.slice(0, 50)).toEqual(Array(50).fill(401));
  expectStatus(last, 429);
  expect(last.body.message).toBeTruthy();
});

test('TC-AUTH-08.2 other routes still work after that', async () => {
  expectStatus(await call('post', '/api/auth/login', null, { email: 'admin@lab.com', password: 'Admin@123' }), 429); // still blocked
  expectStatus(await call('get', '/api/health'), 200);
});
