// Der Lebenslauf-Ablauf aus Sicht des Nutzers: Spalten "Links" über den Dialog, Seitenleiste einfärben, schreiben, Spaltenumbruch
const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });
  await page.evaluate(() => { W.cmd.margins('cv'); });
  await page.click('#flow p');
  // Spalten über das Ribbon-Menü: Layout → Spalten → Links
  await page.click('.tab[data-id="layout"]');
  await page.click('.rpanel[data-id="layout"] .rbtn.hasmenu >> nth=3');
  await page.click('.menu .mi:has-text("Links")');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => W.doc.cols.n === 2 && W.doc.cols.w[0] < W.doc.cols.w[1]), 'Layout → Spalten → Links');
  // Dialog: Hintergrundfarbe für linke Spalte
  await page.click('.rpanel[data-id="layout"] .rbtn.hasmenu >> nth=3');
  await page.click('.menu .mi:has-text("Weitere Spalten")');
  await page.waitForSelector('.dialog');
  await page.evaluate(() => { const cb = document.querySelector('.coltbl .frow input[type=checkbox]'); cb.checked = true; cb.dispatchEvent(new Event('change')); const c = document.querySelector('.coltbl .frow input[type=color]'); c.value = '#1f3a5f'; c.dispatchEvent(new Event('input')); });
  await page.click('.dialog .dbtn.primary');
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => W.doc.cols.bg[0] === '#1f3a5f' && document.querySelectorAll('.sheet .colbg').length === 1), 'Dialog: Hintergrundfarbe der linken Spalte (Seitenleiste)');
  // Schreiben: linke Spalte, Spaltenumbruch, rechte Spalte
  await page.click('#flow p');
  await page.keyboard.type('Kontakt');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Musterstraße 1');
  await page.keyboard.press('Control+Shift+Enter');
  await page.keyboard.type('Max Mustermann');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Projektleiter mit langjähriger Erfahrung in der Steuerung von Teams und Budgets.');
  const xs = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p:not(.brk)')).map((p) => ({ t: p.textContent.slice(0, 12), x: Math.round(parseFloat(p.style.getPropertyValue('--lx'))), w: Math.round(parseFloat(p.style.getPropertyValue('--lw'))) })));
  ok(xs[0].x === 0 && xs[xs.length - 1].x > 150 && xs[0].w < xs[xs.length - 1].w, 'Text steht links schmal und rechts breit: ' + JSON.stringify(xs));
  // Form hinter den Text
  await page.evaluate(() => W.floats.insertShape('rect', { wrap: 'behind', x: 300, y: 80, w: 400, h: 60, fill: '#dfe7f2', stroke: null, strokeW: 0 }));
  await page.waitForTimeout(150);
  await page.screenshot({ path: SCR + '/cv-flow.png' });
  // Export → LibreOffice-Prüfung folgt extern
  const b64 = await page.evaluate(async () => { const b = await W.docx.export(); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); });
  require('fs').writeFileSync(SCR + '/cv-flow.docx', Buffer.from(b64, 'base64'));
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
