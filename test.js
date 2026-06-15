const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message, err.stack));
  await page.goto('http://localhost:8080/');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: 'screen.png'});
  const html = await page.$eval('#walletModalBody', el => el.innerHTML).catch(() => 'NOT FOUND');
  console.log('HTML:', html);
  await browser.close();
})();
