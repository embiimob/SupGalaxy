from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8080")
        page.fill("#worldNameInput", "test")
        page.fill("#userInput", "test")
        page.click("#startBtn")
        page.wait_for_timeout(30000)
        page.screenshot(path="jules-scratch/verification/screenshot.png")
        browser.close()

if __name__ == "__main__":
    run_verification()
