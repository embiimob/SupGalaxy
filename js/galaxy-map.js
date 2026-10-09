const GALAXY_MAP_RADIUS = 900;

let galaxyMap = null;
let galaxyMasterKey = MASTER_WORLD_KEY;
let galaxyWorldData = null;
let galaxyLoadSequence = 0;
const galaxyLayouts = new Map();
const galaxyWorldCache = new Map();
const KNOWN_GALAXY_KEYS = Object.freeze([MASTER_WORLD_KEY, "MCWorlds"]);

function getGalaxyLayout(masterKey = galaxyMasterKey) {
    if (galaxyLayouts.has(masterKey)) return galaxyLayouts.get(masterKey);
    const random = makeSeededRandom(masterKey + "_atlas_layout");
    const armCount = 3 + Math.floor(random() * 5);
    const armLengths = Array.from({ length: armCount }, () => .25 + .75 * random());
    const layout = Object.freeze({
        armCount,
        armLengths: Object.freeze(armLengths)
    });
    galaxyLayouts.set(masterKey, layout);
    if (galaxyLayouts.size > 20) galaxyLayouts.delete(galaxyLayouts.keys().next().value);
    return layout;
}

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

function createGalaxyWorldPosition(world, masterKey) {
    const random = makeSeededRandom(masterKey + "_world_" + world);
    const { armCount, armLengths } = getGalaxyLayout(masterKey);
    const arm = Math.floor(random() * armCount);
    const radius = GALAXY_MAP_RADIUS * armLengths[arm] * (.25 + .7 * Math.sqrt(random()));
    const angle = arm * Math.PI * 2 / armCount + radius * .0055 + (random() - .5) * .5;
    const height = (random() - .5) * (18 + 62 * Math.exp(-radius / 240));
    return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
}

function createGalaxyLabel(name, color) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 72;
    context.font = "700 52px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = color.getStyle();
    context.shadowBlur = 14;
    context.fillStyle = "#d9fff1";
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    label.scale.set(100, 28, 1);
    label.position.y = 18;
    return label;
}

