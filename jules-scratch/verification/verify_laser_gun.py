import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto(f"file://{os.getcwd()}/index.html")

        await page.fill("#worldNameInput", "KANYE")
        await page.fill("#userInput", "embiitbot")

        await page.click("#startBtn")

        # 1. Wait for login overlay to disappear.
        await expect(page.locator("#loginOverlay")).to_be_hidden(timeout=60000)

        # 2. Wait for the crosshair to appear, a better signal for UI readiness.
        await expect(page.locator("#crosshair")).to_be_visible(timeout=60000)

        # 3. Give the world ample time to generate and render.
        await page.wait_for_timeout(15000)

        # 4. Equip the laser gun from the second hotbar slot.
        await page.click(".hot-slot[data-index='1']")

        # Wait for UI to update.
        await page.wait_for_timeout(200)

        # 5. Fire the laser gun by clicking the center of the screen.
        viewport_size = page.viewport_size
        if viewport_size:
            await page.mouse.click(viewport_size['width'] / 2, viewport_size['height'] / 2)

        # 6. Wait for the laser to travel.
        await page.wait_for_timeout(500)

        # 7. Take a screenshot.
        await page.screenshot(path="jules-scratch/verification/laser_gun_verification.png")

        await browser.close()

asyncio.run(main())
