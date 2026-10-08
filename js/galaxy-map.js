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

function galaxyCoordinates(seed, scale = 1) {
    const master = galaxyMasterKeyword();
    const angleSeed = galaxyHash(master + ":world:" + seed);
    const radiusSeed = galaxyHash(seed + ":" + master + ":orbit");
    const angle = angleSeed / 4294967296 * Math.PI * 2;
    const radius = .23 + Math.sqrt(radiusSeed / 4294967296) * .72;
    const spiralAngle = angle + Math.log(radius) * .42;
    return {
        x: Math.cos(spiralAngle) * radius * scale,
        y: Math.sin(spiralAngle) * radius * scale,
        radius
    };
}

function createGalaxySky(seed) {
    const galaxy = new THREE.Group;
    const random = makeSeededRandom(galaxyMasterKeyword() + "_galaxy");
    const points = [];
    const colors = [];
    const hue = random();
    const radius = 2700;
    for (let arm = 0; arm < 4; arm++) {
        for (let i = 0; i < 740; i++) {
            const distance = 180 + Math.sqrt(random()) * radius;
            const angle = arm * Math.PI / 2 + Math.log(distance / 180) * 1.45 + (random() - .5) * .48;
            points.push(
                Math.cos(angle) * distance,
                (random() - .5) * (90 + distance * .025),
                Math.sin(angle) * distance
            );
            const color = new THREE.Color().setHSL(
                (hue + .48 + random() * .1) % 1,
                .45 + random() * .35,
                .52 + random() * .33
            );
            colors.push(color.r, color.g, color.b);
        }
    }
    for (let i = 0; i < 520; i++) {
        const distance = Math.pow(random(), 1.7) * 760;
        const angle = random() * Math.PI * 2;
        points.push(Math.cos(angle) * distance, (random() - .5) * 150, Math.sin(angle) * distance);
        const color = new THREE.Color().setHSL((hue + .08 + random() * .12) % 1, .5, .68 + random() * .25);
        colors.push(color.r, color.g, color.b);
    }
    const geometry = new THREE.BufferGeometry;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const starCloud = new THREE.Points(geometry, new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: .9,
        depthWrite: false
    }));
    galaxy.add(starCloud);

    const location = galaxyCoordinates(seed, radius * .9);
    const planetHue = galaxyHash(seed + "_planet") / 4294967296;
    const planetGeometry = new THREE.SphereGeometry(24, 32, 24);
    const planetPositions = planetGeometry.attributes.position;
    const planetColors = [];
    for (let i = 0; i < planetPositions.count; i++) {
        const x = planetPositions.getX(i) / 24;
        const y = planetPositions.getY(i) / 24;
        const z = planetPositions.getZ(i) / 24;
        const latitude = Math.asin(Math.max(-1, Math.min(1, y)));
        const longitude = Math.atan2(z, x);
        const surface = Math.sin(longitude * 3 + Math.sin(latitude * 7 + planetHue * 12)) +
            .55 * Math.sin(longitude * 7 - latitude * 9 + planetHue * 23) +
            .3 * Math.cos(latitude * 17 + longitude * 2);
        const color = new THREE.Color().setHSL(
            (planetHue + .48 + surface * .025 + 1) % 1,
            .66,
            Math.max(.2, Math.min(.73, .43 + surface * .09))
        );
        planetColors.push(color.r, color.g, color.b);
    }
    planetGeometry.setAttribute("color", new THREE.Float32BufferAttribute(planetColors, 3));
    const planet = new THREE.Mesh(
        planetGeometry,
        new THREE.MeshBasicMaterial({ vertexColors: true })
    );
    planet.position.set(location.x, 10, location.y);
    const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(43, 2, 5, 36),
        new THREE.MeshBasicMaterial({ color: 0x7de8ff, transparent: true, opacity: .75 })
    );
    orbit.position.copy(planet.position);
    orbit.rotation.x = Math.PI / 2;
    galaxy.add(planet, orbit);
    galaxy.userData.planet = planet;
    galaxy.userData.isGalaxy = true;
    return galaxy;
}

function getGalaxySystemDetails(seed) {
    const random = makeSeededRandom(seed + "_sky");
    for (let i = 0; i < 7; i++) random();
    const suns = 1 + Math.floor(3 * random());
    for (let i = 0; i < suns * 5; i++) random();
    const moons = Math.floor(4 * random());
    return { suns, moons };
}

