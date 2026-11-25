// Jest settings for the normal test run (unit tests + API tests).
// Run from the qa folder: npm test   or   npm run test:coverage
// Tests for known application defects are NOT here. They have their own settings in
// 06-automation-cicd/known-defects/jest.config.js and run with: npm run test:defects
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

module.exports = {
  rootDir: repoRoot,
  testEnvironment: 'node',
  // backend is in roots only so that the coverage report also counts backend files that
  // no test loads (for example config/db.js). testMatch decides which tests run.
  roots: ['<rootDir>/qa/05-tdd-bdd/unit', '<rootDir>/qa/06-automation-cicd/api', '<rootDir>/backend'],
  testMatch: ['<rootDir>/qa/05-tdd-bdd/unit/**/*.test.js', '<rootDir>/qa/06-automation-cicd/api/**/*.test.js'],
  // The application and the tests are plain CommonJS, so Babel is not needed. With the default
  // Babel transform the coverage table came out empty on this machine.
  transform: {},
  testTimeout: 60000, // starting the in-memory MongoDB can take some seconds
  verbose: true,
  reporters: ['default'],
  collectCoverageFrom: ['backend/**/*.js', '!**/node_modules/**', '!backend/seed.js', '!backend/server.js'],
  coverageDirectory: '<rootDir>/qa/coverage',
  coverageReporters: [
    'text',
    'json-summary',
    ['html', { subdir: 'lcov-report' }],
    // writes qa/coverage/lcov.info with paths like SF:backend/app.js (needed by Sonar)
    [path.join(__dirname, '06-automation-cicd', 'helpers', 'lcovReporter.js'), { projectRoot: repoRoot }],
  ],
};
