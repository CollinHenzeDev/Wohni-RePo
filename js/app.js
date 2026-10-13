/* Wohni Writer – Start, Ansicht (Zoom), Eingabe-Ereignisse, Tastenkürzel */
(function () {
  'use strict';
  const W = window.W;

  /* ------------------------------------------------------------------ */
  /*  Ansicht / Zoom                                                      */
  /* ------------------------------------------------------------------ */
  const V = (W.view = { zoom: 1 });

  V.resize = function () {
    const pages = W.el.pages, sizer = W.el.sizer;
    const w = parseFloat(pages.style.width) || W.geom().pw;
    const h = parseFloat(pages.style.height) || W.geom().ph;
    sizer.style.width = w * V.zoom + 'px';
    sizer.style.height = h * V.zoom + 'px';
    pages.style.transform = V.zoom === 1 ? '' : `scale(${V.zoom})`;
    pages.style.width = w + 'px';
    pages.style.setProperty('--zoom', String(V.zoom));
  };

  V.setZoom = function (z, keepCenter) {
    z = W.clamp(Math.round(z * 100) / 100, 0.25, 4);
    const ws = W.el.workspace;
    const prev = V.zoom;
    const cy = (ws.scrollTop + ws.clientHeight / 2) / prev;
    V.zoom = z;
    V.resize();
    if (keepCenter !== false) ws.scrollTop = cy * z - ws.clientHeight / 2;
    W.layout.G && W.floats.renderSel();
    W.emit('zoom', z);
  };
  V.fitWidth = function () {
    const G = W.geom();
    V.setZoom((W.el.workspace.clientWidth - 56) / G.pw);
  };
  V.fitPage = function () {
    const G = W.geom();
    V.setZoom(Math.min((W.el.workspace.clientHeight - 48) / G.ph, (W.el.workspace.clientWidth - 56) / G.pw));
  };
  V.currentPage = function () {
    const ws = W.el.workspace;
    const G = W.layout.G || W.geom();
    const y = (ws.scrollTop + ws.clientHeight * 0.4 - W.el.sizer.offsetTop) / V.zoom;
    if (W.doc.view === 'web') return 0;
    return W.clamp(Math.floor(y / G.stride), 0, W.layout.info.pageCount - 1);
  };
  V.scrollToPage = function (p) {
    const G = W.layout.G || W.geom();
    W.el.workspace.scrollTop = W.el.sizer.offsetTop + p * G.stride * V.zoom - 16;
  };
  V.setMode = function (mode) {
    W.doc.view = mode;
    W.layout.schedule(true);
    W.emit('viewmode', mode);
  };

  W.ui = W.ui || {};
  Object.assign(W.ui, {
    ensureCaretVisible() {
      const rc = W.sel.caretRect();
      if (!rc) return;
      const ws = W.el.workspace.getBoundingClientRect();
      const m = 60;
      if (rc.bottom > ws.bottom - m) W.el.workspace.scrollTop += rc.bottom - ws.bottom + m;
      else if (rc.top < ws.top + m) W.el.workspace.scrollTop -= ws.top + m - rc.top;
      if (rc.right > ws.right - 20) W.el.workspace.scrollLeft += rc.right - ws.right + 40;
      else if (rc.left < ws.left + 20) W.el.workspace.scrollLeft -= ws.left + 20 - rc.left;
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Dokument laden / neu                                                */
  /* ------------------------------------------------------------------ */
  /** doc: Dokumentmodell, html: Fließtext */
  W.loadDocument = function (doc, html, opts) {
    opts = opts || {};
    W.floats.deselect(true);
    W.hf.editing && W.hf.stop();
    W.doc = Object.assign(W.defaultDoc(), doc || {});
    W.doc.page = Object.assign(W.defaultDoc().page, W.doc.page);
    W.doc.cols = Object.assign(W.defaultDoc().cols, W.doc.cols);
    W.el.flow.innerHTML = html || '<p><br></p>';
    W.emit('restored');
    W.layout.run();
    W.history.reset();
    W.dirty = !!opts.dirty;
    W.fileHandle = opts.handle || null;
    W.emit('docloaded', W.doc);
    W.view.fitWidthIfNeeded && W.view.fitWidthIfNeeded();
    document.title = W.doc.title + ' – Wohni Writer';
    if (!opts.noFocus) { W.el.flow.focus({ preventScroll: true }); W.sel.caretIn(W.el.flow.querySelector('p,h1,h2,h3') || W.el.flow, false); }
    W.el.workspace.scrollTop = 0;
  };

  /* ------------------------------------------------------------------ */
  /*  Eingabe-Ereignisse                                                  */
  /* ------------------------------------------------------------------ */
  const STRUCT = /^(insertParagraph|insertLineBreak|delete|insertFromPaste|insertFromDrop|insertReplacementText|formatBlock|insertOrderedList|insertUnorderedList|indent|outdent|insertHorizontalRule|insertFromYank|insertTranspose)/;

  function bindEditor() {
    const flow = W.el.flow;
    flow.setAttribute('data-root', '');

    let lastKind = '';
    const kindOf = (t) => (/^insertParagraph|^insertLineBreak/.test(t) ? 'struct' : /^delete/.test(t) ? 'delete' : /^insert(Text|Compos)/.test(t) ? 'type' : 'other');
    flow.addEventListener('beforeinput', (e) => {
      const t = e.inputType;
      if (t === 'historyUndo') { e.preventDefault(); W.history.undo(); return; }
      if (t === 'historyRedo') { e.preventDefault(); W.history.redo(); return; }
      // Art der Eingabe wechselt (Tippen -> Löschen -> Enter): vorherigen Schritt abschließen
      const k = kindOf(t);
      if (k !== lastKind || k === 'struct' || k === 'other') W.history.flush();
      lastKind = k;
      if (STRUCT.test(t) || (t === 'insertText' && !getSelection().isCollapsed)) W.layout.beginEdit();
    });

    flow.addEventListener('input', (e) => {
      if (W.composing) return;
      fixAfterEnter(e);
      const simple = e.inputType === 'insertText' || e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward';
      if (!(simple && W.layout.canSkip())) W.layout.schedule(flow.children.length < 250); else W.emit('typed');
      const k = kindOf(e.inputType || '');
      if (k === 'struct' || k === 'other') W.history.push(); else W.history.schedule();
      W.markDirty();
      W.fmt.refreshState();
      W.ui.ensureCaretVisible();
    });
    flow.addEventListener('compositionstart', () => { W.composing = true; });
    flow.addEventListener('compositionend', () => { W.composing = false; W.layout.schedule(); W.history.schedule(); });

    flow.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onGlobalKey);

    // Klick ins Leere (Seitenrand, unter dem Text) setzt den Cursor in den nächsten Block
    W.el.pages.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const t = e.target;
      if (t.closest('#flow, .fobj, .fsel, .hfbox')) return;
      if (W.hf.editing) W.hf.stop();
      if (W.floats.selected) W.floats.deselect();
      const blocks = Array.from(flow.children).filter((b) => b.matches('p,h1,h2,h3,h4,h5,h6,table') && !b.matches('.brk'));
      if (!blocks.length) return;
      let best = null, bd = 1e9;
      const P = W.layout.clientToPage(e.clientX, e.clientY);
      const pg = W.layout.pageMap;
      for (const b of blocks) {
        const bp = pg.get(b) || 0;
        const r = b.getBoundingClientRect();
        const dy = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0;
        const dx = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
        const d = dy * 3 + dx + Math.abs(bp - P.page) * 5000;
        if (d < bd) { bd = d; best = { b, r }; }
      }
      if (!best) return;
      e.preventDefault();
      flow.focus({ preventScroll: true });
      const x = W.clamp(e.clientX, best.r.left + 2, best.r.right - 2), y = W.clamp(e.clientY, best.r.top + 2, best.r.bottom - 2);
      const rg = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      if (rg && flow.contains(rg.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(rg); }
      else W.sel.caretIn(best.b.matches('table') ? best.b.querySelector('p') : best.b, true);
    });

    // Kopf-/Fußzeile per Doppelklick im Seitenrand
    W.el.pages.addEventListener('dblclick', (e) => {
      const hfb = e.target.closest('.hfbox');
      if (hfb && !W.hf.editing) { W.hf.edit(hfb); e.preventDefault(); return; }
      if (e.target.closest('#flow, .fobj, .fsel, .hfbox') || W.hf.editing) return;
      const P = W.layout.clientToPage(e.clientX, e.clientY);
      const G = W.layout.G || W.geom();
      const kind = P.y < G.mt ? 'header' : P.y > G.ph - G.mb ? 'footer' : null;
      if (!kind) return;
      const box = Array.from(W.el.hf.children).find((b) => b.dataset.kind === kind && +b.dataset.page === P.page);
      if (box) { W.hf.edit(box); e.preventDefault(); }
    });

    // Kopf-/Fußzeilenbearbeitung beenden: Klick in den Text oder Esc
    flow.addEventListener('mousedown', () => { if (W.hf.editing) W.hf.stop(); });
    W.el.hf.addEventListener('input', () => { if (W.hf.editing) { W.hf.sync(); W.history.schedule(); W.markDirty(); } });
    W.el.hf.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && W.hf.editing) { e.preventDefault(); W.hf.stop(); }
      onKey(e);
    });

    // Links nur mit Strg-Klick folgen
    flow.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (a && (e.ctrlKey || e.metaKey)) { window.open(a.getAttribute('href'), '_blank', 'noopener'); e.preventDefault(); }
    });

    // Zellen-/Selektionszustand
    document.addEventListener('selectionchange', () => { if (W.floats.selected && !W.floats.selected.inline && !getSelection().isCollapsed) { /* Text markiert → Objekt abwählen */ } });

    window.addEventListener('beforeunload', (e) => { if (W.dirty && !W.noUnloadWarning) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('resize', () => { W.floats.renderSel(); });
    W.el.workspace.addEventListener('scroll', () => W.emit('scroll'), { passive: true });

    // Strg+Mausrad = Zoom
    W.el.workspace.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      V.setZoom(V.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    }, { passive: false });
  }

  /** Nach Enter: Überschrift → neuer Absatz im Standardformat */
  function fixAfterEnter(e) {
    if (e.inputType !== 'insertParagraph') return;
    const s = getSelection();
    if (!s.rangeCount) return;
    let blk = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    blk = blk && blk.closest('p,h1,h2,h3,h4,h5,h6');
    if (!blk) return;
    const prev = blk.previousElementSibling;
    const empty = !blk.textContent.replace(/​/g, '').length && !blk.querySelector('img,.fld');
    // stale Layout-Eigenschaften der Kopie entfernen
    blk.removeAttribute('data-split'); blk.removeAttribute('data-cont');
    if (prev) { prev.removeAttribute('data-split'); }
    if (empty && prev && !blk.hasAttribute('data-list')) {
      const prevStyle = W.fmt.styleOf(prev);
      if (/^h[1-6]$/.test(prevStyle) || prevStyle === 'title' || prevStyle === 'subtitle' || prevStyle === 'caption') {
        const sel = W.sel.save();
        Array.from(blk.classList).filter((c) => c.startsWith('s-')).forEach((c) => blk.classList.remove(c));
        if (!blk.getAttribute('class')) blk.removeAttribute('class');
        const nb = W.fmt.retag(blk, 'p');
        nb.removeAttribute('style');
        ['margin-top', 'margin-bottom'].forEach((pp) => nb.style.removeProperty(pp));
        W.sel.restore(sel);
      }
    }
  }

  function onKey(e) {
    if (e.defaultPrevented) return;
    // Listen und Tabellen haben Vorrang
    if (W.lists.onKeydown(e)) return;
    if (W.tables.onKeydown(e)) return;
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const sel = getSelection();
      const el = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      const blk = el && el.closest('p[data-tabs]');
      if (blk) document.execCommand('insertHTML', false, '<span class="tabc">\t</span>');
      else document.execCommand('insertText', false, '\t');
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) W.cmd.columnBreak(); else W.cmd.pageBreak();
      return;
    }
  }

  const KEYS = {
    s: (e) => (e.shiftKey ? W.files.saveAs() : W.files.save()),
    o: () => W.files.openDialog(),
    n: () => W.files.newDoc(),
    p: () => W.files.print(),
    f: () => W.find.open(false),
    h: () => W.find.open(true),
    g: () => W.find.open(true),
    k: () => W.dialogs.link(),
    e: () => W.cmd.alignCenter(),
    l: (e) => (e.shiftKey ? W.cmd.bullets() : W.cmd.alignLeft()),
    r: () => W.cmd.alignRight(),
    j: () => W.cmd.alignJustify(),
    ']': () => W.cmd.sizeUp(),
    '[': () => W.cmd.sizeDown(),
    '>': () => W.cmd.sizeUp(),
    '<': () => W.cmd.sizeDown(),
    '=': (e) => (e.shiftKey ? W.cmd.sup() : W.cmd.sub()),
    ' ': () => W.cmd.clearFormat(),
    '1': (e) => e.altKey && W.cmd.style('h1'),
    '2': (e) => e.altKey && W.cmd.style('h2'),
    '3': (e) => e.altKey && W.cmd.style('h3'),
    '0': (e) => { if (!e.altKey) { W.view.setZoom(1); } },
  };
  function onGlobalKey(e) {
    const mod = W.mod(e);
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); W.history.undo(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); W.history.redo(); return; }
    const inEditor = e.target.closest && e.target.closest('[data-root]');
    const global = ['s', 'o', 'n', 'p', 'f', 'h'];
    if (!inEditor && !global.includes(k) && !W.floats.selected) return;
    if (e.target.closest && e.target.closest('input,textarea,select')) { if (!['s', 'o', 'p'].includes(k)) return; }
    const fn = KEYS[e.key] || KEYS[k];
    if (fn) {
      if (e.altKey && !['1', '2', '3'].includes(k)) return;
      if (fn(e) !== false) e.preventDefault();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Start                                                               */
  /* ------------------------------------------------------------------ */
  function init() {
    W.initEls();
    try { if (localStorage.getItem('wohni.dark') === '1') document.body.classList.add('dark'); } catch (e) { /* */ }
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ }
    try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* */ }
    W.el.app.tabIndex = -1;
    bindEditor();
    W.ribbon && W.ribbon.build();
    // Startdokument: letzte Sitzung oder leer
    const start = async () => {
      let restored = false;
      if (W.files && W.files.restoreAutosave) restored = await W.files.restoreAutosave();
      if (!restored) W.templates.openBlank();
      V.resize();
      V.fitWidthIfNeeded = null;
      const ws = W.el.workspace;
      if (ws.clientWidth < W.geom().pw + 60) V.fitWidth(); else V.setZoom(1, false);
      W.el.flow.focus({ preventScroll: true });
      W.emit('ready');
      try {
        if (!localStorage.getItem('wohni.welcome') && !restored) {
          localStorage.setItem('wohni.welcome', '1');
          W.toast('Willkommen! Word-Dateien (.docx) kannst du hierher ziehen oder über Datei → Öffnen laden. Vorlagen, z. B. für Lebensläufe, findest du unter Datei → Neu.', 9000);
        }
      } catch (e) { /* */ }
    };
    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
