#!/usr/bin/env node
// Erzeugt aus index.html + style.css + JS eine einzige, eigenständige Datei: wohni-word.html
const fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
let html = read('index.html');
const noClose = (js) => js.replace(/<\/script/gi, '<\\/script');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${read('style.css')}\n</style>`);
for (const f of ['lib/jszip.min.js', 'docx.js', 'app.js']) {
  html = html.replace(`<script src="${f}"></script>`, () => `<script>\n${noClose(read(f))}\n</script>`);
}
fs.writeFileSync(path.join(__dirname, 'wohni-word.html'), html);
console.log('wohni-word.html', (html.length / 1024).toFixed(0) + ' KB');