function initGalaxyMap() {
    const button = document.createElement("button");
    button.id = "galaxyMapButton";
    button.type = "button";
    button.title = "Open the galaxy map";
    button.setAttribute("aria-label", "Open the galaxy map");
    button.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 22c2-9 14-15 24-10 7 4 3 12-5 14-7 2-15 0-16 6 0 4 6 6 12 3" fill="none" stroke="#8be8ff" stroke-width="2.2" stroke-linecap="round"/><path d="M13 22c2-5 9-8 14-5 4 2 1 6-4 7-4 1-9 0-9 4" fill="none" stroke="#d9aaff" stroke-width="1.8" stroke-linecap="round"/><circle cx="20" cy="21" r="2.2" fill="#fff1c7"/><circle cx="8" cy="10" r="1" fill="#fff"/></svg>';
    document.body.appendChild(button);

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
                    <button type="button" id="galaxyZoomOut" aria-label="Zoom out">−</button>
                    <button type="button" id="galaxyZoomIn" aria-label="Zoom in">+</button>
                    <button type="button" id="galaxyMapClose">Close</button>
                </div>
            </header>
            <div class="galaxy-map-content">
                <canvas id="galaxyCanvas" aria-label="Interactive map of the seeded galaxy"></canvas>
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
                <small>Scroll to zoom · drag to pan · right-drag or Shift-drag to rotate · click a world to travel</small>
                <small id="galaxyWorldCount"></small>
            </footer>
        </section>`;
    document.body.appendChild(modal);

    const canvas = modal.querySelector("#galaxyCanvas");
    const context = canvas.getContext("2d");
    const state = { zoom: .92, rotation: 0, panX: 0, panY: 0, selected: "", width: 0, height: 0, dpr: 1 };
    const mapRandom = makeSeededRandom(galaxyMasterKeyword() + "_atlas");
    const backgroundStars = Array.from({ length: 950 }, () => ({
        x: mapRandom() * 2 - 1,
        y: mapRandom() * 2 - 1,
        size: .35 + mapRandom() * 1.1,
        alpha: .2 + mapRandom() * .65
    }));
    const masterLabel = modal.querySelector("#galaxyMasterLabel");
    masterLabel.textContent = `MASTER KEYWORD · ${galaxyMasterKeyword()}`;

    function worldNames() {
        const names = new Set(knownWorlds instanceof Map ? knownWorlds.keys() : []);
        if (typeof worldName === "string" && worldName) names.add(worldName);
        return Array.from(names).filter(name => typeof name === "string" && name.trim()).sort((a, b) => a.localeCompare(b));
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        state.width = rect.width;
        state.height = rect.height;
        state.dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(rect.width * state.dpr);
        canvas.height = Math.round(rect.height * state.dpr);
        drawMap();
    }

    function transformPoint(point) {
        const cos = Math.cos(state.rotation);
        const sin = Math.sin(state.rotation);
        const radius = Math.min(state.width, state.height) * .43 * state.zoom;
        return {
            x: state.width / 2 + state.panX + (point.x * cos - point.y * sin) * radius,
            y: state.height / 2 + state.panY + (point.x * sin + point.y * cos) * radius
        };
    }

    function drawMap() {
        if (!state.width || !state.height || modal.hidden) return;
        context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        context.clearRect(0, 0, state.width, state.height);
        const background = context.createRadialGradient(state.width * .5, state.height * .48, 0, state.width * .5, state.height * .48, Math.max(state.width, state.height) * .7);
        background.addColorStop(0, "#0b1c37");
        background.addColorStop(1, "#030914");
        context.fillStyle = background;
        context.fillRect(0, 0, state.width, state.height);
        for (const star of backgroundStars) {
            context.globalAlpha = star.alpha;
            context.fillStyle = "#cceeff";
            context.fillRect((star.x + 1) * state.width / 2, (star.y + 1) * state.height / 2, star.size, star.size);
        }
        context.globalAlpha = 1;
        context.save();
        context.translate(state.width / 2 + state.panX, state.height / 2 + state.panY);
        context.rotate(state.rotation);
        const scale = Math.min(state.width, state.height) * .43 * state.zoom;
        context.scale(scale, scale);

        const nebula = context.createRadialGradient(0, 0, .05, 0, 0, 1.05);
        nebula.addColorStop(0, "rgba(255,205,147,.46)");
        nebula.addColorStop(.16, "rgba(159,117,255,.24)");
        nebula.addColorStop(.5, "rgba(63,111,255,.12)");
        nebula.addColorStop(1, "rgba(25,50,130,0)");
        context.fillStyle = nebula;
        context.beginPath();
        context.ellipse(0, 0, 1, .36, 0, 0, Math.PI * 2);
        context.fill();

        for (let arm = 0; arm < 4; arm++) {
            context.beginPath();
            for (let i = 0; i <= 120; i++) {
                const t = i / 120;
                const radius = .08 + t * .9;
                const angle = arm * Math.PI / 2 + t * Math.PI * 2.2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius * .36;
                if (i === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            const armGlow = context.createLinearGradient(-1, -.4, 1, .4);
            armGlow.addColorStop(0, "rgba(88,142,255,0)");
            armGlow.addColorStop(.5, "rgba(171,171,255,.48)");
            armGlow.addColorStop(1, "rgba(101,220,255,0)");
            context.strokeStyle = armGlow;
            context.lineWidth = .055;
            context.lineCap = "round";
            context.stroke();
        }

        context.beginPath();
        context.arc(0, 0, .22, 0, Math.PI * 2);
        context.strokeStyle = "rgba(255,201,132,.24)";
        context.setLineDash([.012, .018]);
        context.lineWidth = .003;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(0, 0, .075, 0, Math.PI * 2);
        context.fillStyle = "#03050b";
        context.fill();
        context.strokeStyle = "rgba(255,170,110,.75)";
        context.lineWidth = .008;
        context.stroke();
        context.restore();

        const names = worldNames();
        state.worldPoints = names.map(name => ({ name, ...transformPoint(galaxyCoordinates(name)) }));
        const activeWorld = typeof worldName === "string" ? worldName : "";
        for (const point of state.worldPoints) {
            const current = point.name === activeWorld;
            const selected = point.name === state.selected;
            context.beginPath();
            context.arc(point.x, point.y, current ? 6 : 4, 0, Math.PI * 2);
            context.fillStyle = current ? "#fff2b3" : selected ? "#83f3ff" : "#90c7ff";
            context.shadowColor = current ? "#ffd876" : "#60d9ff";
            context.shadowBlur = current || selected ? 15 : 7;
            context.fill();
            context.shadowBlur = 0;
            if ((state.zoom > 1.15 || current || selected) && state.width > 430) {
                context.font = current ? "bold 12px Inter, Arial" : "11px Inter, Arial";
                context.fillStyle = current ? "#fff3c5" : "#c8ddeb";
                context.fillText(point.name, point.x + 9, point.y + 4);
            }
        }
        modal.querySelector("#galaxyWorldCount").textContent = `${names.length} known world${names.length === 1 ? "" : "s"} · core exclusion zone`;
        if (!state.selected || !names.includes(state.selected)) state.selected = activeWorld || names[0] || "";
        updateDetails();
    }

    function updateDetails() {
        const name = state.selected || (typeof worldName === "string" ? worldName : "Unknown");
        const system = getGalaxySystemDetails(name);
        const position = galaxyCoordinates(name);
        const data = knownWorlds instanceof Map ? knownWorlds.get(name) : null;
        const residents = data && data.users instanceof Map ? data.users.size : data && data.users instanceof Set ? data.users.size : 0;
        modal.querySelector("#galaxyWorldName").textContent = name;
        modal.querySelector("#galaxySunCount").textContent = system.suns;
        modal.querySelector("#galaxyMoonCount").textContent = system.moons;
        modal.querySelector("#galaxyWorldInfo").textContent =
            `Seed ${name} · ${Math.round(position.radius * 100)}% galactic radius · ${residents} known resident${residents === 1 ? "" : "s"}`;
        const travel = modal.querySelector("#galaxyTravel");
        travel.disabled = !name || name === worldName;
        travel.textContent = name === worldName ? "Current world" : gameStarted ? "Travel to world" : "Use this world";
    }

    function openMap() {
        modal.hidden = false;
        state.selected = typeof worldName === "string" ? worldName : "";
        state.panX = 0;
        state.panY = 0;
        state.zoom = .92;
        resizeCanvas();
        modal.querySelector("#galaxyMapClose").focus();
    }

    function closeMap() {
        modal.hidden = true;
        button.focus();
    }

    function travelToWorld(name) {
        if (!name || name === worldName) return;
        closeMap();
        if (gameStarted && typeof switchWorld === "function") {
            switchWorld(name);
            return;
        }
        const input = document.getElementById("worldNameInput");
        if (input) {
            input.value = name;
            if (typeof updateLoginUI === "function") updateLoginUI();
        }
    }

    button.addEventListener("click", openMap);
    modal.querySelector("#galaxyMapClose").addEventListener("click", closeMap);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeMap();
    });
    modal.querySelector("#galaxyTravel").addEventListener("click", () => travelToWorld(state.selected));
    modal.querySelector("#galaxyZoomIn").addEventListener("click", () => {
        state.zoom = Math.min(4, state.zoom * 1.25);
        drawMap();
    });
    modal.querySelector("#galaxyZoomOut").addEventListener("click", () => {
        state.zoom = Math.max(.45, state.zoom / 1.25);
        drawMap();
    });
    modal.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            event.stopPropagation();
            closeMap();
        }
    }, true);
    window.addEventListener("resize", resizeCanvas);

    let drag = null;
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    canvas.addEventListener("wheel", event => {
        event.preventDefault();
        state.zoom = Math.max(.45, Math.min(4, state.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
        drawMap();
    }, { passive: false });
    canvas.addEventListener("pointerdown", event => {
        const rotate = event.button === 2 || event.shiftKey;
        drag = { x: event.clientX, y: event.clientY, moved: false, rotate, pointerId: event.pointerId };
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", event => {
        if (drag) {
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            if (drag.rotate) state.rotation += dx * .006;
            else {
                state.panX += dx;
                state.panY += dy;
            }
            drag.x = event.clientX;
            drag.y = event.clientY;
            drawMap();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const point = (state.worldPoints || []).find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 13);
        if (point && point.name !== state.selected) {
            state.selected = point.name;
            drawMap();
        }
    });
    canvas.addEventListener("pointerup", event => {
        if (!drag) return;
        const didMove = drag.moved;
        drag = null;
        if (didMove) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const point = (state.worldPoints || []).find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 15);
        if (point) {
            state.selected = point.name;
            updateDetails();
            if (point.name !== worldName) travelToWorld(point.name);
        }
        drawMap();
    });
    canvas.addEventListener("pointercancel", () => { drag = null; });
}

initGalaxyMap();
