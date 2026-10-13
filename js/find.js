/* Wohni Writer – Suchen und Ersetzen (mit CSS-Highlight-API, falls verfügbar) */
(function () {
  'use strict';
  const W = window.W;
  const h = W.h;

  const S = (W.find = { panel: null, matches: [], cur: -1, opts: { matchCase: false, whole: false } });
  const canHL = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

  function regexFor(q) {
    if (!q) return null;
    let src = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (S.opts.whole) src = '(?<![\\p{L}\\p{N}_])' + src + '(?![\\p{L}\\p{N}_])';
    try { return new RegExp(src, 'gu' + (S.opts.matchCase ? '' : 'i')); } catch (e) { return null; }
  }

  function collect(q) {
    const re = regexFor(q);
    const out = [];
    if (!re) return out;
    const flow = W.el.flow;
    W.sel.leaves(flow).forEach((leaf, i) => {
      if (leaf.closest('[data-toc]')) return;
      const text = W.sel.leafText(leaf);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        out.push({ i, s: m.index, e: m.index + m[0].length });
      }
    });
    return out;
  }
  function rangeOf(m) {
    const a = W.sel.pointAt({ i: m.i, o: m.s }), b = W.sel.pointAt({ i: m.i, o: m.e });
    if (!a || !b) return null;
    const r = document.createRange();
    try { r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); } catch (e) { return null; }
    return r;
  }

  function paint() {
    if (!canHL) return;
    const rs = S.matches.map(rangeOf).filter(Boolean);
    CSS.highlights.set('find', new Highlight(...rs));
    const cur = S.cur >= 0 && S.matches[S.cur] ? rangeOf(S.matches[S.cur]) : null;
    if (cur) CSS.highlights.set('findcur', new Highlight(cur)); else CSS.highlights.delete('findcur');
  }
  function clearPaint() { if (canHL) { CSS.highlights.delete('find'); CSS.highlights.delete('findcur'); } }

  S.search = function (keepIndex) {
    const q = S.q ? S.q.value : '';
    const prev = S.cur;
    S.matches = collect(q);
    if (!S.matches.length) S.cur = -1;
    else if (keepIndex && prev >= 0) S.cur = Math.min(prev, S.matches.length - 1);
    else {
      // erste Fundstelle ab Cursor
      const pos = W.sel.save(W.el.flow);
      let k = 0;
      if (pos) { k = S.matches.findIndex((m) => m.i > pos.f.i || (m.i === pos.f.i && m.e > pos.f.o)); if (k < 0) k = 0; }
      S.cur = k;
    }
    paint(); count();
  };
  function count() {
    if (!S.count) return;
    S.count.textContent = !S.q.value ? '' : (S.matches.length ? `${S.cur + 1} von ${S.matches.length}` : 'Kein Treffer');
  }
  function goto(i, select) {
    if (!S.matches.length) return;
    S.cur = (i + S.matches.length) % S.matches.length;
    const r = rangeOf(S.matches[S.cur]);
    if (r) {
      const s = getSelection();
      if (select !== false) { s.removeAllRanges(); s.addRange(r); }
      const rc = r.getBoundingClientRect();
      const ws = W.el.workspace.getBoundingClientRect();
      if (rc.top < ws.top + 80 || rc.bottom > ws.bottom - 80) W.el.workspace.scrollTop += rc.top - ws.top - ws.height / 3;
    }
    paint(); count();
  }
  S.next = () => goto(S.cur + 1);
  S.prev = () => goto(S.cur - 1);

  S.replaceCurrent = function () {
    if (S.cur < 0) { S.search(); return; }
    const m = S.matches[S.cur];
    const rep = S.rep.value;
    W.edit(() => {
      const r = rangeOf(m); if (!r) return false;
      W.el.flow.focus();
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      document.execCommand('insertText', false, rep);
    });
    S.search(true);
    if (S.matches.length) goto(Math.min(S.cur, S.matches.length - 1));
  };
  S.replaceAll = function () {
    const q = S.q.value; if (!q) return;
    const all = collect(q);
    if (!all.length) { count(); return; }
    const rep = S.rep.value;
    W.edit(() => {
      W.el.flow.focus();
      // rückwärts ersetzen, damit Positionen gültig bleiben
      for (let k = all.length - 1; k >= 0; k--) {
        const r = rangeOf(all[k]); if (!r) continue;
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        document.execCommand('insertText', false, rep);
      }
    });
    W.toast(`${all.length} Ersetzung${all.length === 1 ? '' : 'en'} vorgenommen`);
    S.search();
  };

  S.close = function () {
    if (!S.panel) return;
    S.panel.remove(); S.panel = null; S.matches = []; S.cur = -1; clearPaint();
    W.fmt.refocus();
  };

  S.open = function (replaceMode) {
    const pre = (!getSelection().isCollapsed && W.sel.activeRoot() === W.el.flow) ? getSelection().toString().split('\n')[0].slice(0, 80) : '';
    if (S.panel) {
      S.repRow.hidden = !replaceMode;
      if (pre) S.q.value = pre;
      S.q.focus(); S.q.select(); S.search();
      return;
    }
    const q = h('input', { type: 'text', placeholder: 'Suchen…', spellcheck: false, 'aria-label': 'Suchen nach' });
    const rep = h('input', { type: 'text', placeholder: 'Ersetzen durch…', spellcheck: false, 'aria-label': 'Ersetzen durch' });
    const cnt = h('span.fcount');
    const mc = h('input', { type: 'checkbox' }), ww = h('input', { type: 'checkbox' });
    const btn = (t, fn, title) => h('button.fbtn', { type: 'button', title: title || t, onclick: fn }, t);
    const repRow = h('div.frow', h('label', 'Ersetzen'), rep, btn('Ersetzen', () => S.replaceCurrent()), btn('Alle', () => S.replaceAll(), 'Alle ersetzen'));
    repRow.hidden = !replaceMode;
    const panel = h('div.findbar', { role: 'search' },
      h('button.qbtn.fx', { type: 'button', title: 'Schließen (Esc)', html: W.icon('close', 14), onclick: () => S.close(), style: { color: 'var(--ui-fg)' } }),
      h('div.frow', h('label', 'Suchen'), q, btn('▲', () => S.prev(), 'Vorheriger Treffer'), btn('▼', () => S.next(), 'Nächster Treffer'), cnt),
      repRow,
      h('div.fopts', h('label.fcheck', mc, ' Groß-/Kleinschreibung'), h('label.fcheck', ww, ' Ganze Wörter')));
    W.$('#main').appendChild(panel);
    Object.assign(S, { panel, q, rep, count: cnt, repRow });
    q.value = pre;
    mc.addEventListener('change', () => { S.opts.matchCase = mc.checked; S.search(); });
    ww.addEventListener('change', () => { S.opts.whole = ww.checked; S.search(); });
    q.addEventListener('input', () => S.search());
    const key = (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); S.close(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (e.target === rep) S.replaceCurrent(); else (e.shiftKey ? S.prev() : S.next()); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'f')) { e.preventDefault(); S.repRow.hidden = e.key === 'f'; }
    };
    q.addEventListener('keydown', key); rep.addEventListener('keydown', key);
    q.focus(); q.select();
    S.search();
  };
  W.on('layout', () => { if (S.panel && !W.composing) { const keep = S.cur; S.matches = collect(S.q.value); if (S.cur >= S.matches.length) S.cur = S.matches.length - 1; paint(); count(); } });
})();
