import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local index.html file
        await page.goto(f"file://{os.getcwd()}/index.html")

        # Login
        await page.fill("#worldNameInput", "test")
        await page.fill("#userInput", "jules")
        await page.click("#startBtn")

        # Wait for the game to load by checking for the HUD
        await expect(page.locator("#hud")).to_be_visible(timeout=60000)

        # Use JavaScript to give the player the required items for a simple craft (glass)
        await page.evaluate("""() => {
            window.INVENTORY[0] = { id: 5, count: 2, originSeed: 'test' }; // native sand
            window.updateHotbarUI();
        }""")

        # Open the crafting menu
        await page.evaluate("document.getElementById('openCraft').click()")

        # Find the Glass recipe and click "Craft"
        await page.evaluate("""() => {
            const recipeRows = document.querySelectorAll('#recipeList div');
            for (const row of recipeRows) {
                if (row.innerText.includes('Glass')) {
                    row.querySelector('button').click();
                    break;
                }
            }
        }""")

        # The crafting modal should now be closed
        await expect(page.locator("#craftModal")).not_to_be_visible()

        # Take a screenshot to verify the game state
        await page.screenshot(path="jules-scratch/verification/crafting_modal_closed.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
