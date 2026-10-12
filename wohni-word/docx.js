/* Wohni Word – DOCX-Import/Export (reines JavaScript, benötigt JSZip + DOM) */
(function (global) {
  'use strict';

  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const PAGE_SIZES = {
    A4: [11906, 16838], A3: [16838, 23811], A5: [8391, 11906],
    Letter: [12240, 15840], Legal: [12240, 20160],
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ------------------------------------------------------------------ */
  /*  Hilfsfunktionen                                                    */
  /* ------------------------------------------------------------------ */
  let colorCtx = null;
  const colorCache = new Map();
  function toHex(c) {
    if (!c) return null;
    c = String(c).trim();
    if (colorCache.has(c)) return colorCache.get(c);
    let out = null;
    if (/^transparent$/i.test(c)) out = null;
    else {
      if (!colorCtx) colorCtx = document.createElement('canvas').getContext('2d');
      colorCtx.fillStyle = '#000001';
      colorCtx.fillStyle = c;
      let v = colorCtx.fillStyle;
      if (v === '#000001' && !/^(#000001|rgb\(0, ?0, ?1\))$/i.test(c)) {
        colorCtx.fillStyle = '#000002';
        colorCtx.fillStyle = c;
        if (colorCtx.fillStyle === '#000002') v = null; // ungültig
      }
      if (v && v[0] === '#') out = v.slice(1).toUpperCase();
      else if (v) {
        const m = v.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(',').map((x) => parseFloat(x));
          if (p.length === 4 && p[3] === 0) out = null;
          else out = p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
        }
      }
    }
    colorCache.set(c, out);
    return out;
  }

  function lenToTwips(v) {
    if (v == null || v === '') return null;
    const m = String(v).trim().match(/^(-?[\d.]+)\s*(px|pt|cm|mm|in|em|rem)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    switch (m[2] || 'px') {
      case 'px': return Math.round(n * 15);
      case 'pt': return Math.round(n * 20);
      case 'cm': return Math.round(n * 566.93);
      case 'mm': return Math.round(n * 56.693);
      case 'in': return Math.round(n * 1440);
      case 'em': case 'rem': return Math.round(n * 16 * 15);
    }
    return null;
  }
  function lenToPt(v) {
    const t = lenToTwips(v);
    return t == null ? null : t / 20;
  }

  function dataUrlToBytes(url) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
    if (!m) return null;
    const mime = m[1].toLowerCase();
    let bytes;
    if (m[2]) {
      const bin = atob(m[3]);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else bytes = new TextEncoder().encode(decodeURIComponent(m[3]));
    return { mime, bytes };
  }

  function safeHref(h) {
    if (!h) return null;
    h = String(h).trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(h) || !/^[a-z][a-z0-9+.-]*:/i.test(h)) return h;
    return null;
  }

  /* ================================================================== */
  /*  EXPORT                                                             */
  /* ================================================================== */
  const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR']);
  const hasBlockChild = (el) => Array.from(el.children).some((c) => BLOCK.has(c.tagName));

  function elemProps(el, p) {
    p = Object.assign({}, p);
    const t = el.tagName, s = el.style;
    if (t === 'B' || t === 'STRONG') p.b = true;
    if (t === 'I' || t === 'EM' || t === 'CITE') p.i = true;
    if (t === 'U' || t === 'INS') p.u = true;
    if (t === 'S' || t === 'STRIKE' || t === 'DEL') p.strike = true;
    if (t === 'SUB') p.va = 'subscript';
    if (t === 'SUP') p.va = 'superscript';
    if (t === 'CODE' || t === 'KBD' || t === 'TT' || t === 'PRE') p.font = 'Consolas';
    if (t === 'MARK') p.shd = 'FFFF00';
    if (t === 'FONT') {
      if (el.getAttribute('color')) p.color = toHex(el.getAttribute('color'));
      if (el.getAttribute('face')) p.font = el.getAttribute('face').split(',')[0].replace(/['"]/g, '').trim();
    }
    if (s) {
      if (s.fontWeight) p.b = s.fontWeight === 'bold' || s.fontWeight === 'bolder' || parseInt(s.fontWeight, 10) >= 600;
      if (s.fontStyle) p.i = s.fontStyle === 'italic' || s.fontStyle === 'oblique';
      const td = s.textDecorationLine || s.textDecoration;
      if (td) {
        if (td === 'none') { p.u = false; p.strike = false; }
        if (/underline/.test(td)) p.u = true;
        if (/line-through/.test(td)) p.strike = true;
      }
      if (s.color) p.color = toHex(s.color);
      if (s.backgroundColor) p.shd = toHex(s.backgroundColor);
      if (s.fontFamily) p.font = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      if (s.fontSize) {
        const pt = lenToPt(s.fontSize);
        if (pt) p.sz = Math.round(pt * 2);
      }
      if (s.verticalAlign === 'sub') p.va = 'subscript';
      if (s.verticalAlign === 'super') p.va = 'superscript';
      if (s.textTransform === 'uppercase') p.caps = true;
      if (s.fontVariant === 'small-caps') p.smallCaps = true;
    }
    return p;
  }

  function rPrXml(p, extra) {
    let x = '';
    if (extra && extra.rStyle) x += `<w:rStyle w:val="${extra.rStyle}"/>`;
    if (p.font) x += `<w:rFonts w:ascii="${esc(p.font)}" w:hAnsi="${esc(p.font)}" w:cs="${esc(p.font)}" w:eastAsia="${esc(p.font)}"/>`;
    if (p.b !== undefined) x += p.b ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/><w:bCs w:val="0"/>';
    if (p.i !== undefined) x += p.i ? '<w:i/><w:iCs/>' : '<w:i w:val="0"/><w:iCs w:val="0"/>';
    if (p.caps) x += '<w:caps/>';
    if (p.smallCaps) x += '<w:smallCaps/>';
    if (p.strike !== undefined) x += p.strike ? '<w:strike/>' : '<w:strike w:val="0"/>';
    if (p.color) x += `<w:color w:val="${p.color}"/>`;
    if (p.sz) x += `<w:sz w:val="${p.sz}"/><w:szCs w:val="${p.sz}"/>`;
    if (p.u !== undefined) x += p.u ? '<w:u w:val="single"/>' : '<w:u w:val="none"/>';
    if (p.shd) x += `<w:shd w:val="clear" w:color="auto" w:fill="${p.shd}"/>`;
    if (p.va) x += `<w:vertAlign w:val="${p.va}"/>`;
    return x ? `<w:rPr>${x}</w:rPr>` : '';
  }

  const OL_FORMATS = {
    decimal: 1, 'lower-alpha': 2, 'lower-latin': 2, 'upper-alpha': 3, 'upper-latin': 3,
    'lower-roman': 4, 'upper-roman': 5,
  };
  const ABS_FORMATS = [
    null, ['decimal', 'lowerLetter', 'lowerRoman'], ['lowerLetter', 'lowerRoman', 'decimal'],
    ['upperLetter', 'lowerRoman', 'decimal'], ['lowerRoman', 'decimal', 'lowerLetter'], ['upperRoman', 'decimal', 'lowerLetter'],
  ];

  class ExportCtx {
    constructor(zip, opts) {
      this.zip = zip;
      this.rels = []; // {id,type,target,external}
      this.nums = []; // {numId, abs, start}
      this.imgCount = 0;
      this.docPrId = 1;
      this.opts = opts;
      this.imageData = opts.imageData || new Map();
      this.contentWidthTwips = opts.contentWidthTwips || 9000;
      this.hasHeaderRel = false;
    }
    addRel(type, target, external) {
      const id = 'rId' + (100 + this.rels.length);
      this.rels.push({ id, type, target, external });
      return id;
    }
    addNum(kind, start) {
      const abs = kind === 'bullet' ? 0 : kind;
      const numId = this.nums.length + 1;
      this.nums.push({ numId, abs, start });
      return numId;
    }
  }

  function pPrXml(el, ctx, opts) {
    opts = opts || {};
    let x = '';
    let style = opts.style;
    const tag = el ? el.tagName : '';
    if (!style && el) {
      if (/^H[1-6]$/.test(tag)) style = 'Heading' + tag[1];
      else if (el.classList.contains('title')) style = 'Title';
      else if (el.classList.contains('subtitle')) style = 'Subtitle';
      else if (el.classList.contains('quote') || tag === 'BLOCKQUOTE') style = 'Quote';
      else if (opts.numId) style = 'ListParagraph';
    }
    if (style) x += `<w:pStyle w:val="${style}"/>`;
    if (opts.numId) x += `<w:numPr><w:ilvl w:val="${opts.ilvl || 0}"/><w:numId w:val="${opts.numId}"/></w:numPr>`;
    const s = el ? el.style : null;
    if (opts.border) x += `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="808080"/></w:pBdr>`;
    if (s && s.backgroundColor && toHex(s.backgroundColor)) x += `<w:shd w:val="clear" w:color="auto" w:fill="${toHex(s.backgroundColor)}"/>`;
    if (s) {
      const sp = [];
      const mt = lenToTwips(s.marginTop), mb = lenToTwips(s.marginBottom);
      if (mt != null) sp.push(`w:before="${Math.max(0, mt)}"`);
      if (mb != null) sp.push(`w:after="${Math.max(0, mb)}"`);
      const lh = s.lineHeight;
      if (lh) {
        if (/^[\d.]+$/.test(lh)) sp.push(`w:line="${Math.round(parseFloat(lh) * 240)}" w:lineRule="auto"`);
        else if (/^[\d.]+%$/.test(lh)) sp.push(`w:line="${Math.round(parseFloat(lh) * 2.4)}" w:lineRule="auto"`);
        else { const t = lenToTwips(lh); if (t) sp.push(`w:line="${t}" w:lineRule="atLeast"`); }
      }
      if (sp.length) x += `<w:spacing ${sp.join(' ')}/>`;
      const ml = lenToTwips(s.marginLeft) || 0, mr = lenToTwips(s.marginRight) || 0, ti = lenToTwips(s.textIndent) || 0;
      const left = (opts.extraLeft || 0) + ml + (/^BLOCKQUOTE$/.test(tag) ? 0 : (lenToTwips(s.paddingLeft) || 0));
      if (left || mr || ti) {
        let ind = '';
        if (left) ind += ` w:left="${Math.max(0, left)}"`;
        if (mr) ind += ` w:right="${Math.max(0, mr)}"`;
        if (ti > 0) ind += ` w:firstLine="${ti}"`;
        else if (ti < 0) ind += ` w:hanging="${-ti}"`;
        x += `<w:ind${ind}/>`;
      }
      const ta = s.textAlign;
      if (ta) {
        const m = { left: 'left', center: 'center', right: 'right', justify: 'both', start: 'left', end: 'right' }[ta];
        if (m) x += `<w:jc w:val="${m}"/>`;
      }
    }
    return x ? `<w:pPr>${x}</w:pPr>` : '';
  }

  function textRunXml(text, p, extra) {
    if (!text) return '';
    const parts = text.replace(/[​﻿]/g, '').replace(/ /g, ' ').split(/(\t|\n)/);
    let inner = '';
    for (const part of parts) {
      if (part === '\t') inner += '<w:tab/>';
      else if (part === '\n') inner += '<w:br/>';
      else if (part) inner += `<w:t xml:space="preserve">${esc(part)}</w:t>`;
    }
    if (!inner) return '';
    return `<w:r>${rPrXml(p, extra)}${inner}</w:r>`;
  }

  function fieldXml(instr, result, p) {
    const rp = rPrXml(p);
    return `<w:r>${rp}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rp}<w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r>` +
      `<w:r>${rp}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rp}<w:t>${esc(result)}</w:t></w:r><w:r>${rp}<w:fldChar w:fldCharType="end"/></w:r>`;
  }

  function imageRunXml(img, ctx) {
    const src = img.getAttribute('src') || '';
    const entry = ctx.imageData.get(img) || (() => { const d = dataUrlToBytes(src); return d; })();
    if (!entry) return textRunXml(img.getAttribute('alt') || '', {});
    let { mime, bytes } = entry;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif', 'image/bmp': 'bmp' }[mime];
    if (!ext) return textRunXml(img.getAttribute('alt') || '', {});
    ctx.imgCount++;
    const name = `image${ctx.imgCount}.${ext}`;
    ctx.zip.file('word/media/' + name, bytes);
    const rid = ctx.addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', 'media/' + name);
    const r = img.getBoundingClientRect();
    let w = parseFloat(img.getAttribute('width')) || r.width || img.naturalWidth || 200;
    let h = parseFloat(img.getAttribute('height')) || r.height || img.naturalHeight || 150;
    if (r.width && r.height) { w = r.width; h = r.height; }
    const maxW = ctx.contentWidthTwips / 15;
    if (w > maxW) { h = h * maxW / w; w = maxW; }
    const cx = Math.round(w * 9525), cy = Math.round(h * 9525);
    const id = ctx.docPrId++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:docPr id="${id}" name="Bild ${id}" descr="${esc(img.getAttribute('alt') || '')}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }

  function inlineXml(nodes, props, ctx) {
    let out = '';
    nodes.forEach((n, idx) => {
      if (n.nodeType === 3) {
        out += textRunXml(n.nodeValue, props);
        return;
      }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (t === 'BR') {
        // abschließendes <br> ist nur ein Platzhalter des Browsers
        const rest = nodes.slice(idx + 1).some((m) => (m.nodeType === 3 ? /\S| /.test(m.nodeValue) : m.nodeType === 1));
        if (rest) out += '<w:r><w:br/></w:r>';
        return;
      }
      if (t === 'IMG') { out += imageRunXml(n, ctx); return; }
      if (n.classList && n.classList.contains('pagenum')) { out += fieldXml('PAGE', '1', props); return; }
      if (n.classList && n.classList.contains('numpages')) { out += fieldXml('NUMPAGES', '1', props); return; }
      if (n.classList && n.classList.contains('pagebreak')) { out += '<w:r><w:br w:type="page"/></w:r>'; return; }
      if (t === 'A') {
        const href = n.getAttribute('href');
        const p2 = elemProps(n, props);
        const kids = Array.from(n.childNodes);
        if (href && href[0] === '#') {
          out += `<w:hyperlink w:anchor="bm_${esc(href.slice(1).replace(/-/g, '_').slice(0, 36))}">${inlineXmlLink(kids, p2, ctx)}</w:hyperlink>`;
        } else if (href) {
          const rid = ctx.addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', href, true);
          out += `<w:hyperlink r:id="${rid}" w:history="1">${inlineXmlLink(kids, p2, ctx)}</w:hyperlink>`;
        } else out += inlineXml(kids, p2, ctx);
        return;
      }
      if (t === 'SCRIPT' || t === 'STYLE') return;
      if (BLOCK.has(t)) { out += inlineXml(Array.from(n.childNodes), props, ctx); return; }
      out += inlineXml(Array.from(n.childNodes), elemProps(n, props), ctx);
    });
    return out;
  }
  function inlineXmlLink(kids, p, ctx) {
    // Hyperlink-Zeichenformat anwenden, wenn keine eigene Farbe gesetzt ist
    return inlineXmlWithStyle(kids, p, ctx);
  }
  function inlineXmlWithStyle(kids, p, ctx) {
    const xml = inlineXml(kids, p, ctx);
    if (p.color) return xml;
    return xml.replace(/<w:r>(<w:rPr>)?/g, (m, g) => (g ? '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/>' : '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'));
  }

  function paraXml(nodes, el, ctx, opts) {
    opts = opts || {};
    let base = {};
    if (el) base = elemProps(el, {});
    if (el && el.tagName === 'PRE') base.font = 'Consolas';
    let runs = inlineXml(nodes, base, ctx);
    if (el && el.id && /^[\w-]+$/.test(el.id)) {
      const bid = ctx.docPrId++;
      const name = 'bm_' + el.id.replace(/-/g, '_').slice(0, 36);
      runs = `<w:bookmarkStart w:id="${bid}" w:name="${name}"/>${runs}<w:bookmarkEnd w:id="${bid}"/>`;
    }
    return `<w:p>${pPrXml(el, ctx, opts)}${runs}</w:p>`;
  }

  function olKind(list) {
    const t = (list.style.listStyleType || list.getAttribute('type') || '').toLowerCase();
    const map = { a: 'lower-alpha', A: 'upper-alpha', i: 'lower-roman', I: 'upper-roman', 1: 'decimal' };
    const k = OL_FORMATS[t] || OL_FORMATS[map[list.getAttribute('type')]] || 1;
    return k;
  }

  function listXml(list, ctx, depth, extraOpts) {
    const ordered = list.tagName === 'OL';
    const kind = ordered ? olKind(list) : 'bullet';
    const start = ordered ? (parseInt(list.getAttribute('start'), 10) || 1) : 1;
    const numId = ctx.addNum(kind, start);
    let out = '';
    for (const li of Array.from(list.children)) {
      if (li.tagName === 'UL' || li.tagName === 'OL') { out += listXml(li, ctx, depth + 1); continue; }
      if (li.tagName !== 'LI') continue;
      const inl = [], nested = [];
      let firstP = true;
      for (const c of Array.from(li.childNodes)) {
        if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL' || c.tagName === 'TABLE')) nested.push(c);
        else if (c.nodeType === 1 && (c.tagName === 'P' || c.tagName === 'DIV')) {
          if (!firstP) inl.push(document.createElement('br'));
          firstP = false;
          inl.push(...Array.from(c.childNodes));
        } else inl.push(c);
      }
      out += paraXml(inl, li, ctx, Object.assign({ numId, ilvl: Math.min(depth, 8) }, extraOpts));
      for (const nl of nested) out += nl.tagName === 'TABLE' ? tableXml(nl, ctx) : listXml(nl, ctx, depth + 1);
    }
    return out;
  }

  function tableXml(table, ctx) {
    const rows = Array.from(table.rows);
    if (!rows.length) return '';
    const tr0 = table.getBoundingClientRect();
    const usable = ctx.contentWidthTwips;
    const cells = [];
    rows.forEach((row, ri) => Array.from(row.cells).forEach((c) => cells.push({ c, ri })));
    let xs = new Set([0]);
    const measured = tr0.width > 0;
    if (measured) {
      cells.forEach(({ c }) => {
        const r = c.getBoundingClientRect();
        xs.add(Math.round(r.left - tr0.left));
        xs.add(Math.round(r.right - tr0.left));
      });
    }
    let bounds = Array.from(xs).sort((a, b) => a - b);
    const merged = [];
    bounds.forEach((b) => { if (!merged.length || b - merged[merged.length - 1] > 3) merged.push(b); });
    bounds = merged;
    let colCount, widths;
    if (!measured || bounds.length < 2) {
      colCount = Math.max(...rows.map((r) => Array.from(r.cells).reduce((s, c) => s + (c.colSpan || 1), 0)));
      widths = new Array(colCount).fill(Math.floor(usable / colCount));
    } else {
      colCount = bounds.length - 1;
      widths = [];
      for (let i = 0; i < colCount; i++) widths.push((bounds[i + 1] - bounds[i]) * 15);
      const total = widths.reduce((a, b) => a + b, 0);
      if (total > usable) widths = widths.map((w) => Math.floor(w * usable / total));
    }
    const colOf = (c) => {
      if (!measured || bounds.length < 2) return null;
      const r = c.getBoundingClientRect();
      const left = Math.round(r.left - tr0.left);
      let i = 0, best = 1e9;
      bounds.forEach((b, k) => { if (Math.abs(b - left) < best && k < colCount) { best = Math.abs(b - left); i = k; } });
      const right = Math.round(r.right - tr0.left);
      let j = i + 1; best = 1e9;
      bounds.forEach((b, k) => { if (k > i && Math.abs(b - right) < best) { best = Math.abs(b - right); j = k; } });
      return [i, j - i];
    };
    // Rasterbelegung
    const placed = rows.map(() => []); // {col,span,cell,vm}
    const occ = rows.map(() => new Array(colCount).fill(false));
    rows.forEach((row, ri) => {
      let cursor = 0;
      Array.from(row.cells).forEach((c) => {
        let col, span;
        const g = colOf(c);
        if (g) { [col, span] = g; } else {
          while (cursor < colCount && occ[ri][cursor]) cursor++;
          col = cursor; span = c.colSpan || 1;
        }
        span = Math.max(1, Math.min(span, colCount - col));
        const rs = Math.max(1, c.rowSpan || 1);
        for (let k = 0; k < rs && ri + k < rows.length; k++) {
          for (let q = col; q < col + span; q++) occ[ri + k][q] = true;
          if (k > 0) placed[ri + k].push({ col, span, vm: 'continue' });
        }
        placed[ri].push({ col, span, cell: c, vm: rs > 1 ? 'restart' : null });
        cursor = col + span;
      });
    });
    const noBorder = table.classList.contains('noborder');
    const bd = noBorder ? 'none' : 'single';
    let x = `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>` +
      `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="${bd}" w:sz="4" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders>` +
      `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
    x += '<w:tblGrid>' + widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('') + '</w:tblGrid>';
    rows.forEach((row, ri) => {
      x += '<w:tr>';
      placed[ri].sort((a, b) => a.col - b.col);
      for (const pc of placed[ri]) {
        const w = widths.slice(pc.col, pc.col + pc.span).reduce((a, b) => a + b, 0);
        let tcPr = `<w:tcW w:w="${w}" w:type="dxa"/>`;
        if (pc.span > 1) tcPr += `<w:gridSpan w:val="${pc.span}"/>`;
        if (pc.vm === 'restart') tcPr += '<w:vMerge w:val="restart"/>';
        else if (pc.vm === 'continue') tcPr += '<w:vMerge/>';
        let body = '<w:p/>';
        if (pc.cell) {
          const bg = pc.cell.style.backgroundColor ? toHex(pc.cell.style.backgroundColor) : null;
          if (bg) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`;
          const va = pc.cell.style.verticalAlign;
          if (va === 'middle' || va === 'bottom') tcPr += `<w:vAlign w:val="${va === 'middle' ? 'center' : 'bottom'}"/>`;
          const sub = blocksXml(pc.cell, ctx, {});
          if (sub) body = sub;
        }
        x += `<w:tc><w:tcPr>${tcPr}</w:tcPr>${body}</w:tc>`;
      }
      x += '</w:tr>';
    });
    x += '</w:tbl>';
    return x + '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>';
  }

  function blocksXml(parent, ctx, inh) {
    let out = '';
    let pend = [];
    const flush = () => {
      if (pend.length && pend.some((n) => n.nodeType === 1 || /\S/.test(n.nodeValue))) out += paraXml(pend, null, ctx, inh);
      pend = [];
    };
    for (const n of Array.from(parent.childNodes)) {
      if (n.nodeType === 3) { pend.push(n); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName;
      if (n.classList.contains('pagebreak')) { flush(); out += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; continue; }
      if (t === 'UL' || t === 'OL') { flush(); out += listXml(n, ctx, 0, inh); continue; }
      if (t === 'TABLE') { flush(); out += tableXml(n, ctx); continue; }
      if (t === 'HR') { flush(); out += `<w:p>${pPrXml(null, ctx, { border: true })}</w:p>`; continue; }
      if (t === 'SCRIPT' || t === 'STYLE') continue;
      if (BLOCK.has(t)) {
        flush();
        if (hasBlockChild(n)) {
          const extra = t === 'BLOCKQUOTE' ? { extraLeft: 720 } : {};
          out += blocksXml(n, ctx, Object.assign({}, inh, extra));
        } else {
          out += paraXml(Array.from(n.childNodes), n, ctx, inh);
        }
        continue;
      }
      pend.push(n);
    }
    flush();
    return out;
  }

  /* --- statische Teile -------------------------------------------------- */
  function stylesXml(defFont, defSize) {
    const f = esc(defFont), sz = Math.round(defSize * 2);
    const head = (id, name, size, color, before, after, extra) =>
      `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
      `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${before}" w:after="${after}"/>${extra || ''}</w:pPr>` +
      `<w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>${/Heading[4-6]/.test(id) ? '<w:i/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}">` +
      `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="de-DE" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
      `<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
      `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
      head('Heading1', 'heading 1', 32, '2F5496', 240, 0) + head('Heading2', 'heading 2', 26, '2F5496', 40, 0) +
      head('Heading3', 'heading 3', 24, '1F3763', 40, 0) + head('Heading4', 'heading 4', 22, '2F5496', 40, 0) +
      head('Heading5', 'heading 5', 22, '2F5496', 40, 0) + head('Heading6', 'heading 6', 22, '1F3763', 40, 0) +
      `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:contextualSpacing/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/><w:spacing w:val="-10"/><w:kern w:val="28"/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>` +
      `<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:color w:val="5A5A5A"/><w:spacing w:val="15"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>` +
      `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="200" w:after="160"/><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="404040"/></w:rPr></w:style>` +
      `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="0"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>` +
      `<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>` +
      `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>` +
      `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>` +
      `</w:styles>`;
  }

  function numberingXml(nums) {
    const lvls = (kind) => {
      let x = '';
      for (let l = 0; l < 9; l++) {
        const left = 720 * (l + 1);
        if (kind === 0) {
          const ch = ['•', 'o', '▪'][l % 3];
          const font = l % 3 === 1 ? 'Courier New' : 'Calibri';
          x += `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${ch}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:hint="default"/></w:rPr></w:lvl>`;
        } else {
          const fmts = ABS_FORMATS[kind];
          const fmt = fmts[l % 3];
          x += `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="%${l + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr></w:lvl>`;
        }
      }
      return x;
    };
    let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}">`;
    for (let k = 0; k <= 5; k++) x += `<w:abstractNum w:abstractNumId="${k}"><w:multiLevelType w:val="hybridMultilevel"/>${lvls(k)}</w:abstractNum>`;
    for (const n of nums) {
      x += `<w:num w:numId="${n.numId}"><w:abstractNumId w:val="${n.abs}"/>`;
      if (n.abs !== 0) x += `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${n.start || 1}"/></w:lvlOverride>`;
      x += '</w:num>';
    }
    return x + '</w:numbering>';
  }

  async function prepareImages(root) {
    const map = new Map();
    const imgs = Array.from(root.querySelectorAll('img'));
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      const d = dataUrlToBytes(src);
      const ok = d && /^image\/(png|jpe?g|gif|bmp)$/.test(d.mime);
      if (ok) continue;
      try {
        if (!img.complete) await new Promise((res) => { img.onload = img.onerror = res; });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width || 1; c.height = img.naturalHeight || img.height || 1;
        c.getContext('2d').drawImage(img, 0, 0);
        const png = dataUrlToBytes(c.toDataURL('image/png'));
        if (png) map.set(img, png);
      } catch (e) { /* nicht konvertierbar (z. B. fremde Quelle) */ }
    }
    return map;
  }

  async function exportDocx(bodyEl, opts) {
    opts = opts || {};
    const s = Object.assign({ w: 11906, h: 16838, top: 1417, right: 1417, bottom: 1417, left: 1417, cols: 1, defaultFont: 'Calibri', defaultSize: 11 }, opts.settings || {});
    const zip = new JSZip();
    const imageData = await prepareImages(bodyEl);
    if (opts.headerEl) for (const [k, v] of await prepareImages(opts.headerEl)) imageData.set(k, v);
    if (opts.footerEl) for (const [k, v] of await prepareImages(opts.footerEl)) imageData.set(k, v);
    const ctx = new ExportCtx(zip, { imageData, contentWidthTwips: s.w - s.left - s.right });

    const body = blocksXml(bodyEl, ctx, {}) || '<w:p/>';
    const isEmpty = (el) => !el || (!el.textContent.trim() && !el.querySelector('img,.pagenum'));
    let hdrRel = '', ftrRel = '';
    const extraRels = [];
    if (!isEmpty(opts.headerEl)) {
      const hctx = new ExportCtx(zip, { imageData, contentWidthTwips: ctx.contentWidthTwips });
      hctx.imgCount = ctx.imgCount; hctx.docPrId = ctx.docPrId + 1000;
      const inner = blocksXml(opts.headerEl, hctx, {}) || '<w:p/>';
      ctx.imgCount = hctx.imgCount;
      zip.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NSDECL}>${inner}</w:hdr>`);
      zip.file('word/_rels/header1.xml.rels', relsXml(hctx.rels));
      hdrRel = ctx.addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', 'header1.xml');
      extraRels.push('header');
    }
    if (!isEmpty(opts.footerEl)) {
      const fctx = new ExportCtx(zip, { imageData, contentWidthTwips: ctx.contentWidthTwips });
      fctx.imgCount = ctx.imgCount; fctx.docPrId = ctx.docPrId + 2000;
      const inner = blocksXml(opts.footerEl, fctx, {}) || '<w:p/>';
      ctx.imgCount = fctx.imgCount;
      zip.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NSDECL}>${inner}</w:ftr>`);
      zip.file('word/_rels/footer1.xml.rels', relsXml(fctx.rels));
      ftrRel = ctx.addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml');
      extraRels.push('footer');
    }

    const landscape = s.w > s.h;
    const sect = `<w:sectPr>${hdrRel ? `<w:headerReference w:type="default" r:id="${hdrRel}"/>` : ''}${ftrRel ? `<w:footerReference w:type="default" r:id="${ftrRel}"/>` : ''}` +
      `<w:pgSz w:w="${s.w}" w:h="${s.h}"${landscape ? ' w:orient="landscape"' : ''}/>` +
      `<w:pgMar w:top="${s.top}" w:right="${s.right}" w:bottom="${s.bottom}" w:left="${s.left}" w:header="708" w:footer="708" w:gutter="0"/>` +
      `<w:cols w:num="${s.cols || 1}" w:space="708"/></w:sectPr>`;

    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NSDECL}><w:body>${body}${sect}</w:body></w:document>`);
    zip.file('word/styles.xml', stylesXml(s.defaultFont, s.defaultSize));
    zip.file('word/numbering.xml', numberingXml(ctx.nums));
    zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${W}"><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`);
    const baseRels = [
      { id: 'rId1', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', target: 'styles.xml' },
      { id: 'rId2', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering', target: 'numbering.xml' },
      { id: 'rId3', type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings', target: 'settings.xml' },
    ];
    zip.file('word/_rels/document.xml.rels', relsXml(baseRels.concat(ctx.rels)));
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || '')}</dc:title><dc:creator>Wohni Word</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
    zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Wohni Word</Application></Properties>`);
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="bmp" ContentType="image/bmp"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
      `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
      `<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>` +
      (extraRels.includes('header') ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : '') +
      (extraRels.includes('footer') ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
    return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' });
  }

  const NSDECL = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="${A}" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`;
  function relsXml(rels) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${esc(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`).join('') + '</Relationships>';
  }

  /* ================================================================== */
  /*  IMPORT                                                             */
  /* ================================================================== */
  const kids = (el, name) => { const r = []; if (!el) return r; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === name) r.push(c); return r; };
  const kid = (el, name) => { if (!el) return null; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === name) return c; return null; };
  const wattr = (el, name) => (el ? (el.getAttributeNS(W, name) || el.getAttribute('w:' + name)) : null);
  const onoff = (el) => { if (!el) return undefined; const v = wattr(el, 'val'); return !(v === '0' || v === 'false' || v === 'off'); };
  const num = (v) => { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };

  const HIGHLIGHT = {
    yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000',
    darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
    darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000', white: '#ffffff',
  };

  function parseRPr(rPr, themeFonts) {
    const p = {};
    if (!rPr) return p;
    for (const c of Array.from(rPr.children)) {
      switch (c.localName) {
        case 'b': p.b = onoff(c); break;
        case 'i': p.i = onoff(c); break;
        case 'strike': case 'dstrike': p.strike = onoff(c); break;
        case 'caps': p.caps = onoff(c); break;
        case 'smallCaps': p.smallCaps = onoff(c); break;
        case 'u': { const v = wattr(c, 'val'); p.u = !(v === 'none'); break; }
        case 'color': { const v = wattr(c, 'val'); if (v && v !== 'auto') p.color = '#' + v; else if (v === 'auto') p.color = null; break; }
        case 'sz': p.sz = num(wattr(c, 'val')); break;
        case 'highlight': { const v = wattr(c, 'val'); p.hl = v === 'none' ? null : HIGHLIGHT[v] || null; break; }
        case 'shd': { const f = wattr(c, 'fill'); if (f && f !== 'auto') p.shd = '#' + f; break; }
        case 'vertAlign': { const v = wattr(c, 'val'); p.va = v === 'baseline' ? null : v; break; }
        case 'rStyle': p.rStyle = wattr(c, 'val'); break;
        case 'rFonts': {
          let f = wattr(c, 'ascii') || wattr(c, 'hAnsi') || wattr(c, 'cs');
          const th = wattr(c, 'asciiTheme') || wattr(c, 'hAnsiTheme');
          if (th && themeFonts) f = /major/i.test(th) ? themeFonts.major : themeFonts.minor;
          if (f) p.font = f;
          break;
        }
      }
    }
    return p;
  }
  function parsePPr(pPr, themeFonts) {
    const p = {};
    if (!pPr) return p;
    const jc = kid(pPr, 'jc'); if (jc) p.jc = wattr(jc, 'val');
    const ind = kid(pPr, 'ind');
    if (ind) p.ind = { left: num(wattr(ind, 'left') || wattr(ind, 'start')), right: num(wattr(ind, 'right') || wattr(ind, 'end')), firstLine: num(wattr(ind, 'firstLine')), hanging: num(wattr(ind, 'hanging')) };
    const sp = kid(pPr, 'spacing');
    if (sp) p.spacing = { before: num(wattr(sp, 'before')), after: num(wattr(sp, 'after')), line: num(wattr(sp, 'line')), rule: wattr(sp, 'lineRule'), beforeAuto: wattr(sp, 'beforeAutospacing') === '1', afterAuto: wattr(sp, 'afterAutospacing') === '1' };
    const np = kid(pPr, 'numPr');
    if (np) p.numPr = { numId: num(wattr(kid(np, 'numId'), 'val')), ilvl: num(wattr(kid(np, 'ilvl'), 'val')) };
    if (kid(pPr, 'pageBreakBefore')) p.pageBreakBefore = onoff(kid(pPr, 'pageBreakBefore'));
    const shd = kid(pPr, 'shd'); if (shd) { const f = wattr(shd, 'fill'); if (f && f !== 'auto') p.shd = '#' + f; }
    const pStyle = kid(pPr, 'pStyle'); if (pStyle) p.style = wattr(pStyle, 'val');
    const bd = kid(pPr, 'pBdr');
    if (bd && kid(bd, 'bottom') && wattr(kid(bd, 'bottom'), 'val') !== 'nil' && !kid(bd, 'top')) p.bottomBorder = true;
    return p;
  }
  function merge(...objs) {
    const out = {};
    for (const o of objs) if (o) for (const k of Object.keys(o)) if (o[k] !== undefined) {
      if (k === 'ind' || k === 'spacing') out[k] = Object.assign({}, out[k], Object.fromEntries(Object.entries(o[k]).filter(([, v]) => v !== undefined)));
      else out[k] = o[k];
    }
    return out;
  }

  function resolvePath(base, target) {
    if (target[0] === '/') return target.slice(1);
    const parts = (base + target).split('/');
    const out = [];
    for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.' && p !== '') out.push(p); }
    return out.join('/');
  }

  async function parseRels(zip, path) {
    const f = zip.file(path);
    const map = {};
    if (!f) return map;
    const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
    for (const r of Array.from(doc.getElementsByTagName('Relationship'))) {
      map[r.getAttribute('Id')] = { type: r.getAttribute('Type') || '', target: r.getAttribute('Target') || '', external: r.getAttribute('TargetMode') === 'External' };
    }
    return map;
  }

  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff' };

  async function importDocx(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const readXml = async (p) => {
      const f = zip.file(p);
      if (!f) return null;
      const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('Ungültiges XML in ' + p);
      return doc;
    };
    // Hauptdokument finden
    let docPath = 'word/document.xml';
    const rootRels = await parseRels(zip, '_rels/.rels');
    for (const r of Object.values(rootRels)) if (/officeDocument$/.test(r.type)) docPath = resolvePath('', r.target);
    const mainDoc = await readXml(docPath);
    if (!mainDoc) throw new Error('Keine word/document.xml gefunden – ist das eine .docx-Datei?');
    const baseDir = docPath.replace(/[^/]*$/, '');
    const rels = await parseRels(zip, baseDir + '_rels/' + docPath.split('/').pop() + '.rels');

    // Theme-Schriften
    let themeFonts = null;
    const themeRel = Object.values(rels).find((r) => /theme$/.test(r.type));
    if (themeRel) {
      const th = await readXml(resolvePath(baseDir, themeRel.target));
      if (th) {
        const g = (tag) => { const e = th.getElementsByTagNameNS(A, tag)[0]; const l = e && e.getElementsByTagNameNS(A, 'latin')[0]; return l ? l.getAttribute('typeface') : null; };
        themeFonts = { major: g('majorFont') || 'Calibri Light', minor: g('minorFont') || 'Calibri' };
      }
    }

    // Stile
    const styles = {};
    let defR = {}, defP = {};
    const stDoc = await readXml(baseDir + 'styles.xml');
    if (stDoc) {
      const dd = kid(stDoc.documentElement, 'docDefaults');
      if (dd) {
        defR = parseRPr(kid(kid(dd, 'rPrDefault'), 'rPr'), themeFonts);
        defP = parsePPr(kid(kid(dd, 'pPrDefault'), 'pPr'), themeFonts);
      }
      for (const s of kids(stDoc.documentElement, 'style')) {
        const id = wattr(s, 'styleId');
        styles[id] = {
          id, type: wattr(s, 'type'), name: (wattr(kid(s, 'name'), 'val') || '').toLowerCase(),
          basedOn: wattr(kid(s, 'basedOn'), 'val'), r: parseRPr(kid(s, 'rPr'), themeFonts), p: parsePPr(kid(s, 'pPr'), themeFonts),
          tblBorders: kid(kid(s, 'tblPr'), 'tblBorders'), isDefault: wattr(s, 'default') === '1',
        };
      }
    }
    const resolved = {};
    const resolveStyle = (id, seen) => {
      if (!id || !styles[id]) return { r: {}, p: {} };
      if (resolved[id]) return resolved[id];
      seen = seen || new Set();
      if (seen.has(id)) return { r: {}, p: {} };
      seen.add(id);
      const st = styles[id];
      const base = st.basedOn ? resolveStyle(st.basedOn, seen) : { r: {}, p: {} };
      const out = { r: merge(base.r, st.r), p: merge(base.p, st.p) };
      resolved[id] = out;
      return out;
    };
    const defaultParaStyle = Object.values(styles).find((s) => s.type === 'paragraph' && s.isDefault);
    const defFont = defR.font || (themeFonts && themeFonts.minor) || 'Calibri';
    const defSize = (defR.sz || 22) / 2;
    const defaults = { font: defFont, sz: defSize };

    // Nummerierung
    const numbering = { abs: {}, nums: {} };
    const nDoc = await readXml(baseDir + 'numbering.xml');
    if (nDoc) {
      for (const a of kids(nDoc.documentElement, 'abstractNum')) {
        const lv = {};
        for (const l of kids(a, 'lvl')) lv[num(wattr(l, 'ilvl'))] = { fmt: wattr(kid(l, 'numFmt'), 'val'), start: num(wattr(kid(l, 'start'), 'val')) || 1 };
        numbering.abs[wattr(a, 'abstractNumId')] = lv;
      }
      for (const n of kids(nDoc.documentElement, 'num')) {
        const ov = {};
        for (const o of kids(n, 'lvlOverride')) ov[num(wattr(o, 'ilvl'))] = num(wattr(kid(o, 'startOverride'), 'val'));
        numbering.nums[wattr(n, 'numId')] = { abs: wattr(kid(n, 'abstractNumId'), 'val'), ov };
      }
    }

    // Bilder laden
    const images = {};
    const loadImages = async (relMap, dir) => {
      for (const [id, r] of Object.entries(relMap)) {
        if (!/image$/.test(r.type) || r.external) continue;
        const f = zip.file(resolvePath(dir, r.target));
        if (!f) continue;
        const ext = r.target.split('.').pop().toLowerCase();
        const b64 = await f.async('base64');
        images[dir + '|' + id] = `data:${MIME[ext] || 'application/octet-stream'};base64,${b64}`;
        images[dir + '|' + id + '|ext'] = ext;
      }
    };
    await loadImages(rels, baseDir);

    const makeConverter = (relMap) => convertFactory({ rels: relMap, baseDir, styles, resolveStyle, defR, defP, defaults, themeFonts, numbering, images, defaultParaStyle });

    const body = kid(mainDoc.documentElement, 'body');
    const conv = makeConverter(rels);
    const container = document.createElement('div');
    conv.blocks(body, container);

    // Abschnittseinstellungen
    const settings = { w: 11906, h: 16838, top: 1417, right: 1417, bottom: 1417, left: 1417, cols: 1, defaultFont: defFont, defaultSize: defSize };
    const lastSect = kids(body, 'sectPr').pop() || (() => { const all = mainDoc.getElementsByTagNameNS(W, 'sectPr'); return all[all.length - 1]; })();
    let hdrHtml = '', ftrHtml = '';
    if (lastSect) {
      const pg = kid(lastSect, 'pgSz');
      if (pg) {
        let w = num(wattr(pg, 'w')), h = num(wattr(pg, 'h'));
        if (w && h) { if (wattr(pg, 'orient') === 'landscape' && w < h) { [w, h] = [h, w]; } settings.w = w; settings.h = h; }
      }
      const mar = kid(lastSect, 'pgMar');
      if (mar) for (const k of ['top', 'right', 'bottom', 'left']) { const v = num(wattr(mar, k)); if (v != null) settings[k] = Math.abs(v); }
      const cols = kid(lastSect, 'cols'); if (cols) settings.cols = Math.min(4, num(wattr(cols, 'num')) || 1);
      for (const ref of kids(lastSect, 'headerReference').concat(kids(lastSect, 'footerReference'))) {
        if (wattr(ref, 'type') !== 'default') continue;
        const rid = ref.getAttributeNS(R, 'id');
        const rel = rels[rid]; if (!rel) continue;
        const path = resolvePath(baseDir, rel.target);
        const hd = await readXml(path);
        if (!hd) continue;
        const hrels = await parseRels(zip, path.replace(/[^/]*$/, '') + '_rels/' + path.split('/').pop() + '.rels');
        await loadImages(hrels, baseDir);
        const c = makeConverter(Object.fromEntries(Object.entries(hrels)));
        const box = document.createElement('div');
        c.blocks(hd.documentElement, box);
        if (ref.localName === 'headerReference') hdrHtml = box.innerHTML; else ftrHtml = box.innerHTML;
      }
    }
    // Wer nur leere Absätze im Header/Footer hat, bekommt keinen Eintrag
    const blank = (h) => { const d = document.createElement('div'); d.innerHTML = h; return !d.textContent.trim() && !d.querySelector('img,.pagenum'); };
    if (blank(hdrHtml)) hdrHtml = '';
    if (blank(ftrHtml)) ftrHtml = '';
    if (!container.firstChild) container.innerHTML = '<p><br></p>';
    return { html: container.innerHTML, header: hdrHtml, footer: ftrHtml, settings };
  }

  /* ---- Konverter Word-XML -> HTML-DOM --------------------------------- */
  function convertFactory(env) {
    const { rels, styles, resolveStyle, defR, defP, defaults, themeFonts, numbering, images, baseDir } = env;
    const APP_AFTER = 160, APP_LINE = 259;

    const headingLevel = (styleId) => {
      const st = styles[styleId];
      if (!st) return 0;
      const m = /^heading\s*(\d)$/.exec(st.name) || /^Heading(\d)$/i.exec(styleId || '');
      return m ? Math.min(6, parseInt(m[1], 10)) : 0;
    };
    const specialClass = (styleId) => {
      const st = styles[styleId];
      const n = st ? st.name : '';
      if (n === 'title') return 'title';
      if (n === 'subtitle') return 'subtitle';
      if (n === 'quote' || n === 'intense quote') return 'quote';
      return '';
    };

    function ensureRunProps(rpr, pStyleR) {
      const cs = rpr.rStyle ? resolveStyle(rpr.rStyle).r : {};
      return merge(defR, pStyleR, cs, rpr);
    }

    function runStyleCss(p) {
      const css = [];
      if (p.font && p.font !== defaults.font) css.push(`font-family:'${p.font.replace(/'/g, '')}'`);
      if (p.sz && p.sz / 2 !== defaults.sz) css.push(`font-size:${p.sz / 2}pt`);
      if (p.color) css.push(`color:${p.color}`);
      const bg = p.hl || p.shd;
      if (bg) css.push(`background-color:${bg}`);
      if (p.caps) css.push('text-transform:uppercase');
      if (p.smallCaps) css.push('font-variant:small-caps');
      return css.join(';');
    }
    const runKey = (p) => JSON.stringify([p.b, p.i, p.u, p.strike, p.va, runStyleCss(p)]);

    function renderText(text, p) {
      let node = document.createTextNode(text);
      const css = runStyleCss(p);
      if (css) { const s = document.createElement('span'); s.setAttribute('style', css); s.appendChild(node); node = s; }
      const wrap = (tag, cond) => { if (cond) { const e = document.createElement(tag); e.appendChild(node); node = e; } };
      wrap('b', p.b); wrap('i', p.i); wrap('u', p.u); wrap('s', p.strike);
      wrap('sub', p.va === 'subscript'); wrap('sup', p.va === 'superscript');
      return node;
    }

    // Läuft rekursiv über Run-Container und füllt "items"
    function walkRuns(el, st, items) {
      for (const c of Array.from(el.children)) {
        switch (c.localName) {
          case 'r': handleRun(c, st, items); break;
          case 'hyperlink': {
            const rid = c.getAttributeNS(R, 'id');
            let href = null;
            if (rid && rels[rid]) href = rels[rid].target;
            else if (wattr(c, 'anchor')) href = '#' + wattr(c, 'anchor');
            walkRuns(c, Object.assign({}, st, { link: safeHref(href) }), items);
            break;
          }
          case 'fldSimple': {
            const instr = wattr(c, 'instr') || '';
            if (/\bNUMPAGES\b/.test(instr)) items.push({ type: 'numpages' });
            else if (/\bPAGE\b/.test(instr)) items.push({ type: 'pagenum' });
            else walkRuns(c, st, items);
            break;
          }
          case 'ins': case 'smartTag': case 'customXml': case 'bdo': case 'dir': case 'moveTo': case 'sdtContent': case 'sdt':
            walkRuns(c.localName === 'sdt' ? (kid(c, 'sdtContent') || c) : c, st, items); break;
          case 'AlternateContent': {
            const ch = kid(c, 'Choice'); if (ch) walkRuns(ch, st, items); break;
          }
          default: break;
        }
      }
    }

    function handleRun(r, st, items) {
      const props = ensureRunProps(parseRPr(kid(r, 'rPr'), themeFonts), st.pR);
      const hidden = st.fields.some((f) => f.suppress);
      for (const c of Array.from(r.children)) {
        switch (c.localName) {
          case 't': if (!hidden) items.push({ type: 'text', text: c.textContent, props, link: st.link }); break;
          case 'tab': if (!hidden) items.push({ type: 'text', text: '\t', props, link: st.link }); break;
          case 'noBreakHyphen': if (!hidden) items.push({ type: 'text', text: '-', props, link: st.link }); break;
          case 'sym': break;
          case 'br': {
            const t = wattr(c, 'type');
            if (t === 'page') items.push({ type: 'pagebreak' });
            else if (!hidden) items.push({ type: 'br' });
            break;
          }
          case 'cr': if (!hidden) items.push({ type: 'br' }); break;
          case 'fldChar': {
            const t = wattr(c, 'fldCharType');
            if (t === 'begin') st.fields.push({ instr: '', suppress: false });
            else if (t === 'separate') {
              const f = st.fields[st.fields.length - 1];
              if (f) {
                if (/\bNUMPAGES\b/.test(f.instr)) { items.push({ type: 'numpages' }); f.suppress = true; }
                else if (/\bPAGE\b/.test(f.instr)) { items.push({ type: 'pagenum' }); f.suppress = true; }
              }
            } else if (t === 'end') st.fields.pop();
            break;
          }
          case 'instrText': { const f = st.fields[st.fields.length - 1]; if (f) f.instr += c.textContent; break; }
          case 'drawing': case 'pict': case 'object': if (!hidden) findImages(c, items, st); break;
          case 'AlternateContent': { const ch = kid(c, 'Choice'); if (ch) for (const d of Array.from(ch.children)) if (d.localName === 'drawing') findImages(d, items, st); break; }
        }
      }
    }

    function findImages(el, items, st) {
      const blips = el.getElementsByTagNameNS(A, 'blip');
      for (const b of Array.from(blips)) {
        const rid = b.getAttributeNS(R, 'embed') || b.getAttributeNS(R, 'link');
        const src = images[baseDir + '|' + rid];
        if (!src) continue;
        const ext = images[baseDir + '|' + rid + '|ext'];
        if (!/^(png|jpe?g|gif|bmp|svg|webp)$/.test(ext)) { items.push({ type: 'text', text: '[Bild]', props: {}, link: null }); continue; }
        let w = 0, h = 0;
        const ext2 = Array.from(el.getElementsByTagName('*')).find((e) => e.localName === 'extent');
        if (ext2) { w = Math.round(parseInt(ext2.getAttribute('cx'), 10) / 9525); h = Math.round(parseInt(ext2.getAttribute('cy'), 10) / 9525); }
        items.push({ type: 'img', src, w, h, link: st.link });
      }
      for (const im of Array.from(el.getElementsByTagName('*')).filter((e) => e.localName === 'imagedata')) {
        const rid = im.getAttributeNS(R, 'id');
        const src = images[baseDir + '|' + rid];
        if (src) items.push({ type: 'img', src, w: 0, h: 0, link: st.link });
      }
    }

    function buildInline(pEl, pStyleR) {
      const items = [];
      walkRuns(pEl, { fields: [], link: null, pR: pStyleR }, items);
      // aufeinanderfolgende gleichartige Text-Runs zusammenfassen
      const merged = [];
      for (const it of items) {
        const last = merged[merged.length - 1];
        if (it.type === 'text' && last && last.type === 'text' && last.link === it.link && runKey(last.props) === runKey(it.props)) last.text += it.text;
        else merged.push(Object.assign({}, it));
      }
      return merged;
    }

    function makeLink(href, inner) {
      if (!href) return inner;
      const a = document.createElement('a');
      a.setAttribute('href', href);
      if (href[0] !== '#') a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.appendChild(inner);
      return a;
    }

    function fillInline(target, items, paraCtx) {
      // gibt true zurück, wenn eine Seitenumbruch-Position erreicht wurde (Teilung nötig)
      for (const it of items) {
        let node = null;
        if (it.type === 'text') {
          const t = it.text.replace(/­/g, '');
          if (!t) continue;
          node = makeLink(it.link, renderText(t, it.props));
          if (it.link) {
            // Hyperlinks erhalten ihre eigene Optik aus CSS; Farbe/Unterstreichung des Word-Stils entfernen
            node.querySelectorAll('u').forEach((u) => u.replaceWith(...u.childNodes));
            node.querySelectorAll('span').forEach((s) => { s.style.color = ''; });
          }
        } else if (it.type === 'br') node = document.createElement('br');
        else if (it.type === 'img') {
          const img = document.createElement('img');
          img.src = it.src;
          if (it.w) img.setAttribute('width', it.w);
          if (it.h) img.setAttribute('height', it.h);
          img.style.maxWidth = '100%';
          node = makeLink(it.link, img);
        } else if (it.type === 'pagenum' || it.type === 'numpages') {
          node = document.createElement('span');
          node.className = it.type;
          node.setAttribute('contenteditable', 'false');
          node.textContent = it.type === 'pagenum' ? '1' : '1';
        }
        if (node) target.appendChild(node);
      }
    }

    function applyBlockCss(el, p, isHeadingLike, textual) {
      const css = [];
      const ap = isHeadingLike ? {} : p;
      if (p.jc) {
        const m = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' }[p.jc];
        if (m && m !== 'left') css.push(`text-align:${m}`);
      }
      if (p.ind && !textual) {
        const left = p.ind.left, right = p.ind.right;
        if (left) css.push(`margin-left:${(left / 20).toFixed(1)}pt`);
        if (right) css.push(`margin-right:${(right / 20).toFixed(1)}pt`);
        if (p.ind.firstLine) css.push(`text-indent:${(p.ind.firstLine / 20).toFixed(1)}pt`);
        else if (p.ind.hanging) css.push(`text-indent:-${(p.ind.hanging / 20).toFixed(1)}pt`);
      }
      if (!isHeadingLike && !textual) {
        const sp = ap.spacing || {};
        const before = sp.beforeAuto ? 280 : (sp.before || 0);
        const after = sp.afterAuto ? 280 : (sp.after === undefined ? 0 : sp.after);
        if (before) css.push(`margin-top:${(before / 20).toFixed(1)}pt`);
        if (after !== APP_AFTER) css.push(`margin-bottom:${(after / 20).toFixed(1)}pt`);
        if (sp.line) {
          if (!sp.rule || sp.rule === 'auto') { if (Math.abs(sp.line - APP_LINE) > 3) css.push(`line-height:${(sp.line / 240).toFixed(3)}`); }
          else css.push(`line-height:${(sp.line / 20).toFixed(1)}pt`);
        } else if (!(defP.spacing && defP.spacing.line) ) { css.push('line-height:1'); }
      }
      if (p.shd) css.push(`background-color:${p.shd}`);
      if (css.length) el.setAttribute('style', css.join(';'));
    }

    function pageBreakDiv() {
      const d = document.createElement('div');
      d.className = 'pagebreak';
      d.setAttribute('contenteditable', 'false');
      return d;
    }

    function listKind(numId, ilvl) {
      const n = numbering.nums[numId];
      if (!n) return { tag: 'ul', type: 'disc', start: 1 };
      const lv = (numbering.abs[n.abs] || {})[ilvl] || {};
      const fmt = lv.fmt || 'bullet';
      let start = n.ov && n.ov[ilvl] != null ? n.ov[ilvl] : lv.start || 1;
      const map = { decimal: 'decimal', decimalZero: 'decimal-leading-zero', lowerLetter: 'lower-alpha', upperLetter: 'upper-alpha', lowerRoman: 'lower-roman', upperRoman: 'upper-roman' };
      if (map[fmt]) return { tag: 'ol', type: map[fmt], start };
      return { tag: 'ul', type: ['disc', 'circle', 'square'][ilvl % 3], start: 1 };
    }

    function blocks(parent, out) {
      let listStack = []; // {el, ilvl, numId, tag}
      const closeLists = () => { listStack = []; };

      const handleParagraph = (p) => {
        const direct = parsePPr(kid(p, 'pPr'), themeFonts);
        const styleId = direct.style || (env.defaultParaStyle && env.defaultParaStyle.id);
        const rs = resolveStyle(styleId);
        const eff = merge(defP, rs.p, direct);
        const h = headingLevel(direct.style);
        const special = specialClass(direct.style);
        const isHeadingLike = h > 0 || !!special;
        // Absatzmarken-Eigenschaften (Format des Absatzumbruchs) nicht beachten; Stil-Zeichenformat verwenden
        const items = buildInline(p, rs.r);
        let num = eff.numPr && eff.numPr.numId ? eff.numPr : null;
        if (num && num.numId === 0) num = null;

        if (direct.pageBreakBefore || (rs.p.pageBreakBefore && !direct.hasOwnProperty('pageBreakBefore'))) { closeLists(); out.appendChild(pageBreakDiv()); }

        // Absatz an Seitenumbrüchen aufteilen
        const segments = [[]];
        for (const it of items) { if (it.type === 'pagebreak') segments.push([]); else segments[segments.length - 1].push(it); }

        segments.forEach((seg, si) => {
          if (si > 0) { closeLists(); out.appendChild(pageBreakDiv()); }
          const last = si === segments.length - 1;
          if (segments.length > 1 && seg.length === 0 && (last || si === 0)) return; // leerer Rest vor/nach einem Seitenumbruch
          if (num && si === 0) {
            const ilvl = Math.min(8, num.ilvl || 0);
            const kind = listKind(num.numId, ilvl);
            while (listStack.length && listStack[listStack.length - 1].ilvl > ilvl) listStack.pop();
            let top = listStack[listStack.length - 1];
            if (top && top.ilvl === ilvl && (top.numId !== num.numId || top.tag !== kind.tag)) { listStack.pop(); top = listStack[listStack.length - 1]; }
            if (!top || top.ilvl < ilvl) {
              // Auf Zielebene auffüllen
              let cur = top ? top.ilvl : -1;
              while (cur < ilvl) {
                cur++;
                const k = cur === ilvl ? kind : listKind(num.numId, cur);
                const l = document.createElement(k.tag);
                if (k.tag === 'ol') { if (k.type !== 'decimal') l.style.listStyleType = k.type; if (k.start !== 1) l.setAttribute('start', k.start); }
                else if (k.type !== 'disc' || cur % 3 !== 0) l.style.listStyleType = k.type;
                const host = top ? (top.el.lastElementChild || top.el) : out;
                if (host.tagName === 'LI' || host === out) host.appendChild(l);
                else { const li = document.createElement('li'); li.style.listStyleType = 'none'; li.appendChild(l); host.appendChild(li); }
                top = { el: l, ilvl: cur, numId: num.numId, tag: k.tag };
                listStack.push(top);
              }
            }
            const li = document.createElement('li');
            fillInline(li, seg, {});
            if (!li.firstChild) li.appendChild(document.createElement('br'));
            applyBlockCss(li, eff, false, true);
            top.el.appendChild(li);
            return;
          }
          closeLists();
          const el = document.createElement(h ? 'h' + h : special === 'quote' ? 'blockquote' : 'p');
          if (special === 'title' || special === 'subtitle') el.className = special;
          if (special === 'quote') el.className = 'quote';
          fillInline(el, seg, {});
          if (!el.firstChild) el.appendChild(document.createElement('br'));
          applyBlockCss(el, eff, isHeadingLike, false);
          if (eff.bottomBorder && eff.bottomBorder) { /* Absatzrahmen unten → durch Linie ersetzen */ }
          out.appendChild(el);
        });
      };

      for (const c of Array.from(parent.children)) {
        switch (c.localName) {
          case 'p': handleParagraph(c); break;
          case 'tbl': closeLists(); out.appendChild(table(c)); break;
          case 'sdt': { const sc = kid(c, 'sdtContent'); if (sc) { const sub = document.createElement('div'); blocks(sc, sub); while (sub.firstChild) out.appendChild(sub.firstChild); } break; }
          case 'ins': case 'customXml': case 'sdtContent': case 'moveTo': { const sub = document.createElement('div'); blocks(c, sub); while (sub.firstChild) out.appendChild(sub.firstChild); break; }
          default: break;
        }
      }
    }

    function tableHasBorders(tbl) {
      const check = (b) => {
        if (!b) return false;
        return Array.from(b.children).some((s) => { const v = wattr(s, 'val'); return v && v !== 'nil' && v !== 'none'; });
      };
      const tblPr = kid(tbl, 'tblPr');
      // Rahmen, die nur an einzelnen Zellen definiert sind (z. B. von LibreOffice)
      const firstCells = kids(kid(tbl, 'tr'), 'tc');
      if (firstCells.some((tc) => check(kid(kid(tc, 'tcPr'), 'tcBorders'))) && !(tblPr && kid(tblPr, 'tblBorders'))) return true;
      if (tblPr) {
        const direct = kid(tblPr, 'tblBorders');
        if (direct) return check(direct);
        let sid = wattr(kid(tblPr, 'tblStyle'), 'val');
        const seen = new Set();
        while (sid && styles[sid] && !seen.has(sid)) {
          seen.add(sid);
          if (styles[sid].tblBorders) return check(styles[sid].tblBorders);
          sid = styles[sid].basedOn;
        }
      }
      return false;
    }

    function table(tbl) {
      const t = document.createElement('table');
      const bordered = tableHasBorders(tbl);
      if (!bordered) t.className = 'noborder';
      const grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map((g) => num(wattr(g, 'w')) || 0);
      let totalTw = grid.reduce((a, b) => a + b, 0);
      const tblW = kid(kid(tbl, 'tblPr'), 'tblW');
      const wType = tblW && wattr(tblW, 'type'), wVal = tblW ? num(wattr(tblW, 'w')) : undefined;
      if (totalTw < 1200) totalTw = 0; // Raster ohne sinnvolle Breiten (z. B. automatisch angepasste Tabellen)
      if (wType === 'pct' && wVal) t.style.width = Math.min(100, wVal / 50) + '%';
      else if (wType === 'dxa' && wVal >= 1200) t.style.width = Math.round(wVal / 15) + 'px';
      else if (totalTw) t.style.width = Math.round(totalTw / 15) + 'px';
      if (totalTw) {
        const cg = document.createElement('colgroup');
        grid.forEach((w) => { const col = document.createElement('col'); col.style.width = Math.round(w / 15) + 'px'; cg.appendChild(col); });
        t.appendChild(cg);
      }
      const tb = document.createElement('tbody');
      const open = {}; // Spaltenindex → Startzelle für vMerge
      for (const tr of kids(tbl, 'tr')) {
        const row = document.createElement('tr');
        let col = 0;
        const trPr = kid(tr, 'trPr');
        const gb = trPr && kid(trPr, 'gridBefore');
        if (gb) col += num(wattr(gb, 'val')) || 0;
        for (const tc of kids(tr, 'tc')) {
          const pr = kid(tc, 'tcPr');
          const span = num(wattr(kid(pr, 'gridSpan'), 'val')) || 1;
          const vm = kid(pr, 'vMerge');
          if (vm && wattr(vm, 'val') !== 'restart') {
            const start = open[col];
            if (start) start.rowSpan = (start.rowSpan || 1) + 1;
            col += span;
            continue;
          }
          const cell = document.createElement('td');
          if (span > 1) cell.colSpan = span;
          if (vm) open[col] = cell; else delete open[col];
          const shd = kid(pr, 'shd');
          const fill = shd && wattr(shd, 'fill');
          const css = [];
          if (fill && fill !== 'auto') css.push(`background-color:#${fill}`);
          const va = wattr(kid(pr, 'vAlign'), 'val');
          if (va === 'center') css.push('vertical-align:middle'); else if (va === 'bottom') css.push('vertical-align:bottom');
          let wpx = 0;
          for (let k = col; k < col + span; k++) wpx += grid[k] || 0;
          if (wpx && !totalTw) css.push(`width:${Math.round(wpx / 15)}px`);
          if (css.length) cell.setAttribute('style', css.join(';'));
          blocks(tc, cell);
          if (!cell.firstChild) cell.innerHTML = '<p><br></p>';
          // Word zwingt am Ende einen leeren Absatz – ist eine einzige Zeile nicht nötig
          row.appendChild(cell);
          col += span;
        }
        tb.appendChild(row);
      }
      t.appendChild(tb);
      return t;
    }

    return { blocks };
  }

  global.DocxIO = { exportDocx, importDocx, PAGE_SIZES, safeHref, toHex };
})(window);
