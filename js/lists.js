/* Wohni Writer – Listen als Absatz-Attribute (wie in Word: Aufzählung/Nummerierung gehören zum Absatz)
   data-list="b|n"  data-lvl="0-8"  data-lid="Listen-ID"  data-fmt="Format"  data-mark="berechnet" */
(function () {
  'use strict';
  const W = window.W;

  const BULLETS = {
    disc: ['•', '◦', '▪'],
    circle: ['◦', '▪', '•'],
    square: ['▪', '◦', '•'],
    dash: ['–', '–', '–'],
    arrow: ['➤', '➤', '➤'],
    check: ['✓', '✓', '✓'],
    star: ['★', '★', '★'],
  };
  const NUM_CYCLES = {
    decimal: [['decimal', '.'], ['lowerLetter', '.'], ['lowerRoman', '.']],
    paren: [['decimal', ')'], ['lowerLetter', ')'], ['lowerRoman', ')']],
    upperRoman: [['upperRoman', '.'], ['upperLetter', '.'], ['decimal', '.'], ['lowerLetter', '.']],
    upperLetter: [['upperLetter', '.'], ['decimal', '.'], ['lowerLetter', '.']],
    lowerLetter: [['lowerLetter', '.'], ['lowerRoman', '.'], ['decimal', '.']],
    legal: 'legal',
  };

  function roman(n, upper) {
    const m = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
    let s = '';
    for (const [v, r] of m) while (n >= v) { s += r; n -= v; }
    return upper ? s.toUpperCase() : s;
  }
  function letter(n, upper) {
    let s = ''; n = Math.max(1, n);
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); }
    return upper ? s.toUpperCase() : s;
  }
  function fmtNum(n, kind) {
    switch (kind) {
      case 'lowerLetter': return letter(n, false);
      case 'upperLetter': return letter(n, true);
      case 'lowerRoman': return roman(n, false);
      case 'upperRoman': return roman(n, true);
      default: return String(n);
    }
  }

  function markFor(fmt, counters, lvl) {
    const cyc = NUM_CYCLES[fmt] || NUM_CYCLES.decimal;
    if (cyc === 'legal') {
      return counters.slice(0, lvl + 1).map((c) => c || 1).join('.') + (lvl === 0 ? '.' : '');
    }
    const [kind, suf] = cyc[lvl % cyc.length];
    return fmtNum(counters[lvl], kind) + suf;
  }

  const Li = (W.lists = {
    BULLETS, NUM_CYCLES,

    /** data-mark für alle Listenabsätze berechnen */
    update(root) {
      root = root || W.el.flow;
      const state = new Map();
      root.querySelectorAll('p[data-list]').forEach((p) => {
        if (p.hasAttribute('data-cont')) return;
        const lvl = Math.min(8, Math.max(0, parseInt(p.getAttribute('data-lvl') || '0', 10)));
        const fmt = p.getAttribute('data-fmt') || (p.getAttribute('data-list') === 'b' ? 'disc' : 'decimal');
        let mark;
        if (p.getAttribute('data-list') === 'b') {
          const set = BULLETS[fmt] || BULLETS.disc;
          mark = set[lvl % set.length];
        } else {
          const lid = p.getAttribute('data-lid') || 'l0';
          let c = state.get(lid);
          if (!c) { c = []; state.set(lid, c); }
          c.length = lvl + 1;
          for (let i = 0; i < lvl; i++) if (c[i] == null) c[i] = 1;
          if (c[lvl] == null) c[lvl] = (parseInt(p.getAttribute('data-start') || '1', 10) || 1) - 1;
          c[lvl]++;
          mark = markFor(fmt, c, lvl);
        }
        if (p.getAttribute('data-mark') !== mark) p.setAttribute('data-mark', mark);
        p.style.setProperty('--lvl', String(lvl));
      });
    },

    set(p, type, lvl, lid, fmt) {
      p.setAttribute('data-list', type);
      p.setAttribute('data-lvl', String(lvl || 0));
      p.style.setProperty('--lvl', String(lvl || 0));
      if (type === 'n') p.setAttribute('data-lid', lid || W.uid('l')); else p.removeAttribute('data-lid');
      p.setAttribute('data-fmt', fmt || (type === 'b' ? 'disc' : 'decimal'));
    },
    clear(p) {
      ['data-list', 'data-lvl', 'data-lid', 'data-fmt', 'data-mark', 'data-start'].forEach((a) => p.removeAttribute(a));
      p.style.removeProperty('--lvl');
      p.style.removeProperty('margin-left'); p.style.removeProperty('text-indent');
      if (!p.getAttribute('style')) p.removeAttribute('style');
    },

    /** Aufzählung / Nummerierung für die Auswahl umschalten */
    toggle(type, fmt) {
      W.edit(() => {
        const blocks = W.sel.blocks().filter((b) => /^(P|H[1-6])$/.test(b.tagName));
        if (!blocks.length) return false;
        const allSame = blocks.every((b) => b.getAttribute('data-list') === type && (!fmt || (b.getAttribute('data-fmt') || '') === fmt));
        if (allSame) { blocks.forEach(Li.clear); return; }
        let lid = null;
        if (type === 'n') {
          // an vorhandene Nummerierung direkt davor anschließen
          const first = blocks[0];
          let prev = first.previousElementSibling;
          while (prev && prev.hasAttribute('data-cont')) prev = prev.previousElementSibling;
          if (prev && prev.getAttribute('data-list') === 'n' && (!fmt || prev.getAttribute('data-fmt') === fmt)) lid = prev.getAttribute('data-lid');
          if (!lid) lid = W.uid('l');
        }
        blocks.forEach((b) => {
          const lvl = b.getAttribute('data-lvl') ? parseInt(b.getAttribute('data-lvl'), 10) : 0;
          Li.set(b, type, lvl, lid, fmt);
          b.style.removeProperty('margin-left'); b.style.removeProperty('text-indent');
        });
      });
    },

    /** Listenebene ändern (Tab / Umschalt+Tab) */
    shift(delta) {
      return W.edit(() => {
        const blocks = W.sel.blocks().filter((b) => b.hasAttribute('data-list'));
        if (!blocks.length) return false;
        blocks.forEach((b) => {
          const l = Math.min(8, Math.max(0, parseInt(b.getAttribute('data-lvl') || '0', 10) + delta));
          b.setAttribute('data-lvl', String(l));
          b.style.setProperty('--lvl', String(l));
        });
      });
    },

    restart() {
      W.edit(() => {
        const blocks = W.sel.blocks().filter((b) => b.getAttribute('data-list') === 'n');
        if (!blocks.length) return false;
        const old = blocks[0].getAttribute('data-lid');
        const nid = W.uid('l');
        let n = blocks[0];
        while (n) {
          if (n.getAttribute && n.getAttribute('data-list') === 'n' && n.getAttribute('data-lid') === old) n.setAttribute('data-lid', nid);
          n = n.nextElementSibling;
        }
      });
    },

    /** <ul>/<ol> (z. B. aus eingefügtem HTML) in Listenabsätze umwandeln */
    convertList(list, container) {
      const out = [];
      const lid = W.uid('l');
      (function walk(ul, depth) {
        const type = ul.tagName === 'OL' ? 'n' : 'b';
        Array.from(ul.children).forEach((li) => {
          if (li.tagName !== 'LI') { if (li.tagName === 'UL' || li.tagName === 'OL') walk(li, depth + 1); return; }
          const p = document.createElement('p');
          Array.from(li.childNodes).forEach((c) => {
            if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) return;
            p.appendChild(c.cloneNode(true));
          });
          if (!p.firstChild) p.appendChild(document.createElement('br'));
          Li.set(p, type, Math.min(depth, 8), type === 'n' ? lid + depth : null);
          out.push(p);
          Array.from(li.children).forEach((c) => { if (c.tagName === 'UL' || c.tagName === 'OL') walk(c, depth + 1); });
        });
      })(list, 0);
      const par = list.parentNode;
      if (par) { out.forEach((p) => par.insertBefore(p, list)); list.remove(); }
      return out;
    },

    /** Tastatursonderfälle in Listen. Rückgabe true = behandelt. */
    onKeydown(e) {
      const flow = W.el.flow;
      const r = W.sel.range(flow);
      if (!r || !r.collapsed) return false;
      let blk = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      blk = blk && blk.closest('p,h1,h2,h3,h4,h5,h6');
      if (!blk || !blk.hasAttribute('data-list')) return false;
      const atStart = () => {
        const t = document.createRange();
        t.setStart(blk, 0); t.setEnd(r.startContainer, r.startOffset);
        return t.toString() === '' && !t.cloneContents().querySelector('img,.fld');
      };
      const isEmpty = !blk.textContent.replace(/​/g, '').length && !blk.querySelector('img,.fld');
      if (e.key === 'Enter' && !e.shiftKey && isEmpty) {
        e.preventDefault();
        W.edit(() => {
          const lvl = parseInt(blk.getAttribute('data-lvl') || '0', 10);
          if (lvl > 0) { blk.setAttribute('data-lvl', String(lvl - 1)); blk.style.setProperty('--lvl', String(lvl - 1)); }
          else Li.clear(blk);
        });
        return true;
      }
      if (e.key === 'Backspace' && atStart() && !blk.hasAttribute('data-cont')) {
        e.preventDefault();
        W.edit(() => Li.clear(blk));
        return true;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        Li.shift(e.shiftKey ? -1 : 1);
        return true;
      }
      return false;
    },
  });
})();
