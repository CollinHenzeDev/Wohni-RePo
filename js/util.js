/* Wohni Writer – Grundlagen: Namespace, DOM-Helfer, Einheiten, Ereignisse */
(function () {
  'use strict';
  const W = (window.W = window.W || {});

  /* ---------- DOM ---------- */
  W.$ = (sel, root) => (root || document).querySelector(sel);
  W.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Kleiner Hyperscript-Helfer: h('div.cls#id', {attr}, kinder…) */
  W.h = function h(spec, attrs, ...kids) {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, n) => {
      if (t === '.') el.classList.add(n); else el.id = n;
    });
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs) || typeof attrs === 'string')) {
      kids.unshift(attrs); attrs = null;
    }
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && k !== 'list' && k !== 'type' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };

  W.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  W.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  W.round = (v, d) => { const f = Math.pow(10, d || 0); return Math.round(v * f) / f; };
  let _uid = 0;
  W.uid = (p) => (p || 'id') + (++_uid).toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- Einheiten (alles intern in CSS-Pixeln bei 96 dpi) ---------- */
  W.u = {
    pt2px: (v) => v * 96 / 72,
    px2pt: (v) => v * 72 / 96,
    mm2px: (v) => v * 96 / 25.4,
    px2mm: (v) => v * 25.4 / 96,
    cm2px: (v) => v * 96 / 2.54,
    px2cm: (v) => v * 2.54 / 96,
    in2px: (v) => v * 96,
    px2in: (v) => v / 96,
    tw2px: (v) => v / 15,           // Twips (1/20 pt)
    px2tw: (v) => Math.round(v * 15),
    emu2px: (v) => v / 9525,
    px2emu: (v) => Math.round(v * 9525),
    hpt2pt: (v) => v / 2,           // halbe Punkt (w:sz)
  };

  /* ---------- Ereignisse ---------- */
  const handlers = {};
  W.on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); return fn; };
  W.off = (name, fn) => { handlers[name] = (handlers[name] || []).filter((f) => f !== fn); };
  W.emit = (name, data) => { (handlers[name] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  W.debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; d.cancel = () => clearTimeout(t); return d; };

  /* ---------- Farben ---------- */
  W.color = {
    parse(str) {
      if (!str) return null;
      str = String(str).trim().toLowerCase();
      if (str === 'transparent' || str === 'none' || str === 'auto') return null;
      let m = /^#([0-9a-f]{3})$/.exec(str);
      if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
      m = /^#([0-9a-f]{6})$/.exec(str);
      if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
      m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/.exec(str);
      if (m) {
        let a = m[4] == null ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
        return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a };
      }
      const named = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', gray: '#808080', grey: '#808080', orange: '#ffa500', purple: '#800080', cyan: '#00ffff', magenta: '#ff00ff', lime: '#00ff00', navy: '#000080', teal: '#008080', maroon: '#800000', olive: '#808000', silver: '#c0c0c0', darkgray: '#a9a9a9', lightgray: '#d3d3d3' };
      if (named[str]) return W.color.parse(named[str]);
      return null;
    },
    hex(c) {
      const o = typeof c === 'string' ? W.color.parse(c) : c;
      if (!o) return null;
      const t = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
      return '#' + t(o.r) + t(o.g) + t(o.b);
    },
    /** Hex ohne '#', für DOCX (leer = null) */
    hex6(c) { const h = W.color.hex(c); return h ? h.slice(1).toUpperCase() : null; },
    isDark(c) {
      const o = typeof c === 'string' ? W.color.parse(c) : c; if (!o) return false;
      return (0.299 * o.r + 0.587 * o.g + 0.114 * o.b) < 140;
    },
  };

  /* ---------- Dateien ---------- */
  W.download = function (blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
  };
  W.readFile = (file, as) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = () => rej(r.error);
    if (as === 'text') r.readAsText(file); else if (as === 'dataurl') r.readAsDataURL(file); else r.readAsArrayBuffer(file);
  });
  W.blobToDataURL = (blob) => W.readFile(blob, 'dataurl');
  W.dataURLToBlob = function (url) {
    const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(url);
    if (!m) return null;
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] || 'application/octet-stream' });
  };

  /** Registry: blob:-URL -> {blob, type}. Bilder bleiben so in Undo-Snapshots klein. */
  W.assets = new Map();
  W.addAsset = function (blob, type) {
    const url = URL.createObjectURL(blob);
    W.assets.set(url, { blob, type: type || blob.type });
    return url;
  };
  /** Liefert Blob zu einem img-src (blob:, data: oder – falls möglich – http:) */
  W.getAssetBlob = async function (src) {
    if (W.assets.has(src)) return W.assets.get(src).blob;
    if (src.startsWith('data:')) return W.dataURLToBlob(src);
    try { const r = await fetch(src); return await r.blob(); } catch (e) { return null; }
  };

  /** Bild-Abmessungen aus Blob-URL lesen */
  W.imageSize = (src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => res({ w: 200, h: 150 });
    im.src = src;
  });

  /* ---------- Meldungen ---------- */
  W.toast = function (msg, ms) {
    let box = W.$('#toasts');
    if (!box) { box = W.h('div#toasts'); document.body.appendChild(box); }
    const t = W.h('div.toast', msg);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms || 3200);
  };

  /* ---------- Schriftarten mit Ersatzschriften ---------- */
  const SERIF_RE = /^(times|georgia|cambria|garamond|book ?antiqua|palatino|bookman|century schoolbook|constantia|baskerville|didot|minion|sylfaen|rockwell|perpetua|goudy|caslon|liberation serif|caladea|noto serif|dejavu serif)/i;
  const MONO_RE = /(courier|consolas|monaco|lucida console|menlo|mono|andale|fixed|cascadia)/i;
  const ALIAS = {
    calibri: ['Calibri', 'Carlito', 'Segoe UI'], 'calibri light': ['Calibri Light', 'Carlito', 'Calibri'], aptos: ['Aptos', 'Calibri', 'Carlito', 'Segoe UI'], 'aptos display': ['Aptos Display', 'Calibri', 'Carlito'],
    arial: ['Arial', 'Liberation Sans', 'Helvetica'], 'times new roman': ['Times New Roman', 'Liberation Serif', 'Times'], cambria: ['Cambria', 'Caladea'],
    'courier new': ['Courier New', 'Liberation Mono', 'Courier'], helvetica: ['Helvetica', 'Arial', 'Liberation Sans'], verdana: ['Verdana', 'DejaVu Sans'], tahoma: ['Tahoma', 'DejaVu Sans'],
    'segoe ui': ['Segoe UI', 'Roboto', 'Helvetica Neue'],
  };
  /** CSS-font-family-Liste mit passenden Ersatzschriften */
  W.fontStack = function (name) {
    if (!name) return '';
    name = String(name).replace(/^["']|["']$/g, '').trim();
    const key = name.toLowerCase();
    const list = (ALIAS[key] || [name]).slice();
    const generic = MONO_RE.test(name) ? 'monospace' : SERIF_RE.test(name) ? 'serif' : 'sans-serif';
    if (/^(sans-serif|serif|monospace)$/.test(key)) return key;
    return list.map((f) => (/^[\w-]+$/.test(f) ? f : `"${f}"`)).join(', ') + ', ' + generic;
  };
  /** erste Schrift aus einer CSS-Liste */
  W.firstFont = (css) => String(css || '').split(',')[0].replace(/["']/g, '').trim();

  /* ---------- Text-Hilfen ---------- */
  W.ZWSP = '​';
  W.stripZW = (s) => s.replace(/​/g, '');
  W.isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  W.mod = (e) => (W.isMac ? e.metaKey : e.ctrlKey);
})();
