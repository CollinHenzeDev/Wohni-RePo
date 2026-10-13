// Öffnet eine .docx im Editor und speichert einen Screenshot: node import-file.js <in.docx> <out.png> [zoom] [page]
const { open } = require('./lib');
const fs = require('fs');
const path = require('path');
(async () => {
  const [,, inFile, out, zoom, pg] = process.argv;
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 1050 } });
  const b64 = fs.readFileSync(inFile).toString('base64');
  const res = await page.evaluate(async ([b64, name]) => {
    const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const file = new File([arr], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    W.dirty = false;
    await W.files.openFile(file, null, { skipConfirm: true });
    await new Promise((r) => setTimeout(r, 400));
    return { pages: W.layout.info.pageCount, floats: W.doc.floats.length, cols: W.doc.cols.n, blocks: W.el.flow.children.length, title: W.doc.title, ms: W.layout.lastMs };
  }, [b64, path.basename(inFile)]);
  console.log(JSON.stringify(res));
  await page.evaluate(([z, p]) => { W.view.setZoom(+z || 0.6, false); W.view.scrollToPage(+p || 0); }, [zoom || 0.6, pg || 0]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
