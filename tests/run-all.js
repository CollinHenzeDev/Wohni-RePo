// Führt alle Browser-Tests nacheinander aus: node tests/run-all.js
// Voraussetzung: Node.js, Playwright und ein Chromium (siehe README, Abschnitt „Tests“).
const { spawnSync } = require('child_process');
const path = require('path');
const tests = ['smoke', 'features', 'editing', 'objects', 'tables', 'lists-sections', 'dialogs', 'files-print', 'hf-img-perf', 'edit-split', 'typing-autosave', 'autocorrect', 'import-robust', 'cv-flow', 'layout-fuzz'];
let failed = 0;
for (const t of tests) {
  const r = spawnSync(process.execPath, [path.join(__dirname, t + '.js')], { encoding: 'utf8', env: Object.assign({ SCR: process.env.SCR || require('os').tmpdir() }, process.env) });
  const out = (r.stdout || '') + (r.stderr || '');
  const bad = /FEHLER/.test(out.replace(/Konsolenfehler/g, '')) || r.status !== 0;
  console.log((bad ? '✗ ' : '✓ ') + t);
  if (bad) { failed++; console.log(out.split('\n').filter((l) => /FEHLER|Error|error/.test(l)).join('\n')); }
}
console.log(failed ? `\n${failed} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(failed ? 1 : 0);
