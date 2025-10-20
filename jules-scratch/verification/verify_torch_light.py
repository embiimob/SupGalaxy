
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # Listen for console messages from the page
            page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

            # Get the absolute path to the index.html file
            import os
            absolute_path = os.path.abspath('index.html')

            print("Navigating to page...")
            await page.goto(f'file://{absolute_path}')

            # Wait for the HUD to be visible, indicating the game has started
            print("Waiting for HUD...")
            await page.wait_for_selector('#hud', state='visible', timeout=120000)
            print("HUD visible.")

            # Wait for a moment to ensure the world is rendered
            await page.wait_for_timeout(5000) # Increased wait time for world generation

            # Click in the center of the screen to place a torch (right-click)
            print("Placing torch...")
            await page.mouse.click(page.viewport_size['width'] / 2, page.viewport_size['height'] / 2, button='right')
            print("Torch placed.")

            # Wait for a moment for the torch to be placed and light to appear
            await page.wait_for_timeout(1000)

            # Take a screenshot
            print("Taking screenshot...")
            await page.screenshot(path='jules-scratch/verification/verification.png')
            print("Screenshot taken.")

        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
