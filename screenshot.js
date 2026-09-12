const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  await page.goto('http://localhost:8080');

  // Wait for the UI to load
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'before.png' });

  // Try to bypass login if possible or just see what's visible
  console.log("Attempting to click play local...");

  try {
      // Find the Play Solo/Local button and click it if it exists
      const playBtn = await page.$('#playLocalBtn');
      if (playBtn) {
          await playBtn.click();
          await page.waitForTimeout(3000); // Wait for game to initialize
          await page.screenshot({ path: 'gameplay.png' });
      } else {
          console.log("Play Local button not found");
      }
  } catch (e) {
      console.log("Error interacting with page:", e);
  }

  await browser.close();
})();
