const { pw, chromePath } = require('./lib');
const path = require('path');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const browser = await pw.chromium.launch({ executablePath: chromePath() });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.W && W.layout && W.layout.info);
  await page.waitForTimeout(200);

  // Seitenumbruch einfügen/löschen
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Erste Seite</p><p>Zweite Seite</p>'); W.sel.caretIn(W.el.flow.firstElementChild, true); });
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.layout.info.pageCount === 2 && !!W.el.flow.querySelector('p.brk[data-brk="page"]')), 'Strg+Enter erzeugt Seitenumbruch (2 Seiten)');
  // Cursor an den Anfang des Absatzes nach dem Umbruch, Backspace
  await page.evaluate(() => { const brk = W.el.flow.querySelector('p.brk'); W.el.flow.focus(); W.sel.caretIn(brk.nextElementSibling, false); });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(100);
  const left = await page.evaluate(() => ({ brk: W.el.flow.querySelectorAll('p.brk').length, pages: W.layout.info.pageCount }));
  console.log('     nach Backspace:', JSON.stringify(left));
  ok(left.brk === 0 && left.pages === 1, 'Backspace entfernt den Seitenumbruch');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.layout.info.pageCount === 2), 'Undo bringt den Seitenumbruch zurück');

  // Spaltenumbruch
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Links</p><p>Rechts</p>'); W.cmd.columns('two'); W.sel.caretIn(W.el.flow.firstElementChild, true); });
  await page.keyboard.press('Control+Shift+Enter');
  await page.waitForTimeout(100);
  const cols = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p:not(.brk)')).map((p) => Math.round(parseFloat(p.style.getPropertyValue('--lx')))));
  ok(cols.length >= 2 && cols[0] === 0 && cols[cols.length - 1] > 100, 'Spaltenumbruch schiebt Text in die zweite Spalte ' + JSON.stringify(cols));

  // Tabelle am Dokumentende: Cursor kann dahinter
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Text</p>'); W.sel.caretIn(W.el.flow.firstElementChild, false); W.tables.insert(2, 2); });
  await page.waitForTimeout(80);
  ok(await page.evaluate(() => W.el.flow.lastElementChild.tagName === 'P'), 'Nach einer Tabelle steht immer ein Absatz');

  // Kopieren und Einfügen
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p><b>Fett</b> und <i>kursiv</i></p><p><br></p>'); W.el.flow.focus(); const r = document.createRange(); r.selectNodeContents(W.el.flow.firstElementChild); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.keyboard.press('Control+c');
  await page.evaluate(() => W.sel.caretIn(W.el.flow.lastElementChild, false));
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(150);
  const pasted = await page.evaluate(() => W.el.flow.lastElementChild.innerHTML);
  ok(/Fett/.test(pasted) && /kursiv/.test(pasted) && /bold|<b>/.test(pasted) && !/data-lay/.test(pasted), 'Kopieren/Einfügen behält Formatierung: ' + pasted.slice(0, 90));

  // Einfügen von fremdem HTML (Word-Müll wird bereinigt)
  const clean = await page.evaluate(() => W.fmt.sanitize('<p class="MsoNormal" style="mso-margin-top-alt:auto;color:red;font-family:Calibri"><o:p></o:p><span style="mso-bidi-font-size:12pt">Hallo</span></p><ul><li>eins</li><li>zwei</li></ul><script>alert(1)</script>'));
  ok(!/mso-|script|MsoNormal/.test(clean) && /data-list/.test(clean) && /Hallo/.test(clean), 'HTML-Bereinigung entfernt Word-Reste und wandelt Listen um');

  // Rechtschreibung umschalten, Dunkelmodus, Zoom
  await page.evaluate(() => W.cmd.toggleSpell());
  ok(await page.evaluate(() => W.el.flow.spellcheck === false), 'Rechtschreibprüfung ausschaltbar');
  await page.evaluate(() => { W.cmd.toggleDark(); W.view.setZoom(1.5); });
  ok(await page.evaluate(() => document.body.classList.contains('dark') && W.view.zoom === 1.5), 'Dunkelmodus und Zoom');
  await page.screenshot({ path: (process.env.SCR || '/tmp') + '/dark.png' });
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
