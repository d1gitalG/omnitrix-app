import puppeteer from 'puppeteer';

// CONFIGURATION
const TARGET_URL = 'http://localhost:5173/jobs';
const EMAIL = 'test@omnitrix.tech';
const PASSWORD = 'password123';
const TIMEOUT_MS = 60000;
const HEADLESS = true;

// CHAOS TOOLS (Inlined for standalone execution)
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
        await new Promise(r => setTimeout(r, 50)); // 50ms interval
      } catch (e) { /* Ignore clicks on disabled buttons */ }
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
  
  // Wait for Dashboard
  await page.waitForSelector('h1', { timeout: 10000 });

  // 2. SLOW NETWORK TEST
  console.log('🐌 Simulating SLOW 3G Connection...');
  await Chaos.throttleNetwork(page, 'Slow3G');

  // Find Button (Clock In or Out)
  const statusText = await page.$eval('h2', el => el.textContent);
  let btnSelector = statusText === 'Clocked In' ? 'button.bg-red-500\\/10' : 'button.bg-green-600';
  let actionName = statusText === 'Clocked In' ? 'Clock Out' : 'Clock In';
  
  console.log(`🕒 Attempting to ${actionName} under stress...`);

  // 3. MASH BUTTON
  await Chaos.mashButton(page, btnSelector, 10);
  
  // 4. CUT CONNECTION (Offline)
  console.log('🔌 CHAOS: Pulling the plug (Offline)!');
  await Chaos.throttleNetwork(page, 'Offline');
  
  // Wait 5 seconds to see what happens
  await new Promise(r => setTimeout(r, 5000));
  
  // Check if UI updated (it shouldn't if Firestore is offline, or maybe optimistic UI kicked in?)
  const newStatus = await page.$eval('h2', el => el.textContent);
  console.log(`📊 Status during Offline: "${newStatus}"`);
  
  // 5. RESTORE CONNECTION
  console.log('📡 CHAOS: Restoring Connection (Fast 3G)...');
  await Chaos.throttleNetwork(page, 'Fast3G');
  
  // Wait for sync
  await new Promise(r => setTimeout(r, 5000));
  
  const finalStatus = await page.$eval('h2', el => el.textContent);
  console.log(`📊 Final Status after Reconnect: "${finalStatus}"`);
  
  if (statusText === finalStatus) {
      console.log('❌ FAIL: Status did not change after reconnect. Duplicate requests might have been rejected or lost.');
  } else {
      console.log('✅ SUCCESS: Status updated correctly despite chaos.');
  }
}

(async () => {
  console.log('🐰 QA Engineer: Starting Clock Stress Test...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    
    // Capture Console Logs
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
