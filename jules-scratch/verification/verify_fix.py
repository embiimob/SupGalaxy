import os
from playwright.sync_api import sync_playwright

def run_verification():
    """
    Navigates to the local game, logs in, and takes a screenshot
    to verify that the game loads after the syntax fix.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Construct the file path to index.html
        file_path = "file://" + os.path.join(os.getcwd(), 'index.html')

        try:
            page.goto(file_path, timeout=60000)

            # Use provided test credentials
            page.fill("#worldNameInput", "KANYE")
            page.fill("#userInput", "embiitbot")

            # Click the start button
            page.click("#startBtn")

            # Wait for the login overlay to disappear, indicating the game has started
            page.wait_for_selector("#loginOverlay", state="hidden", timeout=120000)

            # Wait a bit longer for the 3D world to render
            page.wait_for_timeout(10000)

            # Take a screenshot to verify the game has loaded
            screenshot_path = "jules-scratch/verification/verification.png"
            page.screenshot(path=screenshot_path)

            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
