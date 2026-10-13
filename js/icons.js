/* Wohni Writer – Symbole (SVG, 24×24, currentColor) */
(function () {
  'use strict';
  const W = window.W;

  const t = (txt, o) => {
    o = o || {};
    return `<text x="${o.x || 12}" y="${o.y || 17}" text-anchor="middle" font-size="${o.s || 16}" font-weight="${o.w || 700}" font-family="${o.f || 'Georgia,serif'}" fill="currentColor" stroke="none"${o.st ? ' ' + o.st : ''}>${txt}</text>`;
  };
  const lines = (ys, x1, x2) => ys.map((y) => `<path d="M${x1} ${y}H${x2}"/>`).join('');

  const I = {
    /* Datei */
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="6" rx="1"/>',
    saveas: '<path d="M5 4h11l3 3v6"/><path d="M5 4v16h8"/><path d="M8 4v5h7V4"/><path d="M15 21l1-4 5-5 2 2-5 5z"/>',
    open: '<path d="M3 7a1 1 0 011-1h5l2 2h8a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>',
    new: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><rect x="7" y="14" width="10" height="6"/>',
    undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-3" transform="translate(0 -5)"/>',
    redo: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a5 5 0 000 10h3" transform="translate(0 -5)"/>',
    pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M8.5 16h1.5a1.2 1.2 0 000-2.4H8.5V18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    /* Zwischenablage */
    paste: '<rect x="5" y="5" width="14" height="16" rx="1.5"/><path d="M9 5V3.5h6V5"/><rect x="9" y="3" width="6" height="4" rx="1"/>',
    cut: '<circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M8.5 15L17 4M15.5 15L7 4"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M5 16V5a1 1 0 011-1h9"/>',
    painter: '<rect x="4" y="4" width="13" height="6" rx="1.5"/><path d="M17 7h3v5h-8v3"/><rect x="10" y="15" width="4" height="6" rx="1"/>',
    /* Schrift */
    bold: t('B', { w: 800 }),
    italic: t('I', { w: 400, st: 'font-style="italic"' }),
    underline: t('U', { y: 15.5 }) + '<path d="M6 20h12"/>',
    strike: t('S', { w: 600 }) + '<path d="M4 12.5h16"/>',
    sub: t('X', { x: 9, y: 16, s: 14, w: 600 }) + t('2', { x: 18, y: 21, s: 10, w: 700 }),
    sup: t('X', { x: 9, y: 19, s: 14, w: 600 }) + t('2', { x: 18, y: 10, s: 10, w: 700 }),
    fontcolor: t('A', { x: 12, y: 15.5, s: 15, f: 'Segoe UI,Arial,sans-serif' }) + '<rect x="4" y="18" width="16" height="3.2" fill="var(--c, #e00)" stroke="none"/>',
    highlight: '<path d="M14 4l6 6-8 8H8l-4-4z"/><path d="M8 18H4v-2"/><rect x="3" y="20" width="18" height="2.5" fill="var(--c, #ff0)" stroke="none"/>',
    clear: '<path d="M15 4l5 5-9 11H7l-4-4z"/><path d="M8 11l5 5"/><path d="M4 21h8"/>',
    grow: t('A', { x: 9, y: 19, s: 16, f: 'Segoe UI,Arial,sans-serif' }) + '<path d="M17 11V5M14.5 7.5L17 5l2.5 2.5"/>',
    shrink: t('A', { x: 9, y: 19, s: 13, f: 'Segoe UI,Arial,sans-serif' }) + '<path d="M17 5v6M14.5 8.5L17 11l2.5-2.5"/>',
    casing: t('Aa', { s: 15, f: 'Segoe UI,Arial,sans-serif', w: 600, y: 17 }),
    font: t('A', { s: 18, f: 'Segoe UI,Arial,sans-serif', w: 600 }),
    fontdlg: '<rect x="4" y="4" width="16" height="16" rx="2"/>' + t('A', { s: 12, y: 16.5, f: 'Segoe UI,Arial,sans-serif' }),
    /* Absatz */
    bullets: '<circle cx="5" cy="7" r="1.3" fill="currentColor"/><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="5" cy="17" r="1.3" fill="currentColor"/>' + lines([7, 12, 17], 9, 20),
    numbering: lines([7, 12, 17], 10, 20) + t('1', { x: 5, y: 9, s: 7, w: 700, f: 'Segoe UI,Arial,sans-serif' }) + t('2', { x: 5, y: 14, s: 7, w: 700, f: 'Segoe UI,Arial,sans-serif' }) + t('3', { x: 5, y: 19, s: 7, w: 700, f: 'Segoe UI,Arial,sans-serif' }),
    multilevel: lines([6, 11, 16, 21], 11, 20) + '<path d="M4 6h4M6 11h3M8 16h1"/>',
    outdent: lines([6, 18], 4, 20) + lines([10, 14], 12, 20) + '<path d="M8 9l-4 3 4 3z" fill="currentColor"/>',
    indent: lines([6, 18], 4, 20) + lines([10, 14], 12, 20) + '<path d="M4 9l4 3-4 3z" fill="currentColor"/>',
    alignLeft: lines([6, 10, 14, 18], 4, 20).replace('M4 10H20', 'M4 10H14').replace('M4 18H20', 'M4 18H14'),
    alignCenter: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    alignRight: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    alignJustify: lines([6, 10, 14, 18], 4, 20),
    linespacing: '<path d="M9 6h11M9 12h11M9 18h11M5 5v14M3 7l2-2 2 2M3 17l2 2 2-2"/>',
    shading: '<path d="M5 12l7-8 7 8-7 7z"/><path d="M19 15c0 0 2 2.2 2 3.5a2 2 0 01-4 0c0-1.3 2-3.5 2-3.5z" fill="currentColor"/><rect x="3" y="20.5" width="18" height="2.5" fill="var(--c, #fff)" stroke="none"/>',
    borders: '<rect x="4" y="4" width="16" height="16"/><path d="M4 12h16M12 4v16" stroke-dasharray="2 2"/>',
    pilcrow: t('¶', { s: 18, f: 'Segoe UI,Arial,sans-serif', w: 600 }),
    sort: '<path d="M8 4v16M5 17l3 3 3-3M15 6h5M15 12h4M15 18h3"/>',
    /* Bearbeiten */
    find: '<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>',
    replace: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
    selectall: '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/><path d="M8 12h8M8 8h8M8 16h5"/>',
    /* Einfügen */
    pagebreak: '<path d="M6 3h12v7H6z" /><path d="M6 14h12v7H6z"/><path d="M2 12h20" stroke-dasharray="3 2"/>',
    blankpage: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    cover: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    table: '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M3.5 10h17M3.5 14.5h17M9.5 5v14M15 5v14"/>',
    picture: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.7"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    shapes: '<circle cx="9" cy="9" r="5"/><path d="M13 13h7v7h-7z"/>',
    textbox: '<rect x="4" y="5" width="16" height="14" rx="1"/>' + t('A', { s: 11, y: 15.5, f: 'Segoe UI,Arial,sans-serif' }),
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    header: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 8h16"/><path d="M7 5.5h6" />',
    footer: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 16h16"/><path d="M7 18.5h6"/>',
    pagenumber: '<rect x="4" y="3" width="16" height="18" rx="1"/>' + t('#', { s: 11, y: 16.5, f: 'Segoe UI,Arial,sans-serif' }),
    symbol: t('Ω', { s: 18, f: 'Segoe UI,Arial,sans-serif', w: 600 }),
    calendar: '<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    hline: '<path d="M3 12h18"/><path d="M6 7h12M6 17h12" stroke-dasharray="1.5 2.5"/>',
    toc: lines([6, 10, 14, 18], 8, 20) + '<path d="M4 6h1.5M4 10h1.5M4 14h1.5M4 18h1.5"/>',
    watermark: t('W', { s: 14, f: 'Segoe UI,Arial,sans-serif', w: 700, st: 'transform="rotate(-25 12 12)" opacity=".8"' }) + '<rect x="3.5" y="4" width="17" height="16" rx="1"/>',
    pagecolor: '<path d="M6 3h8l4 4v14H6z"/><path d="M10 15a2 2 0 004 0c0-1.4-2-4-2-4s-2 2.6-2 4z" fill="currentColor"/>',
    pageborder: '<rect x="4" y="3" width="16" height="18"/><rect x="7" y="6" width="10" height="12" stroke-dasharray="2 2"/>',
    equation: t('π', { s: 17, f: 'Georgia,serif', w: 400 }),
    break: '<path d="M4 8h16M4 16h16"/><path d="M2 12h20" stroke-dasharray="2 2"/>',
    bookmark: '<path d="M7 3h10v18l-5-4-5 4z"/>',
    comment: '<path d="M4 5h16v11H11l-4 4v-4H4z"/>',
    /* Layout */
    margins: '<rect x="4" y="3" width="16" height="18"/><rect x="7" y="6" width="10" height="12" stroke-dasharray="2 2"/>',
    orientation: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M3 12h2M19 12h2" />',
    pagesize: '<path d="M6 3h8l4 4v14H6z"/><path d="M3 8v8M2 10l1-2 1 2M2 14l1 2 1-2"/>',
    cols1: '<rect x="4" y="3" width="16" height="18" rx="1"/>' + lines([7, 11, 15], 7, 17),
    cols2: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 6v12"/>' + lines([8, 12, 16], 6.5, 10.5) + lines([8, 12, 16], 13.5, 17.5),
    cols3: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9.5 6v12M14.5 6v12"/>',
    colsLeft: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9.5 6v12"/>' + lines([8, 12, 16], 5.5, 8.2) + lines([8, 12, 16], 11, 18),
    colsRight: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M14.5 6v12"/>' + lines([8, 12, 16], 6, 13) + lines([8, 12, 16], 15.8, 18.5),
    columnbreak: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18" stroke-dasharray="2 2"/>',
    wrapInline: '<rect x="5" y="9" width="6" height="6" fill="currentColor" stroke="none"/>' + lines([7, 11, 13, 17], 4, 20).replace('M4 11H20', 'M13 11H20').replace('M4 13H20', 'M13 13H20'),
    wrapSquare: '<rect x="9" y="8" width="7" height="8" fill="currentColor" stroke="none" opacity=".75"/>' + '<path d="M4 6h16M4 10h3M18 10h2M4 14h3M18 14h2M4 18h16"/>',
    wrapBehind: lines([7, 10, 13, 16, 19], 4, 20) + '<rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" stroke="none" opacity=".35"/>',
    wrapFront: lines([7, 10, 13, 16, 19], 4, 20) + '<rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" stroke="var(--bg, #fff)" stroke-width="1.5"/>',
    wrapTopBottom: '<path d="M4 5h16M4 8h16"/><rect x="8" y="10" width="8" height="4" fill="currentColor" stroke="none"/><path d="M4 16h16M4 19h16"/>',
    bringFront: '<rect x="4" y="4" width="10" height="10" rx="1" opacity=".5"/><rect x="10" y="10" width="10" height="10" rx="1" fill="currentColor" fill-opacity=".25"/>',
    sendBack: '<rect x="10" y="10" width="10" height="10" rx="1" opacity=".5"/><rect x="4" y="4" width="10" height="10" rx="1" fill="currentColor" fill-opacity=".25"/>',
    forward: '<rect x="4" y="9" width="11" height="11" rx="1" opacity=".5"/><rect x="9" y="4" width="11" height="11" rx="1" fill="currentColor" fill-opacity=".25"/>',
    backward: '<rect x="9" y="4" width="11" height="11" rx="1" opacity=".5"/><rect x="4" y="9" width="11" height="11" rx="1" fill="currentColor" fill-opacity=".25"/>',
    alignObjs: '<path d="M4 4v16"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>',
    rotate: '<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/>',
    flip: '<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 7L4 17h5zM15 7l5 10h-5z"/>',
    selpane: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    fill: '<path d="M5 12l7-8 7 8-7 7z"/><path d="M19 15s2 2.2 2 3.5a2 2 0 01-4 0c0-1.3 2-3.5 2-3.5z" fill="currentColor"/>',
    outline: '<rect x="5" y="5" width="14" height="14" rx="2" stroke-width="2.5"/>',
    effects: '<rect x="5" y="5" width="12" height="12" rx="1"/><path d="M9 20h11V9" opacity=".5"/>',
    /* Tabelle */
    rowAbove: '<rect x="4" y="11" width="16" height="9" rx="1"/><path d="M4 15.5h16M12 11v9"/><path d="M12 3v5M9.5 5.5h5"/>',
    rowBelow: '<rect x="4" y="4" width="16" height="9" rx="1"/><path d="M4 8.5h16M12 4v9"/><path d="M12 16v5M9.5 18.5h5"/>',
    colLeft: '<rect x="11" y="4" width="9" height="16" rx="1"/><path d="M15.5 4v16M11 12h9"/><path d="M3 12h5M5.5 9.5v5"/>',
    colRight: '<rect x="4" y="4" width="9" height="16" rx="1"/><path d="M8.5 4v16M4 12h9"/><path d="M16 12h5M18.5 9.5v5"/>',
    delRow: '<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M4 12h16"/><path d="M8 9l8 6M16 9l-8 6" stroke="#c00"/>',
    delCol: '<rect x="6" y="4" width="12" height="16" rx="1"/><path d="M12 4v16"/><path d="M9 8l6 8M15 8l-6 8" stroke="#c00"/>',
    delTable: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 10h16M10 5v14"/><path d="M7 7l10 10M17 7L7 17" stroke="#c00"/>',
    merge: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 12h5M15 12h5M12 5v3M12 16v3"/><path d="M9.5 10l2.500 2-2.500 2M14.500 10l-2.500 2 2.500 2"/>',
    split: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M12 5v14" /><path d="M7 10l-2 2 2 2M17 10l2 2-2 2"/>',
    valign: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9h8M8 12h8M8 15h5"/>',
    distribute: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M9.3 5v14M14.7 5v14"/>',
    tablestyle: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.5h16" stroke-width="3"/><path d="M4 14h16M12 9.5v9.5"/>',
    /* Prüfen / Ansicht */
    spell: t('ABC', { s: 8, y: 11, f: 'Segoe UI,Arial,sans-serif', w: 700 }) + '<path d="M5 17l4 4 10-10"/>',
    wordcount: t('123', { s: 8, y: 11, f: 'Segoe UI,Arial,sans-serif', w: 700 }) + lines([15, 19], 5, 19),
    language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    printlayout: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    weblayout: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9h18"/><path d="M6 7h.01M8.500 7h.01"/>',
    ruler: '<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
    navpane: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M5 8h2M5 11h2M5 14h2"/>',
    zoom: '<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5M8 10h4M10 8v4"/>',
    zoom100: '<circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>' + t('1', { x: 10, y: 13, s: 8, w: 700, f: 'Segoe UI,Arial,sans-serif' }),
    pagewidth: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M7 12h10M7 12l2-2M7 12l2 2M17 12l-2-2M17 12l-2 2"/>',
    onepage: '<rect x="7" y="3" width="10" height="18" rx="1"/>',
    moon: '<path d="M20 14.5A8 8 0 019.500 4 8 8 0 1020 14.500z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600L7 7M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 114 2c-1 .8-1.500 1.200-1.500 2.500M12 17v.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    docx: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>' + t('W', { s: 8, y: 17, f: 'Segoe UI,Arial,sans-serif', w: 700 }),
    html: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.500 6l-3 12"/>',
    txt: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15h6M9 18h4"/>',
    template: '<rect x="4" y="3" width="16" height="18" rx="1"/><rect x="6.500" y="5.500" width="4" height="13" fill="currentColor" fill-opacity=".25"/><path d="M12.500 8h5M12.500 11h5M12.500 14h4"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M9 11V8a3 3 0 016 0v3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10 6a9 9 0 0112 6c-.6 1.200-1.500 2.400-2.700 3.400M6.400 7.500C4 9 2 12 2 12s4 7 10 7c1.500 0 2.800-.4 4-1"/>',
    star: '<path d="M12 3l2.600 5.600 6.100.7-4.500 4.200 1.200 6L12 16.500 6.600 19.500l1.200-6L3.300 9.300l6.100-.7z"/>',
  };

  W.icon = function (name, size, cls) {
    const body = I[name];
    if (!body) return '';
    const s = size || 20;
    return `<svg class="ico ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };
  /** Symbol als DOM-Element (für h()-Kinder) */
  W.iconEl = function (name, size, cls) { const e = document.createElement('span'); e.className = 'icow'; e.innerHTML = W.icon(name, size, cls); return e; };
  W.hasIcon = (n) => !!I[n];
})();
