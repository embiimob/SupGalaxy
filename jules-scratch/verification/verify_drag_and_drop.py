
import asyncio
from playwright.async_api import async_playwright, ConsoleMessage
import os
import json

async def handle_console_message(msg: ConsoleMessage):
    print(f"Browser console: {msg.text}")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the full path to the index.html file
        file_path = "file://" + os.path.abspath("index.html")
        await page.goto(file_path)

        # Listen for console events and dismiss dialogs
        page.on('console', handle_console_message)
        page.on("dialog", lambda dialog: dialog.dismiss())

        # 1. Screenshot of the login screen
        await page.screenshot(path="jules-scratch/verification/login_screen.png")

        # 2. Define player data and calculate hash in browser context
        player_data = {
            "world": "TestWorld",
            "seed": "TestSeed",
            "user": "TestUser",
            "savedAt": "2025-10-28T01:47:11.475607Z",
            "deltas": [],
            "foreignBlockOrigins": [],
            "profile": {
                "x": 10,
                "y": 25,
                "z": 10,
                "health": 15,
                "score": 100,
                "inventory": [
                    {"id": 120, "count": 5, "originSeed": "TestSeed"}
                ]
            },
            "musicPlaylist": []
        }

        calculated_hash = await page.evaluate("""(playerData) => {
            const str = JSON.stringify(playerData);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        }""", player_data)

        mock_session_data = {
            "playerData": player_data,
            "hash": calculated_hash
        }

        # 3. Simulate file drop
        await page.evaluate("""(sessionData) => {
            const dataTransfer = new DataTransfer();
            const file = new File([JSON.stringify(sessionData)], 'session.json', { type: 'application/json' });
            dataTransfer.items.add(file);
            const dropZone = document.getElementById('dropZone');
            const dropEvent = new DragEvent('drop', { dataTransfer });
            dropZone.dispatchEvent(dropEvent);
        }""", mock_session_data)

        # 4. Wait for the game to load
        await page.wait_for_selector("#hud", state="visible")

        # 5. Final screenshot
        await page.screenshot(path="jules-scratch/verification/game_loaded.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
