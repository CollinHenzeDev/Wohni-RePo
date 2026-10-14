/* Wohni Writer – Bedienelemente an Tabellen: Griffe für Zeilen/Spalten (auswählen, verschieben, löschen),
   Eckgriff für Breite und Höhe, kleine Werkzeugleiste an der Auswahl.
   Alles wird als Überlagerung in #layerUI gezeichnet und gehört nicht zum Dokument. */
(function () {
  'use strict';
  const W = window.W;
  const T = W.tables;
  const h = W.h;

  const UI = (W.tablesUI = {});
  let host = null, raf = 0, state = null, gesture = null;
  const zoom = () => (W.view && W.view.zoom) || 1;

  function pageRect(el) {
    const pr = W.el.pages.getBoundingClientRect(), z = zoom(), r = el.getBoundingClientRect();
    return { x: (r.left - pr.left) / z, y: (r.top - pr.top) / z, w: r.width / z, h: r.height / z };
  }
  const place = (el, x, y, w, hh) => {
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (w != null) el.style.width = w + 'px';
    if (hh != null) el.style.height = hh + 'px';
    return el;
  };

  UI.schedule = function () { if (!raf) raf = requestAnimationFrame(refresh); };

  function clear() { if (host) { host.remove(); host = null; } state = null; }

  function refresh() {
    raf = 0;
    if (gesture && gesture.active) return;                 // beim Ziehen nichts neu aufbauen
    const table = W.floats && W.floats.selected ? null : T.currentTable();
    if (!table || !table.isConnected || table.parentNode !== W.el.flow || !W.layout.info) { clear(); return; }
    const z = zoom();
    const gt = 9 / z, gap = 3 / z;
    const pieces = T.pieces(table);
    const rows = T.allRows(table);
    const R = T.rect && T.rect.table === table ? T.rect : null;
    if (host) host.remove();
    host = h('div.tblui');
    host.style.setProperty('--zoom', String(z));

    const first = pageRect(pieces[0]);
    const lastPiece = pieces[pieces.length - 1];
    const last = pageRect(lastPiece);
    const gr = T.grid(pieces[0]);

    // Spaltengrenzen aus den Zellen des ersten Teilstücks
    const bx = new Array(gr.nc + 1).fill(null);
    gr.g.forEach((row) => row.forEach((x) => {
      if (!x || !x.origin) return;
      const r = pageRect(x.cell);
      if (bx[x.c0] == null) bx[x.c0] = r.x;
      if (bx[x.c0 + x.cs] == null) bx[x.c0 + x.cs] = r.x + r.w;
    }));
    for (let i = 0; i <= gr.nc; i++) {
      if (bx[i] != null) continue;
      let a = i - 1, b = i + 1;
      while (a >= 0 && bx[a] == null) a--;
      while (b <= gr.nc && bx[b] == null) b++;
      bx[i] = a >= 0 && b <= gr.nc ? bx[a] + (bx[b] - bx[a]) * (i - a) / (b - a) : (a >= 0 ? bx[a] : bx[b]);
    }

    // Spaltengriffe
    for (let c = 0; c < gr.nc; c++) {
      const g = h('div.tg.tg-col', { dataset: { k: 'col', i: c }, title: 'Spalte markieren – ziehen zum Verschieben' });
      if (R && R.kind === 'col' && c >= R.range[0] && c <= R.range[1]) g.classList.add('on');
      place(g, bx[c] + 1 / z, first.y - gt - gap, Math.max(2 / z, bx[c + 1] - bx[c] - 2 / z), gt);
      host.appendChild(g);
    }
    // Zeilengriffe (über alle Teilstücke)
    const rowRects = [];
    rows.forEach((tr, i) => {
      const pr = pageRect(tr.closest('table')), r = pageRect(tr);
      rowRects.push({ tr, x: pr.x, w: pr.w, y: r.y, h: r.h });
      const g = h('div.tg.tg-row', { dataset: { k: 'row', i }, title: 'Zeile markieren – ziehen zum Verschieben' });
      if (R && R.kind === 'row' && i >= R.range[0] && i <= R.range[1]) g.classList.add('on');
      place(g, pr.x - gt - gap, r.y + 1 / z, gt, Math.max(2 / z, r.h - 2 / z));
      host.appendChild(g);
    });
    // Eckgriff: ganze Tabelle markieren
    const corner = h('div.tg.tg-all', { dataset: { k: 'all' }, title: 'Ganze Tabelle markieren' });
    if (R && R.kind === 'table') corner.classList.add('on');
    place(corner, first.x - gt - gap, first.y - gt - gap, gt, gt);
    host.appendChild(corner);
    // Größengriff unten rechts
    const size = h('div.tg.tg-size', { dataset: { k: 'size' }, title: 'Ziehen: Breite und Höhe der Tabelle ändern' });
    const sz = 9 / z;
    place(size, last.x + last.w - sz / 2, last.y + last.h - sz / 2, sz, sz);
    host.appendChild(size);

    // Werkzeugleiste an der Auswahl
    if (R) host.appendChild(buildBar(R, { first, rowRects, bx, z, gt, gap }));

    W.el.ui.appendChild(host);
    state = { table, pieces, rows, rowRects, bx, gr };
  }

  function buildBar(R, geo) {
    const { first, rowRects, bx, z, gt, gap } = geo;
    const btn = (icon, tip, fn, cls) => {
      const b = h('button.tgb' + (cls ? '.' + cls : ''), { type: 'button', title: tip, 'aria-label': tip, html: W.icon(icon, 16) });
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    const bar = h('div.tgbar');
    let x, y;
    if (R.kind === 'row') {
      bar.append(
        btn('moveRowUp', 'Zeile nach oben (Alt+Umschalt+↑)', () => T.moveRowBy(-1)), btn('moveRowDown', 'Zeile nach unten (Alt+Umschalt+↓)', () => T.moveRowBy(1)),
        btn('rowAbove', 'Zeile oberhalb einfügen', () => T.addRow(false)), btn('rowBelow', 'Zeile unterhalb einfügen', () => T.addRow(true)),
        btn('delRow', 'Zeile löschen', () => T.deleteRow(), 'del'));
      const rr = rowRects[R.range[0]];
      bar.classList.add('v');
      x = (rr ? rr.x : first.x) - gt - gap - 34 / z; y = rr ? rr.y : first.y;
    } else if (R.kind === 'col') {
      bar.append(
        btn('moveColLeft', 'Spalte nach links (Alt+Umschalt+←)', () => T.moveColumnBy(-1)), btn('moveColRight', 'Spalte nach rechts (Alt+Umschalt+→)', () => T.moveColumnBy(1)),
        btn('colLeft', 'Spalte links einfügen', () => T.addColumn(false)), btn('colRight', 'Spalte rechts einfügen', () => T.addColumn(true)),
        btn('delCol', 'Spalte löschen', () => T.deleteColumn(), 'del'));
      x = bx[R.range[0]]; y = first.y - gt - gap - 30 / z;
    } else {
      bar.append(
        btn('tblprops', 'Tabelleneigenschaften …', () => W.dialogs.tableProps()),
        btn('distribute', 'Spalten gleich breit', () => T.distributeColumns()), btn('distributeRows', 'Zeilen gleich hoch', () => T.distributeRows()),
        btn('delTable', 'Tabelle löschen', () => T.deleteTable(), 'del'));
      x = first.x; y = first.y - gt - gap - 30 / z;
    }
    bar.style.left = x + 'px'; bar.style.top = y + 'px';
    bar.style.transform = `scale(${1 / z})`;
    return bar;
  }

  /* ------------------------------------------------------------------ */
  /*  Maus auf den Griffen                                                */
  /* ------------------------------------------------------------------ */
  function pointerPage(ev) {
    const pr = W.el.pages.getBoundingClientRect(), z = zoom();
    return { x: (ev.clientX - pr.left) / z, y: (ev.clientY - pr.top) / z };
  }

  document.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0 || !state) return;
    const g = ev.target.closest && ev.target.closest('.tg');
    if (!g) return;
    ev.preventDefault(); ev.stopPropagation();
    const k = g.dataset.k, table = state.table;
    const R = T.rect && T.rect.table === table ? T.rect : null;
    if (k === 'col' || k === 'row') {
      const i = +g.dataset.i;
      let a = i, b = i;
      if (R && R.kind === k) {
        if (ev.shiftKey) { a = Math.min(R.range[0], i); b = Math.max(R.range[1], i); }
        else if (i >= R.range[0] && i <= R.range[1]) { a = R.range[0]; b = R.range[1]; }     // bestehenden Block beim Ziehen beibehalten
      }
      if (k === 'col') T.selectColumns(table, a, b); else T.selectRows(table, a, b);
      gesture = { kind: k, a, b, x0: ev.clientX, y0: ev.clientY, active: false, table, rows: T.allRows(table).slice(), target: null };
      refresh();
    } else if (k === 'all') {
      T.selectTable(table);
      refresh();
    } else if (k === 'size') {
      const z = zoom();
      const rows = T.allRows(table);
      const hs = rows.map((tr) => tr.getBoundingClientRect().height / z);
      gesture = {
        kind: 'size', x0: ev.clientX, y0: ev.clientY, active: true, table, rows, hs, H0: hs.reduce((a, b) => a + b, 0) || 1,
        w0: table.getBoundingClientRect().width / z, avail: parseFloat(table.style.getPropertyValue('--lw')) || table.parentNode.clientWidth, sized: false,
      };
      document.body.classList.add('tg-dragging');
    }
  }, true);

  function dropLine(x, y, w, hh) {
    let l = host && host.querySelector('.tg-drop');
    if (!l && host) { l = h('div.tg-drop'); host.appendChild(l); }
    if (l) place(l, x, y, w, hh);
    return l;
  }

  document.addEventListener('mousemove', (ev) => {
    if (!gesture) return;
    const z = zoom();
    if (gesture.kind === 'size') {
      const dx = (ev.clientX - gesture.x0) / z, dy = (ev.clientY - gesture.y0) / z;
      const f = W.clamp((gesture.w0 + dx) / gesture.avail, 0.1, 1);
      T.pieces(gesture.table).forEach((t) => t.style.setProperty('--tw', f.toFixed(4)));
      if (Math.abs(dy) > 3 || gesture.sized) {
        gesture.sized = true;
        const hf = Math.max(0.2, (gesture.H0 + dy) / gesture.H0);
        gesture.rows.forEach((tr, i) => { tr.style.height = Math.max(8, gesture.hs[i] * hf).toFixed(1) + 'px'; });
      }
      W.layout.schedule();
      return;
    }
    if (!gesture.active) {
      if (Math.hypot(ev.clientX - gesture.x0, ev.clientY - gesture.y0) < 5) return;
      gesture.active = true;
      document.body.classList.add('tg-dragging');
    }
    if (!state || !host) return;
    const p = pointerPage(ev);
    if (gesture.kind === 'col') {
      const bx = state.bx;
      let best = 0;
      bx.forEach((x, i) => { if (Math.abs(x - p.x) < Math.abs(bx[best] - p.x)) best = i; });
      const noop = best >= gesture.a && best <= gesture.b + 1;
      gesture.target = noop ? null : best;
      const l = dropLine(bx[best] - 1.5 / z, state.rowRects.length ? state.rowRects[0].y : 0, 3 / z, 10);
      if (l) {
        const top = state.rowRects[0].y, bot = state.rowRects[state.rowRects.length - 1].y + state.rowRects[state.rowRects.length - 1].h;
        l.style.top = top + 'px'; l.style.height = (bot - top) + 'px'; l.style.display = noop ? 'none' : '';
      }
    } else {
      let tgt = null, line = null;
      state.rowRects.forEach((r, i) => {
        if (p.x >= r.x - 40 / z && p.x <= r.x + r.w + 40 / z && p.y >= r.y && p.y <= r.y + r.h) {
          const below = p.y > r.y + r.h / 2;
          tgt = below ? i + 1 : i;
          line = { x: r.x, w: r.w, y: below ? r.y + r.h : r.y };
        }
      });
      if (tgt == null) return;
      const noop = tgt >= gesture.a && tgt <= gesture.b + 1;
      gesture.target = noop ? null : tgt;
      const l = dropLine(line.x, line.y - 1.5 / z, line.w, 3 / z);
      if (l) l.style.display = noop ? 'none' : '';
    }
  });

  document.addEventListener('mouseup', () => {
    const g = gesture;
    if (!g) return;
    gesture = null;
    document.body.classList.remove('tg-dragging');
    if (g.kind === 'size') {
      W.layout.schedule(true);
      W.history.push();
      UI.schedule();
      return;
    }
    if (g.active && g.target != null) {
      if (g.kind === 'col') T.moveColumns(g.table, g.a, g.b - g.a + 1, g.target);
      else T.moveRows(g.rows.slice(g.a, g.b + 1), g.rows[g.target] || null);
    }
    UI.schedule();
  });

  /* ------------------------------------------------------------------ */
  /*  Rechtsklick auf Griffe                                              */
  /* ------------------------------------------------------------------ */
  document.addEventListener('contextmenu', (ev) => {
    const g = ev.target.closest && ev.target.closest('.tg');
    if (!g || !state) return;
    ev.preventDefault(); ev.stopPropagation();
    const k = g.dataset.k, table = state.table;
    const R = T.rect && T.rect.table === table ? T.rect : null;
    const i = +g.dataset.i;
    if (k === 'row' && !(R && R.kind === 'row' && i >= R.range[0] && i <= R.range[1])) T.selectRows(table, i, i);
    if (k === 'col' && !(R && R.kind === 'col' && i >= R.range[0] && i <= R.range[1])) T.selectColumns(table, i, i);
    if (k === 'all') T.selectTable(table);
    let items;
    if (k === 'row') items = [
      { icon: 'rowAbove', label: 'Zeile oberhalb einfügen', fn: () => T.addRow(false) }, { icon: 'rowBelow', label: 'Zeile unterhalb einfügen', fn: () => T.addRow(true) },
      { sep: true },
      { icon: 'moveRowUp', label: 'Nach oben verschieben', hint: 'Alt+Umschalt+↑', fn: () => T.moveRowBy(-1) }, { icon: 'moveRowDown', label: 'Nach unten verschieben', hint: 'Alt+Umschalt+↓', fn: () => T.moveRowBy(1) },
      { sep: true },
      { icon: 'valign', label: 'Zeilenhöhe …', fn: () => W.cmd.rowHeight() }, { icon: 'tblprops', label: 'Tabelleneigenschaften …', fn: () => W.dialogs.tableProps() },
      { sep: true },
      { icon: 'delRow', label: 'Zeile löschen', fn: () => T.deleteRow() },
    ];
    else if (k === 'col') items = [
      { icon: 'colLeft', label: 'Spalte links einfügen', fn: () => T.addColumn(false) }, { icon: 'colRight', label: 'Spalte rechts einfügen', fn: () => T.addColumn(true) },
      { sep: true },
      { icon: 'moveColLeft', label: 'Nach links verschieben', hint: 'Alt+Umschalt+←', fn: () => T.moveColumnBy(-1) }, { icon: 'moveColRight', label: 'Nach rechts verschieben', hint: 'Alt+Umschalt+→', fn: () => T.moveColumnBy(1) },
      { sep: true },
      { icon: 'distribute', label: 'Spalten gleich breit', fn: () => T.distributeColumns() }, { icon: 'tblprops', label: 'Tabelleneigenschaften …', fn: () => W.dialogs.tableProps() },
      { sep: true },
      { icon: 'delCol', label: 'Spalte löschen', fn: () => T.deleteColumn() },
    ];
    else items = [
      { icon: 'tblprops', label: 'Tabelleneigenschaften …', fn: () => W.dialogs.tableProps() },
      { icon: 'distribute', label: 'Spalten gleich breit', fn: () => T.distributeColumns() }, { icon: 'distributeRows', label: 'Zeilen gleich hoch', fn: () => T.distributeRows() },
      { sep: true },
      { icon: 'delTable', label: 'Tabelle löschen', fn: () => T.deleteTable() },
    ];
    W.ui.menu(h('span', { style: { position: 'fixed', left: ev.clientX + 'px', top: ev.clientY + 'px', width: '1px', height: '1px' } }), items, {});
  }, true);

  /* ------------------------------------------------------------------ */
  // Beim Tippen ändert sich nur die Auswahl, nicht die Tabelle: nur bei Wechsel neu zeichnen
  const ids = new WeakMap(); let nid = 0, lastKey = '';
  W.on('tablecontext', (t) => {
    if (t && !ids.has(t)) ids.set(t, ++nid);
    const R = T.rect;
    const key = (t ? ids.get(t) : '') + '|' + (R ? R.kind + R.range : '');
    if (key !== lastKey) { lastKey = key; UI.schedule(); }
  });
  W.on('tablerect', () => { lastKey = ''; UI.schedule(); });
  W.on('layout', UI.schedule);
  W.on('history', UI.schedule);
  W.on('restored', () => { clear(); });
  document.addEventListener('scroll', () => {}, true);
})();
