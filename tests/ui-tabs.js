const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1500, height: 800 } });
  for (const t of ['home', 'insert', 'layout', 'view']) {
    await page.evaluate((t) => { W.ribbon.selectTab(t); }, t);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${SCR}/tab-${t}.png`, clip: { x: 0, y: 0, width: 1500, height: 190 } });
  }
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
