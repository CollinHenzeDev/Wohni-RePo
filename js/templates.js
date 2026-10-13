/* Wohni Writer – Dokumentvorlagen (leer, Lebenslauf, Brief, Bericht, Newsletter) */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;

  const T = (W.templates = {});

  const SIDE = '#1f3a5f';
  const white = 'color:#ffffff';
  const sideH = (t) => `<h2 style="color:#ffffff;margin-top:14pt;border-bottom:1px solid #8fa6c8;padding-bottom:2px;font-size:12pt;font-weight:bold;letter-spacing:1px">${t}</h2>`;
  const sideP = (t, extra) => `<p style="${white};margin-bottom:3pt;font-size:10pt${extra ? ';' + extra : ''}">${t}</p>`;
  const sideLi = (t) => `<p data-list="b" data-lvl="0" data-fmt="disc" style="${white};margin-bottom:2pt;font-size:10pt;--lvl:0">${t}</p>`;
  const mainH = (t) => `<h1 style="font-size:14pt;color:${SIDE};font-weight:bold;letter-spacing:1px;border-bottom:2px solid ${SIDE};padding-bottom:2px;margin-top:16pt;margin-bottom:6pt">${t}</h1>`;
  const job = (title, firm, when, lines) => `<p style="margin-bottom:0;margin-top:6pt"><b>${title}</b></p><p style="margin-bottom:2pt;color:#555555;font-size:10pt">${firm} · ${when}</p>` + lines.map((l) => `<p data-list="b" data-lvl="0" data-fmt="disc" style="margin-bottom:1pt;font-size:10pt;--lvl:0">${l}</p>`).join('');

  const brk = (kind) => `<p class="brk" data-brk="${kind}" contenteditable="false"><br></p>`;

  function cvDoc(side) {
    const d = W.defaultDoc();
    const cm = u.cm2px;
    d.title = 'Lebenslauf';
    Object.assign(d.page, { t: cm(1.3), b: cm(1.3), l: cm(1.3), r: cm(1.3), hdist: cm(0.6), fdist: cm(0.6) });
    d.cols = { n: 2, w: side === 'left' ? [1, 2.25] : [2.25, 1], gap: cm(1.0), rule: false, bg: side === 'left' ? [SIDE, null, null] : [null, SIDE, null], bleed: true, mainOnly: true, preset: side };
    d.base = { font: 'Calibri', size: 10.5, after: 4, ls: 1.08 };
    const G = { pw: d.page.w, ml: d.page.l, mt: d.page.t, cw: d.page.w - d.page.l - d.page.r };
    const geo = W.colGeom(d.cols, G.cw);
    const sc = side === 'left' ? geo[0] : geo[1];
    const photo = W.floats.create('shape', {
      shape: 'ellipse', name: 'Foto (Platzhalter)', w: cm(3.6), h: cm(3.6), x: G.ml + sc.x + (sc.w - cm(3.6)) / 2, y: G.mt, page: 0, wrap: 'topbottom', fill: '#c5d1e6', stroke: '#ffffff', strokeW: 3,
      text: '<p style="text-align:center;margin:0;font-size:10pt">Foto<br>(Bild einfügen)</p>', valign: 'middle', color: SIDE, wrapDist: 8,
    });
    d.floats = [photo];
    const sidebar =
      sideH('KONTAKT') + sideP('Musterstraße 12<br>12345 Musterstadt') + sideP('+49 170 1234567') + sideP('max.mustermann@email.de') + sideP('linkedin.com/in/max-mustermann') +
      sideH('SPRACHEN') + sideP('Deutsch – Muttersprache') + sideP('Englisch – fließend (C1)') + sideP('Französisch – Grundkenntnisse (A2)') +
      sideH('KENNTNISSE') + sideLi('Projektmanagement') + sideLi('MS Office / Google Workspace') + sideLi('Datenanalyse (Excel, SQL)') + sideLi('Teamführung') +
      sideH('INTERESSEN') + sideP('Fotografie, Laufen, Ehrenamt');
    const main =
      `<p class="s-title" style="font-size:28pt;color:${SIDE};font-weight:bold;margin-bottom:0">Max Mustermann</p>` +
      `<p style="font-size:13pt;color:#5a6b85;margin-bottom:6pt;letter-spacing:1px">PROJEKTLEITER · BERLIN</p>` +
      mainH('PROFIL') + '<p>Engagierter Projektleiter mit mehr als acht Jahren Erfahrung in der Steuerung interdisziplinärer Teams. Stark in strukturierter Planung, klarer Kommunikation und dem Erreichen messbarer Ergebnisse.</p>' +
      mainH('BERUFSERFAHRUNG') +
      job('Senior Projektleiter', 'Beispiel GmbH, Berlin', '2019 – heute', ['Leitung von Projekten mit bis zu 15 Mitarbeitenden und 2 Mio. € Budget', 'Einführung agiler Methoden, 30 % kürzere Durchlaufzeiten']) +
      job('Projektleiter', 'Muster AG, Hamburg', '2015 – 2019', ['Koordination der Softwareeinführung in 6 Standorten', 'Schulung und Betreuung der Fachabteilungen']) +
      job('Trainee Projektmanagement', 'Demo & Partner KG, München', '2013 – 2015', ['Mitarbeit in internationalen Kundenprojekten']) +
      mainH('AUSBILDUNG') +
      job('M. Sc. Wirtschaftsinformatik', 'Technische Universität Musterstadt', '2010 – 2013', ['Schwerpunkt: Prozessmanagement, Note 1,6']) +
      job('B. Sc. Betriebswirtschaft', 'Universität Beispielstadt', '2007 – 2010', []) +
      mainH('WEITERBILDUNG') + '<p data-list="b" data-lvl="0" data-fmt="disc" style="--lvl:0">PMP-Zertifizierung (2018)</p><p data-list="b" data-lvl="0" data-fmt="disc" style="--lvl:0">Scrum Master (PSM I, 2017)</p>';
    return { doc: d, html: side === 'left' ? sidebar + brk('column') + main : main + brk('column') + sidebar };
  }

  const THUMB_BASE = 'position:absolute;inset:0;background:#fff;';
  const bar = (x, y, w, c) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:4px;background:${c || '#bbb'}"></div>`;
  const lines = (x, y0, w, n, c) => Array.from({ length: n }, (_, i) => bar(x, y0 + i * 9, w - (i % 3 === 2 ? 18 : 0), c)).join('');

  T.list = [
    { id: 'blank', name: 'Leeres Dokument', desc: 'Ein leeres Dokument mit A4-Seite', thumb: `<div style="${THUMB_BASE}">${lines(16, 18, 118, 14)}</div>` },
    { id: 'cv-left', name: 'Lebenslauf – schmale linke Spalte', desc: 'Zwei Spalten: links schmal (Kontakt, Kenntnisse), rechts breit', thumb: `<div style="${THUMB_BASE}"><div style="position:absolute;left:0;top:0;bottom:0;width:48px;background:${SIDE}"></div><div style="position:absolute;left:14px;top:14px;width:20px;height:20px;border-radius:50%;background:#c5d1e6"></div>${lines(10, 46, 30, 12, '#8fa6c8')}<div style="position:absolute;left:58px;top:16px;width:70px;height:7px;background:${SIDE}"></div>${lines(58, 34, 80, 6, '#999')}${lines(58, 92, 80, 8, '#bbb')}</div>` },
    { id: 'cv-right', name: 'Lebenslauf – schmale rechte Spalte', desc: 'Zwei Spalten: links breit (Profil, Erfahrung), rechts schmal', thumb: `<div style="${THUMB_BASE}"><div style="position:absolute;right:0;top:0;bottom:0;width:48px;background:${SIDE}"></div><div style="position:absolute;right:14px;top:14px;width:20px;height:20px;border-radius:50%;background:#c5d1e6"></div>${lines(104, 46, 30, 12, '#8fa6c8')}<div style="position:absolute;left:12px;top:16px;width:70px;height:7px;background:${SIDE}"></div>${lines(12, 34, 80, 6, '#999')}${lines(12, 92, 80, 8, '#bbb')}</div>` },
    { id: 'letter', name: 'Brief (DIN-Layout)', desc: 'Geschäftsbrief mit Absender, Empfänger und Betreff', thumb: `<div style="${THUMB_BASE}">${bar(14, 12, 50, '#999')}${bar(14, 34, 40, '#777')}${bar(14, 42, 46, '#777')}${bar(14, 50, 36, '#777')}${bar(90, 34, 44, '#aaa')}<div style="position:absolute;left:14px;top:76px;width:70px;height:5px;background:#444"></div>${lines(14, 92, 118, 8)}</div>` },
    { id: 'report', name: 'Bericht', desc: 'Titelseite, Überschriften, Inhaltsverzeichnis', thumb: `<div style="${THUMB_BASE}"><div style="position:absolute;left:14px;top:40px;width:90px;height:10px;background:#2f5496"></div>${bar(14, 58, 60, '#999')}${bar(14, 130, 50, '#bbb')}</div>` },
    { id: 'newsletter', name: 'Newsletter (zwei Spalten)', desc: 'Titel über die volle Breite, darunter zwei gleich breite Spalten', thumb: `<div style="${THUMB_BASE}"><div style="position:absolute;left:12px;top:12px;width:126px;height:14px;background:#2f5496"></div>${lines(12, 38, 58, 14)}${lines(80, 38, 58, 14)}</div>` },
  ];

  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

  function build(id) {
    const d = W.defaultDoc();
    if (id === 'cv-left' || id === 'cv-right') return cvDoc(id === 'cv-left' ? 'left' : 'right');
    if (id === 'letter') {
      d.title = 'Brief';
      d.page.t = u.cm2px(2.0);
      return {
        doc: d, html:
          '<p style="font-size:8pt;color:#666;margin-bottom:0;border-bottom:1px solid #999;width:8cm">Max Mustermann · Musterstraße 12 · 12345 Musterstadt</p>' +
          '<p style="margin-top:14pt;margin-bottom:0">Firma Beispiel GmbH</p><p style="margin-bottom:0">Frau Erika Beispiel</p><p style="margin-bottom:0">Beispielweg 5</p><p>54321 Beispielstadt</p>' +
          '<p style="text-align:right;margin-top:24pt">Musterstadt, 1. Januar 2026</p>' +
          '<p style="margin-top:12pt"><b>Betreff: Ihre Anfrage vom 15. Dezember 2025</b></p>' +
          '<p>Sehr geehrte Frau Beispiel,</p><p>' + lorem + '</p><p>' + lorem + '</p><p>Mit freundlichen Grüßen</p><p style="margin-top:30pt">Max Mustermann</p>',
      };
    }
    if (id === 'report') {
      d.title = 'Bericht';
      return {
        doc: d, html:
          '<p class="s-title" style="margin-top:120pt">Titel des Berichts</p><p class="s-subtitle">Untertitel · Autor · Datum</p>' + brk('page') +
          '<h1>Einleitung</h1><p>' + lorem + '</p><h2>Hintergrund</h2><p>' + lorem + '</p><h1>Methodik</h1><p>' + lorem + '</p><h2>Vorgehen</h2><p>' + lorem + '</p><h1>Ergebnisse</h1><p>' + lorem + '</p><h1>Fazit</h1><p>' + lorem + '</p>',
      };
    }
    if (id === 'newsletter') {
      d.title = 'Newsletter';
      d.page.l = d.page.r = u.cm2px(1.8);
      const two = { n: 2, w: [1, 1], gap: u.cm2px(0.9), rule: true, bg: [null, null, null], bleed: true };
      return {
        doc: d, html:
          '<h1 style="font-size:28pt;text-align:center;color:#2f5496;margin-bottom:2pt">Unser Newsletter</h1><p style="text-align:center;color:#666">Ausgabe 1 · Januar 2026</p>' +
          `<p class="brk" data-brk="sect" contenteditable="false" data-cols='${JSON.stringify(two)}'><br></p>` +
          '<h2>Neues aus dem Team</h2><p>' + lorem + '</p><p>' + lorem + '</p><h2>Termine</h2><p>' + lorem + '</p><h2>Rückblick</h2><p>' + lorem + '</p><p>' + lorem + '</p>',
      };
    }
    return { doc: d, html: '<p><br></p>' };
  }

  T.open = function (id) {
    const t = build(id);
    W.loadDocument(t.doc, t.html, {});
    if (W.floats.resolvePending) W.floats.resolvePending();
    W.layout.run();
    W.history.reset();
    const ws = W.el.workspace;
    if (ws.clientWidth < W.geom().pw + 60) W.view.fitWidth(); else W.view.setZoom(1, false);
  };
  T.openBlank = function () { W.loadDocument(W.defaultDoc(), '<p><br></p>', { noFocus: true }); };
})();
