/* Wohni Writer – Dateien: Öffnen, Speichern (auf dem Rechner), Export, Drucken, Autosave */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;

  const Fi = (W.files = { autosaveKey: 'wohni.autosave' });
  W.fileName = null;
  W.fileHandle = null;

  const DOCX_TYPE = { description: 'Word-Dokument', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } };
  const safeName = (n) => (n || 'Dokument').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Dokument';

  /* ---------------------------------------------------------------- */
  /*  Öffnen                                                           */
  /* ---------------------------------------------------------------- */
  Fi.openDialog = async function () {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'Dokumente', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx', '.dotx'], 'text/plain': ['.txt', '.md'], 'text/html': ['.html', '.htm'] } }], multiple: false });
        const file = await handle.getFile();
        await Fi.openFile(file, handle);
      } catch (e) { if (e.name !== 'AbortError') W.toast('Öffnen fehlgeschlagen: ' + e.message); }
      return;
    }
    W.$('#fileOpen').click();
  };

  async function confirmDiscard() {
    if (!W.dirty) return true;
    return new Promise((res) => {
      W.ui.dialog({
        title: 'Ungespeicherte Änderungen', width: 420, body: h('p', 'Das aktuelle Dokument enthält Änderungen, die noch nicht gespeichert wurden. Trotzdem fortfahren?'),
        buttons: [{ label: 'Abbrechen', onClick: () => res(false) }, { label: 'Verwerfen und fortfahren', primary: true, onClick: () => res(true) }], onClose: (ok) => { if (!ok) res(false); }, refocus: false,
      });
    });
  }

  Fi.openFile = async function (file, handle, opts) {
    opts = opts || {};
    if (!opts.skipConfirm && !(await confirmDiscard())) return;
    const name = file.name || 'Dokument';
    try {
      W.toast('„' + name + '“ wird geöffnet …', 1800);
      if (/\.(docx|dotx|docm)$/i.test(name) || file.type.includes('wordprocessingml')) {
        const buf = await file.arrayBuffer();
        const r = await W.docx.import(buf, name);
        r.doc.floats = await W.docx.finalizeFloats(r.floats);
        W.loadDocument(r.doc, r.html, { handle: handle || null, noFocus: false });
        if (W.floats.resolvePending()) { W.layout.run(); W.history.reset(); }
        W.fileName = name.replace(/\.(dotx|docm)$/i, '.docx');
        if (/\.dotx$/i.test(name)) { W.fileHandle = null; W.fileName = null; }
      } else if (/\.(html?|htm)$/i.test(name)) {
        const text = await file.text();
        const html = W.fmt.sanitize(new DOMParser().parseFromString(text, 'text/html').body.innerHTML);
        const d = W.defaultDoc(); d.title = name.replace(/\.[^.]+$/, '');
        W.loadDocument(d, html || '<p><br></p>', { handle: null });
        W.fileName = null; W.fileHandle = null;
      } else {
        const text = await file.text();
        const d = W.defaultDoc(); d.title = name.replace(/\.[^.]+$/, '');
        const html = text.replace(/\r\n?/g, '\n').split('\n').map((l) => `<p>${W.esc(l) || '<br>'}</p>`).join('');
        W.loadDocument(d, html, { handle: null });
        W.fileName = null; W.fileHandle = null;
      }
      W.dirty = false; W.emit('saved');
      W.toast('„' + name + '“ geöffnet');
    } catch (e) {
      console.error(e);
      W.ui.dialog({ title: 'Datei konnte nicht geöffnet werden', width: 440, body: h('p', e.message || String(e)) });
    }
  };

  /** Inhalt einer Datei an der Cursorposition einfügen */
  Fi.insertFileDialog = function () { W.$('#fileInsert').click(); };
  Fi.insertFile = async function (file) {
    try {
      let html;
      if (/\.docx$/i.test(file.name)) {
        const r = await W.docx.import(await file.arrayBuffer(), file.name);
        html = r.html;
        const fl = await W.docx.finalizeFloats(r.floats);
        // freie Objekte kommen an die aktuelle Seite
        const cur = W.view.currentPage();
        fl.forEach((f) => { delete f.pending; f.page = cur; f.y = Math.min(f.y || 40, 300); });
        W.doc.floats.push(...fl.filter((f) => !f.repeat));
      } else {
        const text = await file.text();
        html = /\.html?$/i.test(file.name) ? W.fmt.sanitize(text) : text.replace(/\r\n?/g, '\n').split('\n').map((l) => `<p>${W.esc(l) || '<br>'}</p>`).join('');
      }
      W.fmt.refocus();
      W.layout.beginEdit();
      document.execCommand('insertHTML', false, html);
      W.layout.schedule(true); W.history.push();
      W.toast('Inhalt von „' + file.name + '“ eingefügt');
    } catch (e) { W.ui.dialog({ title: 'Einfügen fehlgeschlagen', width: 420, body: h('p', e.message || String(e)) }); }
  };

  /* ---------------------------------------------------------------- */
  /*  Speichern                                                        */
  /* ---------------------------------------------------------------- */
  async function build() {
    W.toast('Dokument wird erstellt …', 1200);
    return W.docx.export();
  }
  async function writeHandle(handle, blob) {
    const w = await handle.createWritable();
    await w.write(blob); await w.close();
  }
  Fi.save = async function () {
    if (W.fileHandle) {
      try { const blob = await build(); await writeHandle(W.fileHandle, blob); markSaved(); return true; }
      catch (e) { if (e.name === 'AbortError') return false; console.warn(e); }
    }
    return Fi.saveAs();
  };
  Fi.saveAs = async function () {
    let blob;
    try { blob = await build(); } catch (e) { console.error(e); W.ui.dialog({ title: 'Speichern fehlgeschlagen', width: 460, body: h('p', 'Das Dokument konnte nicht in das Word-Format umgewandelt werden: ' + e.message) }); return false; }
    const suggested = safeName(W.doc.title) + '.docx';
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: suggested, types: [DOCX_TYPE] });
        await writeHandle(handle, blob);
        W.fileHandle = handle; W.fileName = handle.name;
        W.doc.title = handle.name.replace(/\.docx$/i, ''); document.title = W.doc.title + ' – Wohni Writer';
        W.emit('docloaded', W.doc);
        markSaved(); return true;
      } catch (e) { if (e.name === 'AbortError') return false; console.warn('Speichern-Dialog nicht verfügbar:', e); }
    }
    W.download(blob, suggested);
    W.fileName = suggested;
    markSaved();
    W.toast('Als „' + suggested + '“ in deinen Downloads-Ordner gespeichert');
    return true;
  };
  function markSaved() { W.dirty = false; Fi.clearAutosave(); W.emit('saved'); W.toast('Gespeichert', 1500); }

  Fi.exportHTML = async function () {
    const clone = W.layout.cleanClone();
    clone.querySelectorAll('p.brk').forEach((b) => b.remove());
    // Bilder einbetten
    for (const img of clone.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:')) { const b = await W.getAssetBlob(src); if (b) img.setAttribute('src', await W.blobToDataURL(b)); }
    }
    const css = 'body{font-family:Calibri,Carlito,Arial,sans-serif;font-size:11pt;line-height:1.3;max-width:800px;margin:2em auto;padding:0 1em}table{border-collapse:collapse}td{padding:2px 6px;vertical-align:top}img{max-width:100%}';
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${W.esc(W.doc.title)}</title><style>${css}</style></head><body>${clone.innerHTML}</body></html>`;
    W.download(new Blob([html], { type: 'text/html' }), safeName(W.doc.title) + '.html');
  };
  Fi.exportText = function () {
    const clone = W.layout.cleanClone();
    const text = Array.from(clone.querySelectorAll('p,h1,h2,h3,h4,h5,h6')).filter((p) => !p.classList.contains('brk')).map((p) => W.stripZW(p.textContent)).join('\n');
    W.download(new Blob([text], { type: 'text/plain;charset=utf-8' }), safeName(W.doc.title) + '.txt');
  };

  /* ---------------------------------------------------------------- */
  /*  Neu / Vorlagen                                                   */
  /* ---------------------------------------------------------------- */
  Fi.newDoc = async function (tplId) {
    if (!(await confirmDiscard())) return;
    W.templates.open(tplId || 'blank');
    W.fileHandle = null; W.fileName = null; W.dirty = false;
    Fi.clearAutosave();
    W.emit('saved');
  };

  /* ---------------------------------------------------------------- */
  /*  Drucken / PDF                                                    */
  /* ---------------------------------------------------------------- */
  Fi.print = function () {
    W.history.flush();
    if (W.hf.editing) W.hf.stop();
    if (W.floats.editing) W.floats.stopEdit();
    W.floats.deselect();
    W.layout.run();
    const G = W.geom();
    const pageCount = W.layout.info.pageCount;
    const web = W.doc.view === 'web';
    let root = W.$('#printroot');
    if (root) root.remove();
    root = h('div#printroot');
    // Jede Seite = Ausschnitt des Dokument-Stapels (gleiche Darstellung wie am Bildschirm)
    const pages = W.el.pages;
    const pageH = W.layout.pageH;
    for (let i = 0; i < pageCount; i++) {
      const top = web ? 0 : i * G.stride;
      const pg = h('div.printpage', { style: { width: G.pw + 'px', height: (pageH - 0.5) + 'px' } });
      const inner = pages.cloneNode(true);
      inner.removeAttribute('id');
      inner.classList.add('print');
      inner.style.cssText = `position:absolute;left:0;top:${-top}px;width:${G.pw}px;height:${pages.style.height};transform:none`;
      inner.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      // Nur die eigene Seite: andere Blätter ausblenden
      Array.from(inner.querySelector('.sheet') ? inner.querySelectorAll('.sheet') : []).forEach((s, k) => { s.style.boxShadow = 'none'; if (k !== i) s.style.display = 'none'; });
      inner.querySelectorAll('.fsel').forEach((e) => e.remove());
      inner.querySelectorAll('.hfbox').forEach((e) => { e.style.opacity = '1'; });
      inner.querySelectorAll('[contenteditable]').forEach((e) => e.removeAttribute('contenteditable'));
      pg.appendChild(inner);
      root.appendChild(pg);
    }
    const style = h('style', `@page{size:${(G.pw / 96).toFixed(3)}in ${(pageH / 96).toFixed(3)}in;margin:0}`);
    root.appendChild(style);
    document.body.appendChild(root);
    const done = () => { root.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(() => { if (root.isConnected && !('onafterprint' in window)) done(); }, 1500); }, 60);
  };

  /* ---------------------------------------------------------------- */
  /*  Autosave (IndexedDB)                                             */
  /* ---------------------------------------------------------------- */
  const DBN = 'wohni-writer', STORE = 'kv';
  function idb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('kein IndexedDB'));
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function idbSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
  async function idbDel(k) { try { const d = await idb(); d.transaction(STORE, 'readwrite').objectStore(STORE).delete(k); } catch (e) { /* */ } }

  Fi.autosaveEnabled = () => { try { return localStorage.getItem('wohni.autosave') !== '0'; } catch (e) { return true; } };
  Fi.setAutosave = (on) => { try { localStorage.setItem('wohni.autosave', on ? '1' : '0'); } catch (e) { /* */ } if (!on) Fi.clearAutosave(); };
  Fi.clearAutosave = () => idbDel(Fi.autosaveKey);

  async function snapshotForStorage() {
    const html = W.layout.serialize();
    const doc = JSON.parse(JSON.stringify(W.doc));
    const urls = new Set();
    const collect = (s) => { (s.match(/blob:[^"')\s]+/g) || []).forEach((u) => urls.add(u)); };
    collect(html); doc.floats.forEach((f) => { if (f.src) urls.add(f.src); });
    collect(JSON.stringify(doc));
    const assets = {};
    for (const u of urls) { const b = await W.getAssetBlob(u); if (b) assets[u] = { type: b.type, data: await b.arrayBuffer() }; }
    return { v: 1, html, doc, assets, name: W.fileName, saved: Date.now() };
  }
  const doAutosave = W.debounce(async () => {
    if (!W.dirty || !Fi.autosaveEnabled()) return;
    try { await idbSet(Fi.autosaveKey, await snapshotForStorage()); } catch (e) { console.warn('Autosave fehlgeschlagen', e); }
  }, 2500);
  W.on('change', doAutosave);

  Fi.restoreAutosave = async function () {
    if (!Fi.autosaveEnabled()) return false;
    let snap;
    try { snap = await idbGet(Fi.autosaveKey); } catch (e) { return false; }
    if (!snap || !snap.html || !/\S/.test(snap.html.replace(/<[^>]*>/g, ''))) {
      if (!snap || !snap.doc || !snap.doc.floats || !snap.doc.floats.length) return false;
    }
    // Bilder neu erzeugen
    const map = {};
    for (const k in snap.assets || {}) map[k] = W.addAsset(new Blob([snap.assets[k].data], { type: snap.assets[k].type }), snap.assets[k].type);
    const swap = (s) => s.replace(/blob:[^"')\s]+/g, (m) => map[m] || m);
    const html = swap(snap.html);
    const doc = JSON.parse(swap(JSON.stringify(snap.doc)));
    W.loadDocument(doc, html, { dirty: true, noFocus: true });
    W.fileName = snap.name || null;
    W.toast('Letzte Sitzung wiederhergestellt – speichere das Dokument, um es zu behalten.', 4500);
    W.emit('saved'); W.dirty = true; W.emit('change');
    return true;
  };

  /* ---------------------------------------------------------------- */
  /*  Datei-Eingaben und Drag & Drop                                   */
  /* ---------------------------------------------------------------- */
  function bindInputs() {
    W.$('#fileOpen').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) Fi.openFile(f, null); });
    W.$('#fileInsert').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) Fi.insertFile(f); });
    W.$('#fileImage').addEventListener('change', async (e) => {
      const files = Array.from(e.target.files); e.target.value = '';
      for (const f of files) await W.cmd.insertImageFile(f, W.pendingImageMode || 'inline');
    });
    let depth = 0;
    const isFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    window.addEventListener('dragenter', (e) => { if (isFiles(e)) { depth++; document.body.classList.add('dropping'); } });
    window.addEventListener('dragleave', (e) => { if (isFiles(e) && --depth <= 0) { depth = 0; document.body.classList.remove('dropping'); } });
    window.addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', async (e) => {
      if (!isFiles(e)) return;
      e.preventDefault(); depth = 0; document.body.classList.remove('dropping');
      const files = Array.from(e.dataTransfer.files);
      const doc = files.find((f) => /\.(docx|dotx|docm|txt|md|html?)$/i.test(f.name));
      if (doc) {
        let handle = null;
        try { const it = e.dataTransfer.items && e.dataTransfer.items[0]; if (it && it.getAsFileSystemHandle) handle = await it.getAsFileSystemHandle(); } catch (err) { /* */ }
        Fi.openFile(doc, handle && handle.kind === 'file' ? handle : null);
        return;
      }
      const imgs = files.filter((f) => /^image\//.test(f.type));
      for (const f of imgs) await W.cmd.insertImageFile(f, 'inline');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindInputs); else bindInputs();
})();
