const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    await page.goto('http://localhost:3000');
    console.log("Navigated.");

    await page.fill('#userInput', 'testuser');
    await page.click('#startBtn');

    await page.waitForTimeout(3000);

    console.log("Done waiting.");
  } catch (e) {
    console.error("Test error:", e.message);
  }

  await browser.close();
})();
