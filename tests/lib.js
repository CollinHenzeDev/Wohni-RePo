// Gemeinsame Testhilfen (Playwright + Chromium)
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const fs = require('fs');

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = '/opt/pw-browsers';
  if (fs.existsSync(base)) {
    const d = fs.readdirSync(base).find((x) => x.startsWith('chromium-'));
    if (d) return path.join(base, d, 'chrome-linux', 'chrome');
  }
  return undefined;
}

async function open(opts) {
  opts = opts || {};
  const browser = await pw.chromium.launch({ executablePath: chromePath(), args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1400, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.W && W.el && W.el.flow && W.layout && W.layout.info);
  await page.waitForTimeout(150);
  return { browser, page, errors };
}
module.exports = { open, pw, chromePath };
