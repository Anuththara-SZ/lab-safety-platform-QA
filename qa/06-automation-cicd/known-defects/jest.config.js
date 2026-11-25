// Tests that show KNOWN APPLICATION DEFECTS (see qa/08-defects).
// They are real tests of the requirements, so they FAIL until the application is fixed.
// Do not skip them and do not use test.failing. Run from the qa folder: npm run test:defects
const { rootDir, testEnvironment, transform, testTimeout, verbose, reporters } = require('../../jest.config');

module.exports = {
  rootDir,
  testEnvironment,
  transform,
  testTimeout,
  verbose,
  reporters,
  roots: ['<rootDir>/qa/06-automation-cicd/known-defects'],
  testMatch: ['<rootDir>/qa/06-automation-cicd/known-defects/**/*.test.js'],
};
