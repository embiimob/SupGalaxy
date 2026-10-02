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

        # Teleport and build a 3x3x3 pool of water, stand in it
        page.evaluate('''
            if (window.chunkManager && window.player) {
                const px = 0; const pz = 0;
                window.player.x = px;
                window.player.y = 40; // Ground is usually lower here, let's hover
                window.player.z = pz;

                // Clear an area and put water
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dz = -2; dz <= 2; dz++) {
                            let b = (dy < 0) ? 6 : 0; // Water below, air above
                            // Add some solid walls at dx=2
                            if (dx === 2) b = 1;
                            window.chunkManager.setBlock(px+dx, Math.floor(window.player.y)+dy, pz+dz, b);
                        }
                    }
                }

                // Rebuild the chunk
                window.chunkManager.buildChunkMesh(0, 0);

                window.player.x = px;
                window.player.y = 40;
                window.player.z = pz;
            }
        ''')
        page.wait_for_timeout(2000)

        # We simulate pressing W to see if we can step up out of the water onto dx=2 wall
        print("Pressing W in water...")
        page.keyboard.down('w')
        # We need to look towards dx=2
        page.evaluate('''
            if(window.camera) window.camera.rotation.y = -Math.PI/2;
            window.inWater = true; // force the flag in case it hasn't updated
        ''')
        page.wait_for_timeout(3000)
        page.keyboard.up('w')

        # Check player Y to see if we stepped up
        page.evaluate('''
            console.log("Player Y:", window.player ? window.player.y : "No player");
        ''')
        page.wait_for_timeout(1000)

        # We can also record a short video to verify visuals
        browser.close()

if __name__ == "__main__":
    run()
