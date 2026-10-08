const GALAXY_MAP_RADIUS = 900;

let galaxyMap = null;

function getGalaxyWorldSky(world) {
    const random = makeSeededRandom(world + "_sky");
    const hue = random();
    const saturation = .5 + .3 * random();
    const lightness = .6 + .2 * random();
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    random();
    const suns = 1 + Math.floor(3 * random());
    for (let i = 0; i < suns; i++) {
        random();
        random();
        random();
        random();
        random();
    }
    const moons = Math.floor(4 * random());
    return { color, suns, moons };
}

function getGalaxyResidents(worldData) {
    const users = worldData && worldData.users;
    if (users instanceof Map || users instanceof Set) return users.size;
    if (Array.isArray(users)) return users.length;
    return users && typeof users === "object" ? Object.keys(users).length : 0;
}

function createGalaxyWorldPosition(world) {
    const random = makeSeededRandom(MASTER_WORLD_KEY + "_world_" + world);
    const armCount = 5;
    const arm = Math.floor(random() * armCount);
    const radius = GALAXY_MAP_RADIUS * (.28 + .58 * Math.sqrt(random()));
    const angle = arm * Math.PI * 2 / armCount + radius * .0055 + (random() - .5) * .5;
    const height = (random() - .5) * (18 + 62 * Math.exp(-radius / 240));
    return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
}

function createGalaxyLabel(name, color) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 72;
    context.font = "700 42px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = color.getStyle();
    context.shadowBlur = 14;
    context.fillStyle = "#d9fff1";
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    label.scale.set(74, 21, 1);
    label.position.y = 18;
    return label;
}

function createGalaxyStarField() {
    const random = makeSeededRandom(MASTER_WORLD_KEY + "_atlas_stars");
    const positions = [];
    const colors = [];
    const starCount = 18000;
    const armCount = 5;
    const gaussian = () => {
        const u = Math.max(1e-8, random());
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
    };

    for (let i = 0; i < starCount; i++) {
        let x, y, z;
        if (random() < .16) {
            const spread = 105 + 210 * random();
            x = gaussian() * spread;
            z = gaussian() * spread;
            y = gaussian() * spread * .54;
        } else {
            const arm = Math.floor(random() * armCount);
            const radius = GALAXY_MAP_RADIUS * Math.sqrt(random());
            const angle = arm * Math.PI * 2 / armCount + radius * .0055 + gaussian() * (.035 + radius / 2600);
            const thickness = 12 + 68 * Math.exp(-radius / 260);
            x = Math.cos(angle) * radius + gaussian() * (9 + radius * .035);
            z = Math.sin(angle) * radius + gaussian() * (9 + radius * .035);
            y = gaussian() * thickness;
        }
        positions.push(x, y, z);
        const brightness = .4 + random() * .6;
        const tint = random();
        colors.push(brightness * (tint < .12 ? .72 : 1), brightness * (tint > .88 ? .83 : 1), brightness);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 2.6,
        vertexColors: true,
        transparent: true,
        opacity: .92,
        depthWrite: false,
        sizeAttenuation: true
    });
    return new THREE.Points(geometry, material);
}

function collectGalaxyWorlds() {
    const worlds = Array.from(knownWorlds.entries())
        .filter(([name]) => typeof name === "string" && name.trim())
        .map(([name, data]) => ({ name, data }));
    if (typeof worldName === "string" && worldName && !worlds.some(world => world.name === worldName)) {
        worlds.push({ name: worldName, data: null });
    }
    return worlds;
}

function updateGalaxyWorldDetails(world) {
    if (!galaxyMap || !world) return;
    galaxyMap.selected = world;
    const radius = Math.round(world.position.length() / GALAXY_MAP_RADIUS * 100);
    const color = world.sky.color;
    document.getElementById("galaxyPlanetPreview").style.setProperty("--planet-color", color.getStyle());
    document.getElementById("galaxyWorldName").textContent = world.name;
    document.getElementById("galaxyWorldSummary").textContent =
        `${radius}% galactic radius · ${world.residents} known residents`;
    document.getElementById("galaxySunCount").textContent = world.sky.suns;
    document.getElementById("galaxyMoonCount").textContent = world.sky.moons;
    galaxyMap.worldNodes.forEach(node => {
        const selected = node.userData.world === world;
        node.scale.setScalar(selected ? 1.45 : 1);
        node.material.emissiveIntensity = selected ? 1.1 : .35;
    });
}

