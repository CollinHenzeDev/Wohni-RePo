/* Wohni Writer – DOCX schreiben */
(function () {
  'use strict';
  const W = window.W;
  const u = W.u;
  const D = (W.docx = W.docx || {});

  const X = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const tw = (px) => Math.round(u.px2tw(px));
  const emu = (px) => Math.round(u.px2emu(px));
  const hex6 = (c) => { const h = W.color.hex(c); return h ? h.slice(1).toUpperCase() : null; };

  const NS_DECL = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" mc:Ignorable="w14 wp14"';

  const HL_RGB = { '#ffff00': 'yellow', '#00ff00': 'green', '#00ffff': 'cyan', '#ff00ff': 'magenta', '#0000ff': 'blue', '#ff0000': 'red', '#000080': 'darkBlue', '#008080': 'darkCyan', '#008000': 'darkGreen', '#800080': 'darkMagenta', '#800000': 'darkRed', '#808000': 'darkYellow', '#808080': 'darkGray', '#c0c0c0': 'lightGray', '#000000': 'black' };

  const PRST = { rect: 'rect', roundrect: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', rtriangle: 'rtTriangle', diamond: 'diamond', parallelogram: 'parallelogram', trapezoid: 'trapezoid', pentagon: 'pentagon', hexagon: 'hexagon', octagon: 'octagon', star4: 'star4', star5: 'star5', star6: 'star6', arrowR: 'rightArrow', arrowL: 'leftArrow', arrowU: 'upArrow', arrowD: 'downArrow', chevron: 'chevron', plus: 'mathPlus', heart: 'heart', callout: 'wedgeRectCallout', banner: 'ribbon2', cylinder: 'can', line: 'line', lineDiag: 'line', arrowLine: 'line' };

  /* ------------------------------------------------------------------ */
  /*  Nummerierung                                                        */
  /* ------------------------------------------------------------------ */
  function numberingXml(nums) {
    const absFor = new Map();
    let abs = '', numXml = '';
    let absId = 0;
    nums.forEach((n, key) => {
      const k = n.type + '|' + n.fmt;
      if (!absFor.has(k)) {
        const id = absId++;
        absFor.set(k, id);
        let lv = '';
        for (let l = 0; l < 9; l++) {
          const left = (l + 1) * 720;
          let fmt, text, rpr = '';
          if (n.type === 'b') {
            const set = W.lists.BULLETS[n.fmt] || W.lists.BULLETS.disc;
            const ch = set[l % set.length];
            if (n.fmt === 'disc') {
              const sym = [['', 'Symbol'], ['o', 'Courier New'], ['', 'Wingdings']][l % 3];
              fmt = 'bullet'; text = sym[0]; rpr = `<w:rPr><w:rFonts w:ascii="${sym[1]}" w:hAnsi="${sym[1]}" w:hint="default"/></w:rPr>`;
            } else { fmt = 'bullet'; text = ch; rpr = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:hint="default"/></w:rPr>'; }
          } else {
            const cyc = W.lists.NUM_CYCLES[n.fmt] || W.lists.NUM_CYCLES.decimal;
            if (cyc === 'legal') { fmt = 'decimal'; text = Array.from({ length: l + 1 }, (_, i) => '%' + (i + 1)).join('.') + (l === 0 ? '.' : ''); }
            else { const [kind, suf] = cyc[l % cyc.length]; fmt = kind; text = '%' + (l + 1) + suf; }
          }
          lv += `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${X(text)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>${rpr}</w:lvl>`;
        }
        abs += `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="hybridMultilevel"/>${lv}</w:abstractNum>`;
      }
      const aid = absFor.get(k);
      let over = '';
      if (n.start && n.start !== 1) over = `<w:lvlOverride w:ilvl="${n.startLvl || 0}"><w:startOverride w:val="${n.start}"/></w:lvlOverride>`;
      numXml += `<w:num w:numId="${n.id}"><w:abstractNumId w:val="${aid}"/>${over}</w:num>`;
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NS_DECL}>${abs}${numXml}</w:numbering>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Hauptfunktion                                                       */
  /* ------------------------------------------------------------------ */
  D.export = async function () {
    W.history.flush();
    if (W.hf.editing) W.hf.stop();
    if (W.floats.editing) W.floats.stopEdit();
    W.layout.run();
    const doc = W.doc;
    const G = W.geom();
    const base = doc.base || { font: doc.font || 'Calibri', size: 11, after: 8, ls: 1.08 };
    if (doc.font) base.font = doc.font;

    // Sandbox für berechnete Stile
    const sb = document.createElement('div');
    sb.className = 'doc';
    sb.style.cssText = `position:absolute;left:-12000px;top:0;width:${G.cw}px;visibility:hidden;pointer-events:none`;
    sb.style.setProperty('--base-font', W.fontStack(base.font)); sb.style.setProperty('--base-size', base.size + 'pt');
    sb.style.setProperty('--base-after', (base.after != null ? base.after : 8) + 'pt'); sb.style.setProperty('--base-ls', String(base.ls || 1.08));
    document.body.appendChild(sb);
    const probes = D.makeProbes({ font: base.font, size: base.size, after: base.after, ls: base.ls });

    const st = {
      rels: [], relN: 100, media: new Map(), mediaFiles: [], nums: new Map(), numId: 0, docPrId: 1, zN: 251658240,
      hyperlinks: new Map(), probes, sb, base, G, doc, parts: [],
    };
    st.rel = (type, target, ext) => { const id = 'rId' + (++st.relN); st.rels.push({ id, type, target, ext }); return id; };

    try {
      const clone = W.layout.cleanClone();
      sb.appendChild(clone);
      clone.removeAttribute('contenteditable'); clone.removeAttribute('id');
      clone.style.cssText = 'position:static;width:auto';
      // Seitenindex der logischen Blöcke aus dem Live-Layout
      const live = Array.from(W.el.flow.children).filter((b) => !b.hasAttribute('data-cont'));
      const cblocks = Array.from(clone.children);
      const pageOf = cblocks.map((b, i) => (live[i] ? (W.layout.pageMap.get(live[i]) || 0) : 0));
      const widthOf = cblocks.map((b, i) => { const l = live[i]; if (!l) return G.cw; const v = parseFloat(l.style.getPropertyValue('--lw')); return v || G.cw; });

      const body = await buildBody(st, cblocks, pageOf, widthOf);
      const hf = await buildHeaderFooter(st);
      const files = [];
      // Dokument
      const sect = sectPrXml(st, st.finalCols, st.lastType, true, hf);
      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS_DECL}>${doc.page.color && doc.page.color.toLowerCase() !== '#ffffff' ? `<w:background w:color="${hex6(doc.page.color)}"/>` : ''}<w:body>${body}${sect}</w:body></w:document>`;
      files.push({ name: '[Content_Types].xml', data: contentTypes(st, hf) });
      files.push({ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` });
      files.push({ name: 'word/document.xml', data: docXml });
      files.push({ name: 'word/styles.xml', data: stylesXml(st) });
      files.push({ name: 'word/numbering.xml', data: numberingXml(st.nums) });
      files.push({ name: 'word/settings.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS_DECL}>${doc.page.color && doc.page.color.toLowerCase() !== '#ffffff' ? '<w:displayBackgroundShape/>' : ''}<w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>` });
      files.push({ name: 'word/fontTable.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts ${NS_DECL}><w:font w:name="${X(base.font)}"/></w:fonts>` });
      hf.parts.forEach((p) => files.push(p));
      st.mediaFiles.forEach((m) => files.push({ name: 'word/media/' + m.name, data: m.data, store: true }));
      const rels = [
        { id: 'rId1', type: 'styles', target: 'styles.xml' }, { id: 'rId2', type: 'numbering', target: 'numbering.xml' },
        { id: 'rId3', type: 'settings', target: 'settings.xml' }, { id: 'rId4', type: 'fontTable', target: 'fontTable.xml' },
      ].concat(st.rels);
      files.push({ name: 'word/_rels/document.xml.rels', data: relsXml(rels) });
      const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
      files.push({ name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(doc.title || '')}</dc:title><dc:creator>${X(doc.author || '')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>` });
      files.push({ name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Wohni Writer</Application></Properties>` });
      return await W.zip.write(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } finally {
      probes.destroy();
      sb.remove();
    }
  };

  function relsXml(rels) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map((r) => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${r.type}" Target="${X(r.target)}"${r.ext ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`;
  }
  function contentTypes(st, hf) {
    let o = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="bmp" ContentType="image/bmp"/>';
    const wml = 'application/vnd.openxmlformats-officedocument.wordprocessingml.';
    o += `<Override PartName="/word/document.xml" ContentType="${wml}document.main+xml"/><Override PartName="/word/styles.xml" ContentType="${wml}styles+xml"/><Override PartName="/word/numbering.xml" ContentType="${wml}numbering+xml"/><Override PartName="/word/settings.xml" ContentType="${wml}settings+xml"/><Override PartName="/word/fontTable.xml" ContentType="${wml}fontTable+xml"/>`;
    hf.parts.forEach((p) => { if (/^word\/header/.test(p.name) && p.name.endsWith('.xml')) o += `<Override PartName="/${p.name}" ContentType="${wml}header+xml"/>`; if (/^word\/footer/.test(p.name) && p.name.endsWith('.xml')) o += `<Override PartName="/${p.name}" ContentType="${wml}footer+xml"/>`; });
    o += '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    return o;
  }

  /* ------------------------------------------------------------------ */
  /*  Formatvorlagen (aus der eigenen CSS-Darstellung)                    */
  /* ------------------------------------------------------------------ */
  const STYLE_DEFS = [
    ['Normal', 'Normal', 'p', '', null], ['Heading1', 'heading 1', 'h1', '', 'Normal'], ['Heading2', 'heading 2', 'h2', '', 'Normal'], ['Heading3', 'heading 3', 'h3', '', 'Normal'],
    ['Heading4', 'heading 4', 'h4', '', 'Normal'], ['Heading5', 'heading 5', 'h5', '', 'Normal'], ['Heading6', 'heading 6', 'h6', '', 'Normal'],
    ['Title', 'Title', 'p', 's-title', 'Normal'], ['Subtitle', 'Subtitle', 'p', 's-subtitle', 'Normal'], ['Quote', 'Quote', 'p', 's-quote', 'Normal'], ['IntenseQuote', 'Intense Quote', 'p', 's-iquote', 'Normal'],
    ['NoSpacing', 'No Spacing', 'p', 's-nospace', 'Normal'], ['Caption', 'caption', 'p', 's-caption', 'Normal'], ['Code', 'Code', 'p', 's-code', 'Normal'],
    ['TOCHeading', 'TOC Heading', 'p', 's-tochead', 'Normal'], ['TOC1', 'toc 1', 'p', 's-toc1', 'Normal'], ['TOC2', 'toc 2', 'p', 's-toc2', 'Normal'], ['TOC3', 'toc 3', 'p', 's-toc3', 'Normal'],
  ];
  function styleIdFor(el) {
    const t = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return 'Heading' + t[1];
    const c = Array.from(el.classList).find((x) => x.startsWith('s-'));
    const m = { 's-title': 'Title', 's-subtitle': 'Subtitle', 's-quote': 'Quote', 's-iquote': 'IntenseQuote', 's-nospace': 'NoSpacing', 's-caption': 'Caption', 's-code': 'Code', 's-tochead': 'TOCHeading', 's-toc1': 'TOC1', 's-toc2': 'TOC2', 's-toc3': 'TOC3' };
    return m[c] || 'Normal';
  }

  function stylesXml(st) {
    const b = st.base;
    const fontX = (f) => `<w:rFonts w:ascii="${X(f)}" w:hAnsi="${X(f)}" w:eastAsia="${X(f)}" w:cs="${X(f)}"/>`;
    let s = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS_DECL}>`;
    s += `<w:docDefaults><w:rPrDefault><w:rPr>${fontX(b.font)}<w:sz w:val="${Math.round(b.size * 2)}"/><w:szCs w:val="${Math.round(b.size * 2)}"/><w:lang w:val="de-DE" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="${Math.round((b.after || 0) * 20)}" w:line="${Math.round((b.ls || 1) * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
    STYLE_DEFS.forEach(([id, name, tag, cls, basedOn]) => {
      const p = st.probes.get(tag, cls, '');
      const normal = st.probes.get('p', '', '');
      let rpr = '';
      // Reihenfolge in pPr: keepNext, keepLines, ..., spacing, ind, jc, outlineLvl
      let pp = '';
      if (id !== 'Normal') {
        if (id.startsWith('Heading') || id === 'Title') pp += '<w:keepNext/><w:keepLines/>';
        const bd = id === 'IntenseQuote' ? '<w:pBdr><w:top w:val="single" w:sz="4" w:space="10" w:color="4472C4"/><w:bottom w:val="single" w:sz="4" w:space="10" w:color="4472C4"/></w:pBdr>' : '';
        pp += bd;
        if (id === 'Code') pp += '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
        if (/^TOC[123]$/.test(id)) pp += '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9060"/></w:tabs>';
        const sp = [];
        if (Math.abs(p.mt - 0) > 0.1 || id.startsWith('Heading')) sp.push(`w:before="${Math.round(p.mt * 20)}"`);
        sp.push(`w:after="${Math.round(p.mb * 20)}"`);
        sp.push(`w:line="${Math.round(p.ls * 240)}" w:lineRule="auto"`);
        pp += `<w:spacing ${sp.join(' ')}/>`;
        const left = Math.round(u.px2tw(p.ml));
        if (left || p.mr) pp += `<w:ind w:left="${left}" w:right="${Math.round(u.px2tw(p.mr))}"/>`;
        if (p.align && p.align !== 'left') pp += `<w:jc w:val="${p.align === 'justify' ? 'both' : p.align}"/>`;
        if (id.startsWith('Heading')) pp += `<w:outlineLvl w:val="${+id.slice(7) - 1}"/>`;
      }
      if (id !== 'Normal') {
        const fam = W.firstFont(p.family);
        const normFam = normal.family;
        if (p.family !== normFam) rpr += `<w:rFonts w:ascii="${X(titleCase(fam))}" w:hAnsi="${X(titleCase(fam))}" w:cs="${X(titleCase(fam))}"/>`;
        if (p.bold) rpr += '<w:b/>'; if (p.italic) rpr += '<w:i/>';
        if (p.color !== normal.color) rpr += `<w:color w:val="${p.color.slice(1).toUpperCase()}"/>`;
        if (id === 'Title') rpr += '<w:spacing w:val="-10"/><w:kern w:val="28"/>';
        if (id === 'Subtitle') rpr += '<w:spacing w:val="15"/>';
        if (Math.abs(p.sizePt - normal.sizePt) > 0.1) rpr += `<w:sz w:val="${Math.round(p.sizePt * 2)}"/><w:szCs w:val="${Math.round(p.sizePt * 2)}"/>`;
      }
      s += `<w:style w:type="paragraph" ${id === 'Normal' ? 'w:default="1" ' : ''}w:styleId="${id}"><w:name w:val="${name}"/>${basedOn ? `<w:basedOn w:val="${basedOn}"/>` : ''}${id !== 'Normal' && !id.startsWith('TOC') ? '<w:next w:val="Normal"/>' : ''}<w:qFormat/>${pp ? `<w:pPr>${pp}</w:pPr>` : ''}${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}</w:style>`;
    });
    s += '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>';
    s += '<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4536"/><w:tab w:val="right" w:pos="9072"/></w:tabs></w:pPr></w:style>';
    s += '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4536"/><w:tab w:val="right" w:pos="9072"/></w:tabs></w:pPr></w:style>';
    s += '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>';
    s += '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>';
    s += '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>';
    s += '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>';
    s += '<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:semiHidden/></w:style>';
    return s + '</w:styles>';
  }
  const titleCase = (f) => String(f).replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

  /* ------------------------------------------------------------------ */
  /*  Body                                                                */
  /* ------------------------------------------------------------------ */
  async function buildBody(st, blocks, pageOf, widthOf) {
    const doc = st.doc;
    // freie Objekte pro Seite → Ankerabsatz bestimmen
    const floats = doc.floats.filter((f) => !f.repeat && !f.hidden);
    const anchors = new Map();   // Blockindex → [floats]
    const paraIdx = blocks.map((b, i) => (b.matches('p:not(.brk):not([data-toc]),h1,h2,h3,h4,h5,h6') ? i : -1)).filter((i) => i >= 0);
    let needLead = false;
    floats.forEach((f) => {
      let target = -1;
      for (const i of paraIdx) { if (pageOf[i] <= f.page) target = i; if (pageOf[i] >= f.page) { if (pageOf[i] === f.page) target = i; break; } }
      if (target < 0) { target = -1; needLead = true; }
      if (!anchors.has(target)) anchors.set(target, []);
      anchors.get(target).push(f);
    });
    let out = '';
    st.finalCols = Object.assign({}, doc.cols);
    let curCols = Object.assign({}, doc.cols);
    st.lastType = 'nextPage';
    let curType = 'nextPage';
    const emitAnchors = async (key) => {
      const list = anchors.get(key);
      if (!list) return '';
      let x = '';
      for (const f of list) x += await floatRunXml(st, f);
      return x;
    };
    if (needLead) {
      const x = await emitAnchors(-1);
      out += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${x}</w:p>`;
    }
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const extra = await emitAnchors(i);
      if (b.matches('p.brk')) {
        const kind = b.getAttribute('data-brk');
        if (kind === 'page') out += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        else if (kind === 'column') out += '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
        else {
          let nc = curCols;
          try { const o = JSON.parse(b.getAttribute('data-cols') || '{}'); nc = Object.assign({}, curCols, o); } catch (e) { /* */ }
          out += `<w:p><w:pPr>${sectPrXml(st, curCols, curType, false, null)}</w:pPr></w:p>`;
          curCols = nc; curType = kind === 'sect' ? 'continuous' : 'nextPage';
        }
        continue;
      }
      if (b.tagName === 'TABLE') out += (await tableXml(st, b, widthOf[i])) + '<w:p><w:pPr><w:spacing w:before="0" w:after="160" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
      else if (b.hasAttribute('data-toc')) out += tocParaXml(st, b, blocks, i);
      else out += await paragraphXml(st, b, { extra });
    }
    st.finalCols = curCols; st.lastType = curType;
    if (!blocks.length) out = '<w:p/>';
    return out;
  }

  function tocParaXml(st, el, blocks, i) {
    const cls = Array.from(el.classList).find((c) => /^s-toc/.test(c));
    const id = cls === 's-tochead' ? 'TOCHeading' : 'TOC' + (cls ? cls.slice(5) : '1');
    const first = !blocks.slice(0, i).some((b) => b.hasAttribute && b.hasAttribute('data-toc'));
    const last = !blocks.slice(i + 1).some((b) => b.hasAttribute && b.hasAttribute('data-toc'));
    const text = el.querySelector('.toctext') ? el.querySelector('.toctext').textContent : el.textContent;
    const num = el.querySelector('.tocnum') ? el.querySelector('.tocnum').textContent : '';
    const wrap = (inner) => inner;
    let runs = `<w:r><w:t xml:space="preserve">${X(text)}</w:t></w:r>`;
    if (num) runs += `<w:r><w:tab/></w:r><w:r><w:t>${X(num)}</w:t></w:r>`;
    if (id === 'TOCHeading') return `<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr>${runs}</w:p>`;
    const tabs = `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${tw(st.G.cw)}"/></w:tabs>`;
    return `<w:p><w:pPr><w:pStyle w:val="${id}"/>${tabs}</w:pPr>${runs}</w:p>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Absätze                                                             */
  /* ------------------------------------------------------------------ */
  const num2 = (n) => Math.round(n * 100) / 100;

  async function paragraphXml(st, el, opts) {
    opts = opts || {};
    const sid = opts.styleId || styleIdFor(el);
    const def = STYLE_DEFS.find((d) => d[0] === sid) || STYLE_DEFS[0];
    const probe = st.probes.get(def[2], def[3], '');
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    let ppr = '';
    const list = el.getAttribute('data-list');
    if (el.getAttribute('data-keep') === '1' && !/^Heading/.test(sid)) ppr += '<w:keepNext/>';
    else if (el.getAttribute('data-keep') === '0' && /^Heading/.test(sid)) ppr += '<w:keepNext w:val="0"/>';
    if (list) {
      const lvl = Math.min(8, parseInt(el.getAttribute('data-lvl') || '0', 10));
      const fmt = el.getAttribute('data-fmt') || (list === 'b' ? 'disc' : 'decimal');
      const lid = list === 'n' ? (el.getAttribute('data-lid') || 'l0') : 'b-' + fmt;
      const key = list + '|' + fmt + '|' + lid;
      let n = st.nums.get(key);
      if (!n) { n = { id: ++st.numId, type: list, fmt, start: parseInt(el.getAttribute('data-start') || '1', 10), startLvl: lvl }; st.nums.set(key, n); }
      ppr += `<w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="${n.id}"/></w:numPr>`;
    }
    // Rahmen
    const sides = [['top', 'Top'], ['left', 'Left'], ['bottom', 'Bottom'], ['right', 'Right']];
    let bd = '';
    sides.forEach(([k, K]) => {
      const bw = parseFloat(cs['border' + K + 'Width']), bs = cs['border' + K + 'Style'];
      if (bs && bs !== 'none' && bw > 0 && !(sid === 'IntenseQuote' && (k === 'top' || k === 'bottom'))) {
        const sp = Math.round(u.px2pt(parseFloat(cs['padding' + K]) || 0));
        bd += `<w:${k} w:val="${bs === 'double' ? 'double' : bs === 'dashed' ? 'dashed' : bs === 'dotted' ? 'dotted' : 'single'}" w:sz="${Math.max(2, Math.round(bw * 6))}" w:space="${sp}" w:color="${hex6(cs['border' + K + 'Color']) || 'auto'}"/>`;
      }
    });
    if (bd) ppr += `<w:pBdr>${bd}</w:pBdr>`;
    const bg = W.color.parse(cs.backgroundColor);
    if (bg && bg.a > 0 && !(sid === 'Code') && !bgFromStyle(def, probe, cs)) ppr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex6(bg)}"/>`;
    // Tabstopps
    const tabsAttr = el.getAttribute('data-tabs');
    if (tabsAttr) { try { const t = JSON.parse(tabsAttr); ppr += `<w:tabs>${t.map((x) => `<w:tab w:val="${{ r: 'right', c: 'center', d: 'decimal', l: 'left' }[x.a] || 'left'}"${x.l ? ` w:leader="${x.l}"` : ''} w:pos="${tw(x.p)}"/>`).join('')}</w:tabs>`; } catch (e) { /* */ } }
    // Abstände
    const mt = u.px2pt(parseFloat(cs.marginTop)), mb = u.px2pt(parseFloat(cs.marginBottom));
    const lhPx = parseFloat(cs.lineHeight);
    const ls = lhPx / fs / 1.22;
    const exact = el.style.lineHeight && /pt|px/.test(el.style.lineHeight);
    const sp = [];
    if (Math.abs(mt - probe.mt) > 0.4) sp.push(`w:before="${Math.round(mt * 20)}"`);
    if (Math.abs(mb - probe.mb) > 0.4) sp.push(`w:after="${Math.round(mb * 20)}"`);
    if (exact) sp.push(`w:line="${Math.round(u.px2pt(lhPx) * 20)}" w:lineRule="exact"`);
    else if (Math.abs(ls - probe.ls) > 0.015) sp.push(`w:line="${Math.round(ls * 240)}" w:lineRule="auto"`);
    if (sp.length) ppr += `<w:spacing ${sp.join(' ')}/>`;
    // Einzug
    const ml = parseFloat(cs.marginLeft) || 0, mr = parseFloat(cs.marginRight) || 0, ti = parseFloat(cs.textIndent) || 0;
    if (list) {
      const lvl = Math.min(8, parseInt(el.getAttribute('data-lvl') || '0', 10));
      const hang = parseFloat(cs.getPropertyValue('--hang')) || 24;
      const want = (lvl + 1) * 48;
      if (Math.abs(ml - want) > 1 || Math.abs(hang - 24) > 1) ppr += `<w:ind w:left="${tw(ml)}" w:hanging="${tw(hang)}"/>`;
    } else {
      const ind = [];
      if (Math.abs(ml - probe.ml) > 0.8) ind.push(`w:left="${tw(ml)}"`);
      if (Math.abs(mr - probe.mr) > 0.8) ind.push(`w:right="${tw(mr)}"`);
      if (Math.abs(ti - probe.ti) > 0.8) ind.push(ti < 0 ? `w:hanging="${tw(-ti)}"` : `w:firstLine="${tw(ti)}"`);
      if (ind.length) ppr += `<w:ind ${ind.join(' ')}/>`;
    }
    const al = cs.textAlign === 'start' ? 'left' : cs.textAlign === 'end' ? 'right' : cs.textAlign;
    if (al !== probe.align) ppr += `<w:jc w:val="${al === 'justify' ? 'both' : al === 'center' ? 'center' : al === 'right' ? 'right' : 'left'}"/>`;
    const pStyle = list && sid === 'Normal' ? 'ListParagraph' : sid;
    ppr = `<w:pStyle w:val="${opts.hf ? (opts.hf === 'header' ? 'Header' : 'Footer') : pStyle}"/>` + ppr;
    // Läufe
    let runs = opts.extra || '';
    const ctx = { st, block: el, probe, sizeBase: fs };
    runs += await childRuns(ctx, el, true);
    return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
  }
  const bgFromStyle = (def, probe, cs) => false;

  /** Kindknoten → Läufe */
  async function childRuns(ctx, el, isBlock) {
    let out = '';
    const nodes = Array.from(el.childNodes);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.nodeType === 3) { out += textRuns(ctx, n); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      if (tag === 'BR') {
        // abschließendes Platzhalter-<br> ignorieren
        const lastOfBlock = isBlock && i === nodes.length - 1;
        if (!lastOfBlock) out += `<w:r>${runProps(ctx, n.parentElement)}<w:br/></w:r>`;
      } else if (tag === 'IMG') out += await inlineImageXml(ctx.st, n);
      else if (n.classList.contains('fld')) {
        const k = n.getAttribute('data-f');
        const instr = { PAGE: ' PAGE ', NUMPAGES: ' NUMPAGES ', DATE: ' DATE ', TIME: ' TIME ' }[k] || ' PAGE ';
        out += `<w:r>${runProps(ctx, n)}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${runProps(ctx, n)}<w:instrText xml:space="preserve">${instr}</w:instrText></w:r><w:r>${runProps(ctx, n)}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${runProps(ctx, n)}<w:t>${X(n.textContent)}</w:t></w:r><w:r>${runProps(ctx, n)}<w:fldChar w:fldCharType="end"/></w:r>`;
      } else if (n.classList.contains('tabc')) out += `<w:r>${runProps(ctx, n)}<w:tab/></w:r>`;
      else if (tag === 'A' && n.getAttribute('href')) {
        const href = n.getAttribute('href');
        let rid;
        if (href.startsWith('#')) { out += `<w:hyperlink w:anchor="${X(href.slice(1))}">${await childRuns(ctx, n, false)}</w:hyperlink>`; continue; }
        if (ctx.st.hyperlinks.has(href)) rid = ctx.st.hyperlinks.get(href); else { rid = ctx.st.rel('hyperlink', href, true); ctx.st.hyperlinks.set(href, rid); }
        out += `<w:hyperlink r:id="${rid}" w:history="1">${await childRuns(ctx, n, false)}</w:hyperlink>`;
      } else out += await childRuns(ctx, n, false);
    }
    return out;
  }

  function textRuns(ctx, node) {
    let t = node.nodeValue.replace(/​/g, '');
    if (!t) return '';
    const el = node.parentElement;
    if (el && el.closest('.fld')) return '';
    const rpr = runProps(ctx, el);
    // Tabs und Zeilenumbrüche
    const parts = t.split(/(\t|\n)/);
    let out = '';
    parts.forEach((p) => {
      if (p === '') return;
      if (p === '\t') out += `<w:r>${rpr}<w:tab/></w:r>`;
      else if (p === '\n') out += `<w:r>${rpr}<w:br/></w:r>`;
      else out += `<w:r>${rpr}<w:t xml:space="preserve">${X(p)}</w:t></w:r>`;
    });
    return out;
  }

  /** Lauf-Eigenschaften als Differenz zur Absatzvorlage */
  function runProps(ctx, el) {
    if (!el) return '';
    const block = ctx.block, probe = ctx.probe;
    const cs = getComputedStyle(el);
    let sup = false, sub = false;
    const decs = new Set();
    let bg = null;
    for (let e = el; e && e !== block.parentElement; e = e.parentElement) {
      const ecs = getComputedStyle(e);
      const dl = ecs.textDecorationLine || ecs.textDecoration || '';
      if (/underline/.test(dl)) decs.add('u'); if (/line-through/.test(dl)) decs.add('s');
      if (!bg && e !== block) { const b = W.color.parse(ecs.backgroundColor); if (b && b.a > 0) bg = b; }
      if (e === block) break;
    }
    const va = cs.verticalAlign;
    if (va === 'super' || /^\s*[\d.]+(px|%|pt)/.test(va) && parseFloat(va) > 0 && el.closest('sup')) sup = true;
    if (va === 'sub' || el.closest('sub')) sub = true;
    if (el.closest('sup')) sup = true;
    let fsPx = parseFloat(cs.fontSize);
    if (sup || sub) {
      // Größe des Elternelements (Word verkleinert hochgestellten Text selbst)
      let e = el; while (e && e !== block && (e.tagName === 'SUP' || e.tagName === 'SUB' || /super|sub/.test(getComputedStyle(e).verticalAlign))) e = e.parentElement;
      fsPx = parseFloat(getComputedStyle(e || block).fontSize);
    }
    const pt = u.px2pt(fsPx);
    let x = '';
    const fam = W.firstFont(cs.fontFamily).toLowerCase();
    if (fam && fam !== probe.family) x += `<w:rFonts w:ascii="${X(titleCase(W.firstFont(cs.fontFamily)))}" w:hAnsi="${X(titleCase(W.firstFont(cs.fontFamily)))}" w:cs="${X(titleCase(W.firstFont(cs.fontFamily)))}"/>`;
    const bold = parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold';
    if (bold !== probe.bold) x += bold ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/><w:bCs w:val="0"/>';
    const ital = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
    if (ital !== probe.italic) x += ital ? '<w:i/><w:iCs/>' : '<w:i w:val="0"/><w:iCs w:val="0"/>';
    if (cs.textTransform === 'uppercase') x += '<w:caps/>';
    if (/small-caps/.test(cs.fontVariantCaps || cs.fontVariant || '')) x += '<w:smallCaps/>';
    if (decs.has('s')) x += '<w:strike/>';
    const col = W.color.hex(cs.color) || '#000000';
    if (col !== probe.color) x += `<w:color w:val="${col.slice(1).toUpperCase()}"/>`;
    const ls = parseFloat(cs.letterSpacing);
    if (ls && isFinite(ls)) x += `<w:spacing w:val="${tw(ls)}"/>`;
    if (Math.abs(pt - probe.sizePt) > 0.25) x += `<w:sz w:val="${Math.round(pt * 2)}"/><w:szCs w:val="${Math.round(pt * 2)}"/>`;
    if (bg) {
      const hx = W.color.hex(bg);
      if (HL_RGB[hx]) x += `<w:highlight w:val="${HL_RGB[hx]}"/>`;
    }
    if (decs.has('u')) {
      const sty = cs.textDecorationStyle;
      x += `<w:u w:val="${sty === 'double' ? 'double' : sty === 'dotted' ? 'dotted' : sty === 'dashed' ? 'dash' : sty === 'wavy' ? 'wave' : 'single'}"/>`;
    }
    if (bg && !HL_RGB[W.color.hex(bg)]) x += `<w:shd w:val="clear" w:color="auto" w:fill="${hex6(bg)}"/>`;
    if (sup) x += '<w:vertAlign w:val="superscript"/>'; else if (sub) x += '<w:vertAlign w:val="subscript"/>';
    if (el.closest('a[href]')) { /* Hyperlink-Stil über Farbe/Unterstreichung bereits enthalten */ }
    return x ? `<w:rPr>${x}</w:rPr>` : '';
  }

  /* ------------------------------------------------------------------ */
  /*  Bilder und Objekte                                                  */
  /* ------------------------------------------------------------------ */
  async function mediaFor(st, src) {
    if (st.media.has(src)) return st.media.get(src);
    let blob = await W.getAssetBlob(src);
    if (!blob) return null;
    let type = blob.type || 'image/png';
    let ext = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/bmp': 'bmp' }[type];
    let w = 0, h = 0;
    if (!ext) {
      // SVG/WebP/AVIF → PNG
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth || 400; cv.height = img.naturalHeight || 300;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
        ext = 'png'; w = cv.width; h = cv.height;
      } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
    }
    const name = 'image' + (st.mediaFiles.length + 1) + '.' + ext;
    st.mediaFiles.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
    const rid = st.rel('image', 'media/' + name);
    const res = { rid, name };
    st.media.set(src, res);
    return res;
  }

  const graphicPic = (st, rid, cx, cy, name, id, extra) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${X(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm${extra && extra.rot ? ` rot="${Math.round(extra.rot * 60000)}"` : ''}${extra && extra.flipH ? ' flipH="1"' : ''}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${extra && extra.ellipse ? 'ellipse' : 'rect'}"><a:avLst/></a:prstGeom>${extra && extra.stroke ? `<a:ln w="${emu(extra.strokeW || 1)}"><a:solidFill><a:srgbClr val="${hex6(extra.stroke)}"/></a:solidFill></a:ln>` : ''}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;

  async function inlineImageXml(st, img) {
    const src = img.getAttribute('src');
    if (!src) return '';
    const m = await mediaFor(st, src);
    if (!m) return '';
    const r = img.getBoundingClientRect();
    const w = parseFloat(img.getAttribute('width')) || parseFloat(img.style.width) || r.width || 100;
    const h = parseFloat(img.getAttribute('height')) || parseFloat(img.style.height) || r.height || 100;
    const id = st.docPrId++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu(w)}" cy="${emu(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Grafik ${id}" descr="${X(img.getAttribute('alt') || '')}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphicPic(st, m.rid, emu(w), emu(h), m.name, id)}</wp:inline></w:drawing></w:r>`;
  }

  /** Verankertes freies Objekt → Lauf mit wp:anchor */
  async function floatRunXml(st, f, inHeader) {
    const id = st.docPrId++;
    const cx = emu(Math.max(1, f.w)), cy = emu(Math.max(f.h, f.kind === 'shape' && st.G ? 0 : 1));
    const behind = f.wrap === 'behind';
    const wrap = f.wrap === 'square' ? '<wp:wrapSquare wrapText="bothSides"/>' : f.wrap === 'topbottom' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
    const dist = emu(f.wrapDist != null ? f.wrapDist : 9);
    // Position relativ zur Seite
    const px = emu(f.x), py = emu(f.y);
    const z = (st.zN += 1024);
    let graphic = '';
    if (f.kind === 'image') {
      const m = await mediaFor(st, f.src);
      if (!m) return '';
      graphic = graphicPic(st, m.rid, cx, cy, m.name, id, { rot: f.rot, flipH: f.flipH, ellipse: String(f.radius) === '50%', stroke: f.stroke, strokeW: f.strokeW });
    } else graphic = await shapeGraphic(st, f, cx, cy);
    return `<w:r><w:drawing><wp:anchor distT="${dist}" distB="${dist}" distL="${dist}" distR="${dist}" simplePos="0" relativeHeight="${z}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${px}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${py}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id}" name="${X(f.name || 'Objekt ' + id)}" descr="${X(f.alt || '')}"/><wp:cNvGraphicFramePr/>${graphic}</wp:anchor></w:drawing></w:r>`;
  }

  async function shapeGraphic(st, f, cx, cy) {
    const prst = PRST[f.shape] || 'rect';
    const def = W.floats.SHAPES[f.shape] || {};
    let fill = '<a:noFill/>';
    if (f.fill && !def.line) fill = `<a:solidFill><a:srgbClr val="${hex6(f.fill)}">${f.fillAlpha != null && f.fillAlpha < 1 ? `<a:alpha val="${Math.round(f.fillAlpha * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>`;
    let ln = '<a:ln><a:noFill/></a:ln>';
    if (f.stroke && f.strokeW > 0) {
      const dash = { dash: 'dash', dot: 'sysDot', dashdot: 'dashDot' }[f.dash];
      ln = `<a:ln w="${emu(f.strokeW)}"><a:solidFill><a:srgbClr val="${hex6(f.stroke)}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}${def.arrow ? '<a:tailEnd type="triangle"/>' : ''}</a:ln>`;
    }
    let tx = '';
    let valign = f.valign === 'middle' ? 'ctr' : f.valign === 'bottom' ? 'b' : 't';
    if (f.kind === 'textbox' || f.text) {
      const holder = document.createElement('div');
      holder.className = 'tbtext';
      holder.innerHTML = f.text || '<p><br></p>';
      st.sb.appendChild(holder);
      let paras = '';
      for (const p of Array.from(holder.children)) {
        if (p.tagName === 'TABLE') paras += await tableXml(st, p, f.w);
        else paras += await paragraphXml(st, p, { styleId: 'Normal', defaultColor: f.color });
      }
      holder.remove();
      if (f.color) paras = paras.replace(/<w:p>(?!<w:pPr>)/g, '<w:p>');
      tx = `<wps:txbx><w:txbxContent>${paras || '<w:p/>'}</w:txbxContent></wps:txbx>`;
    }
    const ins = f.insets || [9.6, 4.8, 9.6, 4.8];
    const bodyPr = `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="${emu(ins[0])}" tIns="${emu(ins[1])}" rIns="${emu(ins[2])}" bIns="${emu(ins[3])}" anchor="${valign}" anchorCtr="0"><a:noAutofit/></wps:bodyPr>`;
    return `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm${f.rot ? ` rot="${Math.round(f.rot * 60000)}"` : ''}${f.flipH ? ' flipH="1"' : ''}${f.flipV ? ' flipV="1"' : ''}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fill}${ln}</wps:spPr>${tx}${bodyPr}</wps:wsp></a:graphicData></a:graphic>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tabellen                                                            */
  /* ------------------------------------------------------------------ */
  async function tableXml(st, table, widthPx) {
    const gr = W.tables.grid(table);
    const nc = gr.nc || 1;
    const cols = table.querySelectorAll(':scope > colgroup > col');
    let fr = Array.from(cols).map((c) => parseFloat(c.style.width) || 0);
    if (fr.length !== nc || fr.some((v) => !v)) fr = Array(nc).fill(100 / nc);
    const sum = fr.reduce((a, b) => a + b, 0);
    const tfrac = parseFloat(table.style.getPropertyValue('--tw')) || 1;
    const total = (widthPx || st.G.cw) * tfrac;
    const colPx = fr.map((v) => v / sum * total);
    let x = '<w:tbl><w:tblPr><w:tblStyle w:val="TableNormal"/>';
    x += `<w:tblW w:w="${tw(total)}" w:type="dxa"/>`;
    const ml = table.style.marginLeft;
    if (ml === 'auto' && table.style.marginRight === 'auto') x += '<w:jc w:val="center"/>';
    else if (ml === 'auto') x += '<w:jc w:val="right"/>';
    else if (parseFloat(ml)) x += `<w:tblInd w:w="${tw(parseFloat(ml))}" w:type="dxa"/>`;
    x += '<w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>';
    x += `<w:tblGrid>${colPx.map((c) => `<w:gridCol w:w="${tw(c)}"/>`).join('')}</w:tblGrid>`;
    for (let r = 0; r < gr.nr; r++) {
      const tr = gr.rows[r];
      x += '<w:tr>';
      const h = parseFloat(tr.style.height);
      if (h) x += `<w:trPr><w:trHeight w:val="${tw(h)}" w:hRule="atLeast"/></w:trPr>`;
      let c = 0;
      while (c < nc) {
        const g = gr.g[r][c];
        if (!g) { x += `<w:tc><w:tcPr><w:tcW w:w="${tw(colPx[c])}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`; c++; continue; }
        if (g.r !== g.r0) {
          // von oben verbunden
          let w = 0; for (let k = 0; k < g.cs; k++) w += colPx[g.c0 + k] || 0;
          x += `<w:tc><w:tcPr><w:tcW w:w="${tw(w)}" w:type="dxa"/>${g.cs > 1 ? `<w:gridSpan w:val="${g.cs}"/>` : ''}<w:vMerge/></w:tcPr><w:p/></w:tc>`;
          c = g.c0 + g.cs; continue;
        }
        const cell = g.cell;
        const cs = getComputedStyle(cell);
        let w = 0; for (let k = 0; k < g.cs; k++) w += colPx[g.c0 + k] || 0;
        let tc = `<w:tcW w:w="${tw(w)}" w:type="dxa"/>`;
        if (g.cs > 1) tc += `<w:gridSpan w:val="${g.cs}"/>`;
        if (g.rs > 1) tc += '<w:vMerge w:val="restart"/>';
        let bd = '';
        [['top', 'Top'], ['left', 'Left'], ['bottom', 'Bottom'], ['right', 'Right']].forEach(([k, K]) => {
          const bw = parseFloat(cs['border' + K + 'Width']), bs = cs['border' + K + 'Style'];
          if (bs && bs !== 'none' && bw > 0) bd += `<w:${k} w:val="${bs === 'double' ? 'double' : bs === 'dashed' ? 'dashed' : bs === 'dotted' ? 'dotted' : 'single'}" w:sz="${Math.max(2, Math.round(bw * 6))}" w:space="0" w:color="${hex6(cs['border' + K + 'Color']) || 'auto'}"/>`;
          else bd += `<w:${k} w:val="nil"/>`;
        });
        tc += `<w:tcBorders>${bd}</w:tcBorders>`;
        const bg = W.color.parse(cs.backgroundColor);
        if (bg && bg.a > 0) tc += `<w:shd w:val="clear" w:color="auto" w:fill="${hex6(bg)}"/>`;
        const pads = ['Top', 'Left', 'Bottom', 'Right'].map((K) => [K, parseFloat(cs['padding' + K]) || 0]);
        const defPad = { Top: 0, Left: 7.2, Bottom: 0, Right: 7.2 };
        if (pads.some(([K, v]) => Math.abs(v - defPad[K]) > 0.8)) tc += `<w:tcMar>${pads.map(([K, v]) => `<w:${K.toLowerCase()} w:w="${tw(v)}" w:type="dxa"/>`).join('')}</w:tcMar>`;
        const va = cs.verticalAlign; if (va === 'middle') tc += '<w:vAlign w:val="center"/>'; else if (va === 'bottom') tc += '<w:vAlign w:val="bottom"/>';
        let inner = '';
        for (const ch of Array.from(cell.children)) {
          if (ch.tagName === 'TABLE') inner += await tableXml(st, ch, w);
          else if (ch.matches('p,h1,h2,h3,h4,h5,h6')) inner += await paragraphXml(st, ch, {});
        }
        if (!inner || !/<\/w:p>$|<w:p\/>$/.test(inner)) inner += '<w:p/>';
        x += `<w:tc><w:tcPr>${tc}</w:tcPr>${inner}</w:tc>`;
        c = g.c0 + g.cs;
      }
      x += '</w:tr>';
    }
    return x + '</w:tbl>';
  }

  /* ------------------------------------------------------------------ */
  /*  Abschnitt, Kopf-/Fußzeile                                           */
  /* ------------------------------------------------------------------ */
  function colsXml(c) {
    const n = Math.max(1, c.n | 0);
    if (n === 1) return '<w:cols w:space="720"/>';
    const G = W.geom();
    const geo = W.colGeom(c, G.cw);
    const equal = geo.every((g) => Math.abs(g.w - geo[0].w) < 0.5);
    let x = `<w:cols w:num="${n}" w:space="${tw(c.gap)}"${c.rule ? ' w:sep="1"' : ''} w:equalWidth="${equal ? 1 : 0}">`;
    if (!equal) x += geo.map((g, i) => `<w:col w:w="${tw(g.w)}"${i < n - 1 ? ` w:space="${tw(c.gap)}"` : ''}/>`).join('');
    return x + '</w:cols>';
  }
  function sectPrXml(st, cols, type, isFinal, hf) {
    const p = st.doc.page;
    let x = '<w:sectPr>';
    if (hf) x += hf.refs;
    if (!isFinal || type === 'continuous') x += type === 'continuous' ? '<w:type w:val="continuous"/>' : '';
    x += `<w:pgSz w:w="${tw(Math.min(p.w, p.h) === p.w ? p.w : p.w)}" w:h="${tw(p.h)}"${p.w > p.h ? ' w:orient="landscape"' : ''}/>`;
    x += `<w:pgMar w:top="${tw(p.t)}" w:right="${tw(p.r)}" w:bottom="${tw(p.b)}" w:left="${tw(p.l)}" w:header="${tw(p.hdist)}" w:footer="${tw(p.fdist)}" w:gutter="0"/>`;
    const pb = st.doc.pageBorder;
    if (pb) {
      const v = { solid: 'single', dashed: 'dashed', dotted: 'dotted', double: 'double' }[pb.style] || 'single';
      const e = (k) => `<w:${k} w:val="${v}" w:sz="${Math.max(2, Math.round(pb.width * 6))}" w:space="${Math.round(u.px2pt(pb.offset))}" w:color="${hex6(pb.color) || 'auto'}"/>`;
      x += `<w:pgBorders w:offsetFrom="page">${e('top')}${e('left')}${e('bottom')}${e('right')}</w:pgBorders>`;
    }
    x += colsXml(cols);
    if (st.doc.diffFirst && isFinal) x += '<w:titlePg/>';
    return x + '</w:sectPr>';
  }

  const WATERMARK = (text, color, sizePx, opacity) => `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype><v:shape id="PowerPlusWaterMarkObject1" o:spid="_x0000_s2049" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:${Math.round(u.px2pt(sizePx * Math.max(2, text.length) * 0.62))}pt;height:${Math.round(u.px2pt(sizePx))}pt;rotation:315;z-index:-251658752;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="${W.color.hex(color) || '#c0c0c0'}" stroked="f"><v:fill opacity="${opacity}"/><v:textpath style="font-family:&quot;Calibri&quot;;font-size:1pt" string="${X(text)}"/></v:shape></w:pict></w:r></w:p>`;

  async function buildHeaderFooter(st) {
    const doc = st.doc, G = st.G;
    const parts = []; let refs = '';
    const kinds = [['header', doc.header, 'default'], ['footer', doc.footer, 'default']];
    if (doc.diffFirst) { kinds.push(['header', doc.firstHeader, 'first'], ['footer', doc.firstFooter, 'first']); }
    // Wiederholte Objekte (Seitenspalten-Hintergründe, Kopfzeilen-Formen) kommen in die Standard-Kopfzeile
    const repeated = doc.floats.filter((f) => f.repeat && !f.hidden);
    const colBgs = [];
    if (doc.cols.n > 1) {
      const geo = W.colGeom(doc.cols, G.cw);
      geo.forEach((c, ci) => {
        const bg = doc.cols.bg && doc.cols.bg[ci];
        if (!bg) return;
        const half = doc.cols.gap / 2;
        const x0 = G.ml + c.x - (ci === 0 ? (doc.cols.bleed ? G.ml : half) : half);
        const x1 = G.ml + c.x + c.w + (ci === geo.length - 1 ? (doc.cols.bleed ? G.mr : half) : half);
        colBgs.push(W.floats.create('shape', { shape: 'rect', x: x0, y: 0, w: x1 - x0, h: G.ph, fill: bg, stroke: null, strokeW: 0, wrap: 'behind', name: 'Spaltenhintergrund ' + (ci + 1) }));
      });
    }
    const needDefaultHeader = repeated.length || colBgs.length || doc.watermark;
    let n = { header: 0, footer: 0 };
    for (const [kind, html, type] of kinds) {
      const hasContent = html && html.trim();
      const forceDefault = kind === 'header' && type === 'default' && needDefaultHeader;
      if (!hasContent && !forceDefault) continue;
      const holder = document.createElement('div');
      holder.className = 'hfbox'; holder.innerHTML = html || '';
      st.sb.appendChild(holder);
      let body = '';
      let extra = '';
      if (kind === 'header' && type === 'default') {
        for (const f of colBgs.concat(repeated)) extra += await floatRunXml(st, f, true);
        if (doc.watermark && doc.watermark.text) body += WATERMARK(doc.watermark.text, doc.watermark.color, doc.watermark.size || 110, doc.watermark.opacity != null ? doc.watermark.opacity : 0.5);
      }
      const els = Array.from(holder.children);
      let first = true;
      for (const el of els) {
        if (el.tagName === 'TABLE') body += await tableXml(st, el, G.cw);
        else { body += await paragraphXml(st, el, { hf: kind, extra: first ? extra : '' }); if (first) extra = ''; }
        first = false;
      }
      if (extra) body = `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr>${extra}</w:p>` + body;
      if (!body) body = '<w:p/>';
      holder.remove();
      n[kind]++;
      const name = `${kind}${n[kind]}.xml`;
      const root = kind === 'header' ? 'w:hdr' : 'w:ftr';
      parts.push({ name: 'word/' + name, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${root} ${NS_DECL}>${body}</${root}>` });
      const rid = st.rel(kind, name);
      refs += `<w:${kind}Reference w:type="${type}" r:id="${rid}"/>`;
    }
    return { parts, refs };
  }
})();
