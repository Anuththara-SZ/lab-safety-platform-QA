// Starts one in-memory database for the whole run and gives every scenario fresh data.
const { BeforeAll, Before, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const testApp = require('../../06-automation-cicd/helpers/testApp');

setDefaultTimeout(60 * 1000);

BeforeAll(() => testApp.start());

Before(async function () {
  this.data = await testApp.seed(); // users, tokens, one lab, one template
});

AfterAll(() => testApp.stop());
