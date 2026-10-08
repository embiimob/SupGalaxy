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
    const angle = galaxyHash(master + ":world:" + seed) / 4294967296 * Math.PI * 2;
    const radius = .24 + Math.sqrt(galaxyHash(seed + ":" + master + ":orbit") / 4294967296) * .72;
    const pitch = (galaxyHash(master + ":height:" + seed) / 4294967296 - .5) * .14;
    const spiralAngle = angle + Math.log(radius) * .58;
    return new THREE.Vector3(
        Math.cos(spiralAngle) * radius,
        pitch * radius,
        Math.sin(spiralAngle) * radius
    );
}

function getGalaxyWorldNames() {
    const names = new Set(knownWorlds instanceof Map ? knownWorlds.keys() : []);
    if (typeof worldName === "string" && worldName) names.add(worldName);
    return Array.from(names).filter(name => typeof name === "string" && name.trim()).sort((a, b) => a.localeCompare(b));
}

function createGalaxySky(seed) {
    const galaxy = new THREE.Group;
    const random = makeSeededRandom(seed + "_sky");
    const noise = makeNoise(galaxyMasterKeyword() + "_starfield");
    const positions = [];
    for (let i = 0; i < 5000; i++) {
        const azimuth = random() * Math.PI * 2;
        const polar = Math.acos(2 * random() - 1);
        const x = 4000 * Math.sin(polar) * Math.cos(azimuth);
        const y = 4000 * Math.cos(polar);
        const z = 4000 * Math.sin(polar) * Math.sin(azimuth);
        if (noise(.005 * x, .005 * y) > .7) positions.push(x, y, z);
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2 + 3 * random()
    }));
    galaxy.add(stars);
    galaxy.userData.isGalaxySky = true;
    refreshGalaxySkyWorlds(galaxy, seed);
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
        if (name === originName) continue;
        const direction = galaxyCoordinates(name).sub(origin).normalize().multiplyScalar(3970);
        positions.push(direction.x, direction.y, direction.z);
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const markers = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xc9ffd8,
        size: 5,
        transparent: true,
        opacity: .95,
        depthWrite: false
    }));
    group.add(markers);
    group.userData.worldMarkers = markers;
}

function getGalaxySystemDetails(seed) {
    const random = makeSeededRandom(seed + "_sky");
    for (let i = 0; i < 4; i++) random();
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
                <small>Drag to rotate · scroll or pinch to zoom · click a world to travel</small>
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
        label.scale.set(.31, .058, 1);
        label.position.y += .055;
        return label;
    }

    function addGalaxyPoints() {
        const galaxy = new THREE.Group;
        const points = [];
        const colors = [];
        const random = makeSeededRandom(galaxyMasterKeyword() + "_hologram");
        const armCount = 4;
        const arms = 850;
        for (let arm = 0; arm < armCount; arm++) {
            for (let i = 0; i < arms; i++) {
                const radius = .08 + Math.sqrt(random()) * .9;
                const angle = arm * Math.PI * 2 / armCount + Math.log(radius / .08) * 1.45 + (random() - .5) * .42;
                const thickness = .018 + radius * .035;
                points.push(
                    Math.cos(angle) * radius,
                    (random() - .5) * thickness,
                    Math.sin(angle) * radius
                );
                const brightness = .42 + random() * .58;
                colors.push(.12 * brightness, .82 * brightness, .34 * brightness);
            }
        }
        for (let i = 0; i < 480; i++) {
            const radius = Math.pow(random(), 1.8) * .29;
            const angle = random() * Math.PI * 2;
            points.push(Math.cos(angle) * radius, (random() - .5) * .1, Math.sin(angle) * radius);
            const brightness = .6 + random() * .4;
            colors.push(.2 * brightness, .96 * brightness, .39 * brightness);
        }
        const geometry = new THREE.BufferGeometry;
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        galaxy.add(new THREE.Points(geometry, new THREE.PointsMaterial({
            size: .008,
            vertexColors: true,
            transparent: true,
            opacity: .88,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        })));

        const corePoints = [];
        for (let i = 0; i < 100; i++) {
            const angle = i / 100 * Math.PI * 2;
            corePoints.push(Math.cos(angle) * .085, (random() - .5) * .012, Math.sin(angle) * .085);
        }
        const coreGeometry = new THREE.BufferGeometry;
        coreGeometry.setAttribute("position", new THREE.Float32BufferAttribute(corePoints, 3));
        galaxy.add(new THREE.Points(coreGeometry, new THREE.PointsMaterial({
            color: 0x79ff9f,
            size: .012,
            transparent: true,
            opacity: .82,
            depthWrite: false,
            blending: THREE.AdditiveBlending
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
                new THREE.SphereGeometry(name === worldName ? .019 : .014, 8, 6),
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
            label.position.copy(position).add(new THREE.Vector3(0, .035, 0));
            label.userData.worldName = name;
            state.scene.add(marker, label);
            state.worldObjects.push({ name, position, marker, label });
        }
        modal.querySelector("#galaxyWorldCount").textContent =
            `${state.worldObjects.length} known worlds · green core exclusion zone`;
    }

    function focusWorld(name, distance = .42) {
        const target = galaxyCoordinates(name);
        const offset = state.camera.position.clone().sub(state.controls.target);
        if (offset.length() < .001) offset.set(0, .15, 1);
        offset.setLength(distance);
        state.controls.target.copy(target);
        state.camera.position.copy(target).add(offset);
        state.controls.update();
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
        addWorlds();
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
        refreshGalaxySkyWorlds(stars, worldSeed);
        resizeRenderer();
        if (state.selected) focusWorld(state.selected);
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

    function pickWorld(event) {
        const rect = state.renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, state.camera);
        const hit = raycaster.intersectObjects(state.worldObjects.flatMap(world => [world.marker, world.label]), false)[0];
        if (!hit || !hit.object.userData.worldName) return;
        const name = hit.object.userData.worldName;
        state.selected = name;
        updateDetails();
        if (name !== worldName) travelToWorld(name);
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
