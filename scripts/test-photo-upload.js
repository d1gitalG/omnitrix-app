import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const EMAIL = 'test@omnitrix.tech';
const PASSWORD = 'password123';
const URL = 'http://localhost:5173/jobs';
const TEST_IMAGE_PATH = path.resolve('test-image.png');

// Create a dummy image file for testing
if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // A simple 1x1 transparent PNG base64
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    fs.writeFileSync(TEST_IMAGE_PATH, Buffer.from(base64Image, 'base64'));
}

(async () => {
  console.log('🐰 Launching browser...');
  const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  try {
    console.log(`🌐 Navigating to ${URL}...`);
    await page.goto(URL);
    
    // Login Flow
    console.log('⏳ Waiting for Login...');
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
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Check Clock In Status
    const statusText = await page.$eval('h2', el => el.textContent);
    if (statusText === 'Off the Clock') {
        console.log('🕒 Clocking In first...');
        await page.click('button.bg-green-600');
        await page.waitForFunction(() => document.querySelector('h2').textContent === 'Clocked In');
    }
    
    // Test Upload
    console.log('📸 Testing Photo Upload...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found!');

    // Upload the file
    await fileInput.uploadFile(TEST_IMAGE_PATH);
    console.log('⏳ Uploading file...');
    
    // Wait for image to appear in grid (searching for img tag with src starting with https://firebasestorage)
    await page.waitForFunction(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.some(img => img.src.includes('firebasestorage'));
    }, { timeout: 15000 });
    
    console.log('✅ Photo Upload Successful! Image found in UI.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    // Cleanup
    if (fs.existsSync(TEST_IMAGE_PATH)) fs.unlinkSync(TEST_IMAGE_PATH);
    await browser.close();
  }
})();
