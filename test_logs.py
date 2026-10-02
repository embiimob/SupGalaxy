from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print("CONSOLE:", msg.text))
        page.goto("http://localhost:3000")
        page.wait_for_timeout(3000)

        # Also let's run the water injection logic to be absolutely sure chunks with water are loaded
        page.evaluate('''
            if (window.chunkManager && window.player) {
                window.player.y = 50;
                window.chunkManager.setBlock(Math.floor(window.player.x), Math.floor(window.player.y)-1, Math.floor(window.player.z), 6);
                window.chunkManager.buildChunkMesh(
                    Math.floor(window.player.x / 32),
                    Math.floor(window.player.z / 32)
                );
            }
        ''')
        page.wait_for_timeout(1000)

        browser.close()

if __name__ == "__main__":
    run()
