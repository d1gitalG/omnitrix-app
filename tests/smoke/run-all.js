import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL, PROFILE_URL, TEST_EMAIL, TEST_PASSWORD } from './config.js';
import fs from 'node:fs/promises';
import path from 'node:path';

import { launchPage } from './puppeteer.js';
import {
  clockIn,
  clockOut,
  ensureClockedOut,
  getRecentTopJobType,
  loginOnJobs,
  requireCreds,
  setJobType,
  uploadOnePhoto
} from './helpers.js';

const onlyArgIdx = process.argv.indexOf('--only');
const ONLY = onlyArgIdx !== -1 ? (process.argv[onlyArgIdx + 1] || '').toLowerCase() : '';

function shouldRun(name) {
  if (!ONLY) return true;
  return ONLY === name;
}

async function testJobs(page) {
  console.log('\n🧪 [jobs] Login + Job Type selector visible when clocked out');
  await requireCreds(TEST_EMAIL, TEST_PASSWORD, 'test user');
  await loginOnJobs(page, TEST_EMAIL, TEST_PASSWORD);
  await ensureClockedOut(page);

  // Job Type selector should be visible when clocked out
  await page.waitForSelector('label[for="jobType"]');
  await page.waitForFunction(() => {
    const label = document.querySelector('label[for="jobType"]');
    return !!label && (label.textContent || '').includes('Job Type');
  }, { timeout: 60000 });
  await page.waitForSelector('select#jobType');
  console.log('✅ [jobs] jobType selector present');
}

async function testClockFlow(page) {
  console.log('\n🧪 [clock] Clock In/Out + Recent Activity shows selected job type');
  await ensureClockedOut(page);

  const desiredType = 'Installation';
  await setJobType(page, desiredType);
  await clockIn(page);
  await clockOut(page);

  const topType = await getRecentTopJobType(page);
  if (!topType) throw new Error('Recent Activity item not found');
  if (topType !== desiredType) {
    throw new Error(`Recent Activity top job type mismatch. Expected "${desiredType}", got "${topType}"`);
  }
  console.log(`✅ [clock] recent activity shows job type: ${topType}`);
}

async function testUpload(page) {
  console.log('\n🧪 [upload] Upload 1 photo during an active job');
  await ensureClockedOut(page);
  await clockIn(page);

  await uploadOnePhoto(page);
  console.log('✅ [upload] photo tile appeared');

  // Cleanup
  await clockOut(page);
}

async function testAdmin(page) {
  console.log('\n🧪 [admin] Admin route gating');

  // Non-admin should be redirected to /jobs
  await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const path = window.location?.pathname || '';
    const body = document.body?.innerText || '';
    return path.includes('/jobs') || body.includes('Job Logs') || body.includes('Tech Login');
  }, { timeout: 60000 });
  console.log('✅ [admin] non-admin blocked (redirected away from /admin)');

  // Optional: admin creds check (off by default — requires explicit opt-in)
  // Set OFA_RUN_ADMIN_LOGIN_TEST=1 plus OFA_ADMIN_EMAIL/OFA_ADMIN_PASSWORD to enable.
  if (process.env.OFA_RUN_ADMIN_LOGIN_TEST !== '1' || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('ℹ️  [admin] Skipping admin-access login test (set OFA_RUN_ADMIN_LOGIN_TEST=1 and OFA_ADMIN_EMAIL/OFA_ADMIN_PASSWORD).');
    return;
  }

  // Admin session: this Puppeteer build doesn't support creating isolated contexts,
  // so we best-effort sign out and sign in as admin in a separate tab.
  const browser = page.browser();
  const adminPage = await browser.newPage();
  adminPage.on('console', (msg) => console.log(`[BROWSER][ADMIN] ${msg.type().toUpperCase()}: ${msg.text()}`));
  adminPage.on('pageerror', (err) => console.error(`[BROWSER][ADMIN] ERROR: ${err.message}`));

  // Ensure signed out first
  await adminPage.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });

  // Best-effort sign out (don't rely on Playwright-style selectors)
  await adminPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      ((b.textContent || '').replace(/\s+/g, ' ').trim()).includes('Sign Out')
    );
    if (btn) btn.click();
  });

  // Login as admin via /jobs, then visit /admin
  await loginOnJobs(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
  await adminPage.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
  await adminPage.waitForFunction(() => document.body?.innerText?.includes('Admin Dashboard'), { timeout: 60000 });
  console.log('✅ [admin] admin can access dashboard');

  await adminPage.close();
}

(async () => {
  console.log('🐰 OFA Smoke Suite: starting…');
  const { browser, page } = await launchPage();

  try {
    if (shouldRun('jobs') || shouldRun('clock') || shouldRun('upload') || shouldRun('admin')) {
      // Login once for the default test user
      if (!shouldRun('admin')) {
        await requireCreds(TEST_EMAIL, TEST_PASSWORD, 'test user');
        await loginOnJobs(page, TEST_EMAIL, TEST_PASSWORD);
      } else {
        // admin test still needs non-admin creds first
        await requireCreds(TEST_EMAIL, TEST_PASSWORD, 'test user');
        await loginOnJobs(page, TEST_EMAIL, TEST_PASSWORD);
      }
    }

    if (shouldRun('jobs')) await testJobs(page);
    if (shouldRun('clock')) await testClockFlow(page);
    if (shouldRun('upload')) await testUpload(page);
    if (shouldRun('admin')) await testAdmin(page);

    console.log('\n✅ OFA Smoke Suite: ALL REQUESTED TESTS PASSED');
  } catch (err) {
    console.error('\n❌ OFA Smoke Suite: FAILED');
    console.error(err);

    // Write debug artifacts to help diagnose flaky UI/auth/state.
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const outDir = path.join(process.cwd(), 'tests', 'smoke', '_artifacts', ts);
      await fs.mkdir(outDir, { recursive: true });

      await fs.writeFile(path.join(outDir, 'url.txt'), String(page.url()));
      await fs.writeFile(path.join(outDir, 'content.html'), await page.content());

      const diag = await page.evaluate(() => {
        const btn = document.querySelector('div.rounded-2xl.border.p-6 button');
        const btnText = (btn?.textContent || '').replace(/\s+/g, ' ').trim();
        const btnDisabled = btn ? (btn).disabled : null;
        return {
          title: document.title,
          hasEmailInput: !!document.querySelector('input[type="email"]'),
          hasPasswordInput: !!document.querySelector('input[type="password"]'),
          bodyTextHead: (document.body?.innerText || '').slice(0, 2000),
          clockButton: { exists: !!btn, disabled: btnDisabled, text: btnText }
        };
      });
      await fs.writeFile(path.join(outDir, 'diag.json'), JSON.stringify(diag, null, 2));

      await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });
      console.error(`(debug) wrote artifacts: ${outDir}`);
    } catch (artifactErr) {
      console.error('(debug) failed to write artifacts');
      console.error(artifactErr);
    }

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
