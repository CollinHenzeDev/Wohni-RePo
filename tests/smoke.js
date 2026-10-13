const { open } = require('./lib');
(async () => {
  const { browser, page, errors } = await open();
  const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';
  const res = await page.evaluate((lorem) => {
    const flow = W.el.flow;
    let h = '<h1>Überschrift Eins</h1>';
    for (let i = 0; i < 40; i++) h += `<p>${i + 1}. ${lorem.repeat(1 + (i % 3))}</p>`;
    flow.innerHTML = h;
    W.layout.run();
    const info = W.layout.info;
    const per = {};
    Array.from(flow.children).forEach((b) => { const p = W.layout.pageMap.get(b); per[p] = (per[p] || 0) + 1; });
    return { pages: info.pageCount, blocks: flow.children.length, perPage: per, conts: flow.querySelectorAll('[data-cont]').length, ms: W.layout.lastMs };
  }, lorem);
  console.log(JSON.stringify(res));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-Wohni-RePo/bb80e86a-2c56-5d6b-a3c3-d5e05775c8f5/scratchpad/smoke.png' });
  console.log('errors:', errors);
  await browser.close();
})();
