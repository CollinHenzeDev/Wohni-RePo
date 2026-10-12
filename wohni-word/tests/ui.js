const { chromium } = require(process.env.PW_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  const html = () => page.evaluate(() => document.querySelector('#doc').innerHTML);
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log('FAIL', name, e.message); } };

  await page.click('#doc');
  await page.keyboard.type('Titel Zeile');
  await page.click('[data-style="h1"]');
  console.log('1 heading:', await html());
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  console.log('2 after enter in h1:', await html());
  await page.keyboard.type('Fetter Text');
  await page.keyboard.press('Shift+Home');
  await page.click('#b-bold');
  console.log('3 bold:', await html());
  await page.fill('#fontSize', '20'); await page.keyboard.press('Enter');
  console.log('4 size:', await html());
  await page.selectOption('#fontName', 'Arial');
  console.log('5 font:', await html());
  // Liste
  await page.keyboard.press('End'); await page.keyboard.press('Enter');
  await page.click('#b-ul'); await page.keyboard.type('Punkt 1'); await page.keyboard.press('Enter'); await page.keyboard.type('Punkt 2');
  await page.keyboard.press('Tab'); 
  console.log('6 list:', await html());
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.keyboard.type('Nach Liste');
  console.log('7 after list:', await html());
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.keyboard.type('Absatz nach Liste');
  console.log('7b exit list:', (await html()).slice(-200));
  // Ausrichtung
  await page.click('#b-justifyCenter');
  // Tabelle
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__wohni.C.table());
  await page.click('.tblpick span[data-r="2"][data-c="3"]');
  await page.keyboard.type('a1'); await page.keyboard.press('Tab'); await page.keyboard.type('b1');
  console.log('8 table:', (await html()).slice(-400));
  await page.evaluate(() => window.__wohni.C.colRight());
  await page.evaluate(() => window.__wohni.C.rowBelow());
  await page.evaluate(() => window.__wohni.C.mergeRight());
  console.log('9 tableops:', (await html()).replace(/.*<table/s, '<table').slice(0, 700));
  // Undo/Redo
  const before = await html();
  await page.evaluate(() => window.__wohni.C.undo());
  const afterUndo = await html();
  await page.evaluate(() => window.__wohni.C.redo());
  console.log('10 undo changes:', before !== afterUndo, 'redo restores:', (await html()) === before);
  // Suche
  await page.keyboard.press('Control+f');
  await page.fill('#findInput', 'punkt');
  console.log('11 find count:', await page.textContent('#findCount'));
  await page.fill('#replaceInput', 'Element');
  await page.click('[data-cmd="replaceAll"]');
  console.log('12 replaced:', (await html()).includes('Element 1'));
  await page.keyboard.press('Escape');
  // Seite einrichten
  await page.evaluate(() => { const o=document.querySelector('#orientation'); o.value='landscape'; o.dispatchEvent(new Event('change')); });
  console.log('13 settings:', await page.evaluate(() => JSON.stringify(window.__wohni.settings)));
  await page.screenshot({ path: (process.env.OUT || require('os').tmpdir()) + '/ui.png' });
  // Export + Re-Import
  const b64 = await page.evaluate(async () => { const b = await window.__wohni.buildDocx(); const u = new Uint8Array(await b.arrayBuffer()); let s=''; for (const c of u) s+=String.fromCharCode(c); return btoa(s); });
  require('fs').writeFileSync((process.env.OUT || require('os').tmpdir()) + '/ui.docx', Buffer.from(b64, 'base64'));
  await page.setInputFiles('#fileOpen', (process.env.OUT || require('os').tmpdir()) + '/ui.docx');
  await page.waitForTimeout(500);
  const re = await html();
  console.log('14 roundtrip equal-ish:', re.length, 'tables', (re.match(/<table/g) || []).length, 'lists', (re.match(/<ul/g) || []).length, 'h1', (re.match(/<h1/g) || []).length);
  console.log('errors', errors);
  await browser.close();
})();
