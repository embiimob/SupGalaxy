
import asyncio
import os
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen for and print console events
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # Navigate to the local server
        await page.goto('http://localhost:8000')

        # Click the TV icon to open the video player
        tv_icon = page.locator('#tvIcon')
        await tv_icon.click()

        try:
            # Wait for the video controls to be visible, indicating the player is ready
            video_controls = page.locator('#video-controls')
            print("Waiting for video controls to become visible...")
            await expect(video_controls).to_be_visible(timeout=15000)
            print("SUCCESS: Video controls are visible.")

            # If successful, continue with the rest of the verification
            fullscreen_button = page.locator('#fullscreen-button')
            video_menu_button = page.locator('#video-menu-button')
            await expect(fullscreen_button).to_be_visible()
            await expect(video_menu_button).to_be_visible()

            await video_menu_button.click()
            video_menu = page.locator('#video-menu')
            await expect(video_menu).to_be_visible()

            await page.screenshot(path='jules-scratch/verification/verification.png')
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"ERROR: Script failed. Capturing a screenshot of the current state.")
            await page.screenshot(path='jules-scratch/verification/error_screenshot.png')
            print(f"Error details: {e}")

        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
