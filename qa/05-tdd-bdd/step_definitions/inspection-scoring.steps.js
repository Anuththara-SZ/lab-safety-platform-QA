const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const request = require('supertest');
const { app, bearer } = require('../../06-automation-cicd/helpers/testApp');

Given('the admin has created a checklist with these items:', async function (table) {
  const items = table.hashes().map((row) => ({ text: row.item, category: row.category, critical: row.critical === 'yes' }));
  const res = await request(app)
    .post('/api/templates')
    .set(bearer(this.data.tokens.admin))
    .send({ title: 'BDD checklist', items });
  assert.equal(res.status, 201, res.body.message);
  this.templateId = res.body._id;
});

Given('the inspector has scheduled an inspection with this checklist', async function () {
  const res = await request(app)
    .post('/api/inspections')
    .set(bearer(this.data.tokens.inspector))
    .send({ lab: this.data.lab._id, template: this.templateId });
  assert.equal(res.status, 201, res.body.message);
  this.inspection = res.body;
});

When('the inspector submits these answers:', async function (table) {
  const responses = table.hashes().map((row) => {
    const item = this.inspection.responses.find((r) => r.text === row.item);
    assert.ok(item, `"${row.item}" is not in the inspection`);
    return { _id: item._id, result: row.result, remarks: row.remarks };
  });
  const url = `/api/inspections/${this.inspection._id}`;
  const submit = await request(app)
    .put(`${url}/submit`)
    .set(bearer(this.data.tokens.inspector))
    .send({ responses, summary: 'BDD run' });
  assert.equal(submit.status, 200, submit.body.message);

  // read it again, so the Then steps check what was really saved
  const saved = await request(app).get(url).set(bearer(this.data.tokens.inspector));
  assert.equal(saved.status, 200, saved.body.message);
  this.saved = saved.body;
});

Then('the saved inspection is {string}', function (status) {
  assert.equal(this.saved.status, status);
});

Then('the saved score is {int}', function (score) {
  assert.equal(this.saved.score, score);
});

Then('the saved risk level is {string}', function (riskLevel) {
  assert.equal(this.saved.riskLevel, riskLevel);
});

Then('the laboratory shows {int} as its last score', async function (score) {
  const res = await request(app).get(`/api/labs/${this.data.lab._id}`).set(bearer(this.data.tokens.inspector));
  assert.equal(res.status, 200, res.body.message);
  assert.equal(res.body.lastScore, score);
  assert.ok(res.body.lastInspectionDate, 'last inspection date is empty');
});
