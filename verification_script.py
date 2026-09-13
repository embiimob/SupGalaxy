from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:8080/index.html?world-seed=GABO&user-name=guest&loc=1776,23,3127')

    # Check if startBtn is visible and click it
    page.wait_for_selector('#startBtn', state='visible', timeout=5000)
    page.click('#startBtn')

    # Wait for the game to load and UI to disappear
    page.wait_for_selector('#loginOverlay', state='hidden', timeout=15000)

    print("Logged in, waiting for chunks to load...")
    page.wait_for_timeout(10000) # wait for chunks and wall to load

    print("Clicking to break block...")
    # Simulate a click in the center to break a block
    page.mouse.click(page.viewport_size['width'] / 2, page.viewport_size['height'] / 2, button='left')

    page.wait_for_timeout(2000)
    page.screenshot(path='/home/jules/verification/screenshots/verification_in_game.png')
    browser.close()
