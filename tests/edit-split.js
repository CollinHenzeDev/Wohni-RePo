const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1400, height: 1100 } });
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';
  await page.evaluate((lorem) => {
    let h = '<h1>Titel</h1>';
    for (let i = 0; i < 40; i++) h += `<p>P${i + 1} ${lorem.repeat(1 + (i % 3))}</p>`;
    W.loadDocument(W.defaultDoc(), h);
  }, lorem);
  const info = () => page.evaluate(() => {
    const flow = W.el.flow;
    const logical = W.sel.leaves(flow).length;
    const conts = flow.querySelectorAll('[data-cont]').length;
    const joined = (idx) => { const h = W.sel.leaves(flow)[idx]; return W.sel.chainOf(h).map((p) => p.textContent).join(''); };
    const s = getSelection();
    return { logical, conts, pages: W.layout.info.pageCount, p9: joined(9).length, p9tail: joined(9).slice(-12), selInCont: !!(s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest('[data-cont]')) };
  });
  console.log('start', JSON.stringify(await info()));

  // 1) Cursor ans Ende des Kopfteils von P9 (liegt auf Seite 1 unten) setzen und tippen
  await page.evaluate(() => {
    const head = W.sel.leaves(W.el.flow)[9];
    W.el.flow.focus();
    W.sel.caretIn(head, true);
  });
  await page.keyboard.type('XYZ');
  await page.waitForTimeout(100);
  console.log('typed at head end', JSON.stringify(await info()));

  // 2) Cursor an den Anfang des Fortsetzungsteils, Backspace -> muss ein Zeichen löschen
  const before = (await info()).p9;
  await page.evaluate(() => {
    const flow = W.el.flow;
    const tail = flow.querySelector('[data-cont]');
    flow.focus();
    W.sel.caretIn(tail, false);
  });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(100);
  const after = await info();
  console.log('backspace at tail start: len', before, '->', after.p9, JSON.stringify(after));

  // 3) Enter in der Mitte des Fortsetzungsteils
  await page.evaluate(() => {
    const flow = W.el.flow;
    const tail = flow.querySelector('[data-cont]');
    const t = tail.firstChild; flow.focus();
    W.sel.caretTo(t.nodeType === 3 ? t : tail, t.nodeType === 3 ? Math.min(20, t.nodeValue.length) : 0);
  });
  const l0 = (await info()).logical;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const e1 = await info();
  console.log('enter in tail: logical', l0, '->', e1.logical, JSON.stringify(e1));

  // 4) Undo/Redo
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  console.log('undo', JSON.stringify(await info()));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);
  console.log('undo2', JSON.stringify(await info()));
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(100);
  console.log('redo', JSON.stringify(await info()));
  console.log('errors:', errors);
  await browser.close();
})();
