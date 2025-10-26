import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local index.html file
        import os
        await page.goto(f"file://{os.getcwd()}/index.html")

        # Enter world name and username
        await page.fill("#worldNameInput", "test-world")
        await page.fill("#userInput", "test-user")

        # Add a small delay
        await page.wait_for_timeout(500)

        # Start the game
        await page.click("#startBtn")

        # Let's see what the page looks like after clicking start
        await page.wait_for_timeout(1000)
        await page.screenshot(path="jules-scratch/verification/debug_screenshot.png")

        # Let's see the DOM content
        content = await page.content()
        with open("jules-scratch/verification/dom.html", "w") as f:
            f.write(content)

        # Wait for the main game canvas to be visible (game loaded)
        # The main canvas is a direct child of the body
        await expect(page.locator("body > canvas")).to_be_visible(timeout=60000)

        # Wait for a bit to let chunks load
        await page.wait_for_timeout(10000)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
