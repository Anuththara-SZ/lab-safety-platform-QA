// Shared helper for the API tests, the BDD tests, the defect tests and the UI runner.
// It starts a private in-memory MongoDB, connects the application's own mongoose to it,
// and inserts test data. It never uses the MongoDB service on port 27017.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// These must be set before backend/app is loaded.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'qa-only-secret-not-used-in-production';
delete process.env.JWT_EXPIRES_IN; // use the application's default (7d)

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const backendDir = path.join(repoRoot, 'backend');
const fromBackend = (name) => require(path.join(backendDir, 'node_modules', name));

// On Windows, use the mongod.exe that is already installed, so nothing is downloaded.
// Only the program file is used: we start our own copy with a temporary data folder.
// On Linux (CI), or when somebody already chose a binary with MONGOMS_ variables, this does nothing.
function useInstalledMongod() {
  if (process.platform !== 'win32') return;
  const chosen = ['MONGOMS_SYSTEM_BINARY', 'MONGOMS_VERSION', 'MONGOMS_DOWNLOAD_DIR', 'MONGOMS_DOWNLOAD_URL'];
  if (chosen.some((name) => process.env[name])) return;
  const serverDir = 'C:/Program Files/MongoDB/Server';
  if (!fs.existsSync(serverDir)) return;
  const found = fs
    .readdirSync(serverDir)
    .sort((a, b) => parseFloat(b) - parseFloat(a)) // newest version first
    .map((version) => `${serverDir}/${version}/bin/mongod.exe`)
    .find((file) => fs.existsSync(file));
  if (!found) return;
  process.env.MONGOMS_SYSTEM_BINARY = found;
  process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false';
}
useInstalledMongod();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = fromBackend('mongoose'); // same mongoose instance as the application
const jwt = fromBackend('jsonwebtoken');
const app = require(path.join(backendDir, 'app'));

const models = {
  User: require(path.join(backendDir, 'models', 'User')),
  Lab: require(path.join(backendDir, 'models', 'Lab')),
  Template: require(path.join(backendDir, 'models', 'Template')),
  Inspection: require(path.join(backendDir, 'models', 'Inspection')),
  Incident: require(path.join(backendDir, 'models', 'Incident')),
};

// admin, inspector and technician are the demo accounts from README section 3 and backend/seed.js.
// inspector2 is D1 in qa/02-stlc-test-cases/test-environment.md.
const USERS = {
  admin: { name: 'Dr. Admin', email: 'admin@lab.com', password: 'Admin@123', role: 'admin' },
  inspector: { name: 'Nimal Perera', email: 'inspector@lab.com', password: 'Inspector@123', role: 'inspector' },
  inspector2: { name: 'Second Inspector', email: 'inspector2@lab.com', password: 'Inspector2@123', role: 'inspector' },
  technician: { name: 'Kamal Silva', email: 'tech@lab.com', password: 'Tech@123', role: 'technician' },
};

// Use this list in permission tests so that no role is forgotten.
const ROLES = ['admin', 'inspector', 'technician', 'unauthenticated'];

let mongoServer = null;
let savedUsers = null; // user documents with hashed passwords, kept so that seed() stays fast
let savedDemo = {}; // copies of the data made by seedDemo(), for the same reason

// Starts the in-memory database and connects the application to it.
async function start() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri('qa_memory');
  if (new URL(uri).port === '27017') throw new Error('Refusing to use port 27017: it may hold real data');
  await mongoose.connect(uri);
  // wait for the unique indexes (email, lab code), so duplicate checks do not depend on luck
  await Promise.all(Object.values(models).map((m) => m.init()));
  return { app, uri };
}

// Disconnects and stops the in-memory database. Its temporary data folder is deleted.
async function stop() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  mongoServer = null;
  savedUsers = null;
  savedDemo = {};
}

// Empties all collections but keeps the indexes.
async function clear() {
  await Promise.all(Object.values(models).map((m) => m.deleteMany({})));
}

// Signs a token without calling /api/auth/login. The application allows only 50 calls to
// /api/auth in 15 minutes and we keep that limit active, so most tests should use this.
function tokenFor(user, options = {}) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h', ...options });
}

// Header for a request: request(app).get('/api/labs').set(bearer(token))
// Without a token it returns {}, which is the "unauthenticated" case.
const bearer = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

