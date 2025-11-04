
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:8080")

            # Login
            await page.fill("#worldNameInput", "KANYE")
            await page.fill("#userInput", "embiitbot")
            await page.click("#startBtn")

            # Wait for the game to load
            await page.wait_for_selector("#hud", timeout=60000)

            # Drop an item
            await page.keyboard.press('g')
            await page.wait_for_timeout(500) # Wait for drop animation

            # Take a screenshot to verify the item is dropped and not instantly picked up
            await page.screenshot(path="/app/jules-scratch/verification/dropped_item.png")

            # Wait 2 seconds for the pickup cooldown to expire
            await page.wait_for_timeout(2000)

            # Move forward to pick up the item
            await page.keyboard.down('w')
            await page.wait_for_timeout(1000)
            await page.keyboard.up('w')

            # Take another screenshot to verify the item is picked up
            await page.screenshot(path="/app/jules-scratch/verification/picked_up_item.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="/app/jules-scratch/verification/error.png")

        finally:
            await browser.close()

asyncio.run(main())
