// TC-TPL-01 to TC-TPL-05.
// TC-TPL-04.1 and 04.2 fail, so they are in known-defects.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo(); });
afterAll(() => stop());

const asAdmin = (method, url, body) => call(method, url, d.tokens.admin, body);

test('TC-TPL-01 admin creates a template with a critical item', async () => {
  const created = await asAdmin('post', '/api/templates', {
    title: 'QA Checklist',
    description: 'QA',
    items: [
      { text: 'Fire door closed', category: 'Fire Safety', critical: true },
      { text: 'Floor is dry', category: 'General' },
    ],
  });
  expectStatus(created, 201);
  const read = await call('get', `/api/templates/${created.body._id}`, d.tokens.technician);
  expectStatus(read, 200);
  expect(read.body.items.map((i) => [i.text, i.critical])).toEqual([['Fire door closed', true], ['Floor is dry', false]]);
});

describe('TC-TPL-02 invalid templates are rejected', () => {
  test.each([
    ['TC-TPL-02a empty title', { title: '', items: [{ text: 'A' }] }],
    ['TC-TPL-02b no items', { title: 'T', items: [] }],
    ['TC-TPL-02c item text has only spaces', { title: 'T', items: [{ text: '   ' }] }],
    ['TC-TPL-02d unknown category', { title: 'T', items: [{ text: 'A', category: 'Magic' }] }],
  ])('%s', async (_name, body) => {
    const res = await asAdmin('post', '/api/templates', body);
    expectStatus(res, 400);
    expect(res.body.message).toBeTruthy();
    const list = await asAdmin('get', '/api/templates');
    expect(list.body).toHaveLength(2);
  });
});

test('TC-TPL-03 editing a template does not change existing inspections', async () => {
  const read = async () => {
    const completed = await asAdmin('get', `/api/inspections/${d.inspections.hv01}`);
    const scheduled = await asAdmin('get', `/api/inspections/${d.inspections.ch05}`);
    expectStatus(completed, 200);
    expectStatus(scheduled, 200);
    return [completed.body, scheduled.body];
  };
  const before = await read();
  expect(before[0].responses).toHaveLength(8);
  expectStatus(
    await asAdmin('put', `/api/templates/${d.templates.general}`, { title: 'Changed title', items: [{ text: 'Only new item', category: 'General' }] }),
    200
  );
  expect(await read()).toEqual(before);
});

test('TC-TPL-04.3 the scheduled inspection still shows its 8 items after a delete request for its template', async () => {
  await asAdmin('delete', `/api/templates/${d.templates.general}`);
  const res = await asAdmin('get', `/api/inspections/${d.inspections.ch05}`);
  expectStatus(res, 200);
  expect(res.body.responses).toHaveLength(8);
});

describe('TC-TPL-05 invalid id, unknown id and delete of an unused template', () => {
  test('TC-TPL-05.1 GET abc', async () => expectStatus(await asAdmin('get', '/api/templates/abc'), 400));
  test('TC-TPL-05.2 GET unknown id', async () => expectStatus(await asAdmin('get', `/api/templates/${UNKNOWN_ID}`), 404));

  test('TC-TPL-05.3, 05.4 an unused template is deleted', async () => {
    const url = `/api/templates/${d.templates.chemical}`;
    expectStatus(await asAdmin('delete', url), 200);
    expectStatus(await asAdmin('get', url), 404);
    expect(await models.Template.countDocuments()).toBe(1);
  });
});
