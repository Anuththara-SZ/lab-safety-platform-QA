// Runs the Selenium UI tests. Run from the qa folder: npm run test:ui
// Steps: in-memory MongoDB -> test data -> backend -> frontend build and preview -> ui.test.js
// Everything that was started is stopped again at the end, also after a failure or Ctrl+C.
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const testApp = require('../helpers/testApp');

// Fixed, because frontend/vite.config.js sends /api to http://localhost:5000
const API_PORT = 5000;
const WEB_PORT = 5173;
const BASE_URL = `http://localhost:${WEB_PORT}`;
const MAX_RUN_MS = 8 * 60 * 1000;

const frontendDir = path.join(testApp.repoRoot, 'frontend');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
const evidenceDir = path.join(testApp.repoRoot, 'qa', 'evidence');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ui-')); // the build goes here, not into frontend/dist
const distDir = path.join(workDir, 'dist');

const children = [];

function startProcess(name, args, options = {}) {
  // detached on Linux gives the child its own process group, so the whole group can be stopped
  const child = spawn(process.execPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    ...options,
    env: { ...process.env, ...options.env },
  });
  const print = (data) => String(data).split(/\r?\n/).filter(Boolean).forEach((line) => console.log(`[${name}] ${line}`));
  child.stdout.on('data', print);
  child.stderr.on('data', print);
  child.exited = new Promise((resolve) => {
    child.on('error', (err) => { console.error(`[${name}] ${err.message}`); resolve(1); });
    child.on('close', (code) => resolve(code ?? 1));
  });
  children.push(child);
  return child;
}

// Stops a child together with the processes it started (for example chromedriver and its Chrome).
function killTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already stopped */ }
}

function assertPortFree(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is already in use. Stop that program and run again.`)));
    server.listen(port, () => server.close(resolve));
  });
}

async function waitForUrl(url, child, check, seconds = 60) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`The process for ${url} stopped with exit code ${child.exitCode}`);
    try {
      const res = await fetch(url);
      if (res.ok && check(await res.text())) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${url} was not ready after ${seconds} seconds`);
}

async function main() {
  await assertPortFree(API_PORT);
  await assertPortFree(WEB_PORT);

  const { uri } = await testApp.start();
  await testApp.seedDemo(); // SEED of the test cases (backend/seed.js, on the in-memory database only)
  console.log(`[run-ui] in-memory MongoDB: ${uri}`);

  // cwd is the temporary folder, so a developer's own backend/.env is never read
  const backend = startProcess('backend', [path.join(testApp.backendDir, 'server.js')], {
    cwd: workDir,
    env: { PORT: String(API_PORT), MONGO_URI: uri, CLIENT_URL: BASE_URL, NODE_ENV: 'test', JWT_SECRET: process.env.JWT_SECRET },
  });
  await waitForUrl(`http://localhost:${API_PORT}/api/health`, backend, (t) => t.includes('"ok"'));

  const build = startProcess('build', [viteBin, 'build', '--outDir', distDir, '--emptyOutDir'], { cwd: frontendDir, env: { NODE_ENV: 'production' } });
  if ((await build.exited) !== 0) throw new Error('The frontend build failed');

  const preview = startProcess('preview', [viteBin, 'preview', '--outDir', distDir, '--port', String(WEB_PORT), '--strictPort'], { cwd: frontendDir });
  await waitForUrl(BASE_URL, preview, (t) => t.includes('id="root"'));
  await waitForUrl(`${BASE_URL}/api/health`, preview, (t) => t.includes('"ok"')); // the /api proxy works too

  // remove old screenshots, so every picture in evidence comes from this run
  for (const f of fs.readdirSync(evidenceDir)) {
    if (f.startsWith('ui-') && f.endsWith('.png')) fs.rmSync(path.join(evidenceDir, f));
  }

  const tests = startProcess('ui-test', ['--test', '--test-reporter=spec', 'ui.test.js'], {
    cwd: __dirname,
    env: { UI_BASE_URL: BASE_URL, SE_AVOID_STATS: 'true', NODE_TEST_CONTEXT: undefined },
  });
  return tests.exited;
}

let cleaning = null;
function cleanUp() {
  cleaning ??= (async () => {
    children.reverse().forEach(killTree);
    await testApp.stop().catch((err) => console.error(`[run-ui] ${err.message}`));
    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log('[run-ui] all started processes are stopped');
  })();
  return cleaning;
}

async function abort(reason) {
  console.error(`[run-ui] ${reason}`);
  await cleanUp();
  process.exit(1);
}
process.on('SIGINT', () => abort('stopped by the user'));
process.on('SIGTERM', () => abort('stopped'));
setTimeout(() => abort('took too long'), MAX_RUN_MS).unref();

main()
  .catch((err) => { console.error(`[run-ui] ${err.message}`); return 1; })
  .then(async (code) => {
    await cleanUp();
    console.log(`[run-ui] exit code ${code}`);
    process.exit(code);
  });
