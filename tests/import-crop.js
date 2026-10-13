// node import-crop.js <in.docx> <out.png> <zoom> <x> <y> <w> <h>
const { open } = require('./lib');
const fs = require('fs'); const path = require('path');
(async () => {
  const [,, inFile, out, zoom, x, y, w, h] = process.argv;
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 1050 } });
  const b64 = fs.readFileSync(inFile).toString('base64');
  await page.evaluate(async ([b64, name]) => {
    const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    W.dirty = false; await W.files.openFile(new File([arr], name), null, { skipConfirm: true }); await new Promise((r) => setTimeout(r, 300));
  }, [b64, path.basename(inFile)]);
  await page.evaluate((z) => { W.view.setZoom(+z, false); W.el.workspace.scrollTop = 0; document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); }, zoom);
  await page.waitForTimeout(250);
  await page.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } });
  if (errors.length) console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
