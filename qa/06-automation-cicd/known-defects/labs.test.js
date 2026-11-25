const { start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo(); });
afterAll(() => stop());

test('TC-LAB-04 [reasonable expectation] search sent as an array must not crash the API', async () => {
  expectStatus(await call('get', '/api/labs?search[]=x', d.tokens.technician), 200, 400);
});

// README section 4: errors are { "message": "..." }. README section 5 promises "no stack traces" only for production.
test('TC-LAB-07b [reasonable expectation; README s.5 line 157 forbids it only in production] NODE_ENV not set: error body has only a message', async () => {
  const old = process.env.NODE_ENV;
  delete process.env.NODE_ENV; // the error handler reads it for every request
  try {
    const res = await call('get', `/api/labs/${UNKNOWN_ID}`, d.tokens.admin);
    expectStatus(res, 404);
    expect(Object.keys(res.body)).toEqual(['message']);
  } finally {
    process.env.NODE_ENV = old;
  }
});
