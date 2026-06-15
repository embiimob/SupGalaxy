const { chromium } = require('playwright');

(async () => {
    // We start up a python server
    const { exec } = require('child_process');
    const server = exec('python3 -m http.server 8000');

    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Set mock local storage to bypass wallet check for testing
    await page.goto('http://localhost:8000');

    await page.evaluate(() => {
        window.S = { priv: true };
    });

    await page.evaluate(() => {
        downloadSession();
    });

    // Give it a second to render modal
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'verify_testnet_btn.png' });

    await browser.close();
    server.kill();
})();
