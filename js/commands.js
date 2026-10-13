/* Wohni Writer – weitere Befehle: Seite/Spalten, Bilder, Objekte, Verzeichnis, Ansicht */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;
  const u = W.u;

  const C = W.cmd;

  /* ---------- Seite ---------- */
  C.margins = function (key) {
    const m = W.MARGIN_PRESETS[key]; if (!m) return;
    W.edit(() => { Object.assign(W.doc.page, { t: u.cm2px(m.t), b: u.cm2px(m.b), l: u.cm2px(m.l), r: u.cm2px(m.r) }); });
  };
  C.orientation = function (o) {
    W.edit(() => {
      const p = W.doc.page;
      const mx = Math.max(p.w, p.h), mn = Math.min(p.w, p.h);
      p.orient = o;
      if (o === 'landscape') { p.w = mx; p.h = mn; } else { p.w = mn; p.h = mx; }
    });
  };
  C.pageSize = function (k) {
    const s = W.PAGE_SIZES[k]; if (!s) return;
    W.edit(() => {
      const p = W.doc.page;
      p.size = k;
      const w = u.mm2px(s.w), hh = u.mm2px(s.h);
      if (p.orient === 'landscape') { p.w = hh; p.h = w; } else { p.w = w; p.h = hh; }
    });
  };
  C.pageColor = (c) => W.edit(() => { W.doc.page.color = c || '#ffffff'; });
  C.docFont = (f) => W.edit(() => { W.doc.font = f; });

  /* ---------- Spalten ---------- */
  C.columns = function (preset) {
    const p = W.COLUMN_PRESETS[preset]; if (!p) return;
    const cur = W.doc.cols;
    C.applyColumns({ n: p.n, w: p.w.slice(), gap: cur.gap, rule: cur.rule, bg: (preset === 'one' ? [null, null, null] : cur.bg || [null, null, null]), bleed: cur.bleed, mainOnly: preset === 'one' ? false : cur.mainOnly, preset }, 'all');
  };
  C.applyColumns = function (cfg, scope) {
    if (scope === 'here') {
      W.fmt.insertBreak('sect', { cols: { n: cfg.n, w: cfg.w, gap: cfg.gap, rule: cfg.rule, bg: cfg.bg, bleed: cfg.bleed, mainOnly: cfg.mainOnly } });
      return;
    }
    W.edit(() => {
      W.doc.cols = Object.assign({}, W.doc.cols, cfg, { preset: cfg.preset || 'custom' });
      W.el.flow.querySelectorAll('p.brk[data-brk="sect"],p.brk[data-brk="sectnext"]').forEach((b) => b.setAttribute('data-cols', JSON.stringify({ n: cfg.n, w: cfg.w, gap: cfg.gap, rule: cfg.rule, bg: cfg.bg, bleed: cfg.bleed, mainOnly: cfg.mainOnly })));
    });
  };

  /* ---------- Leere Seite ---------- */
  C.blankPage = function () {
    W.fmt.insertBreak('page');
    W.fmt.insertBreak('page');
  };

  /* ---------- Absatz-Felder aus dem Layout-Tab ---------- */
  C.indentLeft = (cmv) => W.fmt.setBlockStyle({ 'margin-left': u.cm2px(+cmv || 0).toFixed(1) + 'px' });
  C.indentRight = (cmv) => W.fmt.setBlockStyle({ 'margin-right': u.cm2px(+cmv || 0).toFixed(1) + 'px' });
  C.rowHeight = function () {
    const i = W.ui.f.num(1, { w: 80 });
    W.ui.dialog({ title: 'Zeilenhöhe', width: 320, body: h('div', W.ui.f.row('Mindesthöhe (cm):', i), h('p.muted', '0 = automatisch')), buttons: [{ label: 'Abbrechen' }, { label: 'OK', primary: true, onClick: () => { setTimeout(() => { W.fmt.refocus(); W.tables.setRowHeight(+i.value ? u.cm2px(+i.value) : 0); }, 0); } }], refocus: false });
  };

  /* ---------- Bilder ---------- */
  C.pickImage = function (mode) {
    W.pendingImageMode = mode || 'inline';
    W.$('#fileImage').click();
  };
  C.insertImageFile = async function (file, mode) {
    const blob = file;
    const type = blob.type || 'image/png';
    const url = W.addAsset(blob, type);
    mode = mode || 'inline';
    if (mode !== 'inline') { await W.floats.insertImageFloat(url, { wrap: mode, name: file.name || '' }); return; }
    const sz = await W.imageSize(url);
    const G = W.geom();
    // Breite der aktuellen Spalte
    const cg = W.colGeom(W.doc.cols, G.cw);
    const maxW = Math.min(...cg.map((c) => c.w)) * 0.98;
    let w = sz.w, hh = sz.h;
    const s = Math.min(1, maxW / w, (G.ch * 0.8) / hh);
    w = Math.round(w * s); hh = Math.round(hh * s);
    W.fmt.refocus();
    W.fmt.insertHTMLAtCaret(`<img src="${url}" width="${w}" height="${hh}" style="width:${w}px;height:${hh}px" alt="${W.esc(file.name || '')}">`);
    const img = Array.from(W.el.flow.querySelectorAll('img')).find((i) => i.getAttribute('src') === url);
    if (img) W.floats.selectInline(img);
  };
  C.wrap = function (type) {
    if (!W.floats.selected) { W.toast('Wähle zuerst ein Bild oder eine Form aus.'); return; }
    W.floats.setWrap(type);
  };
  C.objSize = function (wcm, hcm) {
    const s = W.floats.selected; if (!s) return;
    if (s.inline) {
      const img = s.inline;
      const r = img.getBoundingClientRect(); const z = W.view.zoom;
      const ratio = r.width / r.height;
      let w = wcm != null ? u.cm2px(wcm) : null, hh = hcm != null ? u.cm2px(hcm) : null;
      if (w != null && hh == null) hh = w / ratio; if (hh != null && w == null) w = hh * ratio;
      W.layout.beginEdit();
      img.style.width = w + 'px'; img.style.height = hh + 'px'; img.setAttribute('width', Math.round(w)); img.setAttribute('height', Math.round(hh));
      W.layout.schedule(true); W.history.push(); W.floats.renderSel();
      return;
    }
    const f = s.float;
    let w = wcm != null ? u.cm2px(wcm) : f.w, hh = hcm != null ? u.cm2px(hcm) : f.h;
    if (f.lock && f.kind === 'image') { const ratio = f.w / f.h; if (wcm != null) hh = w / ratio; else w = hh * ratio; }
    W.floats.update({ w: Math.max(4, w), h: Math.max(2, hh) });
  };

  /* ---------- Kopf-/Fußzeile ---------- */
  C.editHF = function (kind) {
    const box = Array.from(W.el.hf.children).find((b) => b.dataset.kind === kind && +b.dataset.page === W.view.currentPage());
    if (box) { W.view.scrollToPage(+box.dataset.page); W.hf.edit(box); }
  };

  /* ---------- Beschriftung ---------- */
  C.caption = function () {
    W.edit(() => {
      const n = W.el.flow.querySelectorAll('p.s-caption').length + 1;
      const p = document.createElement('p');
      p.className = 's-caption';
      p.textContent = `Abbildung ${n}: Beschriftung`;
      W.fmt.insertBlockAfterSelection(p);
      const t = p.firstChild;
      const r = document.createRange(); r.setStart(t, `Abbildung ${n}: `.length); r.setEnd(t, t.nodeValue.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
  };

  /* ---------- Inhaltsverzeichnis ---------- */
  function buildToc() {
    const flow = W.el.flow;
    const heads = Array.from(flow.querySelectorAll('h1,h2,h3')).filter((e) => !e.hasAttribute('data-cont') && W.stripZW(e.textContent).trim());
    const out = [];
    const head = document.createElement('p');
    head.className = 's-tochead'; head.setAttribute('data-toc', '1'); head.setAttribute('contenteditable', 'false');
    head.textContent = 'Inhaltsverzeichnis';
    out.push(head);
    heads.forEach((e) => {
      const lvl = +e.tagName[1];
      const p = document.createElement('p');
      p.className = 's-toc' + lvl; p.setAttribute('data-toc', '1'); p.setAttribute('contenteditable', 'false');
      p.innerHTML = `<span class="toctext">${W.esc(W.stripZW(e.textContent))}</span><span class="tocdots"></span><span class="tocnum">${(W.layout.pageMap.get(e) || 0) + 1}</span>`;
      out.push(p);
    });
    if (!heads.length) {
      const p = document.createElement('p'); p.className = 's-toc1'; p.setAttribute('data-toc', '1'); p.setAttribute('contenteditable', 'false');
      p.innerHTML = '<span class="toctext"><i>Kein Eintrag gefunden – formatiere Text mit „Überschrift 1–3“.</i></span>';
      out.push(p);
    }
    return out;
  }
  C.toc = function () {
    W.edit(() => {
      const items = buildToc();
      const first = W.el.flow.querySelector('[data-toc]');
      if (first) { C.updateToc(true); return; }
      const r = W.sel.range(W.el.flow);
      let blk = r && W.sel.blocks(W.el.flow, r)[0];
      let top = blk; while (top && top.parentNode !== W.el.flow) top = top.parentNode;
      const ref = top ? top.previousElementSibling : null;
      items.forEach((it) => { if (top) W.el.flow.insertBefore(it, top); else W.el.flow.appendChild(it); });
    });
    C.updateToc(true);
  };
  C.updateToc = function (silent) {
    const flow = W.el.flow;
    const existing = Array.from(flow.querySelectorAll('[data-toc]'));
    if (!existing.length) { if (!silent) W.toast('Es gibt noch kein Inhaltsverzeichnis.'); return; }
    W.layout.beginEdit();
    W.layout.run();
    const items = buildToc();
    const ref = existing[0];
    items.forEach((it) => flow.insertBefore(it, ref));
    existing.forEach((e) => e.remove());
    W.layout.run();
    // Seitenzahlen nach neuem Umbruch noch einmal prüfen
    const heads = Array.from(flow.querySelectorAll('h1,h2,h3')).filter((e) => !e.hasAttribute('data-cont') && W.stripZW(e.textContent).trim());
    flow.querySelectorAll('p[data-toc] .tocnum').forEach((n, i) => { const e = heads[i]; if (e) n.textContent = String((W.layout.pageMap.get(e) || 0) + 1); });
    W.history.push();
  };
  C.removeToc = function () {
    W.edit(() => { W.el.flow.querySelectorAll('[data-toc]').forEach((e) => e.remove()); });
  };

  /* ---------- Überprüfen ---------- */
  C.toggleSpell = function () {
    const on = !W.el.flow.spellcheck;
    W.el.flow.spellcheck = on;
    W.el.flow.setAttribute('spellcheck', on ? 'true' : 'false');
    // Chrome prüft erneut, wenn der Editor den Fokus erhält
    W.el.flow.blur(); W.el.flow.focus();
    W.emit('state');
    W.toast(on ? 'Rechtschreibprüfung eingeschaltet' : 'Rechtschreibprüfung ausgeschaltet');
  };
  C.language = function (code) {
    W.el.flow.lang = code; W.doc.lang = code; document.documentElement.lang = code;
    const names = { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe' };
    const el = W.$$('.sitem', W.el.status).find((x) => Object.values(names).includes(x.textContent));
    if (el) el.textContent = names[code] || code;
    W.el.flow.blur(); W.el.flow.focus();
  };

  /* ---------- Ansicht ---------- */
  C.toggleMarks = function () { W.el.flow.classList.toggle('marks'); W.layout.schedule(true); W.emit('state'); };
  C.toggleNav = function (show) {
    const nav = W.el.navpane;
    nav.hidden = show == null ? !nav.hidden : !show;
    W.ribbon.drawNav && W.ribbon.drawNav();
    setTimeout(() => { W.emit('state'); }, 0);
  };
  C.toggleRuler = function () {
    const rb = W.el.rulerbar;
    rb.hidden = !rb.hidden;
    W.ruler && W.ruler.update();
    W.emit('state');
  };
  C.toggleDark = function () {
    document.body.classList.toggle('dark');
    try { localStorage.setItem('wohni.dark', document.body.classList.contains('dark') ? '1' : '0'); } catch (e) { /* */ }
    W.emit('state');
  };
  C.fullscreen = function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  };

  /* ---------- Auswahlbereich (Objekte der Seite) ---------- */
  C.selectionPane = function () {
    const sp = W.el.sidepane;
    if (!sp.hidden && sp.dataset.kind === 'objects') { sp.hidden = true; return; }
    sp.hidden = false; sp.dataset.kind = 'objects';
    drawObjects();
  };
  function drawObjects() {
    const sp = W.el.sidepane;
    if (sp.hidden || sp.dataset.kind !== 'objects') return;
    sp.innerHTML = '';
    sp.appendChild(h('div.navhead', h('b', 'Auswahlbereich'), h('button.qbtn', { type: 'button', title: 'Schließen', html: W.icon('close', 14), onclick: () => { sp.hidden = true; } })));
    const list = h('div.navlist');
    const fl = W.doc.floats.slice().reverse();
    if (!fl.length) list.appendChild(h('p.muted.pad', 'Keine freien Objekte auf dieser Seite. Füge Formen, Textfelder oder Bilder ein.'));
    fl.forEach((f) => {
      const sel = W.floats.selected && W.floats.selected.id === f.id;
      const wrapName = { behind: 'hinter dem Text', front: 'vor dem Text', square: 'Quadrat', topbottom: 'oben/unten' }[f.wrap] || f.wrap;
      const row = h('div.objrow' + (sel ? '.on' : ''),
        h('button.objname', { type: 'button', onclick: () => { W.view.scrollToPage(f.page); W.floats.select(f.id); } }, h('b', f.name), h('small', ` Seite ${f.page + 1} · ${wrapName}`)),
        h('button.qbtn', { type: 'button', title: f.hidden ? 'Einblenden' : 'Ausblenden', html: W.icon(f.hidden ? 'eyeoff' : 'eye', 16), onclick: () => { f.hidden = !f.hidden; W.floats.render(); W.history.push(); drawObjects(); } }),
        h('button.qbtn', { type: 'button', title: 'Nach vorne', html: W.icon('up', 14), onclick: () => { W.floats.select(f.id); W.floats.bringForward(); drawObjects(); } }),
        h('button.qbtn', { type: 'button', title: 'Nach hinten', html: W.icon('down', 14), onclick: () => { W.floats.select(f.id); W.floats.sendBackward(); drawObjects(); } }));
      list.appendChild(row);
    });
    sp.appendChild(list);
  }
  W.on('layout', W.debounce(drawObjects, 200));
  W.on('objselect', () => drawObjects());
  W.on('restored', () => setTimeout(drawObjects, 50));
})();