function createGalaxyStarField(masterKey) {
    const random = makeSeededRandom(masterKey + "_atlas_stars");
    const positions = [];
    const colors = [];
    const starCount = 12000;
    const { armCount, armLengths } = getGalaxyLayout(masterKey);
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
            const radius = GALAXY_MAP_RADIUS * armLengths[arm] * Math.sqrt(random());
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

function collectGalaxyWorlds(masterKey) {
    const hasLoadedGalaxy = galaxyWorldData !== null && galaxyMasterKey === masterKey;
    const sourceWorlds = hasLoadedGalaxy
        ? galaxyWorldData
        : knownWorlds;
    const worlds = Array.from(sourceWorlds.entries())
        .filter(([name]) => typeof name === "string" && name.trim())
        .map(([name, data]) => ({ name, data }));
    if (!hasLoadedGalaxy && masterKey === MASTER_WORLD_KEY && typeof worldName === "string" &&
        worldName && !worlds.some(world => world.name === worldName)) {
        worlds.push({ name: worldName, data: null });
    }
    return worlds;
}

async function discoverGalaxyWorlds(masterKey) {
    if (galaxyWorldCache.has(masterKey)) return new Map(galaxyWorldCache.get(masterKey));

    const worlds = new Map();
    const masterAddress = await GetPublicAddressByKeyword(masterKey);
    if (!masterAddress) return null;

    let skip = 0;
    const pageSize = 5000;
    while (true) {
        const roots = await GetRootsByAddress(masterAddress, skip, pageSize);
        if (!roots.length) break;
        for (const root of roots) {
            if (!root.TransactionId) continue;
            const profile = await GetProfileByAddress(root.FromAddress);
            if (!profile?.URN) continue;
            const username = profile.URN.replace(/^"|"$/g, "").trim();
            const userProfile = await GetProfileByURN(username);
            if (!userProfile?.Creators?.includes(root.FromAddress)) continue;

            let worldNameFromKey = null;
            let worldAddressFromKey = null;
            const joinKeywordPrefix = "MCUserJoin@";
            for (const [outputAddress, rawKeyword] of Object.entries(root.Keyword || {})) {
                if (!outputAddress || !rawKeyword) continue;
                const keyword = String(rawKeyword).replace(/^"|"$/g, "").replace(/#+$/g, "").trim();
                const candidates = keyword.startsWith("o") ? [keyword.slice(1).trim(), keyword] : [keyword];
                for (const candidate of candidates) {
                    if (!candidate || candidate === masterKey) continue;
                    if (candidate.startsWith(joinKeywordPrefix)) {
                        worldNameFromKey = candidate.slice(joinKeywordPrefix.length).trim();
                        worldAddressFromKey = outputAddress;
                        break;
                    }
                    const legacyParts = candidate.split("@");
                    const legacyWorld = legacyParts[0]?.trim();
                    const legacyUser = legacyParts.slice(1).join("@").trim();
                    if (legacyParts.length >= 2 && legacyWorld && legacyUser && username === legacyUser) {
                        worldNameFromKey = legacyWorld;
                        worldAddressFromKey = outputAddress;
                        break;
                    }
                }
                if (worldNameFromKey) break;
            }
            if (!worldNameFromKey) continue;

            let worldData = worlds.get(worldNameFromKey);
            if (!worldData) {
                worldData = { discoverer: username, users: new Map(), toAddress: worldAddressFromKey };
                worlds.set(worldNameFromKey, worldData);
            }
            worldData.users.set(username, {
                timestamp: Date.parse(root.BlockDate) || Date.now(),
                address: root.FromAddress || null,
                claimed: true
            });
            worldData.toAddress ||= worldAddressFromKey;
        }
        if (roots.length < pageSize) break;
        skip += pageSize;
    }

    galaxyWorldCache.set(masterKey, worlds);
    if (galaxyWorldCache.size > 5) galaxyWorldCache.delete(galaxyWorldCache.keys().next().value);
    return new Map(worlds);
}

function updateGalaxyWorldDetails(world, focus = true) {
    if (!galaxyMap || !world) return;
    galaxyMap.selected = world;
    if (focus) {
        const targetOffset = world.position.clone().sub(galaxyMap.controls.target);
        galaxyMap.controls.target.copy(world.position);
        galaxyMap.camera.position.add(targetOffset);
    }
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

function disposeGalaxyMap() {
    if (!galaxyMap) return;
    cancelAnimationFrame(galaxyMap.animation);
    galaxyMap.controls.dispose();
    galaxyMap.scene.traverse(object => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach(material => {
            for (const value of Object.values(material)) {
                if (value && value.isTexture) value.dispose();
            }
            material.dispose();
        });
    });
    galaxyMap.renderer.dispose();
    galaxyMap.renderer.domElement.remove();
    galaxyMap = null;
}

function buildGalaxyMap(masterKey = galaxyMasterKey) {
    const host = document.getElementById("galaxyCanvasHost");
    if (!host || !window.THREE || !THREE.OrbitControls) return;
    disposeGalaxyMap();
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
    controls.minDistance = 80;
    controls.maxDistance = 3300;
    controls.maxPolarAngle = Math.PI * .92;
    controls.target.set(0, 0, 0);
    scene.add(createGalaxyStarField(masterKey));

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(94, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x9affc1, transparent: true, opacity: .08, wireframe: true })
    );
    scene.add(core);
    const coreGlow = new THREE.PointLight(0x26f08b, 1.4, 540);
    scene.add(coreGlow);

    const worldNodes = [];
    const worldTargets = [];
    collectGalaxyWorlds(masterKey).forEach(({ name, data }) => {
        const position = createGalaxyWorldPosition(name, masterKey);
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

    galaxyMap = { scene, camera, renderer, controls, worldNodes, selected: null, animation: null, masterKey };
    const selected = worldNodes.find(node => node.userData.world.name === worldName) || worldNodes[0];
    if (selected) {
        updateGalaxyWorldDetails(selected.userData.world, false);
        document.getElementById("galaxyTravelBtn").disabled = false;
    } else {
        galaxyMap.selected = null;
        document.getElementById("galaxyWorldName").textContent = "No worlds found";
        document.getElementById("galaxyWorldSummary").textContent = `No known worlds are linked to “${masterKey}”.`;
        document.getElementById("galaxySunCount").textContent = "0";
        document.getElementById("galaxyMoonCount").textContent = "0";
        document.getElementById("galaxyPlanetPreview").style.setProperty("--planet-color", "#64d68d");
        document.getElementById("galaxyTravelBtn").disabled = true;
    }
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
    galaxyLoadSequence++;
    const input = document.getElementById("galaxyAtlasTitle");
    input.value = MASTER_WORLD_KEY;
    input.disabled = false;
    document.getElementById("galaxyMapStatus").textContent = "";
    if (galaxyMasterKey !== MASTER_WORLD_KEY) {
        galaxyMasterKey = MASTER_WORLD_KEY;
        galaxyWorldData = null;
        buildGalaxyMap(MASTER_WORLD_KEY);
    }
    if (!galaxyMap) buildGalaxyMap();
    if (!galaxyMap) return;
    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");
    resizeGalaxyMap();
    cancelAnimationFrame(galaxyMap.animation);
    renderGalaxyMap();
}

async function loadGalaxyFromInput() {
    const input = document.getElementById("galaxyAtlasTitle");
    const status = document.getElementById("galaxyMapStatus");
    const masterKey = input.value.trim();
    if (!/^(?=.*[A-Za-z0-9])[A-Za-z0-9 ]{1,20}$/.test(masterKey)) {
        status.textContent = "Use 1–20 letters, numbers, or spaces.";
        input.focus();
        return;
    }

    const request = ++galaxyLoadSequence;
    input.disabled = true;
    status.textContent = `Loading ${masterKey}…`;
    try {
        const worlds = await discoverGalaxyWorlds(masterKey);
        if (request !== galaxyLoadSequence) return;
        if (!worlds) {
            status.textContent = `Could not find master key “${masterKey}”.`;
            return;
        }
        galaxyMasterKey = masterKey;
        galaxyWorldData = worlds;
        status.textContent = "";
        buildGalaxyMap(masterKey);
        if (galaxyMap) {
            cancelAnimationFrame(galaxyMap.animation);
            renderGalaxyMap();
        }
    } catch (error) {
        if (request === galaxyLoadSequence) {
            console.error("[GalaxyAtlas] Failed to load galaxy:", error);
            status.textContent = "Could not load this galaxy. Try again.";
        }
    } finally {
        if (request === galaxyLoadSequence) input.disabled = false;
    }
}

function closeGalaxyAtlas() {
    const overlay = document.getElementById("galaxyAtlas");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    if (galaxyMap) cancelAnimationFrame(galaxyMap.animation);
}

function initGalaxyAtlas() {
    const knownGalaxyList = document.getElementById("knownGalaxyList");
    const knownGalaxyCount = document.getElementById("knownGalaxyCount");
    knownGalaxyCount.textContent = KNOWN_GALAXY_KEYS.length;
    for (const masterKey of KNOWN_GALAXY_KEYS) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = masterKey;
        button.addEventListener("click", () => {
            const input = document.getElementById("galaxyAtlasTitle");
            input.value = masterKey;
            loadGalaxyFromInput();
        });
        knownGalaxyList.appendChild(button);
    }
    document.getElementById("galaxyAtlasTitle")?.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.key === "Enter") {
            event.preventDefault();
            loadGalaxyFromInput();
        }
    });
    document.getElementById("galaxyCloseBtn")?.addEventListener("click", closeGalaxyAtlas);
    document.getElementById("galaxyZoomInBtn")?.addEventListener("click", () => {
        if (galaxyMap) zoomGalaxyCamera(.78);
    });
    document.getElementById("galaxyZoomOutBtn")?.addEventListener("click", () => {
        if (galaxyMap) zoomGalaxyCamera(1.28);
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

function zoomGalaxyCamera(factor) {
    const offset = galaxyMap.camera.position.clone().sub(galaxyMap.controls.target);
    const distance = Math.max(galaxyMap.controls.minDistance,
        Math.min(galaxyMap.controls.maxDistance, offset.length() * factor));
    offset.setLength(distance);
    galaxyMap.camera.position.copy(galaxyMap.controls.target).add(offset);
    galaxyMap.controls.update();
}

initGalaxyAtlas();
