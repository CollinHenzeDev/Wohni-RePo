const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });
  // Listen per Tastatur
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>Eins</p>'); W.sel.caretIn(W.el.flow.firstElementChild, true); W.cmd.bullets(); });
  await page.keyboard.press('End');
  await page.keyboard.press('Enter'); await page.keyboard.type('Zwei');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); await page.keyboard.type('Drei (eingerückt)');
  let lv = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p')).map((p) => p.getAttribute('data-lvl') + ':' + p.getAttribute('data-mark')));
  ok(lv.join() === '0:•,1:◦,1:◦', 'Tab rückt Listenebene ein, Enter setzt Liste fort: ' + lv.join());
  await page.keyboard.press('Shift+Tab');
  lv = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p')).map((p) => p.getAttribute('data-lvl')));
  ok(lv[2] === '0', 'Umschalt+Tab rückt aus');
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  ok(await page.evaluate(() => !W.el.flow.lastElementChild.hasAttribute('data-list')), 'Zweimal Enter beendet die Liste');
  // Nummerierung mit Überspringen und Neustart
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<p>a</p><p>b</p><p>c</p><p>Absatz</p><p>d</p><p>e</p>'); const ps = W.el.flow.querySelectorAll('p'); const r = document.createRange(); r.setStart(ps[0].firstChild, 0); r.setEnd(ps[2].firstChild, 1); const s = getSelection(); W.el.flow.focus(); s.removeAllRanges(); s.addRange(r); W.cmd.numbering(); });
  await page.evaluate(() => { const ps = W.el.flow.querySelectorAll('p'); const r = document.createRange(); r.setStart(ps[4].firstChild, 0); r.setEnd(ps[5].firstChild, 1); const s = getSelection(); s.removeAllRanges(); s.addRange(r); W.cmd.numbering(); });
  const nums = await page.evaluate(() => Array.from(W.el.flow.querySelectorAll('p')).map((p) => p.getAttribute('data-mark') || '-'));
  ok(nums.join() === '1.,2.,3.,-,1.,2.', 'Getrennte Nummerierungen zählen unabhängig: ' + nums.join());

  // Querformat
  await page.evaluate(() => W.cmd.orientation('landscape'));
  ok(await page.evaluate(() => W.doc.page.w > W.doc.page.h && W.layout.G.pw > W.layout.G.ph), 'Querformat');
  await page.evaluate(() => W.cmd.orientation('portrait'));

  // Spalten ab dieser Stelle (Abschnitt)
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), '<h1>Titel über die volle Breite</h1>' + Array.from({ length: 8 }, (_, i) => `<p>${i} ${l.repeat(2)}</p>`).join('')); W.sel.caretIn(W.el.flow.children[1], true); }, lorem);
  await page.evaluate(() => W.cmd.applyColumns({ n: 2, w: [1, 2], gap: 36, rule: true, bg: [null, null, null], bleed: true, mainOnly: false }, 'here'));
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => ({ sect: !!W.el.flow.querySelector('p.brk[data-brk="sect"]'), docCols: W.doc.cols.n, widths: Array.from(W.el.flow.querySelectorAll('p:not(.brk),h1')).map((b) => Math.round(parseFloat(b.style.getPropertyValue('--lw')))) }));
  ok(info.sect && info.docCols === 1 && info.widths[0] > 500 && info.widths.slice(1).some((w) => w < 250), 'Abschnitt: Titel einspaltig, Rest zweispaltig (schmal/breit) ' + JSON.stringify(info.widths));
  await page.screenshot({ path: SCR + '/section.png' });
  // Export/Import behält den Abschnitt
  const back = await page.evaluate(async () => { const b = await W.docx.export(); const r = await W.docx.import(await b.arrayBuffer(), 'x.docx'); return { markers: (r.html.match(/data-brk="sect"/g) || []).length, cols: r.doc.cols.n }; });
  ok(back.markers === 1 && back.cols === 1, 'Abschnitt übersteht DOCX-Roundtrip: ' + JSON.stringify(back));
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
