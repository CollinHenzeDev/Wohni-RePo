/* Wohni Writer – DOCX lesen (Teil 2: Bilder, Formen, Textfelder, Gruppen, VML) */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;
  const D = W.docx;
  const { kids, kid, A, deep } = D.xml;
  const NS = D.NS;

  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp' };

  const PRESETS = {
    rect: 'rect', roundRect: 'roundrect', round1Rect: 'roundrect', round2SameRect: 'roundrect', snipRoundRect: 'roundrect', ellipse: 'ellipse', triangle: 'triangle', rtTriangle: 'rtriangle', diamond: 'diamond',
    parallelogram: 'parallelogram', trapezoid: 'trapezoid', pentagon: 'pentagon', hexagon: 'hexagon', octagon: 'octagon', star4: 'star4', star5: 'star5', star6: 'star6', star8: 'star6', star10: 'star6', star12: 'star6',
    rightArrow: 'arrowR', leftArrow: 'arrowL', upArrow: 'arrowU', downArrow: 'arrowD', chevron: 'chevron', homePlate: 'arrowR', mathPlus: 'plus', plus: 'plus', heart: 'heart',
    wedgeRectCallout: 'callout', wedgeRoundRectCallout: 'callout', wedgeEllipseCallout: 'callout', ribbon: 'banner', ribbon2: 'banner', can: 'cylinder', line: 'line', straightConnector1: 'line', bentConnector3: 'line',
    flowChartProcess: 'rect', flowChartAlternateProcess: 'roundrect', flowChartDecision: 'diamond', flowChartTerminator: 'roundrect',
  };

  /* ---------- Bilder laden ---------- */
  async function loadImage(ctx, rid) {
    const rel = ctx.rels[rid];
    if (!rel) return null;
    if (ctx.assets.has(rel.target)) return ctx.assets.get(rel.target);
    const f = ctx.files.get(rel.target);
    if (!f) return null;
    const ext = rel.target.split('.').pop().toLowerCase();
    let res;
    if (MIME[ext]) {
      const blob = new Blob([await f.bytes()], { type: MIME[ext] });
      res = { blob, type: MIME[ext], ext };
    } else {
      // EMF/WMF/TIFF: nicht darstellbar → Platzhalter
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#eee" stroke="#aaa" stroke-dasharray="6 4"/><text x="120" y="76" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#666">Bild (${ext.toUpperCase()})</text><text x="120" y="96" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#888">nicht darstellbar</text></svg>`;
      res = { blob: new Blob([svg], { type: 'image/svg+xml' }), type: 'image/svg+xml', ext: 'svg', placeholder: true };
    }
    ctx.assets.set(rel.target, res);
    return res;
  }

  /** Beschneiden/Ausschnitt in das Bild einrechnen (PNG) */
  async function bake(blob, crop, ellipse) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const sw = img.naturalWidth, sh = img.naturalHeight;
      const c = crop || { l: 0, t: 0, r: 0, b: 0 };
      const sx = sw * c.l, sy = sh * c.t, w = sw * (1 - c.l - c.r), hh = sh * (1 - c.t - c.b);
      if (w < 1 || hh < 1) return blob;
      const cv = document.createElement('canvas');
      cv.width = Math.round(w); cv.height = Math.round(hh);
      const g = cv.getContext('2d');
      if (ellipse) { g.beginPath(); g.ellipse(cv.width / 2, cv.height / 2, cv.width / 2, cv.height / 2, 0, 0, Math.PI * 2); g.clip(); }
      g.drawImage(img, sx, sy, w, hh, 0, 0, cv.width, cv.height);
      return await new Promise((res) => cv.toBlob((b) => res(b || blob), 'image/png'));
    } catch (e) { return blob; } finally { URL.revokeObjectURL(url); }
  }

  const emu = (v) => u.emu2px(+v || 0);
  function readCrop(blipFill) {
    const sr = kid(blipFill, 'srcRect');
    if (!sr) return null;
    const g = (n) => (parseInt(A(sr, n, null) || '0', 10) || 0) / 100000;
    const c = { l: g('l'), t: g('t'), r: g('r'), b: g('b') };
    return (c.l || c.t || c.r || c.b) ? c : null;
  }

  /* ---------- Hauptfunktion für <w:drawing>/<w:pict> ---------- */
  D.drawing = async function (ctx, el, ctxRun) {
    if (ctx.inDrawing > 3) return;
    if (el.localName === 'drawing') {
      for (const box of kids(el)) {
        if (box.localName === 'inline' || box.localName === 'anchor') await handleBox(ctx, box, ctxRun);
      }
    } else await handleVML(ctx, el, ctxRun);
  };

  async function handleBox(ctx, box, ctxRun) {
    const inline = box.localName === 'inline';
    const ext = kid(box, 'extent');
    const w = ext ? emu(A(ext, 'cx', null)) : 100, h = ext ? emu(A(ext, 'cy', null)) : 100;
    const docPr = kid(box, 'docPr');
    const name = docPr && (A(docPr, 'name', null) || ''), alt = docPr && (A(docPr, 'descr', null) || '');
    const hidden = docPr && A(docPr, 'hidden', null) === '1';
    const gd = kid(kid(box, 'graphic'), 'graphicData');
    const uri = gd ? gd.getAttribute('uri') || '' : '';
    const content = gd ? kids(gd)[0] : null;
    if (!content || hidden) return;

    // Position (nur bei Verankerung)
    const info = { w, h, name, alt, relH: 'page', relV: 'page', dx: 0, dy: 0, wrap: 'front', z: 0 };
    if (!inline) {
      info.behind = A(box, 'behindDoc', null) === '1';
      info.z = +A(box, 'relativeHeight', null) || 0;
      const rd = (n) => emu(A(box, n, null));
      info.dist = Math.max(rd('distL'), rd('distR'), rd('distT'), rd('distB'));
      if (kid(box, 'wrapTopAndBottom')) info.wrap = 'topbottom';
      else if (kid(box, 'wrapSquare') || kid(box, 'wrapTight') || kid(box, 'wrapThrough')) info.wrap = 'square';
      else info.wrap = info.behind ? 'behind' : 'front';
      const ph = kid(box, 'positionH'), pv = kid(box, 'positionV');
      if (ph) { info.relH = A(ph, 'relativeFrom', null) || 'page'; const al = kid(ph, 'align'), po = kid(ph, 'posOffset'); if (al) info.alignH = al.textContent.trim(); else if (po) info.offH = emu(po.textContent); }
      if (pv) { info.relV = A(pv, 'relativeFrom', null) || 'page'; const al = kid(pv, 'align'), po = kid(pv, 'posOffset'); if (al) info.alignV = al.textContent.trim(); else if (po) info.offV = emu(po.textContent); }
    }
    const items = [];
    await collect(ctx, content, { x: 0, y: 0, sx: 1, sy: 1 }, w, h, items);
    if (!items.length) return;

    // Inline-Bild → <img> im Text
    if (inline && items.length === 1 && items[0].kind === 'image' && !items[0].rot) {
      const it = items[0];
      let blob = it.blob;
      if (it.crop || it.ellipse) blob = await bake(blob, it.crop, it.ellipse);
      const img = document.createElement('img');
      img.src = W.addAsset(blob, blob.type);
      img.setAttribute('width', Math.round(w)); img.setAttribute('height', Math.round(h));
      img.style.width = w.toFixed(1) + 'px'; img.style.height = h.toFixed(1) + 'px';
      if (alt) img.alt = alt;
      ctxRun.add.node(img);
      return;
    }
    for (const it of items) {
      const f = makeFloat(ctx, it, info, inline);
      ctx.floats.push(f);
      if (ctx.hfMode) resolveNow(ctx, f);
      else if (ctx.pendingHere) ctx.pendingHere.push(f);
    }
  }

  /** Inhalt (pic / wsp / wgp) in Einzelobjekte zerlegen; Koordinaten relativ zum Anker-Rahmen */
  async function collect(ctx, node, xf, bw, bh, out) {
    const ln = node.localName;
    if (ln === 'pic') {
      const bf = kid(node, 'blipFill'), blip = kid(bf, 'blip');
      const rid = blip && A(blip, 'embed', NS.r);
      let img = rid && (await loadImage(ctx, rid));
      if (!img && blip && A(blip, 'link', NS.r)) {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#f3f3f3" stroke="#aaa" stroke-dasharray="6 4"/><text x="120" y="74" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#666">Verknüpftes Bild</text><text x="120" y="94" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#888">in der Datei nicht eingebettet</text></svg>';
        img = { blob: new Blob([svg], { type: 'image/svg+xml' }), type: 'image/svg+xml', ext: 'svg', placeholder: true };
      }
      if (!img) return;
      const spPr = kid(node, 'spPr'), xfrm = kid(spPr, 'xfrm');
      const geom = kid(spPr, 'prstGeom');
      const it = { kind: 'image', blob: img.blob, type: img.type, crop: readCrop(bf), ellipse: geom && A(geom, 'prst', null) === 'ellipse', x: 0, y: 0, w: bw * xf.sx, h: bh * xf.sy };
      if (xfrm) { it.rot = (parseInt(A(xfrm, 'rot', null) || '0', 10) || 0) / 60000; const o = kid(xfrm, 'off'), e = kid(xfrm, 'ext'); if (xf.group && o && e) { it.x = xf.x + (emu(A(o, 'x', null)) - xf.cx) * xf.sx; it.y = xf.y + (emu(A(o, 'y', null)) - xf.cy) * xf.sy; it.w = emu(A(e, 'cx', null)) * xf.sx; it.h = emu(A(e, 'cy', null)) * xf.sy; } if (A(xfrm, 'flipH', null) === '1') it.flipH = true; if (A(xfrm, 'flipV', null) === '1') it.flipV = true; }
      const ln2 = kid(spPr, 'ln'); if (ln2 && !kid(ln2, 'noFill')) { const c = D.drawColor(ctx, kid(ln2, 'solidFill')); if (c) { it.stroke = c.hex; it.strokeW = Math.max(0.5, emu(A(ln2, 'w', null))); } }
      it.alt = '';
      out.push(it);
    } else if (ln === 'wsp') {
      out.push(await parseWsp(ctx, node, xf, bw, bh));
    } else if (ln === 'wgp') {
      const gp = kid(node, 'grpSpPr'), xfrm = kid(gp, 'xfrm');
      let nxf = { x: xf.x, y: xf.y, sx: xf.sx, sy: xf.sy, group: true, cx: 0, cy: 0 };
      if (xfrm) {
        const o = kid(xfrm, 'off'), e = kid(xfrm, 'ext'), co = kid(xfrm, 'chOff'), ce = kid(xfrm, 'chExt');
        const gw = e ? emu(A(e, 'cx', null)) : bw, gh = e ? emu(A(e, 'cy', null)) : bh;
        const cw = ce ? emu(A(ce, 'cx', null)) : gw, chh = ce ? emu(A(ce, 'cy', null)) : gh;
        const gx = o && xf.group ? (emu(A(o, 'x', null)) - xf.cx) * xf.sx + xf.x : xf.x, gy = o && xf.group ? (emu(A(o, 'y', null)) - xf.cy) * xf.sy + xf.y : xf.y;
        nxf = { x: gx, y: gy, sx: (cw ? gw / cw : 1) * (xf.group ? xf.sx : 1), sy: (chh ? gh / chh : 1) * (xf.group ? xf.sy : 1), group: true, cx: co ? emu(A(co, 'x', null)) : 0, cy: co ? emu(A(co, 'y', null)) : 0 };
      }
      for (const c of kids(node)) if (['wsp', 'pic', 'wgp', 'grpSp'].includes(c.localName)) await collect(ctx, c, nxf, bw, bh, out);
    } else if (ln === 'chart' || ln === 'relIds' || ln === 'diagram') {
      out.push({ kind: 'shape', shape: 'rect', x: 0, y: 0, w: bw, h: bh, fill: '#f2f2f2', stroke: '#999999', strokeW: 1, dash: 'dash', text: '<p style="text-align:center">Diagramm / SmartArt wird nicht unterstützt</p>', color: '#666666', valign: 'middle' });
    }
  }

  async function parseWsp(ctx, wsp, xf, bw, bh) {
    const spPr = kid(wsp, 'spPr'), xfrm = kid(spPr, 'xfrm');
    const it = { kind: 'shape', shape: 'rect', x: 0, y: 0, w: bw * (xf.sx || 1), h: bh * (xf.sy || 1) };
    if (xfrm) {
      it.rot = (parseInt(A(xfrm, 'rot', null) || '0', 10) || 0) / 60000;
      const o = kid(xfrm, 'off'), e = kid(xfrm, 'ext');
      if (xf.group && o && e) { it.x = xf.x + (emu(A(o, 'x', null)) - xf.cx) * xf.sx; it.y = xf.y + (emu(A(o, 'y', null)) - xf.cy) * xf.sy; it.w = emu(A(e, 'cx', null)) * xf.sx; it.h = emu(A(e, 'cy', null)) * xf.sy; }
      else if (e) { it.w = emu(A(e, 'cx', null)) * (xf.sx || 1); it.h = emu(A(e, 'cy', null)) * (xf.sy || 1); }
      if (A(xfrm, 'flipH', null) === '1') it.flipH = true; if (A(xfrm, 'flipV', null) === '1') it.flipV = true;
    }
    const geom = kid(spPr, 'prstGeom');
    const prst = geom ? A(geom, 'prst', null) : 'rect';
    it.shape = PRESETS[prst] || 'rect';
    if (it.shape === 'line' && it.h > 6 && it.w > 6) it.shape = 'lineDiag';
    const isLine = it.shape === 'line' || it.shape === 'lineDiag';
    // Füllung
    const style = kid(wsp, 'style');
    let fill = undefined;
    const sf = kid(spPr, 'solidFill');
    if (sf) { const c = D.drawColor(ctx, sf); fill = c ? c.hex : null; if (c && c.alpha < 1) it.fillAlpha = c.alpha; }
    else if (kid(spPr, 'noFill')) fill = null;
    else if (kid(spPr, 'gradFill')) { const gs = deep(kid(spPr, 'gradFill'), 'gs')[0]; const c = gs && D.drawColor(ctx, gs); fill = c ? c.hex : null; }
    else if (kid(spPr, 'blipFill')) { fill = null; }
    else if (style) { const fr = kid(style, 'fillRef'); if (fr && A(fr, 'idx', null) !== '0') { const c = D.drawColor(ctx, fr); fill = c ? c.hex : null; } else fill = null; }
    else fill = null;
    it.fill = isLine ? null : fill;
    // Kontur
    const ln = kid(spPr, 'ln');
    let stroke = null, sw = 0;
    if (ln) {
      if (kid(ln, 'noFill')) stroke = null;
      else {
        const c = D.drawColor(ctx, kid(ln, 'solidFill'));
        stroke = c ? c.hex : null; sw = emu(A(ln, 'w', null)) || 1;
        if (!c && style) { const lr = kid(style, 'lnRef'); if (lr && A(lr, 'idx', null) !== '0') { const lc = D.drawColor(ctx, lr); stroke = lc ? lc.hex : null; sw = sw || 1.3; } }
        const pd = kid(ln, 'prstDash'); if (pd) { const dv = A(pd, 'val', null); it.dash = /dot|sysDot/i.test(dv) ? 'dot' : /dashDot/.test(dv) ? 'dashdot' : /dash/i.test(dv) ? 'dash' : ''; }
      }
    } else if (style) { const lr = kid(style, 'lnRef'); if (lr && A(lr, 'idx', null) !== '0') { const lc = D.drawColor(ctx, lr); stroke = lc ? lc.hex : null; sw = 1.3; } }
    it.stroke = stroke; it.strokeW = sw;
    if (isLine && !stroke) { it.stroke = '#000000'; it.strokeW = it.strokeW || 1; }
    // Schrift aus Stil
    if (style) { const fr = kid(style, 'fontRef'); if (fr) { const c = D.drawColor(ctx, fr); if (c) it.color = c.hex; } }
    // Text
    const tx = kid(wsp, 'txbx'), tc = tx && kid(tx, 'txbxContent');
    if (tc && !ctx.noNestedText) {
      const holder = document.createElement('div');
      const save = ctx.pctx, savePH = ctx.pendingHere, saveHF = ctx.hfMode;
      ctx.pctx = 'tb'; ctx.noNestedText = true; ctx.pendingHere = [];
      ctx.inDrawing = (ctx.inDrawing || 0) + 1;
      for (const c of kids(tc)) await D.convertBlockLevel(ctx, c, holder);
      ctx.inDrawing--; ctx.noNestedText = false; ctx.pctx = save; ctx.pendingHere = savePH;
      D.cleanup(holder);
      if (holder.textContent.trim() || holder.querySelector('img,table')) { it.text = holder.innerHTML; it.kind = 'textbox'; }
    }
    const bp = kid(wsp, 'bodyPr');
    if (bp) { const an = A(bp, 'anchor', null); it.valign = an === 'ctr' ? 'middle' : an === 'b' ? 'bottom' : 'top'; it.insets = ['lIns', 'tIns', 'rIns', 'bIns'].map((n) => (A(bp, n, null) != null ? emu(A(bp, n, null)) : [9.6, 4.8, 9.6, 4.8][['lIns', 'tIns', 'rIns', 'bIns'].indexOf(n)])); }
    return it;
  }

  /* ---------- Float bauen ---------- */
  function makeFloat(ctx, it, info, inline) {
    const f = W.floats.create(it.kind === 'image' ? 'image' : it.kind === 'textbox' ? 'textbox' : 'shape', {
      w: Math.max(2, it.w), h: Math.max(inline ? 2 : 0, it.h), wrap: info.wrap || 'front', rot: it.rot || 0, name: it.name || info.name || '', alt: it.alt || info.alt || '',
    });
    if (it.kind === 'image') {
      f.lock = true;
      f.ratio = it.w / (it.h || 1);
      f._blob = it.blob; f._crop = it.crop; f._ellipse = it.ellipse;
      f.src = null;
      if (it.stroke) { f.stroke = it.stroke; f.strokeW = it.strokeW; }
    } else {
      f.shape = it.shape; f.fill = it.fill; f.fillAlpha = it.fillAlpha; f.stroke = it.stroke; f.strokeW = it.strokeW || 0; f.dash = it.dash || '';
      if (it.text) f.text = it.text;
      if (it.color) f.color = it.color; if (it.valign) f.valign = it.valign;
      if (f.kind === 'textbox' && !f.stroke) f.strokeW = 0;
    }
    if (it.flipH) f.flipH = true; if (it.flipV) f.flipV = true;
    f.z = info.z;
    f.wrapDist = info.dist != null ? info.dist : 9;
    f.pending = { relH: info.relH, relV: info.relV, offH: info.offH, offV: info.offV, alignH: info.alignH, alignV: info.alignV, dx: it.x || 0, dy: it.y || 0, aw: info.w, ah: info.h, inline };
    return f;
  }

  /** Objekte aus Kopf-/Fußzeile: auf jeder Seite wiederholen, Position direkt auflösen */
  function resolveNow(ctx, f) {
    f.repeat = true;
    const p = f.pending; delete f.pending;
    const G = W.geom(ctx.doc);
    const g = pageBox(ctx.doc, p, f);
    f.x = g.x; f.y = g.y; f.page = 0;
  }
  /** Seitenposition aus Verankerungsangaben (ohne Absatzbezug) */
  function pageBox(doc, p, f) {
    const pg = doc.page;
    const ml = pg.l, mt = pg.t, cw = pg.w - pg.l - pg.r, ch = pg.h - pg.t - pg.b;
    let bx = 0, bw = pg.w;
    switch (p.relH) {
      case 'margin': case 'column': case 'character': bx = ml; bw = cw; break;
      case 'leftMargin': case 'insideMargin': bx = 0; bw = ml; break;
      case 'rightMargin': case 'outsideMargin': bx = pg.w - pg.r; bw = pg.r; break;
      default: bx = 0; bw = pg.w;
    }
    let by = 0, bh = pg.h;
    switch (p.relV) {
      case 'margin': by = mt; bh = ch; break;
      case 'topMargin': by = 0; bh = mt; break;
      case 'bottomMargin': by = pg.h - pg.b; bh = pg.b; break;
      default: by = 0; bh = pg.h;
    }
    const aw = p.aw, ah = p.ah;
    let x = bx + (p.offH || 0), y = by + (p.offV || 0);
    if (p.alignH === 'center') x = bx + (bw - aw) / 2; else if (p.alignH === 'right' || p.alignH === 'outside') x = bx + bw - aw; else if (p.alignH === 'left' || p.alignH === 'inside') x = bx;
    if (p.alignV === 'center') y = by + (bh - ah) / 2; else if (p.alignV === 'bottom' || p.alignV === 'outside') y = by + bh - ah; else if (p.alignV === 'top' || p.alignV === 'inside') y = by;
    return { x: x + p.dx, y: y + p.dy, relP: p.relV === 'paragraph' || p.relV === 'line' };
  }
  D.pageBox = pageBox;

  /* ---------- VML ---------- */
  function parseStyle(str) {
    const o = {};
    (str || '').split(';').forEach((kv) => { const i = kv.indexOf(':'); if (i > 0) o[kv.slice(0, i).trim().toLowerCase()] = kv.slice(i + 1).trim(); });
    return o;
  }
  function vlen(v) {
    if (v == null) return 0;
    const m = /^(-?[\d.]+)\s*(pt|in|cm|mm|px|%)?/.exec(String(v).trim());
    if (!m) return 0;
    const n = parseFloat(m[1]);
    return { pt: u.pt2px(n), in: n * 96, cm: u.cm2px(n), mm: u.mm2px(n), px: n }[m[2] || 'px'] ?? n;
  }
  async function handleVML(ctx, el, ctxRun) {
    const shapes = deep(el, 'shape').concat(deep(el, 'rect'), deep(el, 'oval'), deep(el, 'roundrect'), deep(el, 'line'));
    for (const sh of shapes) {
      const st = parseStyle(sh.getAttribute('style'));
      const id = sh.getAttribute('id') || '';
      // Wasserzeichen (WordArt)
      const tp = kid(sh, 'textpath');
      if (tp && /watermark/i.test(id + (sh.getAttribute('o:spid') || ''))) {
        const col = sh.getAttribute('fillcolor') || '#c0c0c0';
        ctx.doc.watermark = { text: tp.getAttribute('string') || 'ENTWURF', color: W.color.hex(col.replace(/\s.*$/, '')) || '#c0c0c0', size: Math.min(160, Math.max(48, vlen(st.height) * 0.9 || 110)), opacity: 0.45 };
        continue;
      }
      const w = vlen(st.width), h = vlen(st.height);
      if (!w && !h) continue;
      const idata = kid(sh, 'imagedata');
      const info = { w, h, relH: (st['mso-position-horizontal-relative'] || 'page'), relV: (st['mso-position-vertical-relative'] || 'page'), offH: vlen(st['margin-left']), offV: vlen(st['margin-top']), dx: 0, dy: 0, wrap: /behind/i.test(st['z-index'] || '') || (parseInt(st['z-index'], 10) < 0) ? 'behind' : 'front', z: parseInt(st['z-index'], 10) || 0, name: sh.getAttribute('o:title') || '', alt: sh.getAttribute('alt') || '' };
      if (/^left|center|right$/.test(st['mso-position-horizontal'] || '')) info.alignH = st['mso-position-horizontal'];
      if (st.position !== 'absolute' && !ctx.hfMode) {
        // Inline-VML-Bild
        if (idata) { const rid = A(idata, 'id', NS.r); const img = rid && (await loadImage(ctx, rid)); if (img) { const im = document.createElement('img'); im.src = W.addAsset(img.blob, img.type); im.width = Math.round(w); im.height = Math.round(h); im.style.width = w + 'px'; im.style.height = h + 'px'; ctxRun.add.node(im); } }
        continue;
      }
      let it;
      if (idata) {
        const rid = A(idata, 'id', NS.r); const img = rid && (await loadImage(ctx, rid)); if (!img) continue;
        it = { kind: 'image', blob: img.blob, w, h, x: 0, y: 0 };
      } else {
        const fillc = sh.getAttribute('fillcolor'); const strokec = sh.getAttribute('strokecolor');
        const filled = sh.getAttribute('filled') !== 'f' && sh.getAttribute('filled') !== 'false';
        const stroked = sh.getAttribute('stroked') !== 'f' && sh.getAttribute('stroked') !== 'false';
        it = { kind: 'shape', shape: sh.localName === 'oval' ? 'ellipse' : sh.localName === 'roundrect' ? 'roundrect' : 'rect', w, h, x: 0, y: 0, fill: filled ? (W.color.hex((fillc || '#ffffff').split(' ')[0]) || '#ffffff') : null, stroke: stroked ? (W.color.hex((strokec || '#000000').split(' ')[0]) || '#000000') : null, strokeW: stroked ? (vlen(sh.getAttribute('strokeweight')) || 1) : 0 };
        const tb = kid(sh, 'textbox'), tc = tb && kid(tb, 'txbxContent');
        if (tc) {
          const holder = document.createElement('div');
          const save = ctx.pctx; ctx.pctx = 'tb'; const sp = ctx.pendingHere; ctx.pendingHere = []; ctx.inDrawing = (ctx.inDrawing || 0) + 1;
          for (const c of kids(tc)) await D.convertBlockLevel(ctx, c, holder);
          ctx.inDrawing--; ctx.pctx = save; ctx.pendingHere = sp;
          D.cleanup(holder);
          if (holder.textContent.trim()) { it.text = holder.innerHTML; it.kind = 'textbox'; }
        }
      }
      const f = makeFloat(ctx, it, info, false);
      ctx.floats.push(f);
      if (ctx.hfMode) resolveNow(ctx, f); else if (ctx.pendingHere) ctx.pendingHere.push(f);
    }
  }

  /* ---------- Nacharbeit nach dem Laden ---------- */
  /** Bilddaten der Floats in Asset-URLs umwandeln (async wegen Beschnitt) */
  D.finalizeFloats = async function (floats) {
    floats.sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const f of floats) {
      if (f.kind === 'image' && f._blob) {
        let blob = f._blob;
        if (f._crop || (f._ellipse && false)) blob = await bake(blob, f._crop, false);
        f.src = W.addAsset(blob, blob.type);
        if (f._ellipse) f.radius = '50%';
        delete f._blob; delete f._crop; delete f._ellipse;
      }
      delete f.z;
    }
    return floats;
  };
})();
