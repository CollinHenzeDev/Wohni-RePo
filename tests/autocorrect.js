const { open } = require('./lib');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1200, height: 800 } });
  const text = () => page.evaluate(() => W.el.flow.textContent.replace(/​/g, ''));
  await page.click('#flow p');
  await page.keyboard.type('Er sagte "Hallo" und geht\'s -- gut... (c)');
  ok(await text() === 'Er sagte „Hallo“ und geht’s – gut… ©', 'AutoKorrektur: ' + (await text()));
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p><br></p>'); W.sel.caretIn(W.el.flow.firstElementChild, true); });
  await page.keyboard.type('- Eins');
  ok(await page.evaluate(() => W.el.flow.firstElementChild.getAttribute('data-list') === 'b' && W.el.flow.firstElementChild.textContent === 'Eins'), '"- " am Absatzanfang erzeugt Aufzählung');
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.keyboard.type('3. Drei');
  ok(await page.evaluate(() => { const p = W.el.flow.lastElementChild; return p.getAttribute('data-list') === 'n' && p.getAttribute('data-mark') === '3.'; }), '"3. " erzeugt Nummerierung ab 3');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => !W.el.flow.lastElementChild.hasAttribute('data-list')), 'Zweimal Undo macht die automatische Liste rückgängig');
  // Seitenumbruch davor
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Eins</p><p data-pbb="1">Zwei (neue Seite)</p>'); });
  ok(await page.evaluate(() => W.layout.info.pageCount === 2), '"Seitenumbruch davor" erzeugt neue Seite');
  const rt = await page.evaluate(async () => { const b = await W.docx.export(); const r = await W.docx.import(await b.arrayBuffer(), 'x.docx'); return /data-pbb/.test(r.html); });
  ok(rt, '"Seitenumbruch davor" übersteht DOCX-Roundtrip');
  // Deckblatt
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Inhalt</p>'); W.cmd.coverPage('band'); });
  ok(await page.evaluate(() => W.layout.info.pageCount === 2 && W.doc.floats.some((f) => f.cover)), 'Deckblatt fügt Seite und Seitenband ein');
  await page.evaluate(() => W.cmd.removeCover());
  ok(await page.evaluate(() => W.layout.info.pageCount === 1 && !W.doc.floats.length), 'Deckblatt entfernen');
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
