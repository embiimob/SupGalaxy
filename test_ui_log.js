const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    await page.goto('http://localhost:3000');
    console.log("Navigated.");

    // Dump all the button ids
    const buttons = await page.$$eval('button', els => els.map(e => e.id));
    console.log("Button IDs:", buttons);

    // Dump all input ids
    const inputs = await page.$$eval('input', els => els.map(e => e.id));
    console.log("Input IDs:", inputs);

  } catch (e) {
    console.error("Test error:", e.message);
  }

  await browser.close();
})();
