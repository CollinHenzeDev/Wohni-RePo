const { pw, chromePath } = require('./lib');
const path = require('path');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  // Persistentes Profil, damit IndexedDB nach dem Neuladen noch da ist
  const ctx = await pw.chromium.launchPersistentContext(require('os').tmpdir() + '/wohni-profile-' + Date.now(), { executablePath: chromePath(), viewport: { width: 1300, height: 850 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(url);
  await page.waitForFunction(() => window.W && W.layout && W.layout.info);
  await page.waitForTimeout(300);

  // Langer Text per Tastatur
  await page.click('#flow p');
  const sentence = 'Dies ist ein Satz, der beim Tippen die Seiten füllt und zeigt, dass der Cursor mitwandert. ';
  const t0 = Date.now();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.type(sentence.repeat(4), { delay: 0 });
    await page.keyboard.press('Enter');
  }
  const ms = Date.now() - t0;
  const info = await page.evaluate(() => ({ pages: W.layout.info.pageCount, paras: W.el.flow.querySelectorAll('p').length, scroll: Math.round(W.el.workspace.scrollTop) }));
  ok(info.pages >= 4, `Tippen füllt ${info.pages} Seiten (${info.paras} Absätze, ${ms} ms)`);
  const caretVisible = await page.evaluate(() => { const r = W.sel.caretRect(); const ws = W.el.workspace.getBoundingClientRect(); return r && r.top >= ws.top - 2 && r.bottom <= ws.bottom + 2; });
  ok(caretVisible, 'Cursor bleibt beim Tippen im sichtbaren Bereich (scrollTop ' + info.scroll + ')');
  const dom = await page.evaluate(() => ({ cont: W.el.flow.querySelectorAll('[data-cont]').length }));
  console.log('     weiche Teilungen im DOM:', dom.cont);

  // Zwischenspeicherung und Wiederherstellung
  await page.waitForTimeout(3300);
  const stored = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('wohni-writer', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('wohni.autosave'); q.onsuccess = () => res(!!q.result); q.onerror = () => res(false); }; r.onerror = () => res(false); }));
  ok(stored, 'Dokument wurde automatisch zwischengespeichert');
  await page.reload();
  await page.waitForFunction(() => window.W && W.layout && W.layout.info);
  await page.waitForTimeout(600);
  const restored = await page.evaluate(() => ({ pages: W.layout.info.pageCount, text: W.el.flow.textContent.includes('Dies ist ein Satz'), dirty: W.dirty }));
  ok(restored.text && restored.pages >= 4, 'Nach Neuladen wiederhergestellt: ' + JSON.stringify(restored));

  // Strg+Z über viele Schritte
  await page.click('#flow p');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('Neuer Satz am Ende');
  await page.waitForTimeout(900);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !W.el.flow.textContent.includes('Neuer Satz am Ende')), 'Undo nach Neuladen funktioniert');
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await ctx.close();
})();
