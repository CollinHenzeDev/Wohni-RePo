// Tabellen: Zeilen/Spalten verschieben, Größe per Maus/Dialog, Rahmen, geteilte Tabellen, DOCX-Roundtrip
const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });
  await page.evaluate(() => {
    window.X = {
      // Tabelle mit Texten "r{zeile}c{spalte}"
      make(rows, cols, extra) {
        const body = Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, (_, c) => `<td style="border:1px solid #000"><p>r${r}c${c}</p></td>`).join('')}</tr>`).join('');
        W.loadDocument(W.defaultDoc(), `<p>Start</p><table><colgroup>${('<col style="width:' + (100 / cols).toFixed(3) + '%">').repeat(cols)}</colgroup><tbody>${body}</tbody></table><p>Ende</p>${extra || ''}`, { noFocus: true });
        W.layout.run();
        W.el.flow.focus();
      },
      cell(r, c) { return W.el.flow.querySelector('table').rows[r].cells[c]; },
      caret(r, c) { W.el.flow.focus(); W.sel.caretIn(X.cell(r, c).querySelector('p'), false); },
      text() { const t = W.el.flow.querySelector('table'); return Array.from(t.rows).map((tr) => Array.from(tr.cells).map((c) => c.textContent.trim()).join(',')).join(' | '); },
      grid() { const t = W.el.flow.querySelector('table'); const g = W.tables.grid(t); return g.g.every((row) => row.length === g.nc && row.every(Boolean)); },
      widths() { return Array.from(W.el.flow.querySelector('table').querySelectorAll(':scope > colgroup > col')).map((c) => Math.round(parseFloat(c.style.width))); },
    };
  });
  const text = () => page.evaluate(() => X.text());
  const waitUi = () => page.waitForTimeout(120);

  /* ---------------- Verschieben per Schaltfläche / API / Tastatur ---------------- */
  await page.evaluate(() => { X.make(4, 3); X.caret(1, 1); });
  await page.evaluate(() => W.tables.moveRowBy(-1));
  ok((await text()).startsWith('r1c0,r1c1,r1c2 | r0c0'), 'Zeile nach oben: ' + await text());
  await page.evaluate(() => W.tables.moveRowBy(1));
  ok((await text()).startsWith('r0c0,r0c1,r0c2 | r1c0'), 'Zeile wieder nach unten');
  await page.evaluate(() => W.tables.moveRowBy(1));
  ok((await text()).startsWith('r0c0,r0c1,r0c2 | r2c0,r2c1,r2c2 | r1c0'), 'Zeile weiter nach unten');
  await page.evaluate(() => { X.caret(0, 0); });
  ok(!(await page.evaluate(() => W.tables.moveRowBy(-1))), 'oberste Zeile lässt sich nicht weiter nach oben schieben');
  await page.evaluate(() => W.history.undo());
  ok((await text()).startsWith('r0c0,r0c1,r0c2 | r1c0'), 'Rückgängig stellt die Reihenfolge wieder her: ' + await text());
  await page.evaluate(() => W.history.redo());
  ok((await text()).includes('r2c0,r2c1,r2c2 | r1c0'), 'Wiederholen');

  await page.evaluate(() => { X.make(3, 4); X.caret(1, 1); });
  await page.evaluate(() => W.tables.moveColumnBy(1));
  ok((await text()).startsWith('r0c0,r0c2,r0c1,r0c3'), 'Spalte nach rechts: ' + await text());
  await page.evaluate(() => W.tables.moveColumnBy(-1)); await page.evaluate(() => W.tables.moveColumnBy(-1));
  ok((await text()).startsWith('r0c1,r0c0,r0c2,r0c3'), 'Spalte nach links (zweimal): ' + await text());
  ok(await page.evaluate(() => X.grid()), 'Gitter bleibt konsistent');

  // Spaltenbreiten wandern mit
  await page.evaluate(() => { X.make(2, 3); const cols = W.el.flow.querySelectorAll('col'); cols[0].style.width = '20%'; cols[1].style.width = '30%'; cols[2].style.width = '50%'; X.caret(0, 0); });
  await page.evaluate(() => W.tables.moveColumnBy(1));
  ok(JSON.stringify(await page.evaluate(() => X.widths())) === '[30,20,50]', 'Spaltenbreiten wandern mit: ' + await page.evaluate(() => JSON.stringify(X.widths())));
  // Zeilenhöhe wandert mit
  await page.evaluate(() => { X.make(3, 2); W.el.flow.querySelector('table').rows[0].style.height = '90px'; X.caret(0, 0); W.tables.moveRowBy(1); });
  ok(await page.evaluate(() => W.el.flow.querySelector('table').rows[1].style.height === '90px'), 'Zeilenhöhe wandert mit der Zeile');

  // Tastenkürzel Alt+Umschalt+Pfeil
  await page.evaluate(() => { X.make(3, 3); X.caret(1, 1); });
  await page.keyboard.press('Alt+Shift+ArrowUp');
  ok((await text()).startsWith('r1c0'), 'Alt+Umschalt+↑ verschiebt die Zeile: ' + await text());
  await page.keyboard.press('Alt+Shift+ArrowRight');
  ok((await text()).startsWith('r1c0,r1c2,r1c1'), 'Alt+Umschalt+→ verschiebt die Spalte: ' + await text());

  // Verbundene Zellen: sicher abbrechen
  await page.evaluate(() => { X.make(3, 3); const t = W.el.flow.querySelector('table'); t.rows[0].cells[0].rowSpan = 2; t.rows[1].cells[0].remove(); X.caret(0, 1); });
  const before = await text();
  const moved = await page.evaluate(() => W.tables.moveRowBy(1));
  ok(!moved && (await text()) === before && await page.evaluate(() => X.grid()), 'Verbundene Zeilen verhindern das Verschieben, Tabelle bleibt unverändert');
  // Zeile ohne Verbund daneben ist verschiebbar
  await page.evaluate(() => { X.caret(2, 1); W.tables.moveRowBy(-1); });
  ok(await page.evaluate(() => X.grid()), 'Danach bleibt das Gitter konsistent');

  /* ---------------- Griffe & Ziehen mit der Maus ---------------- */
  await page.evaluate(() => { X.make(4, 3); X.caret(0, 0); });
  await waitUi();
  const grips = await page.evaluate(() => ({ col: document.querySelectorAll('.tg-col').length, row: document.querySelectorAll('.tg-row').length, all: document.querySelectorAll('.tg-all').length, size: document.querySelectorAll('.tg-size').length }));
  ok(grips.col === 3 && grips.row === 4 && grips.all === 1 && grips.size === 1, 'Griffe sichtbar: ' + JSON.stringify(grips));
  const center = (sel, i) => page.evaluate(([s, i]) => { const r = document.querySelectorAll(s)[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [sel, i]);
  // Zeile 0 per Klick markieren
  let g = await center('.tg-row', 0);
  await page.mouse.click(g.x, g.y);
  await waitUi();
  ok(await page.evaluate(() => W.tables.rect && W.tables.rect.kind === 'row' && document.querySelectorAll('td.cell-sel').length === 3), 'Klick auf Zeilengriff markiert die Zeile');
  ok(await page.evaluate(() => !!document.querySelector('.tgbar')), 'Werkzeugleiste erscheint bei der Auswahl');
  // Zeile 0 hinter Zeile 2 ziehen
  g = await center('.tg-row', 0);
  const rowEl = await page.evaluate(() => { const r = W.el.flow.querySelector('table').rows[2].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 4 }; });
  await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x + 30, g.y + 40, { steps: 5 }); await page.mouse.move(rowEl.x, rowEl.y, { steps: 8 });
  ok(await page.evaluate(() => { const l = document.querySelector('.tg-drop'); return !!l && l.style.display !== 'none'; }), 'Einfügelinie beim Ziehen sichtbar');
  await page.mouse.up(); await waitUi();
  ok((await text()).startsWith('r1c0,r1c1,r1c2 | r2c0,r2c1,r2c2 | r0c0'), 'Zeile per Maus verschoben: ' + await text());
  ok(await page.evaluate(() => W.tables.rect && W.tables.rect.kind === 'row'), 'Verschobene Zeile bleibt markiert');
  // Spalte 2 vor Spalte 0 ziehen
  g = await center('.tg-col', 2);
  const colTarget = await page.evaluate(() => { const r = W.el.flow.querySelector('table').rows[1].cells[0].getBoundingClientRect(); return { x: r.left + 3, y: r.top + r.height / 2 }; });
  await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x - 40, g.y + 20, { steps: 5 }); await page.mouse.move(colTarget.x, colTarget.y, { steps: 8 }); await page.mouse.up(); await waitUi();
  ok((await text()).startsWith('r1c2,r1c0,r1c1'), 'Spalte per Maus verschoben: ' + await text());
  await page.screenshot({ path: SCR + '/tables-edit-1.png' });
  // Kontextmenü auf Griff, Löschen über Werkzeugleiste
  g = await center('.tg-col', 1);
  await page.mouse.click(g.x, g.y); await waitUi();
  const nCols0 = await page.evaluate(() => W.el.flow.querySelector('table').rows[0].cells.length);
  await page.evaluate(() => document.querySelector('.tgbar .tgb.del').click()); await waitUi();
  ok(await page.evaluate(() => W.el.flow.querySelector('table').rows[0].cells.length) === nCols0 - 1, 'Spalte über die Werkzeugleiste gelöscht');
  g = await center('.tg-row', 1);
  await page.mouse.click(g.x, g.y); await waitUi();
  await page.keyboard.press('Delete'); await waitUi();
  ok(await page.evaluate(() => Array.from(W.el.flow.querySelector('table').rows[1].cells).every((c) => !c.textContent.trim()) && W.el.flow.querySelector('table').rows.length === 4), 'Entf bei markierter Zeile leert nur den Inhalt');
  g = await center('.tg-row', 2);
  await page.mouse.click(g.x, g.y, { button: 'right' }); await waitUi();
  ok(await page.evaluate(() => !!document.querySelector('.menu') && /Zeile löschen/.test(document.querySelector('.menu').textContent)), 'Rechtsklick auf Zeilengriff öffnet das Menü');
  await page.keyboard.press('Escape');
  await page.evaluate(() => W.ui.closeMenus());
  // Alles markieren (Eckgriff) + Tabelle löschen
  g = await center('.tg-all', 0);
  await page.mouse.click(g.x, g.y); await waitUi();
  ok(await page.evaluate(() => W.tables.rect.kind === 'table' && document.querySelectorAll('td.cell-sel').length === 12 - 4), 'Eckgriff markiert die ganze Tabelle');

  // Mehrere Zeilen/Spalten markieren (Umschalt+Klick auf Griffe) und gemeinsam verschieben
  await page.evaluate(() => { X.make(5, 4); X.caret(0, 0); });
  await waitUi();
  g = await center('.tg-row', 1);
  await page.mouse.click(g.x, g.y); await waitUi();
  g = await center('.tg-row', 2);
  await page.keyboard.down('Shift'); await page.mouse.click(g.x, g.y); await page.keyboard.up('Shift'); await waitUi();
  ok(await page.evaluate(() => W.tables.rect.range.join() === '1,2' && document.querySelectorAll('td.cell-sel').length === 8), 'Umschalt+Klick markiert zwei Zeilen');
  await page.evaluate(() => W.tables.moveRowBy(1));
  ok((await text()).startsWith('r0c0,r0c1,r0c2,r0c3 | r3c0') && (await text()).includes('r3c0,r3c1,r3c2,r3c3 | r1c0,r1c1,r1c2,r1c3 | r2c0'), 'Zwei markierte Zeilen wandern gemeinsam: ' + await text());
  g = await center('.tg-col', 1);
  await page.mouse.click(g.x, g.y); await waitUi();
  g = await center('.tg-col', 2);
  await page.keyboard.down('Shift'); await page.mouse.click(g.x, g.y); await page.keyboard.up('Shift'); await waitUi();
  await page.evaluate(() => W.tables.moveColumnBy(1));
  ok((await text()).startsWith('r0c0,r0c3,r0c1,r0c2'), 'Zwei markierte Spalten wandern gemeinsam: ' + await text());
  await page.evaluate(() => W.history.undo()); await page.evaluate(() => W.history.undo());
  ok((await text()).startsWith('r0c0,r0c1,r0c2,r0c3 | r1c0'), 'Beides lässt sich Schritt für Schritt rückgängig machen');

  /* ---------------- Größe ---------------- */
  await page.evaluate(() => { X.make(3, 3); X.caret(0, 0); });
  await waitUi();
  const m0 = await page.evaluate(() => W.tables.metrics(W.el.flow.querySelector('table')));
  g = await center('.tg-size', 0);
  await page.mouse.move(g.x, g.y); await page.mouse.down(); await page.mouse.move(g.x - 120, g.y + 60, { steps: 8 }); await page.mouse.up(); await waitUi();
  const m1 = await page.evaluate(() => W.tables.metrics(W.el.flow.querySelector('table')));
  ok(m1.width < m0.width - 80 && m1.height > m0.height + 40, `Eckgriff ändert Breite und Höhe (${Math.round(m0.width)}×${Math.round(m0.height)} → ${Math.round(m1.width)}×${Math.round(m1.height)})`);
  ok(await page.evaluate(() => W.el.flow.querySelector('table').style.getPropertyValue('--tw') !== '' && W.el.flow.querySelector('table').rows[0].style.height !== ''), 'Breite (--tw) und Zeilenhöhen gespeichert');
  ok(await page.evaluate(() => { const rs = Array.from(W.el.flow.querySelectorAll('tr')).map((r) => r.getBoundingClientRect().bottom); return W.el.flow.querySelectorAll('p')[W.el.flow.querySelectorAll('p').length - 1].getBoundingClientRect().top > rs[rs.length - 1]; }), 'Der Text darunter rutscht nach (keine Überlappung)');
  // Zeilenunterkante ziehen
  await page.evaluate(() => { X.make(3, 2); X.caret(0, 0); });
  await waitUi();
  const edge = await page.evaluate(() => { const r = W.el.flow.querySelector('table').rows[1].cells[0].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom }; });
  const hb = await page.evaluate(() => W.el.flow.querySelector('table').rows[1].getBoundingClientRect().height);
  await page.mouse.move(edge.x, edge.y); await page.mouse.down(); await page.mouse.move(edge.x, edge.y + 50, { steps: 6 }); await page.mouse.up(); await waitUi();
  const ha = await page.evaluate(() => W.el.flow.querySelector('table').rows[1].getBoundingClientRect().height);
  ok(ha > hb + 40, `Zeilenhöhe per Ziehen an der Unterkante (${Math.round(hb)} → ${Math.round(ha)})`);
  // rechter Rand der letzten Spalte = Tabellenbreite
  const edge2 = await page.evaluate(() => { const r = W.el.flow.querySelector('table').rows[0].cells[1].getBoundingClientRect(); return { x: r.right, y: r.top + r.height / 2 }; });
  const wb = await page.evaluate(() => W.el.flow.querySelector('table').getBoundingClientRect().width);
  await page.mouse.move(edge2.x, edge2.y); await page.mouse.down(); await page.mouse.move(edge2.x - 150, edge2.y, { steps: 6 }); await page.mouse.up(); await waitUi();
  const wa = await page.evaluate(() => W.el.flow.querySelector('table').getBoundingClientRect().width);
  ok(wa < wb - 100, `Tabellenbreite per Ziehen am rechten Rand (${Math.round(wb)} → ${Math.round(wa)})`);
  await page.evaluate(() => W.history.undo());
  ok(await page.evaluate(() => W.el.flow.querySelector('table').getBoundingClientRect().width) > wa + 100, 'Breite lässt sich rückgängig machen');

  // Dialog Tabelleneigenschaften
  await page.evaluate(() => { X.make(3, 3); X.caret(1, 1); });
  await page.evaluate(() => W.dialogs.tableProps());
  await waitUi();
  const dlg = await page.evaluate(() => ({ n: document.querySelectorAll('.dialog fieldset').length, title: document.querySelector('.dialog .dhead').textContent }));
  ok(dlg.n === 4, 'Dialog „Tabelleneigenschaften“ hat vier Bereiche: ' + JSON.stringify(dlg));
  await page.evaluate(() => {
    const d = document.querySelector('.dialog');
    const inputs = d.querySelectorAll('input[type=number]');
    inputs[0].value = '8'; inputs[0].dispatchEvent(new Event('change'));        // Breite 8 cm
    inputs[1].value = '6'; inputs[1].dispatchEvent(new Event('change'));        // Höhe 6 cm
    inputs[2].value = '2'; inputs[2].dispatchEvent(new Event('change'));        // Zeilenhöhe 2 cm
    [...d.querySelectorAll('.dfoot .dbtn')].find((b) => b.textContent === 'OK').click();
  });
  await page.waitForTimeout(300);
  const dm = await page.evaluate(() => { const t = W.el.flow.querySelector('table'); const m = W.tables.metrics(t); return { w: W.u.px2cm(m.width), rowH: W.u.px2cm(t.rows[1].getBoundingClientRect().height / W.view.zoom) }; });
  ok(Math.abs(dm.w - 8) < 0.2, 'Dialog: Tabellenbreite 8 cm (' + dm.w.toFixed(2) + ')');
  ok(dm.rowH >= 1.9, 'Dialog: Zeilenhöhe mindestens 2 cm (' + dm.rowH.toFixed(2) + ')');

  /* ---------------- Rahmen ---------------- */
  await page.evaluate(() => { X.make(3, 3); X.caret(0, 0); W.tables.setPen({ style: 'dashed', width: 3, color: '#c00000' }); W.tables.setBorders('outside'); });
  const bd = await page.evaluate(() => { const t = W.el.flow.querySelector('table'); const a = t.rows[0].cells[0], z = t.rows[1].cells[1]; return { tl: a.style.borderTop + '|' + a.style.borderLeft, mid: z.style.borderTop, br: t.rows[2].cells[2].style.borderRight }; });
  ok(/3px dashed/.test(bd.tl) && /rgb\(192, 0, 0\)|#c00000/i.test(bd.tl), 'Außenrahmen gestrichelt, 3 px, rot: ' + bd.tl);
  ok(/1px solid/.test(bd.mid), 'Innenlinien bleiben unverändert: ' + bd.mid);
  await page.evaluate(() => { W.tables.setPen({ style: 'double', width: 1, color: '#0000ff' }); W.tables.selectTable(W.el.flow.querySelector('table')); W.tables.setBorders('inside'); });
  ok(await page.evaluate(() => { const c = W.el.flow.querySelector('table').rows[1].cells[1]; return /3px double/.test(c.style.borderTop) && /0, 0, 255|#0000ff/i.test(c.style.borderTop); }), 'Doppelte Innenlinie (mindestens 3 px breit)');
  await page.evaluate(() => { W.tables.setPen({ style: 'solid', width: 1.5 * 96 / 72, color: '#000000' }); X.caret(1, 1); W.tables.setBorders('bottom'); });
  ok(await page.evaluate(() => { const t = W.el.flow.querySelector('table'); return /2px solid/.test(t.rows[1].cells[1].style.borderBottom) && /2px solid/.test(t.rows[2].cells[1].style.borderTop); }), 'Einzelne Linie wirkt auf beide Nachbarzellen');
  // Ribbon: Linienart-/Linienstärke-/Stiftfarbe-Schaltflächen
  const ribbon = await page.evaluate(() => { const tab = [...document.querySelectorAll('.tab')].find((t) => /Tabellenlayout/.test(t.textContent)); tab && tab.click(); return { labels: [...document.querySelectorAll('.rbtn .rlbl')].map((x) => x.textContent) }; });
  ok(['Linienart', 'Linienstärke', 'Stiftfarbe', 'Rahmen', 'Zeile nach oben', 'Spalte nach rechts', 'Zeilen verteilen', 'Eigenschaften'].every((l) => ribbon.labels.some((x) => x.includes(l))), 'Ribbon enthält die neuen Schaltflächen');
  await page.evaluate(() => { [...document.querySelectorAll('.rbtn')].find((b) => /Linienart/.test(b.textContent)).click(); });
  await waitUi();
  ok(await page.evaluate(() => /Gepunktet/.test(document.querySelector('.menu').textContent)), 'Menü „Linienart“ öffnet sich');
  await page.evaluate(() => [...document.querySelectorAll('.menu .mi')].find((b) => /Gepunktet/.test(b.textContent)).click());
  ok(await page.evaluate(() => W.tables.pen.style === 'dotted'), 'Linienart „Gepunktet“ wird zum Stift');
  await page.screenshot({ path: SCR + '/tables-edit-2.png' });

  /* ---------------- Geteilte Tabelle (über zwei Seiten) ---------------- */
  await page.evaluate(() => { X.make(60, 2); X.caret(0, 0); });
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('table').length) >= 2, 'Testtabelle ist über mehrere Seiten geteilt');
  await page.evaluate(() => { const tails = W.el.flow.querySelectorAll('table[data-cont]'); const tail = tails[tails.length - 1]; W.el.flow.focus(); W.sel.caretIn(tail.rows[tail.rows.length - 1].cells[0].querySelector('p'), false); });
  await waitUi();
  const nGrips = await page.evaluate(() => ({ row: document.querySelectorAll('.tg-row').length, col: document.querySelectorAll('.tg-col').length }));
  ok(nGrips.row === 60 && nGrips.col === 2, 'Griffe für alle Zeilen über die Teilstücke: ' + JSON.stringify(nGrips));
  // Zeile des letzten Teilstücks in den ersten Teil verschieben
  const first = await page.evaluate(() => W.el.flow.querySelector('table').rows[0].textContent.trim());
  await page.evaluate(() => { W.tables.moveRowBy(-1); });
  const rowsNow = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('tr')).map((r) => r.cells[0].textContent.trim()));
  ok(rowsNow.length === 60 && rowsNow[58] === 'r59c0' && rowsNow[59] === 'r58c0', 'Zeile im Fortsetzungsteil nach oben verschoben: ' + rowsNow.slice(56).join(','));
  // Zeile mit Griff ganz nach oben ziehen (über Seitengrenze)
  await waitUi();
  await page.evaluate(() => { const t = W.el.flow.querySelectorAll('table'); const tail = t[t.length - 1]; W.sel.caretIn(tail.rows[tail.rows.length - 1].cells[0].querySelector('p'), false); });
  await waitUi();
  const lastGrip = await page.evaluate(() => { const g = document.querySelectorAll('.tg-row'); const r = g[g.length - 1].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(lastGrip.x, lastGrip.y); await waitUi();
  await page.evaluate(() => W.tables.moveRowBy(-1));
  ok(await page.evaluate(() => W.el.flow.querySelectorAll('tr').length === 60), 'Zeilenanzahl nach Verschieben im geteilten Tabellenfall unverändert');
  // Spalte in geteilter Tabelle
  await page.evaluate(() => { const t = W.el.flow.querySelector('table'); W.sel.caretIn(t.rows[1].cells[0].querySelector('p'), false); W.tables.moveColumnBy(1); });
  ok(await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('tr')).every((r) => /^r\d+c1$/.test(r.cells[0].textContent.trim()))), 'Spalte verschoben – auch in den Fortsetzungsteilen');
  // Zeile einfügen im Fortsetzungsteil (Fehler früher: TypeError)
  const cnt = await page.evaluate(() => { const tails = W.el.flow.querySelectorAll('table[data-cont]'); const tail = tails[tails.length - 1]; W.sel.caretIn(tail.querySelector('td p'), false); const n = W.el.flow.querySelectorAll('tr').length; W.tables.addRow(true); return [n, W.el.flow.querySelectorAll('tr').length]; });
  ok(cnt[1] === cnt[0] + 1, 'Zeile im Fortsetzungsteil einfügen funktioniert (' + cnt.join(' → ') + ')');
  // Breite ändern bei geteilter Tabelle: alle Teile gleich breit
  await page.evaluate(() => { W.sel.caretIn(W.el.flow.querySelector('table').rows[0].cells[0].querySelector('p'), false); W.tables.setWidth(W.u.cm2px(9)); });
  ok(await page.evaluate(() => { const w = Array.from(W.el.flow.querySelectorAll('table')).map((t) => Math.round(t.getBoundingClientRect().width)); return w.every((x) => Math.abs(x - w[0]) <= 1); }), 'Alle Teilstücke behalten dieselbe Breite');

  /* ---------------- DOCX-Roundtrip ---------------- */
  const rt = await page.evaluate(async () => {
    X.make(3, 3); X.caret(1, 0);
    W.tables.moveRowBy(-1); W.tables.moveColumnBy(1);
    W.tables.setPen({ style: 'dashed', width: 2 * 96 / 72, color: '#2e75b6' }); X.caret(0, 0); W.tables.setBorders('all');
    const t = W.el.flow.querySelector('table'); t.rows[2].style.height = '60px'; t.style.setProperty('--tw', '0.7');
    W.layout.run();
    const b = await W.docx.export();
    const buf = await b.arrayBuffer();
    const files = await W.zip.read(buf);
    const xml = new TextDecoder().decode(await files.get('word/document.xml').bytes());
    const r = await W.docx.import(buf, 't.docx');
    const d = document.createElement('div'); d.innerHTML = r.html; const t2 = d.querySelector('table');
    return { text: Array.from(t2.rows).map((tr) => Array.from(tr.cells).map((c) => c.textContent.trim()).join(',')).join('|'), h: t2.rows[2].style.height, tw: t2.style.getPropertyValue('--tw'), bd: t2.rows[0].cells[0].style.borderTop, xmlDash: /w:val="dashed"/.test(xml), sz: (xml.match(/w:sz="(\d+)"/) || [])[1] };
  });
  ok(rt.text.startsWith('r1c1,r1c0,r1c2|r0c1,r0c0,r0c2'), 'DOCX-Roundtrip: Reihenfolge bleibt: ' + rt.text);
  ok(parseFloat(rt.h) > 50, 'DOCX-Roundtrip: Zeilenhöhe: ' + rt.h);
  ok(Math.abs(parseFloat(rt.tw) - 0.7) < 0.03, 'DOCX-Roundtrip: Tabellenbreite: ' + rt.tw);
  ok(/dashed/.test(rt.bd) && /2e75b6|46, 117, 182/i.test(rt.bd), 'DOCX-Roundtrip: Linienart und Farbe: ' + rt.bd);
  ok(rt.xmlDash && rt.sz === '16', 'DOCX: gestrichelt, 2 pt (sz=' + rt.sz + ')');

  ok(errors.length === 0, 'keine Konsolenfehler ' + JSON.stringify(errors.slice(0, 3)));
  console.log(fails ? `\n${fails} Fehler` : '\nALLE TESTS BESTANDEN');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
