const { open } = require('./lib');
const fs = require('fs');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';

  // --- Kopfzeile per Doppelklick bearbeiten ---
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), Array.from({ length: 80 }, (_, i) => `<p>${i} ${l.repeat(3)}</p>`).join('')); }, lorem);
  const pages = await page.evaluate(() => W.layout.info.pageCount);
  ok(pages >= 3, 'Mehrseitiges Dokument: ' + pages + ' Seiten');
  const pt = await page.evaluate(() => { const r = W.el.pages.getBoundingClientRect(); return { x: r.left + 200, y: r.top + 40 }; });
  await page.mouse.dblclick(pt.x, pt.y);
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!W.hf.editing && W.hf.editing.kind === 'header'), 'Doppelklick im oberen Rand öffnet die Kopfzeile');
  await page.keyboard.type('Meine Kopfzeile');
  await page.evaluate(() => W.cmd.field('PAGE'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => /Meine Kopfzeile/.test(W.doc.header)), 'Kopfzeile gespeichert');
  const hdrs = await page.evaluate(() => Array.from(W.el.hf.querySelectorAll('.hfbox.header')).map((e) => e.textContent.trim()));
  ok(hdrs.length === pages && hdrs[0].includes('Meine Kopfzeile') && hdrs[2].replace(/\u200B/g, '').endsWith('3'), 'Kopfzeile auf jeder Seite mit richtiger Seitenzahl: ' + JSON.stringify(hdrs.slice(0, 3)));
  await page.evaluate(() => W.hf.setDiffFirst(true));
  ok(await page.evaluate(() => W.doc.diffFirst === true), '"Erste Seite anders" aktiv');
  await page.evaluate(() => W.hf.setDiffFirst(false));

  // --- Leistung: 80 Absätze × mehrere Seiten ---
  const ms = await page.evaluate(() => { const t = performance.now(); W.layout.run(); return performance.now() - t; });
  ok(ms < 300, `Layout-Lauf (${pages} Seiten) in ${ms.toFixed(0)} ms`);
  const big = await page.evaluate((l) => {
    const h = Array.from({ length: 600 }, (_, i) => `<p>${i} ${l.repeat(4)}</p>`).join('');
    W.loadDocument(W.defaultDoc(), h);
    const t = performance.now(); W.layout.run(); return { pages: W.layout.info.pageCount, ms: performance.now() - t };
  }, lorem);
  ok(big.ms < 1500, `Großes Dokument: ${big.pages} Seiten, ${big.ms.toFixed(0)} ms pro Layout`);
  // Tippen im großen Dokument
  await page.evaluate(() => { W.el.flow.focus(); W.sel.caretIn(W.el.flow.children[300], true); });
  const t0 = Date.now();
  await page.keyboard.type('abcdefghij', { delay: 0 });
  await page.waitForTimeout(100);
  console.log('     Tippen (10 Zeichen) im großen Dokument: ' + (Date.now() - t0) + ' ms');

  // --- Bilder ---
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
  fs.writeFileSync(SCR + '/test.png', png);
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Text vor dem Bild</p><p>Text danach</p>'); W.sel.caretIn(W.el.flow.querySelector('p'), true); });
  await page.evaluate(() => { W.pendingImageMode = 'inline'; });
  await page.setInputFiles('#fileImage', SCR + '/test.png');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('img').length === 1), 'Bild im Text eingefügt');
  ok(await page.evaluate(() => !!(W.floats.selected && W.floats.selected.inline)), 'Eingefügtes Bild ist ausgewählt (Anfasser)');
  await page.evaluate(() => W.cmd.wrap('behind'));
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('img').length === 0 && W.doc.floats.length === 1 && W.doc.floats[0].wrap === 'behind'), 'Bild → "Hinter den Text" (wird freies Objekt)');
  await page.evaluate(() => W.cmd.wrap('inline'));
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('img').length === 1 && W.doc.floats.length === 0), 'Bild → "Im Text" (wieder im Fluss)');
  await page.evaluate(() => W.cmd.pickImage('behind'));
  await page.setInputFiles('#fileImage', SCR + '/test.png');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => W.doc.floats.length === 1 && W.doc.floats[0].kind === 'image' && W.doc.floats[0].wrap === 'behind'), 'Bild direkt hinter den Text eingefügt');
  // Export enthält die Bilder
  const info = await page.evaluate(async () => { const b = await W.docx.export(); const files = await W.zip.read(await b.arrayBuffer()); return Array.from(files.keys()); });
  ok(info.some((n) => /word\/media\/image/.test(n)), 'DOCX enthält Bilddateien: ' + info.filter((n) => /media/.test(n)).join(', '));

  // --- Tabelle über Seitengrenze ---
  await page.evaluate((l) => {
    const rows = Array.from({ length: 70 }, (_, i) => `<tr><td><p>Zeile ${i}</p></td><td><p>${l}</p></td></tr>`).join('');
    W.loadDocument(W.defaultDoc(), `<p>Vor der Tabelle</p><table><colgroup><col style="width:30%"><col style="width:70%"></colgroup><tbody>${rows}</tbody></table><p>Nach der Tabelle</p>`);
  }, lorem);
  const tinfo = await page.evaluate(() => ({ pages: W.layout.info.pageCount, parts: W.el.flow.querySelectorAll('table').length, rows: W.el.flow.querySelectorAll('tr').length }));
  ok(tinfo.pages >= 2 && tinfo.parts >= 2 && tinfo.rows === 70, 'Tabelle wird zeilenweise auf Seiten verteilt: ' + JSON.stringify(tinfo));
  const clean = await page.evaluate(() => W.layout.serialize());
  ok((clean.match(/<table/g) || []).length === 1 && !/data-cont/.test(clean), 'Gespeicherter Inhalt hat die Tabelle wieder als eine Einheit');

  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
