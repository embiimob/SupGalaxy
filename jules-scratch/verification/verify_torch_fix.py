
import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # Get the absolute path to the index.html file
            current_dir = os.getcwd()
            file_path = os.path.join(current_dir, "index.html")
            file_url = f"file://{file_path}"

            # Navigate to the local game file
            await page.goto(file_url)

            # Start the game
            await page.fill("#worldNameInput", "verify")
            await page.fill("#userInput", "jules")
            await page.click("#startBtn")

            # Wait for the game to load by checking for the HUD
            await page.wait_for_selector("#hud", state="visible", timeout=30000)

            # Give the world a moment to render chunks
            await page.wait_for_timeout(5000)

            # --- Step 1: Place a torch ---
            # Player spawns near (0, 24, 0). Place a torch at (1, 23, 0). Torch ID is 120.
            await page.evaluate("() => chunkManager.setBlockGlobal(1, 23, 0, 120)")

            # Wait for the light to render
            await page.wait_for_timeout(1000)

            # Screenshot 1: Torch is placed and should be emitting light
            await page.screenshot(path="jules-scratch/verification/1_torch_placed.png")

            # --- Step 2: Remove the torch ---
            await page.evaluate("() => removeBlockAt(1, 23, 0)")

            # Wait for the light to be removed
            await page.wait_for_timeout(1000)

            # Screenshot 2: Torch and light should be gone
            await page.screenshot(path="jules-scratch/verification/2_torch_removed.png")

            print("Verification script completed successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
