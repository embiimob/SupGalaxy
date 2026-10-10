from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:8080")  # Adjust URL to wherever the game runs locally
    page.wait_for_timeout(5000)

    # Let game generate
    page.evaluate("player.y = 100")
    page.evaluate("if(playerJump) playerJump()")
    page.wait_for_timeout(1000)

    # Force a prairie biome spawn to verify cows and terrain
    page.evaluate("generateEarthTerrain = window.generateEarthTerrain")

    # Wait for chunks
    page.wait_for_timeout(5000)

    # Teleport to a known cow if any
    page.evaluate('''
        let cow = mobs.find(m => m.type === "cow");
        if(cow) {
            player.x = cow.pos.x;
            player.z = cow.pos.z + 5;
            player.y = cow.pos.y;
            camera.lookAt(cow.pos);
        }
    ''')
    page.wait_for_timeout(2000)

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
