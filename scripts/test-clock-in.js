import puppeteer from 'puppeteer';

const EMAIL = 'test@omnitrix.tech';
const PASSWORD = 'password123';
const URL = 'http://localhost:5173/jobs';

(async () => {
  console.log('🐰 Launching browser...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // Headless mode (invisible)
  const page = await browser.newPage();

  try {
    console.log(`🌐 Navigating to ${URL}...`);
    await page.goto(URL);
    
    // Wait for Login Form
    console.log('⏳ Waiting for Login Form...');
    await page.waitForSelector('input[type="email"]');
    
    // Fill Credentials
    console.log('🔑 Logging in...');
    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    
    // Click Sign In
    await page.click('button[type="submit"]');
    
    // Wait for Dashboard (Clock In button)
    console.log('⏳ Waiting for Dashboard...');
    await page.waitForSelector('h1', { timeout: 5000 }); // Wait for "Job Logs" header
    
    // Check Status
    const statusText = await page.$eval('h2', el => el.textContent);
    console.log(`📊 Current Status: "${statusText}"`);
    
    if (statusText === 'Clocked In') {
        console.log('✅ Already Clocked In! Testing Clock Out...');
        const btn = await page.$('button.bg-red-500\\/10'); // Clock Out button (red style)
        if (btn) {
            await btn.click();
            await page.waitForFunction(() => document.querySelector('h2').textContent === 'Off the Clock');
            console.log('✅ Clock Out Successful!');
        }
    } else {
        console.log('🕒 Testing Clock In...');
        const btn = await page.$('button.bg-green-600'); // Clock In button (green style)
        if (btn) {
            await btn.click();
            await page.waitForFunction(() => document.querySelector('h2').textContent === 'Clocked In');
            console.log('✅ Clock In Successful!');
        } else {
            console.error('❌ Could not find Clock In button!');
        }
    }

    console.log('🎉 Test Complete!');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await browser.close();
  }
})();
