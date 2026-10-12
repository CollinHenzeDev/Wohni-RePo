const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto('http://localhost:8765/index.html');
  const html = () => page.evaluate(() => document.querySelector('#doc').innerHTML);
  const W = (fn, ...a) => page.evaluate(fn, ...a);
  await page.click('#doc');
  // Bild einfügen über Datei
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8z8Dwn4EIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC', 'base64');
  fs.writeFileSync((process.env.OUT || require('os').tmpdir()) + '/pic.png', png);
  await page.keyboard.type('Vor Bild ');
  await page.setInputFiles('#fileImage', (process.env.OUT || require('os').tmpdir()) + '/pic.png');
  await page.waitForTimeout(400);
  console.log('img:', (await html()).replace(/data:[^"]+/, 'data:…'));
  // Klick auf Bild → Auswahlrahmen
  await page.click('#doc img');
  console.log('imgbox visible:', await page.evaluate(() => !document.querySelector('#imgbox').hidden));
  await page.click('#imgbar [data-img="50"]');
  console.log('img width after 50%:', await page.evaluate(() => document.querySelector('#doc img').style.width));
  // Link-Dialog
  await page.click('#doc'); await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter'); await page.keyboard.type('Linktext');
  await page.keyboard.press('Shift+Home');
  await page.keyboard.press('Control+k');
  await page.fill('#lk-url', 'example.com');
  await page.click('#dbtns .primary');
  console.log('link:', (await html()).slice(-160));
  // Kopf-/Fusszeile + Seitenzahl
  await W(() => window.__wohni.C.pageNumber());
  console.log('footer:', await W(() => document.querySelector('#ftr').innerHTML));
  // Seitenumbruch
  await page.click('#doc'); await page.keyboard.press('Control+End'); await page.keyboard.press('Control+Enter'); await page.keyboard.type('Seite zwei');
  console.log('pagebreak:', (await html()).includes('pagebreak'), 'pages', await W(() => document.querySelector('#st-page').textContent));
  // Überschriften + TOC
  await page.keyboard.press('Enter'); await page.keyboard.type('Kapitel');
  await page.keyboard.press('Control+Alt+1');
  await page.keyboard.press('Enter');
  await W(() => window.__wohni.C.toc());
  console.log('toc:', (await html()).includes('Inhaltsverzeichnis'), (await html()).match(/href="#toc_[^"]+"/));
  // Paste HTML (Word-artig) -> bereinigt
  await W(() => { const d = new DataTransfer(); d.setData('text/html', '<html><body><!--StartFragment--><p class=MsoNormal style="mso-margin-top-alt:auto;font-size:14pt;color:red">Eingefügt <script>alert(1)</script><b>fett</b> <o:p></o:p></p><!--EndFragment--></body></html>'); d.setData('text/plain', 'Eingefügt fett'); const e = new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true }); document.querySelector('#doc').dispatchEvent(e); });
  await page.waitForTimeout(200);
  console.log('paste:', (await html()).slice(-220));
  // Format painter, case
  await page.keyboard.press('Shift+Home');
  await page.selectOption('#caseSel', 'upper');
  console.log('upper:', (await html()).slice(-160));
  // Stile
  await W(() => window.__wohni.C.header());
  await page.keyboard.type('Kopfzeilentext');
  console.log('header:', await W(() => document.querySelector('#hdr').innerHTML));
  // Export und LibreOffice-Test
  const b64 = await W(async () => { const b = await window.__wohni.buildDocx(); const u = new Uint8Array(await b.arrayBuffer()); let s=''; for (const c of u) s+=String.fromCharCode(c); return btoa(s); });
  fs.writeFileSync((process.env.OUT || require('os').tmpdir()) + '/ui2.docx', Buffer.from(b64, 'base64'));
  // Speichern per Download-Fallback
  await W(() => { delete window.showSaveFilePicker; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#titlebar [data-cmd="save"]')]);
  console.log('download name:', dl.suggestedFilename());
  console.log('errors', errors);
  await browser.close();
})();
