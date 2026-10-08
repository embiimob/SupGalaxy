function galaxyMasterKeyword() {
    return typeof MASTER_WORLD_KEY === "string" && MASTER_WORLD_KEY ? MASTER_WORLD_KEY : "SUPGALAXY";
}

function galaxyHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return hash >>> 0;
}

function galaxyCoordinates(originName) {
    const seed = String(originName || "");
    const master = galaxyMasterKeyword();
    const radius = .17 + Math.sqrt(galaxyHash(seed + ":" + master + ":orbit") / 4294967296) * .82;
    const pitch = (galaxyHash(master + ":height:" + seed) / 4294967296 - .5) * .14;
    const arm = galaxyHash(master + ":arm:" + seed) % 4;
    const phase = (galaxyHash(master + ":phase:" + seed) / 4294967296 - .5) * (.12 + radius * .22);
    const spiralAngle = arm * Math.PI / 2 + Math.log(radius / .17) * 1.32 + phase;
    return new THREE.Vector3(
        Math.cos(spiralAngle) * radius,
        pitch * radius,
        Math.sin(spiralAngle) * radius
    );
}

let galaxyStarTextureCanvas;

function getGalaxyStarTexture() {
    if (!galaxyStarTextureCanvas) {
        galaxyStarTextureCanvas = document.createElement("canvas");
        galaxyStarTextureCanvas.width = galaxyStarTextureCanvas.height = 32;
        const context = galaxyStarTextureCanvas.getContext("2d");
        const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        glow.addColorStop(0, "rgba(255,255,255,1)");
        glow.addColorStop(.32, "rgba(255,255,255,.95)");
        glow.addColorStop(.72, "rgba(255,255,255,.38)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(galaxyStarTextureCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}

function generateGalaxyStarCatalog() {
    const random = makeSeededRandom(galaxyMasterKeyword() + "_star_catalog");
    const points = [];
    const arms = 3600;
    const armCount = 4;
    for (let arm = 0; arm < armCount; arm++) {
        for (let i = 0; i < arms; i++) {
            const radius = .17 + Math.sqrt(random()) * .82;
            const angle = arm * Math.PI * 2 / armCount +
                Math.log(radius / .17) * 1.32 +
                (random() - .5) * (.12 + radius * .22);
            const thickness = .006 + radius * .028;
            points.push(
                Math.cos(angle) * radius + (random() - .5) * thickness,
                (random() - .5) * thickness * .7,
                Math.sin(angle) * radius + (random() - .5) * thickness
            );
        }
    }
    for (let i = 0; i < 1800; i++) {
        const radius = .17 + Math.sqrt(random()) * .34;
        const angle = random() * Math.PI * 2;
        points.push(
            Math.cos(angle) * radius,
            (random() - .5) * .045,
            Math.sin(angle) * radius
        );
    }
    return new Float32Array(points);
}

let galaxyStarCatalog;

function getGalaxyStarCatalog() {
    if (!galaxyStarCatalog) galaxyStarCatalog = generateGalaxyStarCatalog();
    return galaxyStarCatalog;
}

function getGalaxyWorldNames() {
    const names = new Set(knownWorlds instanceof Map ? knownWorlds.keys() : []);
    if (typeof worldName === "string" && worldName) names.add(worldName);
    return Array.from(names).filter(name => typeof name === "string" && name.trim()).sort((a, b) => a.localeCompare(b));
}

function createGalaxySky(seed) {
    const galaxy = new THREE.Group;
    const positions = [];
    const origin = galaxyCoordinates(typeof worldName === "string" && worldName ? worldName : seed);
    const catalog = getGalaxyStarCatalog();
    for (let i = 0; i < catalog.length; i += 3) {
        const dx = catalog[i] - origin.x;
        const dy = catalog[i + 1] - origin.y;
        const dz = catalog[i + 2] - origin.z;
        const distance = Math.hypot(dx, dy, dz);
        if (distance > .001) positions.push(dx / distance * 4000, dy / distance * 4000, dz / distance * 4000);
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xffffff,
        map: getGalaxyStarTexture(),
        size: 1.45,
        transparent: true,
        alphaTest: .08,
        depthWrite: false
    }));
    galaxy.add(stars);
    galaxy.userData.isGalaxySky = true;
    refreshGalaxySkyWorlds(galaxy, typeof worldName === "string" && worldName ? worldName : seed);
    return galaxy;
}

function refreshGalaxySkyWorlds(group = stars, originName = worldSeed) {
    if (!group || !group.userData || !group.userData.isGalaxySky) return;
    const previous = group.userData.worldMarkers;
    if (previous) {
        group.remove(previous);
        disposeObject(previous);
    }
    const origin = galaxyCoordinates(originName);
    const positions = [];
    for (const name of getGalaxyWorldNames()) {
        const delta = galaxyCoordinates(name).sub(origin);
        if (delta.lengthSq() < .000001) continue;
        delta.normalize().multiplyScalar(3970);
        positions.push(delta.x, delta.y, delta.z);
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const worldNames = getGalaxyWorldNames().filter(name => name !== originName);
    const markers = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xc9ffd8,
        map: getGalaxyStarTexture(),
        size: 3.2,
        vertexColors: true,
        transparent: true,
        opacity: .95,
        depthWrite: false,
        alphaTest: .08
    }));
    const colors = [];
    for (const name of worldNames) {
        const selected = name === worldName;
        colors.push(selected ? .72 : .28, selected ? 1 : .82, selected ? .45 : .43);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    markers.userData.worldNames = worldNames;
    group.add(markers);
    group.userData.worldMarkers = markers;
}

