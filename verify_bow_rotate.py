import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        await page.goto("http://localhost:8080")

        await page.wait_for_timeout(1000)

        # Test just the rendering code of the bow! We don't need the full game.
        # We can extract the mesh and render it in a tiny scene on the login screen.
        await page.evaluate("""
            const group = new THREE.Group();

            const toolId = 179;
            const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a33, roughness: 0.8, metalness: 0.1 });
            const stringMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // red string to make it obvious

            const innerGroup = new THREE.Group();
            const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI), woodMat);
            limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
            innerGroup.add(limb);
            const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.015), stringMat);
            innerGroup.add(bowString);

            // Apply our new fix
            innerGroup.rotation.set(-Math.PI/2, 0, -Math.PI/2);
            group.add(innerGroup);

            // Aiming pose
            const w = 1.0;
            const widen = Math.max(1, window.innerWidth / window.innerHeight / (16 / 9));
            const rest = new THREE.Vector3(.40 * widen, -.56, -.62);
            const aimX = .0, aimY = -.2, aimZ = -.4;

            const recoil = 0;
            group.position.set(rest.x + (aimX - rest.x) * w, rest.y + (aimY - rest.y) * w, rest.z + (aimZ - rest.z) * w + .07 * Math.max(0, recoil));

            const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .25, 0));
            const distance = 20;
            const aimDir = new THREE.Vector3(-aimX, -aimY, -distance - aimZ).normalize();

            group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir);
            group.quaternion.slerpQuaternions(restQuat, group.quaternion.clone(), w);

            // String pull
            let draw = w;
            bowString.position.y = 0.4 * draw;

            // Setup simple scene
            const scene2 = new THREE.Scene();
            const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({alpha: true});
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.zIndex = '9999';
            document.body.appendChild(renderer.domElement);

            const light = new THREE.AmbientLight(0xffffff, 2.0);
            scene2.add(light);

            // The gun is typically added to the camera in first person mode
            camera2.add(group);
            scene2.add(camera2);

            renderer.render(scene2, camera2);
        """)

        await page.wait_for_timeout(1000)
        await page.screenshot(path="bow_verify.png")
        await browser.close()

asyncio.run(main())
