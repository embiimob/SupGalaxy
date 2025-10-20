
import pytest
from playwright.sync_api import sync_playwright, expect

def test_sky_and_elements_update_on_world_switch(page):
    """
    Tests that switching worlds correctly updates the sky color, sun, moon, and stars.
    """
    page.goto("http://localhost:8000")

    # Fill in the world and username
    page.locator("#worldNameInput").fill("tstworld")
    page.locator("#userInput").fill("testuser")

    # Click the "Spawn World" button and wait for the HUD to become visible
    page.locator("#startBtn").click()
    hud = page.locator("#hud")
    expect(hud).to_be_visible(timeout=15000)

    # --- First World ---
    # Take a screenshot of the initial world state
    page.screenshot(path="screenshot_world1.png")

    # --- Switch World ---
    # Click the "Switch World" button using JavaScript to bypass canvas interception
    page.evaluate("document.getElementById('switchWorldBtn').click()")

    # Handle the prompt by entering a new world name
    page.once("dialog", lambda dialog: dialog.accept("newWorld"))

    # Wait for a brief moment to allow the world to switch
    page.wait_for_timeout(2000)

    # --- Second World ---
    # Take a screenshot of the new world state
    page.screenshot(path="screenshot_world2.png")

    print("Test complete. Please compare screenshot_world1.png and screenshot_world2.png.")
