import asyncio
from playwright.async_api import async_playwright
import http.server
import socketserver
import threading
import time

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

def run_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(2) # Give server time to start

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(f"http://localhost:{PORT}")
        await page.wait_for_selector("#loginCard")
        await page.screenshot(path="ui_screenshot.png")
        await browser.close()

asyncio.run(main())
