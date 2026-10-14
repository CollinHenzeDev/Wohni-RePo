/* Wohni Writer – Tabellen */
(function () {
  'use strict';
  const W = window.W;

  const T = (W.tables = {});

  /* ---------- Gitter-Modell ---------- */
  T.grid = function (table) {
    const rows = Array.from(table.rows);
    const g = rows.map(() => []);
    rows.forEach((tr, r) => {
      let c = 0;
      Array.from(tr.cells).forEach((cell) => {
        while (g[r][c]) c++;
        const rs = Math.max(1, cell.rowSpan || 1), cs = Math.max(1, cell.colSpan || 1);
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) {
          if (g[r + i]) g[r + i][c + j] = { cell, r: r + i, c: c + j, origin: i === 0 && j === 0, r0: r, c0: c, rs, cs };
        }
        c += cs;
      });
    });
    const nc = g.reduce((m, row) => Math.max(m, row.length), 0);
    return { g, nr: rows.length, nc, rows };
  };

  /** Weich geteilte Tabellen bestehen aus mehreren <table>-Teilstücken: Kopfteil + data-cont-Fortsetzungen */
  T.headOf = (table) => {
    let t = table;
    while (t && t.hasAttribute('data-cont') && t.previousElementSibling && t.previousElementSibling.tagName === 'TABLE') t = t.previousElementSibling;
    return t;
  };
  T.pieces = (table) => {
    const head = T.headOf(table);
    const out = [head];
    let n = head.nextElementSibling;
    while (n && n.tagName === 'TABLE' && n.hasAttribute('data-cont')) { out.push(n); n = n.nextElementSibling; }
    return out;
  };
  T.allRows = (table) => T.pieces(table).flatMap((t) => Array.from(t.rows));
  T.tableOf = (node) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return el ? el.closest('table') : null;
  };
  T.cellOf = (node) => {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return el ? el.closest('td,th') : null;
  };

  /** Ausgewählte Zellen (Auswahl über mehrere Zellen oder aktuelle Zelle) */
  T.rect = null;      // rechteckige Auswahl über die Griffe: { kind: 'row'|'col'|'table', cells, anchor }
  function rectValid() {
    const R = T.rect; if (!R) return false;
    if (!R.cells.every((c) => c.isConnected)) { T.rect = null; return false; }
    const r = W.sel.range(W.el.flow);
    if (!r || T.cellOf(r.startContainer) !== R.anchor) { T.rect = null; return false; }
    return true;
  }
  T.selectedCells = function () {
    if (rectValid()) return T.rect.cells.slice();
    const r = W.sel.range(W.el.flow);
    if (!r) return [];
    const startCell = T.cellOf(r.startContainer), endCell = T.cellOf(r.endContainer);
    const table = T.tableOf(r.startContainer);
    if (!table) return [];
    if (startCell && startCell === endCell) return [startCell];
    const cells = Array.from(table.querySelectorAll('td,th')).filter((c) => c.closest('table') === table && r.intersectsNode(c));
    return cells;
  };
  T.currentTable = function () {
    const r = W.sel.range(W.el.flow);
    const t = r ? T.tableOf(r.startContainer) : null;
    return t && t.parentNode === W.el.flow ? T.headOf(t) : t;
  };

  function newCell(tag, like) {
    const c = document.createElement(tag || 'td');
    if (like && like.getAttribute('style')) c.setAttribute('style', like.getAttribute('style'));
    c.innerHTML = '<p><br></p>';
    return c;
  }
  function colEls(table) {
    let cg = table.querySelector(':scope > colgroup');
    return cg ? Array.from(cg.children) : [];
  }
  function setColWidths(table, widths) {
    let cg = table.querySelector(':scope > colgroup');
    if (!cg) { cg = document.createElement('colgroup'); table.insertBefore(cg, table.firstChild); }
    cg.innerHTML = '';
    const sum = widths.reduce((a, b) => a + b, 0) || 1;
    widths.forEach((w) => { const c = document.createElement('col'); c.style.width = (w / sum * 100).toFixed(3) + '%'; cg.appendChild(c); });
  }
  function colWidths(table) {
    const cols = colEls(table);
    const g = T.grid(table);
    if (cols.length === g.nc) return cols.map((c) => parseFloat(c.style.width) || (100 / g.nc));
    return Array(g.nc).fill(100 / (g.nc || 1));
  }

  const BORDER_DEFAULT = '1px solid #000000';

  /** Aktueller „Stift“ für Rahmenlinien (Breite in px) */
  T.pen = { style: 'solid', width: 1, color: '#000000' };
  T.PEN_STYLES = [['solid', 'Durchgezogen'], ['dashed', 'Gestrichelt'], ['dotted', 'Gepunktet'], ['double', 'Doppelt']];
  T.PEN_WIDTHS = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6];       // in pt
  const pt2px = (pt) => pt * 96 / 72;
  T.setPen = function (o) {
    Object.assign(T.pen, o);
    W.emit('pen', T.pen);
  };

  /* ---------- Einfügen ---------- */
  T.create = function (rows, cols, opts) {
    opts = opts || {};
    const table = document.createElement('table');
    const tb = document.createElement('tbody');
    setColWidths(table, Array(cols).fill(1));
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = newCell('td');
        if (opts.border !== false) td.style.border = BORDER_DEFAULT;
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    return table;
  };

  T.insert = function (rows, cols, opts) {
    W.edit(() => {
      const r = W.sel.activeRoot() || W.el.flow;
      if (r !== W.el.flow) return false;
      const table = T.create(rows, cols, opts);
      const range = W.sel.range(r);
      let blk = range && W.sel.blocks(r, range).pop();
      let top = blk; while (top && top.parentNode !== r) top = top.parentNode;
      const empty = blk && !blk.textContent.trim() && !blk.querySelector('img') && top === blk;
      if (top) { top.after(table); if (empty) top.remove(); } else r.appendChild(table);
      let after = table.nextElementSibling;
      if (!after) { after = document.createElement('p'); after.innerHTML = '<br>'; table.after(after); }
      W.sel.caretIn(table.querySelector('td p'), false);
    });
  };

  /* ---------- Zeilen / Spalten ---------- */
  T.addRow = function (below) {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => {
      const table = cells[0].closest('table');
      const gr = T.grid(table);
      const rowsSel = cells.map((c) => c.parentElement.rowIndex);
      const ref = below ? Math.max(...rowsSel) + (cells[cells.length - 1].rowSpan - 1) : Math.min(...rowsSel);
      const idx = below ? ref + 1 : ref;
      const tr = document.createElement('tr');
      const refRow = gr.g[Math.min(ref, gr.nr - 1)];
      let c = 0;
      while (c < gr.nc) {
        const at = refRow[c];
        const spanned = idx > 0 && idx < gr.nr && gr.g[idx][c] && gr.g[idx - 1][c] && gr.g[idx][c].cell === gr.g[idx - 1][c].cell;
        if (spanned) {
          const sc = gr.g[idx][c];
          if (sc.origin || sc.c === sc.c0) { sc.cell.rowSpan += 1; }
          c += sc.cs - (c - sc.c0);
          continue;
        }
        const cs = at ? at.cs - (c - at.c0) : 1;
        const nc = newCell(at ? at.cell.tagName.toLowerCase() : 'td', at && at.cell);
        if (cs > 1) nc.colSpan = cs;
        tr.appendChild(nc);
        c += cs;
      }
      const parent = gr.rows[Math.min(ref, gr.nr - 1)].parentElement;
      if (idx >= gr.nr) parent.appendChild(tr);
      else gr.rows[idx].before(tr);
      W.sel.caretIn(tr.querySelector('p'), false);
    });
  };

  T.addColumn = function (right) {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => {
      const table = cells[0].closest('table');
      const gr = T.grid(table);
      const w = colWidths(table);          // vor dem Einfügen berechnen (altes Gitter)
      const cols = cells.map((c) => gr.g[c.parentElement.rowIndex].findIndex((x) => x && x.cell === c));
      const cidx = right ? Math.max(...cols) : Math.min(...cols);
      const spanEnd = right ? cidx + (gr.g[cells[0].parentElement.rowIndex][cidx].cs - (cidx - gr.g[cells[0].parentElement.rowIndex][cidx].c0)) : cidx;
      const insertAt = right ? spanEnd : cidx;     // neue Spalte steht vor Gitterspalte insertAt
      gr.rows.forEach((tr, r) => {
        const at = insertAt < gr.nc ? gr.g[r][insertAt] : null;
        const prev = insertAt > 0 ? gr.g[r][insertAt - 1] : null;
        // Zelle überspannt die Einfügestelle? -> Spanne erhöhen
        if (at && prev && at.cell === prev.cell) { if (at.r === at.r0) at.cell.colSpan += 1; return; }
        const like = (right ? prev : at) || prev || at;
        const nc = newCell(like ? like.cell.tagName.toLowerCase() : 'td', like && like.cell);
        if (at && at.r !== at.r0) return; // von oben überspannt – Zelle gehört zur Zeile darüber
        if (at) at.cell.before(nc);
        else tr.appendChild(nc);
      });
      // Spaltenbreiten
      const ref = Math.min(Math.max(right ? insertAt - 1 : insertAt, 0), w.length - 1);
      const half = (w[ref] || 20) / 2;
      w[ref] = half; w.splice(insertAt, 0, half);
      setColWidths(table, w);
    });
  };

  T.deleteRow = function () {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => {
      const table = cells[0].closest('table');
      const gr = T.grid(table);
      const rs = Array.from(new Set(cells.map((c) => c.parentElement.rowIndex))).sort((a, b) => b - a);
      if (rs.length >= gr.nr) { table.remove(); return; }
      for (const r of rs) {
        const g2 = T.grid(table);
        const tr = g2.rows[r];
        // Zellen, die hier beginnen und weiterreichen, in die nächste Zeile verschieben
        g2.g[r].forEach((x) => {
          if (!x) return;
          if (x.origin && x.rs > 1) {
            const nextRow = g2.rows[r + 1];
            const nc = x.cell;
            nc.rowSpan = x.rs - 1;
            // Einfügeposition: vor erster Zelle der nächsten Zeile mit größerer Gitterspalte
            let before = null;
            for (const cand of Array.from(nextRow.cells)) {
              const cc = g2.g[r + 1].findIndex((q) => q && q.cell === cand);
              if (cc > x.c0) { before = cand; break; }
            }
            nextRow.insertBefore(nc, before);
          } else if (!x.origin || x.c !== x.c0) { /* */ }
          else if (x.r0 < r && x.r0 + x.rs > r) { /* von oben */ }
        });
        // von oben überspannende Zellen verkleinern
        const seen = new Set();
        g2.g[r].forEach((x) => { if (x && x.r0 < r && !seen.has(x.cell)) { seen.add(x.cell); x.cell.rowSpan = Math.max(1, x.cell.rowSpan - 1); } });
        tr.remove();
      }
    });
  };

  T.deleteColumn = function () {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => {
      const table = cells[0].closest('table');
      const gr = T.grid(table);
      const cset = new Set();
      cells.forEach((c) => { const r = c.parentElement.rowIndex; gr.g[r].forEach((x, i) => { if (x && x.cell === c) cset.add(i); }); });
      const idxs = Array.from(cset).sort((a, b) => b - a);
      if (idxs.length >= gr.nc) { table.remove(); return; }
      const w = colWidths(table);
      for (const ci of idxs) {
        const g2 = T.grid(table);
        const done = new Set();
        g2.g.forEach((row) => {
          const x = row[ci]; if (!x || done.has(x.cell)) return; done.add(x.cell);
          if (x.cs > 1) x.cell.colSpan -= 1; else x.cell.remove();
        });
        w.splice(ci, 1);
      }
      setColWidths(table, w);
    });
  };

  T.deleteTable = function () {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => {
      const next = t.nextElementSibling || t.previousElementSibling;
      t.remove();
      if (!W.el.flow.firstChild) { const p = document.createElement('p'); p.innerHTML = '<br>'; W.el.flow.appendChild(p); }
      const tgt = next || W.el.flow.firstElementChild;
      if (tgt) { const p = tgt.matches('p,h1,h2,h3') ? tgt : tgt.querySelector('p'); if (p) W.sel.caretIn(p, false); }
    });
  };

  /* ---------- Verbinden / Teilen ---------- */
  T.mergeCells = function () {
    const cells = T.selectedCells();
    if (cells.length < 2) return;
    W.edit(() => {
      const table = cells[0].closest('table');
      const gr = T.grid(table);
      let r0 = 1e9, c0 = 1e9, r1 = -1, c1 = -1;
      cells.forEach((c) => {
        gr.g.forEach((row, r) => row.forEach((x, cc) => { if (x && x.cell === c) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc); } }));
      });
      // Rechteck muss vollständig durch ausgewählte Zellen abgedeckt sein
      const sel = new Set(cells);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const x = gr.g[r][c];
        if (!x || !sel.has(x.cell)) { W.toast('Die Auswahl ist nicht rechteckig – Zellen können nicht verbunden werden.'); return false; }
      }
      const first = gr.g[r0][c0].cell;
      const set = new Set();
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set.add(gr.g[r][c].cell);
      set.forEach((c) => {
        if (c === first) return;
        const empty = !c.textContent.trim() && !c.querySelector('img');
        if (!empty) Array.from(c.children).forEach((ch) => first.appendChild(ch));
        c.remove();
      });
      // leere Absätze am Ende bereinigen
      const ps = first.querySelectorAll(':scope > p');
      if (ps.length > 1) ps.forEach((p, i) => { if (i < ps.length - 1 || false) { if (!p.textContent.trim() && !p.querySelector('img')) p.remove(); } });
      if (!first.firstChild) first.innerHTML = '<p><br></p>';
      first.rowSpan = r1 - r0 + 1; first.colSpan = c1 - c0 + 1;
      if (first.rowSpan === 1) first.removeAttribute('rowspan');
      if (first.colSpan === 1) first.removeAttribute('colspan');
      W.sel.caretIn(first.querySelector('p'), false);
    });
  };

  T.splitCell = function (nCols) {
    const cells = T.selectedCells();
    if (cells.length !== 1) return;
    const cell = cells[0];
    W.edit(() => {
      const table = cell.closest('table');
      const gr = T.grid(table);
      const pos = gr.g.flat().find((x) => x && x.cell === cell && x.origin);
      if (!pos) return false;
      if (pos.cs > 1 || pos.rs > 1) {
        // Verbund aufheben
        cell.removeAttribute('colspan'); cell.removeAttribute('rowspan');
        for (let r = pos.r0; r < pos.r0 + pos.rs; r++) {
          for (let c = pos.c0; c < pos.c0 + pos.cs; c++) {
            if (r === pos.r0 && c === pos.c0) continue;
            const nc = newCell('td', cell);
            // vor die erste Zelle der Zeile mit größerer Gitterspalte
            const row = gr.rows[r];
            let before = null;
            for (const cand of Array.from(row.cells)) {
              const cc = gr.g[r].findIndex((q) => q && q.cell === cand);
              if (cc > c) { before = cand; break; }
            }
            row.insertBefore(nc, before);
          }
        }
      } else {
        // einfache Zelle in n Spalten teilen: Gitter erweitern
        const n = Math.max(2, nCols || 2);
        const w = colWidths(table);
        const ci = pos.c0;
        const part = w[ci] / n;
        w.splice(ci, 1, ...Array(n).fill(part));
        setColWidths(table, w);
        gr.g.forEach((row, r) => {
          const x = row[ci]; if (!x) return;
          if (x.cell === cell) {
            for (let k = 1; k < n; k++) cell.after(newCell('td', cell));
          } else if (x.origin && x.c === x.c0) x.cell.colSpan += n - 1;
        });
      }
    });
  };

  /* ---------- Formatierung ---------- */
  T.targetCells = function () {
    const sel = T.selectedCells();
    if (sel.length) return sel;
    const t = T.currentTable();
    return t ? Array.from(t.querySelectorAll('td,th')) : [];
  };
  T.setShading = function (color) {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => cells.forEach((c) => { if (color) c.style.backgroundColor = color; else c.style.removeProperty('background-color'); }));
  };
  T.setVAlign = function (v) {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => cells.forEach((c) => { c.style.verticalAlign = v; }));
  };

  /** Rahmen für die Auswahl (oder die ganze Tabelle) */
  T.setBorders = function (kind, color, width, style, cellsOverride) {
    const table = T.currentTable(); if (!table) return;
    color = color || T.pen.color; width = width || T.pen.width; style = style || T.pen.style;
    if (style === 'double') width = Math.max(width, 3);       // doppelte Linien brauchen mindestens 3 px
    const value = `${+width.toFixed(2)}px ${style} ${color}`;
    W.edit(() => {
      let cells = cellsOverride || T.selectedCells();
      if (!cells.length) cells = Array.from(table.querySelectorAll('td,th'));
      const gr = T.grid(table);
      const inSel = new Set(cells);
      const side = { top: 'border-top', bottom: 'border-bottom', left: 'border-left', right: 'border-right' };
      const apply = (cell, s, v) => { cell.style.setProperty(side[s], v); };
      // Gesamtrahmen in Einzelseiten aufbrechen
      table.querySelectorAll('td,th').forEach((c) => {
        const cs = c.style;
        // Kurzschreibweise "border" (auch als border-width/-style/-color serialisiert) in vier Seiten zerlegen
        const whole = cs.border || (cs.borderStyle && !/ /.test(cs.borderStyle) && cs.borderStyle ? [cs.borderWidth, cs.borderStyle, cs.borderColor].join(' ') : '');
        if (whole) {
          ['border', 'border-width', 'border-style', 'border-color'].forEach((p) => cs.removeProperty(p));
          ['top', 'bottom', 'left', 'right'].forEach((s) => { if (!cs.getPropertyValue(side[s])) cs.setProperty(side[s], whole); });
        }
      });
      const v = kind === 'none' ? 'none' : value;
      const cellEdges = (cell) => {
        const o = gr.g.flat().find((x) => x && x.cell === cell && x.origin);
        return o;
      };
      cells.forEach((cell) => {
        const o = cellEdges(cell); if (!o) return;
        const topNb = o.r0 > 0 ? gr.g[o.r0 - 1][o.c0] : null;
        const botNb = o.r0 + o.rs < gr.nr ? gr.g[o.r0 + o.rs][o.c0] : null;
        const leftNb = o.c0 > 0 ? gr.g[o.r0][o.c0 - 1] : null;
        const rightNb = o.c0 + o.cs < gr.nc ? gr.g[o.r0][o.c0 + o.cs] : null;
        const isOuter = {
          top: !topNb || !inSel.has(topNb.cell), bottom: !botNb || !inSel.has(botNb.cell),
          left: !leftNb || !inSel.has(leftNb.cell), right: !rightNb || !inSel.has(rightNb.cell),
        };
        const nb = { top: topNb, bottom: botNb, left: leftNb, right: rightNb };
        const opp = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        const set = (s) => {
          apply(cell, s, v);
          if (nb[s]) apply(nb[s].cell, opp[s], v);
        };
        for (const s of ['top', 'bottom', 'left', 'right']) {
          if (kind === 'all' || kind === 'none') set(s);
          else if (kind === 'outside' && isOuter[s]) set(s);
          else if (kind === 'inside' && !isOuter[s]) set(s);
          else if (kind === s || kind === 'edge-' + s) { if (isOuter[s]) set(s); }
        }
      });
    });
  };

  /** Tabellenformatvorlagen */
  T.applyStyle = function (name) {
    const table = T.currentTable(); if (!table) return;
    W.edit(() => {
      const gr = T.grid(table);
      const cells = Array.from(table.querySelectorAll('td,th'));
      cells.forEach((c) => { c.style.removeProperty('border'); ['top', 'bottom', 'left', 'right'].forEach((s) => c.style.removeProperty('border-' + s)); c.style.removeProperty('background-color'); c.style.removeProperty('color'); });
      table.querySelectorAll('td p, th p').forEach((p) => { p.style.removeProperty('font-weight'); p.querySelectorAll('[style*="color"]').forEach(() => {}); });
      const rowOf = (c) => c.parentElement.rowIndex;
      const hdr = (c) => rowOf(c) === 0;
      const color = { blue: '#4472c4', green: '#70ad47', orange: '#ed7d31', gray: '#7f7f7f', dark: '#1f3864' };
      const m = /^(\w+)-?(\w+)?$/.exec(name);
      if (name === 'grid') cells.forEach((c) => { c.style.border = BORDER_DEFAULT; });
      else if (name === 'none') { /* keine Rahmen */ }
      else if (name === 'lines') cells.forEach((c) => { c.style.borderBottom = '1px solid #7f7f7f'; if (hdr(c)) c.style.borderTop = '1px solid #7f7f7f'; });
      else if (name.startsWith('header-')) {
        const col = color[name.slice(7)] || '#4472c4';
        cells.forEach((c) => {
          c.style.border = `1px solid ${col}`;
          if (hdr(c)) { c.style.backgroundColor = col; c.style.color = '#ffffff'; c.querySelectorAll('p').forEach((p) => { p.style.fontWeight = 'bold'; }); }
        });
      } else if (name.startsWith('banded-')) {
        const col = { blue: '#d9e2f3', green: '#e2efd9', orange: '#fbe4d5', gray: '#ededed' }[name.slice(7)] || '#d9e2f3';
        cells.forEach((c) => { if (rowOf(c) % 2 === 1 || hdr(c) && false) c.style.backgroundColor = col; c.style.borderBottom = '1px solid #bfbfbf'; if (hdr(c)) { c.querySelectorAll('p').forEach((p) => { p.style.fontWeight = 'bold'; }); c.style.backgroundColor = ''; c.style.borderBottom = '2px solid #7f7f7f'; } });
      }
    });
  };

  T.distributeColumns = function () {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => { const g = T.grid(t); setColWidths(t, Array(g.nc).fill(1)); });
  };
  T.setWidthFraction = function (f) {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => { t.style.setProperty('--tw', String(f)); });
  };
  T.setRowHeight = function (px, cellsOverride) {
    const cells = cellsOverride || T.selectedCells(); if (!cells.length) return;
    W.edit(() => cells.forEach((c) => { c.parentElement.style.height = px ? px + 'px' : ''; }));
  };
  /** Innenabstand der Zellen (px); null = unverändert */
  T.setCellPadding = function (pad, cellsOverride) {
    let cells = cellsOverride || T.selectedCells();
    if (!cells.length) { const t = T.currentTable(); cells = t ? T.pieces(t).flatMap((p) => Array.from(p.querySelectorAll('td,th'))) : []; }
    if (!cells.length) return;
    W.edit(() => cells.forEach((c) => {
      for (const [k, prop] of [['top', 'padding-top'], ['right', 'padding-right'], ['bottom', 'padding-bottom'], ['left', 'padding-left']]) {
        if (pad[k] != null) c.style.setProperty(prop, pad[k].toFixed(1) + 'px');
      }
    }));
  };
  /** Alle Zeilen gleich hoch machen (Mittel der aktuellen Höhen) */
  T.distributeRows = function () {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => {
      const rows = T.allRows(t);
      const hs = rows.map((tr) => tr.getBoundingClientRect().height / ((W.view && W.view.zoom) || 1));
      const avg = hs.reduce((a, b) => a + b, 0) / (hs.length || 1);
      rows.forEach((tr) => { tr.style.height = avg.toFixed(1) + 'px'; });
    });
  };
  T.alignTable = function (a) {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => {
      t.style.marginLeft = a === 'center' || a === 'right' ? 'auto' : '';
      t.style.marginRight = a === 'center' ? 'auto' : '';
      if (a === 'center' || a === 'right') t.style.setProperty('--tw', t.style.getPropertyValue('--tw') || '0.8');
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Rechteckige Auswahl (Zeile / Spalte / Tabelle) über die Griffe      */
  /* ------------------------------------------------------------------ */
  function placeCaret(cell) {
    W.el.flow.focus({ preventScroll: true });
    const p = cell.querySelector('p,h1,h2,h3,h4,h5,h6');
    if (p) W.sel.caretIn(p, false);
  }
  function setRect(kind, table, range, cells) {
    if (!cells.length) return;
    T.rect = { kind, table, range, cells, anchor: cells[0] };
    placeCaret(T.rect.anchor);
    highlight();
    W.emit('tablecontext', T.currentTable());
    W.emit('tablerect', T.rect);
  }
  T.clearRect = function () { if (T.rect) { T.rect = null; highlight(); W.emit('tablerect', null); } };

  function cellsOfRows(table, a, b) {
    const out = new Set();
    T.allRows(table).slice(a, b + 1).forEach((tr) => {
      const gr = T.grid(tr.closest('table'));
      (gr.g[tr.rowIndex] || []).forEach((x) => { if (x) out.add(x.cell); });
    });
    return Array.from(out);
  }
  function cellsOfCols(table, a, b) {
    const out = new Set();
    T.pieces(table).forEach((piece) => T.grid(piece).g.forEach((row) => { for (let c = a; c <= b; c++) if (row[c]) out.add(row[c].cell); }));
    return Array.from(out);
  }
  /** Zeilen a..b (logische Indizes über alle Teilstücke) markieren */
  T.selectRows = function (table, a, b) {
    table = T.headOf(table);
    const n = T.allRows(table).length;
    a = W.clamp(a, 0, n - 1); b = W.clamp(b, a, n - 1);
    setRect('row', table, [a, b], cellsOfRows(table, a, b));
  };
  T.selectColumns = function (table, a, b) {
    table = T.headOf(table);
    const nc = T.grid(table).nc;
    a = W.clamp(a, 0, nc - 1); b = W.clamp(b, a, nc - 1);
    setRect('col', table, [a, b], cellsOfCols(table, a, b));
  };
  T.selectTable = function (table) {
    table = T.headOf(table);
    const cells = T.pieces(table).flatMap((t) => Array.from(t.querySelectorAll('td,th')).filter((c) => c.closest('table') === t));
    setRect('table', table, null, cells);
  };
  /** Zeilen-/Spaltenindex der Auswahl (für Menüs und Schaltflächen) */
  T.logicalRowIndex = (tr) => T.allRows(T.headOf(tr.closest('table'))).indexOf(tr);

  /* ------------------------------------------------------------------ */
  /*  Zeilen und Spalten verschieben                                      */
  /* ------------------------------------------------------------------ */
  /** perm[alt] = neu, wenn der Block [from, from+count) vor Position `to` (alte Nummerierung) wandert */
  function blockPerm(n, from, count, to) {
    if (from < 0 || count < 1 || from + count > n || to < 0 || to > n) return null;
    if (to >= from && to <= from + count) return null;
    const idx = Array.from({ length: n }, (_, i) => i);
    const block = idx.splice(from, count);
    idx.splice(to > from ? to - count : to, 0, ...block);
    const perm = new Array(n);
    idx.forEach((old, nw) => { perm[old] = nw; });
    return perm;
  }

  /** Zeilen/Spalten einer Tabelle umordnen. Gibt false zurück, wenn verbundene Zellen im Weg sind. */
  function permuteTable(tbl, kind, perm) {
    const gr = T.grid(tbl);
    const items = [];
    for (const row of gr.g) for (const x of row) {
      if (!x || !x.origin) continue;
      let nr = x.r0, nc = x.c0;
      if (kind === 'row') { nr = perm[x.r0]; for (let k = 1; k < x.rs; k++) if (perm[x.r0 + k] !== nr + k) return false; }
      else { nc = perm[x.c0]; for (let k = 1; k < x.cs; k++) if (perm[x.c0 + k] !== nc + k) return false; }
      items.push({ cell: x.cell, r0: x.r0, c0: x.c0, nr, nc });
    }
    const rows = gr.rows;
    let target = rows;
    if (kind === 'row') { const inv = []; perm.forEach((nw, old) => { inv[nw] = old; }); target = inv.map((old) => rows[old]); }
    items.forEach((it) => it.cell.remove());
    if (kind === 'row') {
      const parents = rows.map((tr) => tr.parentNode);
      rows.forEach((tr) => tr.remove());
      target.forEach((tr, i) => parents[i].appendChild(tr));
    }
    const byRow = target.map(() => []);
    items.forEach((it) => byRow[kind === 'row' ? it.nr : it.r0].push(it));
    byRow.forEach((list, i) => { list.sort((a, b) => a.nc - b.nc); list.forEach((it) => target[i].appendChild(it.cell)); });
    if (kind === 'col') {
      const w = colWidths(tbl), nw = [];
      w.forEach((v, i) => { nw[perm[i]] = v; });
      setColWidths(tbl, nw);
    }
    // Kontrolle: jede Zelle muss genau dort liegen, wo sie hin sollte
    const g2 = T.grid(tbl);
    if (g2.nc !== gr.nc || g2.nr !== gr.nr) return false;
    const where = new Map();
    g2.g.forEach((row) => row.forEach((x) => { if (x && x.origin) where.set(x.cell, x); }));
    return items.every((it) => {
      const pos = where.get(it.cell);
      return pos && pos.r0 === (kind === 'row' ? it.nr : it.r0) && pos.c0 === (kind === 'row' ? it.c0 : it.nc);
    });
  }
  function tryPermute(table, kind, perm) {
    if (!permuteTable(table.cloneNode(true), kind, perm)) return false;     // Probelauf an einer Kopie
    return permuteTable(table, kind, perm);
  }

  /** Zusammenhängende Zeilen (tr-Elemente) vor die Zeile `beforeRow` verschieben (null = ans Ende) */
  function caretKeeper() {
    const r = W.sel.range(W.el.flow);
    const keep = r && r.collapsed ? { node: r.startContainer, offset: r.startOffset } : null;
    const had = T.rect ? T.rect.kind : null;
    return { had, restore() {
      if (!keep || !keep.node.isConnected) return false;
      const rg = document.createRange();
      try { rg.setStart(keep.node, keep.offset); rg.collapse(true); } catch (e) { return false; }
      W.el.flow.focus({ preventScroll: true });
      const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
      return true;
    } };
  }
  T.moveRows = function (rows, beforeRow) {
    if (!rows.length) return false;
    let ok = false;
    W.edit(() => {
      const ck = caretKeeper();
      const table = rows[0].closest('table');         // nach dem Vereinen weich geteilter Tabellen
      const gr = T.grid(table);
      const idx = rows.map((tr) => tr.rowIndex).sort((a, b) => a - b);
      const from = idx[0], count = idx[idx.length - 1] - from + 1;
      if (count !== idx.length) { W.toast('Es können nur zusammenhängende Zeilen verschoben werden.'); return false; }
      const perm = blockPerm(gr.nr, from, count, beforeRow ? beforeRow.rowIndex : gr.nr);
      if (!perm) return false;
      if (!tryPermute(table, 'row', perm)) { W.toast('Verbundene Zellen verhindern das Verschieben dieser Zeile.'); return false; }
      ok = true;
      if (ck.had === 'row' || !ck.restore()) T.selectRows(table, perm[from], perm[from] + count - 1);
    });
    return ok;
  };
  T.moveColumns = function (table, from, count, to) {
    let ok = false;
    table = T.headOf(table);
    W.edit(() => {
      const ck = caretKeeper();
      const gr = T.grid(table);
      const perm = blockPerm(gr.nc, from, count, to);
      if (!perm) return false;
      if (!tryPermute(table, 'col', perm)) { W.toast('Verbundene Zellen verhindern das Verschieben dieser Spalte.'); return false; }
      ok = true;
      if (ck.had === 'col' || !ck.restore()) T.selectColumns(table, perm[from], perm[from] + count - 1);
    });
    return ok;
  };

  /** Ausgewählte Zeilen um eine Position nach oben (-1) oder unten (+1) schieben */
  // Bei einer Spalten- oder Tabellenauswahl zählt für Zeilen nur die Zelle, in der der Cursor steht (und umgekehrt)
  const cellsFor = (kind) => {
    const cells = T.selectedCells();
    return T.rect && cells.length && T.rect.kind !== kind ? [T.rect.anchor] : cells;
  };
  T.moveRowBy = function (delta) {
    const cells = cellsFor('row'); if (!cells.length) return false;
    const table = T.headOf(cells[0].closest('table'));
    const all = T.allRows(table);
    let a = 1e9, b = -1;
    cells.forEach((c) => { const i = all.indexOf(c.parentElement); if (i < 0) return; a = Math.min(a, i); b = Math.max(b, i + (c.rowSpan || 1) - 1); });
    if (b < 0) return false;
    if (delta < 0) return a > 0 ? T.moveRows(all.slice(a, b + 1), all[a - 1]) : false;
    return b < all.length - 1 ? T.moveRows(all.slice(a, b + 1), all[b + 2] || null) : false;
  };
  T.moveColumnBy = function (delta) {
    const cells = cellsFor('col'); if (!cells.length) return false;
    const table = T.headOf(cells[0].closest('table'));
    let a = 1e9, b = -1;
    cells.forEach((c) => {
      const gr = T.grid(c.closest('table'));
      const pos = gr.g.flat().find((x) => x && x.cell === c && x.origin);
      if (pos) { a = Math.min(a, pos.c0); b = Math.max(b, pos.c0 + pos.cs - 1); }
    });
    if (b < 0) return false;
    const nc = T.grid(table).nc, count = b - a + 1;
    if (delta < 0) return a > 0 ? T.moveColumns(table, a, count, a - 1) : false;
    return b < nc - 1 ? T.moveColumns(table, a, count, b + 2) : false;
  };

  /** Inhalt der gewählten Zellen löschen (Entf bei Zeilen-/Spaltenauswahl) */
  T.clearCells = function () {
    const cells = T.selectedCells(); if (!cells.length) return;
    W.edit(() => { cells.forEach((c) => { c.innerHTML = '<p><br></p>'; }); });
  };

  /* ------------------------------------------------------------------ */
  /*  Größe: Breite, Höhe, Spaltenbreite                                  */
  /* ------------------------------------------------------------------ */
  const zoom = () => (W.view && W.view.zoom) || 1;
  const availWidth = (t) => parseFloat(t.style.getPropertyValue('--lw')) || (t.parentNode && t.parentNode.clientWidth) || 600;
  /** Maße der Tabelle in px (ungezoomt): Breite, Gesamthöhe, verfügbare Breite */
  T.metrics = function (table) {
    table = T.headOf(table);
    const z = zoom();
    const rows = T.allRows(table);
    return {
      width: table.getBoundingClientRect().width / z,
      avail: availWidth(table),
      height: rows.reduce((a, tr) => a + tr.getBoundingClientRect().height / z, 0),
      rows: rows.length,
    };
  };
  T.setWidth = function (px) {
    const t = T.currentTable(); if (!t || !px) return;
    const f = W.clamp(px / availWidth(t), 0.1, 1);
    W.edit(() => { t.style.setProperty('--tw', f.toFixed(4)); });
  };
  T.setHeight = function (px) {
    const t = T.currentTable(); if (!t) return;
    W.edit(() => {
      const rows = T.allRows(t);
      if (!px) { rows.forEach((tr) => tr.style.removeProperty('height')); return; }
      const hs = rows.map((tr) => tr.getBoundingClientRect().height / zoom());
      const f = px / (hs.reduce((a, b) => a + b, 0) || 1);
      rows.forEach((tr, i) => { tr.style.height = Math.max(8, hs[i] * f).toFixed(1) + 'px'; });
    });
  };
  /** Breite einer Gitterspalte setzen; Tabellenbreite bleibt gleich, die übrigen Spalten geben/nehmen anteilig */
  T.setColumnWidth = function (px, colIndex, cellsOverride) {
    const t = T.currentTable(); if (!t || !px) return;
    W.edit(() => {
      const gr = T.grid(t);
      if (colIndex == null) {
        const cells = cellsOverride || T.selectedCells(); if (!cells.length) return false;
        const pos = T.grid(cells[0].closest('table')).g.flat().find((x) => x && x.cell === cells[0] && x.origin);
        if (!pos) return false;
        colIndex = pos.c0;
      }
      if (gr.nc < 2 || colIndex >= gr.nc) return false;
      const tot = t.getBoundingClientRect().width / zoom();
      const w = colWidths(t).map((v) => v / 100 * tot);
      const others = w.reduce((a, v, i) => a + (i === colIndex ? 0 : v), 0);
      const want = W.clamp(px, 18, tot - 18 * (gr.nc - 1));
      const rest = tot - want, k = rest / (others || 1);
      setColWidths(t, w.map((v, i) => (i === colIndex ? want : v * k)));
    });
  };

  /* ---------- Tastatur: Tab / Umschalt+Tab, Verschieben, Entf bei Auswahl ---------- */
  T.onKeydown = function (e) {
    const r = W.sel.range(W.el.flow);
    if (!r) return false;
    const cell = T.cellOf(r.startContainer);
    if (!cell) return false;
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
      e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') T.moveRowBy(e.key === 'ArrowUp' ? -1 : 1);
      else T.moveColumnBy(e.key === 'ArrowLeft' ? -1 : 1);
      return true;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && rectValid()) { e.preventDefault(); T.clearCells(); return true; }
    if (e.key === 'Escape' && T.rect) { T.clearRect(); return true; }
    if (e.key !== 'Tab') return false;
    e.preventDefault();
    const table = cell.closest('table');
    const all = Array.from(table.querySelectorAll('td,th')).filter((c) => c.closest('table') === table);
    let i = all.indexOf(cell) + (e.shiftKey ? -1 : 1);
    if (i < 0) return true;
    if (i >= all.length) {
      T.addRow(true);
      const g = Array.from(table.querySelectorAll('td,th')).filter((c) => c.closest('table') === table);
      i = all.length;
      const nc = g[i]; if (nc) W.sel.caretIn(nc.querySelector('p'), false);
      return true;
    }
    const tgt = all[i];
    const rng = document.createRange(); rng.selectNodeContents(tgt);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rng);
    return true;
  };

  /* ---------- Zellauswahl hervorheben ---------- */
  let hl = [];
  function highlight() {
    const want = [];
    if (rectValid()) want.push(...T.rect.cells);
    else {
      const r = W.sel.range(W.el.flow);
      if (r && !r.collapsed) {
        const sc = T.cellOf(r.startContainer), ec = T.cellOf(r.endContainer);
        if (sc || ec) {
          const cells = T.selectedCells();
          if (cells.length > 1 || (cells.length === 1 && sc !== ec)) want.push(...cells);
        }
      }
    }
    hl.forEach((c) => { if (!want.includes(c)) c.classList.remove('cell-sel'); });
    want.forEach((c) => c.classList.add('cell-sel'));
    hl = want;
  }
  W.on('selection', () => { highlight(); W.emit('tablecontext', T.currentTable()); });
  // Klick irgendwo anders (nicht auf einen Griff) hebt die Zeilen-/Spaltenauswahl auf
  document.addEventListener('mousedown', (ev) => {
    if (T.rect && !(ev.target.closest && ev.target.closest('.tg,.tgbar,.menu,.modal-back,#ribbon'))) T.clearRect();
  }, true);
  W.on('restored', () => { T.rect = null; hl = []; });

  /* ------------------------------------------------------------------ */
  /*  Größenänderung per Maus: Spaltenrand, Zeilenunterkante, rechter Rand */
  /* ------------------------------------------------------------------ */
  let drag = null;
  function edgeAt(ev) {
    const tol = 4 * zoom();
    let td = ev.target.closest && ev.target.closest('td,th');
    if (!td && ev.target.closest && ev.target.closest('#pages,#zoomsizer,#workspace')) {
      // knapp rechts neben der Tabelle: nach der letzten Spalte suchen
      const el = document.elementFromPoint(ev.clientX - tol, ev.clientY);
      td = el && el.closest && el.closest('td,th');
    }
    if (!td || !W.el.flow.contains(td)) return null;
    const rc = td.getBoundingClientRect();
    if (Math.abs(ev.clientX - rc.right) <= tol) return { td, side: 'right' };
    if (Math.abs(ev.clientX - rc.left) <= tol) return { td, side: 'left' };
    if (Math.abs(ev.clientY - rc.bottom) <= tol) return { td, side: 'bottom' };
    if (Math.abs(ev.clientY - rc.top) <= tol) return { td, side: 'top' };
    return null;
  }
  const setClasses = (e) => {
    const horiz = !!e && (e.side === 'bottom' || e.side === 'top');
    document.body.classList.toggle('col-resize', !!e && !horiz);
    document.body.classList.toggle('row-resize', horiz);
  };
  document.addEventListener('mousemove', (ev) => {
    if (drag) {
      const z = zoom();
      if (drag.mode === 'row') {
        drag.tr.style.height = Math.max(10, drag.h0 + (ev.clientY - drag.y0) / z).toFixed(1) + 'px';
        W.layout.schedule();
        return;
      }
      if (drag.mode === 'width') {
        const f = W.clamp((drag.w0 + (ev.clientX - drag.x0) / z) / drag.avail, 0.1, 1);
        T.pieces(drag.table).forEach((t) => t.style.setProperty('--tw', f.toFixed(4)));
        W.layout.schedule();
        return;
      }
      const dx = (ev.clientX - drag.x0) / z;
      const w = drag.widths.slice();
      const a = drag.a, b = drag.b;
      const min = 18;
      const d = W.clamp(dx, min - w[a], w[b] - min);
      w[a] += d; w[b] -= d;
      const tot = w.reduce((x, y) => x + y, 0);
      T.pieces(drag.table).forEach((piece) => {
        const cols = colEls(piece);
        w.forEach((v, i) => { if (cols[i]) cols[i].style.width = (v / tot * 100).toFixed(3) + '%'; });
      });
      return;
    }
    setClasses(edgeAt(ev));
  });
  document.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const e = edgeAt(ev);
    if (!e) return;
    const piece = e.td.closest('table');
    const head = T.headOf(piece);
    const gr = T.grid(piece);
    const pos = gr.g.flat().find((x) => x && x.cell === e.td && x.origin);
    if (!pos) return;
    const nested = piece.parentNode !== W.el.flow;
    if (e.side === 'bottom' || e.side === 'top') {
      // Unterkante dieser Zeile bzw. Oberkante = Unterkante der Zeile darüber
      let tr = e.side === 'bottom' ? gr.rows[pos.r0 + pos.rs - 1] : null;
      if (!tr) { const all = T.allRows(head); const i = all.indexOf(gr.rows[pos.r0]); tr = i > 0 ? all[i - 1] : null; }
      if (!tr) return;
      ev.preventDefault();
      drag = { mode: 'row', tr, y0: ev.clientY, h0: tr.getBoundingClientRect().height / zoom() };
      return;
    }
    const a = e.side === 'right' ? pos.c0 + pos.cs - 1 : pos.c0 - 1;
    const b = a + 1;
    if (a < 0) return;
    if (b >= gr.nc) {
      // rechter Rand der letzten Spalte = Tabellenbreite
      if (nested || e.side !== 'right') return;
      ev.preventDefault();
      drag = { mode: 'width', table: head, x0: ev.clientX, w0: head.getBoundingClientRect().width / zoom(), avail: availWidth(head) };
      return;
    }
    ev.preventDefault();
    const rcT = piece.getBoundingClientRect();
    const cols = colEls(piece);
    if (cols.length !== gr.nc) T.pieces(head).forEach((t) => setColWidths(t, Array(gr.nc).fill(1)));
    const wpx = colEls(piece).map((c, i) => {
      const cell = gr.g.flat().find((x) => x && x.c0 === i && x.origin && x.cs === 1);
      return cell ? cell.cell.getBoundingClientRect().width / zoom() : rcT.width / zoom() / gr.nc;
    });
    drag = { mode: 'col', table: head, a, b, x0: ev.clientX, widths: wpx };
  }, true);
  document.addEventListener('mouseup', () => {
    if (!drag) return;
    drag = null;
    setClasses(null);
    W.layout.schedule(true);
    W.history.push();
  });
})();
