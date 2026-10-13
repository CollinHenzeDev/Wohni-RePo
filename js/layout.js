/* Wohni Writer – Layout-Engine
 *
 * Das Dokument ist ein flacher contenteditable-Fluss (#flow). Jeder Block wird per
 * CSS-Transform auf seinen Platz (Seite / Spalte / Y-Position) geschoben. Dadurch sind
 * Seiten, ungleich breite Spalten, Umbrüche und Textumfluss möglich, ohne den Text zu
 * duplizieren und ohne die Browser-Bearbeitung (Cursor, Auswahl, Rechtschreibung) zu verlieren.
 *
 * Absätze/Tabellen, die über eine Spalten-/Seitengrenze reichen, werden hier "weich" geteilt
 * (Fortsetzung bekommt data-cont) und vor jeder Bearbeitung/Speicherung wieder vereint.
 */
(function () {
  'use strict';
  const W = window.W;
  const L = (W.layout = { info: { pageCount: 1 }, pageMap: new WeakMap(), busy: false });

  const BLOCK_RE = /^(P|H[1-6]|TABLE)$/;
  const LAYOUT_VARS = ['--lx', '--ly', '--lw', '--tal'];

  /* ------------------------------------------------------------------ */
  /*  Struktur: Weiche Teilungen vereinen, Fluss normalisieren           */
  /* ------------------------------------------------------------------ */
  function unsplit(flow) {
    const conts = Array.from(flow.querySelectorAll(':scope > [data-cont]'));
    for (const el of conts) {
      const prev = el.previousElementSibling;
      if (prev && prev.tagName === el.tagName && prev !== el) {
        if (el.tagName === 'TABLE') {
          const body = prev.tBodies[prev.tBodies.length - 1] || prev.appendChild(document.createElement('tbody'));
          Array.from(el.rows).forEach((r) => body.appendChild(r));
        } else {
          while (el.firstChild) prev.appendChild(el.firstChild);
          prev.normalize();
        }
        prev.removeAttribute('data-split');
        prev.style.removeProperty('--tal');
        el.remove();
      } else {
        el.removeAttribute('data-cont');
      }
    }
    flow.querySelectorAll('[data-split]').forEach((e) => { e.removeAttribute('data-split'); e.style.removeProperty('--tal'); });
  }
  L.unsplit = unsplit;

  /** Zeilenumbruch-Platzhalter: leere Blöcke brauchen ein <br> */
  function ensureBr(el) {
    if (!el.firstChild) el.appendChild(document.createElement('br'));
  }

  const INLINE_TAGS = /^(SPAN|B|I|U|S|STRIKE|EM|STRONG|A|FONT|SUB|SUP|IMG|BR|MARK|CODE|SMALL|BIG|ABBR|CITE|Q|DEL|INS|LABEL)$/;

  function normalizeFlow(flow) {
    let changed = false;
    let node = flow.firstChild;
    while (node) {
      const next = node.nextSibling;
      if (node.nodeType === 3) {
        if (!/\S/.test(node.nodeValue)) { if (/[\n\r]/.test(node.nodeValue) || flow.children.length) { flow.removeChild(node); changed = true; } }
        else { wrapRun(flow, node); changed = true; }
      } else if (node.nodeType === 1) {
        const t = node.tagName;
        if (BLOCK_RE.test(t)) { /* ok */ }
        else if (INLINE_TAGS.test(t)) { wrapRun(flow, node); changed = true; }
        else if (t === 'UL' || t === 'OL') { if (W.lists) W.lists.convertList(node); changed = true; }
        else if (t === 'DIV' || t === 'SECTION' || t === 'ARTICLE' || t === 'BLOCKQUOTE' || t === 'LI' || t === 'CENTER') {
          const hasBlock = node.querySelector(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > table, :scope > div, :scope > ul, :scope > ol');
          if (hasBlock) { while (node.firstChild) flow.insertBefore(node.firstChild, node); node.remove(); }
          else { const p = document.createElement('p'); while (node.firstChild) p.appendChild(node.firstChild); ensureBr(p); flow.replaceChild(p, node); }
          changed = true;
          node = flow.firstChild; // neu starten (einfach & robust)
          continue;
        } else { node.remove(); changed = true; }
      } else { flow.removeChild(node); changed = true; }
      node = next;
    }
    if (!flow.firstChild) { const p = document.createElement('p'); p.appendChild(document.createElement('br')); flow.appendChild(p); changed = true; }
    // Vor/hinter einer Tabelle am Dokumentrand muss ein Absatz stehen, sonst kann der Cursor dort nicht hin
    const edgeP = () => { const p = document.createElement('p'); p.appendChild(document.createElement('br')); return p; };
    if (flow.firstElementChild && flow.firstElementChild.tagName === 'TABLE') { flow.insertBefore(edgeP(), flow.firstChild); changed = true; }
    if (flow.lastElementChild && flow.lastElementChild.tagName === 'TABLE') { flow.appendChild(edgeP()); changed = true; }
    // Tabellenzellen brauchen Absätze
    flow.querySelectorAll('td,th').forEach((c) => {
      if (!c.querySelector(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > table')) {
        const p = document.createElement('p');
        while (c.firstChild) p.appendChild(c.firstChild);
        ensureBr(p); c.appendChild(p); changed = true;
      }
    });
    flow.querySelectorAll('p,h1,h2,h3,h4,h5,h6').forEach((e) => { if (!e.firstChild) { ensureBr(e); } });
    return changed;
  }
  function wrapRun(flow, first) {
    const p = document.createElement('p');
    flow.insertBefore(p, first);
    let n = first;
    while (n && (n.nodeType === 3 || (n.nodeType === 1 && INLINE_TAGS.test(n.tagName)))) {
      const nx = n.nextSibling; p.appendChild(n); n = nx;
    }
    ensureBr(p);
  }
  L.normalizeFlow = normalizeFlow;

  /* ------------------------------------------------------------------ */
  /*  Messen                                                              */
  /* ------------------------------------------------------------------ */
  const num = (s) => parseFloat(s) || 0;

  function blockInfo(b) {
    const cs = getComputedStyle(b);
    const inf = {
      el: b,
      mt: num(cs.marginTop), mb: num(cs.marginBottom), ml: num(cs.marginLeft), mr: num(cs.marginRight),
      table: b.tagName === 'TABLE',
      brk: b.classList.contains('brk') ? b.getAttribute('data-brk') : null,
      pbb: b.hasAttribute('data-pbb'),
      keep: /^H[1-6]$/.test(b.tagName) || b.hasAttribute('data-keep'),
      ctxKey: b.hasAttribute('data-ctx') ? b.tagName + '|' + b.className : null,
      fs: num(cs.fontSize),
      lh: cs.lineHeight === 'normal' ? num(cs.fontSize) * 1.25 : num(cs.lineHeight),
    };
    if (b.getAttribute('data-keep') === '0') inf.keep = false;
    return inf;
  }

  function setW(inf, w) {
    inf.el.style.setProperty('--lw', Math.max(20, w - inf.ml - inf.mr).toFixed(2) + 'px');
    inf.w = w;
  }
  const hOf = (inf) => inf.el.getBoundingClientRect().height;

  /** Zeilen eines Absatzes (relative Ober-/Untergrenzen) – nutzt Mitten der Text-Rechtecke */
  function getLines(b, inf) {
    const br = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const r = document.createRange();
    r.selectNodeContents(b);
    const rects = Array.from(r.getClientRects()).filter((x) => x.height > 0.5);
    if (!rects.length) return null;
    rects.sort((p, q) => (p.top + p.bottom) - (q.top + q.bottom));
    const pitch = Math.max(8, inf.lh);
    const clusters = [];
    for (const rc of rects) {
      const cy = (rc.top + rc.bottom) / 2;
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(cy - last.cy) <= pitch * 0.55) {
        last.n++; last.cy = (last.cy * (last.n - 1) + cy) / last.n;
      } else clusters.push({ cy, n: 1 });
    }
    const padT = num(cs.paddingTop) + num(cs.borderTopWidth);
    const padB = num(cs.paddingBottom) + num(cs.borderBottomWidth);
    const lines = [];
    for (let i = 0; i < clusters.length; i++) {
      const top = i === 0 ? padT : ((clusters[i - 1].cy + clusters[i].cy) / 2 - br.top);
      const bottom = i === clusters.length - 1 ? (br.height - padB) : ((clusters[i].cy + clusters[i + 1].cy) / 2 - br.top);
      lines.push({ top, bottom, cy: clusters[i].cy - br.top });
    }
    return { lines, top: br.top };
  }

  /** Erste Stelle im Block, deren Mitte unterhalb clientY liegt (= Anfang der nächsten Zeile) */
  function findSplitPos(b, clientY) {
    const nodes = [];
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 3) return n.nodeValue.length && !(n.parentElement && n.parentElement.closest('.fld')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        return (n.tagName === 'IMG' || n.tagName === 'BR' || n.classList.contains('fld')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    let n;
    while ((n = w.nextNode())) nodes.push(n);
    if (!nodes.length) return null;
    const rg = document.createRange();
    const charCy = (t, i) => {
      for (let k = i; k < t.nodeValue.length && k < i + 8; k++) {
        rg.setStart(t, k); rg.setEnd(t, k + 1);
        const rc = rg.getClientRects()[0];
        if (rc && rc.height > 0.5) return (rc.top + rc.bottom) / 2;
      }
      return null;
    };
    const firstCy = (nd) => {
      if (nd.nodeType === 3) return charCy(nd, 0);
      const rc = nd.getBoundingClientRect();
      return rc.height > 0.5 ? (rc.top + rc.bottom) / 2 : null;
    };
    // letzter Knoten, dessen erste Mitte <= clientY
    let lo = 0, hi = nodes.length - 1, j = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = firstCy(nodes[mid]);
      if (c == null || c <= clientY) { j = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (j < 0) return null;
    const nd = nodes[j];
    if (nd.nodeType === 3 && nd.nodeValue.length > 1) {
      let a = 0, z = nd.nodeValue.length - 1, found = -1;
      while (a <= z) {
        const mid = (a + z) >> 1;
        const c = charCy(nd, mid);
        if (c != null && c > clientY) { found = mid; z = mid - 1; } else a = mid + 1;
      }
      if (found > 0) return { node: nd, offset: found };
      if (found === 0) return null;
    }
    const nx = nodes[j + 1];
    if (!nx) return null;
    if (nx.nodeType === 3) return { node: nx, offset: 0 };
    return { node: nx.parentNode, offset: Array.prototype.indexOf.call(nx.parentNode.childNodes, nx) };
  }

  function splitParagraph(b, pos) {
    const r = document.createRange();
    r.setStart(pos.node, pos.offset);
    r.setEnd(b, b.childNodes.length);
    const frag = r.extractContents();
    if (!b.firstChild || !frag.firstChild) {
      // nichts geteilt → rückgängig machen
      while (frag.firstChild) b.appendChild(frag.firstChild);
      return null;
    }
    const tail = b.cloneNode(false);
    tail.removeAttribute('id');
    tail.setAttribute('data-cont', '1');
    tail.appendChild(frag);
    ensureBr(tail);
    b.setAttribute('data-split', '1');
    if (getComputedStyle(b).textAlign === 'justify') b.style.setProperty('--tal', 'justify');
    b.after(tail);
    return tail;
  }

  function splitTable(tb, k) {
    const rows = Array.from(tb.rows);
    // nicht innerhalb von Zeilenverbünden teilen
    const reach = (upto) => {
      for (let i = 0; i < upto; i++) for (const c of rows[i].cells) if (rows[i].rowIndex + c.rowSpan > upto) return false;
      return true;
    };
    while (k > 0 && !reach(k)) k--;
    if (k <= 0 || k >= rows.length) return null;
    const tail = tb.cloneNode(false);
    tail.setAttribute('data-cont', '1');
    const cg = tb.querySelector('colgroup');
    if (cg) tail.appendChild(cg.cloneNode(true));
    const body = document.createElement('tbody');
    for (let i = k; i < rows.length; i++) body.appendChild(rows[i]);
    tail.appendChild(body);
    tb.after(tail);
    return tail;
  }

  /* ------------------------------------------------------------------ */
  /*  Hindernisse (Textumbruch um Objekte) und Segmente                  */
  /* ------------------------------------------------------------------ */
  function obstaclesOn(page) {
    const out = [];
    for (const f of W.doc.floats) {
      if ((f.wrap !== 'square' && f.wrap !== 'topbottom') || f.page !== page) continue;
      const d = f.wrapDist != null ? f.wrapDist : 9;
      out.push({ x0: f.x - d, x1: f.x + f.w + d, y0: f.y - d, y1: f.y + f.h + d, wrap: f.wrap });
    }
    return out;
  }

  function splitByObstacles(obsAll, x, w, top, bottom) {
    const obs = obsAll.filter((o) => o.x1 > x + 1 && o.x0 < x + w - 1 && o.y1 > top && o.y0 < bottom).sort((a, b) => a.y0 - b.y0);
    if (!obs.length) return [{ x, y: top, w, h: bottom - top, full: true }];
    // Hindernisse mit überlappender Höhe zusammenfassen
    const clusters = [];
    for (const o of obs) {
      const c = clusters[clusters.length - 1];
      if (c && o.y0 < c.y1) { c.y1 = Math.max(c.y1, o.y1); c.x0 = Math.min(c.x0, o.x0); c.x1 = Math.max(c.x1, o.x1); if (o.wrap === 'topbottom') c.wrap = 'topbottom'; }
      else clusters.push({ ...o });
    }
    const out = [];
    let y = top;
    for (const c of clusters) {
      const y0 = Math.max(c.y0, y), y1 = Math.min(c.y1, bottom);
      if (y0 > y) out.push({ x, y, w, h: y0 - y, full: false });
      if (c.wrap === 'square') {
        const left = c.x0 - x, right = x + w - c.x1;
        const bw = Math.max(left, right);
        if (bw >= 72) out.push({ x: left >= right ? x : c.x1, y: y0, w: bw, h: y1 - y0, full: false });
      }
      y = Math.max(y, y1);
    }
    if (bottom > y) out.push({ x, y, w, h: bottom - y, full: false });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Hauptlauf                                                           */
  /* ------------------------------------------------------------------ */
  let timer = 0, again = false;

  L.schedule = function (sync) {
    if (sync) { clearTimeout(timer); timer = 0; L.run(); return; }
    if (timer) return;
    timer = setTimeout(() => { timer = 0; L.run(); }, 16);
  };

  /**
   * Schnellprüfung nach einfachem Tippen: Hat sich die Höhe des bearbeiteten Blocks nicht geändert,
   * bleibt jeder andere Block an seinem Platz – ein voller Layoutlauf ist dann unnötig.
   */
  L.canSkip = function () {
    const flow = W.el.flow;
    if (!L.blockH || timer || flow.children.length !== L.blockCount) return false;
    const sel = getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return false;
    let n = sel.anchorNode;
    n = n && (n.nodeType === 1 ? n : n.parentNode);
    if (!n || !flow.contains(n)) return false;
    let top = n; while (top && top.parentNode !== flow) top = top.parentNode;
    if (!top || !top.hasAttribute('data-lay') || top.hasAttribute('data-cont') || top.tagName === 'TABLE' && false) return false;
    if (top.nextElementSibling && top.nextElementSibling.hasAttribute('data-cont')) { /* Kopfteil: Höhe prüfen wie sonst */ }
    if (top.querySelector('.tabc,.fld') || top.hasAttribute('data-toc') || top.matches('p.brk')) return false;
    const old = L.blockH.get(top);
    if (old == null) return false;
    const z = (W.view && W.view.zoom) || 1;
    const h = top.getBoundingClientRect().height / z;
    return Math.abs(h - old) < 0.6;
  };

  /** Struktur-Bearbeitung vorbereiten: weiche Teilungen auflösen, Auswahl sichern */
  L.beginEdit = function () {
    const flow = W.el.flow;
    if (!flow.querySelector('[data-cont]')) return null;
    const saved = W.sel.save(flow);
    unsplit(flow);
    if (saved) W.sel.restore(saved, flow);
    return saved;
  };

  function parseCols(attr, fallback) {
    if (!attr) return fallback;
    try {
      const o = JSON.parse(attr);
      return { n: o.n || 1, w: o.w || Array(o.n || 1).fill(1), gap: o.gap != null ? o.gap : fallback.gap, rule: !!o.rule, bg: o.bg || [null, null, null], bleed: o.bleed !== false, mainOnly: !!o.mainOnly };
    } catch (e) { return fallback; }
  }

  L.run = function () {
    if (L.busy) { again = true; return; }
    if (W.composing) { L.schedule(); return; }
    L.busy = true;
    const t0 = performance.now();
    try { runInner(); } catch (e) { console.error('Layout-Fehler', e); }
    L.busy = false;
    L.lastMs = performance.now() - t0;
    if (again) { again = false; L.schedule(); }
  };

  function runInner() {
    const doc = W.doc, flow = W.el.flow, pagesEl = W.el.pages;
    const G = W.geom();
    const web = doc.view === 'web';

    // --- Auswahl sichern (nur wenn nötig) ---
    let saved, touched = false;
    const had = !!flow.querySelector('[data-cont]');
    const flowFocused = flow.contains(document.activeElement) || document.activeElement === flow;
    saved = W.sel.save(flow);
    if (had) { unsplit(flow); touched = true; }
    if (normalizeFlow(flow)) touched = true;

    W.lists && W.lists.update(flow);

    // --- Fluss-Container ---
    const fam = doc.font ? W.fontStack(doc.font) : '';
    const bs = doc.base || {};
    const bsig = JSON.stringify(bs);
    if (pagesEl._base !== bsig) {
      pagesEl._base = bsig;
      const sv = (k, v) => { if (v == null || v === '') pagesEl.style.removeProperty(k); else pagesEl.style.setProperty(k, v); };
      sv('--base-font', bs.font ? W.fontStack(bs.font) : null); sv('--base-size', bs.size ? bs.size + 'pt' : null);
      sv('--base-after', bs.after != null ? bs.after + 'pt' : null); sv('--base-ls', bs.ls != null ? String(bs.ls) : null);
    }
    if (pagesEl._font !== fam) { pagesEl._font = fam; if (fam) { pagesEl.style.setProperty('--font-body', fam); pagesEl.style.setProperty('--font-head', fam); } else { pagesEl.style.removeProperty('--font-body'); pagesEl.style.removeProperty('--font-head'); } }
    flow.style.hyphens = doc.hyphens ? 'auto' : 'manual';
    flow.style.left = G.ml + 'px';
    flow.style.width = G.cw + 'px';
    const prevTransform = pagesEl.style.transform;
    pagesEl.style.transform = 'none';   // Messungen in ungezoomten Pixeln

    const blocks = Array.from(flow.children);
    const infos = new Map();
    for (const b of blocks) {
      b.setAttribute('data-lay', '');
      b.removeAttribute('data-split');
      b.style.removeProperty('--tal');
      infos.set(b, blockInfo(b));
    }
    const infoOf = (b) => { let i = infos.get(b); if (!i) { b.setAttribute('data-lay', ''); i = blockInfo(b); infos.set(b, i); } return i; };

    // --- Spaltenkonfiguration ---
    let cfg = Object.assign({}, doc.cols);
    const widthsOf = (c) => W.colGeom(c, G.cw).map((x) => x.w);
    const distinct = (arr) => Array.from(new Set(arr.map((v) => Math.round(v * 10) / 10)));

    // Alle Blöcke einmal in der ersten Spaltenbreite messen
    const heights = new Map();     // el -> Map(wKey -> h)
    const hcache = (el) => { let m = heights.get(el); if (!m) { m = new Map(); heights.set(el, m); } return m; };
    const wkey = (w) => Math.round(w * 10) / 10;
    function measureAll(w) {
      for (const b of blocks) setW(infos.get(b), w);
      const vals = blocks.map((b) => hOf(infos.get(b)));
      blocks.forEach((b, i) => hcache(b).set(wkey(w), vals[i]));
    }
    const measured = new Set();
    function ensureMeasured(w) {
      const k = wkey(w);
      if (!measured.has(k)) { measureAll(w); measured.add(k); }
    }
    function heightAt(inf, w) {
      const k = wkey(w);
      const m = hcache(inf.el);
      if (m.has(k)) return m.get(k);
      setW(inf, w);
      const h = hOf(inf);
      m.set(k, h);
      return h;
    }

    const colWidths0 = widthsOf(cfg);
    distinct(colWidths0).forEach(ensureMeasured);

    // --- Simulation ---
    let page = 0;
    let segs = [], si = 0, cur;
    const bottomY = web ? 1e7 : G.ph - G.mb;
    function buildSegs(pg, top) {
      const cg = W.colGeom(cfg, G.cw);
      const obs = web ? [] : obstaclesOn(pg);
      const out = [];
      // Option "Folgeseiten nur breite Spalte": ab Seite 2 wird nur die breiteste Spalte befüllt
      let mainIdx = -1;
      if (cfg.mainOnly && cg.length > 1) mainIdx = cg.reduce((m, c, i) => (c.w > cg[m].w ? i : m), 0);
      cg.forEach((c, ci) => {
        if (mainIdx >= 0 && pg > 0 && ci !== mainIdx) return;
        splitByObstacles(obs, G.ml + c.x, c.w, top, bottomY).forEach((s) => {
          out.push({ page: pg, col: ci, x: s.x, y: s.y, w: s.w, h: s.h, cursor: 0, prevMb: 0, prevKey: null, empty: true, full: s.full });
        });
      });
      return out;
    }
    function newPage(top) { page++; segs = buildSegs(page, top == null ? G.mt : top); si = 0; cur = segs[0]; }
    function nextSeg() {
      si++;
      if (si >= segs.length) { newPage(); return; }
      cur = segs[si];
    }
    function regionEndY() {
      let y = segs.length ? segs[0].y : G.mt;
      for (const s of segs) if (!s.empty) y = Math.max(y, s.y + s.cursor);
      return y;
    }
    segs = buildSegs(0, G.mt); cur = segs[0];

    const placements = [];
    let docStart = true;
    const queue = blocks.slice();
    let guardCount = 0;

    function place(inf, h, gapAbove) {
      const seg = cur;
      const top = seg.cursor + gapAbove;
      placements.push({ inf, page: seg.page, x: seg.x, y: seg.y + top, w: seg.w, bg: cfg.bg && cfg.bg[seg.col] });
      seg.cursor = top + h;
      seg.prevMb = inf.mb;
      seg.prevKey = inf.ctxKey;
      seg.empty = false;
      docStart = false;
    }

    for (let qi = 0; qi < queue.length; qi++) {
      const b = queue[qi];
      const inf = infoOf(b);

      // --- Steuerblöcke ---
      if (inf.brk) {
        const gap = cur.empty ? 0 : cur.prevMb;
        placements.push({ inf, page: cur.page, x: cur.x, y: cur.y + cur.cursor + gap, w: cur.w, control: true });
        if (!web) {
          if (inf.brk === 'page') { newPage(); }
          else if (inf.brk === 'column') {
            const c0 = cur.col, p0 = cur.page;
            do { nextSeg(); } while (cur.page === p0 && cur.col === c0);
          } else if (inf.brk === 'sect' || inf.brk === 'sectnext') {
            const endY = regionEndY();
            cfg = parseCols(b.getAttribute('data-cols'), cfg);
            if (inf.brk === 'sectnext') newPage(); else { segs = buildSegs(page, endY); si = 0; cur = segs[0]; }
            distinct(widthsOf(cfg)).forEach(ensureMeasured);
          }
        } else if (inf.brk === 'sect' || inf.brk === 'sectnext') {
          cfg = parseCols(b.getAttribute('data-cols'), cfg);
        }
        continue;
      }

      guardCount = 0;
      // "Seitenumbruch davor" (Absatzeigenschaft)
      if (inf.pbb && !web && !(cur.empty && si === 0)) newPage();
      for (;;) {
        const seg = cur;
        const h = heightAt(inf, seg.w);
        // "Kein Abstand zwischen Absätzen gleicher Formatvorlage" (Listen)
        const gap = seg.empty ? ((docStart && seg.page === 0) ? inf.mt : 0) : (inf.ctxKey && seg.prevKey === inf.ctxKey ? 0 : seg.prevMb + inf.mt);
        const top = seg.cursor + gap;
        let fits = top + h <= seg.h + 0.5;

        // Überschriften nicht am Spaltenende allein lassen
        if (fits && inf.keep && !seg.empty && qi + 1 < queue.length) {
          const nx = infoOf(queue[qi + 1]);
          if (!nx.brk) {
            const nh = nx.table ? Math.min(60, heightAt(nx, seg.w)) : Math.min(heightAt(nx, seg.w), nx.lh * 2);
            if (top + h + inf.mb + nx.mt + nh > seg.h + 0.5) fits = false;
          }
        }

        if (fits) { place(inf, h, gap); break; }

        // --- Teilen ---
        const avail = seg.h - top;
        if (!web) {
          let tail = null;
          if (!inf.table && avail > 0) {
            setW(inf, seg.w);
            const lineInfo = getLines(b, inf);
            if (lineInfo && lineInfo.lines.length >= 2) {
              const ln = lineInfo.lines;
              const n = ln.length;
              let k = 0;
              while (k < n && ln[k].bottom <= avail + 0.5) k++;
              if (k > 0 && k < n) {
                if (n >= 4) { if (k < 2) k = 0; else if (n - k < 2) k = n - 2; if (k < 2) k = 0; }
                if (k === 0 && seg.empty && seg.full) k = 1;
                if (k > 0 && k < n) {
                  const ySplit = lineInfo.top + (ln[k - 1].bottom + ln[k].top) / 2;
                  const pos = findSplitPos(b, ySplit);
                  if (pos) tail = splitParagraph(b, pos);
                }
              }
            }
          } else if (inf.table && avail > 0) {
            setW(inf, seg.w);
            const trs = Array.from(b.rows);
            if (trs.length >= 2) {
              const tr0 = b.getBoundingClientRect().top;
              let k = 0;
              while (k < trs.length && (trs[k].getBoundingClientRect().bottom - tr0) <= avail + 0.5) k++;
              if (k === 0 && seg.empty && seg.full) k = 1;
              if (k > 0 && k < trs.length) tail = splitTable(b, k);
            }
          }
          if (tail) {
            // Kopf neu messen, Fortsetzung hinten einreihen
            touched = true;
            hcache(b).clear();
            const hh = heightAt(inf, seg.w);
            place(inf, hh, gap);
            queue.splice(qi + 1, 0, tail);
            const tinf = infoOf(tail);
            tinf.mt = 0;
            nextSeg();
            break;
          }
        }

        // Nichts passt: bei leerem, vollem Segment erzwingen, sonst weiter
        if (seg.empty && seg.full) { place(inf, h, gap); break; }
        if (++guardCount > 4) { place(inf, h, gap); break; }
        nextSeg();
      }
    }

    // --- Transformationen anwenden ---
    const lastPage = placements.reduce((m, p) => Math.max(m, p.page), 0);
    let pageCount = lastPage + 1;
    // freie Objekte können spätere Seiten brauchen (nicht bei der Webansicht)
    if (web) pageCount = 1;
    const stride = web ? 0 : G.stride;
    L.pageMap = new WeakMap();
    // 1. Endgültige Breiten setzen und Transformation nullen
    placements.forEach((p) => {
      const el = p.inf.el;
      el.style.setProperty('--lx', '0px');
      el.style.setProperty('--ly', '0px');
      if (!p.control) el.style.setProperty('--lw', Math.max(20, p.w - p.inf.ml - p.inf.mr).toFixed(2) + 'px');
      else el.style.removeProperty('--lw');
    });
    // 2. Nominale Positionen lesen (ein einziges Layout)
    const flowTop = flow.getBoundingClientRect().top;
    const tops = placements.map((p) => p.inf.el.getBoundingClientRect().top - flowTop);
    const hts = web ? placements.map((p) => (p.control ? 0 : p.inf.el.getBoundingClientRect().height)) : null;
    // 3. Transformationen schreiben
    let webBottom = G.mt;
    placements.forEach((p, i) => {
      const el = p.inf.el;
      el.style.setProperty('--lx', (p.x - G.ml).toFixed(2) + 'px');
      el.style.setProperty('--ly', (p.page * stride + p.y - tops[i]).toFixed(2) + 'px');
      L.pageMap.set(el, p.page);
      // Text ohne eigene Farbe wird auf dunklem Spaltenhintergrund automatisch hell dargestellt
      if (!p.control && p.bg && W.color.isDark(p.bg)) el.setAttribute('data-ink', 'light'); else el.removeAttribute('data-ink');
      if (web) webBottom = Math.max(webBottom, p.y + hts[i]);
    });

    // Floats: Seitenindex begrenzen
    if (!web) doc.floats.forEach((f) => { if (f.page > pageCount - 1) f.page = pageCount - 1; });

    updateTabs();
    L.blockH = new WeakMap();
    L.blockCount = flow.children.length;
    placements.forEach((p) => { if (!p.control) L.blockH.set(p.inf.el, hcache(p.inf.el).get(wkey(p.w))); });
    const pageH = web ? Math.max(G.ph, webBottom + G.mb) : G.ph;
    L.info = { pageCount, G, web, pageH, placements: placements.length };
    L.G = G; L.pageH = pageH;
    pagesEl.style.width = G.pw + 'px';
    pagesEl.style.height = (web ? pageH : pageCount * G.stride - G.gap) + 'px';
    pagesEl.style.transform = prevTransform;
    pagesEl.classList.toggle('web', web);

    renderSheets(pageCount, G, pageH);
    W.hf && W.hf.render(pageCount, G);
    W.floats && W.floats.render();
    updateFields();
    if (W.view) W.view.resize();

    if (saved && touched && flowFocused) W.sel.restore(saved, flow);
    W.emit('layout', L.info);
  }

  /* ------------------------------------------------------------------ */
  /*  Tabulatoren: Breite jedes Tabulator-Zeichens bis zum nächsten Stopp */
  /* ------------------------------------------------------------------ */
  function updateTabs() {
    const flow = W.el.flow;
    flow.querySelectorAll('p[data-tabs]').forEach((p) => {
      let stops;
      try { stops = JSON.parse(p.getAttribute('data-tabs')); } catch (e) { return; }
      stops.sort((a, b) => a.p - b.p);
      const spans = Array.from(p.querySelectorAll('.tabc'));
      if (!spans.length) return;
      spans.forEach((s) => { s.style.width = ''; });
      const cs = getComputedStyle(p);
      const cell = p.closest('td,th');
      const originOf = () => {
        if (cell) { const cc = getComputedStyle(cell); return cell.getBoundingClientRect().left + parseFloat(cc.paddingLeft || 0) + parseFloat(cc.borderLeftWidth || 0); }
        return p.getBoundingClientRect().left - (parseFloat(cs.marginLeft) || 0);
      };
      const origin = originOf();
      spans.forEach((s, i) => {
        const x0 = s.getBoundingClientRect().left - origin;
        let stop = stops.find((t) => t.p > x0 + 1);
        if (!stop) { const d = 48; stop = { p: (Math.floor(x0 / d) + 1) * d, a: 'l', l: '' }; }
        // Text hinter dem Tabulator bis zum nächsten Tabulator
        let tw = 0;
        if (stop.a === 'r' || stop.a === 'c') {
          const r = document.createRange();
          r.setStartAfter(s);
          const nx = spans[i + 1];
          if (nx) r.setEndBefore(nx); else r.setEnd(p, p.childNodes.length);
          const rc = r.getClientRects();
          let left = Infinity, right = -Infinity;
          for (const q of rc) { if (q.width > 0) { left = Math.min(left, q.left); right = Math.max(right, q.right); } }
          tw = isFinite(left) ? right - left : 0;
        }
        let w = stop.a === 'r' ? stop.p - x0 - tw : stop.a === 'c' ? stop.p - x0 - tw / 2 : stop.p - x0;
        w = Math.max(0, w);
        s.style.width = w.toFixed(1) + 'px';
        if (stop.l && stop.l !== 'none') s.setAttribute('data-lead', stop.l); else s.removeAttribute('data-lead');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Seiten-Blätter                                                      */
  /* ------------------------------------------------------------------ */
  function renderSheets(n, G, pageH) {
    const host = W.el.sheets, doc = W.doc;
    while (host.children.length > n) host.lastChild.remove();
    while (host.children.length < n) host.appendChild(W.h('div.sheet'));
    const cg = W.colGeom(doc.cols, G.cw);
    for (let i = 0; i < n; i++) {
      const s = host.children[i];
      s.style.top = (W.doc.view === 'web' ? 0 : i * G.stride) + 'px';
      s.style.width = G.pw + 'px';
      s.style.height = pageH + 'px';
      s.style.background = doc.page.color || '#fff';
      // Dekoration neu aufbauen
      let html = '';
      if (doc.cols.n > 1) {
        cg.forEach((c, ci) => {
          const bg = doc.cols.bg && doc.cols.bg[ci];
          if (!bg) return;
          const half = doc.cols.gap / 2;
          let x0 = G.ml + c.x - (ci === 0 ? (doc.cols.bleed ? G.ml : half) : half);
          let x1 = G.ml + c.x + c.w + (ci === cg.length - 1 ? (doc.cols.bleed ? G.mr : half) : half);
          html += `<div class="colbg" style="left:${x0.toFixed(1)}px;width:${(x1 - x0).toFixed(1)}px;background:${bg}"></div>`;
        });
        if (doc.cols.rule) {
          for (let ci = 0; ci < cg.length - 1; ci++) {
            const x = G.ml + cg[ci].x + cg[ci].w + doc.cols.gap / 2;
            html += `<div class="colrule" style="left:${x.toFixed(1)}px;top:${G.mt}px;bottom:${G.mb}px"></div>`;
          }
        }
      }
      const wm = doc.watermark;
      if (wm && wm.text) {
        html += `<div class="wm" style="font-size:${wm.size || 96}px;color:${wm.color || '#c0c0c0'};opacity:${wm.opacity != null ? wm.opacity : 0.45}">${W.esc(wm.text)}</div>`;
      }
      const pb = doc.pageBorder;
      if (pb) {
        const off = pb.offset != null ? pb.offset : 24;
        html += `<div class="pgborder" style="left:${off}px;top:${off}px;right:${off}px;bottom:${off}px;border:${pb.width || 1.5}px ${pb.style || 'solid'} ${pb.color || '#000'}"></div>`;
      }
      if (s._deco !== html) { s.innerHTML = html; s._deco = html; }
    }
  }

  /** Felder im Fließtext (Seitenzahl) aktualisieren */
  function updateFields() {
    W.el.flow.querySelectorAll('.fld').forEach((f) => {
      const kind = f.getAttribute('data-f');
      let top = f; while (top && top.parentNode !== W.el.flow) top = top.parentNode;
      let txt = f.textContent;
      if (kind === 'PAGE') txt = String(((L.pageMap.get(top)) || 0) + 1);
      else if (kind === 'NUMPAGES') txt = String(L.info.pageCount);
      if (f.textContent !== txt) f.textContent = txt;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Serialisierung (ohne Layout-Zustand)                                */
  /* ------------------------------------------------------------------ */
  L.cleanClone = function (flow, opts) {
    const clone = (flow || W.el.flow).cloneNode(true);
    unsplit(clone);
    clone.removeAttribute('style');
    clone.querySelectorAll('[data-lay]').forEach((e) => {
      e.removeAttribute('data-lay');
      LAYOUT_VARS.forEach((v) => e.style.removeProperty(v));
      if (!e.getAttribute('style')) e.removeAttribute('style');
    });
    if (!(opts && opts.keepInk)) clone.querySelectorAll('[data-ink]').forEach((e) => e.removeAttribute('data-ink'));
    clone.querySelectorAll('[data-split]').forEach((e) => { e.removeAttribute('data-split'); e.style.removeProperty('--tal'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
    clone.querySelectorAll('.cell-sel').forEach((e) => e.classList.remove('cell-sel'));
    clone.querySelectorAll('.sel').forEach((e) => { e.classList.remove('sel'); if (!e.getAttribute('class')) e.removeAttribute('class'); });
    clone.querySelectorAll('[data-mark]').forEach((e) => e.removeAttribute('data-mark'));
    return clone;
  };
  L.serialize = function () { return L.cleanClone().innerHTML; };

  /* ------------------------------------------------------------------ */
  /*  Koordinaten                                                         */
  /* ------------------------------------------------------------------ */
  /** Client-Koordinaten → {page, x, y} (Seitenkoordinaten) */
  L.clientToPage = function (cx, cy) {
    const r = W.el.pages.getBoundingClientRect();
    const z = (W.view && W.view.zoom) || 1;
    const G = L.G || W.geom();
    const px = (cx - r.left) / z, py = (cy - r.top) / z;
    if (W.doc.view === 'web') return { page: 0, x: px, y: py };
    let page = Math.floor(py / G.stride);
    page = W.clamp(page, 0, L.info.pageCount - 1);
    return { page, x: px, y: py - page * G.stride };
  };
  L.pageTop = (page) => (W.doc.view === 'web' ? 0 : page * (L.G || W.geom()).stride);
  L.pageOfNode = function (node) {
    const flow = W.el.flow;
    let t = node.nodeType === 1 ? node : node.parentNode;
    while (t && t.parentNode !== flow) t = t.parentNode;
    return t ? (L.pageMap.get(t) || 0) : 0;
  };
})();
