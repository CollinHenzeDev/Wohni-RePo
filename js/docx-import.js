/* Wohni Writer – DOCX lesen (Teil 1: Grundlagen, Stile, Nummerierung, Absätze, Tabellen) */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;
  const D = (W.docx = W.docx || {});

  const NS = {
    w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
    pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    mc: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
    v: 'urn:schemas-microsoft-com:vml',
    o: 'urn:schemas-microsoft-com:office:office',
    wps: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
    wpg: 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
    a14: 'http://schemas.microsoft.com/office/drawing/2010/main',
  };
  D.NS = NS;

  /* ---------- XML-Helfer ---------- */
  const kids = (el, ln) => (el ? Array.from(el.children).filter((c) => !ln || c.localName === ln) : []);
  const kid = (el, ln) => (el ? Array.from(el.children).find((c) => c.localName === ln) || null : null);
  const A = (el, name, ns) => {
    if (!el) return null;
    const v = el.getAttributeNS(ns || NS.w, name);
    if (v != null && v !== '') return v;
    const p = ns === NS.r ? 'r:' : ns === NS.w || !ns ? 'w:' : '';
    const v2 = el.getAttribute(p + name);
    return v2 != null ? v2 : el.getAttribute(name);
  };
  const onoff = (el) => { if (!el) return undefined; const v = A(el, 'val'); return !(v === '0' || v === 'false' || v === 'off'); };
  const deep = (el, ln, out) => { out = out || []; kids(el).forEach((c) => { if (c.localName === ln) out.push(c); deep(c, ln, out); }); return out; };
  D.xml = { kids, kid, A, onoff, deep };

  const parseXML = (text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Die Datei enthält fehlerhaftes XML.');
    return doc;
  };

  /* ---------- Farben ---------- */
  const HL = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000', white: '#ffffff' };
  D.HL = HL;
  const rgb2hsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  };
  const hsl2rgb = (h, s, l) => {
    const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return { r: Math.round(f(p, q, h + 1 / 3) * 255), g: Math.round(f(p, q, h) * 255), b: Math.round(f(p, q, h - 1 / 3) * 255) };
  };
  const THEME_ALIAS = { text1: 'dk1', background1: 'lt1', text2: 'dk2', background2: 'lt2', dark1: 'dk1', light1: 'lt1', dark2: 'dk2', light2: 'lt2', tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2', hyperlink: 'hlink', followedHyperlink: 'folHlink' };

  /* ---------- Probes: unsere eigene Standarddarstellung ---------- */
  function makeProbes(base) {
    const sb = document.createElement('div');
    sb.className = 'doc';
    sb.style.cssText = 'position:absolute;left:-10000px;top:0;width:700px;visibility:hidden;pointer-events:none;height:auto';
    if (base.font) sb.style.setProperty('--base-font', W.fontStack(base.font));
    if (base.size) sb.style.setProperty('--base-size', base.size + 'pt');
    if (base.after != null) sb.style.setProperty('--base-after', base.after + 'pt');
    if (base.ls != null) sb.style.setProperty('--base-ls', String(base.ls));
    document.body.appendChild(sb);
    const cache = new Map();
    return {
      get(tag, cls, ctx) {
        const key = tag + '|' + (cls || '') + '|' + (ctx || '');
        if (cache.has(key)) return cache.get(key);
        let p = document.createElement(tag);
        p.textContent = 'Probe';
        if (cls) p.className = cls;
        let host = sb;
        if (ctx === 'cell') { const t = document.createElement('table'); t.innerHTML = '<tbody><tr><td></td></tr></tbody>'; sb.appendChild(t); t.querySelector('td').appendChild(p); }
        else if (ctx === 'tb') { host = document.createElement('div'); host.className = 'tbtext'; sb.appendChild(host); host.appendChild(p); }
        else if (ctx === 'hf') { host = document.createElement('div'); host.className = 'hfbox'; sb.appendChild(host); host.appendChild(p); }
        else sb.appendChild(p);
        const cs = getComputedStyle(p);
        const fs = parseFloat(cs.fontSize);
        const lh = parseFloat(cs.lineHeight);
        const r = {
          sizePt: u.px2pt(fs), family: W.firstFont(cs.fontFamily).toLowerCase(), color: W.color.hex(cs.color) || '#000000',
          bold: parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold', italic: cs.fontStyle === 'italic',
          mt: u.px2pt(parseFloat(cs.marginTop)), mb: u.px2pt(parseFloat(cs.marginBottom)), ml: parseFloat(cs.marginLeft) || 0, mr: parseFloat(cs.marginRight) || 0,
          ti: parseFloat(cs.textIndent) || 0, ls: isFinite(lh) ? lh / fs / 1.22 : 1.08, align: cs.textAlign === 'start' ? 'left' : cs.textAlign === 'end' ? 'right' : cs.textAlign,
        };
        cache.set(key, r);
        return r;
      },
      destroy() { sb.remove(); },
    };
  }

  /* ---------- Hauptfunktion ---------- */
  D.import = async function (buffer, name) {
    const files = await W.zip.read(buffer);
    if (!files.has('word/document.xml')) throw new Error('Das ist keine Word-Datei (word/document.xml fehlt).');
    const xmlOf = async (n) => (files.has(n) ? parseXML(await files.get(n).text()) : null);
    const ctx = {
      files, name, floats: [], pending: [], assets: new Map(), footnotes: [], fnCount: 0, listIds: new Map(), uidN: 0,
      rels: {}, styles: new Map(), numbering: { abs: new Map(), nums: new Map() }, theme: { colors: {}, major: null, minor: null },
      doc: W.defaultDoc(), hfMode: false, pctx: 'doc',
    };
    ctx.doc.title = (name || 'Dokument').replace(/\.(docx|dotx|docm)$/i, '');
    ctx.aid = () => 'a' + (++ctx.uidN) + Math.random().toString(36).slice(2, 6);

    // Beziehungen
    const parseRels = async (part) => {
      const dir = part.slice(0, part.lastIndexOf('/') + 1);
      const rp = dir + '_rels/' + part.slice(dir.length) + '.rels';
      const d = await xmlOf(rp);
      const out = {};
      if (d) Array.from(d.getElementsByTagName('Relationship')).forEach((r) => {
        let t = r.getAttribute('Target') || '';
        const mode = r.getAttribute('TargetMode');
        if (mode !== 'External') { t = t.startsWith('/') ? t.slice(1) : normalizePath(dir + t); }
        out[r.getAttribute('Id')] = { type: (r.getAttribute('Type') || '').split('/').pop(), target: t, external: mode === 'External' };
      });
      return out;
    };
    ctx.rels = await parseRels('word/document.xml');

    const themeDoc = await xmlOf('word/theme/theme1.xml');
    if (themeDoc) parseTheme(ctx, themeDoc);
    const stylesDoc = await xmlOf('word/styles.xml');
    if (stylesDoc) parseStyles(ctx, stylesDoc);
    const numDoc = await xmlOf('word/numbering.xml');
    if (numDoc) parseNumbering(ctx, numDoc);
    const docXml = await xmlOf('word/document.xml');
    const fnDoc = await xmlOf('word/footnotes.xml');
    ctx.fnDoc = fnDoc;

    // Basiswerte (Standardschrift usw.) aus Standardformatvorlage
    deriveBase(ctx);
    ctx.probes = makeProbes(ctx.doc.base);
    ctx.docRels = ctx.rels;

    const body = kid(docXml.documentElement, 'body');
    const root = document.createElement('div');
    const sections = [];
    await convertBody(ctx, body, root, sections);

    // Abschnitte → Seitenformat, Spalten, Kopf-/Fußzeile
    await applySections(ctx, sections, root, parseRels, xmlOf);

    // Fußnoten ans Ende
    if (ctx.footnotes.length) {
      const sep = document.createElement('p'); sep.style.cssText = 'border-top:1px solid #888;width:30%;margin-top:18pt;margin-bottom:4pt;line-height:2px;height:2px'; sep.innerHTML = '<br>'; root.appendChild(sep);
      ctx.footnotes.forEach((f) => { const p = document.createElement('p'); p.style.fontSize = '9pt'; p.style.marginBottom = '2pt'; p.innerHTML = `<sup>${f.n}</sup> ${W.esc(f.text)}`; root.appendChild(p); });
    }
    ctx.probes.destroy();

    // aufräumen
    cleanup(root);
    return { doc: ctx.doc, html: root.innerHTML, floats: ctx.floats };
  };

  function normalizePath(p) {
    const out = [];
    p.split('/').forEach((s) => { if (s === '..') out.pop(); else if (s !== '.' && s !== '') out.push(s); });
    return out.join('/');
  }
  D.normalizePath = normalizePath;

  /* ---------- Theme ---------- */
  function parseTheme(ctx, d) {
    const cs = d.getElementsByTagNameNS(NS.a, 'clrScheme')[0];
    if (cs) kids(cs).forEach((c) => {
      const k = kid(c, 'srgbClr') || kid(c, 'sysClr');
      if (k) ctx.theme.colors[c.localName] = '#' + (A(k, 'val', null) && k.localName === 'srgbClr' ? A(k, 'val', null) : A(k, 'lastClr', null) || '000000');
    });
    const fs = d.getElementsByTagNameNS(NS.a, 'fontScheme')[0];
    if (fs) {
      const mj = kid(kid(fs, 'majorFont'), 'latin'), mn = kid(kid(fs, 'minorFont'), 'latin');
      ctx.theme.major = mj && mj.getAttribute('typeface'); ctx.theme.minor = mn && mn.getAttribute('typeface');
    }
  }
  function themeColor(ctx, name, tint, shade) {
    const key = THEME_ALIAS[name] || name;
    let hex = ctx.theme.colors[key];
    if (!hex) hex = { dk1: '#000000', lt1: '#ffffff', dk2: '#44546a', lt2: '#e7e6e6', accent1: '#4472c4', accent2: '#ed7d31', accent3: '#a5a5a5', accent4: '#ffc000', accent5: '#5b9bd5', accent6: '#70ad47', hlink: '#0563c1', folHlink: '#954f72' }[key] || '#000000';
    let c = W.color.parse(hex);
    if (shade != null) { const s = parseInt(shade, 16) / 255; c = { r: c.r * s, g: c.g * s, b: c.b * s }; }
    if (tint != null) { const t = parseInt(tint, 16) / 255; c = { r: c.r + (255 - c.r) * (1 - t), g: c.g + (255 - c.g) * (1 - t), b: c.b + (255 - c.b) * (1 - t) }; }
    return W.color.hex(c);
  }
  /** Wert/Theme-Attribute (w:color, w:shd fill …) → '#rrggbb' oder null */
  function wColor(ctx, el, valAttr, themeAttr) {
    if (!el) return null;
    const th = A(el, themeAttr || 'themeColor');
    if (th) return themeColor(ctx, th, A(el, 'themeTint'), A(el, 'themeShade'));
    const v = A(el, valAttr || 'val');
    if (!v || v === 'auto') return null;
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : null;
  }
  D.wColor = wColor;
  /** DrawingML-Farbe → {hex, alpha} */
  D.drawColor = function (ctx, el) {
    if (!el) return null;
    let c = kid(el, 'srgbClr') || kid(el, 'schemeClr') || kid(el, 'sysClr') || kid(el, 'prstClr');
    if (!c) return null;
    let hex;
    if (c.localName === 'srgbClr') hex = '#' + A(c, 'val', null);
    else if (c.localName === 'sysClr') hex = '#' + (A(c, 'lastClr', null) || '000000');
    else if (c.localName === 'prstClr') hex = ({ black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff' })[A(c, 'val', null)] || '#000000';
    else hex = themeColor(ctx, A(c, 'val', null) === 'phClr' ? 'accent1' : A(c, 'val', null));
    let rgb = W.color.parse(hex) || { r: 0, g: 0, b: 0 };
    let alpha = 1;
    kids(c).forEach((m) => {
      const v = parseInt(A(m, 'val', null), 10) / 100000;
      if (m.localName === 'lumMod' || m.localName === 'lumOff') return;
      if (m.localName === 'alpha') alpha = v;
      else if (m.localName === 'tint') rgb = { r: rgb.r + (255 - rgb.r) * (1 - v), g: rgb.g + (255 - rgb.g) * (1 - v), b: rgb.b + (255 - rgb.b) * (1 - v) };
      else if (m.localName === 'shade') rgb = { r: rgb.r * v, g: rgb.g * v, b: rgb.b * v };
    });
    const lm = kid(c, 'lumMod'), lo = kid(c, 'lumOff');
    if (lm || lo) {
      const [h, s, l] = rgb2hsl(rgb.r, rgb.g, rgb.b);
      const mod = lm ? parseInt(A(lm, 'val', null), 10) / 100000 : 1, off = lo ? parseInt(A(lo, 'val', null), 10) / 100000 : 0;
      rgb = hsl2rgb(h, s, W.clamp(l * mod + off, 0, 1));
    }
    return { hex: W.color.hex(rgb), alpha };
  };

  /* ---------- Formatvorlagen ---------- */
  function parsePPr(ctx, el) {
    const o = {};
    if (!el) return o;
    kids(el).forEach((c) => {
      switch (c.localName) {
        case 'jc': o.jc = A(c, 'val'); break;
        case 'ind': o.ind = { left: A(c, 'left') ?? A(c, 'start'), right: A(c, 'right') ?? A(c, 'end'), firstLine: A(c, 'firstLine'), hanging: A(c, 'hanging') }; break;
        case 'spacing': o.spacing = { before: A(c, 'before'), after: A(c, 'after'), line: A(c, 'line'), lineRule: A(c, 'lineRule'), bA: A(c, 'beforeAutospacing'), aA: A(c, 'afterAutospacing') }; break;
        case 'shd': { const f = wColor(ctx, c, 'fill', 'themeFill'); if (f && A(c, 'val') !== 'nil') o.shd = f; break; }
        case 'pBdr': o.bdr = {}; kids(c).forEach((b) => { o.bdr[b.localName] = { val: A(b, 'val'), sz: A(b, 'sz'), space: A(b, 'space'), color: wColor(ctx, b) }; }); break;
        case 'keepNext': o.keepNext = onoff(c); break;
        case 'keepLines': o.keepLines = onoff(c); break;
        case 'pageBreakBefore': o.pageBreakBefore = onoff(c); break;
        case 'numPr': o.numPr = { numId: A(kid(c, 'numId'), 'val'), ilvl: A(kid(c, 'ilvl'), 'val') }; break;
        case 'outlineLvl': o.outlineLvl = A(c, 'val'); break;
        case 'pStyle': o.pStyle = A(c, 'val'); break;
        case 'tabs': o.tabs = kids(c, 'tab').map((t) => ({ pos: +A(t, 'pos'), val: A(t, 'val'), leader: A(t, 'leader') })); break;
        case 'sectPr': o.sectPr = c; break;
        case 'rPr': o.rPr = parseRPr(ctx, c); break;
        default: break;
      }
    });
    return o;
  }
  function parseRPr(ctx, el) {
    const o = {};
    if (!el) return o;
    kids(el).forEach((c) => {
      switch (c.localName) {
        case 'b': o.b = onoff(c); break;
        case 'i': o.i = onoff(c); break;
        case 'strike': o.strike = onoff(c); break;
        case 'dstrike': o.dstrike = onoff(c); break;
        case 'caps': o.caps = onoff(c); break;
        case 'smallCaps': o.smallCaps = onoff(c); break;
        case 'vanish': o.vanish = onoff(c); break;
        case 'u': o.u = A(c, 'val') || 'single'; break;
        case 'vertAlign': o.vertAlign = A(c, 'val'); break;
        case 'color': { const col = wColor(ctx, c); o.color = col || (A(c, 'val') === 'auto' ? 'auto' : undefined); break; }
        case 'highlight': o.highlight = A(c, 'val'); break;
        case 'shd': { const f = wColor(ctx, c, 'fill', 'themeFill'); if (f) o.shd = f; break; }
        case 'sz': o.sz = parseInt(A(c, 'val'), 10); break;
        case 'spacing': o.spacing = parseInt(A(c, 'val'), 10); break;
        case 'rStyle': o.rStyle = A(c, 'val'); break;
        case 'rFonts': {
          let f = A(c, 'ascii') || A(c, 'hAnsi') || A(c, 'cs') || A(c, 'eastAsia');
          const th = A(c, 'asciiTheme') || A(c, 'hAnsiTheme');
          if (th) f = /major/i.test(th) ? ctx.theme.major : ctx.theme.minor;
          if (f) o.font = f;
          break;
        }
        default: break;
      }
    });
    return o;
  }
  D.parsePPr = parsePPr; D.parseRPr = parseRPr;
  function overlay(into, from) {
    for (const k in from) {
      const v = from[k];
      if (v === undefined || v === null) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Element)) {
        into[k] = Object.assign({}, into[k] || {});
        for (const kk in v) if (v[kk] !== undefined && v[kk] !== null) into[k][kk] = v[kk];
      } else into[k] = v;
    }
    return into;
  }

  function parseStyles(ctx, d) {
    const root = d.documentElement;
    const dd = kid(root, 'docDefaults');
    ctx.defP = parsePPr(ctx, kid(kid(dd, 'pPrDefault'), 'pPr'));
    ctx.defR = parseRPr(ctx, kid(kid(dd, 'rPrDefault'), 'rPr'));
    kids(root, 'style').forEach((s) => {
      const id = A(s, 'styleId');
      const st = {
        id, type: A(s, 'type'), name: (A(kid(s, 'name'), 'val') || id || '').toLowerCase(), basedOn: A(kid(s, 'basedOn'), 'val'),
        isDefault: A(s, 'default') === '1' || A(s, 'default') === 'true',
        pPr: parsePPr(ctx, kid(s, 'pPr')), rPr: parseRPr(ctx, kid(s, 'rPr')), tblPr: kid(s, 'tblPr'), tcPr: kid(s, 'tcPr'), tblStylePr: kids(s, 'tblStylePr'),
      };
      ctx.styles.set(id, st);
      if (st.isDefault && st.type === 'paragraph') ctx.defParaStyle = id;
      if (st.isDefault && st.type === 'table') ctx.defTblStyle = id;
    });
  }
  function styleChain(ctx, id) {
    const chain = [];
    const seen = new Set();
    while (id && ctx.styles.has(id) && !seen.has(id)) { seen.add(id); const s = ctx.styles.get(id); chain.unshift(s); id = s.basedOn; }
    return chain;
  }

  function deriveBase(ctx) {
    const p = {}, r = {};
    overlay(p, ctx.defP || {}); overlay(r, ctx.defR || {});
    styleChain(ctx, ctx.defParaStyle).forEach((s) => { overlay(p, s.pPr); overlay(r, s.rPr); });
    const sp = p.spacing || {};
    const line = sp.line ? (sp.lineRule && sp.lineRule !== 'auto' ? null : parseInt(sp.line, 10) / 240) : 1;
    ctx.doc.base = {
      font: r.font || ctx.theme.minor || 'Calibri', size: r.sz ? r.sz / 2 : 10,
      after: sp.after ? parseInt(sp.after, 10) / 20 : 0, ls: line || 1,
    };
    // ohne Angabe in der Datei ist die Word-Voreinstellung 10 pt / 0 pt Abstand / einfach
  }

  /* ---------- Nummerierung ---------- */
  function parseNumbering(ctx, d) {
    const root = d.documentElement;
    kids(root, 'abstractNum').forEach((a) => {
      const lv = {};
      kids(a, 'lvl').forEach((l) => {
        lv[A(l, 'ilvl')] = { fmt: A(kid(l, 'numFmt'), 'val') || 'decimal', text: A(kid(l, 'lvlText'), 'val') || '', start: parseInt(A(kid(l, 'start'), 'val') || '1', 10), pPr: parsePPr(ctx, kid(l, 'pPr')), rPr: parseRPr(ctx, kid(l, 'rPr')) };
      });
      ctx.numbering.abs.set(A(a, 'abstractNumId'), lv);
    });
    kids(root, 'num').forEach((n) => {
      const over = {};
      kids(n, 'lvlOverride').forEach((o) => { const so = kid(o, 'startOverride'); if (so) over[A(o, 'ilvl')] = parseInt(A(so, 'val'), 10); });
      ctx.numbering.nums.set(A(n, 'numId'), { abs: A(kid(n, 'abstractNumId'), 'val'), over });
    });
  }
  function numLevel(ctx, numId, ilvl) {
    const n = ctx.numbering.nums.get(String(numId));
    if (!n) return null;
    const abs = ctx.numbering.abs.get(n.abs);
    if (!abs) return null;
    const lv = abs[String(ilvl || 0)] || abs['0'];
    return lv ? Object.assign({}, lv, { startOver: n.over[String(ilvl || 0)] }) : null;
  }
  function bulletFmt(ch) {
    const c = ch || '';
    if (c === 'o') return 'circle';
    if (/[▪■§]/.test(c)) return 'square';
    if (/[➤→]/.test(c)) return 'arrow';
    if (/[✓✔]/.test(c)) return 'check';
    if (/[–—\-]/.test(c)) return 'dash';
    if (/[★☆]/.test(c)) return 'star';
    return 'disc';
  }
  function listInfo(ctx, numId, ilvl) {
    if (!numId || numId === '0') return null;
    const lv0 = numLevel(ctx, numId, 0), lv = numLevel(ctx, numId, ilvl);
    if (!lv || lv.fmt === 'none') return null;
    if (lv.fmt === 'bullet') return { type: 'b', fmt: bulletFmt(lv.text), lvl: parseInt(ilvl || 0, 10), lv };
    let fmt = 'decimal';
    const t0 = (lv0 && lv0.text) || '';
    if (lv0 && lv0.fmt === 'upperRoman') fmt = 'upperRoman';
    else if (lv0 && lv0.fmt === 'upperLetter') fmt = 'upperLetter';
    else if (lv0 && lv0.fmt === 'lowerLetter') fmt = 'lowerLetter';
    else if (/\)/.test(t0)) fmt = 'paren';
    const l1 = numLevel(ctx, numId, 1);
    if (l1 && /%1.*%2/.test(l1.text) && lv0 && lv0.fmt === 'decimal') fmt = 'legal';
    return { type: 'n', fmt, lvl: parseInt(ilvl || 0, 10), lv, lid: 'n' + numId };
  }

  /* ---------- Abschnitte / Body ---------- */
  async function convertBody(ctx, body, root, sections) {
    let secStartIdx = 0;
    const children = kids(body);
    for (const c of children) {
      if (c.localName === 'sectPr') { sections.push({ sectPr: c, breakAfter: null }); continue; }
      const blocks = await convertBlockLevel(ctx, c, root);
      if (c.localName === 'p') {
        const ppr = kid(c, 'pPr');
        const sp = ppr && kid(ppr, 'sectPr');
        if (sp) {
          sections.push({ sectPr: sp, at: root.lastElementChild });
        }
      }
    }
  }

  async function convertBlockLevel(ctx, el, root) {
    switch (el.localName) {
      case 'p': { const blocks = await convertParagraph(ctx, el); blocks.forEach((b) => root.appendChild(b)); return blocks; }
      case 'tbl': { const t = await convertTable(ctx, el); if (t) root.appendChild(t); return [t]; }
      case 'sdt': { const content = kid(el, 'sdtContent'); const out = []; for (const c of kids(content)) out.push(...(await convertBlockLevel(ctx, c, root))); return out; }
      case 'AlternateContent': case 'ins': case 'moveTo': case 'customXml': case 'smartTag': { const out = []; for (const c of kids(el)) out.push(...(await convertBlockLevel(ctx, c, root))); return out; }
      default: return [];
    }
  }

  async function applySections(ctx, sections, root, parseRels, xmlOf) {
    if (!sections.length) return;
    const doc = ctx.doc;
    const first = sections[0].sectPr;
    const readSect = (sp) => {
      const pg = kid(sp, 'pgSz'), mar = kid(sp, 'pgMar'), cols = kid(sp, 'cols'), type = kid(sp, 'type');
      const o = { type: type ? A(type, 'val') : 'nextPage' };
      if (pg) { o.w = u.tw2px(+A(pg, 'w')); o.h = u.tw2px(+A(pg, 'h')); o.orient = A(pg, 'orient'); }
      if (mar) { o.t = u.tw2px(+A(mar, 'top')); o.b = u.tw2px(+A(mar, 'bottom')); o.l = u.tw2px(+A(mar, 'left')); o.r = u.tw2px(+A(mar, 'right')); o.hd = u.tw2px(+A(mar, 'header') || 708); o.fd = u.tw2px(+A(mar, 'footer') || 708); }
      o.cols = readCols(cols);
      const pb = kid(sp, 'pgBorders');
      if (pb) { const b = kid(pb, 'top') || kid(pb, 'left'); if (b && A(b, 'val') !== 'nil' && A(b, 'val') !== 'none') o.border = { color: wColor(ctx, b) || '#000000', width: Math.max(1, (+A(b, 'sz') || 8) / 8 * 96 / 72), offset: u.pt2px(+A(b, 'space') || 24), style: A(b, 'val') === 'double' ? 'double' : /dash/.test(A(b, 'val')) ? 'dashed' : /dot/.test(A(b, 'val')) ? 'dotted' : 'solid' }; }
      o.titlePg = !!kid(sp, 'titlePg');
      o.refs = kids(sp).filter((c) => c.localName === 'headerReference' || c.localName === 'footerReference').map((c) => ({ kind: c.localName === 'headerReference' ? 'header' : 'footer', type: A(c, 'type'), id: A(c, 'id', NS.r) }));
      return o;
    };
    function readCols(cols) {
      if (!cols) return { n: 1, w: [1], gap: u.cm2px(1.25), rule: false };
      const n = parseInt(A(cols, 'num') || '1', 10) || 1;
      const cs = kids(cols, 'col');
      const gap = u.tw2px(+A(cols, 'space') || (cs[0] && +A(cs[0], 'space')) || 720);
      let w = Array(n).fill(1);
      if (cs.length === n && A(cols, 'equalWidth') !== '1' && A(cols, 'equalWidth') !== 'true') w = cs.map((c) => +A(c, 'w') || 1);
      return { n, w, gap: n > 1 ? gap : u.cm2px(1.25), rule: A(cols, 'sep') === '1' || A(cols, 'sep') === 'true' };
    }
    const s0 = readSect(first);
    if (s0.w) { doc.page.w = s0.w; doc.page.h = s0.h; doc.page.orient = s0.w > s0.h ? 'landscape' : 'portrait'; doc.page.size = 'custom'; for (const k in W.PAGE_SIZES) { const s = W.PAGE_SIZES[k]; const a = u.mm2px(s.w), b = u.mm2px(s.h); if ((Math.abs(Math.min(doc.page.w, doc.page.h) - a) < 3 && Math.abs(Math.max(doc.page.w, doc.page.h) - b) < 3)) doc.page.size = k; } }
    if (s0.t != null) Object.assign(doc.page, { t: s0.t, b: s0.b, l: s0.l, r: s0.r, hdist: s0.hd, fdist: s0.fd });
    doc.cols = Object.assign(doc.cols, s0.cols, { n: s0.cols.n, w: s0.cols.w, bg: [null, null, null], bleed: true, preset: s0.cols.n === 1 ? 'one' : 'custom' });
    if (s0.border) doc.pageBorder = s0.border;
    doc.diffFirst = s0.titlePg;

    // Abschnittsumbrüche vor Folgeabschnitten
    for (let i = 0; i < sections.length - 1; i++) {
      const cur = sections[i], nxt = readSect(sections[i + 1].sectPr);
      const marker = document.createElement('p');
      marker.className = 'brk';
      marker.setAttribute('data-brk', nxt.type === 'continuous' ? 'sect' : 'sectnext');
      marker.setAttribute('contenteditable', 'false');
      marker.innerHTML = '<br>';
      marker.setAttribute('data-cols', JSON.stringify({ n: nxt.cols.n, w: nxt.cols.w, gap: nxt.cols.gap, rule: nxt.cols.rule, bg: [null, null, null], bleed: true }));
      if (cur.at && cur.at.parentNode === root) cur.at.after(marker); else root.appendChild(marker);
    }

    // Kopf-/Fußzeilen des ersten Abschnitts
    const target = { header: ['header', 'firstHeader'], footer: ['footer', 'firstFooter'] };
    for (const ref of s0.refs) {
      if (!ref.id || !ctx.rels[ref.id]) continue;
      const part = ctx.rels[ref.id].target;
      const hd = await xmlOf(part);
      if (!hd) continue;
      const rels = await parseRels(part);
      const saveRels = ctx.rels;
      ctx.rels = rels; ctx.hfMode = true; ctx.pctx = 'hf';
      const holder = document.createElement('div');
      for (const c of kids(hd.documentElement)) await convertBlockLevel(ctx, c, holder);
      ctx.rels = saveRels; ctx.hfMode = false; ctx.pctx = 'doc';
      const key = ref.type === 'first' ? target[ref.kind][1] : ref.type === 'even' ? null : target[ref.kind][0];
      if (!key) continue;
      cleanup(holder);
      const empty = !holder.textContent.trim() && !holder.querySelector('img,.fld,table');
      doc[key] = empty ? '' : holder.innerHTML;
    }
  }

  /* ---------- Absätze ---------- */
  const KNOWN_STYLES = { normal: ['p', ''], 'no spacing': ['p', 's-nospace'], title: ['p', 's-title'], subtitle: ['p', 's-subtitle'], quote: ['p', 's-quote'], 'intense quote': ['p', 's-iquote'], caption: ['p', 's-caption'] };
  function targetFor(ctx, styleId) {
    const chain = styleChain(ctx, styleId).reverse();
    for (const s of chain) {
      const m = /^heading\s*([1-9])$/.exec(s.name);
      if (m) return ['h' + Math.min(6, +m[1]), '', s.name];
      if (KNOWN_STYLES[s.name]) return KNOWN_STYLES[s.name].concat([s.name]);
      if (/^toc\s*[1-9]$/.test(s.name)) return ['p', 's-toc' + s.name.slice(-1), s.name];
      if (s.pPr && s.pPr.outlineLvl != null && /^[0-5]$/.test(s.pPr.outlineLvl) && /heading|überschrift/i.test(s.name)) return ['h' + (+s.pPr.outlineLvl + 1), '', s.name];
    }
    return ['p', '', ''];
  }

  const eqPt = (a, b, t) => Math.abs(a - b) <= (t || 0.3);

  /** wirksame Absatzeigenschaften (Vorlagen + Nummerierung + direkt) */
  function effective(ctx, pPrEl, tblStyleP) {
    const direct = parsePPr(ctx, pPrEl);
    const p = {}, r = {};
    overlay(p, ctx.defP || {}); overlay(r, ctx.defR || {});
    if (tblStyleP) { overlay(p, tblStyleP.p || {}); overlay(r, tblStyleP.r || {}); }
    const sid = direct.pStyle || ctx.defParaStyle;
    const chain = styleChain(ctx, sid);
    chain.forEach((s) => { overlay(p, s.pPr); overlay(r, s.rPr); });
    let numPr = direct.numPr || p.numPr;
    let li = null;
    if (numPr && numPr.numId && numPr.numId !== '0') {
      li = listInfo(ctx, numPr.numId, numPr.ilvl || 0);
      if (li && li.lv && li.lv.pPr && li.lv.pPr.ind) { overlay(p, { ind: li.lv.pPr.ind }); }
    }
    const dnum = direct.numPr;
    overlay(p, Object.assign({}, direct, { numPr: undefined }));
    return { p, r, direct, sid, li, numPr };
  }

  /** Läufe → DOM; liefert Liste von Absatz-Blöcken (mehrere bei Umbrüchen) */
  async function convertParagraph(ctx, pEl, opts) {
    opts = opts || {};
    const pPrEl = kid(pEl, 'pPr');
    const eff = effective(ctx, pPrEl, opts.tblStyleP);
    const [tag, cls, styleName] = targetFor(ctx, eff.sid);
    const pctx = opts.pctx || ctx.pctx || 'doc';
    const probe = ctx.probes.get(tag, cls, pctx === 'cell' || pctx === 'tb' || pctx === 'hf' ? pctx : '');
    const isToc = /^toc /.test(styleName || '');
    const out = [];
    let cur = null;
    const savedPH = ctx.pendingHere;
    const myPending = (ctx.pendingHere = []);

    const newPara = () => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      applyParaProps(ctx, el, eff, probe, tag, styleName);
      cur = { el, container: el, empty: true };
      return cur;
    };
    const finish = (force) => {
      if (!cur) return;
      if (!cur.el.firstChild) cur.el.appendChild(document.createElement('br'));
      out.push(cur.el); cur = null;
    };
    const ensure = () => cur || newPara();

    // Seitenumbruch davor
    if (eff.p.pageBreakBefore) out.push(makeBreak('page'));

    const ctxRun = { eff, probe, styleName, fieldStack: [], skipResult: 0, listFirst: true, isToc, tabs: (eff.p.tabs || []).filter((t) => t.val !== 'clear') };
    // Tabstopps von Vorlagenketten ansammeln
    ctxRun.tabs = collectTabs(ctx, eff);

    const add = {
      text(t) { if (!t) return; const c = ensure(); appendText(c.container, t, ctxRun.runCss); c.empty = false; },
      node(n) { const c = ensure(); c.container.appendChild(n); c.empty = false; },
    };
    ctxRun.add = add; ctxRun.ensure = ensure; ctxRun.finish = finish; ctxRun.out = out; ctxRun.getCur = () => cur;
    ctxRun.flushBreak = (kind) => { if (cur && !cur.empty) finish(); else cur = null; out.push(makeBreak(kind)); };

    await convertRuns(ctx, pEl, ctxRun);

    // Absatz ohne Inhalt, aber mit Absatzmarke
    if (cur) finish(); else if (!out.some((b) => !b.classList.contains('brk'))) { newPara(); finish(); }
    // leere Absätze, die nur einen Umbruch tragen, nicht doppelt führen
    const paras = out.filter((b) => !b.classList.contains('brk'));
    if (paras.length === 0 && out.length) { ctx.pendingHere = savedPH; return out; }

    // Listenattribute auf allen Teilen
    if (eff.li) paras.forEach((p) => { applyList(ctx, p, eff); });
    if (isToc) paras.forEach((p) => { buildTocPara(p); });
    if (myPending.length) {
      const first = paras[0];
      if (first) { const aid = ctx.aid(); first.setAttribute('data-aid', aid); myPending.forEach((f) => { f.pending.aid = aid; }); }
    }
    ctx.pendingHere = savedPH;
    return out;
  }

  function collectTabs(ctx, eff) {
    // Tabstopps: Kette der Absatzvorlagen + direkt, "clear" entfernt
    const map = new Map();
    const feed = (tabs) => (tabs || []).forEach((t) => { if (t.val === 'clear') map.delete(t.pos); else map.set(t.pos, t); });
    feed(ctx.defP && ctx.defP.tabs);
    styleChain(ctx, eff.sid).forEach((s) => feed(s.pPr.tabs));
    feed(eff.direct.tabs);
    return Array.from(map.values()).sort((a, b) => a.pos - b.pos);
  }

  function makeBreak(kind) {
    const b = document.createElement('p');
    b.className = 'brk'; b.setAttribute('data-brk', kind); b.setAttribute('contenteditable', 'false'); b.innerHTML = '<br>';
    return b;
  }
  D.makeBreak = makeBreak;

  function applyList(ctx, p, eff) {
    const li = eff.li;
    if (!li) return;
    const lid = li.type === 'n' ? li.lid : null;
    p.setAttribute('data-list', li.type);
    p.setAttribute('data-lvl', String(Math.min(8, li.lvl)));
    p.style.setProperty('--lvl', String(Math.min(8, li.lvl)));
    p.setAttribute('data-fmt', li.fmt);
    if (lid) p.setAttribute('data-lid', lid);
    const so = li.lv && (li.lv.startOver != null ? li.lv.startOver : li.lv.start);
    if (li.type === 'n' && so && so !== 1) {
      // Startwert nur für erste Fundstelle dieser Liste/Ebene
      const key = lid + ':' + li.lvl;
      if (!ctx.listIds.has(key)) { ctx.listIds.set(key, true); p.setAttribute('data-start', String(so)); }
    }
    // Einzug: Standard (links = (Ebene+1) × 0,5", hängend 0,25") bleibt ohne Inline-Stil
    const ind = eff.p.ind || {};
    const left = ind.left != null ? u.tw2px(+ind.left) : (li.lvl + 1) * 48;
    const hang = ind.hanging != null ? u.tw2px(+ind.hanging) : 24;
    if (Math.abs(left - (li.lvl + 1) * 48) > 1) p.style.marginLeft = left.toFixed(1) + 'px';
    if (Math.abs(hang - 24) > 1) p.style.setProperty('--hang', hang.toFixed(1) + 'px');
    p.style.removeProperty('text-indent');
  }

  /** Absatz-Eigenschaften als Differenz zur eigenen Darstellung */
  function applyParaProps(ctx, el, eff, probe, tag, styleName) {
    const p = eff.p, r = eff.r;
    const st = el.style;
    // Zeichen-Defaults der Vorlage (gelten für den ganzen Absatz)
    const fs = r.sz ? r.sz / 2 : ctx.doc.base.size;
    if (!eqPt(fs, probe.sizePt)) st.fontSize = fs + 'pt';
    const fam = (r.font || ctx.doc.base.font || '').toLowerCase();
    if (fam && fam !== probe.family) st.fontFamily = W.fontStack(r.font);
    const col = r.color && r.color !== 'auto' ? r.color : '#000000';
    if (col.toLowerCase() !== probe.color) st.color = col;
    const bold = !!r.b, ital = !!r.i;
    if (bold !== probe.bold) st.fontWeight = bold ? 'bold' : 'normal';
    if (ital !== probe.italic) st.fontStyle = ital ? 'italic' : 'normal';
    if (r.u && r.u !== 'none') st.textDecoration = 'underline';
    if (r.caps) st.textTransform = 'uppercase';
    if (r.smallCaps) st.fontVariant = 'small-caps';
    if (r.spacing) st.letterSpacing = (u.tw2px(r.spacing)).toFixed(2) + 'px';
    if (r.highlight && D.HL[r.highlight]) st.backgroundColor = D.HL[r.highlight];
    // Ausrichtung
    const jc = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' }[p.jc] || 'left';
    if (jc !== probe.align) st.textAlign = jc;
    // Abstände
    const sp = p.spacing || {};
    let before = sp.before != null ? +sp.before / 20 : 0, after = sp.after != null ? +sp.after / 20 : 0;
    if (sp.bA === '1' || sp.bA === 'true') before = 14; if (sp.aA === '1' || sp.aA === 'true') after = 14;
    if (!eqPt(before, probe.mt, 0.4)) st.marginTop = before + 'pt';
    if (!eqPt(after, probe.mb, 0.4)) st.marginBottom = after + 'pt';
    // Zeilenabstand
    if (sp.line) {
      const lv = +sp.line;
      if (!sp.lineRule || sp.lineRule === 'auto') { const m = lv / 240; if (Math.abs(m - probe.ls) > 0.015) st.setProperty('--ls', String(Math.round(m * 1000) / 1000)); }
      else if (sp.lineRule === 'exact') st.lineHeight = (lv / 20) + 'pt';
      else if (sp.lineRule === 'atLeast') { const nat = fs * 1.22; if (lv / 20 > nat) st.lineHeight = (lv / 20) + 'pt'; }
    } else if (Math.abs(ctx.doc.base.ls - probe.ls) > 0.015 && !tag.startsWith('h')) { /* Basis gilt */ }
    // Einzüge (Listen werden separat behandelt)
    if (!eff.li) {
      const ind = p.ind || {};
      const left = ind.left != null ? u.tw2px(+ind.left) : 0, right = ind.right != null ? u.tw2px(+ind.right) : 0;
      let ti = 0;
      if (ind.hanging != null) ti = -u.tw2px(+ind.hanging); else if (ind.firstLine != null) ti = u.tw2px(+ind.firstLine);
      if (Math.abs(left - probe.ml) > 0.8) st.marginLeft = left.toFixed(1) + 'px';
      if (Math.abs(right - probe.mr) > 0.8) st.marginRight = right.toFixed(1) + 'px';
      if (Math.abs(ti - probe.ti) > 0.8) st.textIndent = ti.toFixed(1) + 'px';
    }
    if (p.shd) st.backgroundColor = p.shd;
    if (p.bdr) {
      const side = { top: 'borderTop', left: 'borderLeft', bottom: 'borderBottom', right: 'borderRight' };
      let any = false;
      for (const k in side) {
        const b = p.bdr[k];
        if (!b || !b.val || b.val === 'nil' || b.val === 'none') continue;
        const w = Math.max(1, (+b.sz || 4) / 8 * 96 / 72);
        const style = b.val === 'double' ? 'double' : /dash/.test(b.val) ? 'dashed' : /dot/.test(b.val) ? 'dotted' : 'solid';
        st[side[k]] = `${w.toFixed(1)}px ${style} ${b.color || '#000000'}`; any = true;
      }
      if (any) { const sp2 = Math.max(...Object.values(p.bdr).map((b) => (b && +b.space) || 0)); if (sp2) st.padding = `${Math.min(8, sp2)}pt ${Math.min(8, sp2)}pt`; }
    }
    const isHead = /^h[1-6]$/.test(tag);
    if (isHead && p.keepNext === false) el.setAttribute('data-keep', '0');
    else if (!isHead && p.keepNext) el.setAttribute('data-keep', '1');
    if (eff.sid && /^(heading|title)/i.test(eff.sid) === false && false) el.setAttribute('data-style', eff.sid);
    const tabs = (el._tabs = null);
  }

  function buildTocPara(p) {
    // Text [Tab] Seitenzahl → Inhaltsverzeichnis-Darstellung mit Punktlinie
    const txt = p.textContent;
    const i = txt.lastIndexOf('\t');
    if (i < 0) return;
    const left = txt.slice(0, i).trim(), num = txt.slice(i + 1).trim();
    if (!left) return;
    p.innerHTML = `<span class="toctext">${W.esc(left)}</span><span class="tocdots"></span><span class="tocnum">${W.esc(num)}</span>`;
    p.setAttribute('data-toc', '1'); p.setAttribute('contenteditable', 'false');
  }

  /* ---------- Läufe ---------- */
  function appendText(container, text, css) {
    const parts = text.split('\n');
    parts.forEach((t, i) => {
      if (i > 0) container.appendChild(document.createElement('br'));
      if (!t) return;
      const last = container.lastChild;
      if (last && last.nodeType === 3 && !css) { last.nodeValue += t; return; }
      container.appendChild(document.createTextNode(t));
    });
  }

  function runStyle(ctx, ctxRun, rEl) {
    // Lauf-Eigenschaften: Absatz-Vorlage < Zeichenvorlage < direkt
    const eff = ctxRun.eff;
    const direct = parseRPr(ctx, kid(rEl, 'rPr'));
    const r = Object.assign({}, eff.r);
    if (direct.rStyle) styleChain(ctx, direct.rStyle).forEach((s) => overlay(r, s.rPr));
    overlay(r, direct);
    return r;
  }

  function wrapRun(ctx, ctxRun, r) {
    // Unterschiede zur Absatz-Darstellung als <span style> bzw. <sup>/<sub>
    const p = ctxRun.eff.r;
    const probe = ctxRun.probe;
    const st = {};
    const baseSize = p.sz ? p.sz / 2 : ctx.doc.base.size;
    const sz = r.sz ? r.sz / 2 : baseSize;
    if (!eqPt(sz, baseSize)) st['font-size'] = sz + 'pt';
    const fnow = (r.font || ctx.doc.base.font || '').toLowerCase(), fbase = (p.font || ctx.doc.base.font || '').toLowerCase();
    if (fnow !== fbase) st['font-family'] = W.fontStack(r.font);
    const cn = r.color && r.color !== 'auto' ? r.color : null, cb = p.color && p.color !== 'auto' ? p.color : null;
    if ((cn || '') !== (cb || '')) st.color = cn || '#000000';
    if (!!r.b !== !!p.b) st['font-weight'] = r.b ? 'bold' : 'normal';
    if (!!r.i !== !!p.i) st['font-style'] = r.i ? 'italic' : 'normal';
    const dec = [];
    if (r.u && r.u !== 'none') dec.push('underline');
    if (r.strike || r.dstrike) dec.push('line-through');
    const pdec = [];
    if (p.u && p.u !== 'none') pdec.push('underline'); if (p.strike) pdec.push('line-through');
    if (dec.join() !== pdec.join()) st['text-decoration'] = dec.join(' ') || 'none';
    if (r.u === 'double') st['text-decoration-style'] = 'double'; else if (/dotted/.test(r.u || '')) st['text-decoration-style'] = 'dotted'; else if (/dash/.test(r.u || '')) st['text-decoration-style'] = 'dashed'; else if (/wave/.test(r.u || '')) st['text-decoration-style'] = 'wavy';
    if (!!r.caps !== !!p.caps) st['text-transform'] = r.caps ? 'uppercase' : 'none';
    if (!!r.smallCaps !== !!p.smallCaps) st['font-variant'] = r.smallCaps ? 'small-caps' : 'normal';
    if (r.spacing && r.spacing !== p.spacing) st['letter-spacing'] = u.tw2px(r.spacing).toFixed(2) + 'px';
    const hl = r.highlight && D.HL[r.highlight] ? D.HL[r.highlight] : (r.shd || null);
    if (hl && hl !== (p.shd || null) && r.highlight !== 'none') st['background-color'] = hl;
    return { st, sup: r.vertAlign === 'superscript', sub: r.vertAlign === 'subscript' };
  }

  function styleToString(st) { return Object.entries(st).map(([k, v]) => `${k}:${v}`).join(';'); }

  async function convertRuns(ctx, parent, ctxRun) {
    for (const c of kids(parent)) {
      switch (c.localName) {
        case 'r': await convertRun(ctx, c, ctxRun); break;
        case 'hyperlink': {
          const rid = A(c, 'id', NS.r), anchor = A(c, 'anchor');
          let href = null;
          if (rid && ctx.rels[rid]) href = ctx.rels[rid].target; else if (anchor) href = '#' + anchor;
          if (href) {
            const a = document.createElement('a'); a.setAttribute('href', href);
            const cc = ctxRun.ensure();
            const save = cc.container; cc.container.appendChild(a); cc.container = a;
            await convertRuns(ctx, c, ctxRun);
            if (ctxRun.getCur() === cc) cc.container = save;
            if (!a.firstChild) a.remove();
          } else await convertRuns(ctx, c, ctxRun);
          break;
        }
        case 'ins': case 'smartTag': case 'moveTo': case 'customXml': await convertRuns(ctx, c, ctxRun); break;
        case 'sdt': await convertRuns(ctx, kid(c, 'sdtContent'), ctxRun); break;
        case 'fldSimple': {
          const instr = (A(c, 'instr') || '').trim();
          if (/^PAGE\b/i.test(instr) || /^NUMPAGES\b/i.test(instr)) ctxRun.add.node(fieldNode(/^PAGE/i.test(instr) ? 'PAGE' : 'NUMPAGES'));
          else await convertRuns(ctx, c, ctxRun);
          break;
        }
        case 'AlternateContent': await convertRuns(ctx, c, ctxRun); break;
        case 'del': case 'moveFrom': case 'bookmarkStart': case 'bookmarkEnd': case 'proofErr': case 'pPr': case 'commentRangeStart': case 'commentRangeEnd': break;
        default: break;
      }
    }
  }

  function fieldNode(kind) {
    const s = document.createElement('span');
    s.className = 'fld'; s.setAttribute('data-f', kind); s.setAttribute('contenteditable', 'false'); s.textContent = '1';
    return s;
  }

  async function convertRun(ctx, rEl, ctxRun) {
    const r = runStyle(ctx, ctxRun, rEl);
    if (r.vanish) return;
    const { st, sup, sub } = wrapRun(ctx, ctxRun, r);
    const css = styleToString(st);
    ctxRun.runCss = css || null;
    // Inhalte des Laufs sammeln
    let buf = '';
    const flush = () => {
      if (!buf) return;
      if (ctxRun.skipResult > 0) { buf = ''; return; }
      const c = ctxRun.ensure();
      let target = c.container;
      if (css || sup || sub) {
        let node = document.createElement('span');
        if (css) node.setAttribute('style', css);
        let outer = node;
        if (sup) { const e = document.createElement('sup'); e.appendChild(node); outer = e; } else if (sub) { const e = document.createElement('sub'); e.appendChild(node); outer = e; }
        appendText(node, buf, css);
        target.appendChild(outer);
      } else appendText(target, buf, null);
      c.empty = false; buf = '';
    };
    for (const c of kids(rEl)) {
      switch (c.localName) {
        case 't': case 'delText': buf += c.textContent; break;
        case 'tab': {
          if (ctxRun.tabs.length || ctxRun.eff.p.tabs) { flush(); if (ctxRun.skipResult <= 0) ctxRun.add.node(tabNode(ctxRun)); }
          else buf += '\t';
          break;
        }
        case 'noBreakHyphen': buf += '‑'; break;
        case 'softHyphen': buf += '­'; break;
        case 'sym': { const ch = parseInt(A(c, 'char') || '0', 16); buf += String.fromCodePoint(ch >= 0xF000 ? 0x2022 : (ch || 0x20)); break; }
        case 'br': {
          const t = A(c, 'type');
          if (t === 'page') { flush(); ctxRun.flushBreak('page'); }
          else if (t === 'column') { flush(); ctxRun.flushBreak('column'); }
          else buf += '\n';
          break;
        }
        case 'cr': buf += '\n'; break;
        case 'lastRenderedPageBreak': break;
        case 'fldChar': {
          flush();
          const t = A(c, 'fldCharType');
          if (t === 'begin') ctxRun.fieldStack.push({ instr: '', phase: 'instr' });
          else if (t === 'separate') {
            const f = ctxRun.fieldStack[ctxRun.fieldStack.length - 1];
            if (f) {
              f.phase = 'result';
              const ins = f.instr.trim();
              if (/^PAGE\b/i.test(ins)) { ctxRun.add.node(fieldNode('PAGE')); f.skip = true; ctxRun.skipResult++; }
              else if (/^NUMPAGES\b/i.test(ins)) { ctxRun.add.node(fieldNode('NUMPAGES')); f.skip = true; ctxRun.skipResult++; }
              else if (/^HYPERLINK/i.test(ins)) {
                const m = /HYPERLINK\s+(?:\\l\s+)?"([^"]+)"/i.exec(ins);
                if (m) { const a = document.createElement('a'); a.setAttribute('href', /\\l/i.test(ins) ? '#' + m[1] : m[1]); const cc = ctxRun.ensure(); f.prev = cc.container; cc.container.appendChild(a); cc.container = a; f.link = true; }
              }
            }
          } else if (t === 'end') {
            const f = ctxRun.fieldStack.pop();
            if (f && f.skip) ctxRun.skipResult--;
            if (f && f.link && f.prev && ctxRun.getCur()) ctxRun.getCur().container = f.prev;
          }
          break;
        }
        case 'instrText': {
          const f = ctxRun.fieldStack[ctxRun.fieldStack.length - 1];
          if (f && f.phase === 'instr') f.instr += c.textContent;
          break;
        }
        case 'footnoteReference': {
          flush();
          const id = A(c, 'id');
          const n = ++ctx.fnCount;
          const sp = document.createElement('sup'); sp.textContent = String(n);
          ctxRun.add.node(sp);
          if (ctx.fnDoc) {
            const fn = kids(ctx.fnDoc.documentElement, 'footnote').find((f) => A(f, 'id') === id);
            if (fn) ctx.footnotes.push({ n, text: deep(fn, 't').map((t) => t.textContent).join('') });
          }
          break;
        }
        case 'drawing': case 'pict': case 'object': {
          flush();
          if (W.docx.drawing) await W.docx.drawing(ctx, c, ctxRun);
          break;
        }
        case 'AlternateContent': {
          flush();
          const ch = kid(c, 'Choice') || kid(c, 'Fallback');
          if (ch) for (const d of kids(ch)) if (d.localName === 'drawing' || d.localName === 'pict') { if (W.docx.drawing) await W.docx.drawing(ctx, d, ctxRun); }
          break;
        }
        default: break;
      }
    }
    flush();
    ctxRun.runCss = null;
  }

  function tabNode(ctxRun) {
    const s = document.createElement('span');
    s.className = 'tabc'; s.textContent = '\t';
    const p = ctxRun.ensure().el;
    if (p && !p.hasAttribute('data-tabs') && ctxRun.tabs.length) p.setAttribute('data-tabs', JSON.stringify(ctxRun.tabs.map((t) => ({ p: +u.tw2px(t.pos).toFixed(1), a: { right: 'r', center: 'c', decimal: 'd', left: 'l', start: 'l', end: 'r' }[t.val] || 'l', l: t.leader && t.leader !== 'none' ? t.leader : '' }))));
    return s;
  }

  /* ---------- Tabellen ---------- */
  function readBorders(ctx, el) {
    const o = {};
    if (!el) return o;
    kids(el).forEach((b) => {
      const v = A(b, 'val');
      o[b.localName] = (!v || v === 'nil' || v === 'none') ? null : { sz: +A(b, 'sz') || 4, color: wColor(ctx, b) || '#000000', style: v === 'double' ? 'double' : /dash/.test(v) ? 'dashed' : /dot/.test(v) ? 'dotted' : 'solid' };
    });
    return o;
  }
  const cssBorder = (b) => (b ? `${Math.max(0.67, b.sz / 8 * 96 / 72).toFixed(2)}px ${b.style} ${b.color}` : 'none');

  async function convertTable(ctx, tblEl, opts) {
    const tblPr = kid(tblEl, 'tblPr');
    const grid = kids(kid(tblEl, 'tblGrid'), 'gridCol').map((g) => +A(g, 'w') || 0);
    const rows = kids(tblEl, 'tr');
    if (!rows.length) return null;
    // Tabellenformatvorlage
    const sid = A(kid(tblPr, 'tblStyle'), 'val') || ctx.defTblStyle;
    const chain = styleChain(ctx, sid);
    let tbl = {}, tcBase = {}, tstyleP = { p: {}, r: {} };
    const stylePr = { firstRow: null, lastRow: null, firstCol: null, band1Horz: null, band2Horz: null };
    chain.forEach((s) => {
      if (s.tblPr) { const b = readBorders(ctx, kid(s.tblPr, 'tblBorders')); Object.assign(tbl, b); }
      if (s.pPr) overlay(tstyleP.p, s.pPr);
      if (s.rPr) overlay(tstyleP.r, s.rPr);
      if (s.tcPr) { const shd = kid(s.tcPr, 'shd'); if (shd) tcBase.shd = wColor(ctx, shd, 'fill', 'themeFill'); }
      s.tblStylePr.forEach((sp) => { const t = A(sp, 'type'); if (t in stylePr) stylePr[t] = { rPr: parseRPr(ctx, kid(sp, 'rPr')), shd: wColor(ctx, kid(kid(sp, 'tcPr'), 'shd'), 'fill', 'themeFill'), bdr: readBorders(ctx, kid(kid(sp, 'tcPr'), 'tcBorders')) }; });
    });
    Object.assign(tbl, readBorders(ctx, kid(tblPr, 'tblBorders')));
    const look = kid(tblPr, 'tblLook');
    const lookVal = look ? parseInt(A(look, 'val') || '0', 16) : 0x04A0;
    const hasFirstRow = look && (A(look, 'firstRow') != null ? A(look, 'firstRow') === '1' : !!(lookVal & 0x20));
    const hasBand = look && (A(look, 'noHBand') != null ? A(look, 'noHBand') !== '1' : !(lookVal & 0x200));
    const total = grid.reduce((a, b) => a + b, 0) || 1;

    // Zellen-Matrix
    const mat = rows.map((tr) => {
      const out = []; let c = 0;
      const trPr = kid(tr, 'trPr');
      const gb = trPr && kid(trPr, 'gridBefore');
      if (gb) c += +A(gb, 'val') || 0;
      kids(tr, 'tc').forEach((tc) => {
        const pr = kid(tc, 'tcPr');
        const span = +A(kid(pr, 'gridSpan'), 'val') || 1;
        const vm = kid(pr, 'vMerge');
        out.push({ el: tc, c0: c, span, vm: vm ? (A(vm, 'val') === 'restart' ? 'restart' : 'continue') : null });
        c += span;
      });
      return out;
    });
    const ncols = Math.max(grid.length, ...mat.map((r) => r.reduce((a, b) => Math.max(a, b.c0 + b.span), 0)));
    // rowSpan bestimmen
    mat.forEach((row, r) => row.forEach((cell) => {
      if (cell.vm === 'restart') {
        let n = 1;
        for (let k = r + 1; k < mat.length; k++) { const nx = mat[k].find((x) => x.c0 === cell.c0 && x.vm === 'continue'); if (!nx) break; n++; }
        cell.rowSpan = n;
      }
    }));

    const table = document.createElement('table');
    // Breite
    const tw = kid(tblPr, 'tblW');
    const contentW = u.tw2px(0) || W.geom().cw;
    let frac = 1;
    if (tw) {
      const t = A(tw, 'type'), v = +A(tw, 'w');
      if (t === 'dxa' && v) frac = Math.min(1, u.tw2px(v) / W.geom().cw);
      else if (t === 'pct' && v) frac = Math.min(1, v / 5000);
      else frac = Math.min(1, u.tw2px(total) / W.geom().cw);
    } else frac = Math.min(1, u.tw2px(total) / W.geom().cw);
    if (frac < 0.999) table.style.setProperty('--tw', frac.toFixed(4));
    const jc = A(kid(tblPr, 'jc'), 'val');
    if (jc === 'center') { table.style.marginLeft = 'auto'; table.style.marginRight = 'auto'; } else if (jc === 'right' || jc === 'end') table.style.marginLeft = 'auto';
    const ind = kid(tblPr, 'tblInd'); if (ind && +A(ind, 'w')) table.style.marginLeft = u.tw2px(+A(ind, 'w')).toFixed(1) + 'px';
    if (grid.length) {
      const cg = document.createElement('colgroup');
      for (let i = 0; i < ncols; i++) { const c = document.createElement('col'); c.style.width = ((grid[i] || total / ncols) / total * 100).toFixed(3) + '%'; cg.appendChild(c); }
      table.appendChild(cg);
    }
    const tbody = document.createElement('tbody');
    const sides = ['top', 'bottom', 'left', 'right'];
    for (let r = 0; r < mat.length; r++) {
      const tr = document.createElement('tr');
      const trPr = kid(rows[r], 'trPr');
      const th = kid(trPr, 'trHeight');
      if (th && +A(th, 'val')) tr.style.height = u.tw2px(+A(th, 'val')).toFixed(1) + 'px';
      for (const cell of mat[r]) {
        if (cell.vm === 'continue') continue;
        const td = document.createElement('td');
        if (cell.span > 1) td.colSpan = cell.span;
        if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
        const pr = kid(cell.el, 'tcPr');
        // Rahmen
        const own = readBorders(ctx, kid(pr, 'tcBorders'));
        const lastCol = cell.c0 + cell.span >= ncols, lastRow = r + (cell.rowSpan || 1) >= mat.length;
        const cond = hasFirstRow && r === 0 ? stylePr.firstRow : null;
        const pick = (side) => {
          if (side in own) return own[side];
          if (cond && cond.bdr && side in cond.bdr) return cond.bdr[side];
          if (side === 'top') return r === 0 ? tbl.top : tbl.insideH;
          if (side === 'bottom') return lastRow ? tbl.bottom : tbl.insideH;
          if (side === 'left') return cell.c0 === 0 ? (tbl.left || tbl.start) : tbl.insideV;
          return lastCol ? (tbl.right || tbl.end) : tbl.insideV;
        };
        sides.forEach((s) => { const b = pick(s); td.style['border' + s[0].toUpperCase() + s.slice(1)] = cssBorder(b); });
        // Füllung
        let fill = wColor(ctx, kid(pr, 'shd'), 'fill', 'themeFill');
        if (!fill && cond && cond.shd) fill = cond.shd;
        if (!fill && hasBand && stylePr.band1Horz && stylePr.band1Horz.shd && ((r - (hasFirstRow ? 1 : 0)) % 2 === 0) && !(hasFirstRow && r === 0)) fill = stylePr.band1Horz.shd;
        if (!fill && tcBase.shd) fill = tcBase.shd;
        if (fill) td.style.backgroundColor = fill;
        const va = A(kid(pr, 'vAlign'), 'val'); if (va === 'center') td.style.verticalAlign = 'middle'; else if (va === 'bottom') td.style.verticalAlign = 'bottom';
        const mar = kid(pr, 'tcMar');
        if (mar) { kids(mar).forEach((m) => { const px = u.tw2px(+A(m, 'w') || 0).toFixed(1) + 'px'; const k = m.localName; if (k === 'left' || k === 'start') td.style.paddingLeft = px; else if (k === 'right' || k === 'end') td.style.paddingRight = px; else if (k === 'top') td.style.paddingTop = px; else if (k === 'bottom') td.style.paddingBottom = px; }); }
        // Inhalt
        const save = ctx.pctx; ctx.pctx = 'cell';
        const holder = document.createElement('div');
        const cellStyleP = { p: tstyleP.p, r: Object.assign({}, tstyleP.r, cond && cond.rPr ? cond.rPr : {}) };
        for (const ch of kids(cell.el)) {
          if (ch.localName === 'p') { const blocks = await convertParagraph(ctx, ch, { tblStyleP: cellStyleP, pctx: 'cell' }); blocks.forEach((b) => holder.appendChild(b)); }
          else if (ch.localName === 'tbl') { const t2 = await convertTable(ctx, ch, { nested: true }); if (t2) holder.appendChild(t2); }
          else if (ch.localName === 'sdt') { for (const x of kids(kid(ch, 'sdtContent'))) { if (x.localName === 'p') (await convertParagraph(ctx, x, { tblStyleP: cellStyleP, pctx: 'cell' })).forEach((b) => holder.appendChild(b)); } }
        }
        ctx.pctx = save;
        // Umbrüche in Zellen nicht unterstützt: entfernen
        holder.querySelectorAll('p.brk').forEach((b) => b.remove());
        if (!holder.firstChild) holder.innerHTML = '<p><br></p>';
        while (holder.firstChild) td.appendChild(holder.firstChild);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  /* ---------- Aufräumen ---------- */
  function cleanup(root) {
    root.querySelectorAll('span').forEach((s) => { if (!s.firstChild) s.remove(); });
    root.querySelectorAll('p,h1,h2,h3,h4,h5,h6').forEach((p) => { if (!p.firstChild) p.appendChild(document.createElement('br')); p.normalize(); });
    // benachbarte Spans mit gleichem Stil zusammenführen
    root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,a').forEach((p) => {
      let n = p.firstChild;
      while (n) {
        const nx = n.nextSibling;
        if (nx && n.nodeType === 1 && nx.nodeType === 1 && n.tagName === 'SPAN' && nx.tagName === 'SPAN' && n.getAttribute('style') === nx.getAttribute('style') && n.getAttribute('style')) {
          while (nx.firstChild) n.appendChild(nx.firstChild); nx.remove(); continue;
        }
        n = nx;
      }
    });
  }
  D.makeProbes = makeProbes;
  D.cleanup = cleanup;
  D.convertParagraph = convertParagraph;
  D.convertBlockLevel = convertBlockLevel;
  D.styleChain = styleChain;
  D.overlay = overlay;
})();
