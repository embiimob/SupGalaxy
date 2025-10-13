
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the local index.html file
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # Fill in the login details
        await page.fill('#worldNameInput', 'KANYE')
        await page.fill('#userInput', 'embiitbot')

        # Click the start button
        await page.click('#startBtn')

        # Wait for the game to load (adjust the wait time if necessary)
        await page.wait_for_selector('#hud', state='visible', timeout=120000)

        # Take a screenshot
        await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
