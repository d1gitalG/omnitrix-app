import puppeteer from 'puppeteer';
import { HEADLESS, TIMEOUT_MS } from './config.js';

export async function launchPage({ width = 400, height = 800 } = {}) {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width, height }
  });

  const page = await browser.newPage();

  page.on('console', (msg) => console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', (err) => console.error(`[BROWSER] ERROR: ${err.message}`));

  page.setDefaultTimeout(TIMEOUT_MS);

  return { browser, page };
}
