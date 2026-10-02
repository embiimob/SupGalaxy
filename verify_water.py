from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print("Browser console:", msg.text))
        page.goto("http://localhost:3000")
        page.wait_for_timeout(3000)

        # Trigger login
        page.evaluate('''
            document.getElementById('startBtn').click();
        ''')
        page.wait_for_timeout(5000)
        browser.close()

if __name__ == "__main__":
    run()
