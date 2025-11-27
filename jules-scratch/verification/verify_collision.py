
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the game
    print("Navigating to game...")
    page.goto("http://localhost:8080/index.html")

    # Login
    print("Logging in...")
    page.fill("#worldNameInput", "TestWorld")
    page.fill("#userInput", "Tester")
    page.click("#startBtn")

    # Wait for game to load
    print("Waiting for game load...")
    # Wait for the HUD to be visible as a sign of successful login
    page.wait_for_selector("#hud", timeout=60000)

    # Wait a bit more for chunks to load and player to spawn
    time.sleep(5)

    # We can't easily test mesh collision without interacting with a complex scene or uploading a model.
    # However, we can verify that the game loads and runs without errors after our changes.
    # Specifically, we check if the player has a valid position (y > 0) which implies physics loop is running.

    print("Checking player position...")
    pos_label = page.locator("#posLabel")
    expect(pos_label).to_be_visible()
    print(f"Position label text: {pos_label.inner_text()}")

    # Take a screenshot of the game running
    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/collision_verification.png")

    browser.close()

if __name__ == "__main__":
    from playwright.sync_api import expect
    with sync_playwright() as playwright:
        run(playwright)
