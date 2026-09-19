const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log("Page loaded.");
  } catch (e) {
    console.error("Navigation error:", e.message);
  }

  await browser.close();
})();
