const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let errors = [];
  page.on('console', msg => {
    if(msg.type() === 'error') {
      errors.push(msg.text());
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('BROWSER PAGE ERROR:', err.message);
  });

  try {
    await page.goto('http://localhost:3000');
    console.log("Navigated.");

    await page.fill('#userInput', 'testuser');
    await page.click('#startBtn');

    await page.waitForTimeout(5000);

    console.log("Done waiting.");
  } catch (e) {
    console.error("Test error:", e.message);
  }

  await browser.close();
})();
