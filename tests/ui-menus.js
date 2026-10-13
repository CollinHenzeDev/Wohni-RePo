const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1400, height: 760 } });
  await page.evaluate(() => { W.loadDocument(W.defaultDoc(), '<h1>Überschrift</h1><p>Beispieltext zum Markieren.</p>'); W.sel.caretIn(W.el.flow.querySelector('p'), false); });
  const shot = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(150); await page.screenshot({ path: `${SCR}/menu-${name}.png`, clip: { x: 0, y: 0, width: 1400, height: 520 } }); await page.evaluate(() => { W.ui.closeMenus(); }); };
  await shot('shapes', () => { W.ribbon.selectTab('insert'); document.querySelectorAll('.rpanel[data-id="insert"] .rbtn.hasmenu')[2].click(); });
  await shot('color', () => { W.ribbon.selectTab('home'); document.querySelectorAll('.rpanel[data-id="home"] .rsplit .arrow')[3].click(); });
  await shot('table', () => { W.ribbon.selectTab('insert'); document.querySelectorAll('.rpanel[data-id="insert"] .rbtn.hasmenu')[0].click(); });
  await shot('columns', () => { W.ribbon.selectTab('layout'); document.querySelectorAll('.rpanel[data-id="layout"] .rbtn.hasmenu')[3].click(); });
  await shot('wrap', () => { W.floats.insertShape('ellipse'); W.ribbon.selectTab('obj'); document.querySelector('.rpanel[data-id="obj"] .rbtn.wraphl').click(); });
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})();
