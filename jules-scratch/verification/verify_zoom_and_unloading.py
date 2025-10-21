from playwright.sync_api import sync_playwright
import time
import os

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    cwd = os.getcwd()
    page.goto(f"file://{cwd}/index.html")

    # Wait for the login card to be visible
    page.wait_for_selector("#loginCard", state="visible")

    # Enter world name and username
    page.fill("#worldNameInput", "Ender")
    page.fill("#userInput", "embii4u")
    page.click("#startBtn", force=True)

    # Wait for the login overlay to be hidden
    page.wait_for_selector("#loginOverlay", state="hidden")

    # Manually make the HUD visible
    page.evaluate("document.getElementById('hud').style.display = 'block'")
    page.wait_for_selector("#hud", state="visible")

    # Open the teleport modal by forcing the click
    page.evaluate("document.getElementById('teleportModal').style.display = 'block'")
    page.wait_for_selector("#teleportModal", state="visible")

    # Fill in the coordinates
    page.fill("#teleportX", "8192")
    page.fill("#teleportY", "100")
    page.fill("#teleportZ", "8192")

    # Click the teleport button, also with force
    page.click("#teleportOk", force=True)

    # Wait for a moment to allow the world to render
    time.sleep(5)

    # Move around to load a large area
    page.keyboard.down('w')
    time.sleep(3)
    page.keyboard.up('w')
    page.keyboard.down('a')
    time.sleep(3)
    page.keyboard.up('a')
    page.keyboard.down('s')
    time.sleep(3)
    page.keyboard.up('s')
    page.keyboard.down('d')
    time.sleep(3)
    page.keyboard.up('d')

    # Wait for rendering
    time.sleep(5)

    # Switch to third person view
    page.keyboard.press('t')

    # Zoom out
    page.mouse.wheel(0, 5000)
    time.sleep(1)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
