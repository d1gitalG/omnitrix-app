import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JOBS_URL } from './config.js';

export async function requireCreds(email, password, label = 'test user') {
  if (!email || !password) {
    throw new Error(
      `Missing credentials for ${label}. Set env vars (e.g. OFA_TEST_EMAIL / OFA_TEST_PASSWORD).`
    );
  }
}

export async function gotoJobs(page) {
  await page.goto(JOBS_URL, { waitUntil: 'domcontentloaded' });
}

async function waitForText(page, text, { timeout = 60000, caseInsensitive = true } = {}) {
  await page.waitForFunction(
    (t, ci) => {
      const bodyText = document.body && document.body.innerText ? document.body.innerText : '';
      if (!bodyText) return false;
      if (ci) return bodyText.toLowerCase().includes(String(t).toLowerCase());
      return bodyText.includes(t);
    },
    { timeout },
    text,
    caseInsensitive
  );
}

async function clickButtonByText(page, text, { timeout = 60000 } = {}) {
  // We match by *contains* instead of exact because buttons can include spinner markup / whitespace.
  await page.waitForFunction(
    (t) => Array.from(document.querySelectorAll('button')).some((b) => ((b.textContent || '').replace(/\s+/g, ' ').trim()).includes(t)),
    { timeout },
    text
  );

  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => ((b.textContent || '').replace(/\s+/g, ' ').trim()).includes(t)
    );
    if (!btn) throw new Error(`button not found: ${t}`);
    btn.click();
  }, text);
}

export async function loginOnJobs(page, email, password) {
  await gotoJobs(page);

  // Wait until either the app shell is visible or the login form is visible.
  // (Sometimes auth state resolves quickly and the login form never appears.)
  await page.waitForFunction(() => {
    const hasLoginInputs = !!document.querySelector('input[type="email"]') && !!document.querySelector('input[type="password"]');
    const hasJobLogsHeader = Array.from(document.querySelectorAll('h1,h2')).some((el) => (el.textContent || '').includes('Job Logs'));
    return hasLoginInputs || hasJobLogsHeader;
  }, { timeout: 60000 });

  const hasEmailInput = await page.$('input[type="email"]');
  if (!hasEmailInput) {
    // Already logged in
    return;
  }

  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Confirm we landed in the app
  await waitForText(page, 'Job Logs', { timeout: 60000 });
}

const CLOCK_BUTTON_SELECTOR = 'div.rounded-2xl.border.p-6 button';

async function waitMainClockButtonEnabled(page, { timeout = 120000 } = {}) {
  // Be tolerant: the UI can disable via `disabled`, `aria-disabled`, or show a spinner.
  await page.waitForFunction(
    (sel) => {
      const btn = document.querySelector(sel);
      if (!btn) return false;

      const ariaDisabled = btn.getAttribute('aria-disabled') === 'true';
      const hasDisabledAttr = btn.hasAttribute('disabled');
      const disabled = !!btn.disabled || ariaDisabled || hasDisabledAttr;

      const hasSpinner = !!btn.querySelector('svg.animate-spin, .animate-spin');
      return !disabled && !hasSpinner;
    },
    { timeout },
    CLOCK_BUTTON_SELECTOR
  );
}

async function clickMainClockButton(page) {
  await waitMainClockButtonEnabled(page, { timeout: 120000 });
  await page.click(CLOCK_BUTTON_SELECTOR);
}

async function waitForJobStatus(page, statusText, { timeout = 120000 } = {}) {
  // Avoid matching toast text like "Successfully Clocked In!".
  // The real status text is rendered in the main status card h2.
  const selector = 'div.rounded-2xl.border.p-6 h2';
  await page.waitForFunction(
    (sel, expected) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return txt === expected;
    },
    { timeout },
    selector,
    statusText
  );
}

export async function ensureClockedOut(page) {
  const isClockedIn = await page.evaluate(() => {
    const el = document.querySelector('div.rounded-2xl.border.p-6 h2');
    const txt = (el?.textContent || '').replace(/\s+/g, ' ').trim();
    return txt === 'Clocked In';
  });

  if (isClockedIn) {
    await clickMainClockButton(page);
    await waitForJobStatus(page, 'Off the Clock', { timeout: 120000 });
    await waitMainClockButtonEnabled(page, { timeout: 120000 });
  } else {
    await waitForJobStatus(page, 'Off the Clock', { timeout: 120000 });
  }
}

export async function clockIn(page) {
  await clickMainClockButton(page);
  await waitForJobStatus(page, 'Clocked In', { timeout: 120000 });
  await waitMainClockButtonEnabled(page, { timeout: 120000 });
}

export async function clockOut(page) {
  await clickMainClockButton(page);
  await waitForJobStatus(page, 'Off the Clock', { timeout: 120000 });
  await waitMainClockButtonEnabled(page, { timeout: 120000 });
}

export async function setJobType(page, value) {
  await page.waitForSelector('select#jobType');
  await page.select('select#jobType', value);
}

export async function getRecentTopJobType(page) {
  await waitForText(page, 'Recent Activity');
  await waitForText(page, 'Completed:');

  const topType = await page.evaluate(() => {
    const firstBold = document.querySelector('p.text-sm.font-bold');
    return firstBold?.textContent?.trim() || '';
  });
  return topType;
}

export async function makeTempTinyPng() {
  // 1x1 PNG
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Z2y8AAAAASUVORK5CYII=';
  const buf = Buffer.from(base64, 'base64');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ofa-smoke-'));
  const filePath = path.join(dir, 'tiny.png');
  await fs.writeFile(filePath, buf);
  return filePath;
}

export async function uploadOnePhoto(page) {
  // This test usually targets the deployed Vercel app, so we can't rely on local-only data-testid changes.
  // Use stable selectors + text matching instead.

  // Pick a file into the BEFORE queue
  const input = await page.waitForSelector('input#jobPhotosBefore[type="file"][accept^="image"]', { timeout: 60000 });
  const filePath = await makeTempTinyPng();

  await input.uploadFile(filePath);

  // Wait until the pending BEFORE upload button appears (text changes with count)
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('button')).some((b) =>
        /upload\s+\d+\s+before\s+photo/i.test((b.textContent || '').replace(/\s+/g, ' ').trim())
      ),
    { timeout: 60000 }
  );

  // Click the specific BEFORE upload button
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /upload\s+\d+\s+before\s+photo/i.test((b.textContent || '').replace(/\s+/g, ' ').trim())
    );
    if (!btn) throw new Error('before upload button not found');
    btn.click();
  });

  // Wait for upload to complete by observing that an img tile appears
  await page.waitForSelector('img[alt="Job"]', { timeout: 120000 });
}
