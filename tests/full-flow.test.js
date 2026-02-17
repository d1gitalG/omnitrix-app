import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

// CONFIGURATION
const TARGET_URL = 'http://localhost:5173'; // NOTE: Testing locally before deployment!
const TIMEOUT_MS = 30000;
const HEADLESS = true; // Set to false to watch the test run
const TEST_EMAIL = 'test@omnitrix.tech';
const TEST_PASSWORD = 'password123';

// TEST LOGIC
async function runTest(page) {
  console.log(`🌐 Navigating to ${TARGET_URL}/jobs...`);
  await page.goto(`${TARGET_URL}/jobs`);

  // 1. Login
  console.log('👤 Attempting to log in...');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', TEST_EMAIL);
  await page.type('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  console.log('✅ Login form submitted.');

  // 2. Clock In & Out to generate a new log
  console.log('🕒 Clocking in to create a new record...');
  const clockInButtonSelector = 'button ::-p-text(Clock In)';
  await page.waitForSelector(clockInButtonSelector);
  await page.click(clockInButtonSelector);
  await page.waitForSelector('h2 ::-p-text(Clocked In)');
  await setTimeout(2000); // Wait 2s
  const clockOutButtonSelector = 'button ::-p-text(Clock Out)';
  await page.waitForSelector(clockOutButtonSelector);
  await page.click(clockOutButtonSelector);
  console.log('✅ Clocked out.');

  // 3. Verify the new log appears in "Recent Activity"
  console.log('🧐 Verifying recent activity list...');
  await page.waitForSelector('h2 ::-p-text(Off the Clock)');
  // This looks for "Completed:" which is unique to the new component
  await page.waitForSelector('p ::-p-text(Completed:)', { timeout: 10000 });
  console.log('👍 Verification successful: New job log appeared.');

  // 4. Navigate to Profile and verify email
  console.log('👤 Navigating to profile page...');
  const profileLinkSelector = 'a[href="/profile"]';
  await page.waitForSelector(profileLinkSelector);
  await page.click(profileLinkSelector);
  console.log('✅ Clicked profile link.');
  
  const emailSelector = `p ::-p-text(${TEST_EMAIL})`;
  await page.waitForSelector(emailSelector);
  console.log('👍 Verification successful: Email is correct on profile page.');

  // 5. Sign out from profile page
  console.log('🚪 Signing out...');
  const signOutButtonSelector = 'button ::-p-text(Sign Out)';
  await page.waitForSelector(signOutButtonSelector);
  await page.click(signOutButtonSelector);

  // 6. Verify we are back on the login screen
  await page.waitForSelector('h2 ::-p-text(Tech Login)');
  console.log('👍 Verification successful: Returned to login screen.');
}

// ---------------------------------------------------------
// RUNNER BOILERPLATE
// ---------------------------------------------------------
(async () => {
  console.log('🐰 QA Engineer: Starting Full-Flow Test Run...');
  let browser;
  try {
    // We need to run the local dev server for this test
    console.log('💡 NOTE: This test requires the local dev server (npm run dev) to be running.');
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 400, height: 800 } // Mobile viewport
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER] ERROR: ${err.message}`));
    page.setDefaultTimeout(TIMEOUT_MS);
    await runTest(page);
    console.log('✅ QA Engineer: Full-Flow Test Passed!');
  } catch (error) {
    console.error('❌ QA Engineer: Test Failed!');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
