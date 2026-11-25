const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const request = require('supertest');
const { app, models, bearer } = require('../../06-automation-cicd/helpers/testApp');

const VISITOR = 'unauthenticated';
const codeFor = (who) => `BDD-${who.toUpperCase()}`;

// Turns an HTTP status into the words used in the feature file.
function inWords(status) {
  if (status >= 200 && status < 300) return 'allowed';
  if (status === 401 || status === 403) return `refused with ${status}`;
  return `unexpected status ${status}`;
}

Given('these accounts exist:', async function (table) {
  this.accounts = table.hashes();
  for (const account of this.accounts) {
    const user = await models.User.findOne({ email: account.email });
    assert.ok(user, `account ${account.email} is missing`);
    assert.equal(user.role, account.who);
  }
});

When('each account logs in with its email and password', async function () {
  this.logins = {};
  this.tokens = { [VISITOR]: null };
  for (const { who, email, password } of this.accounts) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    this.logins[who] = res;
    this.tokens[who] = res.body.token;
  }
});

When('each account and an unauthenticated visitor ask for the laboratory list', async function () {
  this.listResults = {};
  for (const [who, token] of Object.entries(this.tokens)) {
    const res = await request(app).get('/api/labs').set(bearer(token));
    this.listResults[who] = inWords(res.status);
  }
});

When('each account and an unauthenticated visitor try to add a laboratory', async function () {
  this.addResults = {};
  for (const [who, token] of Object.entries(this.tokens)) {
    const lab = { name: `Lab added by ${who}`, code: codeFor(who), building: 'BDD Block' };
    const res = await request(app).post('/api/labs').set(bearer(token)).send(lab);
    this.addResults[who] = inWords(res.status);
  }
});

Then('every account is logged in with its own role', async function () {
  for (const { who, email } of this.accounts) {
    const res = this.logins[who];
    assert.equal(res.status, 200, `${who}: ${res.body.message}`);
    assert.ok(res.body.token, `${who} received no token`);
    assert.equal(res.body.user.role, who);
    // the token must really belong to this user
    const me = await request(app).get('/api/auth/me').set(bearer(res.body.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.email, email);
    assert.equal(me.body.role, who);
  }
});

Then('the results are:', function (table) {
  const expected = table.hashes();
  const actual = expected.map(({ who }) => ({
    who,
    'laboratory list': this.listResults[who],
    'add a laboratory': this.addResults[who],
  }));
  assert.deepEqual(actual, expected);
});

Then('only the laboratory added by the admin is saved', async function () {
  const res = await request(app).get('/api/labs').query({ search: 'BDD-' }).set(bearer(this.tokens.admin));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((lab) => lab.code), [codeFor('admin')]);
});
