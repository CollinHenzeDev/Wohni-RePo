const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const files = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  for (const f of files) {
    await page.setInputFiles('#fileOpen', f);
    await page.waitForTimeout(800);
    console.log('==', f);
    console.log(await page.evaluate(() => 'HDR[' + document.querySelector('#hdr').innerHTML + '] FTR[' + document.querySelector('#ftr').innerHTML + ']\n' + document.querySelector('#doc').innerHTML.replace(/data:image[^"]{20,}/g, 'data:…')));
    await page.screenshot({ path: f.replace(/\.docx$/, '.png') });
  }
  console.log('errors', errors);
  await browser.close();
})();
