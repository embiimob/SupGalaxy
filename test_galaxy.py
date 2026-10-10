from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # We need to stub network request so loadGalaxyFromInput won't crash
        page.evaluate("""
            window.MASTER_WORLD_KEY = "NEW_GALAXY";
            window.worldName = "START";
            window.galaxyMasterKey = "NEW_GALAXY";
            window.knownWorlds = new Map([["OLDWORLD", {}]]);
            window.galaxyWorldData = null;

            // Bypass DOM missing stuff
            const host = document.createElement("div");
            host.id = "galaxyCanvasHost";
            host.style.width = "800px";
            host.style.height = "600px";
            document.body.appendChild(host);

            // Mock network
            window.discoverGalaxyWorlds = async function() { return new Map([["REMOTE_WORLD", {}]]); };
        """)

        # Test 1: Open atlas. Should show START (current world), NOT OLDWORLD (because we don't fall back to knownWorlds).
        # Then the background fetch completes and it should show REMOTE_WORLD.

        # Set up a hook to track worlds in nodes
        page.evaluate("openGalaxyAtlas()")

        # Let's inspect before network finishes
        worlds_before = page.evaluate("galaxyMap.worldNodes.map(n => n.userData.world.name)")
        print(f"Worlds immediately after open: {worlds_before}")

        time.sleep(2)

        # Now the async discoverGalaxyWorlds should have finished and it should have rebuilt map
        worlds_after = page.evaluate("galaxyMap.worldNodes.map(n => n.userData.world.name)")
        print(f"Worlds after network loads: {worlds_after}")

        browser.close()

if __name__ == "__main__":
    run()
