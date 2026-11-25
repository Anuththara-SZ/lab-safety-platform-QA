// The 3 UI cases of qa/02-stlc-test-cases/test-cases.md (marked [UI]) in headless Chrome.
// Do not start this file alone. Use: npm run test:ui (it starts the servers and the test data).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE = process.env.UI_BASE_URL;
const EVIDENCE = path.resolve(__dirname, '..', '..', 'evidence');
const WAIT = 20000;

const ACCOUNTS = {
  admin: { email: 'admin@lab.com', password: 'Admin@123', name: 'Dr. Admin' },
  inspector: { email: 'inspector@lab.com', password: 'Inspector@123', name: 'Nimal Perera' },
  technician: { email: 'tech@lab.com', password: 'Tech@123', name: 'Kamal Silva' },
};

const byText = (tag, text) => By.xpath(`//${tag}[normalize-space()="${text}"]`);
const ADD_LAB = By.xpath('//button[contains(normalize-space(),"Add laboratory")]');
const EDIT_LAB = byText('button', 'Edit');
const DELETE_LAB = byText('button', 'Delete');
const USERS_MENU = byText('nav//a', 'Users');
const LABS_MENU = byText('nav//a', 'Laboratories');
const DASHBOARD_TITLE = byText('h1', 'Safety Dashboard');
const LAB_ROW = byText('td', 'HV-01');
const LABS = 5; // number of labs in the demo data (backend/seed.js)

async function screenshot(driver, name) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE, `${name}.png`), await driver.takeScreenshot(), 'base64');
}

// Opens a new Chrome with an empty profile, runs the steps, and always closes it.
async function inBrowser(name, steps) {
  const options = new chrome.Options();
  options.addArguments('--headless=new', '--window-size=1366,900', '--force-prefers-reduced-motion');
  if (process.env.CI) options.addArguments('--no-sandbox', '--disable-dev-shm-usage');
  options.setUserPreferences({ credentials_enable_service: false, 'profile.password_manager_leak_detection': false });
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await steps(driver);
  } catch (err) {
    await screenshot(driver, `ui-FAILED-${name}`).catch(() => {});
    throw err;
  } finally {
    await driver.quit();
  }
}

async function visible(driver, locator) {
  const element = await driver.wait(until.elementLocated(locator), WAIT, `not found: ${locator}`);
  return driver.wait(until.elementIsVisible(element), WAIT, `not visible: ${locator}`);
}

const count = async (driver, locator) => (await driver.findElements(locator)).length;
const pathname = async (driver) => new URL(await driver.getCurrentUrl()).pathname;
const savedToken = (driver) => driver.executeScript('return localStorage.getItem("token")');
const waitForPath = (driver, expected) =>
  driver.wait(async () => (await pathname(driver)) === expected, WAIT, `the page did not go to ${expected}`);

async function submitLogin(driver, email, password) {
  await driver.get(`${BASE}/login`);
  await (await visible(driver, By.id('email'))).sendKeys(email);
  await driver.findElement(By.id('password')).sendKeys(password);
  await (await visible(driver, By.css('button[type="submit"]'))).click();
}

async function logIn(driver, role) {
  await submitLogin(driver, ACCOUNTS[role].email, ACCOUNTS[role].password);
  await visible(driver, DASHBOARD_TITLE);
  await visible(driver, byText('aside//div', ACCOUNTS[role].name));
}

async function openLabs(driver) {
  await (await visible(driver, LABS_MENU)).click();
  await waitForPath(driver, '/labs');
  await visible(driver, LAB_ROW); // the list is really loaded before we count buttons
}

test('TC-AUTH-01 [UI] valid admin login lands on the dashboard', { timeout: 120000 }, () =>
  inBrowser('TC-AUTH-01', async (driver) => {
    await logIn(driver, 'admin');
    assert.equal(await pathname(driver), '/');
    assert.ok(await savedToken(driver), 'no token was saved');
    // real data from the API
    const activeLabs = By.xpath('//p[normalize-space()="Active laboratories"]/following-sibling::p');
    assert.equal(await (await visible(driver, activeLabs)).getText(), String(LABS));
    await driver.sleep(2500); // only for the picture: the charts are drawn with an animation
    await screenshot(driver, 'ui-TC-AUTH-01-admin-dashboard');
  }));

test('TC-AUTH-02 [UI] wrong password shows an error and stays on login', { timeout: 120000 }, () =>
  inBrowser('TC-AUTH-02', async (driver) => {
    await submitLogin(driver, ACCOUNTS.admin.email, 'Wrong@123');
    const alert = await visible(driver, By.css('[role="alert"]'));
    assert.equal((await alert.getText()).trim(), 'Invalid email or password');
    await driver.sleep(1500); // give a wrong redirect the time to happen
    assert.equal(await pathname(driver), '/login');
    assert.equal(await count(driver, DASHBOARD_TITLE), 0);
    assert.equal(await savedToken(driver), null);
    await screenshot(driver, 'ui-TC-AUTH-02-wrong-password');
  }));

test('TC-PERM-02 [UI] technician does not see admin-only controls', { timeout: 240000 }, async () => {
  // d. not logged in: sent to the login page
  await inBrowser('TC-PERM-02-unauthenticated', async (driver) => {
    await driver.get(`${BASE}/labs`);
    await waitForPath(driver, '/login');
    await visible(driver, By.id('email'));
    assert.equal(await count(driver, ADD_LAB), 0, 'unauthenticated: add button');
    await screenshot(driver, 'ui-TC-PERM-02-unauthenticated');
  });

  // c. admin sees the controls. This also proves that the locators below are correct.
  await inBrowser('TC-PERM-02-admin', async (driver) => {
    await logIn(driver, 'admin');
    await openLabs(driver);
    await visible(driver, ADD_LAB);
    assert.equal(await count(driver, ADD_LAB), 1, 'admin: add button');
    assert.equal(await count(driver, EDIT_LAB), LABS, 'admin: edit button of every lab');
    assert.equal(await count(driver, DELETE_LAB), LABS, 'admin: delete button of every lab');
    assert.equal(await count(driver, USERS_MENU), 1, 'admin: Users menu');
    await screenshot(driver, 'ui-TC-PERM-02-admin');
    // the Users page must open for the admin, so the redirect check below means something
    await driver.get(`${BASE}/users`);
    await visible(driver, byText('td', ACCOUNTS.technician.email));
    assert.equal(await pathname(driver), '/users');
  });

  // a and b. technician and inspector see the labs but none of the controls
  for (const role of ['technician', 'inspector']) {
    await inBrowser(`TC-PERM-02-${role}`, async (driver) => {
      await logIn(driver, role);
      await openLabs(driver);
      assert.equal(await count(driver, ADD_LAB), 0, `${role}: add button`);
      assert.equal(await count(driver, EDIT_LAB), 0, `${role}: edit button`);
      assert.equal(await count(driver, DELETE_LAB), 0, `${role}: delete button`);
      assert.equal(await count(driver, USERS_MENU), 0, `${role}: Users menu`);
      await screenshot(driver, `ui-TC-PERM-02-${role}`);
      await driver.get(`${BASE}/users`);
      await waitForPath(driver, '/');
      await visible(driver, DASHBOARD_TITLE);
    });
  }
});
