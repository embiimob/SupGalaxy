import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        save_path = "" # Initialize save_path

        try:
            # Load the game
            await page.goto(f"file:///app/index.html")

            # Wait for the login screen to be ready
            await page.wait_for_selector("#startBtn", timeout=60000)

            # Login
            await page.fill("#worldNameInput", "testworld")
            await page.fill("#userInput", "testuser")
            await page.click("#startBtn")

            # Increase timeout to allow the game to load
            await page.wait_for_timeout(30000)

            # The Green Laser Gun should be in inventory slot 2 (index 1) due to the modification.
            hotbar_slot_2_label = await page.inner_text('.hot-slot[data-index="1"] .hot-label')
            if "Green Laser Gun" not in hotbar_slot_2_label:
                raise Exception("Green Laser Gun not found in inventory on initial load.")

            # Trigger the session download
            await page.evaluate('() => { downloadSession(); }')

            # Wait for the download to complete
            async with page.expect_download() as download_info:
                pass
            download = await download_info.value
            save_path = f"/tmp/{download.suggested_filename}"
            await download.save_as(save_path)

            print(f"Session saved to {save_path}")

            # Reload the page to simulate a new session
            await page.reload()

            # Wait for the login screen to be ready again
            await page.wait_for_selector("#startBtn", timeout=60000)
            await page.wait_for_timeout(2000)

            # Use the hidden file input to upload the session file
            await page.evaluate('''() => {
                let fileInput = document.querySelector('input[type=file]');
                if (!fileInput) {
                    fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                }
                fileInput.id = 'jules-file-input';
            }''')

            await page.locator('#jules-file-input').set_input_files(save_path)

            # The app should auto-load the session after the file is set

            # Increase timeout to allow the game to load
            await page.wait_for_timeout(30000)

            # Verify that the Green Laser Gun is in the hotbar
            loaded_hotbar_slot_2_label = await page.inner_text('.hot-slot[data-index="1"] .hot-label')
            if "Green Laser Gun" not in loaded_hotbar_slot_2_label:
                raise Exception("Green Laser Gun not found in inventory after loading session.")

            print("Verification successful: Green Laser Gun was saved and loaded correctly.")
            await page.screenshot(path="jules-scratch/verification/screenshot.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
            raise

        finally:
            await browser.close()
            if save_path and os.path.exists(save_path):
                os.remove(save_path)

asyncio.run(main())
