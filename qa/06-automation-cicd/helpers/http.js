// Small helpers to send a request to the application and to check the status code.
const request = require('supertest');
const { app, bearer } = require('./testApp');

const UNKNOWN_ID = '000000000000000000000000';

// call('put', '/api/labs/abc', token, { name: 'X' }). No token = unauthenticated.
function call(method, url, token, body) {
  const req = request(app)[method](url).set(bearer(token));
  return body === undefined ? req : req.send(body);
}

// Fails with a message that shows the real status and body, so the log can be used as evidence.
function expectStatus(res, ...allowed) {
  if (allowed.includes(res.status)) return;
  const { stack, ...body } = res.body || {};
  const text = JSON.stringify(Array.isArray(res.body) ? res.body : body).slice(0, 400);
  throw new Error(
    `${res.req.method} ${res.req.path}\nExpected status: ${allowed.join(' or ')}\nActual status:   ${res.status}\n` +
      `Actual body:     ${text}${stack ? ' (the body also has a "stack" field)' : ''}`
  );
}

module.exports = { call, expectStatus, UNKNOWN_ID };
