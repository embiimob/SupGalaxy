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

        # Take a screenshot underwater
        page.evaluate('''
            if (window.chunkManager && window.player) {
                const px = 0; const pz = 0;
                window.player.x = px;
                window.player.y = 40;
                window.player.z = pz;

                // Clear an area and put water
                for (let dx = -4; dx <= 4; dx++) {
                    for (let dy = -4; dy <= 4; dy++) {
                        for (let dz = -4; dz <= 4; dz++) {
                            let b = (dy < 0) ? 6 : 0;
                            window.chunkManager.setBlock(px+dx, Math.floor(window.player.y)+dy, pz+dz, b);
                        }
                    }
                }

                window.chunkManager.buildChunkMesh(0, 0);

                window.player.x = px;
                window.player.y = 38; // Underwater
                window.player.z = pz;
            }
        ''')
        page.wait_for_timeout(2000)

        page.evaluate('''
            window.inWater = true;
            if (window.camera) {
                window.camera.rotation.x = 0;
                window.camera.rotation.y = 0;
                window.camera.rotation.z = 0;
            }
        ''')
        page.wait_for_timeout(1000)

        page.screenshot(path="water_test_screenshot.png")
        print("Screenshot saved to water_test_screenshot.png")
        browser.close()

if __name__ == "__main__":
    run()
