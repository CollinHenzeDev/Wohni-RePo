/* Wohni Writer – UI-Bausteine (Menüs, Farbwähler, Dialoge) und alle Dialoge */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;
  const u = W.u;
  const ui = (W.ui = W.ui || {});

  /* ------------------------------------------------------------------ */
  /*  Popup-Menüs                                                         */
  /* ------------------------------------------------------------------ */
  let openMenus = [];
  let outside = null;

  ui.closeMenus = function () {
    openMenus.forEach((m) => m.remove());
    openMenus = [];
    if (outside) { document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', outside, true); outside = null; }
    document.querySelectorAll('.rbtn.open').forEach((b) => b.classList.remove('open'));
  };

  function place(menu, anchor, opts) {
    const r = anchor.getBoundingClientRect();
    menu.style.visibility = 'hidden';
    W.el.overlays.appendChild(menu);
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let x = opts && opts.right ? r.right : r.left, y = opts && opts.side ? r.top : r.bottom + 1;
    if (opts && opts.side) x = r.right - 2;
    if (x + mw > window.innerWidth - 6) x = (opts && opts.side) ? r.left - mw + 2 : window.innerWidth - mw - 6;
    if (y + mh > window.innerHeight - 6) y = Math.max(6, (opts && opts.side) ? window.innerHeight - mh - 6 : r.top - mh - 1);
    menu.style.left = Math.max(4, x) + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = '';
  }

  ui.menu = function (anchor, entries, opts) {
    opts = opts || {};
    if (!opts.sub) ui.closeMenus();
    if (anchor && !anchor.isConnected) { W.el.overlays.appendChild(anchor); const a = anchor; setTimeout(() => a.remove(), 0); }
    const m = h('div.menu' + (opts.cls ? '.' + opts.cls : ''));
    if (opts.minWidth) m.style.minWidth = opts.minWidth + 'px';
    entries.forEach((e) => {
      if (!e) return;
      if (e.sep) { m.appendChild(h('div.msep')); return; }
      if (e.header) { m.appendChild(h('div.mhead', e.header)); return; }
      if (e.node) { m.appendChild(e.node); return; }
      const item = h('button.mi' + (e.disabled ? '.dis' : '') + (e.checked ? '.chk' : ''), { type: 'button' });
      item.appendChild(h('span.mi-ico', { html: e.icon ? W.icon(e.icon, 18) : '' }));
      item.appendChild(h('span.mi-label', { html: e.html || W.esc(e.label || '') }));
      if (e.hint) item.appendChild(h('span.mi-hint', e.hint));
      if (e.checked) item.appendChild(h('span.mi-check', { html: W.icon('check', 14) }));
      if (e.sub) item.appendChild(h('span.mi-arrow', '▸'));
      item.addEventListener('mousedown', (ev) => ev.preventDefault());
      if (e.sub) {
        let t;
        item.addEventListener('mouseenter', () => {
          clearTimeout(t);
          t = setTimeout(() => {
            openMenus.filter((x) => x._parent === m).forEach((x) => { x.remove(); openMenus = openMenus.filter((y) => y !== x); });
            const sub = ui.menu(item, typeof e.sub === 'function' ? e.sub() : e.sub, { sub: true, side: true });
            sub._parent = m;
          }, 120);
        });
        item.addEventListener('click', () => item.dispatchEvent(new Event('mouseenter')));
      } else {
        item.addEventListener('mouseenter', () => { openMenus.filter((x) => x._parent === m).forEach((x) => { x.remove(); openMenus = openMenus.filter((y) => y !== x); }); });
        item.addEventListener('click', () => {
          if (e.disabled) return;
          if (!opts.keepOpen && !e.keepOpen) ui.closeMenus();
          if (e.fn) e.fn(e.arg);
          else if (e.cmd && W.cmd[e.cmd]) W.cmd[e.cmd](e.arg);
        });
      }
      m.appendChild(item);
    });
    place(m, anchor, opts);
    openMenus.push(m);
    if (!opts.sub) {
      anchor.classList && anchor.classList.add('open');
      setTimeout(() => {
        outside = (ev) => {
          if (ev.type === 'keydown') { if (ev.key === 'Escape') ui.closeMenus(); return; }
          if (openMenus.some((x) => x.contains(ev.target))) return;
          if (anchor.contains && anchor.contains(ev.target)) { /* Umschalten erledigt der Aufrufer */ }
          ui.closeMenus();
        };
        document.addEventListener('mousedown', outside, true);
        document.addEventListener('keydown', outside, true);
      }, 0);
    }
    return m;
  };

  /* ------------------------------------------------------------------ */
  /*  Farben                                                              */
  /* ------------------------------------------------------------------ */
  const mix = (hex, to, p) => {
    const a = W.color.parse(hex), b = to;
    return W.color.hex({ r: a.r + (b - a.r) * p, g: a.g + (b - a.g) * p, b: a.b + (b - a.b) * p });
  };
  const THEME = ['#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];
  const STANDARD = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];
  const HIGHLIGHTS = [['#ffff00', 'Gelb'], ['#00ff00', 'Hellgrün'], ['#00ffff', 'Türkis'], ['#ff00ff', 'Rosa'], ['#0000ff', 'Blau'], ['#ff0000', 'Rot'], ['#000080', 'Dunkelblau'], ['#008080', 'Dunkeltürkis'], ['#008000', 'Grün'], ['#800080', 'Violett'], ['#800000', 'Dunkelrot'], ['#808000', 'Dunkelgelb'], ['#808080', 'Grau 50%'], ['#c0c0c0', 'Grau 25%'], ['#000000', 'Schwarz']];

  function swatch(color, title, onPick, cur) {
    const b = h('button.sw', { type: 'button', title: title || color, style: { background: color } });
    if (cur && W.color.hex(cur) === color) b.classList.add('cur');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => onPick(color));
    return b;
  }

  /** opts: {title, current, none:'Keine Farbe'|'Automatisch', highlight:true, onPick(color|null)} */
  ui.colorMenu = function (anchor, opts) {
    const pick = (c) => { ui.closeMenus(); opts.onPick(c); };
    const box = h('div.colorbox');
    if (opts.none !== false) {
      const nb = h('button.mi.nocolor', { type: 'button', html: `<span class="mi-ico">${W.icon('close', 16)}</span><span class="mi-label">${opts.none || 'Keine Farbe'}</span>` });
      nb.addEventListener('mousedown', (e) => e.preventDefault());
      nb.addEventListener('click', () => pick(null));
      box.appendChild(nb);
    }
    if (opts.highlight) {
      box.appendChild(h('div.mhead', 'Hervorhebungsfarben'));
      const g = h('div.swgrid.hl');
      HIGHLIGHTS.forEach(([c, n]) => g.appendChild(swatch(c, n, pick, opts.current)));
      box.appendChild(g);
    } else {
      box.appendChild(h('div.mhead', 'Designfarben'));
      const g = h('div.swgrid');
      THEME.forEach((c) => g.appendChild(swatch(c, c, pick, opts.current)));
      const rows = [[0.8, 255], [0.6, 255], [0.4, 255], [0.25, 0], [0.5, 0]];
      rows.forEach(([p, to]) => THEME.forEach((c, i) => {
        let col;
        if (i === 0) col = mix('#ffffff', 0, [0.05, 0.15, 0.25, 0.35, 0.5][rows.findIndex((r) => r[0] === p)]);
        else if (i === 1) col = mix('#000000', 255, [0.5, 0.35, 0.25, 0.15, 0.05][rows.findIndex((r) => r[0] === p)]);
        else col = mix(c, to, p);
        g.appendChild(swatch(col, col, pick, opts.current));
      }));
      box.appendChild(g);
      box.appendChild(h('div.mhead', 'Standardfarben'));
      const g2 = h('div.swgrid');
      STANDARD.forEach((c) => g2.appendChild(swatch(c, c, pick, opts.current)));
      box.appendChild(g2);
    }
    const more = h('label.mi.morecolor', { html: `<span class="mi-ico">${W.icon('pagecolor', 16)}</span><span class="mi-label">Weitere Farben…</span>` });
    const inp = h('input', { type: 'color', value: opts.current && W.color.hex(opts.current) || '#4472c4' });
    inp.style.cssText = 'position:absolute;opacity:0;width:0;height:0';
    inp.addEventListener('input', () => { pick(inp.value); });
    inp.addEventListener('click', (e) => e.stopPropagation());
    more.appendChild(inp);
    more.addEventListener('mousedown', (e) => { e.preventDefault(); });
    more.addEventListener('click', () => inp.click());
    box.appendChild(more);
    return ui.menu(anchor, [{ node: box }], { cls: 'colormenu' });
  };

  /* ------------------------------------------------------------------ */
  /*  Dialoge                                                             */
  /* ------------------------------------------------------------------ */
  ui.dialog = function (opts) {
    const back = h('div.modal-back');
    const dlg = h('div.dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
    if (opts.width) dlg.style.width = opts.width + 'px';
    const head = h('div.dhead', h('span', opts.title), h('button.dclose', { type: 'button', title: 'Schließen', html: W.icon('close', 16), onclick: () => close(false) }));
    const body = h('div.dbody');
    if (opts.body) body.appendChild(typeof opts.body === 'function' ? opts.body(close) : opts.body);
    const foot = h('div.dfoot');
    (opts.buttons || [{ label: 'Schließen', primary: true }]).forEach((b) => {
      const btn = h('button.dbtn' + (b.primary ? '.primary' : ''), { type: 'button' }, b.label);
      btn.addEventListener('click', () => {
        const r = b.onClick ? b.onClick(close) : undefined;
        if (r !== false && !b.keepOpen) close(true);
      });
      foot.appendChild(btn);
      b.el = btn;
    });
    dlg.append(head, body, foot);
    back.appendChild(dlg);
    ui.closeMenus();
    document.body.appendChild(back);
    // Ziehen am Titel
    let dr = null;
    head.addEventListener('mousedown', (e) => { if (e.target.closest('button')) return; const r = dlg.getBoundingClientRect(); dr = { dx: e.clientX - r.left, dy: e.clientY - r.top }; dlg.style.position = 'fixed'; dlg.style.left = r.left + 'px'; dlg.style.top = r.top + 'px'; dlg.style.margin = '0'; e.preventDefault(); });
    const mv = (e) => { if (dr) { dlg.style.left = Math.max(0, e.clientX - dr.dx) + 'px'; dlg.style.top = Math.max(0, e.clientY - dr.dy) + 'px'; } };
    const up = () => { dr = null; };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    function close(ok) {
      document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
      document.removeEventListener('keydown', key, true);
      back.remove();
      if (opts.onClose) opts.onClose(ok);
      if (opts.refocus !== false) setTimeout(() => W.fmt.refocus(), 0);
    }
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
      else if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        const p = (opts.buttons || []).find((b) => b.primary);
        if (p && p.el) { e.preventDefault(); p.el.click(); }
      }
    };
    document.addEventListener('keydown', key, true);
    setTimeout(() => { const f = dlg.querySelector('input:not([type=checkbox]):not([type=radio]),select,textarea'); if (f) { f.focus(); if (f.select && f.type !== 'color') try { f.select(); } catch (e) { /* */ } } }, 30);
    return { el: dlg, close, body };
  };

  /* Formularhelfer */
  const F = (ui.f = {
    row(label, ...ctrls) { return h('div.frow', h('label', label), h('div.fctrls', ctrls)); },
    num(value, o) {
      o = o || {};
      const i = h('input', { type: 'number', value: value, step: o.step || 0.1, min: o.min, max: o.max, style: { width: (o.w || 80) + 'px' } });
      return i;
    },
    text(value, o) { return h('input', { type: 'text', value: value || '', style: { width: ((o && o.w) || 220) + 'px' }, placeholder: (o && o.ph) || '' }); },
    select(options, value, o) {
      const s = h('select', { style: o && o.w ? { width: o.w + 'px' } : null });
      options.forEach((op) => { const [v, l] = Array.isArray(op) ? op : [op, op]; const e = h('option', { value: v }, l); if (String(v) === String(value)) e.selected = true; s.appendChild(e); });
      return s;
    },
    check(label, checked) { const i = h('input', { type: 'checkbox' }); i.checked = !!checked; return { el: h('label.fcheck', i, ' ' + label), input: i }; },
    color(value) {
      const i = h('input', { type: 'color', value: W.color.hex(value) || '#000000' });
      return i;
    },
  });

  const D = (W.dialogs = {});
  const cm = (px) => Math.round(u.px2cm(px) * 100) / 100;

  /* ---- Link ---- */
  D.link = function () {
    W.fmt.refocus();
    const a = W.fmt.currentLink();
    const selText = getSelection().toString();
    const t = F.text(a ? a.textContent : selText, { w: 300 });
    const url = F.text(a ? a.getAttribute('href') : 'https://', { w: 300 });
    ui.dialog({
      title: 'Link einfügen', width: 460,
      body: h('div', F.row('Anzuzeigender Text:', t), F.row('Adresse:', url)),
      buttons: [
        { label: 'Link entfernen', onClick: () => { W.fmt.refocus(); W.fmt.setLink(null); } },
        { label: 'Abbrechen' },
        { label: 'OK', primary: true, onClick: () => { setTimeout(() => { W.fmt.refocus(); W.fmt.setLink(url.value.trim(), t.value.trim() || url.value.trim()); }, 0); } },
      ],
      refocus: false,
    });
  };

  /* ---- Symbole ---- */
  const SYMS = {
    'Häufig': '© ® ™ § ¶ † ‡ • … – — ‘ ’ “ ” „ « » ‹ › € £ ¥ ¢ ° ± × ÷ ≠ ≈ ≤ ≥ ∞ µ ½ ¼ ¾ ¹ ² ³ ‰ ← → ↑ ↓ ↔ ✓ ✗ ★ ☆ ♥ ♦ ♠ ♣ ☺ ☎ ✉ ✈ ☀ ☁ ☂',
    'Latein': 'À Á Â Ã Ä Å Æ Ç È É Ê Ë Ì Í Î Ï Ð Ñ Ò Ó Ô Õ Ö Ø Ù Ú Û Ü Ý Þ ß à á â ã ä å æ ç è é ê ë ì í î ï ð ñ ò ó ô õ ö ø ù ú û ü ý þ ÿ Ā ā Ă ă Ą ą Ć ć Č č Ď ď Đ đ Ē ē Ę ę Ě ě Ğ ğ Ī ī İ ı Ł ł Ń ń Ň ň Ő ő Œ œ Ř ř Ś ś Ş ş Š š Ť ť Ū ū Ů ů Ű ű Ź ź Ż ż Ž ž',
    'Griechisch': 'Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ ς τ υ φ χ ψ ω',
    'Mathematik': '+ − × ÷ ± ∓ = ≠ ≈ ≡ ≤ ≥ < > ∞ ∑ ∏ ∫ ∂ ∆ ∇ √ ∛ ∝ ∈ ∉ ∩ ∪ ⊂ ⊃ ⊆ ⊇ ∧ ∨ ¬ ∀ ∃ ∅ ° ′ ″ ‰ ½ ⅓ ⅔ ¼ ¾ ⅛ ⅜ ⅝ ⅞ ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉',
    'Pfeile': '← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇑ ⇒ ⇓ ⇔ ⇕ ➔ ➜ ➤ ➡ ⬅ ⬆ ⬇ ↩ ↪ ↺ ↻ ⟵ ⟶ ⟷',
    'Währung': '$ € £ ¥ ¢ ₣ ₤ ₹ ₽ ₩ ₪ ₫ ₴ ₿ ฿ ₡ ₦ ₱ ₲ ₵ ¤',
    'Zeichen': '✓ ✔ ✗ ✘ ★ ☆ ♥ ♡ ♦ ♠ ♣ ☺ ☻ ☹ ☎ ✆ ✉ ✈ ☀ ☁ ☂ ☃ ☕ ♫ ♪ ⚠ ⚡ ✂ ✏ ✒ ⌚ ⌛ ☑ ☒ ◆ ◇ ■ □ ▲ △ ▼ ▽ ● ○ ◎',
  };
  D.symbol = function () {
    W.fmt.refocus();
    const gridHost = h('div.symgrid');
    const tabs = h('div.symtabs');
    const sel = h('div.symsel', 'Zeichen wählen');
    let cur = 'Häufig';
    function show(cat) {
      cur = cat;
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.textContent === cat));
      gridHost.innerHTML = '';
      SYMS[cat].split(' ').forEach((ch) => {
        const b = h('button', { type: 'button', title: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') }, ch);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { sel.textContent = ch + '   U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'); });
        b.addEventListener('dblclick', () => { W.fmt.refocus(); W.fmt.insertText(ch); });
        gridHost.appendChild(b);
      });
    }
    Object.keys(SYMS).forEach((k) => tabs.appendChild(h('button', { type: 'button', onclick: () => show(k) }, k)));
    show(cur);
    ui.dialog({
      title: 'Symbol', width: 560, body: h('div', tabs, gridHost, sel),
      buttons: [{ label: 'Schließen' }, { label: 'Einfügen', primary: true, keepOpen: true, onClick: () => { const ch = sel.textContent.split(' ')[0]; if (ch && ch !== 'Zeichen') { W.fmt.refocus(); W.fmt.insertText(ch); } return false; } }],
    });
  };

  /* ---- Tabelle ---- */
  D.table = function () {
    W.fmt.refocus();
    const rows = F.num(3, { step: 1, min: 1, max: 100, w: 70 }), cols = F.num(3, { step: 1, min: 1, max: 20, w: 70 });
    ui.dialog({
      title: 'Tabelle einfügen', width: 340,
      body: h('div', F.row('Spaltenanzahl:', cols), F.row('Zeilenanzahl:', rows)),
      buttons: [{ label: 'Abbrechen' }, { label: 'OK', primary: true, onClick: () => { setTimeout(() => { W.fmt.refocus(); W.tables.insert(+rows.value || 3, +cols.value || 3); }, 0); } }],
      refocus: false,
    });
  };

  /* ---- Seite einrichten ---- */
  D.pageSetup = function () {
    const p = W.doc.page;
    const m = {
      t: F.num(cm(p.t), { w: 70 }), b: F.num(cm(p.b), { w: 70 }), l: F.num(cm(p.l), { w: 70 }), r: F.num(cm(p.r), { w: 70 }),
      hd: F.num(cm(p.hdist), { w: 70 }), fd: F.num(cm(p.fdist), { w: 70 }),
    };
    const orient = F.select([['portrait', 'Hochformat'], ['landscape', 'Querformat']], p.orient);
    const sizes = Object.entries(W.PAGE_SIZES).map(([k, v]) => [k, v.label]).concat([['custom', 'Benutzerdefiniert']]);
    const size = F.select(sizes, p.size);
    const pw = F.num(cm(Math.min(p.w, p.h)), { w: 70 }), ph = F.num(cm(Math.max(p.w, p.h)), { w: 70 });
    const diff = F.check('Erste Seite anders', W.doc.diffFirst);
    const color = F.color(p.color);
    const syncSize = () => { if (size.value !== 'custom') { const s = W.PAGE_SIZES[size.value]; pw.value = (s.w / 10).toFixed(2); ph.value = (s.h / 10).toFixed(2); } };
    size.addEventListener('change', syncSize);
    const presets = h('div.presets');
    Object.entries(W.MARGIN_PRESETS).forEach(([k, v]) => presets.appendChild(h('button.dbtn', { type: 'button', onclick: () => { m.t.value = v.t; m.b.value = v.b; m.l.value = v.l; m.r.value = v.r; } }, v.label)));
    ui.dialog({
      title: 'Seite einrichten', width: 520,
      body: h('div',
        h('fieldset', h('legend', 'Seitenränder (cm)'), presets,
          F.row('Oben:', m.t, h('span.sp'), 'Unten:', m.b), F.row('Links:', m.l, h('span.sp'), 'Rechts:', m.r)),
        h('fieldset', h('legend', 'Papier'), F.row('Papierformat:', size), F.row('Breite × Höhe (cm):', pw, ' × ', ph), F.row('Ausrichtung:', orient)),
        h('fieldset', h('legend', 'Layout'), F.row('Kopfzeile (Abstand vom Rand, cm):', m.hd), F.row('Fußzeile (Abstand vom Rand, cm):', m.fd), diff.el, F.row('Seitenfarbe:', color))),
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, onClick: () => {
          W.edit(() => {
            let w = u.cm2px(+pw.value || 21), hh = u.cm2px(+ph.value || 29.7);
            if (size.value !== 'custom') { const s = W.PAGE_SIZES[size.value]; w = u.mm2px(s.w); hh = u.mm2px(s.h); }
            if (orient.value === 'landscape') { const mx = Math.max(w, hh), mn = Math.min(w, hh); w = mx; hh = mn; } else { const mx = Math.max(w, hh), mn = Math.min(w, hh); w = mn; hh = mx; }
            Object.assign(W.doc.page, { w, h: hh, size: size.value, orient: orient.value, t: u.cm2px(+m.t.value), b: u.cm2px(+m.b.value), l: u.cm2px(+m.l.value), r: u.cm2px(+m.r.value), hdist: u.cm2px(+m.hd.value), fdist: u.cm2px(+m.fd.value), color: color.value === '#ffffff' ? '#ffffff' : color.value });
            W.doc.diffFirst = diff.input.checked;
          });
        },
      }],
    });
  };

  /* ---- Spalten ---- */
  D.columns = function (presetKey) {
    const cur = W.doc.cols;
    const state = { n: cur.n, w: (cur.w || [1]).slice(), gap: cur.gap, rule: cur.rule, bg: (cur.bg || [null, null, null]).slice(), bleed: cur.bleed !== false, mainOnly: !!cur.mainOnly };
    if (presetKey && W.COLUMN_PRESETS[presetKey]) { const pr = W.COLUMN_PRESETS[presetKey]; state.n = pr.n; state.w = pr.w.slice(); }
    const G = W.geom();
    const host = h('div.colhost');
    const n = F.num(state.n, { step: 1, min: 1, max: 4, w: 60 });
    const gap = F.num(cm(state.gap), { w: 70 });
    const rule = F.check('Trennlinie', state.rule);
    const bleed = F.check('Hintergrund bis zum Seitenrand', state.bleed);
    const mainOnly = F.check('Auf Folgeseiten nur die breiteste Spalte verwenden (für Lebensläufe)', state.mainOnly);
    const apply = F.select([['all', 'Gesamtes Dokument'], ['here', 'Ab dieser Stelle (neuer Abschnitt)']], 'all');
    const presetRow = h('div.presets.colpresets');
    Object.entries(W.COLUMN_PRESETS).forEach(([k, v]) => {
      const b = h('button.colpre', { type: 'button', title: v.label, html: W.icon({ one: 'cols1', two: 'cols2', three: 'cols3', left: 'colsLeft', right: 'colsRight' }[k], 34) + `<span>${v.label.split(' ')[0]}</span>` });
      b.addEventListener('click', () => { state.n = v.n; state.w = v.w.slice(); mainOnly.input.checked = (k === 'left' || k === 'right'); n.value = v.n; draw(); });
      presetRow.appendChild(b);
    });
    function draw() {
      state.n = W.clamp(+n.value || 1, 1, 4);
      if (state.w.length !== state.n) state.w = Array(state.n).fill(1);
      state.gap = u.cm2px(+gap.value || 0);
      const geo = W.colGeom({ n: state.n, w: state.w, gap: state.gap }, G.cw);
      host.innerHTML = '';
      const prev = h('div.colprev');
      geo.forEach((c, i) => {
        const bgc = state.bg[i];
        prev.appendChild(h('div.colprev-c', { style: { flex: String(state.w[i]), background: bgc || '' } }));
      });
      host.appendChild(prev);
      const tbl = h('div.coltbl');
      geo.forEach((c, i) => {
        const wInp = F.num(cm(c.w), { w: 70 });
        wInp.addEventListener('change', () => {
          const v = Math.max(1, +wInp.value || 1);
          state.w[i] = v;
          // relative Breiten aus cm
          const tot = state.w.reduce((a, b) => a + b, 0);
          draw();
        });
        const bgIn = h('input', { type: 'color', value: state.bg[i] || '#dfe7f2' });
        const bgOn = h('input', { type: 'checkbox' }); bgOn.checked = !!state.bg[i];
        bgIn.addEventListener('input', () => { state.bg[i] = bgIn.value; bgOn.checked = true; draw2(); });
        bgOn.addEventListener('change', () => { state.bg[i] = bgOn.checked ? bgIn.value : null; draw2(); });
        tbl.appendChild(F.row(`Spalte ${i + 1}:`, wInp, ' cm  ', h('label.fcheck', bgOn, ' Hintergrund '), bgIn));
      });
      host.appendChild(tbl);
    }
    function draw2() { host.querySelectorAll('.colprev-c').forEach((c, i) => { c.style.background = state.bg[i] || ''; }); }
    n.addEventListener('change', () => { state.w = Array((+n.value) || 1).fill(1); draw(); });
    gap.addEventListener('change', draw);
    draw();
    ui.dialog({
      title: 'Spalten', width: 560,
      body: h('div', presetRow, F.row('Anzahl der Spalten:', n, h('span.sp'), 'Abstand (cm):', gap), host, rule.el, bleed.el, mainOnly.el, F.row('Übernehmen für:', apply)),
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, onClick: () => {
          draw();
          const cfg = { n: state.n, w: state.w.slice(), gap: state.gap, rule: rule.input.checked, bg: state.bg.slice(), bleed: bleed.input.checked, mainOnly: mainOnly.input.checked };
          W.cmd.applyColumns(cfg, apply.value);
        },
      }],
    });
  };

  /* ---- Absatz ---- */
  D.paragraph = function () {
    W.fmt.refocus();
    const st = W.fmt.state();
    const blk = st.block;
    if (!blk) return;
    const cs = getComputedStyle(blk);
    const fs = parseFloat(cs.fontSize);
    const align = F.select([['left', 'Linksbündig'], ['center', 'Zentriert'], ['right', 'Rechtsbündig'], ['justify', 'Blocksatz']], st.align);
    const il = F.num(cm(parseFloat(cs.marginLeft) || 0), { w: 70 }), ir = F.num(cm(parseFloat(cs.marginRight) || 0), { w: 70 });
    const ti = parseFloat(cs.textIndent) || 0;
    const special = F.select([['none', '(ohne)'], ['first', 'Erste Zeile'], ['hang', 'Hängend']], ti > 0.5 ? 'first' : ti < -0.5 ? 'hang' : 'none');
    const sv = F.num(cm(Math.abs(ti)), { w: 70 });
    const sb = F.num(Math.round(u.px2pt(parseFloat(cs.marginTop) || 0) * 10) / 10, { w: 70, step: 1 }), sa = F.num(Math.round(u.px2pt(parseFloat(cs.marginBottom) || 0) * 10) / 10, { w: 70, step: 1 });
    const mult = (parseFloat(cs.lineHeight) / fs / 1.22) || 1.08;
    let lsKind = 'mult', lsVal = Math.round(mult * 100) / 100;
    if (blk.style.lineHeight && /pt|px/.test(blk.style.lineHeight)) { lsKind = 'exact'; lsVal = Math.round(u.px2pt(parseFloat(cs.lineHeight)) * 10) / 10; }
    else if (Math.abs(mult - 1) < 0.02) { lsKind = 'single'; } else if (Math.abs(mult - 1.15) < 0.02) lsKind = 'l115'; else if (Math.abs(mult - 1.5) < 0.02) lsKind = 'l15'; else if (Math.abs(mult - 2) < 0.02) lsKind = 'dbl';
    const ls = F.select([['single', 'Einfach'], ['l115', '1,15 Zeilen'], ['l15', '1,5 Zeilen'], ['dbl', 'Doppelt'], ['mult', 'Mehrfach'], ['exact', 'Genau (pt)']], lsKind);
    const lsv = F.num(lsVal, { w: 70, step: 0.05 });
    const keep = F.check('Absatz nicht vom nächsten trennen', blk.getAttribute('data-keep') === '1' || /^H[1-6]$/.test(blk.tagName));
    ui.dialog({
      title: 'Absatz', width: 500,
      body: h('div',
        h('fieldset', h('legend', 'Allgemein'), F.row('Ausrichtung:', align)),
        h('fieldset', h('legend', 'Einzug (cm)'), F.row('Links:', il, h('span.sp'), 'Rechts:', ir), F.row('Besonders:', special, ' Um: ', sv)),
        h('fieldset', h('legend', 'Abstand'), F.row('Vor (pt):', sb, h('span.sp'), 'Nach (pt):', sa), F.row('Zeilenabstand:', ls, ' Wert: ', lsv)),
        keep.el),
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, onClick: () => {
          setTimeout(() => {
            W.fmt.refocus();
            const props = {
              'text-align': align.value,
              'margin-left': blk.hasAttribute('data-list') ? '' : u.cm2px(+il.value || 0).toFixed(1) + 'px',
              'margin-right': u.cm2px(+ir.value || 0).toFixed(1) + 'px',
              'text-indent': special.value === 'none' || blk.hasAttribute('data-list') ? '' : (special.value === 'first' ? '' : '-') + u.cm2px(+sv.value || 0).toFixed(1) + 'px',
              'margin-top': (+sb.value || 0) + 'pt', 'margin-bottom': (+sa.value || 0) + 'pt',
            };
            W.fmt.setBlockStyle(props);
            const k = ls.value;
            if (k === 'exact') W.fmt.setLineSpacing({ exact: +lsv.value || 14 });
            else W.fmt.setLineSpacing({ single: 1, l115: 1.15, l15: 1.5, dbl: 2, mult: +lsv.value || 1.08 }[k]);
            W.fmt.eachBlock((b) => { if (keep.input.checked) b.setAttribute('data-keep', '1'); else if (/^H[1-6]$/.test(b.tagName)) b.setAttribute('data-keep', '0'); else b.removeAttribute('data-keep'); });
          }, 0);
        },
      }],
      refocus: false,
    });
  };

  /* ---- Schrift ---- */
  D.font = function () {
    W.fmt.refocus();
    const st = W.fmt.state();
    const fam = F.select(W.FONTS, st.font, { w: 200 });
    if (![...fam.options].some((o) => o.value === st.font)) { fam.insertBefore(h('option', { value: st.font, selected: true }, st.font), fam.firstChild); }
    const size = F.num(st.size || 11, { step: 0.5, w: 70 });
    const color = F.color(st.color);
    const bold = F.check('Fett', st.bold), italic = F.check('Kursiv', st.italic), underline = F.check('Unterstrichen', st.underline);
    const strike = F.check('Durchgestrichen', st.strike), sup = F.check('Hochgestellt', st.sup), sub = F.check('Tiefgestellt', st.sub);
    const caps = F.check('Kapitälchen', false), allcaps = F.check('Großbuchstaben', false);
    const spacing = F.num(0, { step: 0.5, w: 70 });
    const prev = h('div.fontprev', 'AaBbYyZz Vorschau');
    const upd = () => { prev.style.fontFamily = fam.value; prev.style.fontSize = (+size.value || 11) + 'pt'; prev.style.color = color.value; prev.style.fontWeight = bold.input.checked ? 'bold' : 'normal'; prev.style.fontStyle = italic.input.checked ? 'italic' : 'normal'; prev.style.textDecoration = [underline.input.checked && 'underline', strike.input.checked && 'line-through'].filter(Boolean).join(' '); prev.style.letterSpacing = (+spacing.value || 0) + 'px'; prev.style.textTransform = allcaps.input.checked ? 'uppercase' : ''; prev.style.fontVariant = caps.input.checked ? 'small-caps' : ''; };
    [fam, size, color, spacing].forEach((e) => e.addEventListener('input', upd));
    [bold, italic, underline, strike, sup, sub, caps, allcaps].forEach((c) => c.input.addEventListener('change', upd));
    upd();
    ui.dialog({
      title: 'Schriftart', width: 520,
      body: h('div', F.row('Schriftart:', fam, h('span.sp'), 'Größe:', size), F.row('Schriftfarbe:', color, h('span.sp'), 'Zeichenabstand (px):', spacing),
        h('div.fgrid', bold.el, italic.el, underline.el, strike.el, sup.el, sub.el, caps.el, allcaps.el), prev),
      buttons: [{ label: 'Abbrechen' }, {
        label: 'OK', primary: true, onClick: () => {
          setTimeout(() => {
            W.fmt.refocus();
            const cur = W.fmt.state();
            const tog = (k, cmd, on) => { if (cur[k] !== on) W.cmd[cmd](); };
            tog('bold', 'bold', bold.input.checked); tog('italic', 'italic', italic.input.checked); tog('underline', 'underline', underline.input.checked);
            tog('strike', 'strike', strike.input.checked); tog('sup', 'sup', sup.input.checked); tog('sub', 'sub', sub.input.checked);
            W.fmt.setInlineStyle({
              'font-family': W.fontStack(fam.value), 'font-size': (+size.value || 11) + 'pt', color: color.value,
              'letter-spacing': (+spacing.value || 0) ? (+spacing.value) + 'px' : '', 'font-variant': caps.input.checked ? 'small-caps' : '', 'text-transform': allcaps.input.checked ? 'uppercase' : '',
            });
          }, 0);
        },
      }],
      refocus: false,
    });
  };

  /* ---- Wörter zählen ---- */
  D.stats = function () {
    const s = W.stats();
    const row = (k, v) => h('div.frow', h('label', k), h('b', String(v)));
    ui.dialog({
      title: 'Wörter zählen', width: 340,
      body: h('div', row('Seiten', s.pages), row('Wörter', s.words), row('Zeichen (ohne Leerzeichen)', s.charsNoSpace), row('Zeichen (mit Leerzeichen)', s.chars), row('Absätze', s.paragraphs), row('Zeilen', s.lines)),
    });
  };

  W.stats = function (onlySelection) {
    const flow = W.el.flow;
    let text = '';
    const sel = getSelection();
    const root = W.layout.cleanClone(flow);
    text = Array.from(root.querySelectorAll('p,h1,h2,h3,h4,h5,h6')).map((p) => p.textContent).join('\n').replace(/​/g, '');
    if (onlySelection && !sel.isCollapsed && flow.contains(sel.anchorNode)) text = W.stripZW(sel.toString());
    const words = (text.match(/[^\s]+/g) || []).length;
    const paras = Array.from(root.querySelectorAll('p,h1,h2,h3,h4,h5,h6')).filter((p) => p.textContent.trim() && !p.classList.contains('brk')).length;
    return {
      pages: W.layout.info.pageCount, words, chars: text.replace(/\n/g, '').length, charsNoSpace: text.replace(/\s/g, '').length, paragraphs: paras,
      lines: Array.from(flow.querySelectorAll('p,h1,h2,h3,h4,h5,h6')).reduce((a, p) => a + Math.max(1, Math.round(p.getBoundingClientRect().height / (parseFloat(getComputedStyle(p).lineHeight) * (W.view.zoom || 1)) || 1)), 0),
    };
  };

  /* ---- Eigenschaften ---- */
  D.properties = function () {
    const t = F.text(W.doc.title, { w: 280 }), a = F.text(W.doc.author, { w: 280 });
    ui.dialog({
      title: 'Dokumenteigenschaften', width: 460, body: h('div', F.row('Titel:', t), F.row('Autor:', a)),
      buttons: [{ label: 'Abbrechen' }, { label: 'OK', primary: true, onClick: () => { W.doc.title = t.value || 'Dokument'; W.doc.author = a.value; document.title = W.doc.title + ' – Wohni Writer'; W.markDirty(); W.emit('docloaded'); } }],
    });
  };

  /* ---- Wasserzeichen ---- */
  D.watermark = function () {
    const wm = W.doc.watermark || { text: 'ENTWURF', color: '#c0c0c0', size: 110, opacity: 0.45 };
    const preset = F.select([['ENTWURF', 'ENTWURF'], ['VERTRAULICH', 'VERTRAULICH'], ['KOPIE', 'KOPIE'], ['WICHTIG', 'WICHTIG'], ['', 'Benutzerdefiniert']], wm.text);
    const text = F.text(wm.text, { w: 220 }); const color = F.color(wm.color); const size = F.num(wm.size, { step: 10, w: 70 }); const op = F.num(wm.opacity, { step: 0.05, min: 0.05, max: 1, w: 70 });
    preset.addEventListener('change', () => { if (preset.value) text.value = preset.value; });
    ui.dialog({
      title: 'Wasserzeichen', width: 440, body: h('div', F.row('Vorlage:', preset), F.row('Text:', text), F.row('Farbe:', color), F.row('Größe (px):', size), F.row('Deckkraft:', op)),
      buttons: [{ label: 'Entfernen', onClick: () => { W.edit(() => { W.doc.watermark = null; }); } }, { label: 'Abbrechen' },
        { label: 'OK', primary: true, onClick: () => { W.edit(() => { W.doc.watermark = text.value ? { text: text.value, color: color.value, size: +size.value || 110, opacity: +op.value || 0.45 } : null; }); } }],
    });
  };

  /* ---- Seitenrand ---- */
  D.pageBorder = function () {
    const b = W.doc.pageBorder || { color: '#000000', width: 2, style: 'solid', offset: 24 };
    const color = F.color(b.color), width = F.num(b.width, { step: 0.5, w: 70 }), style = F.select([['solid', 'Durchgezogen'], ['dashed', 'Gestrichelt'], ['dotted', 'Gepunktet'], ['double', 'Doppelt']], b.style), off = F.num(Math.round(u.px2pt(b.offset)), { step: 1, w: 70 });
    ui.dialog({
      title: 'Seitenrand', width: 420, body: h('div', F.row('Farbe:', color), F.row('Breite (px):', width), F.row('Art:', style), F.row('Abstand zum Rand (pt):', off)),
      buttons: [{ label: 'Kein Rand', onClick: () => { W.edit(() => { W.doc.pageBorder = null; }); } }, { label: 'Abbrechen' },
        { label: 'OK', primary: true, onClick: () => { W.edit(() => { W.doc.pageBorder = { color: color.value, width: +width.value || 1, style: style.value, offset: u.pt2px(+off.value || 18) }; }); } }],
    });
  };

  /* ---- Objekt-Eigenschaften ---- */
  D.objectProps = function () {
    const f = W.floats.selected && W.floats.selected.float;
    if (!f) return;
    const name = F.text(f.name, { w: 240 }), alt = F.text(f.alt || '', { w: 240 });
    const x = F.num(cm(f.x), { w: 70 }), y = F.num(cm(f.y), { w: 70 });
    const w = F.num(cm(f.w), { w: 70 }), hh = F.num(cm(f.h), { w: 70 });
    const rot = F.num(f.rot || 0, { step: 1, w: 70 });
    const lock = F.check('Seitenverhältnis sperren', !!f.lock);
    const dist = F.num(cm(f.wrapDist != null ? f.wrapDist : 9), { w: 70 });
    ui.dialog({
      title: 'Objekt-Eigenschaften', width: 460,
      body: h('div', F.row('Name:', name), F.row('Alternativtext:', alt), F.row('Position (cm):', 'X ', x, ' Y ', y), F.row('Größe (cm):', 'B ', w, ' H ', hh), F.row('Drehung (°):', rot), lock.el, F.row('Abstand zum Text (cm):', dist)),
      buttons: [{ label: 'Abbrechen' }, { label: 'OK', primary: true, onClick: () => { W.floats.update({ name: name.value, alt: alt.value, x: u.cm2px(+x.value), y: u.cm2px(+y.value), w: Math.max(4, u.cm2px(+w.value)), h: Math.max(2, u.cm2px(+hh.value)), rot: +rot.value || 0, lock: lock.input.checked, wrapDist: u.cm2px(+dist.value) }); } }],
      refocus: false,
    });
  };

  /* ---- Tastenkürzel ---- */
  D.shortcuts = function () {
    const rows = [
      ['Strg+S', 'Speichern'], ['Strg+Umschalt+S', 'Speichern unter'], ['Strg+O', 'Öffnen'], ['Strg+N', 'Neu'], ['Strg+P', 'Drucken'],
      ['Strg+Z / Strg+Y', 'Rückgängig / Wiederholen'], ['Strg+F / Strg+H', 'Suchen / Ersetzen'],
      ['Strg+B / I / U', 'Fett / Kursiv / Unterstrichen'], ['Strg+E / L / R / J', 'Zentriert / Links / Rechts / Blocksatz'],
      ['Strg+Umschalt+L', 'Aufzählung'], ['Strg+K', 'Link einfügen'], ['Strg+Eingabe', 'Seitenumbruch'], ['Strg+Umschalt+Eingabe', 'Spaltenumbruch'],
      ['Strg+Alt+1 / 2 / 3', 'Überschrift 1 / 2 / 3'], ['Strg+Leertaste', 'Zeichenformatierung löschen'], ['Strg+[ / ]', 'Schrift verkleinern / vergrößern'],
      ['Tab / Umschalt+Tab', 'Listenebene / Tabellenzelle'], ['Strg+Mausrad', 'Zoom'], ['Pfeiltasten (Objekt)', 'Objekt verschieben (Umschalt = 10 px)'], ['Entf (Objekt)', 'Objekt löschen'],
    ];
    ui.dialog({ title: 'Tastenkürzel', width: 520, body: h('div.shortcuts', rows.map(([k, v]) => h('div.frow', h('b.kbd', k), h('span', v)))) });
  };

  D.about = function () {
    ui.dialog({
      title: 'Info', width: 420,
      body: h('div.about', h('h2', 'Wohni Writer'), h('p', 'Ein Textverarbeitungsprogramm im Browser – läuft komplett lokal, ohne Server und ohne Anmeldung. Öffnet und speichert .docx-Dateien auf deinem Rechner.'), h('p.muted', 'Deine Dokumente verlassen den Browser nicht.')),
    });
  };

  /* ---- Schriftarten ---- */
  W.FONTS = ['Calibri', 'Calibri Light', 'Arial', 'Arial Black', 'Arial Narrow', 'Book Antiqua', 'Bookman Old Style', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Gill Sans MT', 'Helvetica', 'Impact', 'Lucida Console', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Inter', 'Carlito', 'sans-serif', 'serif', 'monospace'];
})();
