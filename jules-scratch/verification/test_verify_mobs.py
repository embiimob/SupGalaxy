import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Construct the file path to index.html
        file_path = "file://" + os.path.abspath("index.html")
        await page.goto(file_path)

        # Wait for the login overlay to be visible
        await page.wait_for_selector("#loginOverlay", state="visible")

        # Set world name to "Vulcan"
        await page.fill("#worldNameInput", "Vulcan")

        # Set a username
        await page.fill("#userInput", "tester")

        # Click the spawn button
        await page.click("#startBtn")

        # Wait for the game to load by checking for the HUD to be visible
        await page.wait_for_selector("#hud", state="visible")

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
