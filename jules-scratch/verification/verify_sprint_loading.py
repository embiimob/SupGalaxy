
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8000")
    page.click("#startBtn")
    page.wait_for_timeout(5000)  # Wait for the game to load
    page.screenshot(path="jules-scratch/verification/verification_initial_load.png")

    # Start sprinting
    page.keyboard.down('w')
    page.keyboard.down('Shift')

    # Sprint for 5 seconds
    page.wait_for_timeout(5000)
    page.screenshot(path="jules-scratch/verification/verification_sprinting.png")

    # Stop sprinting
    page.keyboard.up('Shift')
    page.wait_for_timeout(1000) # Wait for the larger chunks to load
    page.screenshot(path="jules-scratch/verification/verification_stopped_sprinting.png")
    page.keyboard.up('w')


    browser.close()

with sync_playwright() as playwright:
    run(playwright)
