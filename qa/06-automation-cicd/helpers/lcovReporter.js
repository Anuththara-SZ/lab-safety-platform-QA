// The normal lcov reporter writes SF:backend\app.js on Windows. Sonar needs forward slashes,
// so this small version changes only the SF: lines. Everything else is the original reporter.
const LcovOnly = require('istanbul-reports/lib/lcovonly');

module.exports = class LcovReporter extends LcovOnly {
  onStart(root, context) {
    super.onStart(root, context);
    const writer = this.contentWriter;
    const println = writer.println.bind(writer);
    writer.println = (line) => println(line.startsWith('SF:') ? line.replace(/\\/g, '/') : line);
  }
};
