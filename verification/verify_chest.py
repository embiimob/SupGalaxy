from playwright.sync_api import sync_playwright
import time

def verify_chest_implementation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        print("Navigating to game...")
        page.goto("http://localhost:8000")

        # Login
        print("Logging in...")
        page.fill("#worldNameInput", "TestWorld")
        page.fill("#userInput", "Tester")
        page.click("#startBtn")

        # Wait for game to load
        print("Waiting for game to load...")
        time.sleep(5)

        # Check if chest modal exists in DOM
        print("Checking for Chest Modal...")
        chest_modal = page.query_selector("#chestModal")
        if chest_modal:
            print("SUCCESS: Chest Modal found in DOM.")
        else:
            print("FAILURE: Chest Modal NOT found in DOM.")

        # Verify recipes exist in declare.js context (indirectly via crafting menu or console)
        print("Verifying recipes...")
        recipes = page.evaluate("() => window.RECIPES")
        chest_recipe = next((r for r in recipes if r['out']['id'] == 131), None)
        if chest_recipe:
            print("SUCCESS: Chest recipe found.")
        else:
            print("FAILURE: Chest recipe NOT found.")

        # Verify blocks exist
        print("Verifying block definitions...")
        blocks = page.evaluate("() => window.BLOCKS")
        if blocks['131'] and blocks['131']['name'] == 'Chest':
            print("SUCCESS: Chest block definition found.")
        else:
            print("FAILURE: Chest block definition NOT found.")

        # Simulate opening a chest (since we can't easily place one and click it in headless without complex setup,
        # we will manually call the openChest function to verify UI pops up)
        print("Simulating chest open...")

        # Mock a chest entry
        page.evaluate("""() => {
            window.chests['0,0,0'] = {
                x:0, y:0, z:0,
                items: new Array(27).fill(null),
                isOpen: false
            };
            // Add an item to the chest for visual verification
            window.chests['0,0,0'].items[0] = {id: 7, count: 10};
        }""")

        # Trigger open
        page.evaluate("window.openChest(0,0,0)")

        # Take screenshot
        time.sleep(1)
        page.screenshot(path="verification/chest_modal.png")
        print("Screenshot taken: verification/chest_modal.png")

        browser.close()

if __name__ == "__main__":
    verify_chest_implementation()
