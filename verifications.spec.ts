import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('basic test', async ({ page }) => {
  test.setTimeout(120000); // Increase timeout to 120 seconds

  // Listen for console events and write them to a file
  page.on('console', msg => {
    fs.appendFileSync('browser_console.log', `${msg.type()}: ${msg.text()}\n`);
  });

  await page.goto('http://localhost:8000');
  await page.fill('#worldNameInput', 'test');
  await page.fill('#userInput', 'test');
  await page.click('#startBtn');
  await page.waitForSelector('#hud', { state: 'visible' });

  // Teleport the player
  await page.evaluate(() => {
    player.x = 3886;
    player.y = 99;
    player.z = 5483;
  });

  // Wait for chunks to load
  await page.waitForTimeout(10000);

  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png' });
});
