// Screenshot-Ausschnitt: node crop.js <setup.js|-> <out.png> <zoom> <x> <y> <w> <h>
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const [,, setup, out, zoom, x, y, w, h] = process.argv;
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 1000 } });
  if (setup !== '-') { const r = await page.evaluate(fs.readFileSync(setup, 'utf8')); if (r !== undefined) console.log(JSON.stringify(r)); }
  await page.evaluate((z) => { W.view.setZoom(+z, false); W.el.workspace.scrollTop = 0; }, zoom);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } });
  if (errors.length) console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
