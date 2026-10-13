/* Wohni Writer – Kopf- und Fußzeilen (einmal im Dokument, auf jeder Seite dargestellt) */
(function () {
  'use strict';
  const W = window.W;

  const HF = (W.hf = { editing: null });

  function fieldHTML(kind, text) {
    return `<span class="fld" data-f="${kind}" contenteditable="false">${text}</span>`;
  }
  HF.fieldHTML = fieldHTML;

  /** Platzhalter-Felder mit aktuellem Wert befüllen */
  function fillFields(box, pageIdx, total) {
    box.querySelectorAll('.fld').forEach((f) => {
      const k = f.getAttribute('data-f');
      if (k === 'PAGE') f.textContent = String(pageIdx + 1);
      else if (k === 'NUMPAGES') f.textContent = String(total);
      else if (k === 'DATE') f.textContent = new Date().toLocaleDateString('de-DE');
      else if (k === 'TIME') f.textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    });
  }

  function contentFor(kind, pageIdx) {
    const d = W.doc;
    if (d.diffFirst && pageIdx === 0) return kind === 'header' ? d.firstHeader : d.firstFooter;
    return kind === 'header' ? d.header : d.footer;
  }

  HF.render = function (n, G) {
    const host = W.el.hf;
    if (HF.editing && host.contains(HF.editing.box)) {
      // Bearbeitung läuft: nur Positionen nachziehen, Inhalt nicht überschreiben
    }
    const doc = W.doc;
    const hs = Array.from(host.children);
    const need = n * 2;
    while (host.children.length > need) host.lastChild.remove();
    while (host.children.length < need) host.appendChild(W.h('div.hfbox'));
    for (let i = 0; i < n; i++) {
      for (const kind of ['header', 'footer']) {
        const box = host.children[i * 2 + (kind === 'header' ? 0 : 1)];
        const page = W.doc.view === 'web' ? 0 : i;
        const editingThis = HF.editing && HF.editing.box === box;
        box.className = 'hfbox ' + kind + (editingThis ? ' editing' : '');
        box.dataset.kind = kind; box.dataset.page = String(i);
        const top = (W.doc.view === 'web' ? 0 : i * G.stride);
        const x = G.ml, w = G.cw;
        box.style.left = x + 'px';
        box.style.width = w + 'px';
        if (kind === 'header') {
          box.style.top = (top + doc.page.hdist) + 'px';
          box.style.bottom = '';
          box.style.maxHeight = Math.max(20, G.mt - doc.page.hdist - 4) + 'px';
        } else {
          const h = (L_pageH());
          box.style.top = '';
          box.style.bottom = '';
          box.style.maxHeight = Math.max(20, G.mb - doc.page.fdist - 4) + 'px';
          // Unterkante der Fußzeile = Seitenunterkante - fdist
          box.style.top = (top + h - doc.page.fdist - Math.min(box.offsetHeight || 20, G.mb - doc.page.fdist)) + 'px';
        }
        if (!editingThis) {
          const html = contentFor(kind, i);
          if (box._html !== html) { box.innerHTML = html || ''; box._html = html; }
          box.dataset.empty = html ? '' : '1';
          box.contentEditable = 'false';
          fillFields(box, i, n);
        }
        // Fußzeile: nach Befüllen exakt an den unteren Rand setzen
        if (kind === 'footer') {
          const h = L_pageH();
          const bh = box.offsetHeight;
          box.style.top = (top + h - doc.page.fdist - bh) + 'px';
        }
      }
    }
  };
  function L_pageH() { return W.layout.pageH || W.geom().ph; }

  /** Kopf-/Fußzeile bearbeiten (Doppelklick) */
  HF.edit = function (box) {
    if (HF.editing && HF.editing.box === box) return;
    HF.stop();
    const kind = box.dataset.kind;
    const page = parseInt(box.dataset.page, 10) || 0;
    const first = W.doc.diffFirst && page === 0;
    // Platzhalter-Text für leere Zeilen
    if (!box.innerHTML.trim()) box.innerHTML = '<p><br></p>';
    box.contentEditable = 'true';
    box.setAttribute('data-root', '');
    box.classList.add('editing');
    box.spellcheck = true;
    HF.editing = { box, kind, first };
    document.body.classList.add('hf-editing');
    box.focus();
    W.sel.caretIn(box.querySelector('p') || box, true);
    W.emit('hf-edit', HF.editing);
    W.ribbon && W.ribbon.showContext('hf', true);
    W.ribbon && W.ribbon.selectTab('hf');
  };

  HF.sync = function () {
    const e = HF.editing; if (!e) return;
    const clone = e.box.cloneNode(true);
    clone.querySelectorAll('.fld').forEach((f) => { f.textContent = f.getAttribute('data-f') === 'PAGE' ? '1' : f.textContent; });
    const html = clone.innerHTML.trim();
    const empty = !clone.textContent.trim() && !clone.querySelector('img,.fld,table');
    const val = empty ? '' : html;
    const d = W.doc;
    if (e.kind === 'header') { if (e.first) d.firstHeader = val; else d.header = val; }
    else { if (e.first) d.firstFooter = val; else d.footer = val; }
    // übrige Seiten aktualisieren
    W.el.hf.querySelectorAll('.hfbox').forEach((b) => {
      if (b === e.box || b.dataset.kind !== e.kind) return;
      const page = parseInt(b.dataset.page, 10);
      const f = d.diffFirst && page === 0;
      if (f === e.first) { b.innerHTML = val; b._html = val; fillFields(b, page, W.layout.info.pageCount); }
    });
  };

  HF.stop = function () {
    const e = HF.editing; if (!e) return;
    HF.sync();
    e.box.contentEditable = 'false';
    e.box.removeAttribute('data-root');
    e.box.classList.remove('editing');
    HF.editing = null;
    document.body.classList.remove('hf-editing');
    W.ribbon && W.ribbon.showContext('hf', false);
    W.layout.run();
    W.history.push();
    W.el.flow.focus({ preventScroll: true });
  };

  HF.insertField = function (kind) {
    if (!HF.editing) return false;
    const txt = kind === 'PAGE' ? '1' : kind === 'NUMPAGES' ? String(W.layout.info.pageCount) : '';
    document.execCommand('insertHTML', false, fieldHTML(kind, txt) + '&#8203;');
    HF.sync();
    return true;
  };

  HF.setDiffFirst = function (on) {
    W.doc.diffFirst = !!on;
    W.layout.run(); W.history.push();
  };
  HF.remove = function (kind) {
    HF.stop();
    if (kind === 'header') { W.doc.header = ''; W.doc.firstHeader = ''; } else { W.doc.footer = ''; W.doc.firstFooter = ''; }
    W.layout.run(); W.history.push();
  };
  /** Seitenzahl-Vorlagen */
  HF.insertPageNumber = function (pos) {
    const kind = pos.startsWith('top') ? 'header' : 'footer';
    const align = pos.endsWith('left') ? 'left' : pos.endsWith('right') ? 'right' : 'center';
    const html = `<p style="text-align:${align};margin:0">${fieldHTML('PAGE', '1')}</p>`;
    if (kind === 'header') { W.doc.header = html; if (W.doc.diffFirst) W.doc.firstHeader = ''; }
    else { W.doc.footer = html; if (W.doc.diffFirst) W.doc.firstFooter = ''; }
    W.layout.run(); W.history.push();
  };
})();
