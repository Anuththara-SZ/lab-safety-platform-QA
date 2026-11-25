const request = require('supertest');
const { app, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

beforeAll(() => start());
beforeEach(() => seedDemo());
afterAll(() => stop());

test('TC-AUTH-04c [reasonable expectation] password sent as a number gives 400 or 401, not 500', async () => {
  expectStatus(await call('post', '/api/auth/login', null, { email: 'admin@lab.com', password: 123456 }), 400, 401);
});

test('TC-AUTH-07 [reasonable expectation] malformed JSON body gives 400', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":"admin@lab.com",');
  expectStatus(res, 400);
  expect(res.body.message).toBeTruthy();
});
