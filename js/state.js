/* Wohni Writer – Dokumentmodell: Seite, Spalten, Kopf/Fußzeile, freie Objekte */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;

  W.PAGE_SIZES = {
    A3: { w: 297, h: 420, label: 'A3 (29,7 × 42 cm)' },
    A4: { w: 210, h: 297, label: 'A4 (21 × 29,7 cm)' },
    A5: { w: 148, h: 210, label: 'A5 (14,8 × 21 cm)' },
    B5: { w: 176, h: 250, label: 'B5 (17,6 × 25 cm)' },
    Letter: { w: 215.9, h: 279.4, label: 'Letter (21,6 × 27,9 cm)' },
    Legal: { w: 215.9, h: 355.6, label: 'Legal (21,6 × 35,6 cm)' },
  };

  W.MARGIN_PRESETS = {
    normal: { label: 'Normal', t: 2.5, b: 2, l: 2.5, r: 2.5 },
    narrow: { label: 'Schmal', t: 1.27, b: 1.27, l: 1.27, r: 1.27 },
    moderate: { label: 'Mittel', t: 2.54, b: 2.54, l: 1.91, r: 1.91 },
    wide: { label: 'Breit', t: 2.54, b: 2.54, l: 5.08, r: 5.08 },
    cv: { label: 'Lebenslauf', t: 1.5, b: 1.5, l: 1.5, r: 1.5 },
  };

  /** Spaltenvorlagen. w = relative Breiten (ohne Abstand) */
  W.COLUMN_PRESETS = {
    one: { n: 1, w: [1], label: 'Eine' },
    two: { n: 2, w: [1, 1], label: 'Zwei' },
    three: { n: 3, w: [1, 1, 1], label: 'Drei' },
    left: { n: 2, w: [1, 2], label: 'Links (schmale linke Spalte)' },
    right: { n: 2, w: [2, 1], label: 'Rechts (schmale rechte Spalte)' },
  };

  W.defaultDoc = function () {
    const m = W.MARGIN_PRESETS.normal;
    return {
      title: 'Dokument1',
      author: '',
      page: {
        size: 'A4', orient: 'portrait',
        w: u.mm2px(210), h: u.mm2px(297),
        t: u.cm2px(m.t), b: u.cm2px(m.b), l: u.cm2px(m.l), r: u.cm2px(m.r),
        hdist: u.cm2px(1.25), fdist: u.cm2px(1.25),
        color: '#ffffff',
      },
      cols: { n: 1, w: [1], gap: u.cm2px(1.25), rule: false, bg: [null, null, null], bleed: true, preset: 'one' },
      header: '', footer: '', firstHeader: '', firstFooter: '', diffFirst: false,
      floats: [],
      watermark: null,           // {text, color, size, opacity}
      pageBorder: null,          // {color, width, style, offset}
      view: 'print',             // print | web
    };
  };

  W.doc = W.defaultDoc();

  /* Referenzen auf wichtige DOM-Knoten (nach DOMContentLoaded gesetzt) */
  W.el = {};
  W.initEls = function () {
    const $ = W.$;
    W.el = {
      app: $('#app'), titlebar: $('#titlebar'), tabs: $('#tabs'), ribbon: $('#ribbon'), main: $('#main'),
      navpane: $('#navpane'), workspace: $('#workspace'), rulerbar: $('#rulerbar'), sizer: $('#zoomsizer'),
      pages: $('#pages'), sheets: $('#sheets'), behind: $('#layerBehind'), hf: $('#layerHF'),
      flow: $('#flow'), front: $('#layerFront'), ui: $('#layerUI'), sidepane: $('#sidepane'),
      status: $('#statusbar'), backstage: $('#backstage'), overlays: $('#overlays'),
    };
  };

  /** Seitenrahmen berechnen */
  W.geom = function () {
    const p = W.doc.page;
    const g = { pw: p.w, ph: p.h, ml: p.l, mt: p.t, mr: p.r, mb: p.b };
    g.cw = g.pw - g.ml - g.mr;
    g.ch = g.ph - g.mt - g.mb;
    g.gap = 18;
    g.stride = g.ph + g.gap;
    return g;
  };

  /** Spaltengeometrie für die Inhaltsbreite cw */
  W.colGeom = function (cols, cw) {
    const n = Math.max(1, cols.n | 0);
    const gap = n > 1 ? cols.gap : 0;
    const usable = cw - gap * (n - 1);
    const fr = cols.w && cols.w.length === n ? cols.w : Array(n).fill(1);
    const sum = fr.reduce((a, b) => a + b, 0) || 1;
    const out = [];
    let x = 0;
    for (let i = 0; i < n; i++) {
      const w = usable * fr[i] / sum;
      out.push({ x, w });
      x += w + gap;
    }
    return out;
  };

  W.markDirty = function () { W.dirty = true; W.emit('change'); };
})();
