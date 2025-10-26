from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Listen for console events
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        page.goto("http://localhost:8000")

        # Interact with the login form
        page.fill("#worldNameInput", "testworld")
        page.fill("#userInput", "jules")
        page.click("#startBtn")

        # Wait for the game to load by checking for the HUD
        page.wait_for_selector("#hud", state="visible")

        # Capture a screenshot
        page.screenshot(path="jules-scratch/verification/screenshot.png")

        browser.close()

if __name__ == "__main__":
    run()
