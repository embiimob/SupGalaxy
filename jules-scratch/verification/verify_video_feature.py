
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(permissions=['camera'])
    page = context.new_page()

    try:
        page.goto("http://localhost:8000")

        # Wait for the login overlay to be visible and interact with it
        page.wait_for_selector("#loginOverlay", state="visible")
        page.fill("#worldNameInput", "test_world")
        page.fill("#userInput", "test_user")
        page.click("#startBtn")

        # Wait for the HUD to be visible, indicating the game has started
        page.wait_for_selector("#hud", state="visible")

        # Click the camera button to enable video
        page.click("#cameraBtn")

        # Wait for the proximity video to be visible
        page.wait_for_selector("#proximityVideo", state="visible")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
