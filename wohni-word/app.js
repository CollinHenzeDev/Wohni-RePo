/* Wohni Word – Editor-Logik */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const doc = $('#doc'), hdr = $('#hdr'), ftr = $('#ftr'), sheet = $('#sheet'), scrollEl = $('#scroll');
  const editors = [doc, hdr, ftr];
  const root = document.documentElement;
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const CM = 37.7953; // px pro cm

  /* ------------------------------------------------------------------ */
  /*  Icons                                                              */
  /* ------------------------------------------------------------------ */
  const ICONS = {
    save: '<path d="M5 3h11l4 4v14H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    saveas: '<path d="M5 3h11l4 4v6M5 3v18h8"/><path d="M8 3v6h8V3"/><path d="M15 21l1-4 5-5 2 2-5 5z"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17v.5"/>',
    new: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M12 12v6M9 15h6"/>',
    open: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    text: '<path d="M5 6h14M5 10h14M5 14h14M5 18h9"/>',
    count: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    paste: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4"/><path d="M9 11h6M9 15h6"/>',
    cut: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L19 3M16 16L5 3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v11a1 1 0 001 1h3"/>',
    brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-4 2-4 4 0 2-1 3-2 4 4 1 8 0 8-4"/>',
    eraser: '<path d="M4 16l9-11 7 6-7 8H8z"/><path d="M8 20h12"/>',
    marker: '<path d="M4 20h6M14 4l6 6-9 9-6-6z"/>',
    ul: '<circle cx="5" cy="7" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="5" cy="17" r="1.3"/><path d="M10 7h10M10 12h10M10 17h10"/>',
    ol: '<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 5.5l1.3-.8V9M4 14h2.5l-2.5 3.5h2.7"/>',
    outdent: '<path d="M4 6h16M12 10h8M12 14h8M4 18h16M8 9l-3 3 3 3"/>',
    indent: '<path d="M4 6h16M12 10h8M12 14h8M4 18h16M4 9l3 3-3 3"/>',
    alignl: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    alignc: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    alignr: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    alignj: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    bucket: '<path d="M5 11l7-7 7 7-7 7z"/><path d="M19 15s2 2.2 2 3.5a2 2 0 01-4 0c0-1.3 2-3.5 2-3.5z"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
    replace: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    select: '<path d="M4 4h16v16H4z" stroke-dasharray="3 2"/>',
    pagebreak: '<path d="M6 3h12v6H6zM6 15h12v6H6z"/><path d="M3 12h3M9 12h2M13 12h2M18 12h3"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    hr: '<path d="M3 12h18"/><path d="M7 6h10M7 18h10" opacity=".4"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    unlink: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/><path d="M4 4l16 16"/>',
    toc: '<path d="M4 6h16M8 10h12M8 14h12M4 18h16"/>',
    header: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 8h16"/><path d="M8 13h8M8 16h8"/>',
    footer: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 16h16"/><path d="M8 8h8M8 11h8"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    omega: '<path d="M4 19h5c-3-2-4-4-4-7a7 7 0 0114 0c0 3-1 5-4 7h5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    spell: '<path d="M3 17l4-11 4 11M4.5 13h5"/><path d="M13 14l3 3 6-7"/>',
    zoomin: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M10 7v6M7 10h6"/>',
    zoomout: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M7 10h6"/>',
    zoom: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
    fit: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>',
    ruler: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v4M10 8v3M14 8v4M18 8v3"/>',
    pilcrow: '<path d="M14 4v16M10 4v16M14 4H9a4 4 0 000 8h1"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    grid: '<rect x="4" y="4" width="16" height="16"/><path d="M4 12h16M12 4v16"/>',
    shape: '<rect x="3" y="11" width="10" height="9" rx="1"/><circle cx="15" cy="8" r="5"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    colbreak: '<rect x="3" y="4" width="7" height="16"/><rect x="14" y="4" width="7" height="16"/><path d="M12 4v16" stroke-dasharray="2 2"/>',
    tofront: '<rect x="3" y="3" width="11" height="11" opacity=".4"/><rect x="10" y="10" width="11" height="11"/>',
    toback: '<rect x="3" y="3" width="11" height="11"/><rect x="10" y="10" width="11" height="11" opacity=".4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  $$('[data-ic]').forEach((el) => { el.insertAdjacentHTML('afterbegin', svg(el.dataset.ic)); });

  /* ------------------------------------------------------------------ */
  /*  Zustand                                                            */
  /* ------------------------------------------------------------------ */
  const defaultSettings = () => ({ w: 11906, h: 16838, top: 1417, right: 1417, bottom: 1417, left: 1417, cols: 1, colMode: 'equal', defaultFont: 'Calibri', defaultSize: 11 });
  let settings = defaultSettings();
  const state = { name: 'Dokument1', handle: null, dirty: false, zoom: 100, loading: false };

  const FONTS = ['Calibri', 'Calibri Light', 'Arial', 'Arial Black', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier New', 'Garamond', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'serif', 'sans-serif', 'monospace'];
  const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

  const fontSel = $('#fontName');
  FONTS.forEach((f) => { const o = document.createElement('option'); o.value = f; o.textContent = f; o.style.fontFamily = `"${f}", Carlito, sans-serif`; fontSel.appendChild(o); });
  // Schriftgrad als Eingabefeld mit Vorschlägen
  const sizeOld = $('#fontSize');
  const sizeInp = document.createElement('input');
  sizeInp.id = 'fontSize'; sizeInp.className = 'sizesel'; sizeInp.setAttribute('list', 'sizeList'); sizeInp.title = 'Schriftgrad'; sizeInp.value = '11'; sizeInp.autocomplete = 'off';
  sizeInp.style.cssText = 'height:28px;border:1px solid var(--line);border-radius:4px;background:var(--chrome2);padding:0 4px;text-align:center';
  const dl = document.createElement('datalist'); dl.id = 'sizeList';
  SIZES.forEach((s) => { const o = document.createElement('option'); o.value = s; dl.appendChild(o); });
  sizeOld.replaceWith(sizeInp); document.body.appendChild(dl);

  /* ------------------------------------------------------------------ */
  /*  Auswahl                                                            */
  /* ------------------------------------------------------------------ */
  let lastRange = null, lastEd = doc;
  const edOf = (n) => { for (; n; n = n.parentNode) if (n === doc || n === hdr || n === ftr) return n; return null; };
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    if (!s.rangeCount) return;
    const ed = edOf(s.anchorNode);
    if (ed) { lastRange = s.getRangeAt(0).cloneRange(); lastEd = ed; schedState(); }
  });
  function restoreSel() {
    const cur = getSelection();
    if (cur.rangeCount && edOf(cur.anchorNode) && edOf(cur.anchorNode) === document.activeElement) { syncRange(); return cur; }
    if (document.activeElement !== lastEd) lastEd.focus({ preventScroll: true });
    if (lastRange && lastEd.contains(lastRange.startContainer) && lastEd.contains(lastRange.endContainer)) {
      const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange);
    } else {
      const r = document.createRange(); r.selectNodeContents(lastEd); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); lastRange = r.cloneRange();
    }
    return getSelection();
  }
  const elOf = (n) => (n && n.nodeType === 3 ? n.parentElement : n);
  const closestIn = (n, sel) => { const e = elOf(n); const c = e && e.closest(sel); return c && lastEd.contains(c) ? c : null; };

  function pathOf(node, rootEl) {
    const p = [];
    while (node && node !== rootEl) { p.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node)); node = node.parentNode; }
    return p;
  }
  function nodeAt(rootEl, path) {
    let n = rootEl;
    for (const i of path) { if (!n.childNodes[i]) break; n = n.childNodes[i]; }
    return n;
  }
  function serSel() {
    const s = getSelection();
    if (!s.rangeCount) return null;
    const ed = edOf(s.anchorNode);
    if (!ed || edOf(s.focusNode) !== ed) return null;
    const r = s.getRangeAt(0);
    return { ed: editors.indexOf(ed), sp: pathOf(r.startContainer, ed), so: r.startOffset, ep: pathOf(r.endContainer, ed), eo: r.endOffset };
  }
  function setSel(o) {
    if (!o) return;
    const ed = editors[o.ed]; if (!ed || ed.hidden) return;
    try {
      const r = document.createRange();
      const sn = nodeAt(ed, o.sp), en = nodeAt(ed, o.ep);
      const lim = (n, off) => Math.min(off, n.nodeType === 3 ? n.nodeValue.length : n.childNodes.length);
      r.setStart(sn, lim(sn, o.so)); r.setEnd(en, lim(en, o.eo));
      ed.focus({ preventScroll: true });
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      lastRange = r.cloneRange(); lastEd = ed;
    } catch (e) { /* Auswahl nicht wiederherstellbar */ }
  }

  /* ------------------------------------------------------------------ */
  /*  Verlauf (Rückgängig/Wiederholen)                                   */
  /* ------------------------------------------------------------------ */
  const hist = { stack: [], idx: -1, timer: null, size: 0 };
  const snapSize = (s) => s.d.length + s.h.length + s.f.length;
  const stripBreakStyles = (h) => h.replace(/(<div class="pagebreak"[^>]*?) style="[^"]*"/g, '$1');
  function snapshot() {
    return { d: stripBreakStyles(doc.innerHTML), h: hdr.innerHTML + (hdr.hidden ? '\u0000hidden' : ''), f: ftr.innerHTML + (ftr.hidden ? '\u0000hidden' : ''), settings: JSON.stringify(settings), sel: serSel() };
  }
  function pushHistory() {
    clearTimeout(hist.timer); hist.timer = null;
    if (!state.loading) normalizeAll();
    const s = snapshot();
    const top = hist.stack[hist.idx];
    if (top && top.d === s.d && top.h === s.h && top.f === s.f && top.settings === s.settings) { top.sel = s.sel || top.sel; return false; }
    for (let i = hist.stack.length - 1; i > hist.idx; i--) hist.size -= snapSize(hist.stack[i]);
    hist.stack.length = hist.idx + 1;
    hist.stack.push(s); hist.idx++; hist.size += snapSize(s);
    while (hist.stack.length > 1 && (hist.stack.length > 300 || hist.size > 80e6)) { hist.size -= snapSize(hist.stack.shift()); hist.idx--; }
    if (!state.loading) setDirty(true);
    updateUndoButtons();
    return true;
  }
  function scheduleHistory(delay) {
    clearTimeout(hist.timer);
    hist.timer = setTimeout(pushHistory, delay == null ? 450 : delay);
  }
  function restoreSnapshot(s) {
    doc.innerHTML = s.d;
    const setHF = (el, v) => { const hid = v.endsWith('\u0000hidden'); el.innerHTML = hid ? v.slice(0, -7) : v; el.hidden = hid; };
    setHF(hdr, s.h); setHF(ftr, s.f);
    settings = JSON.parse(s.settings);
    applySettings(true);
    lastRange = null; hideImgBox(); hideF();
    setSel(s.sel);
    setDirty(true); updateUndoButtons(); schedState(); updateStatsSoon();
  }
  function undo() {
    if (hist.timer) pushHistory();
    if (hist.idx > 0) { hist.idx--; restoreSnapshot(hist.stack[hist.idx]); }
  }
  function redo() {
    if (hist.timer) pushHistory();
    if (hist.idx < hist.stack.length - 1) { hist.idx++; restoreSnapshot(hist.stack[hist.idx]); }
  }
  function updateUndoButtons() {
    $$('[data-cmd="undo"]').forEach((b) => { b.disabled = hist.idx <= 0; });
    $$('[data-cmd="redo"]').forEach((b) => { b.disabled = hist.idx >= hist.stack.length - 1; });
  }
  function setDirty(d) {
    state.dirty = d;
    $('#savestate').textContent = d ? '• ungespeichert' : (state.savedAt ? '✓ gespeichert' : '');
    document.title = (d ? '• ' : '') + state.name + ' – Wohni Word';
  }

  /* ------------------------------------------------------------------ */
  /*  Hilfsfunktionen                                                    */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 3200);
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeHref = (h) => DocxIO.safeHref(h);

  // Chrome erzeugt bei Listen teils ungültiges HTML (<p><ul>, <ul><ul>) – hier wird es repariert
  function normalizeLists(rootEl) {
    let changed = false;
    $$('ul,ol', rootEl).forEach((l) => {
      const p = l.parentElement;
      if (p && /^(P|H[1-6])$/.test(p.tagName)) {
        const after = [];
        for (let n = l.nextSibling; n; n = n.nextSibling) after.push(n);
        p.after(l);
        if (after.some((x) => x.nodeType === 1 || x.nodeValue.trim())) { const np = p.cloneNode(false); after.forEach((x) => np.appendChild(x)); l.after(np); }
        if (!p.childNodes.length || (p.childNodes.length === 1 && p.firstChild.nodeName === 'BR')) p.remove();
        changed = true;
      }
    });
    $$('ul > ul, ul > ol, ol > ul, ol > ol', rootEl).forEach((l) => {
      const prev = l.previousElementSibling;
      if (prev && prev.tagName === 'LI') prev.appendChild(l);
      else { const li = document.createElement('li'); li.style.listStyleType = 'none'; l.before(li); li.appendChild(l); }
      changed = true;
    });
    $$('li > p:only-child', rootEl).forEach((p) => {
      if (p.getAttribute('style') || p.className) return;
      const li = p.parentElement; while (p.firstChild) li.insertBefore(p.firstChild, p); p.remove(); changed = true;
    });
    return changed;
  }
  function normalizeAll() {
    const s = getSelection();
    const a = s.anchorNode, ao = s.anchorOffset, f = s.focusNode, fo = s.focusOffset;
    let ch = false;
    editors.forEach((ed) => { if (!ed.hidden && normalizeLists(ed)) ch = true; });
    if (ch && a && f && a.isConnected && f.isConnected) { try { s.setBaseAndExtent(a, ao, f, fo); } catch (e) { /* egal */ } }
    return ch;
  }
  function syncRange() {
    const s = getSelection();
    if (s.rangeCount && edOf(s.anchorNode)) { lastRange = s.getRangeAt(0).cloneRange(); lastEd = edOf(s.anchorNode); }
  }

  function afterCmd() {
    ensureStructure();
    normalizeAll();
    syncRange();
    pushHistory();
    schedState(); updateStatsSoon(); positionImgBox();
  }
  function exec(cmd, val) {
    restoreSel();
    document.execCommand('styleWithCSS', false, true);
    const ok = document.execCommand(cmd, false, val);
    afterCmd();
    return ok;
  }

  // sorgt dafür, dass Text immer in Absätzen steht und nach Tabellen weitergeschrieben werden kann
  function ensureStructure() {
    if (!doc.firstChild) { doc.innerHTML = '<p><br></p>'; return; }
    let stray = false;
    for (const n of Array.from(doc.childNodes)) {
      if ((n.nodeType === 3 && n.nodeValue.length) || (n.nodeType === 1 && /^(SPAN|B|I|U|S|A|STRONG|EM|FONT|IMG|SUB|SUP|BR|CODE|MARK)$/.test(n.tagName))) { stray = true; break; }
    }
    if (stray) {
      const sel = getSelection(); const keep = doc.contains(sel.anchorNode) ? serSel() : null;
      let cur = null;
      for (const n of Array.from(doc.childNodes)) {
        const inline = (n.nodeType === 3) || (n.nodeType === 1 && /^(SPAN|B|I|U|S|A|STRONG|EM|FONT|IMG|SUB|SUP|BR|CODE|MARK)$/.test(n.tagName));
        if (inline) { if (!cur) { cur = document.createElement('p'); doc.insertBefore(cur, n); } cur.appendChild(n); } else cur = null;
      }
      if (keep) setSel(keep);
    }
    const real = (el, dir) => { while (el && el.classList && el.classList.contains('fobj')) el = el[dir]; return el; };
    const firstReal = real(doc.firstElementChild, 'nextElementSibling');
    if (firstReal && firstReal.tagName === 'TABLE') doc.insertBefore(Object.assign(document.createElement('p'), { innerHTML: '<br>' }), firstReal);
    $$('table', doc).forEach((t) => {
      const nx = real(t.nextElementSibling, 'nextElementSibling');
      if (t.parentNode === doc && (!nx || nx.tagName === 'TABLE')) t.after(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
    });
    [hdr, ftr].forEach((h) => { if (!h.hidden && !h.firstChild) h.innerHTML = '<p><br></p>'; });
  }

  function selectedBlocks() {
    const s = getSelection();
    if (!s.rangeCount) return [];
    const r = s.getRangeAt(0);
    const ed = edOf(r.commonAncestorContainer) || lastEd;
    const cand = Array.from(ed.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote'));
    const firstLeaf = (el) => { let n = el; while (n.firstChild) n = n.firstChild; return n; };
    const out = cand.filter((el) => {
      if (!r.intersectsNode(el)) return false;
      if (el.tagName !== 'LI' && el.querySelector('p,h1,h2,h3,h4,h5,h6,li,blockquote')) return false;
      // Auswahl endet genau am Anfang dieses Blocks → Block nicht mitzählen
      if (!r.collapsed && r.endOffset === 0 && !el.contains(r.startContainer) && (r.endContainer === el || firstLeaf(el) === r.endContainer)) return false;
      return true;
    });
    return out;
  }
  function currentBlock() {
    return closestIn(lastRange && lastRange.startContainer, 'p,h1,h2,h3,h4,h5,h6,li,blockquote,td,th');
  }

  /* ------------------------------------------------------------------ */
  /*  Formatierungsbefehle                                               */
  /* ------------------------------------------------------------------ */
  function setFontSize(pt) {
    pt = parseFloat(String(pt).replace(',', '.'));
    if (!pt || pt < 1 || pt > 1000) return;
    const sel = restoreSel();
    if (!sel.rangeCount) return;
    if (sel.isCollapsed) {
      const span = document.createElement('span');
      span.style.fontSize = pt + 'pt'; span.textContent = '\u200b';
      sel.getRangeAt(0).insertNode(span);
      const nr = document.createRange(); nr.setStart(span.firstChild, 1); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    } else {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      document.execCommand('styleWithCSS', false, true);
      lastEd.querySelectorAll('font[size="7"]').forEach((f) => {
        const sp = document.createElement('span');
        sp.style.fontSize = pt + 'pt';
        while (f.firstChild) sp.appendChild(f.firstChild);
        f.replaceWith(sp);
        sp.querySelectorAll('[style*="font-size"]').forEach((x) => { x.style.fontSize = ''; if (!x.getAttribute('style')) x.removeAttribute('style'); });
      });
    }
    afterCmd();
  }
  function currentFontSizePt() {
    const e = elOf(lastRange ? lastRange.startContainer : doc);
    if (!e) return settings.defaultSize;
    const a = parseFloat(getComputedStyle(e).fontSize), b = parseFloat(getComputedStyle(doc).fontSize);
    return Math.round(settings.defaultSize * a / b * 2) / 2;
  }
  function stepFont(dir) {
    const cur = currentFontSizePt();
    let next;
    if (dir > 0) next = SIZES.find((s) => s > cur + 0.01) || cur + 10;
    else next = [...SIZES].reverse().find((s) => s < cur - 0.01) || Math.max(1, cur - 1);
    setFontSize(next);
  }

  function mapSelectionText(fn) {
    const sel = restoreSel();
    if (!sel.rangeCount || sel.isCollapsed) { toast('Bitte zuerst Text markieren.'); return; }
    const r = sel.getRangeAt(0);
    const w = document.createTreeWalker(r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) if (r.intersectsNode(n)) nodes.push(n);
    if (r.commonAncestorContainer.nodeType === 3 && !nodes.includes(r.commonAncestorContainer)) nodes.push(r.commonAncestorContainer);
    nodes.forEach((n) => {
      const s = n === r.startContainer ? r.startOffset : 0;
      const e = n === r.endContainer ? r.endOffset : n.nodeValue.length;
      if (e > s) n.replaceData(s, e - s, fn(n.nodeValue.slice(s, e)));
    });
    afterCmd();
  }
  const CASE_FN = {
    upper: (t) => t.toLocaleUpperCase('de'),
    lower: (t) => t.toLocaleLowerCase('de'),
    title: (t) => t.toLocaleLowerCase('de').replace(/(^|[\s(\-"„])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('de')),
    sentence: (t) => t.toLocaleLowerCase('de').replace(/(^|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('de')),
    toggle: (t) => Array.from(t).map((c) => (c === c.toLocaleUpperCase('de') ? c.toLocaleLowerCase('de') : c.toLocaleUpperCase('de'))).join(''),
  };

  function applyToBlocks(fn) {
    restoreSel();
    let blocks = selectedBlocks();
    if (!blocks.length) { document.execCommand('formatBlock', false, 'p'); blocks = selectedBlocks(); }
    blocks.forEach(fn);
    afterCmd();
  }

  function paraStyle(name) {
    restoreSel();
    const tag = { normal: 'p', title: 'p', subtitle: 'p', quote: 'p', h1: 'h1', h2: 'h2', h3: 'h3' }[name];
    if (!closestIn(lastRange.startContainer, 'li')) document.execCommand('formatBlock', false, tag);
    selectedBlocks().forEach((b) => {
      b.classList.remove('title', 'subtitle', 'quote');
      if (name === 'title' || name === 'subtitle' || name === 'quote') b.classList.add(name);
      if (name !== 'normal') { b.style.marginLeft = ''; }
      if (!b.getAttribute('class')) b.removeAttribute('class');
      // direkte Formatierung, die den Stil überlagert, entfernen
      if (name !== 'normal' || true) { b.querySelectorAll('[style]').forEach((x) => { x.style.fontSize = ''; x.style.fontFamily = ''; x.style.color = ''; x.style.fontWeight = ''; if (!x.getAttribute('style')) x.removeAttribute('style'); }); }
    });
    afterCmd();
  }

  function toggleList(kind) {
    exec(kind === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  }
  function setListType(type) {
    restoreSel();
    let list = closestIn(lastRange.startContainer, 'ul,ol');
    if (!list) { toggleList(/disc|circle|square/.test(type) ? 'ul' : 'ol'); restoreSel(); list = closestIn(lastRange.startContainer, 'ul,ol'); }
    if (!list) return;
    const wantOl = !/disc|circle|square/.test(type);
    if ((list.tagName === 'OL') !== wantOl) {
      const n = document.createElement(wantOl ? 'ol' : 'ul');
      while (list.firstChild) n.appendChild(list.firstChild);
      Array.from(list.attributes).forEach((a) => n.setAttribute(a.name, a.value));
      list.replaceWith(n); list = n;
      const r = document.createRange(); r.selectNodeContents(list.querySelector('li') || list); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); lastRange = r.cloneRange();
    }
    list.style.listStyleType = type === 'decimal' || type === 'disc' ? '' : type;
    afterCmd();
  }

  function indentMore() {
    restoreSel();
    if (closestIn(lastRange.startContainer, 'li')) { exec('indent'); return; }
    applyToBlocks((b) => { const cur = parseFloat(b.style.marginLeft) || 0; b.style.marginLeft = (cur + 36) + 'pt'; });
  }
  function indentLess() {
    restoreSel();
    if (closestIn(lastRange.startContainer, 'li')) { exec('outdent'); return; }
    applyToBlocks((b) => { const cur = parseFloat(b.style.marginLeft) || 0; const n = Math.max(0, cur - 36); b.style.marginLeft = n ? n + 'pt' : ''; if (!b.getAttribute('style')) b.removeAttribute('style'); });
  }

  function clearFormat() {
    restoreSel();
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    selectedBlocks().forEach((b) => {
      b.removeAttribute('style'); b.classList.remove('title', 'subtitle', 'quote');
      if (!b.getAttribute('class')) b.removeAttribute('class');
      b.querySelectorAll('span[style],font').forEach((s) => { const f = document.createDocumentFragment(); while (s.firstChild) f.appendChild(s.firstChild); s.replaceWith(f); });
    });
    afterCmd();
  }

  /* ---- Format übertragen ---- */
  let painter = null;
  function startPainter() {
    const b = $('#btn-painter');
    if (painter) { painter = null; b.classList.remove('on'); return; }
    restoreSel();
    const e = elOf(lastRange.startContainer);
    const cs = getComputedStyle(e);
    painter = {
      font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: currentFontSizePt(),
      b: parseInt(cs.fontWeight, 10) >= 600, i: cs.fontStyle === 'italic',
      u: /underline/.test(cs.textDecorationLine), s: /line-through/.test(cs.textDecorationLine), color: cs.color,
    };
    b.classList.add('on'); toast('Text markieren, um das Format anzuwenden.');
  }
  document.addEventListener('mouseup', () => {
    if (!painter) return;
    setTimeout(() => {
      const s = getSelection();
      if (!s.rangeCount || s.isCollapsed || !edOf(s.anchorNode)) return;
      const p = painter; painter = null; $('#btn-painter').classList.remove('on');
      restoreSel();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('fontName', false, p.font);
      setFontSize(p.size);
      const st = (c) => document.queryCommandState(c);
      if (st('bold') !== p.b) document.execCommand('bold');
      if (st('italic') !== p.i) document.execCommand('italic');
      if (st('underline') !== p.u) document.execCommand('underline');
      if (st('strikeThrough') !== p.s) document.execCommand('strikeThrough');
      document.execCommand('foreColor', false, p.color);
      afterCmd();
    }, 0);
  });

  /* ------------------------------------------------------------------ */
  /*  Popups & Dialoge                                                   */
  /* ------------------------------------------------------------------ */
  const popup = $('#popup');
  function showPopup(anchor, node) {
    popup.innerHTML = ''; popup.appendChild(node); popup.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = popup.offsetWidth, ph = popup.offsetHeight;
    popup.style.left = Math.max(4, Math.min(r.left, innerWidth - pw - 4)) + 'px';
    popup.style.top = (r.bottom + 4 + ph > innerHeight ? Math.max(4, r.top - ph - 4) : r.bottom + 4) + 'px';
  }
  const closePopup = () => { popup.hidden = true; };
  document.addEventListener('mousedown', (e) => { if (!popup.hidden && !popup.contains(e.target) && !e.target.closest('[data-pop]')) closePopup(); });

  const PALETTE = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
    '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
  ];
  const colorState = { color: '#ff0000', hilite: '#ffff00', shade: '#d9e2f3', cellShade: '#fff2cc', objFill: '#4472c4', objLine: '#2f528f' };
  const colorPick = document.createElement('input'); colorPick.type = 'color'; colorPick.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
  document.body.appendChild(colorPick);
  function applyColor(kind, c) {
    if (c) colorState[kind] = c;
    const ind = { color: '#colorInd', hilite: '#hiliteInd', shade: '#shadeInd', cellShade: '#cellShadeInd', objFill: '#objFillInd', objLine: '#objLineInd' }[kind];
    if (kind === 'objFill' || kind === 'objLine') {
      if (!selF || selF.dataset.kind !== 'shape') { toast('Bitte zuerst eine Form auswählen.'); return; }
      selF.dataset[kind === 'objFill' ? 'fill' : 'stroke'] = c || 'none';
      if (kind === 'objLine' && c && !(+selF.dataset.sw)) { selF.dataset.sw = '2'; $('#fSw').value = '2'; }
      renderShape(selF); pushHistory(); return;
    }
    if (c && ind) $(ind).style.background = c;
    if (kind === 'color') exec('foreColor', c || '#000000');
    else if (kind === 'hilite') exec('hiliteColor', c || 'transparent');
    else if (kind === 'shade') applyToBlocks((b) => { b.style.backgroundColor = c || ''; if (!b.getAttribute('style')) b.removeAttribute('style'); });
    else if (kind === 'cellShade') {
      restoreSel();
      cellsInSelection().forEach((td) => { td.style.backgroundColor = c || ''; if (!td.getAttribute('style')) td.removeAttribute('style'); });
      afterCmd();
    }
  }
  function openPalette(kind, anchor) {
    const box = document.createElement('div');
    const none = { color: 'Automatisch (Schwarz)' }[kind] || 'Keine Farbe';
    box.innerHTML = `<button class="pbtn" data-c="">${none}</button><div class="plabel">Farben</div><div class="pal">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div><button class="pbtn" data-more="1" style="margin-top:6px">Weitere Farben…</button>`;
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.more) {
        colorPick.value = colorState[kind];
        colorPick.oninput = () => applyColor(kind, colorPick.value);
        colorPick.click(); closePopup(); return;
      }
      closePopup(); applyColor(kind, b.dataset.c || null);
    });
    showPopup(anchor, box);
  }

  const modal = $('#modal');
  let closeDialogFn = null;
  function dialog(opts) {
    $('#dtitle').textContent = opts.title;
    const body = $('#dbody'); body.innerHTML = '';
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    const btns = $('#dbtns'); btns.innerHTML = '';
    const buttons = opts.buttons || [{ label: 'Schließen', primary: true }];
    const close = () => { modal.hidden = true; closeDialogFn = null; document.removeEventListener('keydown', onKey, true); if (opts.onClose) opts.onClose(); };
    const run = async (b) => { if (b.action) { const keep = await b.action(body); if (keep === false) return; } close(); };
    buttons.forEach((b) => {
      const el = document.createElement('button'); el.textContent = b.label; if (b.primary) el.className = 'primary';
      el.addEventListener('click', () => run(b)); btns.appendChild(el);
    });
    const primary = buttons.find((b) => b.primary);
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Enter' && primary && !/TEXTAREA|BUTTON|SELECT/.test(e.target.tagName)) { e.preventDefault(); run(primary); }
    }
    document.addEventListener('keydown', onKey, true);
    closeDialogFn = close;
    modal.hidden = false;
    if (opts.onOpen) opts.onOpen(body);
    const f = body.querySelector('input,select'); if (f) { f.focus(); if (f.select) f.select(); }
    return close;
  }
  modal.addEventListener('mousedown', (e) => { if (e.target === modal && closeDialogFn) closeDialogFn(); });

  /* ------------------------------------------------------------------ */
  /*  Seiteneinrichtung / Ansicht                                        */
  /* ------------------------------------------------------------------ */
  const PAGE_NAMES = Object.entries(DocxIO.PAGE_SIZES);
  function applySettings(noHistory) {
    const s = settings;
    const pw = s.w / 15, ph = s.h / 15;
    root.style.setProperty('--pw', pw + 'px'); root.style.setProperty('--ph', ph + 'px');
    root.style.setProperty('--def-font', `"${s.defaultFont}"`);
    root.style.setProperty('--def-size', s.defaultSize + 'pt');
    sheet.style.padding = `${s.top / 15}px ${s.right / 15}px ${s.bottom / 15}px ${s.left / 15}px`;
    const uneq = s.cols === 2 && s.colMode && s.colMode !== 'equal';
    const gap = 708 / 15;
    let c1 = 0;
    if (uneq) {
      const avail = (s.w - s.left - s.right) / 15 - gap;
      c1 = s.colW ? s.colW[0] / 15 : avail * (s.colMode === 'left' ? 0.35 : 0.65);
    }
    doc.classList.toggle('cols-u', !!uneq);
    doc.classList.toggle('cols', s.cols > 1 && !uneq);
    doc.style.columnCount = s.cols > 1 && !uneq ? s.cols : '';
    doc.style.setProperty('--c1w', c1 + 'px'); doc.style.setProperty('--c2x', (c1 + gap) + 'px');
    // Auswahlfelder synchronisieren
    const sizeName = (PAGE_NAMES.find(([, [w, h]]) => (Math.abs(w - s.w) < 30 && Math.abs(h - s.h) < 30) || (Math.abs(h - s.w) < 30 && Math.abs(w - s.h) < 30)) || [''])[0];
    if (sizeName) $('#pageSize').value = sizeName;
    $('#orientation').value = s.w > s.h ? 'landscape' : 'portrait';
    $('#columns').value = uneq ? s.colMode : String(Math.min(3, s.cols));
    const mp = `${s.top},${s.left}`;
    const sel = $('#marginPreset');
    sel.value = Array.from(sel.options).some((o) => o.value === mp) && s.top === s.bottom && s.left === s.right ? mp : 'custom';
    // Druck-Seitenformat
    let ps = $('#pagestyle');
    if (!ps) { ps = document.createElement('style'); ps.id = 'pagestyle'; document.head.appendChild(ps); }
    const mm = (t) => (t / 56.693).toFixed(2) + 'mm';
    ps.textContent = `@page { size: ${(s.w / 56.693).toFixed(1)}mm ${(s.h / 56.693).toFixed(1)}mm; margin: ${mm(s.top)} ${mm(s.right)} ${mm(s.bottom)} ${mm(s.left)}; }`;
    drawRuler(); updatePageCount(); positionImgBox();
    if (!noHistory) pushHistory();
  }
  // Seitenumbrüche im Editor als Abstand darstellen, damit der Text auf der nächsten "Seite" beginnt
  function layoutBreaks() {
    const brs = $$('.pagebreak', doc);
    if (!brs.length) return;
    const ph = settings.h / 15, top = settings.top / 15;
    brs.forEach((b) => { b.style.height = '0px'; });
    sheet.style.minHeight = '';
    const sc = scaleOf();
    brs.forEach((b) => {
      const y = (b.getBoundingClientRect().top - sheet.getBoundingClientRect().top) / sc;
      const target = (Math.floor(y / ph) + 1) * ph + top;
      b.style.height = Math.max(0, Math.round(target - y)) + 'px';
    });
  }
  function updatePageCount() {
    layoutBreaks();
    sheet.style.minHeight = '';
    const ph = settings.h / 15;
    const natural = sheet.offsetHeight;
    const pages = Math.max(1, Math.ceil((natural - 2) / ph));
    sheet.style.minHeight = pages * ph + 'px';
    state.pages = pages;
    updateStats();
  }
  function setZoom(p) {
    p = Math.max(25, Math.min(300, Math.round(p)));
    state.zoom = p;
    root.style.setProperty('--zoom', p / 100);
    $('#zoomRange').value = p; $('#st-zoom').textContent = p + ' %';
    drawRuler(); positionImgBox();
  }
  function drawRuler() {
    const r = $('#ruler'), s = settings, z = state.zoom / 100;
    r.innerHTML = ''; r.style.backgroundImage = 'none';
    const width = s.w / 15;
    r.style.width = width * z + 'px';
    const mk = (cls, css, txt) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); if (txt) d.textContent = txt; r.appendChild(d); };
    mk('m', { left: 0, width: s.left / 15 * z + 'px' });
    mk('m', { right: 0, width: s.right / 15 * z + 'px' });
    const zero = s.left / 15;
    for (let k = -Math.floor(zero / CM); zero + k * CM < width - s.right / 15 + 0.5; k++) {
      const x = (zero + k * CM) * z;
      if (k !== 0) mk('n', { left: x + 'px' }, Math.abs(k));
      mk('', { position: 'absolute', left: x + 'px', bottom: 0, width: '1px', height: '5px', background: '#888' });
      mk('', { position: 'absolute', left: x + CM / 2 * z + 'px', bottom: 0, width: '1px', height: '3px', background: '#aaa' });
    }
  }

  function pageSetupDialog() {
    const s = settings, cm = (t) => (t / 566.93).toFixed(2);
    const sizeName = (PAGE_NAMES.find(([, [w, h]]) => (Math.abs(w - s.w) < 30 && Math.abs(h - s.h) < 30) || (Math.abs(h - s.w) < 30 && Math.abs(w - s.h) < 30)) || ['A4'])[0];
    dialog({
      title: 'Seite einrichten',
      body: `<div class="two"><label>Papierformat<select id="ps-size">${PAGE_NAMES.map(([n]) => `<option${n === sizeName ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Ausrichtung<select id="ps-or"><option value="portrait"${s.w <= s.h ? ' selected' : ''}>Hochformat</option><option value="landscape"${s.w > s.h ? ' selected' : ''}>Querformat</option></select></label></div>
        <div class="two"><label>Oben (cm)<input type="number" step="0.01" min="0" id="ps-t" value="${cm(s.top)}"></label><label>Unten (cm)<input type="number" step="0.01" min="0" id="ps-b" value="${cm(s.bottom)}"></label>
        <label>Links (cm)<input type="number" step="0.01" min="0" id="ps-l" value="${cm(s.left)}"></label><label>Rechts (cm)<input type="number" step="0.01" min="0" id="ps-r" value="${cm(s.right)}"></label></div>
        <label>Spalten<select id="ps-c"><option value="1">1</option><option value="2">2 gleich breit</option><option value="3">3</option><option value="left">2: links schmal</option><option value="right">2: rechts schmal</option></select></label>`,
      onOpen: (b) => { $('#ps-c', b).value = s.cols === 2 && s.colMode && s.colMode !== 'equal' ? s.colMode : String(Math.min(3, s.cols)); },
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, action: (b) => {
          const v = (id) => Math.max(0, Math.round(parseFloat($(id, b).value.replace(',', '.')) * 566.93) || 0);
          const [pw, phh] = DocxIO.PAGE_SIZES[$('#ps-size', b).value];
          const land = $('#ps-or', b).value === 'landscape';
          Object.assign(settings, { w: land ? phh : pw, h: land ? pw : phh, top: v('#ps-t'), bottom: v('#ps-b'), left: v('#ps-l'), right: v('#ps-r') });
          const cv = $('#ps-c', b).value;
          if (cv === 'left' || cv === 'right') Object.assign(settings, { cols: 2, colMode: cv, colW: null }); else Object.assign(settings, { cols: parseInt(cv, 10), colMode: 'equal', colW: null });
          if (settings.left + settings.right > settings.w - 600 || settings.top + settings.bottom > settings.h - 600) { toast('Ränder zu groß.'); return false; }
          applySettings();
        },
      }],
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Tabellen                                                           */
  /* ------------------------------------------------------------------ */
  function tableGrid(table) {
    const g = [];
    Array.from(table.rows).forEach((row, r) => {
      g[r] = g[r] || [];
      let c = 0;
      Array.from(row.cells).forEach((cell) => {
        while (g[r][c]) c++;
        for (let i = 0; i < cell.rowSpan; i++) { g[r + i] = g[r + i] || []; for (let j = 0; j < cell.colSpan; j++) g[r + i][c + j] = cell; }
        c += cell.colSpan;
      });
    });
    return g;
  }
  function cellPos(table, cell) {
    const g = tableGrid(table);
    for (let r = 0; r < g.length; r++) for (let c = 0; c < (g[r] || []).length; c++) if (g[r][c] === cell) return { r, c, g };
    return null;
  }
  const newCell = (tag) => { const td = document.createElement(tag || 'td'); td.innerHTML = '<p><br></p>'; return td; };
  function currentCell() { return closestIn(lastRange && lastRange.startContainer, 'td,th'); }
  function cellsInSelection() {
    const s = getSelection();
    if (!s.rangeCount) return [];
    const r = s.getRangeAt(0);
    const cells = $$('td,th', lastEd).filter((c) => r.intersectsNode(c));
    if (cells.length) return cells;
    const c = currentCell(); return c ? [c] : [];
  }
  function insertTable(rows, cols) {
    restoreSel();
    const bodyW = (settings.w - settings.left - settings.right) / 15;
    let h = '<table data-new="1" style="width:100%"><colgroup>' + `<col style="width:${(100 / cols).toFixed(3)}%">`.repeat(cols) + '</colgroup><tbody>';
    for (let r = 0; r < rows; r++) { h += '<tr>' + '<td><p><br></p></td>'.repeat(cols) + '</tr>'; }
    h += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, h);
    const t = lastEd.querySelector('table[data-new]');
    if (t) {
      t.removeAttribute('data-new');
      ensureStructure();
      const c = t.querySelector('td p') || t.querySelector('td');
      const r = document.createRange(); r.selectNodeContents(c); r.collapse(true);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    afterCmd();
    void bodyW;
  }
  function tableOp(op) {
    restoreSel();
    const cell = currentCell();
    const table = cell && cell.closest('table');
    if (!cell || !table) { toast('Bitte zuerst in eine Tabelle klicken.'); return; }
    const pos = cellPos(table, cell);
    const g = pos.g;
    const rowCount = g.length, colCount = Math.max(...g.map((r) => r.length));
    const tbody = table.tBodies[0] || table;
    const startCol = (row, cellEl) => { const gg = tableGrid(table); for (let c = 0; c < gg[row].length; c++) if (gg[row][c] === cellEl) return c; return -1; };
    if (op === 'rowAbove' || op === 'rowBelow') {
      const line = op === 'rowAbove' ? pos.r : pos.r + cell.rowSpan;
      const tr = document.createElement('tr');
      const seen = new Set();
      for (let c = 0; c < colCount; c++) {
        const above = g[line - 1] && g[line - 1][c], below = g[line] && g[line][c];
        if (above && below && above === below) { if (!seen.has(above)) { seen.add(above); above.rowSpan++; } c += above.colSpan - 1; continue; }
        tr.appendChild(newCell());
      }
      const ref = table.rows[line];
      if (ref) ref.parentNode.insertBefore(tr, ref); else tbody.appendChild(tr);
    } else if (op === 'colLeft' || op === 'colRight') {
      const line = op === 'colLeft' ? pos.c : pos.c + cell.colSpan;
      const seen = new Set();
      for (let r = 0; r < rowCount; r++) {
        const left = g[r][line - 1], right = g[r][line];
        if (left && right && left === right) { if (!seen.has(left)) { seen.add(left); left.colSpan++; } continue; }
        if (g[r][line] && cellPos && tableGrid(table)[r][line] && startRowOf(table, g[r][line]) < r) continue; // von oben herunterreichende Zelle
        const row = table.rows[r];
        const nc = newCell(cell.tagName.toLowerCase());
        const gg = tableGrid(table);
        let ref = null;
        for (const ce of Array.from(row.cells)) { let c0 = -1; for (let c = 0; c < gg[r].length; c++) if (gg[r][c] === ce) { c0 = c; break; } if (c0 >= line) { ref = ce; break; } }
        row.insertBefore(nc, ref);
      }
    } else if (op === 'delRow') {
      if (rowCount <= 1) { table.remove(); }
      else {
        const r = pos.r;
        const row = table.rows[r];
        const moved = [];
        Array.from(row.cells).forEach((ce) => { if (ce.rowSpan > 1) moved.push(ce); });
        for (let c = 0; c < g[r].length; c++) { const ce = g[r][c]; if (ce && !row.contains(ce)) { /* beginnt in Zeile darüber */ if (!ce.__dec) { ce.__dec = 1; ce.rowSpan = Math.max(1, ce.rowSpan - 1); } } }
        $$('td,th', table).forEach((x) => { delete x.__dec; });
        const next = table.rows[r + 1];
        moved.forEach((ce) => {
          ce.rowSpan = Math.max(1, ce.rowSpan - 1);
          if (next) {
            const gg = tableGrid(table);
            const c0 = (() => { for (let c = 0; c < gg[r].length; c++) if (gg[r][c] === ce) return c; return 0; })();
            let ref = null;
            for (const ne of Array.from(next.cells)) { let n0 = -1; for (let c = 0; c < gg[r + 1].length; c++) if (gg[r + 1][c] === ne) { n0 = c; break; } if (n0 > c0) { ref = ne; break; } }
            next.insertBefore(ce, ref);
          }
        });
        row.remove();
      }
    } else if (op === 'delCol') {
      if (colCount <= 1) table.remove();
      else {
        const seen = new Set();
        for (let r = 0; r < rowCount; r++) {
          const ce = g[r][pos.c]; if (!ce || seen.has(ce)) continue; seen.add(ce);
          if (ce.colSpan > 1) ce.colSpan--; else ce.remove();
        }
        $$('tr', table).forEach((tr) => { if (!tr.cells.length) tr.remove(); });
      }
    } else if (op === 'delTable') {
      table.remove();
    } else if (op === 'mergeRight') {
      const next = g[pos.r][pos.c + cell.colSpan];
      if (!next || next.rowSpan !== cell.rowSpan || cellPos(table, next).r !== pos.r) { toast('Rechts ist keine passende Zelle zum Verbinden.'); return; }
      if (next.textContent.trim() || next.querySelector('img')) { Array.from(next.childNodes).forEach((n) => { if (!(n.nodeName === 'P' && !n.textContent && !n.querySelector('img'))) cell.appendChild(n); }); }
      cell.colSpan += next.colSpan; next.remove();
    } else if (op === 'mergeDown') {
      const below = g[pos.r + cell.rowSpan] && g[pos.r + cell.rowSpan][pos.c];
      if (!below || below.colSpan !== cell.colSpan || cellPos(table, below).c !== pos.c) { toast('Darunter ist keine passende Zelle zum Verbinden.'); return; }
      if (below.textContent.trim() || below.querySelector('img')) { Array.from(below.childNodes).forEach((n) => { if (!(n.nodeName === 'P' && !n.textContent && !n.querySelector('img'))) cell.appendChild(n); }); }
      cell.rowSpan += below.rowSpan; below.remove();
    } else if (op === 'splitCell') {
      if (cell.colSpan > 1) {
        cell.colSpan--; cell.after(newCell(cell.tagName.toLowerCase()));
      } else if (cell.rowSpan > 1) {
        const rs = cell.rowSpan; cell.rowSpan = rs - 1;
        const r2 = pos.r + rs - 1, row = table.rows[r2];
        const gg = tableGrid(table);
        let ref = null;
        for (const ce of Array.from(row.cells)) { let c0 = -1; for (let c = 0; c < gg[r2].length; c++) if (gg[r2][c] === ce) { c0 = c; break; } if (c0 > pos.c) { ref = ce; break; } }
        row.insertBefore(newCell(), ref);
      } else { toast('Diese Zelle ist nicht verbunden.'); return; }
    } else if (op === 'tblBorders') {
      table.classList.toggle('noborder');
    } else if (op === 'tblAutoFit') {
      table.style.width = ''; $$('col', table).forEach((c) => { c.style.width = ''; }); $$('td,th', table).forEach((c) => { c.style.width = ''; });
    }
    void startCol;
    if (op === 'colLeft' || op === 'colRight' || op === 'delCol') refitCols(table);
    afterCmd();
  }
  // Spaltenbreiten (colgroup) nach dem Einfügen/Löschen von Spalten neu verteilen
  function refitCols(table) {
    if (!table.isConnected) return;
    const cg = table.querySelector('colgroup');
    if (!cg) return;
    const n = Math.max(...tableGrid(table).map((r) => r.length));
    const cols = Array.from(cg.children);
    const unit = (cols[0] && /%/.test(cols[0].style.width)) ? '%' : 'px';
    let total = cols.reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0);
    if (!total) { cg.remove(); return; }
    cg.innerHTML = '';
    for (let i = 0; i < n; i++) { const c = document.createElement('col'); c.style.width = (total / n).toFixed(unit === '%' ? 3 : 0) + unit; cg.appendChild(c); }
  }
  function startRowOf(table, cell) { const p = cellPos(table, cell); return p ? p.r : 0; }

  /* ------------------------------------------------------------------ */
  /*  Bilder                                                             */
  /* ------------------------------------------------------------------ */
  function readAsDataUrl(file) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }
  async function prepareImage(file) {
    let url = await readAsDataUrl(file);
    if (/svg|gif/.test(file.type)) return url;
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const maxW = 1800;
      if (img.naturalWidth > maxW) {
        const c = document.createElement('canvas'); c.width = maxW; c.height = Math.round(img.naturalHeight * maxW / img.naturalWidth);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        url = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
      }
    } catch (e) { /* Original behalten */ }
    return url;
  }
  async function insertImageFile(file) {
    if (!/^image\//.test(file.type)) { toast('Das ist keine Bilddatei.'); return; }
    const url = await prepareImage(file);
    restoreSel();
    document.execCommand('insertHTML', false, `<img src="${url}" alt="${esc(file.name || '')}" style="max-width:100%">`);
    afterCmd();
  }

  let selImg = null;
  const imgbox = $('#imgbox');
  function hideImgBox() { const had = !!selImg; if (selImg) { selImg.classList.remove('selimg'); if (!selImg.getAttribute('class')) selImg.removeAttribute('class'); } selImg = null; imgbox.hidden = true; if (had) refreshObjUi(); }
  function scaleOf() { return sheet.getBoundingClientRect().width / sheet.offsetWidth || 1; }
  function positionImgBox() {
    if (!selImg || !selImg.isConnected) { hideImgBox(); return; }
    const sc = scaleOf(), sr = sheet.getBoundingClientRect(), ir = selImg.getBoundingClientRect();
    imgbox.hidden = false;
    imgbox.style.left = (ir.left - sr.left) / sc - 2 + 'px'; imgbox.style.top = (ir.top - sr.top) / sc - 2 + 'px';
    imgbox.style.width = ir.width / sc + 4 + 'px'; imgbox.style.height = ir.height / sc + 4 + 'px';
  }
  function selectImg(img) {
    if (selF) { selF = null; fbox.hidden = true; }
    if (selImg && selImg !== img) selImg.classList.remove('selimg');
    selImg = img; img.classList.add('selimg'); positionImgBox(); refreshObjUi();
  }
  doc.addEventListener('click', (e) => {
    const fo = e.target.closest && e.target.closest('.fobj');
    if (fo) selectF(fo);
    else if (e.target.tagName === 'IMG') selectImg(e.target);
    else { hideImgBox(); hideF(); }
    const a = e.target.closest('a');
    if (a && (e.ctrlKey || e.metaKey)) {
      const h = a.getAttribute('href') || '';
      if (h[0] === '#') { const t = doc.querySelector('[id="' + CSS.escape(h.slice(1)) + '"]'); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      else if (safeHref(h)) window.open(h, '_blank', 'noopener');
      e.preventDefault();
    }
  });
  doc.addEventListener('mouseover', (e) => { const a = e.target.closest && e.target.closest('a'); if (a && !a.title) a.title = (a.getAttribute('href') || '') + '\nStrg+Klick zum Öffnen'; });
  $('#imghandle').addEventListener('pointerdown', (e) => {
    if (!selImg) return;
    e.preventDefault(); e.target.setPointerCapture(e.pointerId);
    const sc = scaleOf(), startX = e.clientX, startW = selImg.getBoundingClientRect().width / sc;
    const move = (ev) => {
      const w = Math.max(16, startW + (ev.clientX - startX) / sc);
      selImg.removeAttribute('width'); selImg.removeAttribute('height');
      selImg.style.width = Math.round(w) + 'px'; selImg.style.height = 'auto'; selImg.style.maxWidth = '100%';
      positionImgBox();
    };
    const up = () => { e.target.removeEventListener('pointermove', move); e.target.removeEventListener('pointerup', up); pushHistory(); };
    e.target.addEventListener('pointermove', move); e.target.addEventListener('pointerup', up);
  });
  $('#imgbar').addEventListener('mousedown', (e) => e.preventDefault());
  $('#imgbar').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !selImg) return;
    const v = b.dataset.img;
    if (/^\d+$/.test(v)) {
      const maxW = (settings.w - settings.left - settings.right) / 15;
      const nat = selImg.naturalWidth || selImg.width;
      selImg.style.maxWidth = '100%'; selImg.style.height = 'auto';
      selImg.style.width = v === '100' && nat ? Math.min(nat, maxW) + 'px' : (maxW * parseInt(v, 10) / 100) + 'px';
      selImg.removeAttribute('width'); selImg.removeAttribute('height');
    } else if (v === 'left' || v === 'center' || v === 'right') {
      const blk = selImg.closest('p,li,td,th,h1,h2,h3,div') || selImg.parentElement; blk.style.textAlign = v === 'left' ? '' : v;
      if (!blk.getAttribute('style')) blk.removeAttribute('style');
    } else if (v === 'alt') {
      const a = prompt('Alternativtext für das Bild:', selImg.getAttribute('alt') || '');
      if (a !== null) selImg.setAttribute('alt', a);
    } else if (v === 'behind') {
      makeFloating(selImg, 'behind'); return;
    } else if (v === 'del') {
      const im = selImg; hideImgBox(); im.remove();
    }
    pushHistory(); positionImgBox();
  });

  /* ------------------------------------------------------------------ */
  /*  Schwebende Objekte: Formen und Bilder vor/hinter dem Text           */
  /* ------------------------------------------------------------------ */
  const fbox = $('#fbox');
  let selF = null;
  const SHAPES = [['rect', 'Rechteck'], ['roundrect', 'Abgerundetes Rechteck'], ['ellipse', 'Ellipse / Kreis'], ['triangle', 'Dreieck'], ['line', 'Linie']];
  const sheetW = () => settings.w / 15;
  function shapeSvg(el, forImage) {
    const k = el.dataset.shape, fill = el.dataset.fill || 'none', stroke = el.dataset.stroke || 'none', sw = parseFloat(el.dataset.sw) || 0, op = el.dataset.op || '1';
    const a = `fill="${fill}" fill-opacity="${op}" stroke="${sw ? stroke : 'none'}" stroke-opacity="${op}" stroke-width="${sw}" vector-effect="non-scaling-stroke"`;
    let body;
    if (k === 'ellipse') body = `<ellipse cx="50" cy="50" rx="50" ry="50" ${a}/>`;
    else if (k === 'triangle') body = `<polygon points="50,0 100,100 0,100" ${a}/>`;
    else if (k === 'line') body = `<line x1="0" y1="50" x2="100" y2="50" fill="none" stroke="${stroke}" stroke-opacity="${op}" stroke-width="${sw || 3}" vector-effect="non-scaling-stroke"/>`;
    else body = `<rect x="0" y="0" width="100" height="100" ${k === 'roundrect' ? 'rx="10" ry="10"' : ''} ${a}/>`;
    const dim = forImage ? `xmlns="http://www.w3.org/2000/svg" width="${forImage.w}" height="${forImage.h}"` : 'width="100%" height="100%"';
    return `<svg ${dim} viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible;display:block">${body}</svg>`;
  }
  function renderShape(el) { if (el.dataset.kind === 'shape') el.innerHTML = shapeSvg(el); }
  function applyWrap(el, mode) {
    el.dataset.wrap = mode;
    const z = parseInt(el.dataset.z, 10) || 0;
    el.style.zIndex = String(mode === 'behind' ? -2000 + z : 10 + z);
  }
  const allF = () => $$('.fobj', doc);
  const nextZ = () => allF().reduce((m, f) => Math.max(m, parseInt(f.dataset.z, 10) || 0), 0) + 1;
  function setBox(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px';
  }
  function newFobj(attrs, x, y, w, h, mode) {
    const el = document.createElement('div');
    el.className = 'fobj'; el.setAttribute('contenteditable', 'false');
    Object.entries(attrs).forEach(([k, v]) => { el.dataset[k] = v; });
    el.dataset.z = nextZ();
    setBox(el, x, y, w, h); applyWrap(el, mode);
    return el;
  }
  function caretPagePos() {
    let y = settings.top / 15, x = settings.left / 15;
    try {
      const r = lastRange && lastEd === doc ? lastRange : null;
      const rect = r && (r.getClientRects()[0] || elOf(r.startContainer).getBoundingClientRect());
      if (rect) { y = (rect.top - sheet.getBoundingClientRect().top) / scaleOf(); }
    } catch (e) { /* Standardposition */ }
    return { x, y: Math.max(0, y) };
  }
  function insertShape(kind) {
    const pos = caretPagePos();
    const w = kind === 'line' ? 200 : 180, h = kind === 'line' ? 12 : (kind === 'ellipse' ? 180 : 110);
    const el = newFobj({ kind: 'shape', shape: kind, fill: kind === 'line' ? 'none' : colorState.objFill, stroke: colorState.objLine, sw: kind === 'line' ? 3 : 2, op: 1 }, pos.x, pos.y, w, h, 'front');
    doc.insertBefore(el, doc.firstChild);
    renderShape(el);
    pushHistory(); selectF(el);
    toast('Form eingefügt. Im Reiter „Objektformat“ kannst du sie hinter den Text legen.', 5000);
  }
  function openShapes() {
    const anchor = $('[data-cmd="shapes"]');
    const box = document.createElement('div');
    box.innerHTML = SHAPES.map(([k, n]) => `<button class="pbtn" data-shape="${k}">${n}</button>`).join('');
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-shape]'); if (b) { closePopup(); insertShape(b.dataset.shape); } });
    showPopup(anchor, box);
  }
  function hideF() { if (selF) { selF = null; } fbox.hidden = true; refreshObjUi(); }
  function positionF() {
    if (!selF || !selF.isConnected) { hideF(); return; }
    fbox.hidden = false;
    fbox.style.left = selF.style.left; fbox.style.top = selF.style.top; fbox.style.width = selF.style.width; fbox.style.height = selF.style.height;
    const wrap = selF.dataset.wrap;
    $$('#fbar [data-fo]').forEach((b) => b.classList.toggle('on', b.dataset.fo === wrap));
  }
  function selectF(el) {
    hideImgBox(); selF = el; positionF(); refreshObjUi();
  }
  const cm = (px) => (px / CM).toFixed(2);
  function refreshObjUi() {
    const obj = selF || selImg;
    document.body.classList.toggle('has-obj', !!obj);
    if (!obj) { if ($('#tab-format').classList.contains('active')) showTab('home'); return; }
    $('#fWrap').value = selF ? selF.dataset.wrap : 'inline';
    const isShape = selF && selF.dataset.kind === 'shape';
    $$('#shapeGroup select, #shapeGroup button').forEach((b) => { b.disabled = !isShape; });
    if (isShape) { $('#fSw').value = String(parseFloat(selF.dataset.sw) || 0); $('#fOp').value = selF.dataset.op || '1'; $('#objFillInd').style.background = selF.dataset.fill && selF.dataset.fill !== 'none' ? selF.dataset.fill : '#fff'; $('#objLineInd').style.background = selF.dataset.stroke || '#000'; }
    ['fX', 'fY', 'fW', 'fH'].forEach((id) => { $('#' + id).disabled = !selF; });
    if (selF) {
      $('#fX').value = cm(parseFloat(selF.style.left)); $('#fY').value = cm(parseFloat(selF.style.top));
      $('#fW').value = cm(parseFloat(selF.style.width)); $('#fH').value = cm(parseFloat(selF.style.height));
    } else if (selImg) { $('#fW').value = cm(selImg.getBoundingClientRect().width / scaleOf()); $('#fH').value = cm(selImg.getBoundingClientRect().height / scaleOf()); }
  }
  function setWrap(mode) {
    if (selF) {
      if (mode === 'inline') { makeInline(selF); return; }
      applyWrap(selF, mode); pushHistory(); positionF(); refreshObjUi();
    } else if (selImg && mode !== 'inline') makeFloating(selImg, mode);
  }
  function makeFloating(img, mode) {
    const ir = img.getBoundingClientRect(), sr = sheet.getBoundingClientRect(), sc = scaleOf();
    const x = (ir.left - sr.left) / sc, y = (ir.top - sr.top) / sc, w = ir.width / sc, h = ir.height / sc;
    const f = newFobj({ kind: 'img' }, x, y, w, h, mode);
    const im = img.cloneNode(false);
    im.removeAttribute('style'); im.removeAttribute('width'); im.removeAttribute('height'); im.removeAttribute('class');
    f.appendChild(im);
    const par = img.parentNode;
    hideImgBox();
    img.remove();
    if (par && par !== doc && !par.textContent && !par.querySelector('img,br')) par.innerHTML = '<br>';
    doc.insertBefore(f, doc.firstChild);
    ensureStructure(); pushHistory(); selectF(f); updatePageCount();
    if (mode === 'behind') toast('Bild liegt hinter dem Text. Auswählen: Alt+Klick auf das Bild oder Einfügen → Objekte auswählen.', 6000);
  }
  function makeInline(f) {
    const im = f.querySelector('img');
    if (!im) { toast('Formen können nur vor oder hinter dem Text stehen.'); return; }
    const w = parseFloat(f.style.width);
    const n = im.cloneNode(false);
    n.style.width = Math.round(w) + 'px'; n.style.height = 'auto'; n.style.maxWidth = '100%';
    // in den Absatz einfügen, der an der Position des Bildes liegt
    const sr = sheet.getBoundingClientRect(), sc = scaleOf(), y = parseFloat(f.style.top);
    let host = null;
    for (const b of Array.from(doc.children)) { if (b.classList.contains('fobj') || b.classList.contains('colbreak') || b.classList.contains('pagebreak')) continue; if ((b.getBoundingClientRect().top - sr.top) / sc <= y + 1) host = b; else break; }
    if (!host || !/^(P|H[1-6])$/.test(host.tagName)) host = Array.from(doc.children).find((b) => /^(P|H[1-6])$/.test(b.tagName));
    if (!host) { host = document.createElement('p'); doc.appendChild(host); }
    if (host.childNodes.length === 1 && host.firstChild.nodeName === 'BR') host.innerHTML = '';
    host.insertBefore(n, host.firstChild);
    f.remove(); hideF();
    pushHistory(); updatePageCount(); selectImg(n);
  }
  function zOrder(dir) {
    if (!selF) return;
    const zs = allF().map((f) => parseInt(f.dataset.z, 10) || 0);
    selF.dataset.z = dir > 0 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
    applyWrap(selF, selF.dataset.wrap); pushHistory();
  }
  function objDelete() { if (selF) { const f = selF; hideF(); f.remove(); pushHistory(); } else if (selImg) { const im = selImg; hideImgBox(); im.remove(); pushHistory(); } }
  function objDuplicate() {
    if (!selF) return;
    const c = selF.cloneNode(true); c.dataset.z = nextZ(); applyWrap(c, c.dataset.wrap);
    c.style.left = parseFloat(c.style.left) + 16 + 'px'; c.style.top = parseFloat(c.style.top) + 16 + 'px';
    doc.insertBefore(c, doc.firstChild); pushHistory(); selectF(c);
  }
  function alignObj(how) {
    if (!selF) return;
    const W = sheetW(), H = settings.h / 15, w = parseFloat(selF.style.width), h = parseFloat(selF.style.height);
    let x = parseFloat(selF.style.left), y = parseFloat(selF.style.top);
    if (how === 'l') x = 0; if (how === 'r') x = W - w; if (how === 'c') x = (W - w) / 2;
    if (how === 't') y = 0; if (how === 'm') y = (H - h) / 2;
    if (how === 'b') { const k = Math.floor(y / H); y = (k + 1) * H - h; }
    if (how === 'w') { x = 0; selF.style.width = W + 'px'; }
    selF.style.left = Math.round(x) + 'px'; selF.style.top = Math.round(y) + 'px';
    pushHistory(); positionF(); refreshObjUi();
  }
  function objListDialog() {
    const fs = allF();
    const imgs = $$('img', doc).filter((i) => !i.closest('.fobj'));
    if (!fs.length && !imgs.length) { toast('Es gibt noch keine Formen oder Bilder.'); return; }
    const wrapName = { behind: 'hinter dem Text', front: 'vor dem Text' };
    const box = document.createElement('div');
    box.innerHTML = fs.map((f, i) => `<button class="pbtn" data-i="${i}">${f.dataset.kind === 'shape' ? (SHAPES.find((s) => s[0] === f.dataset.shape) || ['', 'Form'])[1] : 'Bild'} ${i + 1} (${wrapName[f.dataset.wrap]})</button>`).join('') +
      imgs.map((im, i) => `<button class="pbtn" data-img="${i}">Bild in Zeile ${i + 1}</button>`).join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.i != null) selectF(fs[+b.dataset.i]); else selectImg(imgs[+b.dataset.img]);
      const t = selF || selImg; if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (closeDialogFn) closeDialogFn();
    });
    dialog({ title: 'Objekte auswählen', body: box });
  }
  // Ziehen und Skalieren
  function dragStart(e, kind, handle) {
    if (!selF) return;
    e.preventDefault(); e.stopPropagation();
    const f = selF, sc = scaleOf(), sx = e.clientX, sy = e.clientY;
    const x0 = parseFloat(f.style.left), y0 = parseFloat(f.style.top), w0 = parseFloat(f.style.width), h0 = parseFloat(f.style.height);
    const keep = f.dataset.kind === 'img';
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    const move = (ev) => {
      const dx = (ev.clientX - sx) / sc, dy = (ev.clientY - sy) / sc;
      if (kind === 'move') { setBox(f, Math.max(-w0 + 20, Math.min(sheetW() - 20, x0 + dx)), Math.max(-h0 + 20, y0 + dy), w0, h0); }
      else {
        let x = x0, y = y0, w = w0, h = h0;
        if (handle.includes('e')) w = w0 + dx; if (handle.includes('w')) { w = w0 - dx; x = x0 + dx; }
        if (handle.includes('s')) h = h0 + dy; if (handle.includes('n')) { h = h0 - dy; y = y0 + dy; }
        if (keep && w0 && h0) { const r = w0 / h0; if (Math.abs(w - w0) >= Math.abs(h - h0) * r) h = w / r; else w = h * r; if (handle.includes('w')) x = x0 + w0 - w; if (handle.includes('n')) y = y0 + h0 - h; }
        if (w < 8) { w = 8; x = handle.includes('w') ? x0 + w0 - 8 : x0; } if (h < 4) { h = 4; y = handle.includes('n') ? y0 + h0 - 4 : y0; }
        setBox(f, x, y, w, h);
      }
      positionF();
    };
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); pushHistory(); refreshObjUi(); updatePageCount(); };
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', up);
  }
  $$('#fbox .fh').forEach((h) => h.addEventListener('pointerdown', (e) => dragStart(e, 'resize', h.dataset.h)));
  $('#fgrip').addEventListener('pointerdown', (e) => dragStart(e, 'move'));
  doc.addEventListener('pointerdown', (e) => {
    const f = e.target.closest && e.target.closest('.fobj');
    if (f && f.dataset.wrap !== 'behind') { selectF(f); dragStart(Object.assign(e, { currentTarget: f }), 'move'); }
  });
  $('#fbar').addEventListener('mousedown', (e) => e.preventDefault());
  $('#fbar').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fo === 'del') objDelete(); else setWrap(b.dataset.fo);
  });
  // Alt+Klick wählt auch Objekte, die hinter dem Text liegen
  sheet.addEventListener('mousedown', (e) => {
    if (!e.altKey) return;
    const hits = allF().filter((f) => { const r = f.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    if (!hits.length) return;
    hits.sort((a, b) => (+b.style.zIndex) - (+a.style.zIndex));
    e.preventDefault(); e.stopPropagation(); selectF(hits[0]);
  }, true);
  $('#fWrap').addEventListener('change', (e) => setWrap(e.target.value));
  $('#fSw').addEventListener('change', (e) => { if (selF) { selF.dataset.sw = e.target.value; renderShape(selF); pushHistory(); } });
  $('#fOp').addEventListener('change', (e) => { if (selF) { selF.dataset.op = e.target.value; renderShape(selF); pushHistory(); } });
  ['fX', 'fY', 'fW', 'fH'].forEach((id) => $('#' + id).addEventListener('change', (e) => {
    if (!selF) return;
    const v = parseFloat(e.target.value.replace(',', '.')); if (isNaN(v)) return;
    const px = v * CM;
    if (id === 'fX') selF.style.left = Math.round(px) + 'px';
    if (id === 'fY') selF.style.top = Math.round(px) + 'px';
    if (id === 'fW' && px >= 4) { const r = selF.dataset.kind === 'img' ? parseFloat(selF.style.height) / parseFloat(selF.style.width) : null; selF.style.width = Math.round(px) + 'px'; if (r) selF.style.height = Math.round(px * r) + 'px'; }
    if (id === 'fH' && px >= 4) { const r = selF.dataset.kind === 'img' ? parseFloat(selF.style.width) / parseFloat(selF.style.height) : null; selF.style.height = Math.round(px) + 'px'; if (r) selF.style.width = Math.round(px * r) + 'px'; }
    pushHistory(); positionF(); refreshObjUi();
  }));

  /* ------------------------------------------------------------------ */
  /*  Einfügen: Link, Symbole, TOC, Kopf/Fuß                             */
  /* ------------------------------------------------------------------ */
  function linkDialog() {
    restoreSel();
    const sel = getSelection();
    const existing = closestIn(sel.anchorNode, 'a');
    const selText = sel.isCollapsed ? '' : sel.toString();
    dialog({
      title: 'Link einfügen',
      body: `<label>Adresse (URL)<input type="text" id="lk-url" placeholder="https://…" value="${esc(existing ? existing.getAttribute('href') : '')}"></label>
             <label>Anzuzeigender Text<input type="text" id="lk-txt" value="${esc(existing ? existing.textContent : selText)}"></label>`,
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, action: (b) => {
          let url = $('#lk-url', b).value.trim();
          const txt = $('#lk-txt', b).value;
          if (!url) return false;
          if (!/^[a-z][a-z0-9+.-]*:|^#|^\//i.test(url)) url = /@/.test(url) && !/\s/.test(url) ? 'mailto:' + url : 'https://' + url;
          if (!safeHref(url)) { toast('Diese Adresse ist nicht erlaubt.'); return false; }
          restoreSel();
          if (existing) { existing.setAttribute('href', url); if (txt) existing.textContent = txt; afterCmd(); return; }
          if (!selText) document.execCommand('insertHTML', false, `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt || url)}</a>`);
          else document.execCommand('createLink', false, url);
          afterCmd();
        },
      }],
    });
  }
  const SYMBOLS = '€ £ ¥ ¢ © ® ™ § ¶ † ‡ • … ‰ ° ± × ÷ ≠ ≈ ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ ∇ µ π Ω α β γ δ ε θ λ σ φ ψ ← ↑ → ↓ ↔ ⇐ ⇒ ⇔ ★ ☆ ♠ ♣ ♥ ♦ ♪ ☎ ✓ ✔ ✗ ✘ ☐ ☑ ☒ „ “ ” ‚ ‘ ’ « » ‹ › – — ¼ ½ ¾ ¹ ² ³ ä ö ü Ä Ö Ü ß é è ê à ç ñ å ø æ œ 😀 😊 😉 👍 👎 🎉 ❤ ⚠ ✉ 📎 📅'.split(' ');
  function symbolDialog() {
    restoreSel();
    const wrap = document.createElement('div'); wrap.className = 'symgrid';
    SYMBOLS.forEach((s) => { const b = document.createElement('button'); b.textContent = s; b.type = 'button'; wrap.appendChild(b); });
    wrap.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; restoreSel(); document.execCommand('insertText', false, b.textContent); afterCmd(); });
    dialog({ title: 'Symbol einfügen', body: wrap, buttons: [{ label: 'Schließen', primary: true }] });
  }
  function tableDialog() {
    restoreSel();
    const body = document.createElement('div');
    body.innerHTML = '<div class="tblpick"></div><div class="two"><label>Spalten<input type="number" id="tb-c" min="1" max="30" value="3"></label><label>Zeilen<input type="number" id="tb-r" min="1" max="200" value="3"></label></div>';
    const pick = $('.tblpick', body);
    for (let i = 0; i < 80; i++) { const sp = document.createElement('span'); sp.dataset.r = Math.floor(i / 10) + 1; sp.dataset.c = (i % 10) + 1; pick.appendChild(sp); }
    const hl = (r, c) => { $$('span', pick).forEach((s) => s.classList.toggle('on', +s.dataset.r <= r && +s.dataset.c <= c)); $('#tb-r', body).value = r; $('#tb-c', body).value = c; };
    pick.addEventListener('mouseover', (e) => { if (e.target.dataset.r) hl(+e.target.dataset.r, +e.target.dataset.c); });
    pick.addEventListener('click', (e) => { if (e.target.dataset.r) { insertTable(+e.target.dataset.r, +e.target.dataset.c); closeDialogFn && closeDialogFn(); } });
    dialog({
      title: 'Tabelle einfügen', body,
      buttons: [{ label: 'Abbrechen' }, { label: 'Einfügen', primary: true, action: (b) => { insertTable(Math.max(1, Math.min(200, +$('#tb-r', b).value || 1)), Math.max(1, Math.min(30, +$('#tb-c', b).value || 1))); } }],
    });
  }
  function insertToc() {
    restoreSel();
    const hs = $$('h1,h2,h3', doc);
    if (!hs.length) { toast('Keine Überschriften vorhanden. Formatiere Text zuerst mit „Überschrift 1–3“.'); return; }
    let n = 0;
    hs.forEach((h) => { if (!h.id) h.id = 'toc_' + (++n) + '_' + Math.random().toString(36).slice(2, 6); });
    let html = '<p><b style="font-size:16pt">Inhaltsverzeichnis</b></p>';
    hs.forEach((h) => {
      const lvl = +h.tagName[1] - 1;
      html += `<p style="margin-left:${lvl * 18}pt;margin-bottom:2pt"><a href="#${h.id}">${esc(h.textContent)}</a></p>`;
    });
    html += '<p><br></p>';
    document.execCommand('insertHTML', false, html);
    afterCmd();
  }
  function toggleHF(el, label) {
    if (el.hidden) { el.hidden = false; el.innerHTML = '<p><br></p>'; pushHistory(); }
    else if (!el.textContent.trim() && !el.querySelector('img,.pagenum')) { el.hidden = true; pushHistory(); updatePageCount(); toast(label + ' entfernt.'); return; }
    else toast(label + ': Zum Entfernen den Inhalt löschen und nochmals klicken.');
    el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    updatePageCount();
  }
  function insertPageNumber() {
    const span = '<span class="pagenum" contenteditable="false">1</span>';
    if (lastEd === hdr || lastEd === ftr) { restoreSel(); document.execCommand('insertHTML', false, span); afterCmd(); return; }
    if (ftr.hidden) { ftr.hidden = false; ftr.innerHTML = `<p style="text-align:center">${span}</p>`; }
    else { const p = ftr.querySelector('p:last-child') || ftr; p.insertAdjacentHTML('beforeend', span); }
    pushHistory(); updatePageCount(); toast('Seitenzahl in der Fußzeile eingefügt.');
  }

  /* ------------------------------------------------------------------ */
  /*  Suchen & Ersetzen                                                  */
  /* ------------------------------------------------------------------ */
  const find = { matches: [], cur: -1 };
  const findInput = $('#findInput'), replInput = $('#replaceInput');
  function textBlocks() {
    const map = new Map();
    const w = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const b = n.parentElement.closest('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,div') || doc;
      if (!map.has(b)) map.set(b, []);
      map.get(b).push(n);
    }
    return map;
  }
  function computeMatches(keepIdx) {
    find.matches = [];
    const q = findInput.value;
    if (q) {
      const cs = $('#findCase').checked;
      const needle = cs ? q : q.toLocaleLowerCase();
      for (const nodes of textBlocks().values()) {
        const full = nodes.map((n) => n.nodeValue).join('');
        const hay = cs ? full : full.toLocaleLowerCase();
        if (hay.length !== full.length) continue; // Sonderfälle bei Groß-/Kleinschreibung überspringen
        let from = 0, i;
        while ((i = hay.indexOf(needle, from)) !== -1) {
          const r = document.createRange();
          let pos = 0, started = false;
          for (const n of nodes) {
            const len = n.nodeValue.length;
            if (!started && i < pos + len) { r.setStart(n, i - pos); started = true; }
            if (started && i + needle.length <= pos + len) { r.setEnd(n, i + needle.length - pos); break; }
            pos += len;
          }
          find.matches.push(r);
          from = i + Math.max(1, needle.length);
        }
      }
    }
    if (!keepIdx) find.cur = find.matches.length ? 0 : -1;
    else find.cur = Math.min(find.cur, find.matches.length - 1);
    paintFind();
  }
  function paintFind() {
    $('#findCount').textContent = find.matches.length ? `${find.cur + 1} / ${find.matches.length}` : (findInput.value ? '0 Treffer' : '');
    if (window.CSS && CSS.highlights && window.Highlight) {
      CSS.highlights.delete('find'); CSS.highlights.delete('find-cur');
      if (find.matches.length) {
        CSS.highlights.set('find', new Highlight(...find.matches));
        if (find.cur >= 0) CSS.highlights.set('find-cur', new Highlight(find.matches[find.cur]));
      }
    }
  }
  function gotoMatch(step) {
    if (!find.matches.length) { computeMatches(); if (!find.matches.length) return; }
    else find.cur = (find.cur + step + find.matches.length) % find.matches.length;
    const r = find.matches[find.cur];
    paintFind();
    const e = elOf(r.startContainer);
    if (e) e.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Auswahl setzen, ohne das Suchfeld zu verlassen
    lastRange = r.cloneRange(); lastEd = doc;
  }
  function openFind(withReplace) {
    $('#findbar').hidden = false;
    const s = getSelection();
    if (s.rangeCount && !s.isCollapsed && edOf(s.anchorNode) && s.toString().length < 80 && !/\n/.test(s.toString())) findInput.value = s.toString();
    (withReplace ? replInput : findInput).focus(); findInput.select();
    computeMatches();
  }
  function closeFind() {
    $('#findbar').hidden = true; find.matches = []; paintFind();
    restoreSel();
  }
  function replaceRange(r, text) {
    if (r.startContainer === r.endContainer && r.startContainer.nodeType === 3) r.startContainer.replaceData(r.startOffset, r.endOffset - r.startOffset, text);
    else { r.deleteContents(); r.insertNode(document.createTextNode(text)); }
  }
  function replaceOne() {
    if (!find.matches.length) { computeMatches(); return; }
    const idx = find.cur < 0 ? 0 : find.cur;
    replaceRange(find.matches[idx], replInput.value);
    pushHistory();
    computeMatches(true);
    if (find.matches.length) gotoMatch(0);
  }
  function replaceAll() {
    computeMatches();
    const n = find.matches.length;
    if (!n) return;
    for (let i = n - 1; i >= 0; i--) replaceRange(find.matches[i], replInput.value);
    pushHistory();
    computeMatches();
    toast(n + (n === 1 ? ' Ersetzung' : ' Ersetzungen') + ' durchgeführt.');
  }
  findInput.addEventListener('input', () => computeMatches());
  $('#findCase').addEventListener('change', () => computeMatches());
  $('#findbar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (e.target === replInput) replaceOne(); else gotoMatch(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });

  /* ------------------------------------------------------------------ */
  /*  Statistik                                                          */
  /* ------------------------------------------------------------------ */
  function textStats(text) {
    const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
    const chars = text.replace(/[\u200b\n]/g, '').length;
    const charsNoSp = text.replace(/[\s\u200b]/g, '').length;
    return { words, chars, charsNoSp };
  }
  function updateStats() {
    const s = getSelection();
    const hasSel = s.rangeCount && !s.isCollapsed && edOf(s.anchorNode) === doc;
    const all = textStats(doc.innerText || '');
    if (hasSel) { const part = textStats(s.toString()); $('#st-words').textContent = `${part.words} von ${all.words} Wörtern`; }
    else $('#st-words').textContent = `${all.words} ${all.words === 1 ? 'Wort' : 'Wörter'}`;
    $('#st-chars').textContent = `${all.chars} Zeichen`;
    let pg = 1;
    try {
      if (lastRange && doc.contains(lastRange.startContainer)) {
        const rr = lastRange.getClientRects()[0] || elOf(lastRange.startContainer).getBoundingClientRect();
        const top = (rr.top - sheet.getBoundingClientRect().top) / scaleOf();
        pg = Math.min(state.pages || 1, Math.max(1, Math.floor(top / (settings.h / 15)) + 1));
      }
    } catch (e) { /* ignorieren */ }
    $('#st-page').textContent = `Seite ${pg} von ${state.pages || 1}`;
  }
  let statsT;
  function updateStatsSoon() { clearTimeout(statsT); statsT = setTimeout(() => { updatePageCount(); }, 150); }

  function wordCountDialog() {
    const s = getSelection();
    const hasSel = s.rangeCount && !s.isCollapsed && edOf(s.anchorNode);
    const t = textStats(hasSel ? s.toString() : (doc.innerText || ''));
    const paras = $$('p,h1,h2,h3,h4,h5,h6,li', doc).filter((p) => p.textContent.trim()).length;
    dialog({
      title: hasSel ? 'Statistik (Auswahl)' : 'Statistik',
      body: `<table class="kv"><tr><td>Seiten</td><td>${state.pages || 1}</td></tr><tr><td>Wörter</td><td>${t.words}</td></tr><tr><td>Zeichen (mit Leerzeichen)</td><td>${t.chars}</td></tr><tr><td>Zeichen (ohne Leerzeichen)</td><td>${t.charsNoSp}</td></tr><tr><td>Absätze</td><td>${paras}</td></tr><tr><td>Bilder</td><td>${doc.querySelectorAll('img').length}</td></tr><tr><td>Tabellen</td><td>${doc.querySelectorAll('table').length}</td></tr></table>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Bereinigen von eingefügtem HTML                                    */
  /* ------------------------------------------------------------------ */
  const KEEP_TAGS = new Set(['P', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP', 'A', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'COLGROUP', 'COL', 'IMG', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'FONT', 'MARK']);
  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'AUDIO', 'VIDEO', 'CANVAS']);
  const KEEP_CSS = new Set(['font-family', 'font-size', 'color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'margin-left', 'margin-top', 'margin-bottom', 'line-height', 'text-indent', 'vertical-align', 'width', 'height', 'list-style-type', 'text-transform']);
  function sanitizeNode(node, keepStructure) {
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 8) { c.remove(); continue; }
      if (c.nodeType === 3) continue;
      if (c.nodeType !== 1) { c.remove(); continue; }
      const tag = c.tagName.toUpperCase();
      if (DROP_TAGS.has(tag) || /^O:|^V:|^W:/.test(tag)) { if (/^O:P$/.test(tag)) { while (c.firstChild) node.insertBefore(c.firstChild, c); } c.remove(); continue; }
      sanitizeNode(c, keepStructure);
      if (!KEEP_TAGS.has(tag)) { while (c.firstChild) node.insertBefore(c.firstChild, c); c.remove(); continue; }
      const style = c.getAttribute('style') || '';
      const keepAttrs = { href: c.getAttribute('href'), src: c.getAttribute('src'), alt: c.getAttribute('alt'), colspan: c.getAttribute('colspan'), rowspan: c.getAttribute('rowspan'), start: c.getAttribute('start'), type: c.getAttribute('type'), width: c.getAttribute('width'), height: c.getAttribute('height'), color: c.getAttribute('color'), face: c.getAttribute('face'), id: c.getAttribute('id'), cls: c.getAttribute('class') };
      Array.from(c.attributes).forEach((a) => c.removeAttribute(a.name));
      if (style) {
        const keep = [];
        style.split(';').forEach((d) => {
          const i = d.indexOf(':'); if (i < 0) return;
          const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim();
          if (KEEP_CSS.has(k) && v && !/url\(|expression|javascript/i.test(v)) keep.push(`${k}:${v}`);
        });
        if (keep.length) c.setAttribute('style', keep.join(';'));
      }
      if (tag === 'A') { const h = safeHref(keepAttrs.href); if (h) { c.setAttribute('href', h); c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); } else { while (c.firstChild) node.insertBefore(c.firstChild, c); c.remove(); continue; } }
      if (tag === 'IMG') { const s = keepAttrs.src || ''; if (/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);/i.test(s) || /^https?:/i.test(s)) { c.setAttribute('src', s); if (keepAttrs.alt) c.setAttribute('alt', keepAttrs.alt); if (keepAttrs.width) c.setAttribute('width', keepAttrs.width); if (keepAttrs.height) c.setAttribute('height', keepAttrs.height); c.style.maxWidth = '100%'; } else { c.remove(); continue; } }
      if (tag === 'TD' || tag === 'TH') { if (keepAttrs.colspan) c.setAttribute('colspan', keepAttrs.colspan); if (keepAttrs.rowspan) c.setAttribute('rowspan', keepAttrs.rowspan); }
      if (tag === 'OL' && keepAttrs.start) c.setAttribute('start', keepAttrs.start);
      if (tag === 'FONT') { if (keepAttrs.color) c.setAttribute('color', keepAttrs.color); if (keepAttrs.face) c.setAttribute('face', keepAttrs.face); }
      if (keepStructure && /^H[1-6]$/.test(tag) === false && keepAttrs.cls && /^(title|subtitle|quote)$/.test(keepAttrs.cls)) c.className = keepAttrs.cls;
      if (keepStructure && keepAttrs.cls === 'colbreak') { c.className = 'colbreak'; c.setAttribute('contenteditable', 'false'); }
      if (keepStructure && keepAttrs.cls === 'pagebreak') { c.className = 'pagebreak'; c.setAttribute('contenteditable', 'false'); }
      if (keepStructure && keepAttrs.id && /^[\w-]+$/.test(keepAttrs.id)) c.id = keepAttrs.id;
      if (tag === 'TABLE' && keepStructure && keepAttrs.cls === 'noborder') c.className = 'noborder';
    }
    // Leerraum zwischen Blöcken entfernen (der Editor zeigt Leerraum an)
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 3 && !/\S/.test(c.nodeValue) && /^(DIV|BODY|UL|OL|TABLE|TBODY|THEAD|TR|COLGROUP)$/i.test(node.tagName || 'DIV') && !/\u00a0/.test(c.nodeValue)) c.remove();
      else if (c.nodeType === 3 && /^\s*\n\s*$/.test(c.nodeValue) && c.previousSibling && c.previousSibling.nodeType === 1 && /^(P|H[1-6]|UL|OL|TABLE|DIV|BLOCKQUOTE|LI)$/.test(c.previousSibling.tagName)) c.remove();
    }
  }
  function sanitizeHtml(html, keepStructure) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    // Word/Excel-Zwischenablage: Inhalt zwischen StartFragment/EndFragment ist bereits der Body
    sanitizeNode(d.body, keepStructure);
    return d.body.innerHTML;
  }
  const textToHtml = (t) => t.replace(/\r\n?/g, '\n').split('\n').map((l) => `<p>${l ? esc(l).replace(/ {2}/g, ' \u00a0') : '<br>'}</p>`).join('');

  function insertHtmlAtCaret(html) {
    restoreSel();
    document.execCommand('insertHTML', false, html);
    afterCmd();
  }
  async function pasteHandler(e) {
    const cd = e.clipboardData;
    if (!cd) return;
    const files = Array.from(cd.files || []).filter((f) => /^image\//.test(f.type));
    const html = cd.getData('text/html');
    if (files.length && !html) { e.preventDefault(); for (const f of files) await insertImageFile(f); return; }
    e.preventDefault();
    if (html) {
      insertHtmlAtCaret(sanitizeHtml(html.replace(/^[\s\S]*<!--StartFragment-->|<!--EndFragment-->[\s\S]*$/g, ''), false));
    } else {
      const t = cd.getData('text/plain');
      if (t) insertHtmlAtCaret(t.includes('\n') ? textToHtml(t) : esc(t));
    }
  }
  editors.forEach((ed) => ed.addEventListener('paste', pasteHandler));

  /* ------------------------------------------------------------------ */
  /*  Dateien öffnen / speichern                                         */
  /* ------------------------------------------------------------------ */
  const sanitizeName = (n) => (n || 'Dokument').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Dokument';

  function setDocument(res, name, handle) {
    state.loading = true;
    doc.innerHTML = res.html || '<p><br></p>';
    const setHF = (el, h) => { el.innerHTML = h || ''; el.hidden = !h; };
    setHF(hdr, res.header); setHF(ftr, res.footer);
    settings = Object.assign(defaultSettings(), res.settings || {});
    state.name = name; state.handle = handle || null;
    $('#docname').value = name;
    hideImgBox(); hideF(); lastRange = null; lastEd = doc;
    ensureStructure();
    applySettings(true);
    hist.stack = []; hist.idx = -1; hist.size = 0;
    pushHistory();
    state.loading = false; state.savedAt = null;
    setDirty(false);
    scrollEl.scrollTop = 0;
    updateStats();
    updateUndoButtons();
  }
  function newDocument() {
    if (state.dirty && !confirm('Es gibt nicht gespeicherte Änderungen. Trotzdem ein neues Dokument anlegen?')) return;
    try { localStorage.removeItem('wohni-draft'); } catch (e) { /* egal */ }
    setDocument({ html: '<p><br></p>' }, 'Dokument1', null);
    doc.focus();
  }
  async function loadFile(file, handle, insertOnly) {
    const ext = (file.name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
    const base = file.name.replace(/\.[^.]+$/, '');
    try {
      let res;
      if (ext === 'docx' || ext === 'dotx' || ext === 'docm') {
        res = await DocxIO.importDocx(await file.arrayBuffer());
      } else if (ext === 'html' || ext === 'htm') {
        res = { html: sanitizeHtml(await file.text(), true) };
      } else if (ext === 'txt' || ext === 'md' || ext === 'text' || ext === 'csv') {
        res = { html: textToHtml(await file.text()) };
      } else if (ext === 'doc' || ext === 'rtf' || ext === 'odt' || ext === 'pages') {
        toast(`.${ext}-Dateien kann ich nicht lesen. Bitte in Word oder LibreOffice über „Speichern unter“ als .docx speichern.`, 7000);
        return;
      } else {
        const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
        if (head[0] === 0x50 && head[1] === 0x4b) res = await DocxIO.importDocx(await file.arrayBuffer());
        else { res = { html: textToHtml(await file.text()) }; }
      }
      if (insertOnly) { insertHtmlAtCaret(res.html); toast(`„${file.name}“ eingefügt.`); return; }
      const keepHandle = handle && ext === 'docx' ? handle : null;
      setDocument(res, base, keepHandle);
      toast(`„${file.name}“ geöffnet.`);
    } catch (err) {
      console.error(err);
      toast('Die Datei konnte nicht geöffnet werden: ' + (err.message || err), 6000);
    }
  }
  const OPEN_TYPES = [{ description: 'Word- und Textdokumente', accept: { [DOCX_MIME]: ['.docx'], 'text/html': ['.html', '.htm'], 'text/plain': ['.txt', '.md'] } }];
  async function openFile(insertOnly) {
    if (!insertOnly && state.dirty && !confirm('Es gibt nicht gespeicherte Änderungen. Trotzdem eine andere Datei öffnen?')) return;
    if (window.showOpenFilePicker) {
      try {
        const [h] = await showOpenFilePicker({ types: OPEN_TYPES, multiple: false });
        await loadFile(await h.getFile(), insertOnly ? null : h, insertOnly);
        return;
      } catch (e) { if (e && e.name === 'AbortError') return; /* sonst: Fallback auf Dateiauswahl */ }
    }
    (insertOnly ? $('#fileInsertInput') : $('#fileOpen')).click();
  }
  $('#fileOpen').addEventListener('change', async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await loadFile(f, null, false); });
  $('#fileInsertInput').addEventListener('change', async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) { restoreSel(); await loadFile(f, null, true); } });
  $('#fileImage').addEventListener('change', async (e) => { const fs = Array.from(e.target.files); e.target.value = ''; for (const f of fs) await insertImageFile(f); });

  async function buildDocx() {
    const z = state.zoom;
    root.style.setProperty('--zoom', 1); // für korrekte Maße (Bilder, Tabellen)
    hideImgBoxKeep();
    try {
      await new Promise((r) => requestAnimationFrame(r));
      const floatPng = await shapePngs();
      return await DocxIO.exportDocx(doc, { settings, headerEl: hdr.hidden ? null : hdr, footerEl: ftr.hidden ? null : ftr, title: state.name, floatPng });
    } finally { root.style.setProperty('--zoom', z / 100); }
  }
  // Formen werden für Word als Grafik (PNG) gespeichert
  async function shapePngs() {
    const map = new Map();
    for (const f of allF()) {
      if (f.dataset.kind !== 'shape') continue;
      try {
        const sc = 2, w = Math.max(2, Math.round(parseFloat(f.style.width) * sc)), h = Math.max(2, Math.round(parseFloat(f.style.height) * sc));
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(shapeSvg(f, { w, h }));
        await img.decode();
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = c.toDataURL('image/png').split(',')[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        map.set(f, { mime: 'image/png', bytes });
      } catch (e) { console.warn('Form konnte nicht in ein Bild umgewandelt werden', e); }
    }
    return map;
  }
  function hideImgBoxKeep() { /* Overlay liegt außerhalb des Dokuments und stört den Export nicht */ }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  async function saveDocx(asNew) {
    if (hist.timer) pushHistory();
    state.name = sanitizeName($('#docname').value);
    let blob;
    try { blob = await buildDocx(); } catch (e) { console.error(e); toast('Speichern fehlgeschlagen: ' + e.message, 6000); return; }
    const fname = state.name + '.docx';
    if (window.showSaveFilePicker) {
      try {
        let h = state.handle;
        if (asNew || !h) h = await showSaveFilePicker({ suggestedName: fname, types: [{ description: 'Word-Dokument', accept: { [DOCX_MIME]: ['.docx'] } }] });
        const w = await h.createWritable(); await w.write(blob); await w.close();
        state.handle = h; state.name = h.name.replace(/\.docx$/i, ''); $('#docname').value = state.name;
        state.savedAt = Date.now(); setDirty(false);
        toast('Gespeichert: ' + h.name);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.warn('Direktes Speichern nicht möglich, lade stattdessen herunter:', e);
        state.handle = null;
      }
    }
    download(blob, fname);
    state.savedAt = Date.now(); setDirty(false);
    toast(`„${fname}“ wurde in deinen Download-Ordner gespeichert.`);
  }
  function exportHtml() {
    const cl = doc.cloneNode(true);
    cl.querySelectorAll('.fobj').forEach((f) => { const im = f.querySelector('img'); if (im) { im.style.maxWidth = '100%'; im.style.width = f.style.width; f.replaceWith(im); } else f.remove(); });
    cl.querySelectorAll('.colbreak').forEach((p) => p.remove());
    cl.querySelectorAll('.pagebreak').forEach((p) => { p.removeAttribute('contenteditable'); p.removeAttribute('style'); p.setAttribute('style', 'page-break-after:always'); });
    const html = `<!doctype html><html lang="${doc.lang || 'de'}"><head><meta charset="utf-8"><title>${esc(state.name)}</title><style>body{max-width:${Math.round((settings.w - settings.left - settings.right) / 15)}px;margin:2em auto;font-family:"${settings.defaultFont}",Carlito,Arial,sans-serif;font-size:${settings.defaultSize}pt;line-height:1.08}p{margin:0 0 8pt}table{border-collapse:collapse}td,th{border:1px solid #000;padding:2px 5pt;vertical-align:top}table.noborder td,table.noborder th{border:0}img{max-width:100%}</style></head><body>${cl.innerHTML}</body></html>`;
    download(new Blob([html], { type: 'text/html;charset=utf-8' }), sanitizeName(state.name) + '.html');
  }
  function exportTxt() {
    download(new Blob([doc.innerText.replace(/\u200b/g, '')], { type: 'text/plain;charset=utf-8' }), sanitizeName(state.name) + '.txt');
  }

  /* ---- Drucken ---- */
  function preparePrint() {
    printObjects();
    const hasH = !hdr.hidden && hdr.textContent.trim(), hasF = !ftr.hidden && ftr.textContent.trim();
    document.body.classList.toggle('print-margin-hf', !!(hasH || hasF));
    const chrome = parseInt((navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/) || [])[1], 10);
    const modern = chrome >= 131;
    document.body.classList.toggle('print-margin-hf', modern && !!(hasH || hasF));
    let css = '';
    const boxFor = (el, pos) => {
      if (!el || el.hidden || !el.textContent.trim()) return '';
      const p = el.querySelector('p,div') || el;
      const al = (p.style.textAlign || 'left');
      const name = `@${pos}-${al === 'center' ? 'center' : al === 'right' ? 'right' : 'left'}`;
      const parts = [];
      el.childNodes.forEach(function walk(n) {
        if (n.nodeType === 3) { if (n.nodeValue.trim() || parts.length) parts.push(JSON.stringify(n.nodeValue.replace(/\s+/g, ' '))); }
        else if (n.nodeType === 1) { if (n.classList.contains('pagenum')) parts.push('counter(page)'); else if (n.classList.contains('numpages')) parts.push('counter(pages)'); else n.childNodes.forEach(walk); }
      });
      return `${name} { content: ${parts.join(' ') || '""'}; font: ${settings.defaultSize}pt "${settings.defaultFont}", Carlito, Arial, sans-serif; vertical-align: ${pos === 'top' ? 'bottom' : 'top'}; }`;
    };
    if (modern) {
      css = boxFor(hdr, 'top') + boxFor(ftr, 'bottom');
      let ps = $('#printboxes');
      if (!ps) { ps = document.createElement('style'); ps.id = 'printboxes'; document.head.appendChild(ps); }
      ps.textContent = css ? `@page { ${css} }` : '';
    }
  }
  function printObjects() {
    const H = settings.h / 15, mt = settings.top / 15, mb = settings.bottom / 15, ml = settings.left / 15, ch = H - mt - mb;
    allF().forEach((f) => {
      const x = parseFloat(f.style.left) || 0, y = parseFloat(f.style.top) || 0, k = y > 0 ? Math.floor(y / H) : 0;
      f.style.setProperty('--px', (x - ml) + 'px'); f.style.setProperty('--py', (k * ch + (y - k * H - mt)) + 'px');
    });
  }
  function cleanupPrint() { allF().forEach((f) => { f.style.removeProperty('--px'); f.style.removeProperty('--py'); }); document.body.classList.remove('print-margin-hf'); const ps = $('#printboxes'); if (ps) ps.textContent = ''; }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', cleanupPrint);

  /* ---- Entwurf ---- */
  setInterval(() => {
    if (!state.dirty) return;
    try { localStorage.setItem('wohni-draft', JSON.stringify({ name: state.name, html: stripBreakStyles(doc.innerHTML), header: hdr.hidden ? '' : hdr.innerHTML, footer: ftr.hidden ? '' : ftr.innerHTML, settings, t: Date.now() })); } catch (e) { /* zu groß o. Ä. */ }
  }, 5000);
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ------------------------------------------------------------------ */
  /*  Befehle                                                            */
  /* ------------------------------------------------------------------ */
  const showShortcuts = () => dialog({
    title: 'Tastenkürzel',
    body: `<table class="kv"><tr><td>Speichern</td><td><kbd>Strg</kbd> <kbd>S</kbd></td></tr><tr><td>Öffnen</td><td><kbd>Strg</kbd> <kbd>O</kbd></td></tr><tr><td>Drucken</td><td><kbd>Strg</kbd> <kbd>P</kbd></td></tr>
      <tr><td>Fett / Kursiv / Unterstrichen</td><td><kbd>Strg</kbd> <kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd></td></tr><tr><td>Rückgängig / Wiederholen</td><td><kbd>Strg</kbd> <kbd>Z</kbd> / <kbd>Y</kbd></td></tr>
      <tr><td>Suchen / Ersetzen</td><td><kbd>Strg</kbd> <kbd>F</kbd> / <kbd>H</kbd></td></tr><tr><td>Link einfügen</td><td><kbd>Strg</kbd> <kbd>K</kbd></td></tr>
      <tr><td>Links / Mitte / Rechts / Block</td><td><kbd>Strg</kbd> <kbd>L</kbd> / <kbd>E</kbd> / <kbd>R</kbd> / <kbd>J</kbd></td></tr><tr><td>Seitenumbruch</td><td><kbd>Strg</kbd> <kbd>Enter</kbd></td></tr>
      <tr><td>Überschrift 1 / 2 / 3</td><td><kbd>Strg</kbd> <kbd>Alt</kbd> <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd></td></tr><tr><td>Schrift größer / kleiner</td><td><kbd>Strg</kbd> <kbd>Umschalt</kbd> <kbd>&gt;</kbd> / <kbd>&lt;</kbd></td></tr>
      <tr><td>Tiefgestellt / Hochgestellt</td><td><kbd>Strg</kbd> <kbd>=</kbd> / <kbd>Umschalt</kbd> <kbd>=</kbd></td></tr><tr><td>Link öffnen</td><td><kbd>Strg</kbd> + Klick</td></tr></table>`,
  });
  const about = () => dialog({
    title: 'Wohni Word',
    body: `<p>Ein Textverarbeitungsprogramm für den Browser – ohne Server, ohne Konto. Deine Dokumente bleiben auf deinem Rechner.</p>
      <p><b>Dateien:</b> .docx öffnen und speichern (in Chrome/Edge direkt in die Originaldatei, sonst als Download), außerdem .html und .txt.</p>
      <p class="muted">Nicht unterstützt: Kommentare, Änderungsverfolgung, Fußnoten, Formeln, Textfelder und Diagramme aus Word werden beim Öffnen übersprungen.</p>`,
  });

  const C = {
    new: newDocument, open: () => openFile(false), save: () => saveDocx(false), saveAs: () => saveDocx(true),
    print: () => { preparePrint(); setTimeout(() => window.print(), 50); },
    exportHtml, exportTxt, about, shortcuts: showShortcuts, wordCount: wordCountDialog,
    undo, redo,
    cut: () => exec('cut'), copy: () => { restoreSel(); document.execCommand('copy'); },
    paste: async () => {
      restoreSel();
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const imgT = it.types.find((t) => t.startsWith('image/'));
          if (it.types.includes('text/html')) { const html = await (await it.getType('text/html')).text(); insertHtmlAtCaret(sanitizeHtml(html, false)); return; }
          if (it.types.includes('text/plain')) { const t = await (await it.getType('text/plain')).text(); insertHtmlAtCaret(t.includes('\n') ? textToHtml(t) : esc(t)); return; }
          if (imgT) { const b = await it.getType(imgT); await insertImageFile(new File([b], 'Bild', { type: imgT })); return; }
        }
      } catch (e) { toast('Der Browser erlaubt kein direktes Einfügen – bitte Strg+V benutzen.'); }
    },
    formatPainter: startPainter,
    bold: () => exec('bold'), italic: () => exec('italic'), underline: () => exec('underline'), strikeThrough: () => exec('strikeThrough'),
    subscript: () => exec('subscript'), superscript: () => exec('superscript'),
    clearFormat, growFont: () => stepFont(1), shrinkFont: () => stepFont(-1),
    fontColor: () => applyColor('color', colorState.color), hilite: () => applyColor('hilite', colorState.hilite), shade: () => applyColor('shade', colorState.shade), cellShade: () => applyColor('cellShade', colorState.cellShade),
    ul: () => toggleList('ul'), ol: () => toggleList('ol'), indent: indentMore, outdent: indentLess,
    justifyLeft: () => exec('justifyLeft'), justifyCenter: () => exec('justifyCenter'), justifyRight: () => exec('justifyRight'), justifyFull: () => exec('justifyFull'),
    marks: () => { document.body.classList.toggle('marks'); $('#b-marks').classList.toggle('on', document.body.classList.contains('marks')); },
    find: () => openFind(false), replace: () => openFind(true), findNext: () => gotoMatch(1), findPrev: () => gotoMatch(-1), findClose: closeFind,
    replaceOne, replaceAll,
    selectAll: () => { restoreSel(); document.execCommand('selectAll'); },
    pageBreak: () => { restoreSel(); document.execCommand('insertHTML', false, '<div class="pagebreak" contenteditable="false"></div><p><br></p>'); afterCmd(); },
    table: tableDialog, image: () => $('#fileImage').click(), fileInsert: () => openFile(true),
    hr: () => { restoreSel(); document.execCommand('insertHorizontalRule'); afterCmd(); },
    link: linkDialog, unlink: () => exec('unlink'), toc: insertToc,
    header: () => toggleHF(hdr, 'Kopfzeile'), footer: () => toggleHF(ftr, 'Fußzeile'), pageNumber: insertPageNumber,
    datetime: () => { restoreSel(); document.execCommand('insertText', false, new Date().toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'short' })); afterCmd(); },
    symbol: symbolDialog, pageSetup: pageSetupDialog,
    colBreak: () => { restoreSel(); document.execCommand('insertHTML', false, '<div class="colbreak" contenteditable="false"></div>'); afterCmd(); updatePageCount(); },
    shapes: (e) => openShapes(), objList: objListDialog,
    objFill: () => applyColor('objFill', colorState.objFill), objLine: () => applyColor('objLine', colorState.objLine),
    zFront: () => zOrder(1), zBack: () => zOrder(-1), objDup: objDuplicate, objDel: objDelete,
    alL: () => alignObj('l'), alC: () => alignObj('c'), alR: () => alignObj('r'), alT: () => alignObj('t'), alM: () => alignObj('m'), alB: () => alignObj('b'), alW: () => alignObj('w'),
    spell: () => { const on = !doc.spellcheck; editors.forEach((e) => { e.spellcheck = on; }); $('#b-spell').classList.toggle('on', on); toast('Rechtschreibprüfung ' + (on ? 'eingeschaltet' : 'ausgeschaltet') + '.'); doc.blur(); doc.focus(); },
    zoomIn: () => setZoom(state.zoom + 10), zoomOut: () => setZoom(state.zoom - 10), zoom100: () => setZoom(100),
    zoomFit: () => setZoom((scrollEl.clientWidth - 40) / (settings.w / 15) * 100),
    ruler: () => { document.body.classList.toggle('show-ruler'); $('#b-ruler').classList.toggle('on', document.body.classList.contains('show-ruler')); },
    toggleTheme: () => { const d = root.dataset.theme !== 'dark'; root.dataset.theme = d ? 'dark' : ''; try { localStorage.setItem('wohni-theme', d ? 'dark' : 'light'); } catch (e) { /* egal */ } },
    fullscreen: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); },
    rowAbove: () => tableOp('rowAbove'), rowBelow: () => tableOp('rowBelow'), colLeft: () => tableOp('colLeft'), colRight: () => tableOp('colRight'),
    delRow: () => tableOp('delRow'), delCol: () => tableOp('delCol'), delTable: () => tableOp('delTable'),
    mergeRight: () => tableOp('mergeRight'), mergeDown: () => tableOp('mergeDown'), splitCell: () => tableOp('splitCell'),
    tblBorders: () => tableOp('tblBorders'), tblAutoFit: () => tableOp('tblAutoFit'),
  };
  window.__wohni = { C, doc, hdr, ftr, state, get settings() { return settings; }, setDocument, buildDocx, sanitizeHtml, hist, pushHistory };

  document.addEventListener('mousedown', (e) => {
    // Menüband-Klicks dürfen die Textauswahl nicht verlieren
    if (e.target.closest('#ribbon, #titlebar, #status, #findbar button') && !e.target.closest('select, input, label')) e.preventDefault();
  });
  document.addEventListener('click', (e) => {
    const pop = e.target.closest('[data-pop]');
    if (pop) { openPalette(pop.dataset.pop, pop.parentElement); return; }
    const b = e.target.closest('[data-cmd]');
    if (b && !b.disabled) { const fn = C[b.dataset.cmd]; if (fn) { closePopup(); Promise.resolve(fn()).catch((err) => console.error(err)); } }
    const st = e.target.closest('[data-style]');
    if (st) paraStyle(st.dataset.style);
  });

  // Reiter
  function showTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // Auswahlfelder im Menüband
  fontSel.addEventListener('change', () => { exec('fontName', fontSel.value); });
  let sizeApplied = '';
  const applySizeInput = () => { const v = sizeInp.value; if (v && v !== sizeApplied) { sizeApplied = v; setFontSize(v); } };
  sizeInp.addEventListener('change', applySizeInput);
  sizeInp.addEventListener('focus', () => { sizeApplied = ''; });
  sizeInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applySizeInput(); restoreSel(); } });
  $('#caseSel').addEventListener('change', (e) => { const v = e.target.value; e.target.value = ''; if (v) mapSelectionText(CASE_FN[v]); });
  $('#listType').addEventListener('change', (e) => { const v = e.target.value; e.target.value = ''; if (v) setListType(v); });
  $('#lineSpacing').addEventListener('change', (e) => { const v = e.target.value; e.target.value = ''; if (v) applyToBlocks((b) => { b.style.lineHeight = v; }); });
  $('#paraSpacing').addEventListener('change', (e) => {
    const v = e.target.value; e.target.value = ''; if (!v) return;
    const before = v[0] === 'b'; const n = parseFloat(before ? v.slice(1) : v);
    applyToBlocks((b) => { b.style[before ? 'marginTop' : 'marginBottom'] = n + 'pt'; });
  });
  $('#cellValign').addEventListener('change', (e) => { const v = e.target.value; e.target.value = ''; if (!v) return; restoreSel(); cellsInSelection().forEach((c) => { c.style.verticalAlign = v; }); afterCmd(); });
  $('#marginPreset').addEventListener('change', (e) => {
    if (e.target.value === 'custom') { pageSetupDialog(); return; }
    const [tb, lr] = e.target.value.split(',').map(Number);
    Object.assign(settings, { top: tb, bottom: tb, left: lr, right: lr }); applySettings();
  });
  const pageFromUi = () => {
    const [w, h] = DocxIO.PAGE_SIZES[$('#pageSize').value];
    const land = $('#orientation').value === 'landscape';
    Object.assign(settings, { w: land ? h : w, h: land ? w : h }); applySettings();
  };
  $('#pageSize').addEventListener('change', pageFromUi);
  $('#orientation').addEventListener('change', pageFromUi);
  function setColumns(v) {
    if (v === 'left' || v === 'right') { Object.assign(settings, { cols: 2, colMode: v, colW: null }); }
    else { Object.assign(settings, { cols: +v, colMode: 'equal', colW: null }); }
    applySettings();
    if (v === 'left' || v === 'right') {
      if (!doc.querySelector('.colbreak')) {
        // Spaltenumbruch hinter den aktuellen Absatz setzen (Rest des Dokuments steht dann in der rechten Spalte)
        restoreSel();
        const blk = (currentBlock() && currentBlock().closest('#doc > *')) || doc.lastElementChild;
        const mk = Object.assign(document.createElement('div'), { className: 'colbreak' }); mk.setAttribute('contenteditable', 'false');
        if (blk && blk.parentNode === doc) blk.after(mk); else doc.appendChild(mk);
        ensureStructure(); pushHistory(); updatePageCount();
        toast('Spaltenumbruch eingefügt: Text davor steht in der ' + (v === 'left' ? 'schmalen linken' : 'breiten linken') + ' Spalte, Text danach rechts. Verschiebe ihn mit Ausschneiden/Einfügen oder setze ihn neu (Layout → Spaltenumbruch).', 8000);
      }
    }
  }
  $('#columns').addEventListener('change', (e) => setColumns(e.target.value));
  $('#lang').addEventListener('change', (e) => { editors.forEach((x) => { x.lang = e.target.value; }); $('#st-lang').textContent = e.target.selectedOptions[0].textContent; });
  $('#zoomRange').addEventListener('input', (e) => setZoom(+e.target.value));
  $('#docname').addEventListener('change', () => { state.name = sanitizeName($('#docname').value); $('#docname').value = state.name; setDirty(state.dirty); });
  $('#docname').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); doc.focus(); } });

  // Toolbar-Zustand
  let stateT;
  function schedState() { clearTimeout(stateT); stateT = setTimeout(updateState, 60); }
  function updateState() {
    if (!lastRange) return;
    ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach((c) => {
      let on = false; try { on = document.queryCommandState(c); } catch (e) { /* egal */ }
      const el = $('#b-' + c); if (el) el.classList.toggle('on', !!on);
    });
    const e = elOf(lastRange.startContainer);
    if (e) {
      $('#b-ul').classList.toggle('on', !!closestIn(e, 'ul'));
      $('#b-ol').classList.toggle('on', !!closestIn(e, 'ol'));
      const ff = getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim();
      if (document.activeElement !== fontSel) {
        if (!Array.from(fontSel.options).some((o) => o.value === ff)) { const o = document.createElement('option'); o.value = ff; o.textContent = ff; fontSel.appendChild(o); }
        fontSel.value = ff;
      }
      if (document.activeElement !== sizeInp) sizeInp.value = String(currentFontSizePt()).replace('.', ',') ;
      const blk = closestIn(e, 'p,h1,h2,h3,h4,h5,h6,blockquote,li');
      let key = 'normal';
      if (blk) {
        if (/^H[1-3]$/.test(blk.tagName)) key = blk.tagName.toLowerCase();
        else if (blk.classList.contains('title')) key = 'title'; else if (blk.classList.contains('subtitle')) key = 'subtitle';
        else if (blk.classList.contains('quote') || blk.tagName === 'BLOCKQUOTE') key = 'quote';
      }
      $$('#styleGallery button').forEach((b) => b.classList.toggle('on', b.dataset.style === key));
    }
    document.body.classList.toggle('in-table', !!currentCell());
    if (!currentCell() && $('#tab-table').classList.contains('active')) showTab('home');
    updateStats();
  }

  // Eingabe-Ereignisse
  editors.forEach((ed) => {
    ed.addEventListener('input', () => { scheduleHistory(); updateStatsSoon(); positionImgBox(); });
    ed.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); }
      else if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); }
    });
    ed.addEventListener('focus', () => { lastEd = ed; });
    ed.addEventListener('keyup', () => { if (ed === doc && !doc.firstChild) doc.innerHTML = '<p><br></p>'; });
  });
  sheet.addEventListener('mousedown', (e) => {
    if (e.target === sheet || e.target === $('#pages') || e.target === scrollEl) {
      // Klick auf den Seitenrand: Cursor an passende Stelle setzen
      e.preventDefault(); doc.focus();
      const r = document.createRange(); r.selectNodeContents(doc); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
  scrollEl.addEventListener('mousedown', (e) => { if (e.target === scrollEl) { e.preventDefault(); doc.focus(); } });
  window.addEventListener('resize', () => { positionImgBox(); });

  // Tastenkürzel
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const inEd = !!edOf(e.target);
    if (inEd) syncRange();
    if (e.key === 'Tab' && inEd) {
      const cell = currentCell(), li = closestIn(lastRange && lastRange.startContainer, 'li');
      if (cell && !li) {
        e.preventDefault();
        const table = cell.closest('table'), cells = Array.from(table.querySelectorAll('td,th'));
        let i = cells.indexOf(cell) + (e.shiftKey ? -1 : 1);
        if (i >= cells.length) { tableOp('rowBelow'); i = cells.length; }
        const t = Array.from(table.querySelectorAll('td,th'))[Math.max(0, i)];
        if (t) { const r = document.createRange(); r.selectNodeContents(t); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        return;
      }
      e.preventDefault();
      if (li) { if (e.shiftKey) indentLess(); else indentMore(); }
      else { document.execCommand('insertText', false, '\t'); afterCmd(); }
      return;
    }
    if (e.key === 'Escape') { if (!popup.hidden) closePopup(); else if (selF) hideF(); else if (selImg) hideImgBox(); return; }
    if (!mod) return;
    const k = e.key.toLowerCase();
    const run = (fn) => { e.preventDefault(); fn(); };
    if (k === 's') return run(() => saveDocx(e.shiftKey));
    if (k === 'o') return run(() => openFile(false));
    if (k === 'p') return run(C.print);
    if (k === 'f') return run(() => openFind(false));
    if (k === 'h') return run(() => openFind(true));
    if (!inEd) return;
    if (k === 'k') return run(linkDialog);
    if (k === 'z') return run(e.shiftKey ? redo : undo);
    if (k === 'y') return run(redo);
    if (k === 'enter') return run(C.pageBreak);
    if (k === 'l' && !e.shiftKey) return run(C.justifyLeft);
    if (k === 'e') return run(C.justifyCenter);
    if (k === 'r' && !e.shiftKey) return run(C.justifyRight);
    if (k === 'j') return run(C.justifyFull);
    if (k === '=' && !e.shiftKey) return run(C.subscript);
    if ((k === '+' || (k === '=' && e.shiftKey))) return run(C.superscript);
    if (e.shiftKey && (k === '>' || k === '.')) return run(C.growFont);
    if (e.shiftKey && (k === '<' || k === ',')) return run(C.shrinkFont);
    if (e.shiftKey && (k === '*' || k === '8')) return run(C.marks);
    if (e.altKey && /^[123]$/.test(e.key)) return run(() => paraStyle('h' + e.key));
    if (e.altKey && e.key === '0') return run(() => paraStyle('normal'));
  }, true);

  // Drag & Drop von Dateien
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) { dragDepth++; $('#dropzone').hidden = false; } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#dropzone').hidden = true; });
  window.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', async (e) => {
    dragDepth = 0; $('#dropzone').hidden = true;
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (!files.length) return;
    e.preventDefault();
    const f = files[0];
    if (/^image\//.test(f.type)) { for (const im of files.filter((x) => /^image\//.test(x.type))) await insertImageFile(im); return; }
    if (state.dirty && !confirm('Es gibt nicht gespeicherte Änderungen. Trotzdem die Datei öffnen?')) return;
    let handle = null;
    try { if (e.dataTransfer.items && e.dataTransfer.items[0] && e.dataTransfer.items[0].getAsFileSystemHandle) handle = await e.dataTransfer.items[0].getAsFileSystemHandle(); } catch (err) { /* ohne Handle */ }
    await loadFile(f, handle && handle.kind === 'file' ? handle : null, false);
  });
  // Öffnen mit installierter PWA/Dateihandler
  if ('launchQueue' in window) window.launchQueue.setConsumer(async (p) => { if (p.files && p.files[0]) { const f = await p.files[0].getFile(); await loadFile(f, p.files[0], false); } });

  /* ------------------------------------------------------------------ */
  /*  Start                                                              */
  /* ------------------------------------------------------------------ */
  document.execCommand('defaultParagraphSeparator', false, 'p');
  try { if (localStorage.getItem('wohni-theme') === 'dark') root.dataset.theme = 'dark'; } catch (e) { /* egal */ }
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem('wohni-draft') || 'null'); } catch (e) { /* egal */ }
  if (draft && draft.html) {
    setDocument({ html: draft.html, header: draft.header, footer: draft.footer, settings: draft.settings }, draft.name || 'Dokument1', null);
    state.dirty = true; setDirty(true);
    toast('Nicht gespeicherter Entwurf wiederhergestellt.', 4500);
  } else {
    setDocument({ html: '<p><br></p>' }, 'Dokument1', null);
  }
  setZoom(100);
  if (window.innerWidth < 900) setZoom(Math.floor((window.innerWidth - 24) / (settings.w / 15) * 100));
  doc.focus();
})();
