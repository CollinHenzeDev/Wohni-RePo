/* Wohni Writer – Auswahl: robustes Speichern/Wiederherstellen unabhängig von DOM-Umbau
   (nötig, weil die Seitenumbruch-Engine Absätze zeilenweise teilt und wieder zusammenführt). */
(function () {
  'use strict';
  const W = window.W;

  const LEAF_SEL = 'p,h1,h2,h3,h4,h5,h6';
  const LEAF_TAGS = /^(P|H[1-6])$/;

  const isLeaf = (n) => n && n.nodeType === 1 && LEAF_TAGS.test(n.tagName);
  const isAtomEl = (n) => n.nodeType === 1 && (n.tagName === 'IMG' || n.tagName === 'BR' || n.classList.contains('fld'));
  function atomLen(n, part) {
    if (n.nodeType === 3) return n.nodeValue.length;
    if (n.tagName === 'BR') {
      // abschließendes <br> eines Blocks ist nur Platzhalter
      let p = n.parentNode;
      if (!n.nextSibling && (p === part || (p.nodeType === 1 && !isLeaf(p) && !p.nextSibling && p.parentNode === part))) return 0;
      return 1;
    }
    return 1;
  }

  function atomWalker(part) {
    return document.createTreeWalker(part, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 3) return n.parentElement && n.parentElement.closest('.fld') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        return isAtomEl(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
  }

  /** logische Absätze (ohne data-cont-Fortsetzungen) */
  function leaves(root) {
    return Array.from(root.querySelectorAll(LEAF_SEL)).filter((e) => !e.hasAttribute('data-cont'));
  }
  /** Teile eines logischen Absatzes (Kopf + Fortsetzungen) */
  function chainOf(head) {
    const parts = [head];
    let n = head.nextElementSibling;
    while (n && n.hasAttribute('data-cont') && LEAF_TAGS.test(n.tagName)) { parts.push(n); n = n.nextElementSibling; }
    return parts;
  }
  function headOf(el) {
    let h = el;
    while (h && h.hasAttribute('data-cont') && h.previousElementSibling) h = h.previousElementSibling;
    return h;
  }
  function partLen(part) {
    let t = 0, n; const w = atomWalker(part);
    while ((n = w.nextNode())) t += atomLen(n, part);
    return t;
  }
  function countBefore(part, node, offset) {
    let stopNode, endOfNode = false;
    if (node.nodeType === 3) stopNode = node;
    else { stopNode = node.childNodes[offset] || null; if (!stopNode) endOfNode = true; }
    let total = 0, n;
    const w = atomWalker(part);
    while ((n = w.nextNode())) {
      if (node.nodeType === 3 && n === node) return total + offset;
      if (!endOfNode) {
        if (stopNode === n || stopNode.contains(n)) return total;
        if (n.compareDocumentPosition(stopNode) & Node.DOCUMENT_POSITION_PRECEDING) return total;
      } else {
        // Ende des Containers: Atome, die nach dem Container kommen, zählen nicht
        if (node !== n && !node.contains(n) && (node.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) return total;
      }
      total += atomLen(n, part);
    }
    return total;
  }

  /** nächstgelegenen Absatz zu (node, offset) ermitteln */
  function leafAt(root, node, offset) {
    let el = node.nodeType === 1 ? node : node.parentNode;
    while (el && el !== root && !isLeaf(el)) el = el.parentNode;
    if (el && el !== root && root.contains(el)) return { part: el, node, offset };
    // Container ist kein Absatz (z. B. Fluss, Tabelle, Zelle): angrenzenden Absatz wählen
    const all = Array.from(root.querySelectorAll(LEAF_SEL));
    if (!all.length) return null;
    const ref = node.nodeType === 1 ? (node.childNodes[offset] || null) : node;
    if (ref) {
      const hit = all.find((l) => ref === l || ref.contains(l) || (ref.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (hit) return { part: hit, node: hit, offset: 0 };
    }
    const last = all[all.length - 1];
    return { part: last, node: last, offset: last.childNodes.length };
  }

  function pointToPos(root, node, offset) {
    const L = leafAt(root, node, offset);
    if (!L) return null;
    const head = headOf(L.part);
    const chain = chainOf(head);
    let off = 0;
    for (const p of chain) {
      if (p === L.part) { off += countBefore(p, L.node, L.offset); break; }
      off += partLen(p);
    }
    const idx = leaves(root).indexOf(head);
    return { i: idx, o: off };
  }

  function resolvePos(root, pos) {
    const ls = leaves(root);
    if (!ls.length) return null;
    const head = ls[Math.min(Math.max(pos.i, 0), ls.length - 1)];
    const chain = chainOf(head);
    let off = pos.o;
    for (let pi = 0; pi < chain.length; pi++) {
      const part = chain[pi];
      const len = partLen(part);
      if (off <= len || pi === chain.length - 1) {
        off = Math.min(off, len);
        const w = atomWalker(part);
        let cum = 0, n, last = null;
        while ((n = w.nextNode())) {
          const L = atomLen(n, part);
          if (n.nodeType === 3) {
            if (off <= cum + L) return [n, off - cum];
          } else if (L) {
            const par = n.parentNode, idx = Array.prototype.indexOf.call(par.childNodes, n);
            if (off === cum) return [par, idx];
            if (off === cum + 1) { last = [par, idx + 1]; if (off === len) return last; }
          }
          cum += L; last = n;
        }
        if (last && last.nodeType === 3) return [last, last.nodeValue.length];
        if (Array.isArray(last)) return last;
        return [part, 0];
      }
      off -= len;
    }
    return [head, 0];
  }

  const S = (W.sel = {
    LEAF_SEL, isLeaf, leaves, chainOf, headOf,

    /** aktuelle Auswahl, falls sie in `root` liegt */
    range(root) {
      const s = getSelection();
      if (!s.rangeCount) return null;
      const r = s.getRangeAt(0);
      if (root && !(root.contains(r.startContainer) && root.contains(r.endContainer))) return null;
      return r;
    },

    /** nächstes bearbeitbares Wurzelelement der Auswahl */
    activeRoot() {
      const s = getSelection();
      if (!s.rangeCount) return null;
      const n = s.anchorNode;
      const el = n && (n.nodeType === 1 ? n : n.parentElement);
      return el ? el.closest('[data-root]') : null;
    },

    save(root) {
      root = root || W.el.flow;
      const s = getSelection();
      if (!s.rangeCount) return null;
      const r = s.getRangeAt(0);
      if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
      const a = pointToPos(root, s.anchorNode, s.anchorOffset);
      const f = pointToPos(root, s.focusNode, s.focusOffset);
      if (!a || !f) return null;
      return { a, f };
    },

    restore(saved, root) {
      root = root || W.el.flow;
      if (!saved) return;
      const a = resolvePos(root, saved.a), f = resolvePos(root, saved.f);
      if (!a || !f) return;
      const s = getSelection();
      try {
        s.setBaseAndExtent(a[0], a[1], f[0], f[1]);
      } catch (e) { /* ignorieren */ }
    },

    /** Absatz-Blöcke (P/H), die von der Auswahl berührt werden */
    blocks(root, range) {
      root = root || S.activeRoot() || W.el.flow;
      range = range || S.range(root);
      if (!range) return [];
      const out = [];
      const startLeaf = leafAt(root, range.startContainer, range.startOffset);
      root.querySelectorAll(LEAF_SEL).forEach((b) => {
        if (b.closest('.fobj-skip')) return;
        if (!range.intersectsNode(b)) return;
        if (!range.collapsed && !b.contains(range.startContainer)) {
          // Ende genau am Blockanfang? Dann gehört der Block nicht mehr dazu.
          if (b.contains(range.endContainer) || b === range.endContainer) {
            const t = document.createRange();
            t.setStart(b, 0); t.setEnd(range.endContainer, range.endOffset);
            if (t.toString() === '' && !t.cloneContents().querySelector('img,br,.fld')) return;
          }
        }
        out.push(b);
      });
      if (!out.length && startLeaf) out.push(startLeaf.part);
      return out;
    },

    /** oberste Blöcke im Fluss, die von der Auswahl berührt werden */
    topBlocks(range) {
      const flow = W.el.flow;
      range = range || S.range(flow);
      if (!range) return [];
      const tops = new Set();
      S.blocks(flow, range).forEach((b) => { let t = b; while (t.parentNode !== flow) t = t.parentNode; tops.add(t); });
      return Array.from(tops);
    },

    /** logischer Text eines Absatzes (Kopf + Fortsetzungen); Objekte = U+FFFC */
    leafText(head) {
      let t = '';
      chainOf(head).forEach((part) => {
        let n; const w = atomWalker(part);
        while ((n = w.nextNode())) {
          if (n.nodeType === 3) t += n.nodeValue;
          else { const l = atomLen(n, part); if (l) t += n.tagName === 'BR' ? '\n' : '\uFFFC'; }
        }
      });
      return t;
    },
    /** Position {i, o} → [Knoten, Offset] */
    pointAt(pos, root) { return resolvePos(root || W.el.flow, pos); },
    /** (Knoten, Offset) → Position {i, o} */
    posOf(node, offset, root) { return pointToPos(root || W.el.flow, node, offset); },

    caretTo(node, offset) {
      const r = document.createRange();
      r.setStart(node, offset); r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    selectContents(node) {
      const r = document.createRange(); r.selectNodeContents(node);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    /** Cursor an Anfang/Ende eines Blocks setzen */
    caretIn(block, atEnd) {
      const r = document.createRange();
      r.selectNodeContents(block);
      // vor abschließendem <br> bleiben
      if (atEnd) {
        const last = block.lastChild;
        if (last && last.nodeType === 1 && last.tagName === 'BR' && block.childNodes.length > 1) r.setEndBefore(last);
        r.collapse(false);
        if (last && last.nodeType === 1 && last.tagName === 'BR' && block.childNodes.length === 1) { r.setStart(block, 0); r.collapse(true); }
      } else r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    isCollapsed() { const s = getSelection(); return !s.rangeCount || s.isCollapsed; },
    text() { return getSelection().toString(); },
    /** Rechteck des Cursors (Client-Koordinaten) */
    caretRect() {
      const s = getSelection();
      if (!s.rangeCount) return null;
      const r = s.getRangeAt(0).cloneRange();
      r.collapse(false);
      let rect = r.getClientRects()[0] || r.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height && !rect.top && !rect.left)) {
        const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
        if (n) rect = n.getBoundingClientRect();
      }
      return rect;
    },
  });
})();
