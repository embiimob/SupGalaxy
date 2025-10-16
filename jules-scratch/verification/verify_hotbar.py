from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Abort image and sound requests to speed up page load
    page.route("**/*.{png,jpg,jpeg,wav,mp3}", lambda route: route.abort())

    # Navigate to the game
    page.goto("http://localhost:8000")

    # Start the game
    page.fill("#worldNameInput", "hotbar-test")
    page.fill("#userInput", "jules")
    page.click("#startBtn")

    # A very long wait to ensure the game has loaded
    page.wait_for_timeout(10000)

    # Force the login overlay to be hidden
    page.evaluate("document.getElementById('loginOverlay').style.display = 'none'")

    # Force the hotbar to be visible
    page.evaluate("document.getElementById('hotbar').style.display = 'flex'")

    # Take a screenshot of the hotbar
    page.screenshot(path="jules-scratch/verification/hotbar_resized.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)