/* Wohni Writer – eigene Rückgängig/Wiederholen-Historie (Snapshots).
   Die nativen Browser-Undo-Schritte wären durch programmatische Layout-Änderungen unbrauchbar. */
(function () {
  'use strict';
  const W = window.W;

  const H = (W.history = { stack: [], idx: -1, max: 150, restoring: false });
  const META_SKIP = ['title', 'author'];

  function takeSnapshot() {
    const meta = {};
    for (const k in W.doc) if (!META_SKIP.includes(k)) meta[k] = W.doc[k];
    return {
      html: W.layout.serialize(),
      meta: JSON.stringify(meta),
      sel: W.sel.save(W.el.flow),
    };
  }

  H.reset = function () {
    H.stack = []; H.idx = -1;
    clearTimeout(H.timer);
    H.push(true);
  };

  /** Neuen Zustand sofort festhalten */
  H.push = function (force) {
    if (H.restoring) return;
    clearTimeout(H.timer); H.timer = 0;
    const snap = takeSnapshot();
    const cur = H.stack[H.idx];
    if (cur && cur.html === snap.html && cur.meta === snap.meta && !force) {
      // Auswahl aktualisieren, Inhalt unverändert
      cur.sel = snap.sel || cur.sel;
      return false;
    }
    H.stack.length = H.idx + 1;
    H.stack.push(snap);
    if (H.stack.length > H.max) H.stack.shift();
    H.idx = H.stack.length - 1;
    W.markDirty();
    W.emit('history');
    return true;
  };

  /** Beim Tippen: Schritte zusammenfassen */
  H.schedule = function () {
    if (H.restoring) return;
    clearTimeout(H.timer);
    H.timer = setTimeout(() => { H.timer = 0; H.push(); }, 700);
  };

  /** Ausstehende Tipp-Änderungen sofort abschließen (vor Befehlen) */
  H.flush = function () { if (H.timer) H.push(); };

  function restore(snap) {
    H.restoring = true;
    try {
      const keep = { title: W.doc.title, author: W.doc.author };
      W.doc = Object.assign(W.defaultDoc(), JSON.parse(snap.meta), keep);
      W.el.flow.innerHTML = snap.html;
      W.layout.run();
      if (snap.sel) { W.el.flow.focus({ preventScroll: true }); W.sel.restore(snap.sel, W.el.flow); }
      W.emit('restored');
      W.markDirty();
      W.ui && W.ui.ensureCaretVisible && W.ui.ensureCaretVisible();
    } finally { H.restoring = false; }
  }

  H.undo = function () {
    H.flush();
    if (H.idx <= 0) return false;
    H.idx--;
    restore(H.stack[H.idx]);
    W.emit('history');
    return true;
  };
  H.redo = function () {
    H.flush();
    if (H.idx >= H.stack.length - 1) return false;
    H.idx++;
    restore(H.stack[H.idx]);
    W.emit('history');
    return true;
  };
  H.canUndo = () => H.idx > 0 || !!H.timer;
  H.canRedo = () => H.idx < H.stack.length - 1;

  /**
   * Hilfsfunktion für alle Befehle: Struktur vorbereiten, ausführen, Layout + Historie.
   * Der Befehl kann false zurückgeben, wenn nichts geändert wurde.
   */
  W.edit = function (fn, opts) {
    H.flush();
    W.layout.beginEdit();
    const res = fn();
    if (res === false) return false;
    W.layout.run();
    H.push();
    W.emit('edited');
    return true;
  };
})();
