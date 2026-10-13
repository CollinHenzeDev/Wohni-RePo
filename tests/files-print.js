const { open } = require('./lib');
const fs = require('fs');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 900 } });

  // Vorlage laden und als PDF drucken (Print-CSS)
  await page.evaluate(() => { W.templates.open('cv-left'); window.print = () => {}; });
  await page.evaluate(() => W.files.print());
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('#printroot .printpage')), 'Druckansicht wird aufgebaut');
  await page.pdf({ path: SCR + '/print-test.pdf', preferCSSPageSize: true, printBackground: true });
  ok(fs.statSync(SCR + '/print-test.pdf').size > 5000, 'PDF erzeugt: ' + fs.statSync(SCR + '/print-test.pdf').size + ' Bytes');

  // Speichern: Download-Fallback (ohne File System Access API)
  await page.evaluate(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => W.files.saveAs())]);
  const name = dl.suggestedFilename();
  await dl.saveAs(SCR + '/' + name);
  ok(/\.docx$/.test(name) && fs.statSync(SCR + '/' + name).size > 2000, 'Speichern lädt ' + name + ' herunter (' + fs.statSync(SCR + '/' + name).size + ' Bytes)');
  ok(await page.evaluate(() => !W.dirty), 'Dokument ist danach als gespeichert markiert');

  // Öffnen über Dateiauswahl (verstecktes Eingabefeld)
  await page.evaluate(() => W.floats.deselect());
  await page.setInputFiles('#fileOpen', SCR + '/' + name);
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => W.doc.cols.n === 2 && W.el.flow.textContent.includes('Max Mustermann')), 'Datei wieder geöffnet (Spalten und Text erhalten)');
  ok(await page.evaluate(() => W.doc.cols.w[1] > W.doc.cols.w[0] * 1.7), 'Spaltenverhältnis erhalten: ' + JSON.stringify(await page.evaluate(() => W.doc.cols.w)));

  // Weblayout
  await page.evaluate(() => W.view.setMode('web'));
  ok(await page.evaluate(() => W.layout.info.pageCount === 1 && W.doc.view === 'web'), 'Weblayout: eine endlose Seite');
  await page.evaluate(() => W.view.setMode('print'));

  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