function buildGalaxyMap() {
    const host = document.getElementById("galaxyCanvasHost");
    if (!host || !window.THREE || !THREE.OrbitControls) return;
    document.getElementById("galaxyAtlasTitle").textContent = MASTER_WORLD_KEY;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020b08);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 8000);
    camera.position.set(0, 920, 1780);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.replaceChildren(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.minDistance = 750;
    controls.maxDistance = 3300;
    controls.maxPolarAngle = Math.PI * .92;
    controls.target.set(0, 0, 0);
    scene.add(createGalaxyStarField());

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(94, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x9affc1, transparent: true, opacity: .08, wireframe: true })
    );
    scene.add(core);
    const coreGlow = new THREE.PointLight(0x26f08b, 1.4, 540);
    scene.add(coreGlow);

    const worldNodes = [];
    const worldTargets = [];
    collectGalaxyWorlds().forEach(({ name, data }) => {
        const position = createGalaxyWorldPosition(name);
        const sky = getGalaxyWorldSky(name);
        const planet = new THREE.Mesh(
            new THREE.SphereGeometry(8, 24, 18),
            new THREE.MeshStandardMaterial({
                color: sky.color,
                emissive: sky.color,
                emissiveIntensity: .35,
                roughness: .72,
                metalness: .04
            })
        );
        planet.position.copy(position);
        planet.userData.world = { name, data, position, sky, residents: getGalaxyResidents(data) };
        scene.add(planet);
        const label = createGalaxyLabel(name, sky.color);
        label.position.copy(position);
        label.position.y += 20;
        label.userData.world = planet.userData.world;
        scene.add(label);
        worldNodes.push(planet);
        worldTargets.push(planet, label);
    });

    if (!worldNodes.length) return;
    document.getElementById("galaxyWorldCount").textContent = `${worldNodes.length} known worlds`;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = null;
    renderer.domElement.addEventListener("pointerdown", event => {
        pointerStart = { x: event.clientX, y: event.clientY };
    });
    renderer.domElement.addEventListener("pointerup", event => {
        if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(worldTargets)[0];
        if (hit) updateGalaxyWorldDetails(hit.object.userData.world);
    });

    galaxyMap = { scene, camera, renderer, controls, worldNodes, selected: null, animation: null };
    const selected = worldNodes.find(node => node.userData.world.name === worldName) || worldNodes[0];
    updateGalaxyWorldDetails(selected.userData.world);
    resizeGalaxyMap();
}

function resizeGalaxyMap() {
    if (!galaxyMap) return;
    const host = document.getElementById("galaxyCanvasHost");
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    galaxyMap.camera.aspect = width / height;
    galaxyMap.camera.updateProjectionMatrix();
    galaxyMap.renderer.setSize(width, height, false);
}

function renderGalaxyMap() {
    if (!galaxyMap || document.getElementById("galaxyAtlas").getAttribute("aria-hidden") === "true") return;
    galaxyMap.controls.update();
    galaxyMap.renderer.render(galaxyMap.scene, galaxyMap.camera);
    galaxyMap.animation = requestAnimationFrame(renderGalaxyMap);
}

function openGalaxyAtlas() {
    const overlay = document.getElementById("galaxyAtlas");
    if (!overlay) return;
    if (!galaxyMap) buildGalaxyMap();
    if (!galaxyMap) return;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    resizeGalaxyMap();
    cancelAnimationFrame(galaxyMap.animation);
    renderGalaxyMap();
}

function closeGalaxyAtlas() {
    const overlay = document.getElementById("galaxyAtlas");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    if (galaxyMap) cancelAnimationFrame(galaxyMap.animation);
}

function initGalaxyAtlas() {
    document.getElementById("galaxyAtlasBtn")?.addEventListener("click", openGalaxyAtlas);
    document.getElementById("galaxyCloseBtn")?.addEventListener("click", closeGalaxyAtlas);
    document.getElementById("galaxyZoomInBtn")?.addEventListener("click", () => {
        if (galaxyMap) galaxyMap.camera.position.multiplyScalar(.82);
    });
    document.getElementById("galaxyZoomOutBtn")?.addEventListener("click", () => {
        if (galaxyMap) galaxyMap.camera.position.multiplyScalar(1.22);
    });
    document.getElementById("galaxyTravelBtn")?.addEventListener("click", () => {
        if (!galaxyMap?.selected) return;
        const targetWorld = galaxyMap.selected.name;
        closeGalaxyAtlas();
        if (targetWorld !== worldName) switchWorld(targetWorld);
    });
    document.getElementById("galaxyAtlas")?.addEventListener("click", event => {
        if (event.target.id === "galaxyAtlas") closeGalaxyAtlas();
    });
    window.addEventListener("resize", resizeGalaxyMap);
}

initGalaxyAtlas();
