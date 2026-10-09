from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Override data and call the methods to test galaxy logic
        page.evaluate("""
            // Fake some things so the function works
            window.MASTER_WORLD_KEY = "NEW_GALAXY";
            window.worldName = "START";
            window.galaxyMasterKey = "NEW_GALAXY";
            window.knownWorlds = new Map();
            window.galaxyWorldData = new Map();

            // Bypass waiting for canvas/engine
            const host = document.createElement("div");
            host.id = "galaxyCanvasHost";
            host.style.width = "800px";
            host.style.height = "600px";
            document.body.appendChild(host);
        """)

        # Call openGalaxyAtlas which calls buildGalaxyMap
        page.evaluate("openGalaxyAtlas()")

        time.sleep(2)

        # Verify galaxy travel button is NOT disabled
        is_disabled = page.evaluate('document.getElementById("galaxyTravelBtn").disabled')
        print(f"Travel button disabled: {is_disabled}")

        # Verify selected is START
        selected_name = page.evaluate('galaxyMap.selected.name')
        print(f"Selected world: {selected_name}")

        browser.close()

if __name__ == "__main__":
    run()
