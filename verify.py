from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Listen for console events and print them
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        try:
            page.goto("http://localhost:8000")
            page.fill("#worldNameInput", "test")
            page.fill("#userInput", "jules")
            page.click("#startBtn")
            page.wait_for_selector("#loginOverlay", state="hidden", timeout=60000)
            page.wait_for_timeout(5000) # Wait 5 seconds for chunks to load
            page.screenshot(path="screenshot.png")
            print("Screenshot saved to screenshot.png")
        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
