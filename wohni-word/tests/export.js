// Exportiert ein reiches Testdokument aus dem Editor nach <outdir>/export.docx
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8z8Dwn4EIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC';
  const b64 = await page.evaluate(async (png) => {
    const html = `<h1>Überschrift Eins</h1><p>Normaler Text mit <b>fett</b>, <i>kursiv</i>, <u>unterstrichen</u>, <s>durch</s>, <span style="color:#ff0000">rot</span>, <span style="background-color:#ffff00">gelb</span>, <span style="font-size:20pt;font-family:Arial">groß Arial</span> und <a href="https://example.com">ein Link</a>. H<sub>2</sub>O und x<sup>2</sup>.</p>
<p style="text-align:center">zentriert</p><p style="text-align:right;line-height:2">rechts, doppelter Zeilenabstand</p><p style="margin-left:36pt">eingerückt</p>
<h2>Listen</h2><ul><li>Punkt A</li><li>Punkt B<ul><li>Unterpunkt</li></ul></li></ul><ol><li>Eins</li><li>Zwei</li></ol><ol style="list-style-type:upper-roman" start="3"><li>Römisch</li></ol>
<h2>Tabelle</h2><table style="width:100%"><tbody><tr><td><p>A1</p></td><td colspan="2"><p>B1 (verbunden)</p></td></tr><tr><td rowspan="2" style="background-color:#ffff99"><p>A2 (2 Zeilen)</p></td><td><p>B2</p></td><td><p>C2</p></td></tr><tr><td><p>B3</p></td><td><p>C3</p></td></tr></tbody></table><p><br></p>
<p>Bild: <img src="data:image/png;base64,${png}" width="100" height="100"></p>
<div class="pagebreak" contenteditable="false"></div><p class="title">Titel</p><p class="subtitle">Untertitel</p><p class="quote">Ein Zitat</p><p>Letzter Absatz mit Umlauten äöüß € „Anführungszeichen“.</p>`;
    window.__wohni.setDocument({ html, header: '<p>Kopf</p>', footer: '<p style="text-align:center">Seite <span class="pagenum" contenteditable="false">1</span></p>' }, 'Test', null);
    const blob = await window.__wohni.buildDocx();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (const b of buf) s += String.fromCharCode(b);
    return btoa(s);
  }, png);
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('written', out, fs.statSync(out).size, 'errors', errors);
  await browser.close();
})();
