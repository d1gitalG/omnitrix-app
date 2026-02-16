import puppeteer from 'puppeteer';

// CONFIGURATION
const TARGET_URL = 'http://localhost:5173/jobs';
const EMAIL = 'test@omnitrix.tech';
const PASSWORD = 'password123';
const TIMEOUT_MS = 60000;
const HEADLESS = true;

// CHAOS TOOLS
const Chaos = {
  async throttleNetwork(page, condition = 'Regular3G') {
    console.log(`🐌 CHAOS: Throttling network to ${condition}...`);
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    const profiles = {
      'Offline': { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
      'Slow3G': { offline: false, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 2000 },
      'Regular3G': { offline: false, downloadThroughput: 750 * 1024 / 8, uploadThroughput: 250 * 1024 / 8, latency: 100 },
      'Fast3G': { offline: false, downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 40 }
    };
    await client.send('Network.emulateNetworkConditions', profiles[condition] || profiles['Regular3G']);
  },

  async mashButton(page, selector, times = 5) {
    console.log(`🥊 CHAOS: Mashing ${selector} ${times} times!`);
    for (let i = 0; i < times; i++) {
      try {
        await page.click(selector);
        await new Promise(r => setTimeout(r, 50)); 
      } catch (e) { }
    }
  }
};

async function runStressTest(page) {
  console.log(`🌐 Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL);

  // 1. LOGIN
  console.log('⏳ Waiting for Login Form...');
  try {
      await page.waitForSelector('input[type="email"]', { timeout: 3000 });
      console.log('🔑 Logging in...');
      await page.type('input[type="email"]', EMAIL);
      await page.type('input[type="password"]', PASSWORD);
      await page.click('button[type="submit"]');
  } catch (e) {
      console.log('✅ Already logged in (or skipped).');
  }
  
  await page.waitForSelector('h1', { timeout: 10000 });

  // 2. FORCE CLOCK IN (If needed)
  let statusText = await page.$eval('h2', el => el.textContent);
  if (statusText === 'Off the Clock') {
      console.log('⚠️ Status is "Off the Clock". Clocking In first (Normal Mode)...');
      await page.click('button.bg-green-600');
      await page.waitForFunction(() => document.querySelector('h2').textContent === 'Clocked In');
      console.log('✅ Clocked In. Waiting 2s for sync...');
      await new Promise(r => setTimeout(r, 2000));
  }

  // 3. START CHAOS
  console.log('🐌 Simulating SLOW 3G Connection...');
  await Chaos.throttleNetwork(page, 'Slow3G');

  console.log('🕒 Attempting to CLOCK OUT under stress...');
  
  // 4. MASH BUTTON (Red "Clock Out")
  const btnSelector = 'button.bg-red-500\\/10';
  await Chaos.mashButton(page, btnSelector, 10);
  
  // 5. CUT CONNECTION
  console.log('🔌 CHAOS: Pulling the plug (Offline)!');
  await Chaos.throttleNetwork(page, 'Offline');
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check Status
  const newStatus = await page.$eval('h2', el => el.textContent);
  console.log(`📊 Status during Offline: "${newStatus}"`);
  
  if (newStatus !== 'Off the Clock') {
      console.error('❌ FAIL: UI did not update to "Off the Clock" immediately!');
  }

  // 6. RESTORE CONNECTION
  console.log('📡 CHAOS: Restoring Connection (Fast 3G)...');
  await Chaos.throttleNetwork(page, 'Fast3G');
  
  await new Promise(r => setTimeout(r, 5000));
  
  const finalStatus = await page.$eval('h2', el => el.textContent);
  console.log(`📊 Final Status after Reconnect: "${finalStatus}"`);
  
  if (finalStatus === 'Off the Clock') {
      console.log('✅ SUCCESS: Clock Out persisted correctly.');
  } else {
      console.log('❌ FAIL: Status reverted or sync failed.');
  }
}

(async () => {
  console.log('🐰 QA Engineer: Starting Clock OUT Stress Test...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 },
      userDataDir: './puppeteer-data' // PERSISTENT STORAGE
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('[vite]') && !text.includes('React DevTools')) {
            console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${text}`);
        }
    });

    await runStressTest(page);

    console.log('✅ QA Engineer: Stress Test Finished!');
  } catch (error) {
    console.error('❌ QA Engineer: Test Failed!');
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }
})();
