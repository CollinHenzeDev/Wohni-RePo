/* Wohni Writer – Titelleiste, Ribbon (Registerkarten), Statusleiste, Navigation, Datei-Menü */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;
  const ui = W.ui;
  const u = W.u;
  const R = (W.ribbon = { toggles: [], ctx: {}, active: 'home' });

  const tip = (label, key) => (key ? `${label} (${key})` : label);
  const M = W.isMac ? '⌘' : 'Strg+';

  /* ------------------------------------------------------------------ */
  /*  Bausteine                                                           */
  /* ------------------------------------------------------------------ */
  function run(o, ev) {
    if (o.fn) o.fn(o.arg, ev);
    else if (o.cmd && W.cmd[o.cmd]) W.cmd[o.cmd](o.arg);
  }
  function noFocusSteal(el) { el.addEventListener('mousedown', (e) => { if (!e.target.closest('input,select,textarea')) e.preventDefault(); }); return el; }

  function btn(o) {
    const big = o.size === 'lg';
    const b = h('button.rbtn' + (big ? '.lg' : '.sm') + (o.cls ? '.' + o.cls : ''), { type: 'button', title: o.tip || o.label || '', 'aria-label': o.label || o.tip || '' });
    b.innerHTML = (o.icon ? `<span class="ric">${W.icon(o.icon, big ? 30 : 18)}</span>` : '') + (o.label && (big || o.showLabel) ? `<span class="rlbl">${W.esc(o.label)}</span>` : '');
    if (o.menu) {
      // Aufklappmenü-Schaltfläche
      b.classList.add('hasmenu');
      b.insertAdjacentHTML('beforeend', `<span class="rcaret">${W.icon('chevron', 10)}</span>`);
      b.addEventListener('click', (e) => { e.stopPropagation(); if (b.classList.contains('open')) { ui.closeMenus(); return; } ui.menu(b, typeof o.menu === 'function' ? o.menu() : o.menu); });
    } else {
      b.addEventListener('click', (e) => run(o, e));
    }
    if (o.toggle) R.toggles.push({ el: b, key: o.toggle, val: o.toggleVal });
    if (o.ctx) R.ctxBtns = (R.ctxBtns || []).concat(b);
    return noFocusSteal(b);
  }

  /** Geteilte Schaltfläche: Hauptaktion + Pfeil für Menü */
  function split(o) {
    const big = o.size === 'lg';
    const wrap = h('div.rsplit' + (big ? '.lg' : '.sm'));
    const main = btn(Object.assign({}, o, { menu: null, cls: 'main' }));
    if (o.colorBar) { main.style.setProperty('--c', o.colorBar.init || '#e00'); R.colorBars = (R.colorBars || []).concat({ el: main, key: o.colorBar.key }); }
    const arrow = h('button.rbtn.sm.arrow' + (big ? '.lbl' : ''), { type: 'button', title: (o.tip || o.label) + ' – weitere Optionen', html: big ? `<span class="rlbl">${W.esc(o.label || '')}</span>` + W.icon('chevron', 10) : W.icon('chevron', 10) });
    arrow.addEventListener('click', (e) => { e.stopPropagation(); if (arrow.classList.contains('open')) { ui.closeMenus(); return; } const mm = typeof o.menu === 'function' ? o.menu(arrow) : o.menu; if (mm) ui.menu(wrap, mm); });
    noFocusSteal(arrow);
    wrap.append(main, arrow);
    return wrap;
  }

  function colorBtn(o) {
    // o: {icon, label, tip, key, apply(color|null), none, highlight}
    const cur = { c: o.init || null };
    const s = split({
      icon: o.icon, label: o.label, tip: o.tip, size: o.size || 'sm',
      fn: () => o.apply(cur.c),
      menu: (anchor) => { ui.colorMenu(s, { current: cur.c, none: o.none, highlight: o.highlight, onPick: (c) => { cur.c = c; setBar(c); o.apply(c); } }); return null; },
    });
    const main = s.querySelector('.main');
    const setBar = (c) => { main.style.setProperty('--c', c || o.barNone || '#ffffff'); };
    setBar(cur.c || o.barInit);
    s.setBar = setBar;
    if (o.key) R.colorBars = (R.colorBars || []).concat({ el: s, key: o.key, set: setBar });
    return s;
  }

  function group(label, children, opts) {
    opts = opts || {};
    const g = h('div.rgroup' + (opts.cls ? '.' + opts.cls : ''));
    g.appendChild(h('div.ritems', children));
    const lab = h('div.rlabel', h('span', label));
    if (opts.launcher) {
      const l = h('button.rlaunch', { type: 'button', title: opts.launcherTip || label, html: '<svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 1h4M1 1v4M3 3l5 5M8 5v3H5"/></svg>' });
    l.addEventListener('click', opts.launcher);
      lab.appendChild(noFocusSteal(l));
    }
    g.appendChild(lab);
    return g;
  }
  const col = (...c) => h('div.rcol', c);
  const row = (...c) => h('div.rrow', c);
  const sep = () => h('div.rsep');
  const field = (label, input) => h('label.rfield', h('span', label), input);

  function numInput(o) {
    const i = h('input.rnum', { type: 'number', value: o.value, step: o.step || 0.1, min: o.min, max: o.max, title: o.tip || '' });
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); i.dispatchEvent(new Event('change')); W.fmt.refocus(); } e.stopPropagation(); });
    i.addEventListener('change', () => o.onChange(parseFloat(i.value)));
    if (o.key) R.fields = (R.fields || []).concat({ el: i, key: o.key });
    return i;
  }

  /* ---- Schriftart / Größe ---- */
  function fontCombo() {
    const input = h('input.rfont', { type: 'text', spellcheck: false, title: 'Schriftart', 'aria-label': 'Schriftart' });
    const wrap = h('div.rcombo.font', input, h('button.rcombo-btn', { type: 'button', html: W.icon('chevron', 10), tabindex: '-1' }));
    const open = () => {
      const cur = input.value;
      ui.menu(wrap, W.FONTS.map((f) => ({ html: `<span style="font-family:'${f}',sans-serif;font-size:14px">${W.esc(f)}</span>`, checked: f === cur, fn: () => W.cmd.font(f) })), { cls: 'fontmenu', minWidth: 220 });
    };
    wrap.querySelector('button').addEventListener('mousedown', (e) => { e.preventDefault(); });
    wrap.querySelector('button').addEventListener('click', () => (wrap.querySelector('button').classList.contains('open') ? ui.closeMenus() : open()));
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); W.fmt.refocus(); W.cmd.font(input.value.trim()); } if (e.key === 'Escape') { W.fmt.refocus(); } });
    input.addEventListener('focus', () => input.select());
    R.fontInput = input;
    return wrap;
  }
  function sizeCombo() {
    const input = h('input.rsize', { type: 'text', inputmode: 'decimal', title: 'Schriftgrad', 'aria-label': 'Schriftgrad' });
    const wrap = h('div.rcombo.size', input, h('button.rcombo-btn', { type: 'button', html: W.icon('chevron', 10), tabindex: '-1' }));
    const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
    wrap.querySelector('button').addEventListener('mousedown', (e) => e.preventDefault());
    wrap.querySelector('button').addEventListener('click', () => {
      if (wrap.querySelector('button').classList.contains('open')) { ui.closeMenus(); return; }
      ui.menu(wrap, SIZES.map((s) => ({ label: String(s).replace('.', ','), checked: String(s) === input.value.replace(',', '.'), fn: () => W.cmd.size(s) })), { cls: 'sizemenu', minWidth: 60 });
    });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); const v = parseFloat(input.value.replace(',', '.')); W.fmt.refocus(); if (v) W.cmd.size(v); } });
    input.addEventListener('focus', () => input.select());
    R.sizeInput = input;
    return wrap;
  }

  /* ---- Formatvorlagen-Galerie ---- */
  const STYLE_PREVIEW = {
    normal: 'font-size:11px', nospace: 'font-size:11px', h1: 'font-size:16px;color:#2f5496;font-family:"Calibri Light",Carlito,sans-serif', h2: 'font-size:14px;color:#2f5496;font-family:"Calibri Light",Carlito,sans-serif',
    h3: 'font-size:13px;color:#1f3763', title: 'font-size:20px;font-family:"Calibri Light",Carlito,sans-serif', subtitle: 'font-size:11px;color:#5a5a5a;letter-spacing:.7px', quote: 'font-style:italic;color:#404040;font-size:12px',
    iquote: 'font-style:italic;color:#4472c4;font-size:12px', caption: 'font-style:italic;font-size:10px;color:#44546a', code: 'font-family:Consolas,monospace;font-size:11px;background:#eee',
  };
  function styleTile(st, onPick) {
    const t = h('button.stile', { type: 'button', title: st.label, dataset: { id: st.id } }, h('span', { style: STYLE_PREVIEW[st.id] || '' }, st.id === 'h1' || st.id === 'h2' || st.id === 'h3' ? st.label : (st.label.length > 12 ? st.label : st.label)));
    t.addEventListener('click', () => onPick(st.id));
    return noFocusSteal(t);
  }
  function styleGallery() {
    const g = h('div.sgallery');
    const strip = h('div.sstrip');
    ['normal', 'nospace', 'h1', 'h2', 'title'].forEach((id) => strip.appendChild(styleTile(W.fmt.STYLES.find((s) => s.id === id), (i) => W.cmd.style(i))));
    const more = h('button.smore', { type: 'button', title: 'Weitere Formatvorlagen', html: W.icon('chevron', 12) });
    more.addEventListener('click', () => {
      if (more.classList.contains('open')) { ui.closeMenus(); return; }
      const box = h('div.stylebox');
      W.fmt.STYLES.forEach((st) => box.appendChild(styleTile(st, (i) => { ui.closeMenus(); W.cmd.style(i); })));
      const clear = h('button.mi', { type: 'button', html: `<span class="mi-ico">${W.icon('clear', 16)}</span><span class="mi-label">Formatierung löschen</span>` });
      clear.addEventListener('click', () => { ui.closeMenus(); W.cmd.clearFormat(); });
      noFocusSteal(clear);
      ui.menu(g, [{ node: box }, { sep: true }, { node: clear }], { cls: 'stylemenu' });
      more.classList.add('open');
    });
    noFocusSteal(more);
    g.append(strip, more);
    R.styleGallery = g;
    return g;
  }

  /* ---- Tabellen-Raster ---- */
  function tableGrid() {
    const label = h('div.gridlabel', 'Tabelle einfügen');
    const grid = h('div.tgrid');
    const COLS = 10, ROWS = 8;
    const cells = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = h('div.tcell', { dataset: { r: r + 1, c: c + 1 } });
      cell.addEventListener('mouseenter', () => { label.textContent = `${c + 1} × ${r + 1} Tabelle`; cells.forEach((x) => x.classList.toggle('on', +x.dataset.r <= r + 1 && +x.dataset.c <= c + 1)); });
      cell.addEventListener('click', () => { ui.closeMenus(); W.fmt.refocus(); W.tables.insert(r + 1, c + 1); });
      cells.push(cell); grid.appendChild(cell);
    }
    return h('div.tgridbox', label, grid);
  }

  /* ---- Formen ---- */
  function shapeMenu() {
    const entries = [];
    W.floats.SHAPE_GROUPS.forEach(([title, ids]) => {
      entries.push({ header: title });
      const g = h('div.shapegrid');
      ids.forEach((id) => {
        const def = W.floats.SHAPES[id];
        const b = h('button.shbtn', { type: 'button', title: def.label });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 28 28'); svg.setAttribute('width', 28); svg.setAttribute('height', 28);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const w = def.line ? 24 : 22, hh = def.line ? 24 : 22;
        p.setAttribute('d', def.path(w, def.line && id !== 'lineDiag' ? 24 : hh));
        p.setAttribute('transform', 'translate(3 3)');
        p.setAttribute('fill', def.line ? 'none' : '#cfd8ea'); p.setAttribute('stroke', '#2f528f'); p.setAttribute('stroke-width', '1.4');
        svg.appendChild(p); b.appendChild(svg);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { ui.closeMenus(); W.floats.insertShape(id); });
        g.appendChild(b);
      });
      entries.push({ node: g });
    });
    return entries;
  }

  /* ------------------------------------------------------------------ */
  /*  Menüs                                                               */
  /* ------------------------------------------------------------------ */
  const bulletMenu = () => [
    { header: 'Aufzählungszeichen' },
    { node: gridOfMarks([['disc', '•'], ['circle', '◦'], ['square', '▪'], ['dash', '–'], ['arrow', '➤'], ['check', '✓'], ['star', '★']], (f) => W.cmd.bullets(f)) },
  ];
  const numberMenu = () => [
    { header: 'Nummerierungsbibliothek' },
    { node: gridOfMarks([['decimal', '1.'], ['paren', '1)'], ['upperRoman', 'I.'], ['upperLetter', 'A.'], ['lowerLetter', 'a.'], ['legal', '1.1']], (f) => W.cmd.numbering(f)) },
    { sep: true },
    { label: 'Nummerierung neu beginnen', fn: () => W.lists.restart() },
  ];
  function gridOfMarks(items, fn) {
    const g = h('div.markgrid');
    items.forEach(([id, mark]) => { const b = h('button', { type: 'button', title: id }, mark); b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', () => { ui.closeMenus(); fn(id); }); g.appendChild(b); });
    return g;
  }
  const lineSpacingMenu = () => [
    { label: '1,0', fn: () => W.cmd.lineSpacing(1) }, { label: '1,15', fn: () => W.cmd.lineSpacing(1.15) }, { label: '1,5', fn: () => W.cmd.lineSpacing(1.5) }, { label: '2,0', fn: () => W.cmd.lineSpacing(2) }, { label: '2,5', fn: () => W.cmd.lineSpacing(2.5) }, { label: '3,0', fn: () => W.cmd.lineSpacing(3) },
    { sep: true },
    { label: 'Abstand vor Absatz hinzufügen (12 pt)', fn: () => W.cmd.spaceBefore(12) }, { label: 'Abstand vor Absatz entfernen', fn: () => W.cmd.spaceBefore(0) },
    { label: 'Abstand nach Absatz hinzufügen (8 pt)', fn: () => W.cmd.spaceAfter(8) }, { label: 'Abstand nach Absatz entfernen', fn: () => W.cmd.spaceAfter(0) },
    { sep: true }, { label: 'Absatz…', fn: () => W.dialogs.paragraph() },
  ];
  const bordersMenu = () => [
    { label: 'Rahmenlinie unten', fn: () => W.cmd.borders('bottom') }, { label: 'Rahmenlinie oben', fn: () => W.cmd.borders('top') },
    { label: 'Rahmenlinie links', fn: () => W.cmd.borders('left') }, { label: 'Rahmenlinie rechts', fn: () => W.cmd.borders('right') },
    { sep: true }, { label: 'Alle Rahmenlinien', fn: () => W.cmd.borders('all') }, { label: 'Kein Rahmen', fn: () => W.cmd.borders('none') },
  ];
  const caseMenu = () => [
    { label: 'Ersten Buchstaben im Satz großschreiben', fn: () => W.cmd.caseMode('sentence') }, { label: 'kleinbuchstaben', fn: () => W.cmd.caseMode('lower') },
    { label: 'GROSSBUCHSTABEN', fn: () => W.cmd.caseMode('upper') }, { label: 'Jedes Wort Großschreiben', fn: () => W.cmd.caseMode('title') }, { label: 'gROSS-/kLEINSCHREIBUNG', fn: () => W.cmd.caseMode('toggle') },
  ];
  const pasteMenu = () => [
    { icon: 'paste', label: 'Einfügen', hint: M + 'V', fn: () => W.cmd.paste() },
    { icon: 'txt', label: 'Nur Text einfügen', fn: () => W.cmd.pasteText() },
  ];
  const breaksMenu = () => [
    { header: 'Seitenumbrüche' }, { icon: 'pagebreak', label: 'Seite', hint: M + 'Eingabe', fn: () => W.cmd.pageBreak() }, { icon: 'columnbreak', label: 'Spalte', hint: M + '⇧Eingabe', fn: () => W.cmd.columnBreak() },
    { header: 'Abschnittsumbrüche' }, { icon: 'break', label: 'Fortlaufend', fn: () => W.cmd.sectionBreak() }, { icon: 'break', label: 'Nächste Seite', fn: () => W.cmd.sectionBreakNext() },
  ];
  const marginsMenu = () => Object.entries(W.MARGIN_PRESETS).map(([k, v]) => ({ label: `${v.label}  (${v.t} · ${v.b} · ${v.l} · ${v.r} cm)`, fn: () => W.cmd.margins(k) })).concat([{ sep: true }, { label: 'Benutzerdefinierte Seitenränder…', fn: () => W.dialogs.pageSetup() }]);
  const orientMenu = () => [{ icon: 'orientation', label: 'Hochformat', checked: W.doc.page.orient === 'portrait', fn: () => W.cmd.orientation('portrait') }, { icon: 'orientation', label: 'Querformat', checked: W.doc.page.orient === 'landscape', fn: () => W.cmd.orientation('landscape') }];
  const sizeMenu = () => Object.entries(W.PAGE_SIZES).map(([k, v]) => ({ label: v.label, checked: W.doc.page.size === k, fn: () => W.cmd.pageSize(k) })).concat([{ sep: true }, { label: 'Weitere Papierformate…', fn: () => W.dialogs.pageSetup() }]);
  const columnsMenu = () => [
    { icon: 'cols1', label: 'Eine', fn: () => W.cmd.columns('one') }, { icon: 'cols2', label: 'Zwei', fn: () => W.cmd.columns('two') }, { icon: 'cols3', label: 'Drei', fn: () => W.cmd.columns('three') },
    { icon: 'colsLeft', label: 'Links  (schmale linke Spalte)', fn: () => W.cmd.columns('left') }, { icon: 'colsRight', label: 'Rechts  (schmale rechte Spalte)', fn: () => W.cmd.columns('right') },
    { sep: true }, { icon: 'columnbreak', label: 'Spaltenumbruch einfügen', hint: M + '⇧Eingabe', fn: () => W.cmd.columnBreak() }, { label: 'Weitere Spalten…', fn: () => W.dialogs.columns() },
  ];
  const wrapMenu = () => [
    { icon: 'wrapInline', label: 'Mit Text in Zeile', fn: () => W.cmd.wrap('inline') },
    { icon: 'wrapSquare', label: 'Quadrat', fn: () => W.cmd.wrap('square') },
    { icon: 'wrapTopBottom', label: 'Oben und unten', fn: () => W.cmd.wrap('topbottom') },
    { icon: 'wrapBehind', label: 'Hinter den Text', fn: () => W.cmd.wrap('behind') },
    { icon: 'wrapFront', label: 'Vor den Text', fn: () => W.cmd.wrap('front') },
  ];
  const objAlignMenu = () => [
    { label: 'Links an Seite', fn: () => W.floats.align('left') }, { label: 'Horizontal zentrieren', fn: () => W.floats.align('center') }, { label: 'Rechts an Seite', fn: () => W.floats.align('right') },
    { sep: true }, { label: 'Oben an Seite', fn: () => W.floats.align('top') }, { label: 'Vertikal zentrieren', fn: () => W.floats.align('middle') }, { label: 'Unten an Seite', fn: () => W.floats.align('bottom') },
    { sep: true }, { label: 'An linkem Seitenrand', fn: () => W.floats.align('mleft') }, { label: 'An rechtem Seitenrand', fn: () => W.floats.align('mright') },
  ];
  const rotateMenu = () => [
    { icon: 'rotate', label: 'Um 90° nach rechts drehen', fn: () => W.floats.rotate(90) }, { icon: 'rotate', label: 'Um 90° nach links drehen', fn: () => W.floats.rotate(-90) },
    { icon: 'flip', label: 'Horizontal kippen', fn: () => W.floats.flip('h') }, { icon: 'flip', label: 'Vertikal kippen', fn: () => W.floats.flip('v') },
  ];
  const outlineWeightMenu = () => [0.5, 1, 1.5, 2.25, 3, 4.5, 6].map((w) => ({ label: `${String(w).replace('.', ',')} pt`, fn: () => W.floats.update({ strokeW: w * 96 / 72, stroke: (W.floats.selected && W.floats.selected.float && W.floats.selected.float.stroke) || '#2f528f' }) })).concat([{ sep: true }, { label: 'Durchgezogen', fn: () => W.floats.update({ dash: '' }) }, { label: 'Gestrichelt', fn: () => W.floats.update({ dash: 'dash' }) }, { label: 'Gepunktet', fn: () => W.floats.update({ dash: 'dot' }) }, { label: 'Strich-Punkt', fn: () => W.floats.update({ dash: 'dashdot' }) }]);
  const headerMenu = () => [
    { icon: 'header', label: 'Kopfzeile bearbeiten', fn: () => W.cmd.editHF('header') }, { icon: 'trash', label: 'Kopfzeile entfernen', fn: () => W.hf.remove('header') },
  ];
  const footerMenu = () => [
    { icon: 'footer', label: 'Fußzeile bearbeiten', fn: () => W.cmd.editHF('footer') }, { icon: 'trash', label: 'Fußzeile entfernen', fn: () => W.hf.remove('footer') },
  ];
  const pageNumMenu = () => [
    { header: 'Seitenanfang' }, { label: 'Links', fn: () => W.hf.insertPageNumber('top-left') }, { label: 'Zentriert', fn: () => W.hf.insertPageNumber('top-center') }, { label: 'Rechts', fn: () => W.hf.insertPageNumber('top-right') },
    { header: 'Seitenende' }, { label: 'Links', fn: () => W.hf.insertPageNumber('bottom-left') }, { label: 'Zentriert', fn: () => W.hf.insertPageNumber('bottom-center') }, { label: 'Rechts', fn: () => W.hf.insertPageNumber('bottom-right') },
    { sep: true }, { label: 'Seitenzahl an Cursorposition', fn: () => W.cmd.field('PAGE') },
  ];
  const textboxMenu = () => [{ icon: 'textbox', label: 'Einfaches Textfeld', fn: () => W.floats.insertTextbox() }, { icon: 'textbox', label: 'Textfeld mit Hintergrund', fn: () => W.floats.insertTextbox({ fill: '#dfe7f2', stroke: null, strokeW: 0 }) }, { icon: 'textbox', label: 'Seitenleiste (schmal, farbig)', fn: () => W.floats.insertTextbox({ w: 150, h: 520, fill: '#1f3a5f', stroke: null, strokeW: 0, color: '#ffffff', wrap: 'behind' }) }];
  const tocMenu = () => [{ icon: 'toc', label: 'Inhaltsverzeichnis einfügen', fn: () => W.cmd.toc() }, { icon: 'rotate', label: 'Inhaltsverzeichnis aktualisieren', fn: () => W.cmd.updateToc() }, { icon: 'trash', label: 'Inhaltsverzeichnis entfernen', fn: () => W.cmd.removeToc() }];
  const langMenu = () => [['de', 'Deutsch'], ['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['tr', 'Türkçe']].map(([c, n]) => ({ label: n, checked: (W.el.flow.lang || 'de') === c, fn: () => W.cmd.language(c) }));
  const zoomMenu = () => [200, 150, 125, 100, 90, 75, 50].map((z) => ({ label: z + ' %', fn: () => W.view.setZoom(z / 100) })).concat([{ sep: true }, { label: 'Seitenbreite', fn: () => W.view.fitWidth() }, { label: 'Ganze Seite', fn: () => W.view.fitPage() }]);
  const tableBordersMenu = () => [
    { label: 'Alle Rahmenlinien', fn: () => W.tables.setBorders('all') }, { label: 'Außenrahmen', fn: () => W.tables.setBorders('outside') }, { label: 'Innenrahmen', fn: () => W.tables.setBorders('inside') },
    { label: 'Rahmenlinie oben', fn: () => W.tables.setBorders('top') }, { label: 'Rahmenlinie unten', fn: () => W.tables.setBorders('bottom') }, { label: 'Rahmenlinie links', fn: () => W.tables.setBorders('left') }, { label: 'Rahmenlinie rechts', fn: () => W.tables.setBorders('right') },
    { sep: true }, { label: 'Kein Rahmen', fn: () => W.tables.setBorders('none') },
  ];
  const tableStyleMenu = () => {
    const names = [['grid', 'Tabellengitternetz'], ['none', 'Ohne Rahmen'], ['lines', 'Waagerechte Linien'], ['header-blue', 'Blaue Kopfzeile'], ['header-green', 'Grüne Kopfzeile'], ['header-orange', 'Orange Kopfzeile'], ['header-dark', 'Dunkle Kopfzeile'], ['banded-blue', 'Gestreift (blau)'], ['banded-green', 'Gestreift (grün)'], ['banded-gray', 'Gestreift (grau)']];
    return names.map(([id, label]) => ({ label, fn: () => W.tables.applyStyle(id) }));
  };

  /* ------------------------------------------------------------------ */
  /*  Registerkarten                                                      */
  /* ------------------------------------------------------------------ */
  function buildHome() {
    return [
      group('Zwischenablage', [
        split({ icon: 'paste', label: 'Einfügen', tip: tip('Einfügen', M + 'V'), size: 'lg', cmd: 'paste', menu: pasteMenu }),
        col(btn({ icon: 'cut', label: 'Ausschneiden', tip: tip('Ausschneiden', M + 'X'), cmd: 'cut', showLabel: true }), btn({ icon: 'copy', label: 'Kopieren', tip: tip('Kopieren', M + 'C'), cmd: 'copy', showLabel: true }), btn({ icon: 'painter', label: 'Format übertragen', tip: 'Format übertragen', cmd: 'formatPainter', showLabel: true })),
      ]),
      group('Schriftart', [
        col(
          row(fontCombo(), sizeCombo(), btn({ icon: 'grow', tip: tip('Schrift vergrößern', M + ']'), cmd: 'sizeUp' }), btn({ icon: 'shrink', tip: tip('Schrift verkleinern', M + '['), cmd: 'sizeDown' }), btn({ icon: 'casing', tip: 'Groß-/Kleinschreibung ändern', menu: caseMenu }), btn({ icon: 'clear', tip: tip('Alle Formatierungen löschen', M + 'Leertaste'), cmd: 'clearFormat' })),
          row(
            btn({ icon: 'bold', tip: tip('Fett', M + 'B'), cmd: 'bold', toggle: 'bold' }), btn({ icon: 'italic', tip: tip('Kursiv', M + 'I'), cmd: 'italic', toggle: 'italic' }), btn({ icon: 'underline', tip: tip('Unterstrichen', M + 'U'), cmd: 'underline', toggle: 'underline' }), btn({ icon: 'strike', tip: 'Durchgestrichen', cmd: 'strike', toggle: 'strike' }),
            btn({ icon: 'sub', tip: tip('Tiefgestellt', M + '='), cmd: 'sub', toggle: 'sub' }), btn({ icon: 'sup', tip: tip('Hochgestellt', M + '⇧='), cmd: 'sup', toggle: 'sup' }), sep(),
            colorBtn({ icon: 'highlight', tip: 'Texthervorhebungsfarbe', highlight: true, none: 'Keine Farbe', apply: (c) => W.cmd.highlight(c), init: '#ffff00', barInit: '#ffff00', key: 'highlight' }),
            colorBtn({ icon: 'fontcolor', tip: 'Schriftfarbe', none: 'Automatisch', init: '#e00000', barInit: '#e00000', apply: (c) => W.cmd.color(c), key: 'color' }))),
      ], { launcher: () => W.dialogs.font(), launcherTip: 'Schriftart' }),
      group('Absatz', [
        col(
          row(split({ icon: 'bullets', tip: 'Aufzählungszeichen', cmd: 'bullets', menu: bulletMenu, toggle: 'bullets' }), split({ icon: 'numbering', tip: 'Nummerierung', cmd: 'numbering', menu: numberMenu, toggle: 'numbering' }),
            btn({ icon: 'outdent', tip: 'Einzug verkleinern', cmd: 'indentLess' }), btn({ icon: 'indent', tip: 'Einzug vergrößern', cmd: 'indentMore' }), sep(), btn({ icon: 'pilcrow', tip: tip('Formatierungszeichen anzeigen', M + '⇧*'), fn: () => W.cmd.toggleMarks(), toggle: 'marks' })),
          row(btn({ icon: 'alignLeft', tip: tip('Linksbündig', M + 'L'), cmd: 'alignLeft', toggle: 'align', toggleVal: 'left' }), btn({ icon: 'alignCenter', tip: tip('Zentriert', M + 'E'), cmd: 'alignCenter', toggle: 'align', toggleVal: 'center' }), btn({ icon: 'alignRight', tip: tip('Rechtsbündig', M + 'R'), cmd: 'alignRight', toggle: 'align', toggleVal: 'right' }), btn({ icon: 'alignJustify', tip: tip('Blocksatz', M + 'J'), cmd: 'alignJustify', toggle: 'align', toggleVal: 'justify' }), sep(),
            btn({ icon: 'linespacing', tip: 'Zeilen- und Absatzabstand', menu: lineSpacingMenu }),
            colorBtn({ icon: 'shading', tip: 'Schattierung', none: 'Keine Farbe', apply: (c) => W.cmd.shading(c), init: null, barInit: '#ffffff' }),
            btn({ icon: 'borders', tip: 'Rahmen', menu: bordersMenu }))),
      ], { launcher: () => W.dialogs.paragraph(), launcherTip: 'Absatz' }),
      group('Formatvorlagen', [styleGallery()]),
      group('Bearbeiten', [col(btn({ icon: 'find', label: 'Suchen', tip: tip('Suchen', M + 'F'), fn: () => W.find.open(false), showLabel: true }), btn({ icon: 'replace', label: 'Ersetzen', tip: tip('Ersetzen', M + 'H'), fn: () => W.find.open(true), showLabel: true }), btn({ icon: 'selectall', label: 'Alles markieren', tip: tip('Alles markieren', M + 'A'), cmd: 'selectAll', showLabel: true }))]),
    ];
  }

  function buildInsert() {
    return [
      group('Seiten', [btn({ icon: 'blankpage', label: 'Leere Seite', size: 'lg', tip: 'Leere Seite einfügen', cmd: 'blankPage' }), btn({ icon: 'pagebreak', label: 'Seitenumbruch', size: 'lg', tip: tip('Seitenumbruch', M + 'Eingabe'), cmd: 'pageBreak' })]),
      group('Tabellen', [btn({ icon: 'table', label: 'Tabelle', size: 'lg', tip: 'Tabelle einfügen', menu: () => [{ node: tableGrid() }, { sep: true }, { icon: 'table', label: 'Tabelle einfügen…', fn: () => W.dialogs.table() }] })]),
      group('Illustrationen', [
        btn({ icon: 'picture', label: 'Bilder', size: 'lg', tip: 'Bild von diesem Gerät einfügen', menu: () => [{ icon: 'picture', label: 'Bild im Text einfügen…', fn: () => W.cmd.pickImage('inline') }, { icon: 'wrapBehind', label: 'Bild hinter den Text legen…', fn: () => W.cmd.pickImage('behind') }, { icon: 'wrapFront', label: 'Bild vor den Text legen…', fn: () => W.cmd.pickImage('front') }] }),
        btn({ icon: 'shapes', label: 'Formen', size: 'lg', tip: 'Formen', menu: shapeMenu }),
      ]),
      group('Links', [btn({ icon: 'link', label: 'Link', size: 'lg', tip: tip('Link einfügen', M + 'K'), fn: () => W.dialogs.link() })]),
      group('Kopf- und Fußzeile', [col(btn({ icon: 'header', label: 'Kopfzeile', tip: 'Kopfzeile', menu: headerMenu, showLabel: true }), btn({ icon: 'footer', label: 'Fußzeile', tip: 'Fußzeile', menu: footerMenu, showLabel: true }), btn({ icon: 'pagenumber', label: 'Seitenzahl', tip: 'Seitenzahl', menu: pageNumMenu, showLabel: true }))]),
      group('Text', [
        btn({ icon: 'textbox', label: 'Textfeld', size: 'lg', tip: 'Textfeld', menu: textboxMenu }),
        col(btn({ icon: 'calendar', label: 'Datum und Uhrzeit', tip: 'Datum einfügen', fn: () => W.cmd.field('DATE'), showLabel: true }), btn({ icon: 'hline', label: 'Horizontale Linie', tip: 'Horizontale Linie', cmd: 'hline', showLabel: true }), btn({ icon: 'columnbreak', label: 'Spaltenumbruch', tip: tip('Spaltenumbruch', M + '⇧Eingabe'), cmd: 'columnBreak', showLabel: true })),
      ]),
      group('Symbole', [btn({ icon: 'symbol', label: 'Symbol', size: 'lg', tip: 'Symbol einfügen', fn: () => W.dialogs.symbol() })]),
    ];
  }

  function buildDesign() {
    return [
      group('Seitenhintergrund', [
        btn({ icon: 'watermark', label: 'Wasserzeichen', size: 'lg', fn: () => W.dialogs.watermark() }),
        btn({ icon: 'pagecolor', label: 'Seitenfarbe', size: 'lg', menu: (a) => { return [{ node: h('div.pcol', pageColorBox()) }]; } }),
        btn({ icon: 'pageborder', label: 'Seitenränder', size: 'lg', fn: () => W.dialogs.pageBorder() }),
      ]),
      group('Dokumentformatierung', [
        btn({ icon: 'font', label: 'Standardschrift', size: 'lg', tip: 'Schriftart für das gesamte Dokument ändern', menu: () => ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Cambria', 'Verdana', 'Garamond', 'Segoe UI'].map((f) => ({ html: `<span style="font-family:'${f}'">${f}</span>`, fn: () => W.cmd.docFont(f) })) }),
      ]),
    ];
  }
  function pageColorBox() {
    const box = h('div');
    const nb = h('button.mi', { type: 'button', html: `<span class="mi-ico">${W.icon('close', 16)}</span><span class="mi-label">Keine Farbe (Weiß)</span>` });
    nb.addEventListener('click', () => { ui.closeMenus(); W.cmd.pageColor('#ffffff'); });
    box.appendChild(nb);
    const g = h('div.swgrid');
    ['#ffffff', '#fff8e1', '#f5f5dc', '#e8f0fe', '#e6f4ea', '#fce8e6', '#f3e8fd', '#eeeeee', '#d9d9d9', '#bfbfbf'].forEach((c) => { const s = h('button.sw', { type: 'button', style: { background: c }, title: c }); s.addEventListener('click', () => { ui.closeMenus(); W.cmd.pageColor(c); }); g.appendChild(s); });
    box.appendChild(g);
    return box;
  }

  function buildLayout() {
    return [
      group('Seite einrichten', [
        btn({ icon: 'margins', label: 'Seitenränder', size: 'lg', menu: marginsMenu }),
        btn({ icon: 'orientation', label: 'Ausrichtung', size: 'lg', menu: orientMenu }),
        btn({ icon: 'pagesize', label: 'Größe', size: 'lg', menu: sizeMenu }),
        btn({ icon: 'cols2', label: 'Spalten', size: 'lg', tip: 'Spalten (Links/Rechts: ungleich breite Spalten für Lebensläufe)', menu: columnsMenu }),
        btn({ icon: 'break', label: 'Umbrüche', size: 'lg', menu: breaksMenu }),
      ], { launcher: () => W.dialogs.pageSetup(), launcherTip: 'Seite einrichten' }),
      group('Absatz', [col(
        row(field('Einzug links', numInput({ value: 0, step: 0.1, min: 0, tip: 'Einzug links (cm)', key: 'indentLeft', onChange: (v) => W.cmd.indentLeft(v) })), field('Abstand vor', numInput({ value: 0, step: 1, min: 0, tip: 'Abstand vor (pt)', key: 'spaceBefore', onChange: (v) => W.cmd.spaceBefore(v) }))),
        row(field('Einzug rechts', numInput({ value: 0, step: 0.1, min: 0, tip: 'Einzug rechts (cm)', key: 'indentRight', onChange: (v) => W.cmd.indentRight(v) })), field('Abstand nach', numInput({ value: 8, step: 1, min: 0, tip: 'Abstand nach (pt)', key: 'spaceAfter', onChange: (v) => W.cmd.spaceAfter(v) }))))], { launcher: () => W.dialogs.paragraph() }),
      group('Anordnen', [
        btn({ icon: 'wrapSquare', label: 'Textumbruch', size: 'lg', tip: 'Textumbruch (Hinter den Text, Vor den Text …)', menu: wrapMenu }),
        col(btn({ icon: 'bringFront', label: 'Nach vorne', tip: 'Eine Ebene nach vorne', fn: () => W.floats.bringForward(), showLabel: true }), btn({ icon: 'sendBack', label: 'Nach hinten', tip: 'Eine Ebene nach hinten', fn: () => W.floats.sendBackward(), showLabel: true }), btn({ icon: 'alignObjs', label: 'Ausrichten', menu: objAlignMenu, showLabel: true })),
        btn({ icon: 'selpane', label: 'Auswahlbereich', size: 'lg', fn: () => W.cmd.selectionPane() }),
      ]),
    ];
  }

  function buildRefs() {
    return [
      group('Inhaltsverzeichnis', [btn({ icon: 'toc', label: 'Inhaltsverzeichnis', size: 'lg', menu: tocMenu }), btn({ icon: 'rotate', label: 'Tabelle aktualisieren', size: 'lg', cmd: 'updateToc' })]),
      group('Beschriftungen', [btn({ icon: 'bookmark', label: 'Beschriftung einfügen', size: 'lg', cmd: 'caption' })]),
    ];
  }
  function buildReview() {
    return [
      group('Dokumentprüfung', [
        btn({ icon: 'spell', label: 'Rechtschreibung', size: 'lg', tip: 'Rechtschreibprüfung ein-/ausschalten', fn: () => W.cmd.toggleSpell(), toggle: 'spell' }),
        btn({ icon: 'wordcount', label: 'Wörter zählen', size: 'lg', fn: () => W.dialogs.stats() }),
      ]),
      group('Sprache', [btn({ icon: 'language', label: 'Sprache', size: 'lg', menu: langMenu })]),
    ];
  }
  function buildView() {
    return [
      group('Ansichten', [
        btn({ icon: 'printlayout', label: 'Drucklayout', size: 'lg', fn: () => W.view.setMode('print'), toggle: 'viewmode', toggleVal: 'print' }),
        btn({ icon: 'weblayout', label: 'Weblayout', size: 'lg', fn: () => W.view.setMode('web'), toggle: 'viewmode', toggleVal: 'web' }),
      ]),
      group('Anzeigen', [col(
        btn({ icon: 'ruler', label: 'Lineal', fn: () => W.cmd.toggleRuler(), showLabel: true, toggle: 'ruler' }),
        btn({ icon: 'navpane', label: 'Navigationsbereich', fn: () => W.cmd.toggleNav(), showLabel: true, toggle: 'nav' }),
        btn({ icon: 'pilcrow', label: 'Formatierungszeichen', fn: () => W.cmd.toggleMarks(), showLabel: true, toggle: 'marks' }))]),
      group('Zoom', [
        btn({ icon: 'zoom', label: 'Zoom', size: 'lg', menu: zoomMenu }),
        btn({ icon: 'zoom100', label: '100 %', size: 'lg', fn: () => W.view.setZoom(1) }),
        btn({ icon: 'pagewidth', label: 'Seitenbreite', size: 'lg', fn: () => W.view.fitWidth() }),
        btn({ icon: 'onepage', label: 'Ganze Seite', size: 'lg', fn: () => W.view.fitPage() }),
      ]),
      group('Darstellung', [btn({ icon: 'moon', label: 'Dunkler Modus', size: 'lg', fn: () => W.cmd.toggleDark(), toggle: 'dark' }), btn({ icon: 'fullscreen', label: 'Vollbild', size: 'lg', fn: () => W.cmd.fullscreen() })]),
    ];
  }

  function buildTable() {
    return [
      group('Tabelle', [btn({ icon: 'delTable', label: 'Löschen', size: 'lg', fn: () => W.tables.deleteTable() })]),
      group('Zeilen und Spalten', [
        col(btn({ icon: 'rowAbove', label: 'Oberhalb einfügen', fn: () => W.tables.addRow(false), showLabel: true }), btn({ icon: 'rowBelow', label: 'Unterhalb einfügen', fn: () => W.tables.addRow(true), showLabel: true }), btn({ icon: 'delRow', label: 'Zeilen löschen', fn: () => W.tables.deleteRow(), showLabel: true })),
        col(btn({ icon: 'colLeft', label: 'Links einfügen', fn: () => W.tables.addColumn(false), showLabel: true }), btn({ icon: 'colRight', label: 'Rechts einfügen', fn: () => W.tables.addColumn(true), showLabel: true }), btn({ icon: 'delCol', label: 'Spalten löschen', fn: () => W.tables.deleteColumn(), showLabel: true })),
      ]),
      group('Zusammenführen', [col(btn({ icon: 'merge', label: 'Zellen verbinden', fn: () => W.tables.mergeCells(), showLabel: true }), btn({ icon: 'split', label: 'Zellen teilen', fn: () => W.tables.splitCell(2), showLabel: true }))]),
      group('Zellengröße', [col(btn({ icon: 'distribute', label: 'Spalten verteilen', fn: () => W.tables.distributeColumns(), showLabel: true }), btn({ icon: 'valign', label: 'Zeilenhöhe…', fn: () => W.cmd.rowHeight(), showLabel: true }))]),
      group('Ausrichtung', [col(row(btn({ icon: 'alignLeft', tip: 'Linksbündig', cmd: 'alignLeft' }), btn({ icon: 'alignCenter', tip: 'Zentriert', cmd: 'alignCenter' }), btn({ icon: 'alignRight', tip: 'Rechtsbündig', cmd: 'alignRight' })), row(btn({ icon: 'valign', label: 'Oben', fn: () => W.tables.setVAlign('top'), showLabel: true }), btn({ label: 'Mitte', fn: () => W.tables.setVAlign('middle'), showLabel: true }), btn({ label: 'Unten', fn: () => W.tables.setVAlign('bottom'), showLabel: true })))]),
      group('Tabellenformatvorlagen', [btn({ icon: 'tablestyle', label: 'Formatvorlagen', size: 'lg', menu: tableStyleMenu }), colorBtn({ icon: 'shading', tip: 'Zellschattierung', none: 'Keine Farbe', apply: (c) => W.tables.setShading(c), barInit: '#ffffff' }), btn({ icon: 'borders', label: 'Rahmen', tip: 'Rahmen', menu: tableBordersMenu })]),
    ];
  }

  function buildObj() {
    const sel = () => (W.floats.selected && W.floats.selected.float) || null;
    const objNum = (key, label, apply, tipTxt) => field(label, numInput({ value: 0, step: 0.1, min: 0.1, key, tip: tipTxt, onChange: apply }));
    return [
      group('Formenarten', [
        btn({ icon: 'shapes', label: 'Form ändern', size: 'lg', menu: () => { const e = []; W.floats.SHAPE_GROUPS.forEach(([t, ids]) => { e.push({ header: t }); ids.forEach((id) => e.push({ label: W.floats.SHAPES[id].label, fn: () => W.floats.update({ shape: id }) })); }); return e; }, cls: 'shapeonly' }),
        btn({ icon: 'textbox', label: 'Text bearbeiten', size: 'lg', fn: () => { const f = sel(); if (f) W.floats.editText(f.id); }, cls: 'shapeonly' }),
      ]),
      group('Formenarten und Rahmen', [
        colorBtn({ icon: 'fill', tip: 'Fülleffekt', none: 'Keine Füllung', apply: (c) => W.floats.update({ fill: c }), barInit: '#4472c4', key: 'objfill' }),
        colorBtn({ icon: 'outline', tip: 'Formkontur', none: 'Keine Kontur', apply: (c) => W.floats.update({ stroke: c, strokeW: sel() && sel().strokeW ? sel().strokeW : 1.5 }), barInit: '#2f528f', key: 'objstroke' }),
        btn({ icon: 'outline', label: 'Linienstärke', tip: 'Konturstärke und Linienart', menu: outlineWeightMenu, showLabel: true }),
        btn({ icon: 'effects', label: 'Schatten', toggle: 'objshadow', fn: () => { const f = sel(); if (f) W.floats.update({ shadow: !f.shadow }); }, showLabel: true }),
      ]),
      group('Anordnen', [
        btn({ icon: 'wrapSquare', label: 'Textumbruch', size: 'lg', tip: 'Textumbruch: Hinter den Text, Vor den Text, Quadrat …', menu: wrapMenu, cls: 'wraphl' }),
        col(btn({ icon: 'bringFront', label: 'Nach vorne', fn: () => W.floats.bringToFront(), showLabel: true }), btn({ icon: 'sendBack', label: 'Nach hinten', fn: () => W.floats.sendToBack(), showLabel: true }), btn({ icon: 'alignObjs', label: 'Ausrichten', menu: objAlignMenu, showLabel: true })),
        col(btn({ icon: 'forward', label: 'Eine Ebene vor', fn: () => W.floats.bringForward(), showLabel: true }), btn({ icon: 'backward', label: 'Eine Ebene zurück', fn: () => W.floats.sendBackward(), showLabel: true }), btn({ icon: 'rotate', label: 'Drehen', menu: rotateMenu, showLabel: true })),
        btn({ icon: 'selpane', label: 'Auswahlbereich', size: 'lg', fn: () => W.cmd.selectionPane() }),
      ]),
      group('Größe', [col(
        field('Höhe (cm)', numInput({ value: 3, step: 0.1, min: 0.1, key: 'objh', tip: 'Höhe in cm', onChange: (v) => W.cmd.objSize(null, v) })),
        field('Breite (cm)', numInput({ value: 3, step: 0.1, min: 0.1, key: 'objw', tip: 'Breite in cm', onChange: (v) => W.cmd.objSize(v, null) })))], { launcher: () => W.dialogs.objectProps(), launcherTip: 'Objekt-Eigenschaften' }),
      group('Aktionen', [col(btn({ icon: 'copy', label: 'Duplizieren', fn: () => W.floats.duplicate(), showLabel: true }), btn({ icon: 'trash', label: 'Löschen', fn: () => W.floats.deleteSelected(), showLabel: true }), btn({ icon: 'info', label: 'Eigenschaften…', fn: () => W.dialogs.objectProps(), showLabel: true }))]),
    ];
  }

  function buildHF() {
    return [
      group('Einfügen', [col(btn({ icon: 'pagenumber', label: 'Seitenzahl', fn: () => W.cmd.field('PAGE'), showLabel: true }), btn({ icon: 'pagenumber', label: 'Anzahl der Seiten', fn: () => W.cmd.field('NUMPAGES'), showLabel: true }), btn({ icon: 'calendar', label: 'Datum', fn: () => W.cmd.field('DATE'), showLabel: true }))]),
      group('Optionen', [col(btn({ icon: 'check', label: 'Erste Seite anders', fn: () => W.hf.setDiffFirst(!W.doc.diffFirst), toggle: 'diffFirst', showLabel: true }))]),
      group('Schließen', [btn({ icon: 'close', label: 'Kopf- und Fußzeile schließen', size: 'lg', fn: () => W.hf.stop() })]),
    ];
  }

  /* ------------------------------------------------------------------ */
  /*  Aufbau                                                              */
  /* ------------------------------------------------------------------ */
  const TAB_DEFS = [
    { id: 'home', label: 'Start', build: buildHome },
    { id: 'insert', label: 'Einfügen', build: buildInsert },
    { id: 'design', label: 'Entwurf', build: buildDesign },
    { id: 'layout', label: 'Layout', build: buildLayout },
    { id: 'refs', label: 'Verweise', build: buildRefs },
    { id: 'review', label: 'Überprüfen', build: buildReview },
    { id: 'view', label: 'Ansicht', build: buildView },
    { id: 'table', label: 'Tabellenlayout', build: buildTable, ctx: true },
    { id: 'obj', label: 'Formformat', build: buildObj, ctx: true },
    { id: 'hf', label: 'Kopf- und Fußzeile', build: buildHF, ctx: true },
  ];

  R.selectTab = function (id, onlyIfCtxShown) {
    const def = TAB_DEFS.find((t) => t.id === id);
    if (!def) return;
    if (def.ctx && !R.ctx[id]) return;
    R.active = id;
    W.$$('.tab', W.el.tabs).forEach((t) => t.classList.toggle('active', t.dataset.id === id));
    W.$$('.rpanel', W.el.ribbon).forEach((p) => p.classList.toggle('active', p.dataset.id === id));
  };
  R.showContext = function (id, on) {
    R.ctx[id] = on;
    const t = W.$(`.tab[data-id="${id}"]`, W.el.tabs);
    if (t) t.hidden = !on;
    if (!on && R.active === id) R.selectTab(R.prevTab && !R.ctx[R.prevTab] ? R.prevTab : 'home');
    if (on && id !== 'obj') { /* nichts */ }
  };

  R.build = function () {
    buildTitlebar();
    // Tabs
    const tabs = W.el.tabs, rib = W.el.ribbon;
    const fileTab = h('button.tab.file', { type: 'button', dataset: { id: 'file' }, onclick: () => R.openBackstage('info') }, 'Datei');
    tabs.appendChild(fileTab);
    TAB_DEFS.forEach((d) => {
      const tab = h('button.tab' + (d.ctx ? '.ctx' : ''), { type: 'button', dataset: { id: d.id }, role: 'tab', hidden: !!d.ctx }, d.label);
      tab.addEventListener('click', () => { R.prevTab = R.active; R.selectTab(d.id); });
      tab.addEventListener('dblclick', () => W.el.app.classList.toggle('ribbon-collapsed'));
      tabs.appendChild(tab);
      const panel = h('div.rpanel', { dataset: { id: d.id }, role: 'tabpanel' }, d.build());
      rib.appendChild(panel);
    });
    tabs.appendChild(h('div.tabspace'));
    tabs.appendChild(h('button.tab.help', { type: 'button', onclick: () => W.dialogs.shortcuts(), title: 'Tastenkürzel' }, 'Hilfe'));
    rib.addEventListener('mousedown', (e) => { if (!e.target.closest('input,select')) e.preventDefault(); });
    R.selectTab('home');
    buildStatus();
    buildNav();
    bindState();
    buildBackstage();
    W.ruler && W.ruler.init();
  };

  /* ---- Titelleiste ---- */
  function buildTitlebar() {
    const tb = W.el.titlebar;
    const titleInput = h('input.doctitle', { type: 'text', value: W.doc.title, spellcheck: false, 'aria-label': 'Dokumenttitel' });
    titleInput.addEventListener('change', () => { W.doc.title = titleInput.value.trim() || 'Dokument'; document.title = W.doc.title + ' – Wohni Writer'; W.markDirty(); });
    titleInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { titleInput.blur(); W.fmt.refocus(); } });
    const saveInd = h('span.saveind', 'Neu');
    const qbtn = (icon, tp, fn, id) => noFocusSteal(h('button.qbtn', { type: 'button', title: tp, 'aria-label': tp, html: W.icon(icon, 18), onclick: fn, id }));
    tb.append(
      h('div.brand', h('span.logo', 'W'), h('span.appname', 'Wohni Writer')),
      h('div.qat', qbtn('save', tip('Speichern', M + 'S'), () => W.files.save()), qbtn('undo', tip('Rückgängig', M + 'Z'), () => W.cmd.undo(), 'qUndo'), qbtn('redo', tip('Wiederholen', M + 'Y'), () => W.cmd.redo(), 'qRedo'), qbtn('print', tip('Drucken', M + 'P'), () => W.files.print())),
      h('div.titlewrap', titleInput, saveInd),
      h('div.tbspace'),
      h('button.qbtn.wide', { type: 'button', title: 'Öffnen', onclick: () => W.files.openDialog() }, W.iconEl('open', 16), ' Öffnen'),
      h('button.qbtn.wide.primary', { type: 'button', title: 'Als .docx auf dem Rechner speichern', onclick: () => W.files.save() }, W.iconEl('save', 16), ' Speichern')
    );
    W.on('docloaded', () => { titleInput.value = W.doc.title; });
    const upd = () => { saveInd.textContent = W.dirty ? 'Nicht gespeichert' : (W.fileName ? 'Gespeichert' : 'Neu'); saveInd.classList.toggle('dirty', !!W.dirty); };
    W.on('change', upd); W.on('saved', upd); W.on('docloaded', upd);
    W.on('history', () => { const u1 = W.$('#qUndo'), r1 = W.$('#qRedo'); if (u1) u1.disabled = !W.history.canUndo(); if (r1) r1.disabled = !W.history.canRedo(); });
  }

  /* ---- Statusleiste ---- */
  function buildStatus() {
    const st = W.el.status;
    const pageEl = h('button.sitem', { type: 'button', title: 'Seite' });
    const wordEl = h('button.sitem', { type: 'button', title: 'Wörter zählen', onclick: () => W.dialogs.stats() });
    const langEl = h('button.sitem', { type: 'button', title: 'Sprache', onclick: (e) => ui.menu(e.currentTarget, langMenu()) }, 'Deutsch');
    const vPrint = h('button.sbtn', { type: 'button', title: 'Drucklayout', html: W.icon('printlayout', 16), onclick: () => W.view.setMode('print') });
    const vWeb = h('button.sbtn', { type: 'button', title: 'Weblayout', html: W.icon('weblayout', 16), onclick: () => W.view.setMode('web') });
    const slider = h('input.zslider', { type: 'range', min: 25, max: 300, value: 100, title: 'Zoom' });
    const zl = h('button.sitem.zl', { type: 'button', title: 'Zoom', onclick: (e) => ui.menu(e.currentTarget, zoomMenu()) }, '100 %');
    slider.addEventListener('input', () => W.view.setZoom(slider.value / 100));
    st.append(pageEl, wordEl, langEl, h('div.sspace'), vPrint, vWeb,
      h('button.sbtn', { type: 'button', title: 'Verkleinern', html: W.icon('minus', 14), onclick: () => W.view.setZoom(W.view.zoom - 0.1) }), slider,
      h('button.sbtn', { type: 'button', title: 'Vergrößern', html: W.icon('plus', 14), onclick: () => W.view.setZoom(W.view.zoom + 0.1) }), zl);
    const upd = W.debounce(() => {
      const cur = W.view.currentPage() + 1;
      pageEl.textContent = `Seite ${cur} von ${W.layout.info.pageCount}`;
      const s = W.stats(true);
      const selOnly = !getSelection().isCollapsed && W.sel.activeRoot();
      wordEl.textContent = selOnly ? `${s.words} von ${W.stats(false).words} Wörtern` : `${s.words} Wörter`;
    }, 120);
    W.on('layout', upd); W.on('scroll', upd); W.on('selection', upd);
    W.on('zoom', (z) => { slider.value = Math.round(z * 100); zl.textContent = Math.round(z * 100) + ' %'; upd(); });
    W.on('viewmode', (m) => { vPrint.classList.toggle('on', m === 'print'); vWeb.classList.toggle('on', m === 'web'); });
    vPrint.classList.add('on');
    pageEl.addEventListener('click', () => { W.cmd.toggleNav(true); });
  }

  /* ---- Navigationsbereich ---- */
  function buildNav() {
    const nav = W.el.navpane;
    const head = h('div.navhead', h('b', 'Navigation'), h('button.qbtn', { type: 'button', title: 'Schließen', html: W.icon('close', 14), onclick: () => W.cmd.toggleNav(false) }));
    const tabs = h('div.navtabs');
    const list = h('div.navlist');
    let mode = 'heads';
    const tH = h('button.on', { type: 'button', onclick: () => { mode = 'heads'; draw(); } }, 'Überschriften');
    const tP = h('button', { type: 'button', onclick: () => { mode = 'pages'; draw(); } }, 'Seiten');
    tabs.append(tH, tP);
    nav.append(head, tabs, list);
    function draw() {
      tH.classList.toggle('on', mode === 'heads'); tP.classList.toggle('on', mode === 'pages');
      list.innerHTML = '';
      if (nav.hidden) return;
      if (mode === 'heads') {
        const hs = W.$$('h1,h2,h3', W.el.flow).filter((e) => !e.hasAttribute('data-cont'));
        if (!hs.length) list.appendChild(h('p.muted.pad', 'Das Dokument enthält keine Überschriften. Formatiere Text mit „Überschrift 1–3“, um eine Gliederung zu erhalten.'));
        hs.forEach((e) => {
          const lvl = +e.tagName[1];
          const b = h('button.navitem', { type: 'button', style: { paddingLeft: (10 + (lvl - 1) * 14) + 'px' } }, W.stripZW(e.textContent) || '(leer)');
          b.addEventListener('click', () => { const pg = W.layout.pageMap.get(e) || 0; e.scrollIntoView({ block: 'center' }); W.sel.caretIn(e, false); W.el.flow.focus(); });
          list.appendChild(b);
        });
      } else {
        for (let i = 0; i < W.layout.info.pageCount; i++) {
          const first = Array.from(W.el.flow.children).find((b) => (W.layout.pageMap.get(b) || 0) === i && b.textContent.trim());
          const b = h('button.navitem.page', { type: 'button' }, h('b', 'Seite ' + (i + 1)), h('span', first ? W.stripZW(first.textContent).slice(0, 60) : '(leer)'));
          b.addEventListener('click', () => W.view.scrollToPage(i));
          list.appendChild(b);
        }
      }
    }
    R.drawNav = W.debounce(draw, 250);
    W.on('layout', R.drawNav);
  }

  /* ---- Ribbon-Zustand ---- */
  function bindState() {
    W.on('state', (st) => {
      st = st || W.fmt.state();
      R.toggles.forEach((t) => {
        let on = false;
        switch (t.key) {
          case 'bold': case 'italic': case 'underline': case 'strike': case 'sub': case 'sup': on = !!st[t.key]; break;
          case 'align': on = st.align === t.val; break;
          case 'bullets': on = st.list === 'b'; break;
          case 'numbering': on = st.list === 'n'; break;
          case 'marks': on = W.el.flow.classList.contains('marks'); break;
          case 'viewmode': on = W.doc.view === t.val; break;
          case 'ruler': on = !W.el.rulerbar.hidden; break;
          case 'nav': on = !W.el.navpane.hidden; break;
          case 'spell': on = W.el.flow.spellcheck; break;
          case 'dark': on = document.body.classList.contains('dark'); break;
          case 'diffFirst': on = !!W.doc.diffFirst; break;
          case 'objshadow': on = !!(W.floats.selected && W.floats.selected.float && W.floats.selected.float.shadow); break;
        }
        t.el.classList.toggle('on', on);
      });
      if (R.fontInput && document.activeElement !== R.fontInput) R.fontInput.value = st.font || '';
      if (R.sizeInput && document.activeElement !== R.sizeInput) R.sizeInput.value = st.size ? String(st.size).replace('.', ',') : '';
      if (R.styleGallery) W.$$('.stile', R.styleGallery).forEach((t) => t.classList.toggle('on', t.dataset.id === st.style));
      // Absatzfelder
      if (st.block) {
        const cs = getComputedStyle(st.block);
        const set = (key, v) => (R.fields || []).filter((f) => f.key === key).forEach((f) => { if (document.activeElement !== f.el) f.el.value = v; });
        set('indentLeft', (u.px2cm(parseFloat(cs.marginLeft) || 0)).toFixed(2));
        set('indentRight', (u.px2cm(parseFloat(cs.marginRight) || 0)).toFixed(2));
        set('spaceBefore', Math.round(u.px2pt(parseFloat(cs.marginTop) || 0)));
        set('spaceAfter', Math.round(u.px2pt(parseFloat(cs.marginBottom) || 0)));
      }
    });
    W.on('viewmode', () => W.emit('state'));
    W.on('objselect', (f) => {
      const set = (key, v) => (R.fields || []).filter((x) => x.key === key).forEach((x) => { if (document.activeElement !== x.el) x.el.value = v; });
      const fl = W.floats.selected && W.floats.selected.float;
      const isShape = !!fl && (fl.kind === 'shape' || fl.kind === 'textbox');
      W.$$('.shapeonly', W.el.ribbon).forEach((b) => { b.style.display = isShape ? '' : 'none'; });
      const tab = W.$('.tab[data-id="obj"]');
      if (tab) tab.textContent = fl ? (fl.kind === 'image' ? 'Bildformat' : fl.kind === 'textbox' ? 'Textfeldformat' : 'Formformat') : (f && f.inline ? 'Bildformat' : 'Formformat');
      if (fl) { set('objw', u.px2cm(fl.w).toFixed(2)); set('objh', u.px2cm(fl.h).toFixed(2)); (R.colorBars || []).forEach((c) => { if (c.key === 'objfill' && c.set) c.set(fl.fill); if (c.key === 'objstroke' && c.set) c.set(fl.stroke); }); }
      W.emit('state');
    });
    W.on('objgeom', (fl) => { const set = (key, v) => (R.fields || []).filter((x) => x.key === key).forEach((x) => { if (document.activeElement !== x.el) x.el.value = v; }); set('objw', u.px2cm(fl.w).toFixed(2)); set('objh', u.px2cm(fl.h).toFixed(2)); });
    W.on('tablecontext', (t) => {
      const on = !!t && !W.floats.selected;
      if (!!R.ctx.table !== on) { R.showContext('table', on); }
    });
    W.on('hf-edit', () => W.emit('state'));
  }

  /* ------------------------------------------------------------------ */
  /*  Datei-Menü (Backstage)                                              */
  /* ------------------------------------------------------------------ */
  function buildBackstage() {
    const bs = W.el.backstage;
    bs.innerHTML = '';
    const nav = h('div.bsnav');
    const content = h('div.bscontent');
    const items = [
      ['info', 'info', 'Informationen'], ['new', 'new', 'Neu'], ['open', 'open', 'Öffnen'], ['save', 'save', 'Speichern'], ['saveas', 'saveas', 'Speichern unter'],
      ['print', 'print', 'Drucken'], ['export', 'pdf', 'Exportieren'], ['insertfile', 'docx', 'Datei einfügen'], ['options', 'help', 'Optionen'],
    ];
    nav.appendChild(h('button.bsback', { type: 'button', title: 'Zurück zum Dokument', html: W.icon('up', 22).replace('<svg', '<svg style="transform:rotate(-90deg)"'), onclick: () => R.closeBackstage() }));
    items.forEach(([id, icon, label]) => nav.appendChild(h('button.bsitem', { type: 'button', dataset: { id }, html: W.icon(icon, 20) + `<span>${label}</span>`, onclick: () => R.openBackstage(id) })));
    bs.append(nav, content);
    bs.addEventListener('keydown', (e) => { if (e.key === 'Escape') R.closeBackstage(); });
    R.bsContent = content;
  }
  R.closeBackstage = function () { W.el.backstage.hidden = true; W.fmt.refocus(); };
  R.openBackstage = function (id) {
    const bs = W.el.backstage;
    bs.hidden = false;
    W.$$('.bsitem', bs).forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    const c = R.bsContent; c.innerHTML = '';
    const act = (fn) => { R.closeBackstage(); setTimeout(fn, 20); };
    const big = (icon, title, desc, fn) => h('button.bsbig', { type: 'button', onclick: () => act(fn), html: `${W.icon(icon, 34)}<span><b>${title}</b><small>${desc}</small></span>` });
    switch (id) {
      case 'info': {
        const s = W.stats();
        c.append(h('h1', W.doc.title), h('p.muted', W.fileName ? `Datei: ${W.fileName}` : 'Noch nicht auf dem Rechner gespeichert'),
          h('div.bsstats', h('div', h('b', String(s.pages)), 'Seiten'), h('div', h('b', String(s.words)), 'Wörter'), h('div', h('b', String(s.chars)), 'Zeichen'), h('div', h('b', String(s.paragraphs)), 'Absätze')),
          big('info', 'Eigenschaften', 'Titel und Autor des Dokuments bearbeiten', () => W.dialogs.properties()),
          big('save', 'Auf diesem Rechner speichern', 'Als Word-Dokument (.docx)', () => W.files.save()));
        break;
      }
      case 'new': {
        c.append(h('h1', 'Neu'));
        const grid = h('div.tplgrid');
        W.templates.list.forEach((t) => {
          const card = h('button.tplcard', { type: 'button', onclick: () => act(() => W.files.newDoc(t.id)) }, h('div.tplthumb', { html: t.thumb }), h('b', t.name), h('small', t.desc));
          grid.appendChild(card);
        });
        c.append(grid);
        break;
      }
      case 'open':
        c.append(h('h1', 'Öffnen'), big('open', 'Datei von diesem Rechner öffnen', 'Word-Dokumente (.docx), Text (.txt) und HTML', () => W.files.openDialog()),
          h('div.dropzone', W.iconEl('open', 40), h('p', 'Oder eine Datei hierher ziehen – auch direkt auf das Dokument.')));
        break;
      case 'save': act(() => W.files.save()); return;
      case 'saveas':
        c.append(h('h1', 'Speichern unter'), big('docx', 'Word-Dokument (.docx)', 'Wird auf deinem Rechner gespeichert – du wählst Ordner und Namen', () => W.files.saveAs()),
          big('html', 'Webseite (.html)', 'Einfaches HTML mit eingebetteten Bildern', () => W.files.exportHTML()), big('txt', 'Nur Text (.txt)', 'Reiner Text ohne Formatierung', () => W.files.exportText()));
        break;
      case 'print': c.append(h('h1', 'Drucken'), big('print', 'Drucken / Als PDF speichern', 'Öffnet den Druckdialog des Browsers – dort „Als PDF speichern“ wählen', () => W.files.print())); break;
      case 'export':
        c.append(h('h1', 'Exportieren'), big('pdf', 'PDF erstellen', 'Über den Druckdialog des Browsers (Ziel: „Als PDF speichern“)', () => W.files.print()), big('docx', 'Word-Dokument (.docx)', 'Kompatibel mit Microsoft Word und LibreOffice', () => W.files.saveAs()), big('html', 'Webseite (.html)', 'HTML-Datei', () => W.files.exportHTML()), big('txt', 'Nur Text (.txt)', 'Reiner Text', () => W.files.exportText()));
        break;
      case 'insertfile':
        c.append(h('h1', 'Datei einfügen'), big('docx', 'Inhalt aus Word-Datei einfügen', 'Fügt den Inhalt einer vorhandenen .docx-Datei an der Cursorposition ein', () => W.files.insertFileDialog()));
        break;
      case 'options': {
        const auto = h('input', { type: 'checkbox' }); auto.checked = W.files.autosaveEnabled();
        auto.addEventListener('change', () => W.files.setAutosave(auto.checked));
        const dark = h('input', { type: 'checkbox' }); dark.checked = document.body.classList.contains('dark');
        dark.addEventListener('change', () => W.cmd.toggleDark());
        c.append(h('h1', 'Optionen'), h('label.fcheck.opt', auto, ' Dokument automatisch im Browser zwischenspeichern (Wiederherstellung nach Absturz)'), h('label.fcheck.opt', dark, ' Dunkles Erscheinungsbild'),
          h('p', h('button.dbtn', { type: 'button', onclick: () => W.dialogs.shortcuts() }, 'Tastenkürzel'), ' ', h('button.dbtn', { type: 'button', onclick: () => W.dialogs.about() }, 'Info')));
        break;
      }
    }
  }
})();
