// TC-LAB-01 to TC-LAB-07, EP-17 to EP-26 and BVA-26 to BVA-28.
// TC-LAB-04 and TC-LAB-07b fail, so they are in known-defects.
const { models, start, stop, seedDemo } = require('../helpers/testApp');
const { call, expectStatus, UNKNOWN_ID } = require('../helpers/http');

let d;
beforeAll(() => start());
beforeEach(async () => { d = await seedDemo({ plus: true }); });
afterAll(() => stop());

const asAdmin = (method, url, body) => call(method, url, d.tokens.admin, body);

test('TC-LAB-01 admin creates, reads and updates a lab', async () => {
  const data = { name: 'Robotics Lab', code: 'RB-10', building: 'Block D', capacity: 25, hazardLevel: 'low' };
  const created = await asAdmin('post', '/api/labs', data);
  expectStatus(created, 201);

  const url = `/api/labs/${created.body._id}`;
  const read = await asAdmin('get', url);
  expectStatus(read, 200);
  expect(read.body).toMatchObject(data);

  expectStatus(await asAdmin('put', url, { name: 'Robotics Laboratory', code: 'RB-10', building: 'Block D', capacity: 30 }), 200);
  const again = await asAdmin('get', url);
  expectStatus(again, 200);
  expect(again.body).toMatchObject({ name: 'Robotics Laboratory', capacity: 30 });
});

describe('TC-LAB-02 invalid or duplicate lab data is rejected', () => {
  test.each([
    ['TC-LAB-02a no name', { code: 'X-1', building: 'B' }, 400],
    ['TC-LAB-02b / BVA-26 capacity 0', { name: 'X', code: 'X-2', building: 'B', capacity: 0 }, 400],
    ['TC-LAB-02c unknown hazard level', { name: 'X', code: 'X-3', building: 'B', hazardLevel: 'extreme' }, 400],
    ['TC-LAB-02d duplicate code', { name: 'X', code: 'HV-01', building: 'B' }, 409],
    ['TC-LAB-02e duplicate code in lower case', { name: 'X', code: 'hv-01', building: 'B' }, 409],
  ])('%s', async (_name, body, status) => {
    const before = await models.Lab.countDocuments();
    const res = await asAdmin('post', '/api/labs', body);
    expectStatus(res, status);
    expect(res.body.message).toBeTruthy();
    if (body.capacity === 0) expect(res.body.message).toBe('Capacity must be a positive number');
    expect(await models.Lab.countDocuments()).toBe(before);
  });
});

describe('TC-LAB-03 search and hazard filter', () => {
  test.each([
    ['TC-LAB-03.1 search=electronics', 'search=electronics', ['EL-02', 'PE-03']],
    ['TC-LAB-03.2 hazardLevel=high', 'hazardLevel=high', ['CH-05', 'HV-01', 'PE-03']],
    ['TC-LAB-03.3 search=.* is plain text, not a pattern', 'search=.*', []],
  ])('%s', async (_name, query, codes) => {
    const res = await call('get', `/api/labs?${query}`, d.tokens.technician);
    expectStatus(res, 200);
    expect(res.body.map((lab) => lab.code).sort()).toEqual(codes);
  });
});

describe('TC-LAB-05 invalid and unknown lab ids', () => {
  const body = { name: 'X', code: 'X-1', building: 'B' };
  test('TC-LAB-05.1 GET abc', async () => expectStatus(await asAdmin('get', '/api/labs/abc'), 400));
  test('TC-LAB-05.2 PUT abc', async () => expectStatus(await asAdmin('put', '/api/labs/abc', body), 400));
  test('TC-LAB-05.3 DELETE abc', async () => expectStatus(await asAdmin('delete', '/api/labs/abc'), 400));
  test('TC-LAB-05.4 GET unknown id', async () => expectStatus(await asAdmin('get', `/api/labs/${UNKNOWN_ID}`), 404));
});

describe('TC-LAB-06 deleting a lab with linked records leaves no orphans', () => {
  test('TC-LAB-06.1 to 06.3 lab with linked records is kept', async () => {
    const id = d.labs['HV-01'];
    const del = await asAdmin('delete', `/api/labs/${id}`);
    expectStatus(del, 409);
    expect(del.body.message).toBeTruthy();
    expectStatus(await asAdmin('get', `/api/labs/${id}`), 200);
    const list = await asAdmin('get', `/api/inspections?lab=${id}`);
    expectStatus(list, 200);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body.every((i) => i.lab && i.lab.code === 'HV-01')).toBe(true);
  });

  test('TC-LAB-06.4, 06.5 lab without linked records is deleted', async () => {
    const url = `/api/labs/${d.labs['TMP-99']}`;
    expectStatus(await asAdmin('delete', url), 200);
    expectStatus(await asAdmin('get', url), 404);
  });
});

// The error handler reads NODE_ENV for every request, so it can be changed for one request.
test('TC-LAB-07a error body has no stack trace with NODE_ENV=production', async () => {
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await asAdmin('get', `/api/labs/${UNKNOWN_ID}`);
    expectStatus(res, 404);
    expect(Object.keys(res.body)).toEqual(['message']);
  } finally {
    process.env.NODE_ENV = old;
  }
});

describe('Lab capacity: equivalence classes and boundary values', () => {
  const create = (capacity, code) =>
    asAdmin('post', '/api/labs', { name: 'EP Lab', code, building: 'Block A', ...(capacity === undefined ? {} : { capacity }) });

  test.each([
    ['EP-17 whole number', 30, 30],
    ['EP-18 whole number sent as text', '25', 25],
    ['EP-19 field missing, default is used', undefined, 20],
    ['EP-26 very large number (characterisation, README silent)', 1000000, 1000000],
    ['BVA-27 on the limit', 1, 1],
    ['BVA-28 just above', 2, 2],
  ])('%s is accepted', async (name, value, saved) => {
    const code = name.split(' ')[0];
    const res = await create(value, code);
    expectStatus(res, 201);
    expect((await models.Lab.findOne({ code })).capacity).toBe(saved);
  });

  test.each([
    ['EP-20 negative number', -5],
    ['EP-21 decimal number', 12.5],
    ['EP-22 text', 'abc'],
    ['EP-23 empty text', ''],
    ['EP-24 null', null],
    ['EP-25 boolean', true],
  ])('%s is rejected', async (name, value) => {
    const code = name.split(' ')[0];
    const res = await create(value, code);
    expectStatus(res, 400);
    expect(res.body.message).toBe('Capacity must be a positive number');
    expect(await models.Lab.exists({ code })).toBeNull();
  });
});