// Empties the database, then inserts the four users, one lab and one template.
// Returns { users, tokens, lab, template }.
async function seed() {
  await clear();
  const { User, Lab, Template } = models;

  if (savedUsers) {
    await User.collection.insertMany(savedUsers);
  } else {
    for (const u of Object.values(USERS)) await User.create(u); // real model, so passwords are hashed
    savedUsers = await User.collection.find().toArray();
  }

  const users = {};
  const tokens = {};
  for (const [key, u] of Object.entries(USERS)) {
    users[key] = await User.findOne({ email: u.email });
    tokens[key] = tokenFor(users[key]);
  }

  const lab = await Lab.create({ name: 'QA Electronics Laboratory', code: 'QA-01', building: 'QA Block', hazardLevel: 'medium' });
  const template = await Template.create({
    title: 'QA Safety Checklist',
    createdBy: users.admin._id,
    items: [
      { text: 'Fire extinguisher is charged', category: 'Fire Safety', critical: true },
      { text: 'Emergency exit is clear', category: 'Emergency', critical: true },
      { text: 'First aid kit is stocked', category: 'Emergency', critical: false },
      { text: 'Power cables are not damaged', category: 'Electrical', critical: false },
      { text: 'PPE is available', category: 'PPE', critical: false },
    ],
  });
  return { users, tokens, lab, template };
}

// SEED in the test cases = the data of backend/seed.js (demo users, 5 labs, 2 templates, 5 inspections,
// 3 incidents). The real seed.js runs once, on the in-memory database only. Later calls insert a copy.
// SEED+ = seedDemo({ plus: true }): also D1 to D5 of qa/02-stlc-test-cases/test-environment.md.
async function seedDemo({ plus = false } = {}) {
  const collections = Object.values(models).map((m) => m.collection);
  const dump = () => Promise.all(collections.map((c) => c.find().toArray()));
  const restore = async (copy) => {
    await clear();
    await Promise.all(collections.map((c, i) => copy[i].length && c.insertMany(copy[i])));
  };

  if (!savedDemo.seed) {
    const run = spawnSync(process.execPath, [path.join(backendDir, 'seed.js')], {
      cwd: os.tmpdir(), // so a developer's own backend/.env is never read
      env: { ...process.env, MONGO_URI: mongoServer.getUri('qa_memory') },
      encoding: 'utf8',
    });
    if (run.status !== 0) throw new Error(`seed.js failed: ${run.stderr}`);
    savedDemo.seed = await dump();
  }
  if (plus && !savedDemo.plus) {
    await restore(savedDemo.seed);
    const { User, Lab, Template, Inspection } = models;
    const inspector2 = await User.create(USERS.inspector2); // D1
    await User.create({ name: 'Second Admin', email: 'admin2@lab.com', password: 'Admin2@123', role: 'admin' }); // D2
    await User.create({ name: 'Temp User', email: 'temp@lab.com', password: 'Temp@123', role: 'technician' }); // D3
    await Lab.create({ name: 'Temp Lab', code: 'TMP-99', building: 'Block T' }); // D4
    const general = await Template.findOne({ title: /^General/ });
    await Inspection.create({ // D5
      lab: (await Lab.findOne({ code: 'HV-01' }))._id,
      template: general._id,
      templateTitle: general.title,
      inspector: inspector2._id,
      responses: general.items.map((i) => ({ text: i.text, category: i.category, critical: i.critical })),
    });
    savedDemo.plus = await dump();
  }
  await restore(plus ? savedDemo.plus : savedDemo.seed);
  return demoIds();
}

// Collects the ids that the test cases use, for example d.labs['HV-01'] or d.tokens.admin.
async function demoIds() {
  const { User, Lab, Template, Inspection, Incident } = models;
  const emails = {
    admin: 'admin@lab.com', inspector: 'inspector@lab.com', technician: 'tech@lab.com',
    inspector2: 'inspector2@lab.com', admin2: 'admin2@lab.com', temp: 'temp@lab.com',
  };
  const users = {};
  const tokens = {};
  const allUsers = await User.find();
  for (const [key, email] of Object.entries(emails)) {
    const user = allUsers.find((u) => u.email === email);
    if (user) [users[key], tokens[key]] = [user, tokenFor(user)];
  }
  const labs = Object.fromEntries((await Lab.find()).map((l) => [l.code, String(l._id)]));
  const idOf = (doc) => doc && String(doc._id);
  const [general, chemical, ch05, hv01, insp2, lamp, burn] = await Promise.all([
    Template.findOne({ title: /^General/ }),
    Template.findOne({ title: /^Chemical/ }),
    Inspection.findOne({ lab: labs['CH-05'] }),
    Inspection.findOne({ lab: labs['HV-01'], status: 'completed' }),
    users.inspector2 && Inspection.findOne({ inspector: users.inspector2._id }),
    Incident.findOne({ title: /warning lamp/ }),
    Incident.findOne({ title: /soldering burn/ }),
  ]);
  return {
    users, tokens, labs,
    templates: { general: idOf(general), chemical: idOf(chemical) },
    inspections: { ch05: idOf(ch05), hv01: idOf(hv01), insp2: idOf(insp2) },
    incidents: { lamp: idOf(lamp), burn: idOf(burn) },
  };
}

module.exports = {
  app, models, mongoose, jwt, USERS, ROLES,
  start, stop, clear, seed, seedDemo, tokenFor, bearer,
  repoRoot, backendDir,
};
