const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const OUT = process.env.OUT || require('os').tmpdir();
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  await page.click('#doc');
  await page.keyboard.type('Kontakt'); await page.keyboard.press('Enter'); await page.keyboard.type('max@example.com'); await page.keyboard.press('Enter'); await page.keyboard.type('Berlin');
  await page.keyboard.press('Enter'); await page.keyboard.type('Lebenslauf von Max'); await page.keyboard.press('Enter'); await page.keyboard.type('Berufserfahrung 2020 bis heute.');
  // links schmal
  await page.keyboard.press('Control+Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');await page.keyboard.press('End');
  await page.evaluate(() => { const c = document.querySelector('#columns'); c.value = 'left'; c.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(300);
  const geo = () => page.evaluate(() => Array.from(document.querySelectorAll('#doc > p, #doc > .colbreak')).map((p) => [p.className || p.textContent.slice(0, 12), Math.round(p.getBoundingClientRect().left), Math.round(p.getBoundingClientRect().width), Math.round(p.getBoundingClientRect().top)]));
  console.log('links schmal', JSON.stringify(await geo()));
  await page.evaluate(() => { const c = document.querySelector('#columns'); c.value = 'right'; c.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(200);
  console.log('rechts schmal', JSON.stringify(await geo()));
  await page.evaluate(() => { const c = document.querySelector('#columns'); c.value = 'left'; c.dispatchEvent(new Event('change')); });
  // Form hinter den Text
  await page.evaluate(() => window.__wohni.C.shapes());
  await page.click('#popup [data-shape="rect"]');
  await page.evaluate(() => { const w = document.querySelector('#fWrap'); w.value = 'behind'; w.dispatchEvent(new Event('change')); });
  await page.evaluate(() => { const set = (id, v) => { const e = document.querySelector('#' + id); e.value = v; e.dispatchEvent(new Event('change')); }; set('fX', 0); set('fY', 0); set('fW', 6.5); set('fH', 29.7); });
  const before = await geo();
  console.log('objekt:', await page.evaluate(() => document.querySelector('.fobj').outerHTML.slice(0, 250)));
  await page.evaluate(() => { document.querySelector('#fbar [data-fo="front"]').click(); document.querySelector('#fbar [data-fo="behind"]').click(); });
  const after = await geo();
  console.log('text unverändert:', JSON.stringify(before) === JSON.stringify(after));
  await page.screenshot({ path: OUT + '/cv.png' });
  const b64 = await page.evaluate(async () => { const b = await window.__wohni.buildDocx(); const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const c of u) s += String.fromCharCode(c); return btoa(s); });
  fs.writeFileSync(OUT + '/cv.docx', Buffer.from(b64, 'base64'));
  // Re-Import
  await page.setInputFiles('#fileOpen', OUT + '/cv.docx'); await page.waitForTimeout(600);
  console.log('reimport settings:', await page.evaluate(() => JSON.stringify(window.__wohni.settings)), 'colbreak', await page.evaluate(() => !!document.querySelector('#doc .colbreak')), 'fobj', await page.evaluate(() => document.querySelectorAll('#doc .fobj').length));
  console.log('errors', errors);
  await browser.close();
})();