function getGalaxySystemDetails(seed) {
    const random = makeSeededRandom(seed + "_sky");
    for (let i = 0; i < 6; i++) random();
    const suns = 1 + Math.floor(3 * random());
    for (let i = 0; i < suns * 5; i++) random();
    const moons = Math.floor(4 * random());
    return { suns, moons };
}

function initGalaxyMap() {
    const modal = document.createElement("div");
    modal.id = "galaxyMap";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "galaxyTitle");
    modal.innerHTML = `
        <section class="galaxy-panel">
            <header class="galaxy-header">
                <div>
                    <h2 id="galaxyTitle">SupGalaxy holographic atlas</h2>
                    <small id="galaxyMasterLabel"></small>
                </div>
                <div class="galaxy-zoom-controls">
                    <button type="button" id="galaxyOverview">Galaxy overview</button>
                    <button type="button" id="galaxyZoomOut" aria-label="Zoom out">−</button>
                    <button type="button" id="galaxyZoomIn" aria-label="Zoom in">+</button>
                    <button type="button" id="galaxyMapClose">Close</button>
                </div>
            </header>
            <div class="galaxy-map-content">
                <div id="galaxyViewport" aria-label="Interactive three-dimensional galaxy hologram"></div>
                <aside class="galaxy-details">
                    <div class="galaxy-planet" aria-hidden="true"></div>
                    <h3 id="galaxyWorldName"></h3>
                    <p id="galaxyWorldInfo"></p>
                    <div class="galaxy-stat-grid">
                        <div class="galaxy-stat"><strong id="galaxySunCount">0</strong>Suns</div>
                        <div class="galaxy-stat"><strong id="galaxyMoonCount">0</strong>Moons</div>
                    </div>
                    <button type="button" id="galaxyTravel">Travel to world</button>
                </aside>
            </div>
            <footer class="galaxy-footer">
                <small>Drag to rotate · scroll or pinch to zoom · click a world name for details · click its planet to travel</small>
                <small id="galaxyWorldCount"></small>
            </footer>
        </section>`;
    document.body.appendChild(modal);

    const viewport = modal.querySelector("#galaxyViewport");
    const raycaster = new THREE.Raycaster;
    const pointer = new THREE.Vector2;
    const state = { selected: "", renderer: null, scene: null, camera: null, controls: null, worldObjects: [], frame: 0, open: false };
    modal.querySelector("#galaxyMasterLabel").textContent = `MASTER KEYWORD · ${galaxyMasterKeyword()}`;

    function updateDetails() {
        const name = state.selected || (typeof worldName === "string" ? worldName : "Unknown");
        const system = getGalaxySystemDetails(name);
        const position = galaxyCoordinates(name);
        const world = knownWorlds instanceof Map ? knownWorlds.get(name) : null;
        const residents = world && world.users instanceof Map ? world.users.size : world && world.users instanceof Set ? world.users.size : 0;
        modal.querySelector("#galaxyWorldName").textContent = name;
        modal.querySelector("#galaxySunCount").textContent = system.suns;
        modal.querySelector("#galaxyMoonCount").textContent = system.moons;
        modal.querySelector("#galaxyWorldInfo").textContent =
            `Origin ${name} · ${Math.round(position.length() * 100)}% galactic radius · ${residents} known resident${residents === 1 ? "" : "s"}`;
        const travel = modal.querySelector("#galaxyTravel");
        travel.disabled = !name || name === worldName;
        travel.textContent = name === worldName ? "Current world" : "Travel to world";
    }

    function makeWorldLabel(name) {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 96;
        const context = canvas.getContext("2d");
        context.font = "bold 42px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = "#50ff8b";
        context.shadowBlur = 18;
        context.fillStyle = "#baffca";
        context.fillText(name, 256, 48, 490);
        const texture = new THREE.CanvasTexture(canvas);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: true
        }));
        label.scale.set(.19, .036, 1);
        label.position.y += .027;
        label.userData.worldName = name;
        label.userData.isWorldLabel = true;
        return label;
    }

    function addGalaxyPoints() {
        const galaxy = new THREE.Group;
        const points = [];
        const colors = [];
        const catalog = getGalaxyStarCatalog();
        for (let i = 0; i < catalog.length; i += 3) {
            points.push(catalog[i], catalog[i + 1], catalog[i + 2]);
            const brightness = .48 + .52 * ((i / 3 * 0.61803398875) % 1);
            colors.push(.12 * brightness, .82 * brightness, .34 * brightness);
        }
        const geometry = new THREE.BufferGeometry;
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        galaxy.add(new THREE.Points(geometry, new THREE.PointsMaterial({
            map: getGalaxyStarTexture(),
            size: .0058,
            vertexColors: true,
            transparent: true,
            opacity: .88,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            alphaTest: .08
        })));

        const exclusion = new THREE.Mesh(
            new THREE.SphereGeometry(.055, 12, 8),
            new THREE.MeshBasicMaterial({ color: 0x010905 })
        );
        exclusion.userData.isCore = true;
        galaxy.add(exclusion);
        state.scene.add(galaxy);
    }

    function addWorlds() {
        for (const old of state.worldObjects) {
            state.scene.remove(old.marker, old.label);
            disposeObject(old.marker);
            disposeObject(old.label);
        }
        state.worldObjects = [];
        for (const name of getGalaxyWorldNames()) {
            const position = galaxyCoordinates(name);
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(name === worldName ? .009 : .007, 8, 6),
                new THREE.MeshBasicMaterial({
                    color: name === worldName ? 0xcaff74 : 0x5dff95,
                    transparent: true,
                    opacity: .96
                })
            );
            marker.position.copy(position);
            marker.userData.worldName = name;
            marker.userData.isWorld = true;
            const label = makeWorldLabel(name);
            label.position.copy(position).add(new THREE.Vector3(0, .016, 0));
            state.scene.add(marker, label);
            state.worldObjects.push({ name, position, marker, label });
        }
        modal.querySelector("#galaxyWorldCount").textContent =
            `${state.worldObjects.length} known worlds · green core exclusion zone`;
    }

    function animate() {
        if (!state.open) return;
        state.frame = requestAnimationFrame(animate);
        state.controls.update();
        state.renderer.render(state.scene, state.camera);
    }

    function ensureRenderer() {
        if (state.renderer) return;
        state.scene = new THREE.Scene;
        state.scene.background = new THREE.Color(0x020a05);
        state.camera = new THREE.PerspectiveCamera(48, 1, .01, 20);
        state.camera.position.set(0, .35, 1.65);
        state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
        state.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
        state.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        viewport.appendChild(state.renderer.domElement);
        state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
        state.controls.enableDamping = true;
        state.controls.dampingFactor = .08;
        state.controls.target.set(0, 0, 0);
        state.controls.minDistance = .12;
        state.controls.maxDistance = 3.5;
        state.controls.rotateSpeed = .65;
        state.controls.zoomSpeed = .8;
        addGalaxyPoints();
    }

    function resizeRenderer() {
        if (!state.renderer || modal.hidden) return;
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        if (!width || !height) return;
        state.renderer.setSize(width, height, false);
        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();
    }

    function openMap() {
        modal.hidden = false;
        state.open = true;
        state.selected = typeof worldName === "string" ? worldName : "";
        ensureRenderer();
        addWorlds();
        refreshGalaxySkyWorlds(stars, worldName);
        resizeRenderer();
        state.controls.target.set(0, 0, 0);
        state.camera.position.set(0, .35, 1.65);
        state.controls.update();
        updateDetails();
        animate();
        modal.querySelector("#galaxyMapClose").focus();
    }

    function closeMap() {
        state.open = false;
        if (state.frame) cancelAnimationFrame(state.frame);
        state.frame = 0;
        modal.hidden = true;
    }

    function travelToWorld(name) {
        if (!name || name === worldName) return;
        closeMap();
        if (typeof switchWorld === "function" && gameStarted) {
            switchWorld(name);
        }
    }

    function findScreenWorldHit(event, rect) {
        const pixelsPerWorldUnit = rect.height /
            (2 * Math.tan(state.camera.fov * Math.PI / 360) * state.camera.position.distanceTo(state.controls.target));
        let bestHit = null;
        let bestScore = Infinity;
        for (const world of state.worldObjects) {
            for (const object of [world.label, world.marker]) {
                const position = object.getWorldPosition(new THREE.Vector3()).project(state.camera);
                if (position.z < -1 || position.z > 1 || Math.abs(position.x) > 1 || Math.abs(position.y) > 1) continue;
                const x = rect.left + (position.x + 1) * rect.width / 2;
                const y = rect.top + (1 - position.y) * rect.height / 2;
                const padding = object === world.label ? 9 : 4;
                const halfWidth = (object === world.label ? object.scale.x / 2 : .009) * pixelsPerWorldUnit + padding;
                const halfHeight = (object === world.label ? object.scale.y / 2 : .009) * pixelsPerWorldUnit + padding;
                const dx = (event.clientX - x) / halfWidth;
                const dy = (event.clientY - y) / halfHeight;
                const score = dx * dx + dy * dy;
                if (score <= 1 && score < bestScore) {
                    bestHit = { object };
                    bestScore = score;
                }
            }
        }
        return bestHit;
    }

    function pickWorld(event) {
        const rect = state.renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, state.camera);
        const hit = raycaster.intersectObjects(state.worldObjects.flatMap(world => [world.label, world.marker]), false)[0] ||
            findScreenWorldHit(event, rect);
        if (!hit || !hit.object.userData.worldName) return;
        const name = hit.object.userData.worldName;
        state.selected = name;
        for (const world of state.worldObjects) {
            world.marker.material.color.set(world.name === name ? 0xcaff74 : 0x5dff95);
            world.label.material.color.set(world.name === name ? 0x86ffae : 0x3dbe70);
        }
        updateDetails();
        if (!hit.object.userData.isWorldLabel && name !== worldName) travelToWorld(name);
    }

    window.openGalaxyMap = openMap;
    modal.querySelector("#galaxyMapClose").addEventListener("click", closeMap);
    modal.querySelector("#galaxyTravel").addEventListener("click", () => travelToWorld(state.selected));
    modal.querySelector("#galaxyOverview").addEventListener("click", () => {
        state.controls.target.set(0, 0, 0);
        state.camera.position.set(0, .35, 1.65);
        state.controls.update();
    });
    modal.querySelector("#galaxyZoomIn").addEventListener("click", () => {
        state.camera.position.add(state.controls.target.clone().sub(state.camera.position).multiplyScalar(.2));
        state.controls.update();
    });
    modal.querySelector("#galaxyZoomOut").addEventListener("click", () => {
        state.camera.position.add(state.camera.position.clone().sub(state.controls.target).multiplyScalar(.25));
        state.controls.update();
    });
    modal.addEventListener("click", event => {
        if (event.target === modal) closeMap();
    });
    modal.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            event.stopPropagation();
            closeMap();
        }
    }, true);
    let pointerDown = null;
    modal.addEventListener("pointerdown", event => {
        if (state.open && event.target === state.renderer.domElement) {
            pointerDown = { x: event.clientX, y: event.clientY };
        }
    });
    modal.addEventListener("pointerup", event => {
        if (!state.open || !pointerDown || event.target !== state.renderer.domElement) return;
        const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
        pointerDown = null;
        if (distance < 6) pickWorld(event);
    });
    window.addEventListener("resize", resizeRenderer);
}

initGalaxyMap();
