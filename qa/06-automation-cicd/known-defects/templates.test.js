// The general template of the demo data is used by a scheduled inspection.
const { start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo(); });
afterAll(() => stop());

const template = (method) => call(method, `/api/templates/${d.templates.general}`, d.tokens.admin);

test('TC-TPL-04.1 [reasonable expectation] delete of a template used by a scheduled inspection is refused with 409', async () => {
  expectStatus(await template('delete'), 409);
});

test('TC-TPL-04.2 [reasonable expectation] the template still exists after the delete request', async () => {
  await template('delete');
  expectStatus(await template('get'), 200);
});
