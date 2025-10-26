from playwright.sync_api import sync_playwright
import time
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Get the absolute path to index.html
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # Wait for the game to load and generate chunks
    time.sleep(10)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
