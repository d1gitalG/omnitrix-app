import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

// CONFIGURATION
const TARGET_URL = 'https://omnitrix-app.vercel.app/jobs';
const TIMEOUT_MS = 30000;
const HEADLESS = true;
const TEST_EMAIL = 'test@omnitrix.tech'; // <-- Replace with test email
const TEST_PASSWORD = 'password123'; // <-- Replace with test password

// TEST LOGIC
async function runTest(page) {
  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL);

  // 1. Login
  console.log('👤 Attempting to log in...');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', TEST_EMAIL);
  await page.type('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  console.log('✅ Login form submitted.');

  // 2. Wait for main UI and Clock In
  console.log('🕒 Waiting for main UI and clocking in...');
  await page.waitForSelector('h2 ::-p-text(Clocked In)', { hidden: true, timeout: 10000 }); // Make sure we are clocked OUT first
  const clockInButtonSelector = 'button ::-p-text(Clock In)';
  await page.waitForSelector(clockInButtonSelector);
  await page.click(clockInButtonSelector);
  console.log('✅ Clocked In.');

  // 3. Wait for "Clocked In" state and then Clock Out
  console.log('⏳ Simulating a 3-second job...');
  const clockedInHeaderSelector = 'h2 ::-p-text(Clocked In)';
  await page.waitForSelector(clockedInHeaderSelector); // Confirm we are clocked in
  await setTimeout(3000); // Wait for 3 seconds

  console.log('🕒 Clocking out...');
  const clockOutButtonSelector = 'button ::-p-text(Clock Out)';
  await page.waitForSelector(clockOutButtonSelector);
  await page.click(clockOutButtonSelector);
  console.log('✅ Clocked Out.');

  // 4. Verify we are back to the initial state
  await page.waitForSelector('h2 ::-p-text(Off the Clock)');
  console.log('👍 Verification successful: App is "Off the Clock".');
}

// ---------------------------------------------------------
// RUNNER BOILERPLATE
// ---------------------------------------------------------
(async () => {
  if (TEST_EMAIL === 'YOUR_EMAIL_HERE' || TEST_PASSWORD === 'YOUR_PASSWORD_HERE') {
    console.error('❌ ERROR: Please replace placeholder credentials in the script before running.');
    process.exit(1);
  }
  console.log('🐰 QA Engineer: Starting Test Run...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER] ERROR: ${err.message}`));
    page.setDefaultTimeout(TIMEOUT_MS);
    await runTest(page);
    console.log('✅ QA Engineer: Test Passed!');
  } catch (error) {
    console.error('❌ QA Engineer: Test Failed!');
    console.error(error.message); // Log only message for clarity
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
