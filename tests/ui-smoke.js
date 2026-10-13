const { open } = require('./lib');
const SCR = process.env.SCR || '/tmp';
(async () => {
  const { browser, page, errors } = await open({ viewport: { width: 1500, height: 900 } });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SCR + '/ui1.png' });
  console.log('errors:', JSON.stringify(errors));
  const info = await page.evaluate(() => ({ tabs: W.$$('.tab').map((t) => t.textContent), pages: W.layout.info.pageCount, zoom: W.view.zoom }));
  console.log(JSON.stringify(info));
  await browser.close();
})();
