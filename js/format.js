/* Wohni Writer – Formatierung, Absatz-/Formatvorlagen, Zwischenablage, Einfügen */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;

  const F = (W.fmt = { last: null, painter: null });
  W.cmd = W.cmd || {};

  /* ------------------------------------------------------------------ */
  /*  Fokus / letzte Auswahl                                              */
  /* ------------------------------------------------------------------ */
  document.addEventListener('selectionchange', () => {
    const root = W.sel.activeRoot();
    if (!root) return;
    const s = getSelection();
    F.last = { root, range: s.getRangeAt(0).cloneRange(), pos: root === W.el.flow ? W.sel.save(root) : null };
    W.emit('selection');
  });

  /** Fokus zurück in den zuletzt aktiven Editor (nach Dialog/Menü) */
  F.refocus = function () {
    const l = F.last;
    if (!l || !l.root.isConnected) { W.el.flow.focus({ preventScroll: true }); return; }
    l.root.focus({ preventScroll: true });
    if (l.pos && l.root === W.el.flow) W.sel.restore(l.pos, l.root);
    else { const s = getSelection(); s.removeAllRanges(); try { s.addRange(l.range); } catch (e) { /* */ } }
  };
  const root = () => W.sel.activeRoot() || (F.refocus(), W.sel.activeRoot()) || W.el.flow;

  function css(on) { try { document.execCommand('styleWithCSS', false, on !== false); } catch (e) { /* */ } }

  function after(opts) {
    // Inline-Änderung abschließen: Layout + Historie
    const r = W.sel.activeRoot();
    if (r && r !== W.el.flow) W.emit('sync');
    W.layout.schedule(true);
    W.history.push();
    W.emit('edited');
    F.refreshState();
  }

  /* ------------------------------------------------------------------ */
  /*  Inline-Formatierung                                                 */
  /* ------------------------------------------------------------------ */
  const textNodesIn = (range, rootEl) => {
    const out = [];
    const w = document.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let n = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer : w.nextNode();
    for (; n; n = w.nextNode()) {
      if (!n.nodeValue.length) continue;
      if (!range.intersectsNode(n)) continue;
      if (n === range.startContainer && range.startOffset >= n.nodeValue.length) continue;
      if (n === range.endContainer && range.endOffset <= 0) continue;
      if (n.parentElement && n.parentElement.closest('.fld')) continue;
      if (n.parentElement && n.parentElement.closest('table') && false) continue;
      out.push(n);
      if (range.commonAncestorContainer.nodeType === 3) break;
    }
    return out;
  };

  /** Stil auf alle Textstücke der Auswahl anwenden (fn bekommt das umhüllende Span) */
  F.applyInline = function (fn) {
    const rootEl = root();
    const s = getSelection();
    if (!s.rangeCount) return false;
    const r0 = s.getRangeAt(0);
    if (r0.collapsed) {
      const span = document.createElement('span');
      span.textContent = W.ZWSP;
      fn(span);
      r0.insertNode(span);
      const t = span.firstChild;
      const nr = document.createRange(); nr.setStart(t, 1); nr.collapse(true);
      s.removeAllRanges(); s.addRange(nr);
      return true;
    }
    const range = r0.cloneRange();
    // Grenzen an Textknoten teilen
    if (range.endContainer.nodeType === 3 && range.endOffset > 0 && range.endOffset < range.endContainer.nodeValue.length) {
      range.endContainer.splitText(range.endOffset);
    }
    if (range.startContainer.nodeType === 3 && range.startOffset > 0 && range.startOffset < range.startContainer.nodeValue.length) {
      const nt = range.startContainer.splitText(range.startOffset);
      if (range.endContainer === range.startContainer) range.setEnd(nt, range.endOffset - range.startOffset);
      range.setStart(nt, 0);
    }
    const nodes = textNodesIn(range, rootEl);
    if (!nodes.length) return false;
    const spans = nodes.map((t) => {
      const p = t.parentNode;
      if (p.nodeType === 1 && p.tagName === 'SPAN' && p.childNodes.length === 1 && !p.className) { fn(p); return p; }
      const sp = document.createElement('span');
      p.insertBefore(sp, t); sp.appendChild(t);
      fn(sp); return sp;
    });
    const nr = document.createRange();
    nr.setStartBefore(spans[0]); nr.setEndAfter(spans[spans.length - 1]);
    s.removeAllRanges(); s.addRange(nr);
    mergeSpans(rootEl);
    return true;
  };

  /** Benachbarte Spans mit identischem Style zusammenführen, leere entfernen */
  function mergeSpans(rootEl) {
    rootEl.querySelectorAll('span').forEach((sp) => {
      if (!sp.isConnected) return;
      if (!sp.firstChild) { sp.remove(); return; }
      if (!sp.getAttribute('style') && !sp.className && !sp.attributes.length) { return; }
    });
    // einfache Zusammenführung innerhalb eines Elternknotens
    rootEl.querySelectorAll('p,h1,h2,h3,h4,h5,h6,td,th,a,li,div').forEach((p) => {
      let n = p.firstChild;
      while (n) {
        const nx = n.nextSibling;
        if (nx && n.nodeType === 1 && nx.nodeType === 1 && n.tagName === 'SPAN' && nx.tagName === 'SPAN' &&
            n.getAttribute('style') === nx.getAttribute('style') && n.className === nx.className && n.getAttribute('style')) {
          while (nx.firstChild) n.appendChild(nx.firstChild);
          nx.remove();
          continue;
        }
        n = nx;
      }
    });
  }

  F.toggleCmd = function (cmd) {
    root(); css(true);
    document.execCommand(cmd);
    after();
  };

  F.setFontFamily = function (name) {
    F.applyInline((el) => { el.style.fontFamily = W.fontStack(name); });
    after();
  };
  F.setFontSize = function (pt) {
    pt = Math.max(1, Math.min(1638, parseFloat(pt)));
    if (!pt) return;
    F.applyInline((el) => { el.style.fontSize = pt + 'pt'; });
    // verschachtelte, widersprüchliche Größen innerhalb entfernen
    getSelection().rangeCount && getSelection().getRangeAt(0).commonAncestorContainer;
    after();
  };
  const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96, 120];
  F.stepFontSize = function (dir) {
    const cur = F.state().size || 11;
    let next;
    if (dir > 0) next = SIZES.find((s) => s > cur + 0.01) || cur + 10;
    else next = [...SIZES].reverse().find((s) => s < cur - 0.01) || Math.max(1, cur - 1);
    F.setFontSize(next);
  };
  F.setColor = function (c) {
    css(true);
    F.applyInline((el) => { if (c) el.style.color = c; else el.style.removeProperty('color'); });
    after();
  };
  F.setHighlight = function (c) {
    F.applyInline((el) => { if (c) el.style.backgroundColor = c; else el.style.removeProperty('background-color'); });
    after();
  };
  F.setInlineStyle = function (props) {
    F.applyInline((el) => { for (const k in props) { if (props[k] == null || props[k] === '') el.style.removeProperty(k); else el.style.setProperty(k, props[k]); } });
    after();
  };

  F.clearFormatting = function () {
    W.edit(() => {
      const r = root();
      css(true);
      document.execCommand('removeFormat');
      const range = W.sel.range(r);
      if (range) {
        r.querySelectorAll('span,font').forEach((sp) => {
          if (!range.intersectsNode(sp)) return;
          sp.removeAttribute('style'); sp.removeAttribute('face'); sp.removeAttribute('size'); sp.removeAttribute('color');
          const parent = sp.parentNode;
          while (sp.firstChild) parent.insertBefore(sp.firstChild, sp);
          sp.remove();
        });
        W.sel.blocks(r, range).forEach((b) => resetBlock(b));
        r.querySelectorAll('a').forEach((a) => { if (range.intersectsNode(a) && !a.getAttribute('href')) a.replaceWith(...a.childNodes); });
      }
    });
  };
  function resetBlock(b) {
    const keep = b.hasAttribute('data-list');
    ['class', 'style', 'align'].forEach((a) => b.removeAttribute(a));
    if (keep) { b.style.setProperty('--lvl', b.getAttribute('data-lvl') || '0'); }
    if (/^H[1-6]$/.test(b.tagName)) b = retag(b, 'p');
    return b;
  }

  F.changeCase = function (mode) {
    const r = root();
    const range = W.sel.range(r);
    if (!range || range.collapsed) return;
    const pos = r === W.el.flow ? W.sel.save(r) : null;
    const nodes = textNodesIn(range, r);
    const conv = (t, atStart) => {
      switch (mode) {
        case 'upper': return t.toUpperCase();
        case 'lower': return t.toLowerCase();
        case 'title': return t.toLowerCase().replace(/(^|[\s\-–(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
        case 'sentence': return t.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
        case 'toggle': return Array.from(t).map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');
        default: return t;
      }
    };
    nodes.forEach((n) => {
      const a = n === range.startContainer ? range.startOffset : 0;
      const b = n === range.endContainer ? range.endOffset : n.nodeValue.length;
      const seg = n.nodeValue.slice(a, b);
      const mid = mode === 'sentence' && a > 0 ? seg : conv(seg, a === 0);
      n.nodeValue = n.nodeValue.slice(0, a) + mid + n.nodeValue.slice(b);
    });
    if (pos) W.sel.restore(pos, r);
    after();
  };

  /** Zustand an der Auswahl (für Ribbon-Anzeige) */
  F.state = function () {
    const s = getSelection();
    const st = { bold: false, italic: false, underline: false, strike: false, sub: false, sup: false, font: '', size: 0, color: '#000000', highlight: '', align: 'left', list: null, style: 'normal', link: false };
    const r = W.sel.activeRoot();
    if (!r || !s.rangeCount) return st;
    try {
      st.bold = document.queryCommandState('bold');
      st.italic = document.queryCommandState('italic');
      st.underline = document.queryCommandState('underline');
      st.strike = document.queryCommandState('strikeThrough');
      st.sub = document.queryCommandState('subscript');
      st.sup = document.queryCommandState('superscript');
    } catch (e) { /* */ }
    let n = s.focusNode;
    if (s.isCollapsed === false) {
      // Anfang der Auswahl ist maßgeblich
      n = s.getRangeAt(0).startContainer;
      const rg = s.getRangeAt(0);
      if (n.nodeType === 3 && rg.startOffset >= n.nodeValue.length && n.nextSibling) n = n.nextSibling;
    }
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    if (el) {
      const cs = getComputedStyle(el);
      st.font = (cs.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      st.size = Math.round(u.px2pt(parseFloat(cs.fontSize)) * 2) / 2;
      st.color = W.color.hex(cs.color) || '#000000';
      // Hervorhebung: erste Hintergrundfarbe in Vorfahren
      for (let e = el; e && e !== r; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { st.highlight = W.color.hex(bg); break; }
        if (/^(P|H[1-6]|TD|TH)$/.test(e.tagName)) break;
      }
      st.link = !!el.closest('a');
      const blk = el.closest('p,h1,h2,h3,h4,h5,h6');
      if (blk) {
        const ta = getComputedStyle(blk).textAlign;
        st.align = ta === 'start' ? 'left' : ta === 'end' ? 'right' : ta;
        st.list = blk.getAttribute('data-list') || null;
        st.style = F.styleOf(blk);
        st.block = blk;
      }
    }
    return st;
  };
  F.refreshState = (function () {
    let raf = 0;
    return function () {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; W.emit('state', F.state()); });
    };
  })();
  W.on('selection', () => F.refreshState());

  /* ------------------------------------------------------------------ */
  /*  Absatzformatierung                                                  */
  /* ------------------------------------------------------------------ */
  function retag(b, tag) {
    if (b.tagName.toLowerCase() === tag) return b;
    const n = document.createElement(tag);
    Array.from(b.attributes).forEach((a) => n.setAttribute(a.name, a.value));
    while (b.firstChild) n.appendChild(b.firstChild);
    b.replaceWith(n);
    return n;
  }
  F.retag = retag;

  F.STYLES = [
    { id: 'normal', label: 'Standard', tag: 'p', cls: '' },
    { id: 'nospace', label: 'Kein Leerraum', tag: 'p', cls: 's-nospace' },
    { id: 'h1', label: 'Überschrift 1', tag: 'h1', cls: '' },
    { id: 'h2', label: 'Überschrift 2', tag: 'h2', cls: '' },
    { id: 'h3', label: 'Überschrift 3', tag: 'h3', cls: '' },
    { id: 'title', label: 'Titel', tag: 'p', cls: 's-title' },
    { id: 'subtitle', label: 'Untertitel', tag: 'p', cls: 's-subtitle' },
    { id: 'quote', label: 'Zitat', tag: 'p', cls: 's-quote' },
    { id: 'iquote', label: 'Intensives Zitat', tag: 'p', cls: 's-iquote' },
    { id: 'caption', label: 'Beschriftung', tag: 'p', cls: 's-caption' },
    { id: 'code', label: 'Code', tag: 'p', cls: 's-code' },
  ];
  F.styleOf = function (b) {
    const t = b.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return t;
    const c = Array.from(b.classList).find((x) => x.startsWith('s-'));
    const st = c && F.STYLES.find((s) => s.cls === c);
    return st ? st.id : 'normal';
  };

  F.applyStyle = function (id) {
    const st = F.STYLES.find((s) => s.id === id);
    if (!st) return;
    W.edit(() => {
      const r = root();
      const range = W.sel.range(r);
      const pos = r === W.el.flow ? W.sel.save(r) : null;
      W.sel.blocks(r, range).forEach((b) => {
        // Zeichenformatierung, die die Vorlage überschreiben würde, entfernen
        b.querySelectorAll('[style]').forEach((e) => {
          ['font-size', 'font-family', 'color', 'font-weight', 'font-style'].forEach((p) => e.style.removeProperty(p));
          if (!e.getAttribute('style')) { e.removeAttribute('style'); if (e.tagName === 'SPAN' && !e.attributes.length) e.replaceWith(...e.childNodes); }
        });
        Array.from(b.classList).filter((c) => c.startsWith('s-')).forEach((c) => b.classList.remove(c));
        if (!b.getAttribute('class')) b.removeAttribute('class');
        const nb = retag(b, st.tag);
        if (st.cls) nb.classList.add(st.cls);
        // Absatzabstände der Vorlage nicht durch alte direkte Formatierung überdecken
        ['margin-top', 'margin-bottom', '--ls', 'line-height'].forEach((p) => nb.style.removeProperty(p));
        if (!nb.getAttribute('style')) nb.removeAttribute('style');
      });
      if (pos) W.sel.restore(pos, r);
    });
  };

  /** Blockeigenschaft auf alle betroffenen Absätze anwenden */
  F.eachBlock = function (fn, opts) {
    return W.edit(() => {
      const r = root();
      const blocks = W.sel.blocks(r);
      if (!blocks.length) return false;
      blocks.forEach(fn);
    });
  };
  F.setAlign = (a) => F.eachBlock((b) => { b.style.textAlign = a; });
  F.setBlockStyle = (props) => F.eachBlock((b) => {
    for (const k in props) { if (props[k] == null || props[k] === '') b.style.removeProperty(k); else b.style.setProperty(k, props[k]); }
    if (!b.getAttribute('style')) b.removeAttribute('style');
  });
  F.setLineSpacing = function (v) {
    // v: Vielfaches (z. B. 1.15) oder {exact: pt}
    F.eachBlock((b) => {
      if (typeof v === 'object') { b.style.setProperty('line-height', v.exact + 'pt'); b.style.removeProperty('--ls'); }
      else { b.style.removeProperty('line-height'); b.style.setProperty('--ls', String(v)); }
    });
  };
  F.setSpacing = function (before, after) {
    F.eachBlock((b) => {
      if (before != null) b.style.marginTop = before + 'pt';
      if (after != null) b.style.marginBottom = after + 'pt';
    });
  };
  F.indent = function (dir) {
    const blocks = W.sel.blocks(root());
    if (blocks.length && blocks.every((b) => b.hasAttribute('data-list'))) { W.lists.shift(dir); return; }
    F.eachBlock((b) => {
      const cur = parseFloat(getComputedStyle(b).marginLeft) || 0;
      const nv = Math.max(0, Math.round((cur + dir * u.cm2px(1.27)) * 10) / 10);
      b.style.marginLeft = nv + 'px';
    });
  };
  F.setShading = (c) => F.eachBlock((b) => { if (c) b.style.backgroundColor = c; else b.style.removeProperty('background-color'); });
  F.setBorders = function (kind, color, width) {
    color = color || '#000000'; width = width || 1;
    F.eachBlock((b) => {
      const props = ['border-top', 'border-right', 'border-bottom', 'border-left'];
      props.forEach((p) => b.style.removeProperty(p));
      b.style.removeProperty('padding');
      const bd = `${width}px solid ${color}`;
      const set = { bottom: ['border-bottom'], top: ['border-top'], left: ['border-left'], right: ['border-right'], all: props, outside: props, none: [] }[kind] || [];
      set.forEach((p) => b.style.setProperty(p, bd));
      if (set.length === 4) b.style.padding = '2px 4px';
      if (!b.getAttribute('style')) b.removeAttribute('style');
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Zwischenablage                                                      */
  /* ------------------------------------------------------------------ */
  const OK_STYLE = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align', 'margin-left', 'margin-top', 'margin-bottom', 'text-indent', 'line-height', 'vertical-align', 'letter-spacing', 'font-variant', 'text-transform', 'width', 'height', 'border', 'border-top', 'border-bottom', 'border-left', 'border-right', 'padding']);
  const OK_TAG = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP', 'A', 'BR', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'COLGROUP', 'COL', 'UL', 'OL', 'LI', 'MARK']);

  F.sanitize = function (html, opts) {
    opts = opts || {};
    const tpl = document.createElement('template');
    html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '').replace(/<!--StartFragment-->|<!--EndFragment-->/g, '');
    tpl.innerHTML = html;
    const frag = tpl.content;
    frag.querySelectorAll('style,script,meta,link,title,head,o\\:p,xml,iframe,object,embed,form,input,button,svg').forEach((e) => e.remove());
    const clean = (node) => {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 8) { c.remove(); return; }
        if (c.nodeType !== 1) return;
        clean(c);
        const tag = c.tagName;
        if (tag === 'FONT') {
          const sp = document.createElement('span');
          if (c.getAttribute('color')) sp.style.color = c.getAttribute('color');
          if (c.getAttribute('face')) sp.style.fontFamily = c.getAttribute('face');
          while (c.firstChild) sp.appendChild(c.firstChild);
          c.replaceWith(sp); return;
        }
        if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'PRE' || tag === 'BLOCKQUOTE' || tag === 'FIGURE' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'MAIN' || tag === 'CENTER') {
          const hasBlock = c.querySelector('p,h1,h2,h3,h4,h5,h6,table,ul,ol,div');
          if (hasBlock) { c.replaceWith(...c.childNodes); return; }
          const p = document.createElement('p');
          if (c.style.textAlign) p.style.textAlign = c.style.textAlign;
          if (tag === 'CENTER') p.style.textAlign = 'center';
          if (tag === 'PRE') p.className = 's-code';
          while (c.firstChild) p.appendChild(c.firstChild);
          c.replaceWith(p); return;
        }
        if (!OK_TAG.has(tag)) { c.replaceWith(...c.childNodes); return; }
        // Attribute bereinigen
        const keep = {};
        if (tag === 'A') keep.href = c.getAttribute('href');
        if (tag === 'IMG') { keep.src = c.getAttribute('src'); keep.alt = c.getAttribute('alt'); }
        if (tag === 'TD' || tag === 'TH') { keep.colspan = c.getAttribute('colspan'); keep.rowspan = c.getAttribute('rowspan'); }
        const style = [];
        for (const prop of OK_STYLE) {
          const v = c.style.getPropertyValue(prop);
          if (v && !/mso-/i.test(v)) style.push(prop + ':' + v);
        }
        const align = c.getAttribute('align');
        Array.from(c.attributes).forEach((a) => c.removeAttribute(a.name));
        for (const k in keep) if (keep[k]) c.setAttribute(k, keep[k]);
        if (align && !/text-align/.test(style.join(';'))) style.push('text-align:' + align);
        if (style.length) c.setAttribute('style', style.join(';'));
        if (tag === 'B' || tag === 'STRONG') { /* beibehalten */ }
      });
    };
    clean(frag);
    // Listen in Listenabsätze umwandeln
    const holder = document.createElement('div');
    holder.appendChild(frag);
    holder.querySelectorAll('ul,ol').forEach((l) => { if (!l.parentElement.closest('ul,ol')) W.lists.convertList(l); });
    // Rest-Absätze mit nur Leerraum
    return holder.innerHTML;
  };

  F.pasteHTML = function (html) {
    root();
    document.execCommand('insertHTML', false, html);
    W.layout.schedule(true);
    W.history.push();
  };
  F.pasteText = function (text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const html = lines.map((l) => `<p>${W.esc(l) || '<br>'}</p>`).join('');
    F.pasteHTML(lines.length === 1 ? W.esc(lines[0]) : html);
  };

  async function onPaste(e) {
    const root = W.sel.activeRoot();
    if (!root) return;
    const cd = e.clipboardData;
    if (!cd) return;
    W.layout.beginEdit();
    const files = Array.from(cd.files || []).filter((f) => /^image\//.test(f.type));
    if (files.length && !cd.getData('text/html')) {
      e.preventDefault();
      for (const f of files) await W.cmd.insertImageFile(f);
      return;
    }
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    e.preventDefault();
    if (html && !W.pasteTextOnly) {
      const clean = F.sanitize(html);
      if (clean.trim()) { F.pasteHTML(clean); return; }
    }
    if (text) F.pasteText(text);
  }

  function onCopy(e) {
    const r = W.sel.range();
    if (!r || r.collapsed) return;
    const root = W.sel.activeRoot();
    const frag = r.cloneContents();
    const div = document.createElement('div');
    div.appendChild(frag);
    // weiche Teilungen zusammenführen und Layout-Reste entfernen
    div.querySelectorAll('[data-cont]').forEach((el) => {
      const prev = el.previousElementSibling;
      if (prev && prev.tagName === el.tagName) { while (el.firstChild) prev.appendChild(el.firstChild); el.remove(); }
      else el.removeAttribute('data-cont');
    });
    div.querySelectorAll('[data-lay]').forEach((el) => {
      el.removeAttribute('data-lay');
      ['--lx', '--ly', '--lw', '--tal'].forEach((v) => el.style.removeProperty(v));
      if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    div.querySelectorAll('[data-split]').forEach((el) => el.removeAttribute('data-split'));
    div.querySelectorAll('[data-mark]').forEach((el) => el.removeAttribute('data-mark'));
    const html = div.innerHTML.replace(/​/g, '');
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', W.stripZW(getSelection().toString()));
    e.preventDefault();
    if (e.type === 'cut') {
      W.layout.beginEdit();
      document.execCommand('delete');
      W.layout.schedule(true);
      W.history.push();
    }
  }

  document.addEventListener('paste', (e) => { if (e.target.closest && e.target.closest('[data-root]')) onPaste(e); });
  document.addEventListener('copy', (e) => { if (e.target.closest && e.target.closest('[data-root]')) onCopy(e); });
  document.addEventListener('cut', (e) => { if (e.target.closest && e.target.closest('[data-root]')) onCopy(e); });

  /** Zwischenablage per Button (async API, falls erlaubt) */
  F.pasteFromClipboard = async function (textOnly) {
    F.refocus();
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        if (!textOnly && it.types.includes('text/html')) {
          const html = await (await it.getType('text/html')).text();
          W.layout.beginEdit(); F.pasteHTML(F.sanitize(html)); return;
        }
        const img = it.types.find((t) => t.startsWith('image/'));
        if (img && !textOnly) { const b = await it.getType(img); await W.cmd.insertImageFile(b); return; }
        if (it.types.includes('text/plain')) { const t = await (await it.getType('text/plain')).text(); W.layout.beginEdit(); F.pasteText(t); return; }
      }
    } catch (e) {
      try { const t = await navigator.clipboard.readText(); W.layout.beginEdit(); F.pasteText(t); }
      catch (e2) { W.toast('Der Browser erlaubt das Einfügen per Schaltfläche nicht – bitte Strg+V verwenden.'); }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Einfügen                                                            */
  /* ------------------------------------------------------------------ */
  F.insertBlockAfterSelection = function (el) {
    const r = root();
    const range = W.sel.range(r);
    let blk = range && W.sel.blocks(r, range).pop();
    if (!blk) blk = r.lastElementChild;
    let top = blk; while (top && top.parentNode !== r) top = top.parentNode;
    (top || r.lastElementChild).after(el);
    return el;
  };

  F.insertBreak = function (kind, extra) {
    W.edit(() => {
      const r = root();
      if (r !== W.el.flow) return false;
      const range = W.sel.range(r);
      let blk = range && W.sel.blocks(r, range).pop();
      let top = blk; while (top && top.parentNode !== r) top = top.parentNode;
      // Absatz an der Cursorposition teilen, damit der Umbruch dazwischen liegt
      let restSplit = null;
      if (blk && range && top === blk) {
        const tail = document.createRange();
        tail.setStart(range.endContainer, range.endOffset); tail.setEnd(blk, blk.childNodes.length);
        const hasTail = tail.toString().length > 0 || !!tail.cloneContents().querySelector('img,.fld');
        const atStart = (() => { const t = document.createRange(); t.setStart(blk, 0); t.setEnd(range.startContainer, range.startOffset); return t.toString() === ''; })();
        if (hasTail && !atStart) {
          const frag = tail.extractContents();
          restSplit = blk.cloneNode(false);
          restSplit.appendChild(frag);
          if (!restSplit.firstChild) restSplit.appendChild(document.createElement('br'));
          blk.after(restSplit);
        } else if (atStart && !hasTail) { /* leer */ }
        else if (atStart) { /* davor einfügen */ top = blk.previousElementSibling || null; }
      }
      const brk = document.createElement('p');
      brk.className = 'brk';
      brk.setAttribute('data-brk', kind);
      brk.setAttribute('contenteditable', 'false');
      brk.innerHTML = '<br>';
      const after = document.createElement('p'); after.innerHTML = '<br>';
      if (kind === 'sect' || kind === 'sectnext') {
        const c = (extra && extra.cols) || W.doc.cols;
        brk.setAttribute('data-cols', JSON.stringify({ n: c.n, w: c.w, gap: c.gap, rule: c.rule, bg: c.bg, bleed: c.bleed, mainOnly: c.mainOnly }));
      }
      if (top) top.after(brk); else r.insertBefore(brk, r.firstChild);
      if (restSplit) { /* Rest steht schon dahinter */ brk.after(restSplit); }
      else brk.after(after);
      W.sel.caretIn(restSplit || after, false);
    });
  };

  F.insertHLine = function () {
    W.edit(() => {
      const p = document.createElement('p');
      p.style.borderBottom = '1px solid #000'; p.style.marginBottom = '8pt'; p.style.lineHeight = '4px'; p.style.height = '4px';
      p.innerHTML = '<br>';
      F.insertBlockAfterSelection(p);
      const n = document.createElement('p'); n.innerHTML = '<br>'; p.after(n);
      W.sel.caretIn(n, false);
    });
  };

  F.insertHTMLAtCaret = function (html) {
    root();
    W.layout.beginEdit();
    document.execCommand('insertHTML', false, html);
    W.layout.schedule(true); W.history.push();
  };

  F.insertText = function (text) {
    root();
    W.layout.beginEdit();
    document.execCommand('insertText', false, text);
    W.layout.schedule(true); W.history.push();
  };

  F.insertField = function (kind) {
    if (W.hf.editing) { W.hf.insertField(kind); return; }
    let txt = '';
    if (kind === 'DATE') { F.insertText(new Date().toLocaleDateString('de-DE')); return; }
    if (kind === 'TIME') { F.insertText(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })); return; }
    F.insertHTMLAtCaret(W.hf.fieldHTML(kind, kind === 'PAGE' ? '1' : String(W.layout.info.pageCount)) + W.ZWSP);
  };

  F.setLink = function (url, text) {
    F.refocus();
    W.layout.beginEdit();
    const sel = getSelection();
    css(true);
    if (!url) { document.execCommand('unlink'); after(); return; }
    if (sel.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${W.esc(url)}">${W.esc(text || url)}</a>&#8203;`);
    } else {
      document.execCommand('createLink', false, url);
    }
    after();
  };

  F.currentLink = function () {
    const s = getSelection();
    if (!s.rangeCount) return null;
    const n = s.anchorNode;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    return el ? el.closest('a') : null;
  };

  /* ------------------------------------------------------------------ */
  /*  Format übertragen                                                   */
  /* ------------------------------------------------------------------ */
  F.copyFormat = function () {
    const st = F.state();
    F.painter = {
      bold: st.bold, italic: st.italic, underline: st.underline, strike: st.strike,
      font: st.font, size: st.size, color: st.color, highlight: st.highlight, align: st.align,
    };
    document.body.classList.add('painter');
    W.toast('Format übertragen: Text auswählen, auf den das Format angewendet werden soll.');
  };
  document.addEventListener('mouseup', () => {
    if (!F.painter) return;
    setTimeout(() => {
      const s = getSelection();
      if (!s.rangeCount || s.isCollapsed || !W.sel.activeRoot()) return;
      const p = F.painter; F.painter = null; document.body.classList.remove('painter');
      const cur = F.state();
      css(true);
      ['bold', 'italic', 'underline', 'strike'].forEach((k) => {
        if (cur[k] !== p[k]) document.execCommand({ bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }[k]);
      });
      F.applyInline((el) => {
        if (p.font) el.style.fontFamily = W.fontStack(p.font);
        if (p.size) el.style.fontSize = p.size + 'pt';
        if (p.color) el.style.color = p.color;
        if (p.highlight) el.style.backgroundColor = p.highlight; else el.style.removeProperty('background-color');
      });
      F.setAlign(p.align);
    }, 0);
  });

  /* ------------------------------------------------------------------ */
  /*  Befehlsregister                                                     */
  /* ------------------------------------------------------------------ */
  Object.assign(W.cmd, {
    bold: () => F.toggleCmd('bold'),
    italic: () => F.toggleCmd('italic'),
    underline: () => F.toggleCmd('underline'),
    strike: () => F.toggleCmd('strikeThrough'),
    sub: () => F.toggleCmd('subscript'),
    sup: () => F.toggleCmd('superscript'),
    font: (n) => F.setFontFamily(n),
    size: (n) => F.setFontSize(n),
    sizeUp: () => F.stepFontSize(1),
    sizeDown: () => F.stepFontSize(-1),
    color: (c) => F.setColor(c),
    highlight: (c) => F.setHighlight(c),
    clearFormat: () => F.clearFormatting(),
    caseMode: (m) => F.changeCase(m),
    smallCaps: () => { const on = !(F.state().block && getComputedStyle(F.state().block).fontVariantCaps === 'small-caps'); F.setInlineStyle({ 'font-variant': on ? 'small-caps' : 'normal' }); },
    allCaps: () => { F.setInlineStyle({ 'text-transform': 'uppercase' }); },
    charSpacing: (px) => F.setInlineStyle({ 'letter-spacing': px ? px + 'px' : '' }),
    alignLeft: () => F.setAlign('left'),
    alignCenter: () => F.setAlign('center'),
    alignRight: () => F.setAlign('right'),
    alignJustify: () => F.setAlign('justify'),
    bullets: (fmt) => W.lists.toggle('b', fmt),
    numbering: (fmt) => W.lists.toggle('n', fmt),
    indentMore: () => F.indent(1),
    indentLess: () => F.indent(-1),
    lineSpacing: (v) => F.setLineSpacing(v),
    spaceBefore: (pt) => F.setSpacing(pt, null),
    spaceAfter: (pt) => F.setSpacing(null, pt),
    shading: (c) => F.setShading(c),
    borders: (k) => F.setBorders(k),
    style: (id) => F.applyStyle(id),
    pageBreak: () => F.insertBreak('page'),
    columnBreak: () => F.insertBreak('column'),
    sectionBreak: () => F.insertBreak('sect'),
    sectionBreakNext: () => F.insertBreak('sectnext'),
    hline: () => F.insertHLine(),
    link: (url, text) => F.setLink(url, text),
    field: (k) => F.insertField(k),
    formatPainter: () => F.copyFormat(),
    paste: () => F.pasteFromClipboard(false),
    pasteText: () => F.pasteFromClipboard(true),
    cut: () => { F.refocus(); document.execCommand('cut'); },
    copy: () => { F.refocus(); document.execCommand('copy'); },
    selectAll: () => { F.refocus(); document.execCommand('selectAll'); },
    undo: () => W.history.undo(),
    redo: () => W.history.redo(),
  });
})();
