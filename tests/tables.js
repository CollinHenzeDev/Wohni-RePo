const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1200, height: 800 } });
  // Hilfsfunktionen im Seitenkontext
  await page.evaluate(() => {
    window.T = {
      fresh(r, c) { W.loadDocument(W.defaultDoc(), '<p>x</p>'); W.sel.caretIn(W.el.flow.firstElementChild, false); W.tables.insert(r, c); return W.el.flow.querySelector('table'); },
      sel(...idx) { const t = W.el.flow.querySelector('table'); const cells = Array.from(t.querySelectorAll('td,th')); const r = document.createRange(); r.setStart(cells[idx[0]], 0); r.setEnd(cells[idx[idx.length - 1]], cells[idx[idx.length - 1]].childNodes.length); W.el.flow.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(r); },
      caret(i) { const t = W.el.flow.querySelector('table'); const cells = Array.from(t.querySelectorAll('td,th')); W.el.flow.focus(); W.sel.caretIn(cells[i].querySelector('p'), false); },
      shape() { const t = W.el.flow.querySelector('table'); const g = W.tables.grid(t); return g.g.map((row) => row.map((x) => (x ? (x.origin ? 'O' : '.') : '?')).join('')).join('/') + ' nc=' + g.nc; },
      consistent() { const t = W.el.flow.querySelector('table'); const g = W.tables.grid(t); return g.g.every((row) => row.length === g.nc && row.every(Boolean)); },
      colsOk() { const t = W.el.flow.querySelector('table'); const g = W.tables.grid(t); return t.querySelectorAll(':scope > colgroup > col').length === g.nc; },
    };
  });
  await page.evaluate(() => T.fresh(3, 3));
  // Spalte rechts einfügen
  await page.evaluate(() => { T.caret(1); W.tables.addColumn(true); });
  ok(await page.evaluate(() => T.consistent() && T.colsOk()), 'Spalte rechts: ' + await page.evaluate(() => T.shape()));
  await page.evaluate(() => { T.caret(0); W.tables.addColumn(false); });
  ok(await page.evaluate(() => T.consistent() && T.colsOk() && W.tables.grid(W.el.flow.querySelector('table')).nc === 5), 'Spalte links: ' + await page.evaluate(() => T.shape()));
  // Zeile oberhalb
  await page.evaluate(() => { T.caret(6); W.tables.addRow(false); });
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('tr').length === 4 && T.consistent()), 'Zeile oberhalb eingefügt');
  // Verbinden quer und längs
  await page.evaluate(() => { T.sel(0, 1); W.tables.mergeCells(); });
  ok(await page.evaluate(() => T.consistent() && W.el.flow.querySelector('td').colSpan === 2), 'Verbinden horizontal: ' + await page.evaluate(() => T.shape()));
  await page.evaluate(() => { const t = W.el.flow.querySelector('table'); const rows = t.rows; const r = document.createRange(); r.setStart(rows[1].cells[0], 0); r.setEnd(rows[2].cells[0], 1); W.el.flow.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(r); W.tables.mergeCells(); });
  ok(await page.evaluate(() => T.consistent() && W.el.flow.querySelectorAll('td')[4] && true), 'Verbinden vertikal: ' + await page.evaluate(() => T.shape()));
  // Zeile unter verbundener Zelle einfügen
  await page.evaluate(() => { const t = W.el.flow.querySelector('table'); W.sel.caretIn(t.rows[1].cells[0].querySelector('p'), false); W.tables.addRow(true); });
  ok(await page.evaluate(() => T.consistent()), 'Zeile unter verbundenen Zellen: ' + await page.evaluate(() => T.shape()));
  // Zeile löschen (mit rowspan)
  await page.evaluate(() => { const t = W.el.flow.querySelector('table'); W.sel.caretIn(t.rows[1].cells[0].querySelector('p'), false); W.tables.deleteRow(); });
  ok(await page.evaluate(() => T.consistent()), 'Zeile löschen: ' + await page.evaluate(() => T.shape()));
  // Spalte löschen
  await page.evaluate(() => { T.caret(3); W.tables.deleteColumn(); });
  ok(await page.evaluate(() => T.consistent() && T.colsOk()), 'Spalte löschen: ' + await page.evaluate(() => T.shape()));
  // Zelle teilen (verbundene)
  await page.evaluate(() => { T.caret(0); W.tables.splitCell(); });
  ok(await page.evaluate(() => T.consistent()), 'Verbundene Zelle teilen: ' + await page.evaluate(() => T.shape()));
  // einfache Zelle in 2 Spalten teilen
  await page.evaluate(() => { T.fresh(2, 2); T.caret(0); W.tables.splitCell(2); });
  ok(await page.evaluate(() => T.consistent() && T.colsOk() && W.tables.grid(W.el.flow.querySelector('table')).nc === 3), 'Zelle in zwei Spalten teilen: ' + await page.evaluate(() => T.shape()));
  // Rahmen/Schattierung/Stil
  await page.evaluate(() => { T.fresh(3, 3); T.sel(0, 1, 3, 4); W.tables.setShading('#ffe699'); W.tables.setBorders('outside', '#c00000', 2); });
  ok(await page.evaluate(() => { const td = W.el.flow.querySelectorAll('td'); return td[0].style.backgroundColor && /c00000|192, 0, 0/i.test(td[0].style.borderTop || td[0].style.borderTopColor || '') ; }), 'Schattierung und Außenrahmen');
  await page.evaluate(() => { W.tables.applyStyle('header-blue'); });
  ok(await page.evaluate(() => W.el.flow.querySelector('td').style.backgroundColor !== ''), 'Tabellenformatvorlage "Blaue Kopfzeile"');
  // Spaltenbreite per Maus
  await page.evaluate(() => { T.fresh(2, 2); document.querySelectorAll('td p').forEach((p, i) => { p.textContent = 'Zelle ' + i; }); W.layout.run(); });
  const edge = await page.evaluate(() => { const td = W.el.flow.querySelector('td'); const r = td.getBoundingClientRect(); return { x: r.right, y: r.top + r.height / 2 }; });
  const w0 = await page.evaluate(() => W.el.flow.querySelector('td').getBoundingClientRect().width);
  await page.mouse.move(edge.x, edge.y); await page.mouse.down(); await page.mouse.move(edge.x + 70, edge.y, { steps: 6 }); await page.mouse.up();
  const w1 = await page.evaluate(() => W.el.flow.querySelector('td').getBoundingClientRect().width);
  ok(w1 > w0 + 50, `Spaltenbreite per Maus ziehen (${Math.round(w0)} → ${Math.round(w1)})`);
  // Export in docx und zurück
  const rt = await page.evaluate(async () => { T.fresh(3, 3); T.sel(0, 1); W.tables.mergeCells(); T.caret(4); W.tables.addColumn(true); const b = await W.docx.export(); const r = await W.docx.import(await b.arrayBuffer(), 't.docx'); const d = document.createElement('div'); d.innerHTML = r.html; const t = d.querySelector('table'); return { rows: t.rows.length, cells: t.querySelectorAll('td').length, span: t.querySelector('td').colSpan }; });
  ok(rt.rows === 3 && rt.span === 2, 'Tabelle mit verbundener Zelle übersteht DOCX-Roundtrip: ' + JSON.stringify(rt));
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
