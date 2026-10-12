// Rauchtest: node tests/smoke.js  (benötigt playwright + laufenden Server auf :8765)
const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForSelector('#doc');
  console.log('loaded; errors so far:', errors);
  await page.click('#doc');
  await page.keyboard.type('Hallo Welt');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Zweiter Absatz');
  console.log(await page.evaluate(() => document.querySelector('#doc').innerHTML));
  await browser.close();
  console.log('errors:', errors);
})();
