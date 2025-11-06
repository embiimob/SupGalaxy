
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:8080")

            # Log in to a Vulcan world
            await page.fill("#worldNameInput", "Ender")
            await page.fill("#userInput", "Jules")
            await page.click("#startBtn")

            # Wait for the game to load by checking for the HUD
            await expect(page.locator("#hud")).to_be_visible(timeout=120000)

            # Wait for the world to render
            await page.wait_for_timeout(10000)

            await page.screenshot(path="jules-scratch/verification/vulcan-world.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
