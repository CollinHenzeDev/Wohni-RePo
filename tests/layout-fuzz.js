// Zufallstest der Layout-Engine: Invarianten statt fester Erwartungswerte
const { open } = require('./lib');
let fails = 0;
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1200, height: 900 } });
  const N = +process.env.N || 120;
  const res = await page.evaluate(async ({ N, S }) => {
    let seed = S;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const words = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.split(' ');
    const text = (n) => Array.from({ length: n }, () => words[ri(0, words.length - 1)]).join(' ');
    const png = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#8ab"/></svg>');
    const problems = [];
    const dumps = {};
    let maxMs = 0;
    for (let it = 0; it < N; it++) {
      const doc = W.defaultDoc();
      const colsKind = ['one', 'two', 'three', 'left', 'right'][ri(0, 4)];
      const cp = W.COLUMN_PRESETS[colsKind];
      doc.cols = Object.assign(doc.cols, { n: cp.n, w: cp.w.slice(), gap: 30, mainOnly: rnd() < 0.3 });
      if (rnd() < 0.3) { doc.page.t = W.u.cm2px(ri(1, 4)); doc.page.b = W.u.cm2px(ri(1, 3)); }
      if (rnd() < 0.15) { doc.page.w = [W.u.mm2px(148), W.u.mm2px(297)][ri(0, 1)]; doc.page.h = [W.u.mm2px(210), W.u.mm2px(420)][ri(0, 1)]; }
      let html = '';
      const nb = ri(1, 40);
      for (let i = 0; i < nb; i++) {
        const r = rnd();
        if (r < 0.55) html += `<p style="${rnd() < 0.2 ? 'text-align:justify;' : ''}${rnd() < 0.1 ? 'margin-top:' + ri(0, 30) + 'pt;' : ''}">${i}: ${text(ri(1, 140))}</p>`;
        else if (r < 0.65) html += `<h${ri(1, 3)}>${text(ri(1, 8))}</h${ri(1, 3)}>`.replace(/<h(\d)>(.*)<\/h\d>/, '<h$1>$2</h$1>');
        else if (r < 0.75) html += `<table><tbody>${Array.from({ length: ri(1, 12) }, () => `<tr><td><p>${text(ri(1, 25))}</p></td><td><p>${text(ri(1, 25))}</p></td></tr>`).join('')}</tbody></table>`;
        else if (r < 0.80) html += `<p><img src="${png}" width="${ri(40, 700)}" height="${ri(40, 1400)}"></p>`;
        else if (r < 0.85) html += `<p class="brk" data-brk="page" contenteditable="false"><br></p>`;
        else if (r < 0.90) html += `<p class="brk" data-brk="column" contenteditable="false"><br></p>`;
        else if (r < 0.93) html += `<p class="brk" data-brk="sect" contenteditable="false" data-cols='${JSON.stringify({ n: ri(1, 3), w: [1, 2, 1].slice(0, 3), gap: 30 })}'><br></p>`;
        else if (r < 0.97) html += `<p data-list="b" data-lvl="${ri(0, 2)}" data-ctx="1">${text(ri(1, 30))}</p>`;
        else html += `<p style="line-height:${ri(10, 60)}pt">${text(ri(1, 60))}</p>`;
      }
      W.loadDocument(doc, html, { noFocus: true });
      const nf = ri(0, 3);
      for (let k = 0; k < nf; k++) W.doc.floats.push(W.floats.create('shape', { shape: 'rect', page: 0, x: ri(0, 400), y: ri(0, 700), w: ri(40, 300), h: ri(20, 300), wrap: ['square', 'topbottom', 'behind', 'front'][ri(0, 3)] }));
      const t0 = performance.now();
      W.layout.run();
      const ms = performance.now() - t0; maxMs = Math.max(maxMs, ms);
      const tag = `#${it} (${colsKind}, ${nb} Blöcke)`;
      // 1) Inhalt bleibt erhalten
      const before = html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
      const clean = W.layout.serialize().replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
      if (before.replace(/\|/g, '').replace(/\s+/g, ' ') !== clean.replace(/\|/g, '').replace(/\s+/g, ' ')) problems.push(tag + ': Text verändert');
      if (/data-cont|data-split/.test(W.layout.serialize())) problems.push(tag + ': Teilungsreste im Speicherstand');
      // 2) Überlappungen im Fluss (nur Blöcke mit Höhe)
      const flowRects = Array.from(W.el.flow.children).filter((b) => !b.classList.contains('brk')).map((b) => ({ b, r: b.getBoundingClientRect(), pg: W.layout.pageMap.get(b) }));
      const z = W.view.zoom;
      for (let i = 0; i < flowRects.length; i++) for (let j = i + 1; j < flowRects.length; j++) {
        const A = flowRects[i], B = flowRects[j];
        if (A.pg !== B.pg) continue;
        const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        const oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (ox > 6 && oy > 3 * z) { problems.push(`${tag}: Blöcke ${i}/${j} überlappen (${Math.round(oy)}px)`); dumps[it] = { html, cols: JSON.stringify(W.doc.cols), page: JSON.stringify(W.doc.page), floats: JSON.stringify(W.doc.floats), i, j, pg: A.pg, ra: [A.r.left, A.r.top, A.r.width, A.r.height].map(Math.round), rb: [B.r.left, B.r.top, B.r.width, B.r.height].map(Math.round), ta: A.b.tagName + ':' + A.b.textContent.slice(0, 30), tb: B.b.tagName + ':' + B.b.textContent.slice(0, 30), lay: [A.b.getAttribute('style'), B.b.getAttribute('style')] }; i = 1e9; break; }
      }
      // 3) Alles innerhalb der Seite (horizontal)
      const G = W.layout.G; const sheet = W.el.sheets.firstElementChild.getBoundingClientRect();
      for (const A of flowRects) {
        if (A.b.querySelector('img') && A.b.tagName === 'P') continue;
        if (A.r.left < sheet.left - 2 || A.r.right > sheet.right + 2) { problems.push(`${tag}: Block ragt seitlich aus der Seite`); break; }
      }
    }
    return { problems, dumps, maxMs: Math.round(maxMs) };
  }, { N, S: +process.env.SEED || 12345 });
  console.log(`Zufallsdokumente: ${N}, längster Layoutlauf ${res.maxMs} ms`);
  res.problems.slice(0, 20).forEach((p) => console.log('FEHLER ' + p));
  if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(res.dumps, null, 1));
  console.log('Konsolenfehler:', JSON.stringify(errors.slice(0, 3)));
  console.log(res.problems.length || errors.length ? `\n${res.problems.length} Probleme` : '\nALLE TESTS BESTANDEN');
  await browser.close();
})();
