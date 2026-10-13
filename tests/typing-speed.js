const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1300, height: 850 } });
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';
  await page.evaluate((l) => { W.loadDocument(W.defaultDoc(), Array.from({ length: 120 }, (_, i) => `<p>${i} ${l.repeat(3)}</p>`).join('')); W.sel.caretIn(W.el.flow.children[40], false); }, lorem);
  const r = await page.evaluate(async () => {
    // Zeit pro Eingabeereignis im Seitenkontext messen
    let n = 0, total = 0, layouts = 0;
    const origRun = W.layout.run; W.layout.run = function () { layouts++; return origRun.apply(this, arguments); };
    const h = () => { const t = performance.now(); queueMicrotask(() => {}); };
    const flow = W.el.flow;
    const times = [];
    for (let i = 0; i < 200; i++) {
      const t0 = performance.now();
      document.execCommand('insertText', false, 'x');
      times.push(performance.now() - t0);
      await new Promise((r) => setTimeout(r, 0));
    }
    W.layout.run = origRun;
    times.sort((a, b) => a - b);
    return { median: times[100].toFixed(2), p95: times[190].toFixed(2), layouts };
  });
  console.log('Tippen im 120-Absatz-Dokument: Median', r.median, 'ms, 95 %', r.p95, 'ms; volle Layoutläufe bei 200 Zeichen:', r.layouts);
  console.log('Konsolenfehler:', JSON.stringify(errors));
  await browser.close();
})();
