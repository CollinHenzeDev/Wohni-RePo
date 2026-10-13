/* Wohni Writer – Lineal: Seitenränder ziehen, Absatz-Einzüge, Tabulatoren */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;
  const u = W.u;

  const R = (W.ruler = { drag: null });
  let track, marginL, marginR, hL, hR, mFirst, mHang, mRight, tabsLayer, colLayer;

  R.init = function () {
    const bar = W.el.rulerbar;
    bar.innerHTML = '';
    track = h('div.rulertrack');
    marginL = h('div.rmargin'); marginR = h('div.rmargin');
    colLayer = h('div.rcols');
    tabsLayer = h('div.rtabs');
    hL = h('div.rhandle', { title: 'Linker Seitenrand' });
    hR = h('div.rhandle', { title: 'Rechter Seitenrand' });
    mFirst = h('div.rind.first', { title: 'Erstzeileneinzug' });
    mHang = h('div.rind.hang', { title: 'Hängender Einzug / linker Einzug' });
    mRight = h('div.rind.right', { title: 'Rechter Einzug' });
    track.append(marginL, marginR, colLayer, tabsLayer, hL, hR, mFirst, mHang, mRight);
    bar.appendChild(track);
    bind(hL, 'ml'); bind(hR, 'mr'); bind(mFirst, 'first'); bind(mHang, 'hang'); bind(mRight, 'right');
    track.addEventListener('mousedown', onTrackClick);
    W.on('layout', R.update); W.on('zoom', R.update); W.on('selection', R.update); W.on('scroll', R.update);
    window.addEventListener('resize', R.update);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const z = () => W.view.zoom;

  R.update = function () {
    const bar = W.el.rulerbar;
    if (!bar || bar.hidden || !track) return;
    const G = W.layout.G || W.geom();
    const pr = W.el.pages.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const left = pr.left - br.left;
    const zz = z();
    track.style.left = left + 'px';
    track.style.width = G.pw * zz + 'px';
    // Skala neu zeichnen, wenn sich Seite/Zoom geändert hat
    const sig = [G.pw, G.ml, G.mr, zz].join('|');
    if (track._sig !== sig) {
      track._sig = sig;
      Array.from(track.querySelectorAll('.rtick,.rnumber')).forEach((e) => e.remove());
      const frag = document.createDocumentFragment();
      const cmPx = u.cm2px(1) * zz;
      const origin = G.ml * zz;
      const total = G.pw * zz;
      for (let i = -Math.floor(origin / cmPx * 2); origin + i * cmPx / 2 <= total; i++) {
        const x = origin + i * cmPx / 2;
        if (x < 0 || x > total) continue;
        const big = i % 2 === 0;
        const t = h('div.rtick' + (big ? '.big' : ''), { style: { left: x + 'px' } });
        frag.appendChild(t);
        if (big && i !== 0) frag.appendChild(h('div.rnumber', { style: { left: x + 'px' } }, String(Math.abs(i / 2))));
      }
      track.appendChild(frag);
    }
    marginL.style.cssText = `left:0;width:${G.ml * zz}px`;
    marginR.style.cssText = `left:${(G.pw - G.mr) * zz}px;width:${G.mr * zz}px`;
    hL.style.left = (G.ml * zz - 4) + 'px';
    hR.style.left = ((G.pw - G.mr) * zz - 4) + 'px';
    // Spalten
    colLayer.innerHTML = '';
    if (W.doc.cols.n > 1) W.colGeom(W.doc.cols, G.cw).forEach((c, i, arr) => { if (i < arr.length - 1) colLayer.appendChild(h('div.rgap', { style: { left: ((G.ml + c.x + c.w) * zz) + 'px', width: (W.doc.cols.gap * zz) + 'px' } })); });
    // Absatzmarken
    const st = W.fmt.state ? W.fmt.state() : {};
    const blk = st.block;
    const show = !!blk && !blk.closest('table') && !blk.hasAttribute('data-list');
    [mFirst, mHang, mRight].forEach((m) => { m.style.display = show ? '' : 'none'; });
    tabsLayer.innerHTML = '';
    if (blk) {
      const cs = getComputedStyle(blk);
      const br2 = blk.getBoundingClientRect();
      const ml = parseFloat(cs.marginLeft) || 0, mr = parseFloat(cs.marginRight) || 0, ti = parseFloat(cs.textIndent) || 0;
      const colLeft = (br2.left - pr.left) / zz - ml;             // Spaltenanfang in Seitenkoordinaten
      const x0 = (colLeft + ml) * zz, xr = (br2.right - pr.left) / zz * zz + mr * zz * 0;
      mHang.style.left = (x0 - 4) + 'px';
      mFirst.style.left = (x0 + ti * zz - 4) + 'px';
      mRight.style.left = ((br2.right - pr.left) - 4) + 'px';
      track._col = { colLeft, blk };
      let tabs = [];
      try { tabs = JSON.parse(blk.getAttribute('data-tabs') || '[]'); } catch (e) { /* */ }
      tabs.forEach((t, i) => {
        const m = h('div.rtab.' + t.a, { dataset: { i }, title: { l: 'Linker Tabulator', c: 'Zentrierter Tabulator', r: 'Rechter Tabulator', d: 'Dezimaltabulator' }[t.a] + ' – Klick: Art ändern, bei „aus“ entfernen', style: { left: ((colLeft + t.p) * zz - 4) + 'px' } }, { l: '⌊', c: '⊥', r: '⌋', d: '⊥' }[t.a] || '⌊');
        tabsLayer.appendChild(m);
      });
    }
  };

  function bind(el, kind) {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const G = W.geom();
      R.drag = { kind, x0: e.clientX, G, orig: { l: G.ml, r: G.mr }, moved: false };
      const blk = W.fmt.state().block;
      if (blk) { const cs = getComputedStyle(blk); R.drag.blk = blk; R.drag.ml = parseFloat(cs.marginLeft) || 0; R.drag.mr = parseFloat(cs.marginRight) || 0; R.drag.ti = parseFloat(cs.textIndent) || 0; R.drag.colLeftClient = blk.getBoundingClientRect().left - R.drag.ml * z(); R.drag.rightClient = blk.getBoundingClientRect().right; }
    });
  }

  function onMove(e) {
    const d = R.drag; if (!d) return;
    const dx = (e.clientX - d.x0) / z();
    if (Math.abs(dx) > 1) d.moved = true;
    const p = W.doc.page;
    if (d.kind === 'ml') { p.l = W.clamp(d.orig.l + dx, 10, p.w - p.r - 100); W.layout.schedule(true); }
    else if (d.kind === 'mr') { p.r = W.clamp(d.orig.r - dx, 10, p.w - p.l - 100); W.layout.schedule(true); }
    else if (d.blk) {
      const pos = (e.clientX - d.colLeftClient) / z();   // Position relativ zum Spaltenanfang
      const snap = (v) => (e.altKey ? v : Math.round(v / 3.78) * 3.78);
      if (d.kind === 'hang') { const v = Math.max(0, snap(pos)); const dml = v - d.ml; d.blk.style.marginLeft = v + 'px'; d.blk.style.textIndent = (d.ti - dml) + 'px'; }
      else if (d.kind === 'first') { const v = snap(pos) - d.ml; d.blk.style.textIndent = v + 'px'; }
      else if (d.kind === 'right') { const rc = (d.rightClient + d.mr * z() - e.clientX) / z(); d.blk.style.marginRight = Math.max(0, snap(rc)) + 'px'; }
      W.layout.schedule(true);
    }
    R.update();
  }
  function onUp() {
    const d = R.drag; if (!d) return;
    R.drag = null;
    if (d.moved) { W.layout.schedule(true); W.history.push(); }
    R.update();
  }

  /* Klick auf die Skala: Tabulator setzen / ändern */
  function onTrackClick(e) {
    if (e.target.closest('.rhandle,.rind')) return;
    const blk = (W.fmt.state().block);
    if (!blk) return;
    e.preventDefault();
    const m = e.target.closest('.rtab');
    let tabs = [];
    try { tabs = JSON.parse(blk.getAttribute('data-tabs') || '[]'); } catch (er) { /* */ }
    W.layout.beginEdit();
    if (m) {
      const i = +m.dataset.i;
      const order = ['l', 'c', 'r', 'd'];
      const k = order.indexOf(tabs[i].a);
      if (k === order.length - 1) tabs.splice(i, 1); else tabs[i].a = order[k + 1];
    } else {
      const pr = W.el.pages.getBoundingClientRect();
      const colLeft = track._col ? track._col.colLeft : W.geom().ml;
      const x = (e.clientX - pr.left) / z() - colLeft;
      if (x < 4) return;
      tabs.push({ p: Math.round(x / 3.78) * 3.78, a: 'l', l: '' });
    }
    tabs.sort((a, b) => a.p - b.p);
    if (tabs.length) blk.setAttribute('data-tabs', JSON.stringify(tabs)); else blk.removeAttribute('data-tabs');
    W.layout.schedule(true); W.history.push();
    R.update();
  }
})();
