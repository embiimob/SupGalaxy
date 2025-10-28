
import asyncio
import os
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            # Start a local server to avoid CORS issues
            # This assumes you've already started a server in your environment
            await page.goto('http://localhost:8000')

            # Start the game
            await page.click('#startBtn')

            # Open the video player and add a video to the playlist
            await page.click('#tvIcon')
            await page.click('#videoMenuBtn')
            await expect(page.locator('#videoMenuModal')).to_be_visible()
            await page.click('#videoSearchBtn', force=True)
            await page.wait_for_selector('#videoList div')
            await page.click('#videoList div button:text("Add")', force=True)

            # Show the playlist and take a screenshot before saving
            await page.click('#showVideoPlaylistBtn', force=True)
            await page.screenshot(path='jules-scratch/verification/before_save.png')

            # Trigger the download
            async with page.expect_download() as download_info:
                await page.click('#saveChangesBtn')
            download = await download_info.value
            filepath = f"jules-scratch/verification/{download.suggested_filename}"
            await download.save_as(filepath)

            # Reload the page and start the game again
            await page.reload()
            await page.click('#startBtn')

            # Upload the saved session file
            await page.set_input_files('input[type=file]', filepath)

            # Open the video player and verify the playlist
            await page.click('#tvIcon')
            await page.click('#videoMenuBtn')
            await expect(page.locator('#videoMenuModal')).to_be_visible()
            await page.click('#showVideoPlaylistBtn', force=True)
            await page.screenshot(path='jules-scratch/verification/after_load.png')

        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
