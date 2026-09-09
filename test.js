const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let hasErrors = false;
  page.on('pageerror', err => {
      console.log(`Page error: ${err.message}`);
      hasErrors = true;
  });

  await page.goto('http://localhost:8080/');

  // Wait a bit to see if any errors pop up after load
  await page.waitForTimeout(2000);

  if (hasErrors) {
      console.log('Test failed.');
      process.exit(1);
  } else {
      console.log('Test passed. No page errors found.');
  }

  await browser.close();
})();
