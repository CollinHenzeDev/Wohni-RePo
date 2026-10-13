const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) fails++; };
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 950 } });
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), Array.from({ length: 10 }, (_, i) => `<p>${i} ${l.repeat(2)}</p>`).join('')); W.floats.insertShape('roundrect', { wrap: 'behind', x: 200, y: 260, w: 300, h: 180, fill: '#9dc3e6' }); }, lorem);
  await page.waitForTimeout(100);
  const box = () => page.evaluate(() => { const f = W.doc.floats[0]; return { x: f.x, y: f.y, w: f.w, h: f.h, rot: f.rot }; });
  const b0 = await box();
  // Größe über Anfasser (Ecke unten rechts) ändern
  const h = await page.evaluate(() => { const r = document.querySelector('.fsel .fh-se').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.mouse.move(h.x + 80, h.y + 50, { steps: 6 }); await page.mouse.up();
  const b1 = await box();
  ok(b1.w > b0.w + 60 && b1.h > b0.h + 30, `Größe per Anfasser: ${Math.round(b0.w)}×${Math.round(b0.h)} → ${Math.round(b1.w)}×${Math.round(b1.h)}`);
  // Drehen
  const r = await page.evaluate(() => { const e = document.querySelector('.fsel .frot').getBoundingClientRect(); const c = document.querySelector('.fsel').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2, cx: c.left + c.width / 2, cy: c.top + c.height / 2 }; });
  await page.mouse.move(r.x, r.y); await page.mouse.down(); await page.mouse.move(r.cx + 150, r.cy, { steps: 8 }); await page.mouse.up();
  const b2 = await box();
  ok(Math.abs(b2.rot - 90) < 8, 'Drehen per Griff: ' + b2.rot + '°');
  await page.evaluate(() => W.floats.update({ rot: 0 }));
  // Rechtsklick-Menü
  const pt = await page.evaluate(() => { const rc = document.querySelector('.fobj').getBoundingClientRect(); return { x: rc.right - 14, y: rc.top + 14 }; });
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector('.menu') && /Textumbruch/.test(document.querySelector('.menu').textContent)), 'Rechtsklick öffnet Objektmenü');
  await page.screenshot({ path: SCR + '/ctx.png' });
  await page.keyboard.press('Escape');
  // Text in Form
  await page.evaluate(() => { const f = W.doc.floats[0]; W.floats.editText(f.id); });
  await page.keyboard.type('Text in der Form');
  await page.evaluate(() => W.floats.stopEdit());
  ok(await page.evaluate(() => /Text in der Form/.test(W.doc.floats[0].text)), 'Text in Form wird gespeichert');
  // Textfeld mit Seitenleiste
  await page.evaluate(() => { W.floats.deselect(); W.floats.insertTextbox({ wrap: 'front', x: 120, y: 520 }); });
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Mein Textfeld');
  await page.evaluate(() => W.floats.stopEdit());
  ok(await page.evaluate(() => W.doc.floats.length === 2 && /Mein Textfeld/.test(W.doc.floats[1].text)), 'Textfeld mit eigenem Text');
  // Reihenfolge
  await page.evaluate(() => { W.floats.select(W.doc.floats[1].id); W.floats.sendToBack(); });
  ok(await page.evaluate(() => W.doc.floats[0].kind === 'textbox'), 'Reihenfolge: Textfeld nach hinten');
  // Ausblenden per Auswahlbereich
  await page.evaluate(() => W.cmd.selectionPane());
  ok(await page.evaluate(() => document.querySelectorAll('#sidepane .objrow').length === 2), 'Auswahlbereich listet beide Objekte');
  // Löschen mit Entf
  await page.keyboard.press('Delete');
  ok(await page.evaluate(() => W.doc.floats.length === 1), 'Entf löscht das ausgewählte Objekt');
  // Undo bringt es zurück
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => W.doc.floats.length === 2), 'Strg+Z stellt gelöschtes Objekt wieder her');
  ok(await page.evaluate(() => document.querySelectorAll('.fobj').length === 2), 'Wiederhergestellte Objekte werden angezeigt');
  await page.screenshot({ path: SCR + '/objects.png' });
  console.log('Konsolenfehler:', JSON.stringify(errors));
  console.log(fails ? `\n${fails} FEHLER` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
