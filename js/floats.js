/* Wohni Writer – Freie Objekte: Formen, Bilder, Textfelder.
   Objekte gehören zu einer Seite (Position in Seitenkoordinaten) und liegen in einer Ebene
   HINTER dem Text (wrap:'behind'), VOR dem Text ('front') oder verdrängen den Text
   ('square' = Quadrat, 'topbottom' = Oben und unten). Hinter dem Text beeinflussen sie den
   Textfluss nicht. Bilder können zusätzlich "im Text" (inline) stehen. */
(function () {
  'use strict';
  const W = window.W;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const Fl = (W.floats = { selected: null, clip: null, editing: null });

  /* ------------------------------------------------------------------ */
  /*  Formen                                                              */
  /* ------------------------------------------------------------------ */
  const f1 = (n) => +n.toFixed(2);
  function poly(pts) { return 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z'; }
  function star(w, h, n, inner) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? 1 : inner;
      const a = -Math.PI / 2 + i * Math.PI / n;
      pts.push([w / 2 + Math.cos(a) * r * w / 2, h / 2 + Math.sin(a) * r * h / 2]);
    }
    return poly(pts);
  }
  function rounded(w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  }
  Fl.SHAPES = {
    rect: { label: 'Rechteck', path: (w, h) => `M0 0H${w}V${h}H0Z` },
    roundrect: { label: 'Abgerundetes Rechteck', path: (w, h) => rounded(w, h, Math.min(w, h) * 0.18) },
    ellipse: { label: 'Ellipse', path: (w, h) => `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z` },
    triangle: { label: 'Gleichschenkliges Dreieck', path: (w, h) => poly([[w / 2, 0], [w, h], [0, h]]) },
    rtriangle: { label: 'Rechtwinkliges Dreieck', path: (w, h) => poly([[0, 0], [w, h], [0, h]]) },
    diamond: { label: 'Raute', path: (w, h) => poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) },
    parallelogram: { label: 'Parallelogramm', path: (w, h) => poly([[w * .2, 0], [w, 0], [w * .8, h], [0, h]]) },
    trapezoid: { label: 'Trapez', path: (w, h) => poly([[w * .2, 0], [w * .8, 0], [w, h], [0, h]]) },
    pentagon: { label: 'Fünfeck', path: (w, h) => poly([[w / 2, 0], [w, h * .38], [w * .81, h], [w * .19, h], [0, h * .38]]) },
    hexagon: { label: 'Sechseck', path: (w, h) => poly([[w * .25, 0], [w * .75, 0], [w, h / 2], [w * .75, h], [w * .25, h], [0, h / 2]]) },
    octagon: { label: 'Achteck', path: (w, h) => poly([[w * .3, 0], [w * .7, 0], [w, h * .3], [w, h * .7], [w * .7, h], [w * .3, h], [0, h * .7], [0, h * .3]]) },
    star4: { label: 'Stern (4 Zacken)', path: (w, h) => star(w, h, 4, 0.4) },
    star5: { label: 'Stern (5 Zacken)', path: (w, h) => star(w, h, 5, 0.4) },
    star6: { label: 'Stern (6 Zacken)', path: (w, h) => star(w, h, 6, 0.55) },
    arrowR: { label: 'Pfeil nach rechts', path: (w, h) => poly([[0, h * .3], [w * .6, h * .3], [w * .6, 0], [w, h / 2], [w * .6, h], [w * .6, h * .7], [0, h * .7]]) },
    arrowL: { label: 'Pfeil nach links', path: (w, h) => poly([[w, h * .3], [w * .4, h * .3], [w * .4, 0], [0, h / 2], [w * .4, h], [w * .4, h * .7], [w, h * .7]]) },
    arrowU: { label: 'Pfeil nach oben', path: (w, h) => poly([[w * .3, h], [w * .3, h * .4], [0, h * .4], [w / 2, 0], [w, h * .4], [w * .7, h * .4], [w * .7, h]]) },
    arrowD: { label: 'Pfeil nach unten', path: (w, h) => poly([[w * .3, 0], [w * .3, h * .6], [0, h * .6], [w / 2, h], [w, h * .6], [w * .7, h * .6], [w * .7, 0]]) },
    chevron: { label: 'Chevron', path: (w, h) => poly([[0, 0], [w * .65, 0], [w, h / 2], [w * .65, h], [0, h], [w * .35, h / 2]]) },
    plus: { label: 'Kreuz', path: (w, h) => poly([[w * .35, 0], [w * .65, 0], [w * .65, h * .35], [w, h * .35], [w, h * .65], [w * .65, h * .65], [w * .65, h], [w * .35, h], [w * .35, h * .65], [0, h * .65], [0, h * .35], [w * .35, h * .35]]) },
    heart: { label: 'Herz', path: (w, h) => `M${w / 2} ${h}C${-w * .15} ${h * .45} ${w * .15} ${-h * .1} ${w / 2} ${h * .3}C${w * .85} ${-h * .1} ${w * 1.15} ${h * .45} ${w / 2} ${h}Z` },
    callout: { label: 'Sprechblase', path: (w, h) => { const b = h * .8; return `M0 0H${w}V${b}H${w * .45}L${w * .2} ${h}L${w * .27} ${b}H0Z`; } },
    banner: { label: 'Band', path: (w, h) => poly([[0, h * .15], [w * .1, h * .15], [w * .1, 0], [w * .9, 0], [w * .9, h * .15], [w, h * .15], [w * .92, h * .5], [w, h * .85], [w * .9, h * .85], [w * .9, h], [w * .1, h], [w * .1, h * .85], [0, h * .85], [w * .08, h * .5]]) },
    cylinder: { label: 'Zylinder', path: (w, h) => { const e = h * .15; return `M0 ${e}A${w / 2} ${e} 0 0 1 ${w} ${e}V${h - e}A${w / 2} ${e} 0 0 1 0 ${h - e}ZM0 ${e}A${w / 2} ${e} 0 0 0 ${w} ${e}`; } },
    line: { label: 'Linie', line: true, path: (w, h) => `M0 ${h / 2}H${w}` },
    lineDiag: { label: 'Diagonale Linie', line: true, path: (w, h) => `M0 0L${w} ${h}` },
    arrowLine: { label: 'Linie mit Pfeil', line: true, arrow: true, path: (w, h) => `M0 ${h / 2}H${w}` },
  };
  Fl.SHAPE_GROUPS = [
    ['Linien', ['line', 'lineDiag', 'arrowLine']],
    ['Standardformen', ['rect', 'roundrect', 'ellipse', 'triangle', 'rtriangle', 'diamond', 'parallelogram', 'trapezoid', 'pentagon', 'hexagon', 'octagon', 'plus', 'cylinder']],
    ['Blockpfeile', ['arrowR', 'arrowL', 'arrowU', 'arrowD', 'chevron']],
    ['Sterne und Banner', ['star4', 'star5', 'star6', 'banner', 'heart', 'callout']],
  ];

  function shapeSVG(f) {
    const def = Fl.SHAPES[f.shape] || Fl.SHAPES.rect;
    const w = Math.max(1, f.w), h = Math.max(1, f.h);
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'shp');
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = def.path(w, h);
    const sw = f.strokeW != null ? f.strokeW : 1.5;
    if (def.line) {
      const hit = document.createElementNS(SVGNS, 'path');
      hit.setAttribute('d', d); hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', Math.max(14, sw + 8)); hit.setAttribute('fill', 'none');
      svg.appendChild(hit);
    }
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', def.line || !f.fill ? 'none' : f.fill);
    if (f.fill && !def.line && f.fillAlpha != null && f.fillAlpha < 1) p.setAttribute('fill-opacity', f.fillAlpha);
    if (f.stroke && sw > 0) {
      p.setAttribute('stroke', f.stroke); p.setAttribute('stroke-width', sw);
      p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('stroke-linecap', 'round');
      const dash = { dash: `${sw * 4} ${sw * 2.5}`, dot: `${sw * .1} ${sw * 2.2}`, dashdot: `${sw * 4} ${sw * 2} ${sw * .1} ${sw * 2}` }[f.dash];
      if (dash) p.setAttribute('stroke-dasharray', dash);
    }
    svg.appendChild(p);
    if (def.arrow && f.stroke) {
      const s = Math.max(8, sw * 4);
      const a = document.createElementNS(SVGNS, 'path');
      a.setAttribute('d', `M${w - s} ${h / 2 - s / 2}L${w} ${h / 2}L${w - s} ${h / 2 + s / 2}`);
      a.setAttribute('fill', 'none'); a.setAttribute('stroke', f.stroke); a.setAttribute('stroke-width', sw);
      a.setAttribute('stroke-linejoin', 'round'); a.setAttribute('stroke-linecap', 'round');
      svg.appendChild(a);
    }
    return svg;
  }

  /* ------------------------------------------------------------------ */
  /*  Modell                                                              */
  /* ------------------------------------------------------------------ */
  Fl.byId = (id) => W.doc.floats.find((f) => f.id === id);

  Fl.create = function (kind, props) {
    const f = Object.assign({
      id: W.uid('o'), kind, page: 0, x: 100, y: 100, w: 160, h: 100, rot: 0, wrap: 'front',
      fill: null, stroke: null, strokeW: 1.5, shape: 'rect', text: '', hidden: false, name: '', opacity: 1,
    }, props || {});
    if (kind === 'shape') {
      if (f.fill === null && !Fl.SHAPES[f.shape].line) f.fill = '#4472c4';
      if (!f.stroke) f.stroke = Fl.SHAPES[f.shape].line ? '#4472c4' : '#2f528f';
      if (Fl.SHAPES[f.shape].line) { f.strokeW = f.strokeW || 2.25; if (f.h > 60 && f.shape !== 'lineDiag') f.h = 4; }
    }
    if (kind === 'textbox') { if (f.stroke === null) f.stroke = '#000000'; f.strokeW = f.strokeW == null ? 1 : f.strokeW; f.shape = 'rect'; }
    f.name = f.name || ({ shape: 'Form', image: 'Grafik', textbox: 'Textfeld' }[kind] + ' ' + (W.doc.floats.length + 1));
    return f;
  };

  Fl.add = function (f, select) {
    W.doc.floats.push(f);
    W.layout.schedule(true);
    W.history.push();
    if (select !== false) Fl.select(f.id);
    return f;
  };

  Fl.remove = function (id) {
    const i = W.doc.floats.findIndex((f) => f.id === id);
    if (i < 0) return;
    W.doc.floats.splice(i, 1);
    if (Fl.selected && Fl.selected.id === id) Fl.deselect();
    W.layout.schedule(true);
    W.history.push();
  };

  /** Standardposition: Mitte des sichtbaren Bereichs */
  Fl.viewCenter = function () {
    const ws = W.el.workspace.getBoundingClientRect();
    const p = W.layout.clientToPage(ws.left + ws.width / 2, ws.top + ws.height / 2);
    return p;
  };

  Fl.insertShape = function (shape, opts) {
    const c = Fl.viewCenter();
    const def = Fl.SHAPES[shape] || Fl.SHAPES.rect;
    const w = def.line ? 200 : 160, h = def.line ? 4 : (shape === 'rect' || shape === 'roundrect' ? 100 : 130);
    const G = W.geom();
    const f = Fl.create('shape', Object.assign({ shape, w, h, x: W.clamp(c.x - w / 2, 0, G.pw - w), y: W.clamp(c.y - h / 2, 0, G.ph - h), page: c.page }, opts || {}));
    return Fl.add(f);
  };
  Fl.insertTextbox = function (opts) {
    const c = Fl.viewCenter();
    const w = 220, h = 90, G = W.geom();
    const f = Fl.create('textbox', Object.assign({ w, h, x: W.clamp(c.x - w / 2, 0, G.pw - w), y: W.clamp(c.y - h / 2, 0, G.ph - h), page: c.page, text: '<p>Text eingeben</p>', fill: '#ffffff' }, opts || {}));
    Fl.add(f);
    setTimeout(() => Fl.editText(f.id, true), 30);
    return f;
  };

  Fl.insertImageFloat = async function (src, opts) {
    const sz = await W.imageSize(src);
    const G = W.geom();
    let w = sz.w, h = sz.h;
    const maxW = G.cw * 0.9, maxH = G.ch * 0.9;
    const s = Math.min(1, maxW / w, maxH / h);
    w *= s; h *= s;
    const c = Fl.viewCenter();
    const f = Fl.create('image', Object.assign({ src, w, h, x: W.clamp(c.x - w / 2, 0, G.pw - w), y: W.clamp(c.y - h / 2, 0, G.ph - h), page: c.page, wrap: 'front', lock: true, ratio: sz.w / sz.h }, opts || {}));
    return Fl.add(f);
  };

  /**
   * Importierte Objekte: Seite und Position aus dem Anker-Absatz bestimmen
   * (nach dem ersten Layout aufrufen). Gibt true zurück, wenn etwas aufgelöst wurde.
   */
  Fl.resolvePending = function () {
    const flow = W.el.flow;
    let any = false;
    const G = W.layout.G || W.geom();
    W.doc.floats.forEach((f) => {
      const p = f.pending; if (!p) return;
      any = true;
      delete f.pending;
      let el = p.aid ? flow.querySelector(`[data-aid="${p.aid}"]`) : null;
      const box = W.docx.pageBox(W.doc, p, f);
      let page = 0, y = box.y;
      if (el) {
        let top = el; while (top && top.parentNode !== flow) top = top.parentNode;
        page = (W.layout.pageMap.get(top) || 0);
        if (box.relP) {
          const r = el.getBoundingClientRect();
          const c = W.layout.clientToPage(r.left + 2, r.top + 1);
          page = c.page; y = c.y + (p.offV || 0) + p.dy;
        }
      }
      f.page = page; f.x = box.x; f.y = y;
    });
    flow.querySelectorAll('[data-aid]').forEach((e) => e.removeAttribute('data-aid'));
    return any;
  };

  /* ------------------------------------------------------------------ */
  /*  Rendern                                                             */
  /* ------------------------------------------------------------------ */
  const nodes = new Map();

  function sigOf(f) {
    return [f.kind, f.shape, f.w, f.h, f.fill, f.fillAlpha, f.stroke, f.strokeW, f.dash, f.src, f.opacity, f.flipH, f.flipV, f.radius, f.shadow, f.color, f.valign, f.hidden, f.wrap].join('|');
  }

  Fl.render = function () {
    const doc = W.doc;
    const seen = new Set();
    const behindHost = W.el.behind, frontHost = W.el.front;
    const pageCount = (W.layout.info && W.layout.info.pageCount) || 1;
    // wiederholte Objekte (aus Kopf-/Fußzeile) erscheinen auf jeder Seite
    const entries = [];
    doc.floats.forEach((f, idx) => {
      if (f.repeat) for (let i = 0; i < pageCount; i++) entries.push({ f, idx, page: i, key: f.id + '@' + i });
      else entries.push({ f, idx, page: f.page, key: f.id });
    });
    entries.forEach(({ f, idx, page, key }) => {
      seen.add(key);
      let n = nodes.get(key);
      if (!n) {
        n = W.h('div.fobj', { dataset: { id: f.id } });
        n.appendChild(W.h('div.fbody'));
        nodes.set(key, n);
      }
      const host = f.wrap === 'behind' ? behindHost : frontHost;
      if (n.parentNode !== host) host.appendChild(n);
      n.style.left = f.x + 'px';
      n.style.top = (W.layout.pageTop(page) + f.y) + 'px';
      n.style.width = f.w + 'px';
      n.style.height = f.h + 'px';
      n.style.zIndex = String(idx + 1);
      n.style.transform = (f.rot ? `rotate(${f.rot}deg)` : '') + (f.flipH ? ' scaleX(-1)' : '') + (f.flipV ? ' scaleY(-1)' : '');
      n.style.opacity = f.opacity != null && f.opacity < 1 ? f.opacity : '';
      n.style.display = f.hidden ? 'none' : '';
      n.classList.toggle('is-line', !!(Fl.SHAPES[f.shape] && Fl.SHAPES[f.shape].line));
      const sg = sigOf(f);
      if (n._sig !== sg) {
        n._sig = sg;
        const tb0 = n.querySelector('.tbtext');
        Array.from(n.children).forEach((c) => { if (c !== tb0 && !c.classList.contains('fbody')) c.remove(); });
        n.insertBefore(f.kind === 'image' ? imageEl(f) : shapeSVG(f), tb0 || null);
        n.style.boxShadow = f.shadow ? '3px 4px 8px rgba(0,0,0,.35)' : '';
      }
      // Text (Textfeld / Form mit Text)
      const wantsText = f.kind === 'textbox' || !!f.text;
      let tb = n.querySelector('.tbtext');
      if (wantsText && !tb) {
        tb = W.h('div.tbtext', { spellcheck: true, lang: 'de' });
        n.appendChild(tb);
      }
      if (!wantsText && tb) { tb.remove(); tb = null; }
      if (tb) {
        if (!(Fl.editing && Fl.editing.id === f.id) && tb._html !== f.text) { tb.innerHTML = f.text || '<p><br></p>'; tb._html = f.text; }
        tb.style.color = f.color || (f.kind === 'shape' && f.fill && W.color.isDark(f.fill) ? '#ffffff' : '');
        tb.style.display = 'flex';
        tb.style.flexDirection = 'column';
        tb.style.justifyContent = f.valign === 'middle' ? 'center' : f.valign === 'bottom' ? 'flex-end' : 'flex-start';
        if (f.insets) tb.style.padding = f.insets.map((v) => v + 'px').join(' ');
      }
      n.classList.toggle('sel', !!(Fl.selected && Fl.selected.id === f.id));
    });
    nodes.forEach((n, key) => { if (!seen.has(key)) { n.remove(); nodes.delete(key); } });
    Fl.renderSel();
  };

  function imageEl(f) {
    const im = new Image();
    im.src = f.src; im.alt = f.alt || f.name || '';
    im.draggable = false;
    im.style.borderRadius = f.radius ? (/%/.test(String(f.radius)) ? f.radius : f.radius + 'px') : '';
    if (f.stroke && f.strokeW) { im.style.border = `${f.strokeW}px solid ${f.stroke}`; im.style.boxSizing = 'border-box'; }
    return im;
  }

  /* ------------------------------------------------------------------ */
  /*  Auswahl + Anfasser                                                  */
  /* ------------------------------------------------------------------ */
  let selEl = null;
  const HANDLES = [[-1, -1, 'nw'], [0, -1, 'n'], [1, -1, 'ne'], [1, 0, 'e'], [1, 1, 'se'], [0, 1, 's'], [-1, 1, 'sw'], [-1, 0, 'w']];

  Fl.select = function (id) {
    const f = Fl.byId(id);
    if (!f) return;
    Fl.stopEdit();
    Fl.selected = { id, float: f };
    getSelection().removeAllRanges();
    Fl.render();
    W.emit('objselect', f);
    W.ribbon && W.ribbon.showContext('obj', true);
    W.ribbon && W.ribbon.selectTab('obj', true);
    W.el.app.focus && W.el.app.focus({ preventScroll: true });
  };
  Fl.selectInline = function (img) {
    Fl.stopEdit();
    Fl.deselect(true);
    Fl.selected = { inline: img };
    img.classList.add('sel');
    Fl.renderSel();
    W.emit('objselect', { kind: 'image', inline: true });
    W.ribbon && W.ribbon.showContext('obj', true);
    W.ribbon && W.ribbon.selectTab('obj', true);
  };
  Fl.deselect = function (silent) {
    if (Fl.selected && Fl.selected.inline) Fl.selected.inline.classList.remove('sel');
    Fl.selected = null;
    if (selEl) { selEl.remove(); selEl = null; }
    nodes.forEach((n) => n.classList.remove('sel'));
    if (!silent) { W.emit('objselect', null); W.ribbon && W.ribbon.showContext('obj', false); }
  };

  /** Rahmen mit Anfassern an die Auswahl legen */
  Fl.renderSel = function () {
    const s = Fl.selected;
    if (!s) { if (selEl) { selEl.remove(); selEl = null; } return; }
    let box;
    if (s.inline) {
      if (!s.inline.isConnected) { Fl.deselect(); return; }
      const rc = s.inline.getBoundingClientRect(), pr = W.el.pages.getBoundingClientRect(), z = W.view.zoom;
      box = { x: (rc.left - pr.left) / z, y: (rc.top - pr.top) / z, w: rc.width / z, h: rc.height / z, rot: 0 };
    } else {
      const f = s.float = Fl.byId(s.id);
      if (!f) { Fl.deselect(); return; }
      box = { x: f.x, y: W.layout.pageTop(f.page) + f.y, w: f.w, h: f.h, rot: f.rot || 0 };
    }
    if (!selEl) {
      selEl = W.h('div.fsel');
      HANDLES.forEach(([hx, hy, c]) => selEl.appendChild(W.h('div.fh.fh-' + c, { dataset: { hx, hy } })));
      selEl.appendChild(W.h('div.frot', { title: 'Drehen' }));
      W.el.ui.appendChild(selEl);
    }
    selEl.style.left = box.x + 'px'; selEl.style.top = box.y + 'px';
    selEl.style.width = box.w + 'px'; selEl.style.height = box.h + 'px';
    selEl.style.transform = box.rot ? `rotate(${box.rot}deg)` : '';
    selEl.classList.toggle('inline', !!s.inline);
    selEl.classList.toggle('thin', box.h < 14);
    selEl.style.setProperty('--zoom', String(W.view.zoom));
  };

  /* ------------------------------------------------------------------ */
  /*  Treffer-Erkennung (auch Objekte hinter dem Text)                    */
  /* ------------------------------------------------------------------ */
  function onText(x, y) {
    const els = document.elementsFromPoint(x, y);
    const blk = els.find((e) => e.matches && e.matches('#flow p, #flow h1, #flow h2, #flow h3, #flow h4, #flow h5, #flow h6'));
    if (!blk) return false;
    if (blk.matches('p.brk')) return false;
    const r = document.createRange();
    r.selectNodeContents(blk);
    for (const rc of r.getClientRects()) {
      if (rc.width > 0 && x >= rc.left - 1 && x <= rc.right + 1 && y >= rc.top - 1 && y <= rc.bottom + 1) return true;
    }
    return false;
  }
  function floatAt(x, y, layer) {
    const els = document.elementsFromPoint(x, y);
    for (const e of els) {
      const fo = e.closest && e.closest('.fobj');
      if (fo && (!layer || fo.parentNode === layer)) {
        if (fo.parentNode === W.el.behind && onText(x, y)) return null;
        // Linien: nur auf dem Strich treffen (SVG-Pfad) – Hintergrund ignorieren
        return Fl.byId(fo.dataset.id) || null;
      }
    }
    return null;
  }
  Fl.floatAt = floatAt;

  /* ------------------------------------------------------------------ */
  /*  Maus: Ziehen / Skalieren / Drehen                                   */
  /* ------------------------------------------------------------------ */
  let drag = null;
  const zoom = () => W.view.zoom;

  function startDrag(ev, mode, extra) {
    const s = Fl.selected; if (!s) return;
    const f = s.float;
    drag = Object.assign({ mode, x0: ev.clientX, y0: ev.clientY, moved: false }, extra || {});
    if (s.inline) {
      const rc = s.inline.getBoundingClientRect();
      drag.orig = { w: rc.width / zoom(), h: rc.height / zoom() };
      drag.ratio = rc.width / rc.height;
    } else {
      drag.orig = { x: f.x, y: f.y, w: f.w, h: f.h, rot: f.rot || 0, page: f.page };
      drag.ratio = f.w / f.h;
    }
  }

  function pageXY(f) {
    // Mittelpunkt in #pages-Koordinaten
    return { x: f.x + f.w / 2, y: W.layout.pageTop(f.page) + f.y + f.h / 2 };
  }

  document.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const t = ev.target;
    // Anfasser
    const hnd = t.closest && t.closest('.fh');
    if (hnd && Fl.selected) { ev.preventDefault(); startDrag(ev, 'resize', { hx: +hnd.dataset.hx, hy: +hnd.dataset.hy }); return; }
    if (t.closest && t.closest('.frot') && Fl.selected) { ev.preventDefault(); startDrag(ev, 'rotate'); return; }
    if (!t.closest || !t.closest('#pages')) return;
    if (Fl.editing && t.closest('.fobj.editing')) return;   // Text im Objekt bearbeiten
    // Bild im Text?
    if (t.tagName === 'IMG' && t.closest('#flow')) {
      ev.preventDefault();
      Fl.selectInline(t);
      startDrag(ev, 'inline-move');
      return;
    }
    // Rahmen eines bereits gewählten Objekts: im Inneren nur ziehen, wenn nicht auf Text
    const f = floatAt(ev.clientX, ev.clientY, null);
    if (f) {
      ev.preventDefault();
      Fl.stopEdit();
      if (!Fl.selected || Fl.selected.id !== f.id) Fl.select(f.id);
      if (f.locked) return;
      startDrag(ev, 'move');
      return;
    }
    // Klick ins Leere / auf Text
    if (Fl.selected && !(t.closest && t.closest('.fsel'))) Fl.deselect();
  }, true);

  document.addEventListener('mousemove', (ev) => {
    if (!drag) return;
    const s = Fl.selected; if (!s) { drag = null; return; }
    const z = zoom();
    const dx = (ev.clientX - drag.x0) / z, dy = (ev.clientY - drag.y0) / z;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    if (drag.mode === 'inline-move') return;
    const f = s.float;
    const G = W.layout.G || W.geom();
    if (drag.mode === 'move') {
      const o = drag.orig;
      let nx = o.x + dx, ny = o.y + dy + W.layout.pageTop(o.page);
      // Seite aus dem Mittelpunkt bestimmen
      const stride = W.doc.view === 'web' ? 1e9 : G.stride;
      const cy = ny + f.h / 2;
      let page = W.clamp(Math.floor(cy / stride), 0, W.layout.info.pageCount - 1);
      if (W.doc.view === 'web') page = 0;
      f.page = page;
      f.x = nx; f.y = ny - W.layout.pageTop(page);
      if (ev.shiftKey) { // Achse beibehalten
        if (Math.abs(dx) > Math.abs(dy)) f.y = o.y; else f.x = o.x;
      }
      Fl.renderFast(f);
    } else if (drag.mode === 'resize') {
      const o = drag.orig, th = (o.rot || 0) * Math.PI / 180;
      const c = Math.cos(th), sn = Math.sin(th);
      const lx = dx * c + dy * sn, ly = -dx * sn + dy * c;
      let dw = drag.hx * lx, dh = drag.hy * ly;
      let nw = Math.max(4, o.w + dw), nh = Math.max(drag.hy === 0 && f.h < 14 ? f.h : 4, o.h + dh);
      const lock = (f.lock && !ev.altKey) || ev.shiftKey;
      if (lock && drag.hx !== 0 && drag.hy !== 0) {
        const sc = Math.max(nw / o.w, nh / o.h);
        nw = o.w * sc; nh = o.h * sc;
      } else if (lock && drag.hx !== 0 && drag.hy === 0 && f.kind === 'image') { nh = nw / drag.ratio; }
      else if (lock && drag.hy !== 0 && drag.hx === 0 && f.kind === 'image') { nw = nh * drag.ratio; }
      if (drag.hx === 0) nw = o.w;
      if (drag.hy === 0 && !(lock && f.kind === 'image')) nh = o.h;
      dw = nw - o.w; dh = nh - o.h;
      const shiftL = { x: drag.hx * dw / 2, y: drag.hy * dh / 2 };
      const wx = shiftL.x * c - shiftL.y * sn, wy = shiftL.x * sn + shiftL.y * c;
      const cx = o.x + o.w / 2 + wx, cy = o.y + o.h / 2 + wy;
      f.w = nw; f.h = nh; f.x = cx - nw / 2; f.y = cy - nh / 2;
      Fl.renderFast(f, true);
    } else if (drag.mode === 'rotate') {
      const pr = W.el.pages.getBoundingClientRect();
      const cc = pageXY(f);
      const px = (ev.clientX - pr.left) / z, py = (ev.clientY - pr.top) / z;
      let ang = Math.atan2(py - cc.y, px - cc.x) * 180 / Math.PI + 90;
      if (ev.shiftKey) ang = Math.round(ang / 15) * 15;
      ang = ((ang % 360) + 360) % 360;
      f.rot = Math.round(ang * 10) / 10;
      Fl.renderFast(f);
    }
  });

  /** Schnelles Aktualisieren des DOM-Elements während des Ziehens */
  Fl.renderFast = function (f, full) {
    const n = nodes.get(f.id) || nodes.get(f.id + '@0');
    if (!n) return;
    if (f.repeat) { n._sig = null; Fl.render(); return; }
    n.style.left = f.x + 'px'; n.style.top = (W.layout.pageTop(f.page) + f.y) + 'px';
    n.style.width = f.w + 'px'; n.style.height = f.h + 'px';
    n.style.transform = (f.rot ? `rotate(${f.rot}deg)` : '') + (f.flipH ? ' scaleX(-1)' : '') + (f.flipV ? ' scaleY(-1)' : '');
    if (full) { n._sig = null; Fl.render(); } else Fl.renderSel();
    W.emit('objgeom', f);
  };

  document.addEventListener('mouseup', (ev) => {
    if (!drag) return;
    const d = drag; drag = null;
    const s = Fl.selected; if (!s) return;
    if (s.inline) {
      if (d.mode === 'resize' && d.moved) {
        // Größe wurde via renderFast nicht geändert – siehe unten
      }
      return;
    }
    if (d.moved) { W.layout.schedule(true); W.history.push(); }
  });

  // Inline-Bild skalieren
  document.addEventListener('mousemove', (ev) => {
    if (!drag || drag.mode !== 'resize' || !Fl.selected || !Fl.selected.inline) return;
    const img = Fl.selected.inline;
    const z = zoom();
    const dx = (ev.clientX - drag.x0) / z, dy = (ev.clientY - drag.y0) / z;
    let nw = Math.max(8, drag.orig.w + (drag.hx || 0) * dx);
    let nh = Math.max(8, drag.orig.h + (drag.hy || 0) * dy);
    if (drag.hx !== 0 && drag.hy !== 0 && !ev.altKey) { const sc = Math.max(nw / drag.orig.w, nh / drag.orig.h); nw = drag.orig.w * sc; nh = nw / drag.ratio; }
    else if (drag.hx !== 0 && drag.hy === 0) nh = nw / drag.ratio;
    else if (drag.hy !== 0 && drag.hx === 0) nw = nh * drag.ratio;
    img.style.width = nw.toFixed(1) + 'px'; img.style.height = nh.toFixed(1) + 'px';
    img.setAttribute('width', Math.round(nw)); img.setAttribute('height', Math.round(nh));
    W.layout.schedule(true);
    Fl.renderSel();
  });
  document.addEventListener('mouseup', () => {
    if (Fl.selected && Fl.selected.inline) { W.history.push(); }
  });

  /* ------------------------------------------------------------------ */
  /*  Text in Objekten                                                    */
  /* ------------------------------------------------------------------ */
  Fl.editText = function (id, select) {
    const f = Fl.byId(id); if (!f) return;
    if (Fl.selected && Fl.selected.id !== id) Fl.select(id);
    const n = nodes.get(id);
    if (!n) return;
    let tb = n.querySelector('.tbtext');
    if (!tb) { f.text = f.text || '<p><br></p>'; Fl.render(); tb = n.querySelector('.tbtext'); }
    Fl.stopEdit(true);
    Fl.editing = { id, tb };
    n.classList.add('editing');
    tb.contentEditable = 'true';
    tb.setAttribute('data-root', '');
    tb.focus();
    const r = document.createRange();
    r.selectNodeContents(tb);
    if (!select) r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    W.emit('state');
  };
  Fl.syncEdit = function () {
    const e = Fl.editing; if (!e) return;
    const f = Fl.byId(e.id); if (!f) return;
    const html = e.tb.innerHTML.replace(/​/g, '');
    f.text = html; e.tb._html = html;
  };
  Fl.stopEdit = function (noRender) {
    const e = Fl.editing; if (!e) return;
    Fl.syncEdit();
    const f = Fl.byId(e.id);
    e.tb.contentEditable = 'false';
    e.tb.removeAttribute('data-root');
    const n = e.tb.closest('.fobj'); if (n) n.classList.remove('editing');
    Fl.editing = null;
    if (f && f.kind === 'shape' && !W.stripZW(e.tb.textContent).trim()) f.text = '';
    if (!noRender) { Fl.render(); W.history.push(); }
  };
  W.on('sync', () => { Fl.syncEdit(); });

  document.addEventListener('dblclick', (ev) => {
    const fo = ev.target.closest && ev.target.closest('.fobj');
    if (fo) {
      const f = Fl.byId(fo.dataset.id);
      if (f && (f.kind === 'textbox' || f.kind === 'shape')) { Fl.editText(f.id); ev.preventDefault(); }
      return;
    }
    // Doppelklick auf Text über einem Objekt dahinter: Text bearbeiten (normal)
    const f = floatAt(ev.clientX, ev.clientY, W.el.behind);
    if (f && (f.kind === 'textbox' || f.kind === 'shape')) { Fl.editText(f.id); ev.preventDefault(); }
  }, true);

  document.addEventListener('input', (ev) => {
    if (Fl.editing && ev.target.closest && ev.target.closest('.tbtext') === Fl.editing.tb) {
      Fl.syncEdit();
      W.history.schedule();
    }
  });
  document.addEventListener('focusout', (ev) => {
    if (Fl.editing && ev.target === Fl.editing.tb) {
      setTimeout(() => {
        if (Fl.editing && !Fl.editing.tb.contains(document.activeElement) && !(document.activeElement && document.activeElement.closest('#ribbon, #overlays, #backstage'))) Fl.stopEdit();
      }, 120);
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Eigenschaften / Anordnen                                            */
  /* ------------------------------------------------------------------ */
  Fl.update = function (props, opts) {
    const s = Fl.selected; if (!s || s.inline) return;
    const f = Fl.byId(s.id); if (!f) return;
    Object.assign(f, props);
    Fl.render();
    if (!opts || opts.layout !== false) W.layout.schedule(true);
    if (!opts || opts.history !== false) W.history.push();
    W.emit('objgeom', f);
  };

  Fl.setWrap = function (wrap) {
    const s = Fl.selected; if (!s) return;
    if (s.inline) {
      if (wrap === 'inline') return;
      Fl.inlineToFloat(s.inline, wrap);
      return;
    }
    const f = Fl.byId(s.id);
    if (wrap === 'inline') { Fl.floatToInline(f); return; }
    Fl.update({ wrap });
  };

  /** Bild im Text → freies Objekt (Position bleibt erhalten) */
  Fl.inlineToFloat = function (img, wrap) {
    W.history.flush();
    const rc = img.getBoundingClientRect();
    const p = W.layout.clientToPage(rc.left + rc.width / 2, rc.top + rc.height / 2);
    const z = zoom();
    const f = Fl.create('image', {
      src: img.getAttribute('src'), w: rc.width / z, h: rc.height / z, page: p.page,
      x: p.x - rc.width / z / 2, y: p.y - rc.height / z / 2, wrap: wrap || 'behind', lock: true, ratio: rc.width / rc.height, alt: img.alt,
    });
    W.layout.beginEdit();
    const par = img.parentNode;
    img.remove();
    if (par && par.matches && par.matches('p') && !par.textContent.trim() && !par.querySelector('img,br')) par.innerHTML = '<br>';
    Fl.deselect(true);
    W.doc.floats.push(f);
    W.layout.schedule(true);
    W.history.push();
    Fl.select(f.id);
  };
  /** Freies Bild → Bild im Text an der Cursor-/Seitenposition */
  Fl.floatToInline = function (f) {
    if (f.kind !== 'image') { W.toast('Nur Bilder können "Im Text" stehen.'); return; }
    W.history.flush();
    W.layout.beginEdit();
    const img = new Image();
    img.src = f.src; img.alt = f.alt || ''; img.style.width = f.w + 'px'; img.style.height = f.h + 'px';
    img.setAttribute('width', Math.round(f.w)); img.setAttribute('height', Math.round(f.h));
    // in den ersten Absatz der Seite einfügen
    const flow = W.el.flow;
    const blocks = Array.from(flow.children).filter((b) => (W.layout.pageMap.get(b) || 0) >= f.page && b.matches('p,h1,h2,h3'));
    const target = blocks[0] || flow.querySelector('p');
    const br = target.querySelector('br:last-child');
    if (br && target.childNodes.length === 1) target.insertBefore(img, br); else target.insertBefore(img, target.firstChild);
    const i = W.doc.floats.findIndex((x) => x.id === f.id);
    W.doc.floats.splice(i, 1);
    Fl.deselect(true);
    W.layout.schedule(true);
    W.history.push();
    Fl.selectInline(img);
  };

  function move(delta) {
    const s = Fl.selected; if (!s || s.inline) return;
    const arr = W.doc.floats;
    const i = arr.findIndex((f) => f.id === s.id);
    if (i < 0) return;
    const j = W.clamp(i + delta, 0, arr.length - 1);
    if (i === j) return;
    const [f] = arr.splice(i, 1);
    arr.splice(j, 0, f);
    Fl.render(); W.history.push();
  }
  Fl.bringForward = () => move(1);
  Fl.sendBackward = () => move(-1);
  Fl.bringToFront = () => move(1e6);
  Fl.sendToBack = () => move(-1e6);

  Fl.align = function (how) {
    const s = Fl.selected; if (!s || s.inline) return;
    const f = Fl.byId(s.id); const G = W.geom();
    const p = {};
    if (how === 'left') p.x = 0;
    if (how === 'center') p.x = (G.pw - f.w) / 2;
    if (how === 'right') p.x = G.pw - f.w;
    if (how === 'top') p.y = 0;
    if (how === 'middle') p.y = (G.ph - f.h) / 2;
    if (how === 'bottom') p.y = G.ph - f.h;
    if (how === 'mleft') p.x = G.ml;
    if (how === 'mright') p.x = G.pw - G.mr - f.w;
    Fl.update(p);
  };
  Fl.rotate = function (deg) { const f = Fl.selected && Fl.selected.float; if (f) Fl.update({ rot: (((f.rot || 0) + deg) % 360 + 360) % 360 }); };
  Fl.flip = function (axis) { const f = Fl.selected && Fl.selected.float; if (f) Fl.update(axis === 'h' ? { flipH: !f.flipH } : { flipV: !f.flipV }); };
  Fl.duplicate = function () {
    const f = Fl.selected && Fl.selected.float; if (!f) return;
    const c = JSON.parse(JSON.stringify(f));
    c.id = W.uid('o'); c.x += 16; c.y += 16; c.name = f.name + ' (Kopie)';
    Fl.add(c);
  };
  Fl.nudge = function (dx, dy) {
    const s = Fl.selected; if (!s || s.inline) return;
    const f = Fl.byId(s.id); f.x += dx; f.y += dy;
    Fl.render(); W.layout.schedule(true); W.history.schedule();
  };
  Fl.deleteSelected = function () {
    const s = Fl.selected; if (!s) return;
    if (s.inline) {
      W.layout.beginEdit();
      const p = s.inline.parentNode;
      s.inline.remove(); Fl.deselect();
      if (p && p.matches && p.matches('p') && !p.firstChild) p.innerHTML = '<br>';
      W.layout.schedule(true); W.history.push();
    } else Fl.remove(s.id);
  };

  /* ------------------------------------------------------------------ */
  /*  Tastatur bei ausgewähltem Objekt                                    */
  /* ------------------------------------------------------------------ */
  document.addEventListener('keydown', (ev) => {
    if (!Fl.selected || Fl.editing) return;
    const t = ev.target;
    if (t && t.closest && t.closest('input,textarea,select,[data-root]') && !t.closest('#flow')) return;
    if (t && t.closest && t.closest('#flow') && getSelection().rangeCount && !getSelection().isCollapsed) return;
    const k = ev.key;
    if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); Fl.deleteSelected(); }
    else if (k === 'Escape') { Fl.deselect(); }
    else if (k === 'Enter' && Fl.selected.float && (Fl.selected.float.kind !== 'image')) { ev.preventDefault(); Fl.editText(Fl.selected.id); }
    else if (k.startsWith('Arrow') && Fl.selected.float) {
      ev.preventDefault();
      const st = ev.shiftKey ? 10 : (ev.altKey ? 0.5 : 1);
      Fl.nudge(k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0);
    } else if ((ev.ctrlKey || ev.metaKey) && (k === 'c' || k === 'x') && Fl.selected.float) {
      Fl.clip = JSON.parse(JSON.stringify(Fl.selected.float));
      if (k === 'x') Fl.remove(Fl.selected.id);
      ev.preventDefault();
    } else if ((ev.ctrlKey || ev.metaKey) && k === 'd' && Fl.selected.float) { ev.preventDefault(); Fl.duplicate(); }
  });
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'v' && Fl.clip && !Fl.selected && !(ev.target.closest && ev.target.closest('[data-root]') && false)) {
      // Objekt-Zwischenablage nur, wenn zuletzt ein Objekt kopiert wurde und kein Text markiert ist
    }
  });

  W.on('restored', () => { Fl.deselect(); nodes.forEach((n) => n.remove()); nodes.clear(); });
})();
