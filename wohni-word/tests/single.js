const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + require('path').resolve(__dirname, '../wohni-word.html'));
  await page.click('#doc'); await page.keyboard.type('Standalone ok');
  console.log(await page.evaluate(() => [location.protocol, isSecureContext, typeof showSaveFilePicker, document.querySelector('#doc').innerText]));
  await page.setInputFiles('#fileOpen', (process.env.OUT || require('os').tmpdir()) + '/doclib.docx'); await page.waitForTimeout(500);
  console.log(await page.evaluate(() => document.querySelector('#doc h1') && document.querySelector('#doc h1').textContent), errors);
  await browser.close();
})();
