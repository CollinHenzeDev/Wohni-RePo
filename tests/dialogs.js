const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<h1>Titel</h1><p>Ein Absatz mit etwas Text.</p>'); W.sel.caretIn(W.el.flow.querySelector('p'), false); });
  const names = ['link', 'symbol', 'table', 'pageSetup', 'columns', 'paragraph', 'font', 'stats', 'properties', 'watermark', 'pageBorder', 'shortcuts', 'about'];
  for (const n of names) {
    await page.evaluate((n) => { W.fmt.refocus(); W.dialogs[n](); }, n);
    await page.waitForTimeout(80);
    const open = await page.evaluate(() => !!document.querySelector('.dialog'));
    ok(open, 'Dialog "' + n + '" öffnet');
    if (n === 'columns') await page.screenshot({ path: SCR + '/dlg-columns.png' });
    if (n === 'pageSetup') await page.screenshot({ path: SCR + '/dlg-page.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(60);
  }
  // Spalten-Dialog: "Links" wählen und anwenden
  await page.evaluate(() => W.dialogs.columns());
  await page.click('.colpre[title^="Links"]');
  await page.click('.dialog .dbtn.primary');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.doc.cols.n === 2 && W.doc.cols.w[0] < W.doc.cols.w[1]), 'Dialog: "Links" ergibt schmale linke Spalte');
  await page.evaluate(() => W.dialogs.columns());
  await page.click('.colpre[title^="Rechts"]');
  await page.click('.dialog .dbtn.primary');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.doc.cols.n === 2 && W.doc.cols.w[0] > W.doc.cols.w[1]), 'Dialog: "Rechts" ergibt schmale rechte Spalte');
  // Backstage
  for (const id of ['info', 'new', 'open', 'saveas', 'print', 'export', 'insertfile', 'options']) {
    await page.evaluate((id) => W.ribbon.openBackstage(id), id);
    ok(await page.evaluate(() => !W.el.backstage.hidden), 'Datei-Menü "' + id + '"');
  }
  await page.screenshot({ path: SCR + '/backstage.png' });
  await page.evaluate(() => W.ribbon.closeBackstage());
  // Alle Menüs der Registerkarten öffnen
  const nMenus = await page.evaluate(async () => {
    let n = 0;
    for (const t of ['home', 'insert', 'design', 'layout', 'refs', 'review', 'view']) {
      W.ribbon.selectTab(t);
      const btns = Array.from(document.querySelectorAll(`.rpanel[data-id="${t}"] .rbtn.hasmenu, .rpanel[data-id="${t}"] .rsplit .arrow, .rpanel[data-id="${t}"] .rcombo-btn`));
      for (const b of btns) { b.click(); await new Promise((r) => setTimeout(r, 20)); if (document.querySelector('.menu')) n++; W.ui.closeMenus(); }
    }
    return n;
  });
  ok(nMenus > 25, 'Menüs aller Registerkarten öffnen (' + nMenus + ')');
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
