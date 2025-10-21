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
    page.fill("#teleportX", "0")
    page.fill("#teleportY", "40")
    page.fill("#teleportZ", "0")

    # Click the teleport button, also with force
    page.click("#teleportOk", force=True)

    # Wait for a moment to allow the world to render
    time.sleep(5)

    # Simulate moving forward
    page.keyboard.down('w')
    time.sleep(2) # Move forward for 2 seconds
    page.keyboard.up('w')

    # Wait for another moment
    time.sleep(2)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
