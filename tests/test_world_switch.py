
from playwright.sync_api import sync_playwright, expect

def test_world_switch(page):
    # Listen for console events
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    try:
        # 1. Start the application
        page.goto("http://localhost:8000/index.html")

        # 2. Wait for the login overlay to be present, then fill in the form and click "Spawn World"
        expect(page.locator("#loginOverlay")).to_be_visible()
        page.fill("#worldNameInput", "initial_world")
        page.fill("#userInput", "test_user")
        page.click("#startBtn")

        # 3. Wait for the login overlay to disappear and the main HUD to be visible
        expect(page.locator("#loginOverlay")).not_to_be_visible(timeout=120000)
        expect(page.locator("#hud")).to_be_visible(timeout=120000)

        # 4. Take a screenshot of the initial world
        page.screenshot(path="jules-scratch/verification/initial_world.png")

        # 5. Switch to a new world
        page.click("#switchWorldBtn")

        # Handle the prompt
        def handle_dialog(dialog):
            dialog.accept("new_world")
        page.once("dialog", handle_dialog)

        # 6. Wait for the world to switch by checking for the new world label and take a screenshot
        expect(page.locator("#worldLabel")).to_have_text("new_world", timeout=120000)
        page.screenshot(path="jules-scratch/verification/new_world.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Take a final screenshot on error for debugging
        page.screenshot(path="jules-scratch/verification/error.png")
        raise e

    finally:
        page.close()
