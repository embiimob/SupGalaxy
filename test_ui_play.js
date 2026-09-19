const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    await page.goto('http://localhost:3000');
    console.log("Navigated.");

    // Fill the handle input using the actual ID #userInput
    await page.fill('#userInput', 'testuser');

    // Click the start button using the actual ID #startBtn
    console.log("Clicking start button...");
    await page.click('#startBtn');

    // Wait a bit to let audio/game start
    await page.waitForTimeout(5000);
    console.log("Finished waiting.");

  } catch (e) {
    console.error("Test error:", e.message);
  }

  await browser.close();
})();
