import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto("http://localhost:8000")

        # Start the game
        await page.fill("#worldNameInput", "test")
        await page.fill("#userInput", "jules")
        await page.click("#startBtn")

        # Wait for the game to load
        await page.wait_for_selector("#hud", state="visible")

        # Move forward to find a mob
        await page.keyboard.down("w")
        await page.wait_for_timeout(2000)
        await page.keyboard.up("w")

        # Attack
        await page.mouse.down()
        await page.wait_for_timeout(100)

        # Take screenshot during attack
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await page.mouse.up()

        await browser.close()

asyncio.run(main())