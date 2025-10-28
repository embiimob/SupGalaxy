import asyncio
import subprocess
from playwright.async_api import async_playwright

async def main():
    # Start a simple HTTP server in the background
    server_process = subprocess.Popen(['python', '-m', 'http.server'])

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
            context = await browser.new_context(permissions=['camera', 'microphone'])
            page = await context.new_page()

            # Listen for console events and print them
            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            # Give the server a moment to start
            await asyncio.sleep(2)

            await page.goto("http://localhost:8000")

            await page.fill("#worldNameInput", "testworld")
            await page.fill("#userInput", "testuser")
            await page.click("#startBtn")

            # Wait for the parent container to be visible first, with a longer timeout
            await page.wait_for_selector("#rightPanel", state="visible", timeout=60000)

            # Now wait for the camera button
            await page.wait_for_selector("#cameraBtn", state="visible")

            await page.click("#cameraBtn")

            # Wait for the proximity video element to become visible
            await page.wait_for_selector("#proximityVideo", state="visible")

            await page.screenshot(path="jules-scratch/verification/verification.png")
            await browser.close()
    finally:
        # Ensure the server is terminated
        server_process.kill()

asyncio.run(main())
