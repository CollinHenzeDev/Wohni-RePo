const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FEHLER ') + msg); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1400, height: 1000 } });
  const flow = () => page.evaluate(() => W.layout.serialize());
  const click = async (sel) => { await page.click(sel); };

  // --- Tippen ---
  await page.click('#flow p');
  await page.keyboard.type('Hallo Welt, dies ist ein Test.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Zweiter Absatz');
  ok((await page.evaluate(() => W.el.flow.querySelectorAll('p').length)) === 2, 'Enter erzeugt zweiten Absatz');

  // --- Fett per Ribbon-Befehl ---
  await page.keyboard.press('Control+a');
  await page.evaluate(() => W.cmd.bold());
  let html = await flow();
  ok(/font-weight:\s*bold|<b>|<strong>/.test(html), 'Fett angewendet: ' + html.slice(0, 120));
  await page.evaluate(() => W.cmd.size(20));
  html = await flow();
  ok(/font-size:\s*20pt/.test(html), 'Schriftgröße 20 pt');
  await page.evaluate(() => W.cmd.color('#ff0000'));
  html = await flow();
  ok(/color:\s*(rgb\(255, 0, 0\)|#ff0000)/i.test(html), 'Farbe rot');

  // --- Überschrift ---
  await page.evaluate(() => W.cmd.style('h1'));
  ok((await page.evaluate(() => W.el.flow.querySelectorAll('h1').length)) >= 1, 'Formatvorlage Überschrift 1');

  // --- Undo/Redo ---
  const before = await flow();
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  const after = await flow();
  ok(before !== after, 'Strg+Z macht letzten Schritt rückgängig');
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(100);
  ok((await flow()) === before, 'Strg+Y stellt wieder her');

  // --- Liste ---
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Eins</p><p>Zwei</p><p>Drei</p>'); });
  await page.evaluate(() => { const ps = W.el.flow.querySelectorAll('p'); const r = document.createRange(); r.setStart(ps[0].firstChild, 0); r.setEnd(ps[2].firstChild, 4); const s = getSelection(); W.el.flow.focus(); s.removeAllRanges(); s.addRange(r); });
  await page.evaluate(() => W.cmd.numbering());
  const marks = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p')).map((p) => p.getAttribute('data-mark')));
  ok(marks.join() === '1.,2.,3.', 'Nummerierte Liste: ' + marks.join());
  await page.evaluate(() => W.cmd.bullets());
  const marks2 = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p')).map((p) => p.getAttribute('data-mark')));
  ok(marks2.join() === '•,•,•', 'Aufzählung: ' + marks2.join());

  // --- Tabelle ---
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Vor Tabelle</p><p>Nach</p>'); W.sel.caretIn(W.el.flow.querySelector('p'), true); W.tables.insert(3, 3); });
  ok((await page.evaluate(() => W.el.flow.querySelectorAll('table td').length)) === 9, 'Tabelle 3×3 eingefügt');
  await page.keyboard.type('A1');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B1');
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('td')[1].textContent === 'B1'), 'Tab springt in nächste Zelle');
  await page.evaluate(() => { const t = W.el.flow.querySelectorAll('td'); const r = document.createRange(); r.setStart(t[0], 0); r.setEnd(t[1], 1); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.evaluate(() => W.tables.mergeCells());
  ok(await page.evaluate(() => W.el.flow.querySelector('td').colSpan === 2), 'Zellen verbunden (colspan=2)');
  await page.evaluate(() => W.tables.addRow(true));
  ok((await page.evaluate(() => W.el.flow.querySelectorAll('tr').length)) === 4, 'Zeile hinzugefügt');

  // --- Spalten ---
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore. ';
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), Array.from({ length: 30 }, (_, i) => `<p>${i} ${l.repeat(2)}</p>`).join('')); }, lorem);
  await page.evaluate(() => W.cmd.columns('left'));
  const geo = await page.evaluate(() => { const xs = {}; Array.from(W.el.flow.children).forEach((b) => { const lw = parseFloat(b.style.getPropertyValue('--lw')); const lx = Math.round(parseFloat(b.style.getPropertyValue('--lx'))); xs[lx] = Math.round(lw); }); return xs; });
  const widths = Object.entries(geo).map(([x, w]) => ({ x: +x, w })).sort((a, b) => a.x - b.x);
  ok(widths.length === 2 && widths[0].w < widths[1].w * 0.7, 'Spalten "Links": linke Spalte schmaler ' + JSON.stringify(widths));
  await page.evaluate(() => W.cmd.columns('right'));
  const geo2 = await page.evaluate(() => { const xs = {}; Array.from(W.el.flow.children).forEach((b) => { const lw = parseFloat(b.style.getPropertyValue('--lw')); const lx = Math.round(parseFloat(b.style.getPropertyValue('--lx'))); xs[lx] = Math.round(lw); }); return xs; });
  const w2 = Object.entries(geo2).map(([x, w]) => ({ x: +x, w })).sort((a, b) => a.x - b.x);
  ok(w2.length === 2 && w2[0].w > w2[1].w * 1.4, 'Spalten "Rechts": rechte Spalte schmaler ' + JSON.stringify(w2));
  await page.evaluate(() => W.cmd.columns('one'));
  ok((await page.evaluate(() => W.doc.cols.n)) === 1, 'Zurück zu einer Spalte');

  // --- Formen hinter dem Text: Text darf sich nicht verändern ---
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), Array.from({ length: 8 }, (_, i) => `<p>${i} ${l.repeat(2)}</p>`).join('')); }, lorem);
  const pos0 = await page.evaluate(() => Array.from(W.el.flow.children).map((b) => b.style.getPropertyValue('--ly') + '|' + b.style.getPropertyValue('--lw')).join(';'));
  await page.evaluate(() => W.floats.insertShape('rect', { wrap: 'behind', x: 150, y: 200, w: 300, h: 160, fill: '#ffd966' }));
  await page.waitForTimeout(100);
  const pos1 = await page.evaluate(() => Array.from(W.el.flow.children).map((b) => b.style.getPropertyValue('--ly') + '|' + b.style.getPropertyValue('--lw')).join(';'));
  ok(pos0 === pos1, 'Form "hinter den Text" verändert den Textfluss nicht');
  const layerOk = await page.evaluate(() => W.doc.floats[0].wrap === 'behind' && W.el.behind.contains(document.querySelector('.fobj')));
  ok(layerOk, 'Form liegt in der Ebene hinter dem Text');
  await page.screenshot({ path: SCR + '/behind.png' });
  // per Klick (auf freie Fläche der Form) auswählen
  const pt = await page.evaluate(() => { const r = document.querySelector('.fobj').getBoundingClientRect(); return { x: r.left + r.width - 12, y: r.top + 12 }; });
  await page.mouse.click(pt.x, pt.y);
  ok(await page.evaluate(() => !!(W.floats.selected && W.floats.selected.float)), 'Form hinter dem Text lässt sich anklicken');
  // ziehen
  const x0 = await page.evaluate(() => W.doc.floats[0].x);
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 60, pt.y + 40, { steps: 5 }); await page.mouse.up();
  const x1 = await page.evaluate(() => W.doc.floats[0].x);
  ok(x1 > x0 + 40, `Form per Maus verschoben (${Math.round(x0)} → ${Math.round(x1)})`);
  // Umbruch wechseln: vor den Text
  await page.evaluate(() => W.cmd.wrap('front'));
  ok(await page.evaluate(() => W.el.front.contains(document.querySelector('.fobj'))), 'Umbruch "Vor den Text" wechselt die Ebene');
  await page.evaluate(() => W.cmd.wrap('behind'));
  ok(await page.evaluate(() => W.el.behind.contains(document.querySelector('.fobj'))), 'Umbruch "Hinter den Text" wechselt zurück');
  // Square wrap verändert Text
  await page.evaluate(() => W.cmd.wrap('square'));
  const pos2 = await page.evaluate(() => Array.from(W.el.flow.children).map((b) => b.style.getPropertyValue('--ly') + '|' + b.style.getPropertyValue('--lw')).join(';'));
  ok(pos2 !== pos0, 'Umbruch "Quadrat" verdrängt den Text');
  await page.evaluate(() => W.cmd.wrap('behind'));

  // --- Suchen/Ersetzen ---
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Haus und Maus und Laus</p><p>Noch ein Haus</p>'); });
  await page.evaluate(() => W.find.open(true));
  await page.fill('.findbar input[placeholder^="Suchen"]', 'Haus');
  await page.fill('.findbar input[placeholder^="Ersetzen"]', 'Heim');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.find.matches.length === 2), 'Suche findet 2 Treffer');
  await page.evaluate(() => W.find.replaceAll());
  ok(await page.evaluate(() => W.el.flow.textContent.includes('Heim und Maus') && !W.el.flow.textContent.includes('Haus')), 'Alle ersetzen');
  await page.evaluate(() => W.find.close());

  // --- Kopf-/Fußzeile ---
  await page.evaluate(() => { W.hf.insertPageNumber('bottom-center'); });
  ok(await page.evaluate(() => /fld/.test(W.doc.footer)), 'Seitenzahl in Fußzeile');
  ok(await page.evaluate(() => W.el.hf.textContent.includes('1')), 'Seitenzahl wird angezeigt');

  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
