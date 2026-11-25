// Helpers for tests that submit an inspection.
const { models } = require('./testApp');
const { call } = require('./http');

const submit = (id, token, body) => call('put', `/api/inspections/${id}/submit`, token, body);
const saved = (id) => models.Inspection.findById(id).lean();
const eight = (result) => Array(8).fill(result);

// BODY(r1, ..., r8) of the test cases: one answer for each item, "Needs repair" for a fail.
async function bodyFor(id, results, remarks = 'Needs repair') {
  const { responses } = await saved(id);
  return {
    summary: 'QA run',
    responses: results.map((result, i) => ({ _id: String(responses[i]._id), result, remarks: result === 'fail' ? remarks : '' })),
  };
}

// A scheduled inspection of inspector A with the given items. d is the result of seed().
async function newInspection(d, items) {
  const template = await models.Template.create({ title: 'White-box template', items, createdBy: d.users.admin._id });
  const inspection = await models.Inspection.create({
    lab: d.lab._id,
    template: template._id,
    templateTitle: template.title,
    inspector: d.users.inspector._id,
    responses: items,
  });
  const itemIds = inspection.responses.map((r) => String(r._id));
  return {
    id: String(inspection._id),
    itemIds,
    // answers(['pass'], ['fail', 'remark']) -> one answer per item, in order
    answers: (...list) => list.map(([result, remarks], i) => ({ _id: itemIds[i], result, remarks })),
  };
}

// The three items of the WB-SI design: only I1 is critical.
const WB_ITEMS = [
  { text: 'I1 fire extinguisher', critical: true },
  { text: 'I2 cables', critical: false },
  { text: 'I3 floor', critical: false },
];

module.exports = { submit, saved, eight, bodyFor, newInspection, WB_ITEMS };
