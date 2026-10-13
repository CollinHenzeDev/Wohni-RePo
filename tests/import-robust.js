const { open } = require('./lib');
const fs = require('fs'); const path = require('path');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1200, height: 800 } });
  const dir = process.env.GEN || path.join(__dirname, '..', 'tests', 'fixtures');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.docx')) : [];
  for (const f of files) {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    const r = await page.evaluate(async ([b64, name]) => {
      const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      W.dirty = false;
      try { await W.files.openFile(new File([arr], name), null, { skipConfirm: true }); } catch (e) { return { err: String(e) }; }
      const d = document.querySelector('.dialog'); if (d) { const t = d.textContent; d.closest('.modal-back').remove(); return { dialog: t.slice(0, 80) }; }
      return { pages: W.layout.info.pageCount, blocks: W.el.flow.children.length };
    }, [b64, f]);
    console.log('     ' + f + ' → ' + JSON.stringify(r));
    ok(!r.err, f + ' wirft keinen unbehandelten Fehler');
  }
  // Absichtlich kaputte Dateien
  const bad = await page.evaluate(async () => {
    const out = [];
    for (const [name, bytes] of [['leer.docx', new Uint8Array(0)], ['müll.docx', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])], ['kein-zip.docx', new TextEncoder().encode('Das ist gar keine Word-Datei, sondern nur Text.')]]) {
      W.dirty = false;
      await W.files.openFile(new File([bytes], name), null, { skipConfirm: true });
      const d = document.querySelector('.dialog');
      out.push({ name, dialog: !!d, text: d ? d.textContent.slice(0, 90) : '' });
      if (d) d.closest('.modal-back').remove();
    }
    return out;
  });
  bad.forEach((b) => ok(b.dialog, 'Defekte Datei "' + b.name + '" → verständliche Fehlermeldung: ' + b.text));
  console.log('Konsolenfehler (nur unerwartete):', JSON.stringify(errors.filter((e) => !/DOCX|ZIP|Keine gültige|übersprungen/.test(e))));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
