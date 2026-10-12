const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html');
  await page.click('#doc'); await page.keyboard.type('Anfang'); await page.keyboard.press('Enter'); await page.keyboard.type('Ende');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('End');
  await page.evaluate(() => { window.showOpenFilePicker = undefined; window.__wohni.C.fileInsert(); });
  await page.setInputFiles('#fileInsertInput', process.argv[2]);
  await page.waitForTimeout(600);
  console.log(await page.evaluate(() => document.querySelector('#doc').innerText.replace(/\n+/g, ' | ').slice(0, 200)), errors);
  await browser.close();
})();
