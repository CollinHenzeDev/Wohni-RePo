// Exportiert ein Dokument aus dem Browser in eine .docx-Datei: node export-file.js <template|setup.js> <out.docx>
const { open } = require('./lib');
const fs = require('fs');
(async () => {
  const [,, what, out] = process.argv;
  const { browser, page, errors } = await open({ viewport: { width: 1400, height: 1000 } });
  if (fs.existsSync(what)) await page.evaluate(fs.readFileSync(what, 'utf8'));
  else await page.evaluate((id) => W.templates.open(id), what);
  await page.waitForTimeout(300);
  const b64 = await page.evaluate(async () => {
    const blob = await W.docx.export();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('geschrieben:', out, fs.statSync(out).size, 'Bytes; errors:', JSON.stringify(errors));
  await browser.close();
})();
