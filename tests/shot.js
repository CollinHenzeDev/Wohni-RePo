// Hilfsskript: JS im Seitenkontext ausführen, Screenshot speichern
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const [,, setupFile, out, zoom, w, h, scrollPage] = process.argv;
  const { browser, page, errors } = await open({ viewport: { width: +(w || 1400), height: +(h || 900) } });
  if (setupFile && setupFile !== '-') {
    const code = fs.readFileSync(setupFile, 'utf8');
    const r = await page.evaluate(code);
    if (r !== undefined) console.log(JSON.stringify(r));
  }
  await page.evaluate(([z, sp]) => { W.view.setZoom(+z || 1, false); if (sp != null) W.view.scrollToPage(+sp); }, [zoom || 1, scrollPage == null ? null : scrollPage]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: out });
  if (errors.length) console.log('errors:', errors);
  await browser.close();
})();
