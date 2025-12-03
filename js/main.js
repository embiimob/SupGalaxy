
function showLoadingIndicator(percent, text) {
    const el = document.getElementById('worldSyncProgress');
    if (!el) return;
    el.style.display = 'flex';
    const circle = el.querySelector('.progress-circle');
    if (circle) {
        circle.style.setProperty('--p', percent);
        circle.dataset.progress = percent;
    }
    const label = el.querySelector('.progress-circle-label');
    if (label) {
        label.textContent = text || `${Math.round(percent)}%`;
    }
}

function hideLoadingIndicator() {
    const el = document.getElementById('worldSyncProgress');
    if (el) {
        el.style.display = 'none';
    }
}

// Make them global
window.showLoadingIndicator = showLoadingIndicator;
window.hideLoadingIndicator = hideLoadingIndicator;
function getCurrentWorldState() {
    if (!WORLD_STATES.has(worldName)) {
        WORLD_STATES.set(worldName, {
            chunkDeltas: new Map,
            foreignBlockOrigins: new Map,
            // Maps block position key (e.g., "x,y,z") to its IPFS truncated date for monotonic ordering
            ipfsTruncatedDates: new Map
        });
    }
    // Ensure existing world states have the ipfsTruncatedDates map (backward compatibility)
    const state = WORLD_STATES.get(worldName);
    if (!state.ipfsTruncatedDates) {
        state.ipfsTruncatedDates = new Map;
    }
    return state;
}

function simpleHash(e) {
    let t = 0;
    for (let o = 0; o < e.length; o++) {
        t = (t << 5) - t + e.charCodeAt(o), t |= 0
    }
    return Math.abs(t)
}
function reconstructCalligraphyStonesFromDeltas(deltas) {
    if (!deltas || deltas.length === 0) return;

    // Ensure calligraphyStones global exists
    if (typeof calligraphyStones === 'undefined') {
        calligraphyStones = {};
    }

    console.log("[RECONSTRUCTION] Scanning deltas for orphaned calligraphy stones (b:128)");
    let reconstructedCount = 0;

    for (const deltaGroup of deltas) {
        const chunkKey = deltaGroup.chunk.replace(/^#/, "");
        const changes = deltaGroup.changes;

        if (!changes || !Array.isArray(changes)) continue;

        for (const change of changes) {
            // Check if this is a calligraphy stone block (id 128)
            if (change.b === 128) {
                // Parse chunk coordinates from chunk key (format: worldname:cx:cz)
                const parts = chunkKey.split(':');
                if (parts.length < 3) {
                    console.warn(`[RECONSTRUCTION] Invalid chunk key format: ${chunkKey}`);
                    continue;
                }

                const cx = parseInt(parts[1]);
                const cz = parseInt(parts[2]);

                // Calculate world coordinates using modWrap for consistency
                const worldX = modWrap(cx * CHUNK_SIZE + change.x, MAP_SIZE);
                const worldY = change.y;
                const worldZ = modWrap(cz * CHUNK_SIZE + change.z, MAP_SIZE);

                const key = `${worldX},${worldY},${worldZ}`;

                // Only reconstruct if no metadata exists for this position
                if (!calligraphyStones[key]) {
                    console.log(`[RECONSTRUCTION] Creating placeholder for calligraphy stone at ${key}`);

                    // Create placeholder with sensible defaults
                    const placeholderData = {
                        x: worldX,
                        y: worldY,
                        z: worldZ,
                        width: 2,
                        height: 1.5,
                        offsetX: 0,
                        offsetY: 0.5,
                        offsetZ: 0.6,
                        bgColor: '#ffffff',
                        transparent: false,
                        fontFamily: 'Arial',
                        fontSize: 32,
                        fontWeight: 'normal',
                        fontColor: '#000000',
                        text: '',
                        link: '',
                        direction: { x: 0, y: 0, z: 1 } // Default forward direction
                    };

                    try {
                        createCalligraphyStoneScreen(placeholderData);
                        reconstructedCount++;
                    } catch (error) {
                        console.error(`[RECONSTRUCTION] Failed to create calligraphy stone at ${key}:`, error);
                    }
                }
            }
        }
    }

    if (reconstructedCount > 0) {
        console.log(`[RECONSTRUCTION] Successfully reconstructed ${reconstructedCount} calligraphy stone(s)`);
    }
}

async function applySaveFile(e, t, o) {
    if (e.isHostSession) {
        WORLD_STATES.clear();
        for (const [worldName, data] of e.worldStates) {
            WORLD_STATES.set(worldName, {
                chunkDeltas: new Map(data.chunkDeltas),
                foreignBlockOrigins: new Map(data.foreignBlockOrigins),
                ipfsTruncatedDates: new Map(data.ipfsTruncatedDates || [])
            });
        }
        processedMessages = new Set(e.processedMessages);
        addMessage("Host session loaded. Restoring all world states.", 3e3);
    }
    if (e.playerData && e.hash) {
        const t = e.playerData,
            o = e.hash;
        if (simpleHash(JSON.stringify(t)) !== o) return void addMessage("Sorry, file malformed and does not login.", 3e3);

        // Migration: Convert legacy Set users to Map for all known worlds
        if (knownWorlds.size > 0) {
            for (let [wName, wData] of knownWorlds) {
                if (wData.users instanceof Set) {
                    const newMap = new Map();
                    wData.users.forEach(u => newMap.set(u, { timestamp: Date.now(), address: null }));
                    wData.users = newMap;
                }
            }
        }

        addMessage("Session file verified. Loading player...", 2e3), worldName = t.world, userName = t.user;
        const c = makeSeededRandom((worldSeed = t.seed) + "_colors");
        for (const e in BLOCKS)
            if (Object.hasOwnProperty.call(BLOCKS, e)) {
                const t = BLOCKS[e],
                    o = new THREE.Color(t.color),
                    a = {};
                o.getHSL(a);
                const n = a.h + .05 * (c() - .5),
                    r = Math.max(.4, Math.min(.9, a.s + .2 * (c() - .5))),
                    s = Math.max(.1, Math.min(.5, a.l + .2 * (c() - .5)));
                o.setHSL(n, r, s), t.color = "#" + o.getHexString()
            } document.getElementById("worldNameInput").value = worldName, document.getElementById("userInput").value = userName;
        var a, n = userName + "@" + worldName;
        try {
            a = await GetProfileByURN(userName)
        } catch (e) {
            console.error("Failed to get profile by URN", e), a = null
        }
        userAddress = a && a.Creators ? a.Creators[0] : "anonymous";
        if (!knownUsers.has(userName)) knownUsers.set(userName, userAddress);

        if (knownWorlds.has(worldName)) {
            let wData = knownWorlds.get(worldName);
            // Defensive coding: convert deprecated Set to Map if necessary
            if (wData.users instanceof Set) {
                const newMap = new Map();
                wData.users.forEach(u => newMap.set(u, { timestamp: Date.now(), address: null }));
                wData.users = newMap;
            }
            wData.users.set(userName, { timestamp: Date.now(), address: userAddress });
        } else {
            knownWorlds.set(worldName, {
                discoverer: userName,
                users: new Map([[userName, { timestamp: Date.now(), address: userAddress }]]),
                toAddress: userAddress
            });
        }

        keywordCache.set(userAddress, n);
        document.getElementById("loginOverlay").style.display = "none";
        document.getElementById("hud").style.display = "block";
        document.getElementById("hotbar").style.display = "flex";
        document.getElementById("rightPanel").style.display = "flex";
        document.getElementById("worldLabel").textContent = worldName;
        document.getElementById("seedLabel").textContent = "User " + userName;
        updateHudButtons();
        console.log("[LOGIN] Initializing Three.js from session");
        await initAudio();
        initThree();
        initMusicPlayer();
        initVideoPlayer();
        player.x = t.profile.x;
        player.y = t.profile.y;
        player.z = t.profile.z;
        player.health = t.profile.health;
        player.score = t.profile.score;
        INVENTORY = t.profile.inventory;
        musicPlaylist = t.musicPlaylist || [];
        videoPlaylist = t.videoPlaylist || [];
        selectedHotIndex = 0;
        selectedBlockId = INVENTORY[0] ? INVENTORY[0].id : null;
        initHotbar();
        updateHotbarUI();
        console.log("[LOGIN] Creating ChunkManager from session");
        chunkManager = new ChunkManager(worldSeed);
        if (t.deltas) {
            showLoadingIndicator(0, "Loading File...");
            await new Promise(r => setTimeout(r, 50)); // Allow UI to render
            const totalDeltas = t.deltas.length;
            for (let idx = 0; idx < totalDeltas; idx++) {
                const r = t.deltas[idx];
                var s = r.chunk.replace(/^#/, ""),
                    i = r.changes;
                chunkManager.applyDeltasToChunk(s, i);
                const worldState = getCurrentWorldState();
                if (!worldState.chunkDeltas.has(s)) {
                    worldState.chunkDeltas.set(s, []);
                }
                const changesWithSource = i.map(change => ({ ...change, source: 'local' }));
                worldState.chunkDeltas.get(s).push(...changesWithSource);

                if (idx % 10 === 0) {
                    const percent = Math.round((idx / totalDeltas) * 100);
                    showLoadingIndicator(percent, `Loading ${percent}%`);
                    await new Promise(r => setTimeout(r, 0)); // Yield to UI
                }
            }
            hideLoadingIndicator();
        }
        populateSpawnChunks(), spawnPoint = {
            x: player.x,
            y: player.y,
            z: player.z
        }, player.vy = 0, player.onGround = !0;
        Math.floor(MAP_SIZE / CHUNK_SIZE);
        var l = Math.floor(player.x / CHUNK_SIZE),
            d = Math.floor(player.z / CHUNK_SIZE);
        if (console.log("[LOGIN] Preloading initial chunks from session"), chunkManager.preloadChunks(l, d, INITIAL_LOAD_RADIUS), t.magicianStones) {
            console.log("[LOGIN] Loading magician stones from session");
            // Clean up any existing magician stones before loading new ones
            for (const existingKey in magicianStones) {
                if (magicianStones[existingKey]) {
                    cleanupMagicianStone(magicianStones[existingKey], existingKey);
                }
            }
            magicianStones = {}; // Clear existing stones
            for (const key in t.magicianStones) {
                if (Object.hasOwnProperty.call(t.magicianStones, key)) {
                    const stoneData = { ...t.magicianStones[key], source: 'local' };
                    createMagicianStoneScreen(stoneData);

                    // Defer block placement until the chunk is loaded
                    const cx = Math.floor(modWrap(stoneData.x, MAP_SIZE) / CHUNK_SIZE);
                    const cz = Math.floor(modWrap(stoneData.z, MAP_SIZE) / CHUNK_SIZE);
                    const chunkKey = makeChunkKey(worldName, cx, cz);
                    const delta = {
                        x: modWrap(stoneData.x, CHUNK_SIZE),
                        y: stoneData.y,
                        z: modWrap(stoneData.z, CHUNK_SIZE),
                        b: 127
                    };
                    chunkManager.addPendingDeltas(chunkKey, [delta]);
                }
            }
        }
        if (t.calligraphyStones) {
            console.log("[LOGIN] Loading calligraphy stones from session");
            calligraphyStones = {}; // Clear existing stones
            for (const key in t.calligraphyStones) {
                if (Object.hasOwnProperty.call(t.calligraphyStones, key)) {
                    const stoneData = { ...t.calligraphyStones[key], source: 'local' };
                    createCalligraphyStoneScreen(stoneData);

                    // Defer block placement until the chunk is loaded
                    const cx = Math.floor(modWrap(stoneData.x, MAP_SIZE) / CHUNK_SIZE);
                    const cz = Math.floor(modWrap(stoneData.z, MAP_SIZE) / CHUNK_SIZE);
                    const chunkKey = makeChunkKey(worldName, cx, cz);
                    const delta = {
                        x: modWrap(stoneData.x, CHUNK_SIZE),
                        y: stoneData.y,
                        z: modWrap(stoneData.z, CHUNK_SIZE),
                        b: 128
                    };
                    chunkManager.addPendingDeltas(chunkKey, [delta]);
                }
            }
        } else if (t.deltas) {
            // If no calligraphyStones metadata but deltas exist, reconstruct orphaned stones
            reconstructCalligraphyStonesFromDeltas(t.deltas);
        }

        if (t.chests) {
            console.log("[LOGIN] Loading chests from session");
            chests = {};
            for (const key in t.chests) {
                if (t.chests[key]) {
                    const chestData = t.chests[key];
                    const meshData = createChestMesh(chestData.x, chestData.y, chestData.z, chestData.rotation);
                    chests[key] = {
                        ...chestData,
                        mesh: meshData.mesh,
                        lid: meshData.lid,
                        isOpen: false
                    };

                    const cx = Math.floor(modWrap(chestData.x, MAP_SIZE) / CHUNK_SIZE);
                    const cz = Math.floor(modWrap(chestData.z, MAP_SIZE) / CHUNK_SIZE);
                    const chunkKey = makeChunkKey(worldName, cx, cz);
                    const delta = {
                        x: modWrap(chestData.x, CHUNK_SIZE),
                        y: chestData.y,
                        z: modWrap(chestData.z, CHUNK_SIZE),
                        b: 131
                    };
                    chunkManager.addPendingDeltas(chunkKey, [delta]);
                }
            }
        }
        setupMobile(), initMinimap(), updateHotbarUI(), cameraMode = "first", controls.enabled = !1, avatarGroup.visible = !1, camera.position.set(player.x, player.y + 1.62, player.z), camera.rotation.set(0, 0, 0, "YXZ");
        if (!isMobile()) try {
            renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
        } catch (e) {
            addMessage("Pointer lock failed. Serve over HTTPS or ensure allow-pointer-lock is set in iframe.", 3e3)
        }
        player.yaw = 0, player.pitch = 0, lastFrame = performance.now(), lastRegenTime = lastFrame;
        registerKeyEvents();
        return console.log("[LOGIN] Starting game loop from session"), requestAnimationFrame(gameLoop), addMessage("Loaded session for " + userName + " in " + worldName, 3e3), updateHud(), initServers(), worker.postMessage({
            type: "sync_processed",
            ids: Array.from(processedMessages)
        }), startWorker()
    }
    if (e && (e.foreignBlockOrigins && (getCurrentWorldState().foreignBlockOrigins = new Map(e.foreignBlockOrigins)), addMessage(`Loaded ${getCurrentWorldState().foreignBlockOrigins.size} foreign blocks.`, 2e3), e.deltas)) {
        var c = await GetProfileByAddress(t),
            u = c && c.URN ? c.URN : "anonymous",
            p = Date.now();
        // For manually uploaded files (local changes not yet published to blockchain),
        // use current time as BlockDate. Published chunks get their BlockDate from
        // GetPublicMessagesByAddress when loaded via keyword search.
        let blockDate = p; // Default to current time
        const blockAge = p - blockDate;

        for (var r of e.deltas) {
            s = r.chunk.replace(/^#/, ""), i = r.changes;

            const ownership = OWNED_CHUNKS.get(s);

            // Apply IPFS ownership rules
            if (!ownership) {
                // No existing ownership
                if (blockAge > IPFS_MATURITY_PERIOD && blockAge < IPFS_MAX_OWNERSHIP_PERIOD) {
                    // Mature claim (30d-1y): create ownership and apply deltas
                    chunkManager.applyDeltasToChunk(s, i);
                    updateChunkOwnership(s, u, blockDate, 'ipfs', blockDate);
                    addMessage("Updated chunk " + s, 1e3);
                } else if (blockAge <= IPFS_MATURITY_PERIOD) {
                    // Immature claim (<30d): mark pending, apply deltas but no edit rights yet
                    chunkManager.applyDeltasToChunk(s, i);
                    updateChunkOwnership(s, u, blockDate, 'ipfs', blockDate);
                    addMessage("Loaded chunk " + s + " (pending claim maturity)", 1e3);
                } else {
                    // Expired claim (>1y): load structures only, no ownership
                    chunkManager.applyDeltasToChunk(s, i);
                    addMessage("Loaded chunk " + s + " (no ownership, expired)", 1e3);
                }
            } else if (ownership.username === u && ownership.type === 'ipfs') {
                // Same user IPFS ownership: accept deltas, extend expiry
                chunkManager.applyDeltasToChunk(s, i);
                updateChunkOwnership(s, u, blockDate, 'ipfs', blockDate);
                addMessage("Updated chunk " + s + " (ownership extended)", 1e3);
            } else {
                // Different owner or home spawn: reject
                addMessage("Cannot edit chunk " + s + ": owned by " + ownership.username, 3e3);
                console.log(`[Ownership] IPFS load rejected for chunk ${s}: owned by ${ownership.username}`);
            }
        }
        if (e.magicianStones) {
            for (const key in e.magicianStones) {
                if (Object.hasOwnProperty.call(e.magicianStones, key)) {
                    createMagicianStoneScreen({ ...e.magicianStones[key], source: 'ipfs' });
                }
            }
        }
        if (e.calligraphyStones) {
            for (const key in e.calligraphyStones) {
                if (Object.hasOwnProperty.call(e.calligraphyStones, key)) {
                    createCalligraphyStoneScreen({ ...e.calligraphyStones[key], source: 'ipfs' });
                }
            }
        } else if (e.deltas) {
            // If no calligraphyStones metadata but deltas exist, reconstruct orphaned stones
            reconstructCalligraphyStonesFromDeltas(e.deltas);
        }
        e.profile && t === userAddress && (lastSavedPosition = new THREE.Vector3(e.profile.x, e.profile.y, e.profile.z), updateHotbarUI())
    }
}

function updateTorchRegistry(e) {
    const t = e.cx * CHUNK_SIZE,
        o = e.cz * CHUNK_SIZE;
    torchRegistry.forEach(((t, o) => {
        Math.floor(t.x / CHUNK_SIZE) === e.cx && Math.floor(t.z / CHUNK_SIZE) === e.cz && torchRegistry.delete(o)
    }));
    for (let a = 0; a < CHUNK_SIZE; a++)
        for (let n = 0; n < CHUNK_SIZE; n++)
            for (let r = 0; r < MAX_HEIGHT; r++) {
                const s = e.get(a, r, n);
                if (BLOCKS[s] && BLOCKS[s].light) {
                    const e = t + a,
                        s = o + n,
                        i = r,
                        l = `${e},${i},${s}`;
                    torchRegistry.set(l, {
                        x: e,
                        y: i,
                        z: s
                    })
                }
            }
}

function initThree() {
    console.log("[initThree] Starting"), (scene = new THREE.Scene).background = new THREE.Color(8900331), console.log("[initThree] Scene created"), (camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .1, 1e4)).position.set(0, 34, 0), console.log("[initThree] Camera created"), (renderer = new THREE.WebGLRenderer({
        antialias: !0
    })).setSize(innerWidth, innerHeight), renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)), document.body.appendChild(renderer.domElement), console.log("[initThree] Renderer created and appended"), (controls = new THREE.OrbitControls(camera, renderer.domElement)).enableDamping = !0, controls.maxPolarAngle = Math.PI / 2, controls.minDistance = 2, controls.maxDistance = 400, controls.enabled = !1, console.log("[initThree] Controls created");
    var e = new THREE.DirectionalLight(16777215, 1);
    e.position.set(100, 200, 100), scene.add(e), scene.add(new THREE.AmbientLight(16777215, .2));
    const t = new THREE.HemisphereLight(16777147, 526368, .6);
    scene.add(t), console.log("[initThree] Lights added"), emberTexture = createEmberTexture(worldSeed), meshGroup = new THREE.Group, scene.add(meshGroup), console.log("[initThree] Mesh group created"), scene.add(crackMeshes), lightManager.init(), initSky(), console.log("[initThree] Sky initialized"), renderer.domElement.addEventListener("pointerdown", (function (e) {
        onPointerDown(e)
    })), renderer.domElement.addEventListener("wheel", (function (e) {
        if (e.preventDefault(), "first" === cameraMode) {
            var t = e.deltaY > 0 ? 1 : -1;
            selectedHotIndex = (selectedHotIndex + t + 9) % 9, updateHotbarUI()
        }
    })), renderer.domElement.addEventListener("click", (function () {
        if (isMobile()) {
            if ("first" === cameraMode) document.getElementById("crosshair").style.display = "block";
        } else if ("first" === cameraMode && !mouseLocked) try {
            renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
        } catch (e) {
            addMessage("Pointer lock failed. Serve over HTTPS or check iframe permissions.")
        }
    }));
    let o = 0,
        a = 0;
    renderer.domElement.addEventListener("touchstart", (e => {
        let t = e.target,
            n = !1;
        for (; t && t !== document.body;) {
            if (t.classList.contains("m-btn") || t.classList.contains("m-action")) {
                n = !0;
                break
            }
            t = t.parentElement
        }
        n || "first" === cameraMode && e.touches.length > 0 && (o = e.touches[0].clientX, a = e.touches[0].clientY, e.preventDefault())
    }), {
        passive: !1
    }), renderer.domElement.addEventListener("touchmove", (e => {
        if ("first" === cameraMode && e.touches.length > 0) {
            const t = e.touches[0].clientX,
                n = e.touches[0].clientY,
                r = t - o,
                s = n - a,
                i = .005;
            player.yaw -= r * i, player.pitch -= s * i, player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch)), camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"), avatarGroup && avatarGroup.children[3] && avatarGroup.children[3].rotation.set(player.pitch, 0, 0), o = t, a = n, e.preventDefault()
        }
    }), {
        passive: !1
    }), document.addEventListener("pointerlockchange", (function () {
        mouseLocked = document.pointerLockElement === renderer.domElement, document.getElementById("crosshair").style.display = mouseLocked && "first" === cameraMode ? "block" : "none"
    })), renderer.domElement.addEventListener("mousemove", (function (e) {
        if ("first" === cameraMode && mouseLocked) {
            player.yaw -= .002 * e.movementX, player.pitch -= .002 * e.movementY, player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch)), camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"), avatarGroup && avatarGroup.children[3].rotation.set(player.pitch, 0, 0)
        }
    })), window.addEventListener("resize", (function () {
        camera.aspect = innerWidth / innerHeight, camera.updateProjectionMatrix(), renderer.setSize(innerWidth, innerHeight), updateMinimap()
    })), createAndSetupAvatar(userName, !0)
}

function createAndSetupAvatar(e, t, o = 0) {
    const a = t ? avatarGroup : playerAvatars.get(e);
    a && (scene.remove(a), disposeObject(a), t || playerAvatars.delete(e));
    const n = new THREE.Group;
    o && (n.rotation.y = o);
    const r = makeSeededRandom(e),
        s = new THREE.MeshStandardMaterial({
            color: (new THREE.Color).setHSL(r(), .6 + .2 * r(), .6 + .1 * r())
        }),
        i = new THREE.MeshStandardMaterial({
            color: (new THREE.Color).setHSL(r(), .7 + .3 * r(), .5 + .2 * r())
        }),
        l = new THREE.MeshStandardMaterial({
            color: (new THREE.Color).setHSL(r(), .6 + .2 * r(), .6 + .1 * r())
        }),
        d = new THREE.MeshStandardMaterial({
            color: (new THREE.Color).setHSL(r(), .7 + .3 * r(), .4 + .2 * r())
        }),
        c = 1.8 / 2.6,
        u = .8 * c,
        p = 1.2 * c,
        m = .6 * c,
        y = .4 * c,
        h = .8 * c,
        f = .3 * c,
        g = new THREE.BoxGeometry(y, u, y),
        E = new THREE.BoxGeometry(h, p, .4 * c),
        v = new THREE.BoxGeometry(m, m, m),
        M = new THREE.BoxGeometry(f, .8307692307692307, f),
        S = new THREE.Mesh(g, d);
    S.position.set(-h / 4, u / 2, 0);
    const I = new THREE.Mesh(g, d);
    I.position.set(h / 4, u / 2, 0);
    const k = new THREE.Mesh(E, i);
    k.position.set(0, .9692307692307692, 0);
    const w = new THREE.Mesh(v, s);
    w.position.set(0, 1.5923076923076922, 0);
    const b = new THREE.Mesh(M, l);
    b.position.set(-.38076923076923075, .9692307692307692, 0);
    const x = new THREE.Mesh(M, l);
    x.position.set(.38076923076923075, .9692307692307692, 0);
    const T = new THREE.MeshStandardMaterial({
        color: r() > .5 ? 0 : 16777215
    }),
        C = .1 * c,
        H = -m / 2 - .01,
        N = new THREE.BoxGeometry(C, C, C),
        R = new THREE.Mesh(N, T);
    R.position.set(.25 * -m, .15 * m, H);
    const B = new THREE.Mesh(N, T);
    B.position.set(.25 * m, .15 * m, H);
    const P = new THREE.BoxGeometry(C, C, C),
        A = new THREE.Mesh(P, T);
    A.position.set(0, 0, H);
    const L = new THREE.BoxGeometry(.20769230769230768, .03461538461538462, C),
        O = new THREE.Mesh(L, T);
    return O.position.set(0, .2 * -m, H), w.add(R, B, A, O), n.add(S, I, k, w, b, x), t ? avatarGroup = n : playerAvatars.set(e, n), scene.add(n), n
}

function initHotbar() {
    var e = document.getElementById("hotbar");
    e.innerHTML = "";
    for (var t = 0; t < 9; t++) {
        let index = t;
        var o = document.createElement("div");
        o.className = "hot-slot", o.dataset.index = index;
        var content = document.createElement("div");
        content.className = "hot-slot-content";
        var a = document.createElement("div");
        a.className = "hot-label";
        var n = document.createElement("div");
        n.className = "hot-count";
        content.appendChild(a);
        content.appendChild(n);
        o.appendChild(content);
        e.appendChild(o);

        // Click to select
        o.addEventListener("click", (function() {
            document.querySelectorAll(".hot-slot").forEach((function(e) {
                e.classList.remove("active")
            })), this.classList.add("active"), selectedHotIndex = parseInt(this.dataset.index), updateHotbarUI();

            // Only fire action if mobile controls are explicitly shown
            // But wait, user says "make usable objects usable by tapping on them within a reasonable distance".
            // Hotbar selection shouldn't necessarily fire the action immediately unless intended.
            // The previous code had: if ("flex" === document.getElementById("mobileControls").style.display) { onPointerDown... }
            // This might be annoying if you just want to switch items. I'll remove it for now to be safe,
            // as users usually select item then tap screen to use.
        }));

        // Long press logic
        let pressTimer;
        const startPress = (e) => {
            // Only if valid item
            if (!INVENTORY[index] || INVENTORY[index].count <= 0) return;

            pressTimer = setTimeout(() => {
                // Check if inventory is open
                const invOpen = document.getElementById("inventoryModal").style.display === "block";
                if (invOpen) {
                    // Trash confirmation
                    trashIndex = index;
                    document.getElementById("trashItemName").innerText = "Trash " + BLOCKS[INVENTORY[trashIndex].id].name + " x" + INVENTORY[trashIndex].count + " ? ";
                    document.getElementById("trashConfirm").style.display = "block";
                } else {
                    // Drop item (Whole Stack)
                    selectedHotIndex = index; // Ensure we drop the one we held
                    dropSelectedItem(true);
                }
            }, 500); // 500ms long press
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        o.addEventListener("touchstart", startPress, { passive: true });
        o.addEventListener("touchend", cancelPress);
        o.addEventListener("touchcancel", cancelPress);

        // Keep context menu for desktop fallback
        o.addEventListener("contextmenu", (function(e) {
            e.preventDefault();
            if (INVENTORY[this.dataset.index] && INVENTORY[this.dataset.index].count > 0) {
                 trashIndex = this.dataset.index;
                 document.getElementById("trashItemName").innerText = "Trash " + BLOCKS[INVENTORY[trashIndex].id].name + " x" + INVENTORY[trashIndex].count + " ? ";
                 document.getElementById("trashConfirm").style.display = "block";
            }
        }));
    }
    updateHotbarUI()
}

function updateHotbarUI() {
    document.getElementById("hotbar").querySelectorAll(".hot-slot").forEach((function (e, t) {
        var o = INVENTORY[t],
            a = o ? o.id : null,
            n = o ? o.count : 0,
            r = a && BLOCKS[a] ? hexToRgb(BLOCKS[a].color) : [0, 0, 0];
        e.style.background = "rgba(" + r.join(",") + ", " + (a ? .45 : .2) + ")", e.querySelector(".hot-label").innerText = a && BLOCKS[a] ? BLOCKS[a].name : "", e.querySelector(".hot-count").innerText = n > 0 ? n : "", e.classList.toggle("active", t === selectedHotIndex)
    })), selectedBlockId = INVENTORY[selectedHotIndex] ? INVENTORY[selectedHotIndex].id : null
}

function addToInventory(e, t, o = null) {
    const a = o || worldSeed;
    for (var n = 0; n < INVENTORY.length; n++) {
        const o = INVENTORY[n];
        if (o && o.id === e && o.originSeed === a && o.count < 64) {
            const e = 64 - o.count,
                a = Math.min(t, e);
            if (o.count += a, (t -= a) <= 0) return void updateHotbarUI()
        }
    }
    for (n = 0; n < INVENTORY.length; n++)
        if (!INVENTORY[n] || 0 === INVENTORY[n].count) {
            const o = Math.min(t, 64);
            if (INVENTORY[n] = {
                id: e,
                count: o,
                originSeed: a
            }, (t -= o) <= 0) return void updateHotbarUI()
        } addMessage("Inventory full"), updateHotbarUI()
}

function hexToRgb(e) {
    return e = e.replace("#", ""), [parseInt(e.substring(0, 2), 16), parseInt(e.substring(2, 4), 16), parseInt(e.substring(4, 6), 16)]
}

var minimapCtx, trashIndex = -1;

function attemptCraft(e) {
    const t = {},
        o = {},
        a = {};
    for (const e of INVENTORY) e && (a[e.id] = (a[e.id] || 0) + e.count, e.originSeed && e.originSeed !== worldSeed ? o[e.id] = (o[e.id] || 0) + e.count : t[e.id] = (t[e.id] || 0) + e.count);
    for (const t in e.requires)
        if ((a[t] || 0) < e.requires[t]) return void addMessage(`Missing materials for ${BLOCKS[e.out.id].name}`);
    if (e.requiresOffWorld)
        for (const t in e.requiresOffWorld)
            if ((o[t] || 0) < e.requiresOffWorld[t]) return void addMessage(`Requires off-world ${BLOCKS[t].name}`);
    let n = {
        ...e.requires
    },
        r = {
            ...e.requiresOffWorld
        },
        s = [];
    if (r)
        for (let e = 0; e < INVENTORY.length; e++) {
            const t = INVENTORY[e];
            if (t && r[t.id] > 0 && t.originSeed && t.originSeed !== worldSeed) {
                const o = Math.min(t.count, r[t.id]);
                for (let e = 0; e < o; e++) s.push(t.originSeed);
                t.count -= o, r[t.id] -= o, n[t.id] -= o, 0 === t.count && (INVENTORY[e] = null)
            }
        }
    for (let e = 0; e < INVENTORY.length; e++) {
        const t = INVENTORY[e];
        if (t && n[t.id] > 0) {
            const o = Math.min(t.count, n[t.id]);
            t.count -= o, n[t.id] -= o, 0 === t.count && (INVENTORY[e] = null)
        }
    }
    let i = null;
    s.length > 0 && (i = s.join("")), addToInventory(e.out.id, e.out.count, i), addMessage("Crafted " + BLOCKS[e.out.id].name), updateHotbarUI(), "block" === document.getElementById("inventoryModal").style.display && updateInventoryUI()
}

function completeCraft(e, t) {
    const o = {
        ...e.requires
    },
        a = [],
        n = INVENTORY[t];
    if (!n || !e.requiresOffWorld || !e.requiresOffWorld[n.id]) return addMessage("Invalid selection for craft."), craftingState = null, void updateInventoryUI();
    o[n.id]--, a.push(n.originSeed);
    const r = JSON.parse(JSON.stringify(INVENTORY));
    if (r[t].count--, e.requiresOffWorld)
        for (const t in e.requiresOffWorld) {
            let s = e.requiresOffWorld[t];
            if (parseInt(t) === n.id && s--, s > 0)
                for (let e = 0; e < r.length; e++) {
                    const n = r[e];
                    if (n && n.id == t && n.originSeed && n.originSeed !== worldSeed && n.count > 0) {
                        const e = Math.min(n.count, s);
                        for (let t = 0; t < e; t++) a.push(n.originSeed);
                        if (n.count -= e, s -= e, o[t] -= e, s <= 0) break
                    }
                }
        }
    const s = {};
    for (const e of r) e && e.count > 0 && (s[e.id] = (s[e.id] || 0) + e.count);
    for (const e in o)
        if ((s[e] || 0) < o[e]) return addMessage("Still missing other materials."), craftingState = null, void updateInventoryUI();
    INVENTORY[t].count--, INVENTORY[t].count <= 0 && (INVENTORY[t] = null);
    let i = {
        ...e.requires
    };
    i[n.id]--;
    let l = {
        ...e.requiresOffWorld
    };
    if (l[n.id] && l[n.id]--, Object.keys(l).length > 0)
        for (let e = 0; e < INVENTORY.length; e++) {
            const t = INVENTORY[e];
            if (t && l[t.id] > 0 && t.originSeed && t.originSeed !== worldSeed) {
                const o = Math.min(t.count, l[t.id]);
                t.count -= o, l[t.id] -= o, i[t.id] -= o, 0 === t.count && (INVENTORY[e] = null)
            }
        }
    for (let e = 0; e < INVENTORY.length; e++) {
        const t = INVENTORY[e];
        if (t && i[t.id] > 0) {
            const o = Math.min(t.count, i[t.id]);
            t.count -= o, i[t.id] -= o, 0 === t.count && (INVENTORY[e] = null)
        }
    }
    const d = a.sort().join("");
    addToInventory(e.out.id, e.out.count, d), addMessage("Crafted " + BLOCKS[e.out.id].name), craftingState = null, document.getElementById("craftModal").style.display = "none", isPromptOpen = !1, toggleInventory(), updateHotbarUI()
}

function initiateCraft(e) {
    if (craftingState) addMessage("Please complete or cancel the current craft.");
    else {
        if (e.requiresOffWorld)
            for (const t in e.requiresOffWorld) {
                const o = e.requiresOffWorld[t];
                if (INVENTORY.map(((e, t) => ({
                    item: e,
                    index: t
                }))).filter((({
                    item: e
                }) => e && e.id == t && e.originSeed && e.originSeed !== worldSeed)).reduce(((e, {
                    item: t
                }) => e + t.count), 0) > o) return craftingState = {
                    recipe: e,
                    requiredItemId: parseInt(t)
                }, addMessage(`Select an off-world ${BLOCKS[t].name} to use.`), document.getElementById("craftModal").style.display = "none", void ("block" !== document.getElementById("inventoryModal").style.display ? toggleInventory() : updateInventoryUI())
            }
        attemptCraft(e)
    }
}

function openCrafting() {
    isPromptOpen = true;
    const craftModal = document.getElementById("craftModal");
    craftModal.style.display = "flex"; // Use flex as per new CSS
    const recipeList = document.getElementById("recipeList");
    recipeList.innerHTML = "";

    // Tally current inventory
    const inventoryCounts = {};
    const offWorldInventoryCounts = {};
    for (const item of INVENTORY) {
        if (item) {
            if (item.originSeed && item.originSeed !== worldSeed) {
                offWorldInventoryCounts[item.id] = (offWorldInventoryCounts[item.id] || 0) + item.count;
            } else {
                inventoryCounts[item.id] = (inventoryCounts[item.id] || 0) + item.count;
            }
        }
    }
     const totalInventoryCounts = {};
      for (const item of INVENTORY) {
        if (item) {
            totalInventoryCounts[item.id] = (totalInventoryCounts[item.id] || 0) + item.count;
        }
    }


    for (const recipe of RECIPES) {
        let canCraft = true;
        const ingredients = [];

        for (const reqId in recipe.requires) {
            const requiredAmount = recipe.requires[reqId];
            const hasAmount = totalInventoryCounts[reqId] || 0;
            if (hasAmount < requiredAmount) {
                canCraft = false;
            }
            ingredients.push(`${BLOCKS[reqId].name} x${requiredAmount} (Have: ${hasAmount})`);
        }

        if (recipe.requiresOffWorld) {
            for (const reqId in recipe.requiresOffWorld) {
                const requiredAmount = recipe.requiresOffWorld[reqId];
                const hasAmount = offWorldInventoryCounts[reqId] || 0;
                if (hasAmount < requiredAmount) {
                    canCraft = false;
                }
            }
        }

        const recipeItem = document.createElement("div");
        recipeItem.className = "recipe-item";

        const preview = document.createElement("div");
        preview.className = "recipe-preview";
        preview.style.backgroundColor = BLOCKS[recipe.out.id].color;

        const info = document.createElement("div");
        info.className = "recipe-info";

        const name = document.createElement("div");
        name.className = "recipe-name";
        name.innerText = `${BLOCKS[recipe.out.id].name} x${recipe.out.count}`;

        const ingredientsDiv = document.createElement("div");
        ingredientsDiv.className = "recipe-ingredients";
        ingredientsDiv.innerText = "Requires: " + ingredients.join(", ");

        const statusDiv = document.createElement("div");
        statusDiv.className = "recipe-status";

        const statusText = document.createElement("div");
        statusText.className = "status-text";
        statusText.innerText = canCraft ? "Craftable" : "Not Craftable";
        statusText.classList.add(canCraft ? "status-craftable" : "status-not-craftable");

        info.appendChild(name);
        info.appendChild(ingredientsDiv);
        statusDiv.appendChild(statusText);

        if (canCraft) {
            const craftButton = document.createElement("button");
            craftButton.innerText = "Craft";
            craftButton.onclick = () => {
                initiateCraft(recipe);
                // Refresh the crafting menu after attempting a craft
                openCrafting();
            };
            statusDiv.appendChild(craftButton);
        }

        recipeItem.appendChild(preview);
        recipeItem.appendChild(info);
        recipeItem.appendChild(statusDiv);
        recipeList.appendChild(recipeItem);
    }
}

function toggleInventory() {
    var e = document.getElementById("inventoryModal"),
        t = "block" === e.style.display;
    t && craftingState && (craftingState = null, addMessage("Crafting canceled.")), e.style.display = t ? "none" : "block", isPromptOpen = !t, t ? selectedInventoryIndex = -1 : updateInventoryUI()
}

function updateInventoryUI() {
    var e = document.getElementById("inventoryGrid"),
        t = document.getElementById("inventoryHotbar");
    e.innerHTML = "", t.innerHTML = "";
    for (var o = 9; o < 36; o++) e.appendChild(createInventorySlot(o));
    for (o = 0; o < 9; o++) t.appendChild(createInventorySlot(o))
}

function createInventorySlot(e) {
    var t = document.createElement("div");
    t.className = "inv-slot", t.dataset.index = e;
    var o = INVENTORY[e];
    if (o && o.id) {
        var a = BLOCKS[o.id] ? hexToRgb(BLOCKS[o.id].color) : [128, 128, 128];
        if (t.style.backgroundColor = `rgba(${a.join(",")}, 0.6)`, t.innerText = BLOCKS[o.id] ? BLOCKS[o.id].name.substring(0, 6) : "Unknown", o.count > 1) {
            var n = document.createElement("div");
            n.className = "inv-count", n.innerText = o.count, t.appendChild(n)
        }
        craftingState && o.id === craftingState.requiredItemId && o.originSeed && o.originSeed !== worldSeed && t.classList.add("highlight-craft")
    }
    return e !== selectedInventoryIndex || craftingState || t.classList.add("selected"), t.addEventListener("click", (function () {
        var e = parseInt(this.dataset.index);
        if (craftingState) {
            const t = INVENTORY[e];
            t && t.id === craftingState.requiredItemId && t.originSeed && t.originSeed !== worldSeed ? completeCraft(craftingState.recipe, e) : addMessage("This item cannot be used for this craft.")
        } else {
            if (-1 === selectedInventoryIndex) selectedInventoryIndex = e;
            else {
                var t = INVENTORY[selectedInventoryIndex];
                INVENTORY[selectedInventoryIndex] = INVENTORY[e], INVENTORY[e] = t, selectedInventoryIndex = -1
            }
            updateInventoryUI(), updateHotbarUI()
        }
    })), t.addEventListener("contextmenu", (function (e) {
        e.preventDefault();
        var t = parseInt(this.dataset.index);
        INVENTORY[t] && INVENTORY[t].count > 0 && (trashIndex = t, document.getElementById("trashItemName").innerText = "Trash " + BLOCKS[INVENTORY[trashIndex].id].name + " x" + INVENTORY[trashIndex].count + " ? ", document.getElementById("trashConfirm").style.display = "block")
    })), t
}

function createProjectile(e, t, o, a, n = "red") {
    const r = "green" === n,
        s = r ? 20 : 10,
        i = r ? 65280 : 16711680,
        l = new THREE.BoxGeometry(.2, .2, .5),
        d = new THREE.MeshBasicMaterial({
            color: i
        }),
        c = new THREE.Mesh(l, d),
        u = new THREE.Quaternion;
    u.setFromUnitVectors(new THREE.Vector3(0, 0, -1), a), c.quaternion.copy(u), c.position.copy(o);
    const p = new THREE.PointLight(i, 1, 10);
    p.position.copy(c.position), c.light = p, scene.add(p), projectiles.push({
        id: e,
        user: t,
        mesh: c,
        velocity: a.multiplyScalar(s),
        createdAt: Date.now(),
        light: p,
        isGreen: r
    }), scene.add(c)
}

function createDroppedItemOrb(e, t, o, a, n, count = 1) {
    const r = BLOCKS[o];
    if (!r) return;
    const s = new THREE.SphereGeometry(.25, 16, 16),
        i = new THREE.MeshStandardMaterial({
            color: r.color,
            emissive: r.color,
            emissiveIntensity: .5
        }),
        l = new THREE.Mesh(s, i);
    l.position.copy(t);
    const c = {
        id: e,
        blockId: o,
        originSeed: a,
        mesh: l,
        createdAt: Date.now(),
        dropper: n,
        count: count
    };
    droppedItems.push(c), scene.add(l)
}

function createMusicSymbolMesh() {
    const symbolGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x8A2BE2 }); // Purple color

    // Eighth note shape
    const noteStem = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    const stemMesh = new THREE.Mesh(noteStem, material);
    stemMesh.position.y = 0.3;
    symbolGroup.add(stemMesh);

    const noteHead = new THREE.SphereGeometry(0.15, 16, 16);
    const headMesh = new THREE.Mesh(noteHead, material);
    headMesh.position.y = 0.0;
    symbolGroup.add(headMesh);

    const noteFlag = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const flagMesh = new THREE.Mesh(noteFlag, material);
    flagMesh.position.set(0.1, 0.55, 0);
    symbolGroup.add(flagMesh);

    return symbolGroup;
}

function createChestMesh(x, y, z, rotation = 0) {
    const chestGroup = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Dark wood
    const lockMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold

    // Base
    const baseGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
    const base = new THREE.Mesh(baseGeo, material);
    base.position.y = 0.25;
    chestGroup.add(base);

    // Lid pivot group
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.5, -0.4); // Hinge position

    // Lid
    const lidGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
    const lid = new THREE.Mesh(lidGeo, material);
    lid.position.set(0, 0.15, 0.4); // Relative to hinge
    lidGroup.add(lid);

    // Lock
    const lockGeo = new THREE.BoxGeometry(0.1, 0.2, 0.05);
    const lock = new THREE.Mesh(lockGeo, lockMaterial);
    lock.position.set(0, 0.15, 0.825);
    lidGroup.add(lock);

    chestGroup.add(lidGroup);

    chestGroup.position.set(x + 0.5, y, z + 0.5);
    chestGroup.rotation.y = rotation;

    chestGroup.userData.x = x;
    chestGroup.userData.y = y;
    chestGroup.userData.z = z;

    scene.add(chestGroup);

    return { mesh: chestGroup, lid: lidGroup };
}

function openChest(x, y, z) {
    currentChestKey = `${x},${y},${z}`;
    const chest = chests[currentChestKey];
    if (!chest) return;

    chest.isOpen = true;
    chest.lastInteractionTime = performance.now();

    document.getElementById("chestModal").style.display = "block";
    isPromptOpen = true;

    updateChestUI();
}

function closeChest() {
    if (currentChestKey && chests[currentChestKey]) {
        chests[currentChestKey].isOpen = false;
        chests[currentChestKey].lastInteractionTime = performance.now();
    }
    currentChestKey = null;
    document.getElementById("chestModal").style.display = "none";
    isPromptOpen = false;
}

function updateChestUI() {
    if (!currentChestKey) return;
    const chest = chests[currentChestKey];
    const chestGrid = document.getElementById("chestGrid");
    const invGrid = document.getElementById("chestInventoryGrid");
    const hotbarGrid = document.getElementById("chestInventoryHotbar");

    chestGrid.innerHTML = "";
    invGrid.innerHTML = "";
    hotbarGrid.innerHTML = "";

    // Chest slots (27)
    for (let i = 0; i < 27; i++) {
        const slot = document.createElement("div");
        slot.className = "inv-slot";
        const item = chest.items[i];
        if (item) {
            const color = BLOCKS[item.id] ? hexToRgb(BLOCKS[item.id].color) : [128, 128, 128];
            slot.style.backgroundColor = `rgba(${color.join(",")}, 0.6)`;
            slot.innerText = BLOCKS[item.id] ? BLOCKS[item.id].name.substring(0, 6) : "???";
            if (item.count > 1) {
                const countDiv = document.createElement("div");
                countDiv.className = "inv-count";
                countDiv.innerText = item.count;
                slot.appendChild(countDiv);
            }
        }
        slot.onclick = () => {
            if (item) {
                // Take item to inventory
                addToInventory(item.id, item.count, item.originSeed);
                chest.items[i] = null;
                updateChestUI();
                updateHotbarUI();
            }
        };
        chestGrid.appendChild(slot);
    }

    // Inventory slots
    for (let i = 9; i < 36; i++) {
        invGrid.appendChild(createChestInventorySlot(i));
    }
    for (let i = 0; i < 9; i++) {
        hotbarGrid.appendChild(createChestInventorySlot(i));
    }
}

function createChestInventorySlot(index) {
    const slot = document.createElement("div");
    slot.className = "inv-slot";
    const item = INVENTORY[index];
    if (item) {
        const color = BLOCKS[item.id] ? hexToRgb(BLOCKS[item.id].color) : [128, 128, 128];
        slot.style.backgroundColor = `rgba(${color.join(",")}, 0.6)`;
        slot.innerText = BLOCKS[item.id] ? BLOCKS[item.id].name.substring(0, 6) : "???";
        if (item.count > 1) {
            const countDiv = document.createElement("div");
            countDiv.className = "inv-count";
            countDiv.innerText = item.count;
            slot.appendChild(countDiv);
        }
    }
    slot.onclick = () => {
        if (item && currentChestKey) {
            // Move to chest
            const chest = chests[currentChestKey];
            // Find empty slot or stackable
            let added = false;
            // Try to stack first
            for (let i = 0; i < 27; i++) {
                if (chest.items[i] && chest.items[i].id === item.id && chest.items[i].originSeed === item.originSeed && chest.items[i].count < 64) {
                    const space = 64 - chest.items[i].count;
                    const amount = Math.min(item.count, space);
                    chest.items[i].count += amount;
                    item.count -= amount;
                    if (item.count <= 0) {
                        INVENTORY[index] = null;
                        added = true;
                        break;
                    }
                }
            }
            // If still have items, find empty slot
            if (!added && item.count > 0) {
                for (let i = 0; i < 27; i++) {
                    if (!chest.items[i]) {
                        chest.items[i] = { ...item }; // Clone
                        INVENTORY[index] = null;
                        added = true;
                        break;
                    }
                }
            }
            if (!added && item.count > 0) {
                addMessage("Chest full!");
            }
            updateChestUI();
            updateHotbarUI();
        }
    };
    return slot;
}

async function createMagicianStoneScreen(stoneData) {
    let { x, y, z, url, width, height, offsetX, offsetY, offsetZ, loop, autoplay, autoplayAnimation, distance } = stoneData;
    
    // Entity-based deduplication key: uses world position (x,y,z) as the unique identifier.
    // This key is independent of the underlying file extension (.glb, .gltf, .gif, .mp4, etc.)
    // to ensure that the same logical magician stone entity is never instantiated multiple times,
    // regardless of which asset format is used or how many times data is received from various sources.
    const key = `${x},${y},${z}`;

    // Deduplication: Skip if this stone is already loaded or currently loading
    if (magicianStones[key] && magicianStones[key].mesh) {
        return;
    }
    if (magicianStonesLoading.has(key)) {
        return;
    }

    // Mark as loading to prevent duplicate loads during async operations.
    // This guard applies to ALL asset types, not just .glb files.
    magicianStonesLoading.add(key);

    if (url.startsWith('IPFS:')) {
        try {
            url = await resolveIPFS(url);
        } catch (error) {
            console.error('Error resolving IPFS URL for in-world screen:', error);
            magicianStonesLoading.delete(key); // Remove from loading set on error
            return; // Don't create a screen if the URL is invalid
        }
    }

    const fileExtension = stoneData.url.split('.').pop().toLowerCase();

    // Handle GLB/GLTF files
    if (['glb', 'gltf'].includes(fileExtension)) {
        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            function(gltf) {
                // Post-async-load deduplication check: another load may have completed while this one was in progress.
                // This check is entity-based (using position key) and independent of file extension.
                if (magicianStones[key] && magicianStones[key].mesh) {
                    console.log(`[MagicianStone] Duplicate GLB/GLTF load completed for key ${key} - discarding and disposing`);
                    magicianStonesLoading.delete(key);
                    // Properly dispose the loaded model to prevent memory leaks
                    disposeObject(gltf.scene);
                    return;
                }

                const model = gltf.scene;

                // Calculate bounding box and scale to fit within width x height
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale to fit the bounding box defined by width and height
                const scaleX = width / size.x;
                const scaleY = height / size.y;
                const scaleZ = width / size.z; // Use width for depth as well
                const scale = Math.min(scaleX, scaleY, scaleZ);

                model.scale.multiplyScalar(scale);

                // Center the model at origin after scaling
                model.position.sub(center.multiplyScalar(scale));

                // Setup animations if they exist
                let mixer = null;
                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    // Play all animations if autoplayAnimation is enabled
                    if (autoplayAnimation !== false) { // Default to true if not specified
                        gltf.animations.forEach(clip => {
                            const action = mixer.clipAction(clip);
                            action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
                            action.play();
                        });
                    }
                }

                // Create a container group for positioning
                const screenMesh = new THREE.Group();
                screenMesh.add(model);

                // Orientation and Position
                let playerDirection;
                if (stoneData.direction) {
                    playerDirection = new THREE.Vector3(stoneData.direction.x, stoneData.direction.y, stoneData.direction.z);
                } else {
                    // Fallback for old stones saved without direction
                    playerDirection = new THREE.Vector3();
                    camera.getWorldDirection(playerDirection);
                    playerDirection.y = 0;
                    playerDirection.normalize();
                }

                const forward = playerDirection.clone();
                const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
                const up = new THREE.Vector3(0, 1, 0);

                const position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5) // Center of the block
                    .add(right.multiplyScalar(offsetX))
                    .add(up.multiplyScalar(offsetY))
                    .add(forward.multiplyScalar(offsetZ));

                screenMesh.position.copy(position);

                // Set rotation to face the player direction
                const lookAtTarget = new THREE.Vector3().copy(screenMesh.position).add(playerDirection);
                screenMesh.lookAt(lookAtTarget);

                magicianStones[key] = { ...stoneData, mesh: screenMesh, mixer: mixer, isMuted: false };
                magicianStonesLoading.delete(key); // Remove from loading set after successful creation
                scene.add(screenMesh);
            },
            function(progress) {
                // Loading progress
            },
            function(error) {
                console.error('Error loading GLB/GLTF for in-world display:', error);
                // Create an error placeholder
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 128;
                const context = canvas.getContext('2d');
                context.fillStyle = '#111';
                context.fillRect(0, 0, 256, 128);
                context.fillStyle = '#ff6666';
                context.font = '16px Arial';
                context.textAlign = 'center';
                context.fillText('Failed to load 3D model', 128, 64);
                const texture = new THREE.CanvasTexture(canvas);

                const planeGeometry = new THREE.PlaneGeometry(width, height);
                const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: texture });
                const screenMesh = new THREE.Mesh(planeGeometry, material);

                // Position and orient the error placeholder
                let playerDirection;
                if (stoneData.direction) {
                    playerDirection = new THREE.Vector3(stoneData.direction.x, stoneData.direction.y, stoneData.direction.z);
                } else {
                    playerDirection = new THREE.Vector3();
                    camera.getWorldDirection(playerDirection);
                    playerDirection.y = 0;
                    playerDirection.normalize();
                }

                const forward = playerDirection.clone();
                const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
                const up = new THREE.Vector3(0, 1, 0);

                const position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5)
                    .add(right.multiplyScalar(offsetX))
                    .add(up.multiplyScalar(offsetY))
                    .add(forward.multiplyScalar(offsetZ));

                screenMesh.position.copy(position);
                const lookAtTarget = new THREE.Vector3().copy(screenMesh.position).add(playerDirection);
                screenMesh.lookAt(lookAtTarget);

                magicianStones[key] = { ...stoneData, mesh: screenMesh, isMuted: false };
                magicianStonesLoading.delete(key); // Remove from loading set after error handling
                scene.add(screenMesh);
            }
        );
        return;
    }

    // Original code for non-GLB/GLTF files
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    let texture;

    if (fileExtension === 'gif') {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        texture = new THREE.CanvasTexture(canvas);

        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const u8Buffer = new Uint8Array(buffer);
            const gifReader = new GifReader(u8Buffer);

            // Post-async-load deduplication check: another load may have completed while this one was in progress.
            // This check ensures that only one instance is created, regardless of asset format.
            if (magicianStones[key] && magicianStones[key].mesh) {
                console.log(`[MagicianStone] Duplicate GIF load completed for key ${key} - discarding and disposing resources`);
                magicianStonesLoading.delete(key);
                // Clean up the texture that was created before fetch
                if (texture) {
                    texture.dispose();
                }
                return;
            }

            canvas.width = gifReader.width;
            canvas.height = gifReader.height;
            texture.image = canvas; // Update texture with resized canvas
            texture.needsUpdate = true;

            const frames = [];
            const numFrames = gifReader.numFrames();

            // Create a temporary canvas to decode frames
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = gifReader.width;
            frameCanvas.height = gifReader.height;
            const frameCtx = frameCanvas.getContext('2d');
            const frameImageData = frameCtx.createImageData(gifReader.width, gifReader.height);

            // Pre-decode frames if not too many, or we can decode on the fly.
            // For better performance in loop, let's decode on the fly or cache a few.
            // But GifReader needs to decode sequentially for disposal to work right usually.
            // Omggif decodeAndBlitFrameRGBA handles pixels.

            stoneData.gifData = {
                reader: gifReader,
                currentFrame: 0,
                accumulatedTime: 0,
                frames: [], // We can cache ImageData or ImageBitmap
                startTime: performance.now(),
                canvas: canvas,
                ctx: ctx,
                texture: texture,
                tempImageData: frameImageData,
                numFrames: numFrames
            };

            // Initial draw
            gifReader.decodeAndBlitFrameRGBA(0, frameImageData.data);
            ctx.putImageData(frameImageData, 0, 0);
            texture.needsUpdate = true;

        } catch (e) {
            console.error("Failed to parse GIF", e);
            // Fallback to static image loader if parsing fails
            texture = new THREE.TextureLoader().load(url);
        }

    } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        texture = new THREE.TextureLoader().load(url);
    } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
        const video = document.createElement('video');
        video.src = url;
        video.loop = loop;
        video.muted = true; // Muted by default, will be unmuted based on proximity
        video.playsInline = true;
        if (autoplay) {
            // Video will be played in the game loop based on distance
        }
        texture = new THREE.VideoTexture(video);
        stoneData.videoElement = video;
    } else if (['mp3', 'wav', 'oga'].includes(fileExtension)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.loop = loop;
        stoneData.audioElement = audio;

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#111';
        context.fillRect(0, 0, 256, 128);
        context.fillStyle = '#fff';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('Audio: ' + url.split('/').pop(), 128, 64);
        texture = new THREE.CanvasTexture(canvas);
    } else {
        // For unsupported types, create a visualizer
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#111';
        context.fillRect(0, 0, 256, 128);
        context.fillStyle = '#fff';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('Preview Unavailable', 128, 64);
        texture = new THREE.CanvasTexture(canvas);
    }

    // Final deduplication check for non-GLB files: ensure no duplicate was created during async operations.
    // This check is entity-based (using position key) and independent of file extension.
    if (magicianStones[key] && magicianStones[key].mesh) {
        console.log(`[MagicianStone] Duplicate non-GLB load completed for key ${key} - discarding and disposing resources`);
        magicianStonesLoading.delete(key);
        // Clean up any resources that were created
        if (texture) {
            texture.dispose();
        }
        if (stoneData.videoElement) {
            stoneData.videoElement.pause();
            stoneData.videoElement.src = '';
        }
        if (stoneData.audioElement) {
            stoneData.audioElement.pause();
            stoneData.audioElement.src = '';
        }
        return;
    }

    let screenMesh;

    if (['mp3', 'wav', 'oga'].includes(fileExtension)) {
        screenMesh = createMusicSymbolMesh();
    } else {
        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true });
        if (texture) {
            material.map = texture;
            material.needsUpdate = true;
        }
        screenMesh = new THREE.Mesh(planeGeometry, material);
    }

    // Orientation and Position
    let playerDirection;
    if (stoneData.direction) {
        playerDirection = new THREE.Vector3(stoneData.direction.x, stoneData.direction.y, stoneData.direction.z);
    } else {
        // Fallback for old stones saved without direction
        playerDirection = new THREE.Vector3();
        camera.getWorldDirection(playerDirection);
        playerDirection.y = 0;
        playerDirection.normalize();
    }

    const forward = playerDirection.clone();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5) // Center of the block
        .add(right.multiplyScalar(offsetX))
        .add(up.multiplyScalar(offsetY))
        .add(forward.multiplyScalar(offsetZ));

    screenMesh.position.copy(position);

    // The direction vector is the normal of the plane we want to create.
    // The lookAt target should be a point along that normal vector, starting from the plane's own position.
    const lookAtTarget = new THREE.Vector3().copy(screenMesh.position).add(playerDirection);
    screenMesh.lookAt(lookAtTarget);

    magicianStones[key] = { ...stoneData, mesh: screenMesh, isMuted: false };
    magicianStonesLoading.delete(key); // Remove from loading set after successful creation
    scene.add(screenMesh);
}

function createCalligraphyStoneScreen(stoneData) {
    let { x, y, z, width, height, offsetX, offsetY, offsetZ, bgColor, transparent, fontFamily, fontSize, fontWeight, fontColor, text, link, direction } = stoneData;
    const key = `${x},${y},${z}`;

    // Deduplication: Skip if this stone is already loaded or currently loading
    if (calligraphyStones[key] && calligraphyStones[key].mesh) {
        console.log(`[CalligraphyStone] Skipping duplicate creation for key ${key} - already exists`);
        return;
    }
    if (calligraphyStonesLoading.has(key)) {
        console.log(`[CalligraphyStone] Skipping duplicate creation for key ${key} - already loading`);
        return;
    }

    // Mark as loading to prevent duplicate loads
    calligraphyStonesLoading.add(key);

    // Create canvas for text rendering
    const pixelsPerBlock = 128; // Resolution per block
    const canvasWidth = width * pixelsPerBlock;
    const canvasHeight = height * pixelsPerBlock;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');

    // Draw background (or leave transparent)
    if (!transparent) {
        context.fillStyle = bgColor || '#ffffff';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Setup font
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    context.fillStyle = fontColor || '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Word wrap text while respecting newlines
    const lines = [];
    const maxWidth = canvasWidth - 20; // 10px padding on each side

    // Split by newlines first to respect user line breaks
    const paragraphs = (text || '').split('\n');

    for (const paragraph of paragraphs) {
        // Handle empty lines (blank lines between paragraphs)
        if (paragraph.trim() === '') {
            lines.push('');
            continue;
        }

        // Word wrap within each paragraph
        const words = paragraph.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
    }

    // Draw text lines centered vertically
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvasHeight - totalHeight) / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
        const yPos = startY + i * lineHeight;
        context.fillText(lines[i], canvasWidth / 2, yPos);
    }

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: texture,
        transparent: transparent || false
    });
    const screenMesh = new THREE.Mesh(planeGeometry, material);

    // Orientation and Position
    let playerDirection;
    if (direction) {
        playerDirection = new THREE.Vector3(direction.x, direction.y, direction.z);
    } else {
        // Fallback for old stones saved without direction
        playerDirection = new THREE.Vector3();
        camera.getWorldDirection(playerDirection);
        playerDirection.y = 0;
        playerDirection.normalize();
    }

    const forward = playerDirection.clone();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    const position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5) // Center of the block
        .add(right.clone().multiplyScalar(offsetX))
        .add(up.clone().multiplyScalar(offsetY))
        .add(forward.clone().multiplyScalar(offsetZ));

    screenMesh.position.copy(position);

    // Set rotation to face the player direction
    const lookAtTarget = new THREE.Vector3().copy(screenMesh.position).add(playerDirection);
    screenMesh.lookAt(lookAtTarget);

    // Store link in userData for click handling
    screenMesh.userData.calligraphyLink = link;
    screenMesh.userData.calligraphyKey = key;

    calligraphyStones[key] = { ...stoneData, mesh: screenMesh };
    calligraphyStonesLoading.delete(key); // Remove from loading set after successful creation
    scene.add(screenMesh);
}

function dropSelectedItem(dropAll = false) {
    const e = INVENTORY[selectedHotIndex];
    if (!e || e.count <= 0) return void addMessage("Nothing to drop!");

    // Determine how many to drop
    const countToDrop = dropAll ? e.count : 1;

    // For each item to drop, we create an orb.
    // If dropping a stack, maybe we should drop one orb representing the stack?
    // The current system seems to assume 1 orb = 1 block/item because addToInventory takes count.
    // createDroppedItemOrb doesn't seem to take count, but addToInventory does.
    // Let's check addToInventory: addToInventory(id, count, seed).
    // Let's check createDroppedItemOrb: createDroppedItemOrb(id, pos, blockId, seed, dropper).
    // It pushes to droppedItems list. The game loop checks distance and calls addToInventory(o.blockId, 1, o.originSeed).
    // Ah, the pickup logic (in gameLoop) hardcodes count 1.
    // So if I drop a stack as one orb, it will be picked up as 1 item.
    // To support stack dropping properly without refactoring the entire item drop system to support stacks,
    // I should loop and drop 'countToDrop' individual items, or I need to refactor the drop system.
    // Dropping 64 items individually might be laggy.
    // Refactoring dropped items to support count is better but risky.
    // Wait, the user prompt says "drop whole stack".
    // If I drop 64 items, it spawns 64 lights/meshes. That's heavy.
    // Let's modify the pickup logic to support stack count if I can.
    // But `createDroppedItemOrb` creates a visual representation.
    // I'll stick to dropping individual items for now to be safe with existing logic, OR just drop them in a loop.
    // Actually, let's look at `gameLoop` pickup logic.
    // `addToInventory(o.blockId, 1, o.originSeed)`
    // Yes, hardcoded 1.
    // If I change `createDroppedItemOrb` to accept count, I need to store it in the object.
    // And update `gameLoop`.

    // Let's try to update `createDroppedItemOrb` to handle counts.
    // But `createDroppedItemOrb` signature: (e, t, o, a, n) -> id, pos, blockId, seed, dropper.
    // I can modify `droppedItems` object structure.

    // For now, to be safe and fulfill "drop whole stack", I will loop.
    // Limit to reasonable number if needed? 64 is fine.

    for (let i = 0; i < countToDrop; i++) {
        // Offset slightly so they don't all stack perfectly (z-fighting/physics look)
        const offset = new THREE.Vector3(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1);

        const t = `${userName}-${Date.now()}-${i}`;
        const o = new THREE.Vector3();
        camera.getWorldDirection(o);
        const a = new THREE.Vector3(player.x, player.y + 1, player.z).add(o.multiplyScalar(1.5)).add(offset);

        createDroppedItemOrb(t, a, e.id, e.originSeed, userName);

        const n = JSON.stringify({
            type: "item_dropped",
            dropId: t,
            world: worldName,
            blockId: e.id,
            originSeed: e.originSeed,
            position: {
                x: a.x,
                y: a.y,
                z: a.z
            },
            dropper: userName
        });
        for (const [key, peer] of peers.entries()) {
            if (peer.dc && peer.dc.readyState === "open") {
                peer.dc.send(n);
            }
        }
    }

    e.count -= countToDrop;
    if (e.count <= 0) {
        INVENTORY[selectedHotIndex] = null;
    }
    updateHotbarUI();
}

function onPointerDown(e) {
    if ("first" !== cameraMode || isPromptOpen) return;
    e.preventDefault();
    const t = INVENTORY[selectedHotIndex];
    if (2 === e.button && t && BLOCKS[t.id] && BLOCKS[t.id].hand_attachable) return void dropSelectedItem();
    if (t && 121 === t.id) {
        const e = Date.now();
        if (e - (player.lastFireTime || 0) < 1e3) return;
        player.lastFireTime = e;
        const t = `${userName}-${Date.now()}`,
            o = new THREE.Vector3;
        let a;
        camera.getWorldDirection(o), "third" === cameraMode && avatarGroup && avatarGroup.gun ? (a = new THREE.Vector3, avatarGroup.gun.getWorldPosition(a)) : a = new THREE.Vector3(player.x, player.y + 1.5, player.z), createProjectile(t, userName, a, o.clone(), "red"), laserFireQueue.push({
            id: t,
            user: userName,
            world: worldName,
            position: {
                x: a.x,
                y: a.y,
                z: a.z
            },
            direction: {
                x: o.x,
                y: o.y,
                z: o.z
            },
            color: "red"
        });
        return
    }
    if (t && 126 === t.id) {
        const e = Date.now();
        if (e - (player.lastFireTime || 0) < 500) return;
        let t = -1;
        for (let e = 0; e < INVENTORY.length; e++)
            if (INVENTORY[e] && 125 === INVENTORY[e].id) {
                t = e;
                break
            } if (-1 === t) return void addMessage("No emeralds to fire!", 1e3);
        INVENTORY[t].count--, INVENTORY[t].count <= 0 && (INVENTORY[t] = null), updateHotbarUI(), player.lastFireTime = e;
        const o = new THREE.Vector3;
        camera.getWorldDirection(o);
        const a = new THREE.Vector3;
        let n;
        a.crossVectors(camera.up, o).normalize(), "third" === cameraMode && avatarGroup && avatarGroup.gun ? (n = new THREE.Vector3, avatarGroup.gun.getWorldPosition(n)) : n = new THREE.Vector3(player.x, player.y + 1.5, player.z);
        const r = `${userName}-${Date.now()}-1`,
            s = n.clone().add(a.clone().multiplyScalar(.2));
        createProjectile(r, userName, s, o.clone(), "green");
        const i = `${userName}-${Date.now()}-2`,
            l = n.clone().add(a.clone().multiplyScalar(-.2));
        createProjectile(i, userName, l, o.clone(), "green"), laserFireQueue.push({
            id: r,
            user: userName,
            world: worldName,
            position: {
                x: s.x,
                y: s.y,
                z: s.z
            },
            direction: {
                x: o.x,
                y: o.y,
                z: o.z
            },
            color: "green"
        }), laserFireQueue.push({
            id: i,
            user: userName,
            world: worldName,
            position: {
                x: l.x,
                y: l.y,
                z: l.z
            },
            direction: {
                x: o.x,
                y: o.y,
                z: o.z
            },
            color: "green"
        });
        return
    }
    raycaster.setFromCamera(pointer, camera), raycaster.far = 5;
    const o = mobs.map((e => e.mesh)).filter((e => e.visible)),
        a = raycaster.intersectObjects(o, !0);
    if (a.length > 0) {
        let e, t = a[0].object;
        for (; t;) {
            if (t.userData.mobId) {
                e = t.userData.mobId;
                break
            }
            t = t.parent
        }
        if (e) {
            const t = mobs.find((t => t.id === e));
            if (t) return animateAttack(), void handleMobHit(t)
        }
    }
    const n = Array.from(playerAvatars.entries()).filter((([e]) => e !== userName)).map((([e, t]) => ({
        username: e,
        intersect: raycaster.intersectObject(t, !0)[0]
    }))).filter((e => e.intersect)).sort(((e, t) => e.intersect.distance - t.intersect.distance));
    if (n.length > 0) {
        const e = n[0];
        animateAttack();
        const t = JSON.stringify({
            type: "player_hit",
            target: e.username,
            username: userName
        });
        if (isHost) handlePlayerHit(JSON.parse(t));
        else {
            const o = JSON.stringify({
                type: "player_attack",
                username: userName
            });
            for (const [, e] of peers.entries()) e.dc && "open" === e.dc.readyState && (e.dc.send(t), e.dc.send(o));
            safePlayAudio(soundHit), addMessage(`Hit ${e.username}!`, 800)
        }
        return
    }
    if (0 === e.button && t && 122 === t.id) return player.health = Math.min(999, player.health + 5), updateHealthBar(), document.getElementById("health").innerText = player.health, addMessage("Consumed Honey! +5 HP", 1500), INVENTORY[selectedHotIndex].count--, INVENTORY[selectedHotIndex].count <= 0 && (INVENTORY[selectedHotIndex] = null), void updateHotbarUI();

    // Check for Chest Intersections
    const chestMeshes = Object.values(chests).map(c => c.mesh).filter(m => m);
    const chestIntersects = raycaster.intersectObjects(chestMeshes, true);

    if (chestIntersects.length > 0) {
        let intersectedObject = chestIntersects[0].object;
        // Traverse up to find the group with userData
        let parentGroup = intersectedObject;
        while(parentGroup.parent && !parentGroup.userData.x && parentGroup !== scene) {
            parentGroup = parentGroup.parent;
        }

        if (parentGroup && parentGroup.userData.x !== undefined) {
            const cx = parentGroup.userData.x;
            const cy = parentGroup.userData.y;
            const cz = parentGroup.userData.z;

            if (e.button === 2) {
                // Right click: Open
                openChest(cx, cy, cz);
                return;
            } else if (e.button === 0) {
                // Left click: Break
                animateAttack();
                if (isHost || peers.size === 0) {
                    removeBlockAt(cx, cy, cz, userName);
                } else {
                    const requestMsg = JSON.stringify({
                        type: 'request_block_break',
                        x: cx,
                        y: cy,
                        z: cz,
                        username: userName,
                        world: worldName
                    });
                    for (const [, peer] of peers.entries()) {
                        if (peer.dc && peer.dc.readyState === 'open') {
                            peer.dc.send(requestMsg);
                            break;
                        }
                    }
                    addMessage("Breaking...", 500);
                }
                return;
            }
        }
    }

    const magicianStoneMeshes = Object.values(magicianStones).map(s => s.mesh);
    const magicianStoneIntersects = raycaster.intersectObjects(magicianStoneMeshes, true);

    if (magicianStoneIntersects.length > 0) {
        let intersectedObject = magicianStoneIntersects[0].object;
        let parentMesh = intersectedObject.parent instanceof THREE.Group ? intersectedObject.parent : intersectedObject;
        const intersectedStone = Object.values(magicianStones).find(s => s.mesh === parentMesh);

        if (intersectedStone) {
            const key = `${intersectedStone.x},${intersectedStone.y},${intersectedStone.z}`;
            const stone = magicianStones[key];
            if (stone && (stone.audioElement || stone.videoElement)) {
                stone.isMuted = !stone.isMuted;
                const mediaElement = stone.audioElement || stone.videoElement;
                mediaElement.muted = stone.isMuted;

                const message = JSON.stringify({
                    type: 'magician_stone_mute',
                    key: key,
                    isMuted: stone.isMuted
                });
                for (const [, peer] of peers.entries()) {
                    if (peer.dc && peer.dc.readyState === 'open') {
                        peer.dc.send(message);
                    }
                }
                addMessage(stone.isMuted ? "Muted stone" : "Unmuted stone", 1500);
            }
        }
        return;
    }

    // Handle calligraphy stone clicks (open link if present)
    const calligraphyStoneMeshes = Object.values(calligraphyStones).map(s => s.mesh).filter(m => m);
    const calligraphyStoneIntersects = raycaster.intersectObjects(calligraphyStoneMeshes, true);

    if (calligraphyStoneIntersects.length > 0) {
        let intersectedObject = calligraphyStoneIntersects[0].object;
        let parentMesh = intersectedObject.parent instanceof THREE.Group ? intersectedObject.parent : intersectedObject;
        const intersectedStone = Object.values(calligraphyStones).find(s => s.mesh === parentMesh);

        if (intersectedStone && intersectedStone.link && typeof intersectedStone.link === 'string') {
            const link = intersectedStone.link.trim();
            // Only open http:// or https:// links
            if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
                window.open(link, '_blank');
                addMessage("Opening link...", 1500);
            } else if (link) {
                addMessage("Invalid URL (must start with http:// or https://)", 2000);
            } else {
                addMessage("No link set for this sign", 1500);
            }
        }
        return;
    }

    const r = raycaster.intersectObject(meshGroup, !0);
    if (0 === r.length) return;
    const s = r[0],
        i = s.point,
        l = s.face.normal;
    if (0 === e.button) {
        animateAttack();
        const x = Math.floor(i.x - .5 * l.x);
        const y = Math.floor(i.y - .5 * l.y);
        const z = Math.floor(i.z - .5 * l.z);

        if (isHost || peers.size === 0) {
            removeBlockAt(x, y, z, userName);
        } else {
            const blockId = getBlockAt(x, y, z);
            if (blockId > 0) { // Don't send for air
                const blockHitMsg = JSON.stringify({
                    type: 'block_hit',
                    x: x,
                    y: y,
                    z: z,
                    username: userName,
                    world: worldName,
                    blockId: blockId
                });
                for (const [, peer] of peers.entries()) {
                    if (peer.dc && peer.dc.readyState === 'open') {
                        peer.dc.send(blockHitMsg);
                    }
                }
            }
        }
    } else if (2 === e.button) {
        // Right click interaction
        const x = Math.floor(i.x - .5 * l.x);
        const y = Math.floor(i.y - .5 * l.y);
        const z = Math.floor(i.z - .5 * l.z);
        const blockId = getBlockAt(x, y, z);

        if (blockId === 130) { // Crafting Table
            openCrafting();
            return;
        } else if (blockId === 131) { // Chest
            openChest(x, y, z);
            return;
        }

        placeBlockAt(Math.floor(i.x + .5 * l.x), Math.floor(i.y + .5 * l.y), Math.floor(i.z + .5 * l.z), selectedBlockId)
    }
}

function updateBlockDamageVisuals(x, y, z, hits) {
    const key = `${x},${y},${z}`;
    const blockId = getBlockAt(x, y, z);

    // If block is gone, ensure crack mesh is also gone.
    if (!blockId || blockId === BLOCK_AIR) {
        const damagedBlock = damagedBlocks.get(key);
        if (damagedBlock && damagedBlock.mesh) {
            crackMeshes.remove(damagedBlock.mesh);
            disposeObject(damagedBlock.mesh);
            damagedBlocks.delete(key);
        }
        return;
    }

    let damageData = damagedBlocks.get(key) || { hits: 0, mesh: null, canvas: null };

    // Don't process old messages.
    if (hits <= damageData.hits) {
        return;
    }

    const hitsToAdd = hits - damageData.hits;
    damageData.hits = hits;
    damagedBlocks.set(key, damageData);

    if (damageData.mesh) {
        crackMeshes.remove(damageData.mesh);
        disposeObject(damageData.mesh);
    }

    let canvas = damageData.canvas;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        damageData.canvas = canvas;
    }

    // Add cracks for any hits we missed to catch up state
    for(let i=0; i < hitsToAdd; i++) {
        drawCracksOnCanvas(canvas);
    }

    const newCrackTexture = new THREE.CanvasTexture(canvas);
    newCrackTexture.magFilter = THREE.NearestFilter;
    newCrackTexture.minFilter = THREE.NearestFilter;
    newCrackTexture.needsUpdate = true;
    const material = new THREE.MeshBasicMaterial({
        map: newCrackTexture,
        transparent: true,
        opacity: 1
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), material);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    damageData.mesh = mesh;
    crackMeshes.add(mesh);

    const soundName = `pick${Math.floor(Math.random() * 3)}`;
    const soundElement = document.getElementById(soundName);
    safePlayAudio(soundElement);
}

function handlePlayerHit(e) {
    const t = e.username,
        o = e.target,
        a = t === userName ? player : userPositions[t],
        n = o === userName ? player : userPositions[o];
    if (a && n) {
        const r = t === userName ? a.x : a.targetX,
            s = t === userName ? a.y : a.targetY,
            i = t === userName ? a.z : a.targetZ,
            l = o === userName ? n.x : n.targetX || n.x,
            d = o === userName ? n.y : n.targetY || n.y,
            c = o === userName ? n.z : n.targetZ || n.z;
        if (Math.hypot(r - l, s - d, i - c) < 6) {
            t === userName && (safePlayAudio(soundHit), addMessage("Hit " + o + "!", 800));
            const a = l - r,
                n = c - i,
                s = Math.hypot(a, n),
                d = 5;
            let u = 0,
                p = 0;
            s > 0 && (u = a / s * d, p = n / s * d);
            const m = peers.get(e.target);
            m && m.dc && "open" === m.dc.readyState ? m.dc.send(JSON.stringify({
                type: "player_damage",
                damage: 1,
                attacker: e.username,
                kx: u,
                kz: p
            })) : e.target === userName && Date.now() - lastDamageTime > 800 && (player.health = Math.max(0, player.health - 1), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit by " + e.username + "! HP: " + player.health, 1e3), flashDamageEffect(), safePlayAudio(soundHit), player.vx += u, player.vz += p, player.health <= 0 && handlePlayerDeath())
        } else t === userName && addMessage("Miss! Target is out of range.", 800)
    }
}

function attackAtPoint(e) {
    for (var t of mobs)
        if (t.mesh.position.distanceTo(e) < 1.5) return handleMobHit(t), !0;
    return !1
}

function checkAndDeactivateHive(e, t, o) {
    let a = null,
        n = 1 / 0;
    for (const r of hiveLocations) {
        const s = Math.hypot(e - r.x, t - r.y, o - r.z);
        s < 10 && s < n && (n = s, a = r)
    }
    if (!a) return;
    let r = 0;
    for (let e = a.y; e < a.y + 8; e++)
        for (let t = a.x - 3; t <= a.x + 3; t++)
            for (let o = a.z - 3; o <= a.z + 3; o++) 123 === getBlockAt(t, e, o) && r++;
    0 === r && (console.log(`[HIVE] All blocks for hive at ${a.x},${a.y},${a.z} are gone. Deactivating.`), hiveLocations = hiveLocations.filter((e => e.x !== a.x || e.y !== a.y || e.z !== a.z)), addMessage("A bee hive has been destroyed!", 3e3))
}

function removeBlockAt(e, t, o, breaker) {
    const a = getBlockAt(e, t, o);
    if (!a || a === BLOCK_AIR || a === 1 || a === 6) return;

    const n = BLOCKS[a];
    if (!n || n.strength > 5) return void addMessage("Cannot break that block");

    // Check ownership BEFORE showing any visual feedback (for host/solo only)
    // Clients will send request and get approved/denied by host
    if (isHost || peers.size === 0) {
        var chunkX = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE);
        var chunkZ = Math.floor(modWrap(o, MAP_SIZE) / CHUNK_SIZE);
        var chunkKey = makeChunkKey(worldName, chunkX, chunkZ);
        if (!checkChunkOwnership(chunkKey, breaker || userName)) {
            console.log(`[Ownership] Block break denied at (${e},${t},${o}) in chunk ${chunkKey}`);
            return; // Don't show message here - WebRTC handler will send to client
        }
    }

    const r = `${e},${t},${o}`;
    let s = damagedBlocks.get(r) || {
        hits: 0,
        mesh: null
    };
    s.hits++;

    if (s.hits < n.strength) {
        damagedBlocks.set(r, s);
        if (s.mesh) {
            crackMeshes.remove(s.mesh);
            disposeObject(s.mesh);
        }
        let canvas = s.canvas;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            s.canvas = canvas;
        }
        drawCracksOnCanvas(canvas);
        const newCrackTexture = new THREE.CanvasTexture(canvas);
        newCrackTexture.magFilter = THREE.NearestFilter;
        newCrackTexture.minFilter = THREE.NearestFilter;
        newCrackTexture.needsUpdate = true;
        const l = new THREE.MeshBasicMaterial({
            map: newCrackTexture,
            transparent: true,
            opacity: 1
        });
        const d = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), l);
        d.position.set(e + 0.5, t + 0.5, o + 0.5);
        s.mesh = d;
        crackMeshes.add(d);
        const c = `pick${Math.floor(Math.random() * 3)}`;
        const u = document.getElementById(c);
        safePlayAudio(u);

        if (isHost) {
            const blockDamagedMsg = JSON.stringify({
                type: 'block_damaged',
                x: e,
                y: t,
                z: o,
                hits: s.hits
            });
            for (const [, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(blockDamagedMsg);
                }
            }
        }
    } else {
        damagedBlocks.delete(r);
        if (s.mesh) {
            crackMeshes.remove(s.mesh);
            disposeObject(s.mesh);
        }

        // Host-authoritative: only host mutates directly, clients send requests
        if (isHost || peers.size === 0) {
            // Host or solo: break immediately (ownership already checked at top)
            const worldState = getCurrentWorldState();
            const l = worldState.foreignBlockOrigins.get(r);
            chunkManager.setBlockGlobal(e, t, o, BLOCK_AIR, userName, null, 'local');
            if (l) worldState.foreignBlockOrigins.delete(r);
            if (breaker === userName) {
                addToInventory(a, 1, l);
                addMessage("Picked up " + (BLOCKS[a] ? BLOCKS[a].name : a) + (l ? ` from ${l}` : ""));
                safePlayAudio(soundBreak);
            } else if (isHost) {
                const peer = peers.get(breaker);
                if (peer && peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(JSON.stringify({
                        type: 'add_to_inventory',
                        blockId: a,
                        count: 1,
                        originSeed: l
                    }));
                }
            }
            createBlockParticles(e, t, o, a);

            if (BLOCKS[a] && BLOCKS[a].light) {
                var d = `${e},${t},${o}`;
                if (torchRegistry.delete(d), torchParticles.has(d)) {
                    var c = torchParticles.get(d);
                    scene.remove(c), c.geometry.dispose(), c.material.dispose(), torchParticles.delete(d);
                }
                lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
            }

            // Broadcast to clients
            if (isHost) {
                const breakMsg = JSON.stringify({
                    type: 'block_break',
                    x: e,
                    y: t,
                    z: o,
                    username: breaker || userName,
                    world: worldName,
                    originSeed: l
                });
                for (const [, peer] of peers.entries()) {
                    if (peer.dc && peer.dc.readyState === 'open') {
                        peer.dc.send(breakMsg);
                    }
                }
            }
        } else if (!breaker || breaker === userName) {
            // Client: send request to host (only for local player, not for other players' actions)
            const requestMsg = JSON.stringify({
                type: 'request_block_break',
                x: e,
                y: t,
                z: o,
                username: userName,
                world: worldName
            });
            for (const [peerName, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(requestMsg);
                    break; // Send to first available peer (should be host)
                }
            }
            addMessage("Breaking...", 500);
        }

        if (a === 127) {
            const key = `${e},${t},${o}`;
            if (magicianStones[key]) {
                // Use the cleanup helper to properly dispose all resources including GIF data
                cleanupMagicianStone(magicianStones[key], key);
                delete magicianStones[key];

                const message = JSON.stringify({
                    type: 'magician_stone_removed',
                    key: key
                });
                for (const [username, peer] of peers.entries()) {
                    if (peer.dc && peer.dc.readyState === 'open') {
                        peer.dc.send(message);
                    }
                }
            }
        }

        if (a === 128) {
            const key = `${e},${t},${o}`;
            if (calligraphyStones[key]) {
                if (calligraphyStones[key].mesh) {
                    scene.remove(calligraphyStones[key].mesh);
                    disposeObject(calligraphyStones[key].mesh);
                }
                delete calligraphyStones[key];

                const message = JSON.stringify({
                    type: 'calligraphy_stone_removed',
                    key: key
                });
                for (const [username, peer] of peers.entries()) {
                    if (peer.dc && peer.dc.readyState === 'open') {
                        peer.dc.send(message);
                    }
                }
            }
        }

        if (a === 123 || a === 122) {
            setTimeout(() => checkAndDeactivateHive(e, t, o), 100);
        }

        if (a === 131) {
            const key = `${e},${t},${o}`;
            if (chests[key]) {
                const chest = chests[key];
                // Drop chest contents
                for (const item of chest.items) {
                    if (item && item.count > 0) {
                        const offset = new THREE.Vector3(Math.random() * 0.5 - 0.25, Math.random() * 0.5 - 0.25, Math.random() * 0.5 - 0.25);
                        const pos = new THREE.Vector3(e + 0.5, t + 0.5, o + 0.5).add(offset);
                        const dropId = `${userName}-${Date.now()}-${Math.random()}`;
                        createDroppedItemOrb(dropId, pos, item.id, item.originSeed, userName, item.count);
                    }
                }
                if (chest.mesh) {
                    scene.remove(chest.mesh);
                    disposeObject(chest.mesh);
                }
                delete chests[key];
            }
        }
    }
}

function placeBlockAt(e, t, o, a) {
    if (a) {
        var n = INVENTORY[selectedHotIndex];
        if (!n || n.id !== a || n.count <= 0) addMessage("No item to place");
        else if (Math.hypot(player.x - e, player.y - t, player.z - o) > 5) addMessage("Too far to place");
        else {
            var r = getBlockAt(e, t, o);
            if (r === BLOCK_AIR || 6 === r)
                if (checkCollisionWithPlayer(e, t, o)) addMessage("Cannot place inside player");
                else {
                    for (var s of mobs)
                        if (Math.abs(s.pos.x - e) < .9 && Math.abs(s.pos.y - t) < .9 && Math.abs(s.pos.z - o) < .9) return void addMessage("Cannot place inside mob");

                    // Special handling for Magician's Stone
                    if (a === 127) {
                        const playerDirection = new THREE.Vector3();
                        camera.getWorldDirection(playerDirection);
                        playerDirection.y = 0;
                        playerDirection.normalize();
                        magicianStonePlacement = {
                            x: e, y: t, z: o,
                            direction: { x: playerDirection.x, y: playerDirection.y, z: playerDirection.z }
                        };
                        document.getElementById('magicianStoneModal').style.display = 'flex';
                        isPromptOpen = true;
                        return;
                    }

                    // Special handling for Calligraphy Stone
                    if (a === 128) {
                        const playerDirection = new THREE.Vector3();
                        camera.getWorldDirection(playerDirection);
                        playerDirection.y = 0;
                        playerDirection.normalize();
                        calligraphyStonePlacement = {
                            x: e, y: t, z: o,
                            direction: { x: playerDirection.x, y: playerDirection.y, z: playerDirection.z }
                        };
                        document.getElementById('calligraphyStoneModal').style.display = 'flex';
                        isPromptOpen = true;
                        return;
                    }

                    // Special handling for Chest
                    if (a === 131) {
                        const playerDirection = new THREE.Vector3();
                        camera.getWorldDirection(playerDirection);
                        playerDirection.y = 0;
                        playerDirection.normalize();
                        // Snap to 90 degrees and face player (invert direction)
                        let rotation = 0;
                        if (Math.abs(playerDirection.x) > Math.abs(playerDirection.z)) {
                            rotation = playerDirection.x > 0 ? -Math.PI / 2 : Math.PI / 2;
                        } else {
                            rotation = playerDirection.z > 0 ? Math.PI : 0;
                        }

                        const key = `${e},${t},${o}`;
                        const chestData = {
                            x: e, y: t, z: o,
                            rotation: rotation,
                            items: new Array(27).fill(null),
                            isOpen: false
                        };
                        const meshData = createChestMesh(e, t, o, rotation);
                        chestData.mesh = meshData.mesh;
                        chestData.lid = meshData.lid;
                        chests[key] = chestData;
                    }

                    // Host-authoritative: only host mutates directly, clients send requests
                    if (isHost || peers.size === 0) {
                        // Host or solo: check ownership and place immediately
                        var i = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE),
                            l = Math.floor(modWrap(o, MAP_SIZE) / CHUNK_SIZE),
                            d = makeChunkKey(worldName, i, l);
                        if (!checkChunkOwnership(d, userName)) {
                            console.log(`[Ownership] Block place denied for host at chunk ${d}`);
                            return; // Don't show message - silently fail for host
                        }

                        if (chunkManager.setBlockGlobal(e, t, o, a, !0, n.originSeed, 'local'), n.originSeed && n.originSeed !== worldSeed) {
                            const r = `${e},${t},${o}`;
                            getCurrentWorldState().foreignBlockOrigins.set(r, n.originSeed);
                            addMessage(`Placed ${BLOCKS[a] ? BLOCKS[a].name : a} from ${n.originSeed}`);
                        } else {
                            addMessage("Placed " + (BLOCKS[a] ? BLOCKS[a].name : a));
                        }
                        if (n.count -= 1, n.count <= 0 && (INVENTORY[selectedHotIndex] = null), updateHotbarUI(), safePlayAudio(soundPlace), BLOCKS[a] && BLOCKS[a].light) {
                            const a = `${e},${t},${o}`;
                            torchRegistry.set(a, {
                                x: e,
                                y: t,
                                z: o
                            });
                            var c = createFlameParticles(e, t + .5, o);
                            scene.add(c), torchParticles.set(a, c);
                        }

                        // Broadcast to clients
                        if (isHost) {
                            const placeMsg = JSON.stringify({
                                type: 'block_place',
                                x: e,
                                y: t,
                                z: o,
                                blockId: a,
                                username: userName,
                                world: worldName,
                                originSeed: n.originSeed
                            });
                            for (const [, peer] of peers.entries()) {
                                if (peer.dc && peer.dc.readyState === 'open') {
                                    peer.dc.send(placeMsg);
                                }
                            }
                        }
                    } else {
                        // Client: send request to host
                        const requestMsg = JSON.stringify({
                            type: 'request_block_place',
                            x: e,
                            y: t,
                            z: o,
                            blockId: a,
                            username: userName,
                            world: worldName,
                            originSeed: n.originSeed
                        });
                        for (const [peerName, peer] of peers.entries()) {
                            if (peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(requestMsg);
                                break; // Send to first available peer (should be host)
                            }
                        }
                        addMessage("Placing...", 500);
                    }
                }
            else addMessage("Cannot place here")
        }
    } else addMessage("No item selected")
}

function checkCollisionWithPlayer(e, t, o) {
    const a = player.x,
        n = player.x + player.width,
        r = player.y,
        s = player.y + player.height,
        i = player.z,
        l = player.z + player.depth;
    return a < e + 1 && n > e && r < t + 1 && s > t && i < o + 1 && l > o
}

function getBlockAt(e, t, o) {
    var a = modWrap(Math.floor(e), MAP_SIZE),
        n = modWrap(Math.floor(o), MAP_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = Math.floor(n / CHUNK_SIZE),
        i = chunkManager.getChunk(r, s);
    i.generated || chunkManager.generateChunk(i);
    var l = Math.floor(a % CHUNK_SIZE),
        d = Math.floor(n % CHUNK_SIZE);
    return i.get(l, Math.floor(t), d)
}

function handlePlayerDeath() {
    if (deathScreenShown || isDying) return;
    avatarGroup && (avatarGroup.visible = !0), isDying = !0, deathAnimationStart = performance.now(), INVENTORY = new Array(36).fill(null), player.score = 0, document.getElementById("score").innerText = player.score, player.health = 0, updateHealthBar(), updateHotbarUI(), addMessage("You died! All items and score lost.", 5e3);
    const e = JSON.stringify({
        type: "player_death",
        username: userName
    });
    for (const [t, o] of peers.entries()) o.dc && "open" === o.dc.readyState && o.dc.send(e)
}

function respawnPlayer(e, t, o) {
    // Determine if this is a home teleport (no coords provided, uses spawnPoint)
    var isHomeTeleport = (e === undefined && t === undefined && o === undefined);
    
    var a = modWrap(e || spawnPoint.x, MAP_SIZE),
        n = modWrap(o || spawnPoint.z, MAP_SIZE),
        r = t || chunkManager.getSurfaceY(a, n) + 1;
    
    // Calculate target chunk coordinates to check if it's already loaded
    // Note: a and n are already wrapped, so no need to call modWrap again
    var targetChunkX = Math.floor(a / CHUNK_SIZE),
        targetChunkZ = Math.floor(n / CHUNK_SIZE);
    var targetChunkKey = makeChunkKey(worldName, targetChunkX, targetChunkZ);
    var isTargetChunkLoaded = chunkManager.chunks.has(targetChunkKey);
    
    if (checkCollision(a, r, n)) {
        for (var s = !1, i = 0; i <= 5; i++)
            if (!checkCollision(a, r + i, n)) {
                player.x = a, player.y = r + i, player.z = n, player.vy = 0, player.onGround = !1, s = !0;
                break
            } s || (player.x = a, player.y = chunkManager.getSurfaceY(a, n) + 1, player.z = n, player.vy = 0, player.onGround = !0, player.health = 20, player.yaw = 0, player.pitch = 0)
    } else player.x = a, player.y = r, player.z = n, player.vy = 0, player.onGround = !1, player.health = 20, player.yaw = 0, player.pitch = 0;
    updateHotbarUI(), updateHealthBar(), document.getElementById("health").innerText = player.health;
    
    // Smart teleport behavior:
    // 1. Home teleport: Never unload previous area (let distance-based eviction handle cleanup)
    // 2. Teleport within loaded area: Skip unloading, destination chunk already exists
    // 3. Teleport to distant area: Unload old area to prevent tiny horizon artifacts
    if (!isHomeTeleport && !isTargetChunkLoaded) {
        // Distant teleport: unload chunks from previous location
        chunkManager.unloadDistantChunks(player.x, player.z, currentLoadRadius);
    }
    
    var l = Math.floor(a / CHUNK_SIZE),
        d = Math.floor(n / CHUNK_SIZE);
    currentLoadRadius = INITIAL_LOAD_RADIUS, chunkManager.preloadChunks(l, d, currentLoadRadius);
    
    // Use circular distance check for chunk iteration
    var radiusSq = currentLoadRadius * currentLoadRadius;
    for (var c = -currentLoadRadius; c <= currentLoadRadius; c++)
        for (var u = -currentLoadRadius; u <= currentLoadRadius; u++) {
            // Circular filter: only process chunks within circular radius
            if (c * c + u * u <= radiusSq) {
                var p = modWrap(l + c, CHUNKS_PER_SIDE),
                    m = modWrap(d + u, CHUNKS_PER_SIDE),
                    y = chunkManager.getChunk(p, m);
                y.generated || chunkManager.generateChunk(y), !y.needsRebuild && y.mesh || chunkManager.buildChunkMesh(y);
            }
        }
    if (chunkManager.update(player.x, player.z), "first" === cameraMode) {
        camera.position.set(player.x + player.width / 2, player.y + 1.62, player.z + player.depth / 2), camera.rotation.set(0, 0, 0, "YXZ");
        try {
            renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
        } catch (e) {
            addMessage("Pointer lock failed. Serve over HTTPS or check iframe permissions.", 3e3)
        }
    } else camera.position.set(player.x, player.y + 5, player.z + 10), controls.target.set(player.x + player.width / 2, player.y + .6, player.z + player.depth / 2), controls.update();
    document.getElementById("deathScreen").style.display = "none", deathScreenShown = !1, createAndSetupAvatar(userName, !0), avatarGroup.visible = "third" === cameraMode, addMessage("Respawned at " + Math.floor(a) + ", " + Math.floor(player.y) + ", " + Math.floor(n), 3e3);
    const h = JSON.stringify({
        type: "player_respawn",
        username: userName,
        x: player.x,
        y: player.y,
        z: player.z
    });
    for (const [e, t] of peers.entries()) t.dc && "open" === t.dc.readyState && t.dc.send(h)
}

function isSolid(e) {
    return 0 !== e && 6 !== e && 12 !== e && 8 !== e && 16 !== e && 17 !== e && 100 !== e && 101 !== e && 102 !== e && 103 !== e && 104 !== e && 111 !== e && 112 !== e && 113 !== e && 114 !== e && 116 !== e && 117 !== e
}

function checkCollisionWithBlock(e, t, o) {
    for (var a = e - .45, n = t, r = o - .45, s = e + .45, i = t + .9, l = o + .45, d = Math.floor(a); d <= Math.floor(s); d++)
        for (var c = Math.floor(n); c <= Math.floor(i); c++)
            for (var u = Math.floor(r); u <= Math.floor(l); u++)
                if (isSolid(getBlockAt(d, c, u))) return !0;
    return !1
}

function checkBlockCollision(e, t, o) {
    const a = Math.floor(e),
        n = Math.floor(e + player.width),
        r = Math.floor(t),
        s = Math.floor(t + player.height),
        i = Math.floor(o),
        l = Math.floor(o + player.depth);
    for (let e = a; e <= n; e++)
        for (let t = r; t <= s; t++)
            for (let o = i; o <= l; o++)
                if (isSolid(getBlockAt(e, t, o))) return !0;
    return !1
}

function checkCollision(e, t, o) {
    if (checkBlockCollision(e, t, o)) return true;
    return checkMeshCollision(e, t, o);
}

function checkMeshCollision(x, y, z) {
    // Only check if magicianStones exist
    if (!magicianStones || Object.keys(magicianStones).length === 0) return false;

    const playerBox = new THREE.Box3();
    playerBox.min.set(x, y, z);
    playerBox.max.set(x + player.width, y + player.height, z + player.depth);

    // Optimization: Reuse Box3 objects if possible, but creating new ones is safer for now.
    const stones = Object.values(magicianStones);

    for (const stone of stones) {
        if (!stone.mesh) continue;

        // Skip screens/images that shouldn't have collision?
        // User asked for "models imported via minimap" to have collision.
        // Usually these are GLBs. Images (planes) might be annoying.
        // But for now, check everything with a mesh.
        // We can check if it's a PlaneGeometry to skip?
        // Let's assume user wants all "Magician Stone" content to be collidable.

        const stoneBox = new THREE.Box3().setFromObject(stone.mesh);
        if (!playerBox.intersectsBox(stoneBox)) continue;

        // Detailed check
        let collision = false;
        stone.mesh.traverse((child) => {
            if (collision) return;
            if (child.isMesh) {
                if (checkGeometryCollision(child, playerBox)) {
                    collision = true;
                }
            }
        });
        if (collision) return true;
    }
    return false;
}

function checkGeometryCollision(mesh, box) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();

    // Quick local bbox check (transformed to world)
    // Actually setFromObject handles the hierarchy world transform.
    // So we are good to proceed to triangle check.

    const pos = geometry.attributes.position;
    const index = geometry.index;
    const matrix = mesh.matrixWorld;

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const triangle = new THREE.Triangle();

    // Optimization: Don't check every triangle if mesh is huge.
    // But we don't have spatial index for geometry here.
    // Check all for now.

    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            vA.fromBufferAttribute(pos, index.getX(i)).applyMatrix4(matrix);
            vB.fromBufferAttribute(pos, index.getX(i+1)).applyMatrix4(matrix);
            vC.fromBufferAttribute(pos, index.getX(i+2)).applyMatrix4(matrix);

            // Optimization: check if triangle bbox intersects player box
            const triMinX = Math.min(vA.x, vB.x, vC.x);
            const triMaxX = Math.max(vA.x, vB.x, vC.x);
            if (triMaxX < box.min.x || triMinX > box.max.x) continue;

            const triMinY = Math.min(vA.y, vB.y, vC.y);
            const triMaxY = Math.max(vA.y, vB.y, vC.y);
            if (triMaxY < box.min.y || triMinY > box.max.y) continue;

            const triMinZ = Math.min(vA.z, vB.z, vC.z);
            const triMaxZ = Math.max(vA.z, vB.z, vC.z);
            if (triMaxZ < box.min.z || triMinZ > box.max.z) continue;

            triangle.set(vA, vB, vC);
            if (box.intersectsTriangle(triangle)) return true;
        }
    } else {
        for (let i = 0; i < pos.count; i += 3) {
            vA.fromBufferAttribute(pos, i).applyMatrix4(matrix);
            vB.fromBufferAttribute(pos, i+1).applyMatrix4(matrix);
            vC.fromBufferAttribute(pos, i+2).applyMatrix4(matrix);

            const triMinX = Math.min(vA.x, vB.x, vC.x);
            const triMaxX = Math.max(vA.x, vB.x, vC.x);
            if (triMaxX < box.min.x || triMinX > box.max.x) continue;

            const triMinY = Math.min(vA.y, vB.y, vC.y);
            const triMaxY = Math.max(vA.y, vB.y, vC.y);
            if (triMaxY < box.min.y || triMinY > box.max.y) continue;

            const triMinZ = Math.min(vA.z, vB.z, vC.z);
            const triMaxZ = Math.max(vA.z, vB.z, vC.z);
            if (triMaxZ < box.min.z || triMinZ > box.max.z) continue;

            triangle.set(vA, vB, vC);
            if (box.intersectsTriangle(triangle)) return true;
        }
    }
    return false;
}

function getMeshSurfaceY(x, y, z) {
    // Cast ray down from head level
    const origin = new THREE.Vector3(x + player.width/2, y + player.height, z + player.depth/2);
    const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
    // Look down slightly more than player height to find the ground we just hit or are about to hit
    raycaster.far = player.height + 2;

    const meshes = Object.values(magicianStones).map(s => s.mesh).filter(m => m);
    if (meshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
        // Find the highest intersection point that is below the head
        return intersects[0].point.y;
    }
    return null;
}

function pushPlayerOut() {
    for (var e = [{
        dx: .2,
        dz: 0
    }, {
        dx: -.2,
        dz: 0
    }, {
        dx: 0,
        dz: .2
    }, {
        dx: 0,
        dz: -.2
    }, {
        dx: .2,
        dz: .2
    }, {
        dx: .2,
        dz: -.2
    }, {
        dx: -.2,
        dz: .2
    }, {
        dx: -.2,
        dz: -.2
    }], t = 0; t <= 2; t += .2)
        for (var o of e) {
            var a = modWrap(player.x + o.dx, MAP_SIZE),
                n = modWrap(player.z + o.dz, MAP_SIZE),
                r = player.y + t;
            if (!checkCollision(a, r, n)) return player.x = a, player.y = r, player.z = n, player.vy = 0, player.onGround = !0, addMessage("Pushed out of block"), !0
        }
    return !1
}

function updateMinimap() {
    if (minimapCtx) {
        var e = minimapCtx.canvas;
        minimapCtx.clearRect(0, 0, e.width, e.height), minimapCtx.fillStyle = "rgba(0,0,0,0.3)", minimapCtx.fillRect(0, 0, e.width, e.height);
        var t = e.width / 40,
            o = e.width / 2,
            a = e.height / 2;
        for (var n of (minimapCtx.fillStyle = "#ffffff", minimapCtx.fillRect(o - 2, a - 2, 4, 4), minimapCtx.fillStyle = "#9bff9b", mobs)) {
            var r = n.pos.x - player.x,
                s = n.pos.z - player.z;
            if (Math.abs(r) <= 20 && Math.abs(s) <= 20) {
                var i = o + r * t,
                    l = a + s * t;
                minimapCtx.fillRect(i - 2, l - 2, 4, 4)
            }
        }
        for (var d of (minimapCtx.fillStyle = "#ff6b6b", playerAvatars)) {
            d[0];
            var c = d[1];
            r = c.position.x - player.x, s = c.position.z - player.z;
            if (Math.abs(r) <= 20 && Math.abs(s) <= 20) {
                i = o + r * t, l = a + s * t;
                minimapCtx.fillRect(i - 2, l - 2, 4, 4)
            }
        }
        if (isConnecting) {
            const t = e.width / 2,
                n = performance.now() / 500 % (2 * Math.PI);
            minimapCtx.beginPath(), minimapCtx.moveTo(o, a), minimapCtx.lineTo(o + t * Math.cos(n), a + t * Math.sin(n));
            const r = minimapCtx.createLinearGradient(o, a, o + t * Math.cos(n), a + t * Math.sin(n));
            r.addColorStop(0, "rgba(100, 255, 100, 0)"), r.addColorStop(1, "rgba(100, 255, 100, 0.9)"), minimapCtx.strokeStyle = r, minimapCtx.lineWidth = 2, minimapCtx.stroke()
        }
    }
}
document.getElementById("trashCancel").addEventListener("click", (function () {
    document.getElementById("trashConfirm").style.display = "none", trashIndex = -1, this.blur()
})), document.getElementById("trashOk").addEventListener("click", (function () {
    trashIndex >= 0 && (INVENTORY[trashIndex] = null, updateHotbarUI(), addMessage("Item trashed")), document.getElementById("trashConfirm").style.display = "none", trashIndex = -1, this.blur()
}));
var keys = {};

function registerKeyEvents() {
    function e(e) {
        const t = e.key.toLowerCase();
        if ("w" === t && !keys[t]) {
            const e = performance.now();
            e - lastWPress < 300 && addMessage((isSprinting = !isSprinting) ? "Sprinting enabled" : "Sprinting disabled", 1500), lastWPress = e
        }
        keys[t] = !0, "Escape" === e.key && mouseLocked && (document.exitPointerLock(), mouseLocked = !1), "t" === e.key.toLowerCase() && toggleCameraMode(), "c" === e.key.toLowerCase() && openCrafting(), "i" === e.key.toLowerCase() && toggleInventory(), "p" === e.key.toLowerCase() && (isPromptOpen = !0, document.getElementById("teleportModal").style.display = "block", document.getElementById("teleportX").value = Math.floor(player.x), document.getElementById("teleportY").value = Math.floor(player.y), document.getElementById("teleportZ").value = Math.floor(player.z)), "x" === e.key.toLowerCase() && getCurrentWorldState().chunkDeltas.size > 0 && downloadSession(), "u" === e.key.toLowerCase() && openUsersModal(), " " === e.key.toLowerCase() && playerJump(), "q" === e.key.toLowerCase() && onPointerDown({
            button: 0,
            preventDefault: () => { }
        }), "e" === e.key.toLowerCase() && onPointerDown({
            button: 2,
            preventDefault: () => { }
        })
    }

    function t(e) {
        keys[e.key.toLowerCase()] = !1
    }
    return window.addEventListener("keydown", e), window.addEventListener("keyup", t),
        function () {
            window.removeEventListener("keydown", e), window.removeEventListener("keyup", t)
        }
}

function playerJump() {
    player.onGround && (player.vy = isSprinting ? 25.5 : 8.5, player.onGround = !1)
}

function toggleCameraMode() {
    addMessage("Camera: " + (cameraMode = "third" === cameraMode ? "first" : "third"));

    // Toggle controls and avatar visibility
    controls.enabled = "third" === cameraMode;
    avatarGroup.visible = "third" === cameraMode;

    if ("third" === cameraMode) {
        // Switch to Third Person
        camera.position.set(player.x, player.y + 5, player.z + 10);
        controls.target.set(player.x, player.y + .6, player.z);
        controls.update();

        if (!isMobile()) document.exitPointerLock();
        mouseLocked = false;
        document.getElementById("crosshair").style.display = "none";
    } else {
        // Switch to First Person
        if (isMobile()) {
            document.getElementById("crosshair").style.display = "block";
        } else {
            try {
                renderer.domElement.requestPointerLock();
                mouseLocked = true;
                document.getElementById("crosshair").style.display = "block";
            } catch (e) {
                addMessage("Pointer lock failed. Please serve over HTTPS or ensure allow-pointer-lock is set in iframe.");
                document.getElementById("crosshair").style.display = "block";
            }
        }
        player.yaw = 0;
        player.pitch = 0;
        camera.rotation.set(0, 0, 0, "YXZ");
    }
}

function performAttack() {
    animateAttack();
    var e = new THREE.Vector3;
    camera.getWorldDirection(e);
    var t = "first" === cameraMode ? new THREE.Vector3(player.x, player.y + 1.62, player.z) : camera.position.clone();
    raycaster.setFromCamera(pointer, camera), raycaster.far = 5;
    var o = mobs.map((function (e) {
        return {
            mob: e,
            intersect: raycaster.intersectObject(e.mesh)[0]
        }
    })).filter((function (e) {
        return e.intersect
    })).sort((function (e, t) {
        return e.intersect.distance - t.intersect.distance
    }));
    if (o.length > 0) return o[0].mob.hurt(4), safePlayAudio(soundHit), void addMessage("Hit mob!", 800);
    for (var a = .6; a < 3; a += .6) {
        var n = t.clone().addScaledVector(e, a),
            r = Math.round(n.x),
            s = Math.round(n.y),
            i = Math.round(n.z),
            l = getBlockAt(r, s, i);
        if (l && l !== BLOCK_AIR && 6 !== l) return void removeBlockAt(r, s, i)
    }
}
async function downloadSession() {
    // Show the save options modal for all players (host and peer)
    isPromptOpen = true;
    document.getElementById("saveOptionsModal").style.display = "flex";
}

function saveFullSession() {
    // Close the modal
    document.getElementById("saveOptionsModal").style.display = "none";
    isPromptOpen = false;
    
    // Trigger the full session save
    downloadHostSession();
}

function savePlayerChangesOnly() {
    // Close the modal
    document.getElementById("saveOptionsModal").style.display = "none";
    isPromptOpen = false;
    
    // Trigger the player-specific save
    downloadSinglePlayerSession();
}

async function downloadHostSession() {
    const serializableWorldStates = Array.from(WORLD_STATES.entries()).map(([worldName, data]) => {
        return [worldName, {
            chunkDeltas: Array.from(data.chunkDeltas.entries()),
            foreignBlockOrigins: Array.from(data.foreignBlockOrigins.entries()),
            ipfsTruncatedDates: Array.from((data.ipfsTruncatedDates || new Map()).entries())
        }];
    });

    // Serialize magician stones (include ALL stones for host session, not just local)
    const serializableMagicianStones = {};
    for (const key in magicianStones) {
        if (Object.hasOwnProperty.call(magicianStones, key)) {
            const stone = magicianStones[key];
            // Host session saves ALL stones regardless of source
            serializableMagicianStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                url: stone.url,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                loop: stone.loop,
                autoplay: stone.autoplay,
                distance: stone.distance,
                direction: stone.direction
            };
        }
    }

    // Serialize calligraphy stones (include ALL stones for host session, not just local)
    const serializableCalligraphyStones = {};
    for (const key in calligraphyStones) {
        if (Object.hasOwnProperty.call(calligraphyStones, key)) {
            const stone = calligraphyStones[key];
            // Host session saves ALL stones regardless of source
            serializableCalligraphyStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                bgColor: stone.bgColor,
                transparent: stone.transparent,
                fontFamily: stone.fontFamily,
                fontSize: stone.fontSize,
                fontWeight: stone.fontWeight,
                fontColor: stone.fontColor,
                text: stone.text,
                link: stone.link,
                direction: stone.direction
            };
        }
    }

    // Serialize chests (same logic as single player session)
    const serializableChests = {};
    for (const key in chests) {
        if (chests[key]) {
            serializableChests[key] = {
                x: chests[key].x,
                y: chests[key].y,
                z: chests[key].z,
                rotation: chests[key].rotation,
                items: chests[key].items
            };
        }
    }

    const hostSessionData = {
        isHostSession: true,
        worldStates: serializableWorldStates,
        processedMessages: Array.from(processedMessages),
        playerData: {
            world: worldName,
            seed: worldSeed,
            user: userName,
            savedAt: new Date().toISOString(),
            profile: {
                x: player.x,
                y: player.y,
                z: player.z,
                health: player.health,
                score: player.score,
                inventory: INVENTORY
            },
            magicianStones: serializableMagicianStones,
            calligraphyStones: serializableCalligraphyStones,
            chests: serializableChests,
            musicPlaylist: musicPlaylist,
            videoPlaylist: videoPlaylist
        }
    };

    hostSessionData.hash = simpleHash(JSON.stringify(hostSessionData.playerData));

    const blob = new Blob([JSON.stringify(hostSessionData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${worldName}_host_session_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addMessage("Host session downloaded");
}

async function downloadSinglePlayerSession() {
    const worldState = getCurrentWorldState();
    const serializableMagicianStones = {};
    for (const key in magicianStones) {
        if (Object.hasOwnProperty.call(magicianStones, key)) {
            const stone = magicianStones[key];
            if (stone.source !== 'local') continue;
            serializableMagicianStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                url: stone.url,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                loop: stone.loop,
                autoplay: stone.autoplay,
                distance: stone.distance,
                direction: stone.direction
            };
        }
    }

    const serializableCalligraphyStones = {};
    for (const key in calligraphyStones) {
        if (Object.hasOwnProperty.call(calligraphyStones, key)) {
            const stone = calligraphyStones[key];
            if (stone.source !== 'local') continue;
            serializableCalligraphyStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                bgColor: stone.bgColor,
                transparent: stone.transparent,
                fontFamily: stone.fontFamily,
                fontSize: stone.fontSize,
                fontWeight: stone.fontWeight,
                fontColor: stone.fontColor,
                text: stone.text,
                link: stone.link,
                direction: stone.direction
            };
        }
    }

    const serializableChests = {};
    for (const key in chests) {
        if (chests[key]) {
            serializableChests[key] = {
                x: chests[key].x,
                y: chests[key].y,
                z: chests[key].z,
                rotation: chests[key].rotation,
                items: chests[key].items
            };
        }
    }

    var e = {
        world: worldName,
        seed: worldSeed,
        user: userName,
        savedAt: (new Date).toISOString(),
        deltas: [],
        foreignBlockOrigins: Array.from(getCurrentWorldState().foreignBlockOrigins.entries()),
        magicianStones: serializableMagicianStones,
        calligraphyStones: serializableCalligraphyStones,
        chests: serializableChests,
        profile: {
            x: player.x,
            y: player.y,
            z: player.z,
            health: player.health,
            score: player.score,
            inventory: INVENTORY
        },
        musicPlaylist: musicPlaylist,
        videoPlaylist: videoPlaylist
    };
    for (var t of worldState.chunkDeltas) {
        var o = t[0],
            a = t[1];
        // Filter changes to include only those modified locally
        var localChanges = a.filter(change => change.source === 'local');
        if (localChanges.length > 0 && parseChunkKey(o)) {
            e.deltas.push({
                chunk: o,
                changes: localChanges
            });
        }
    }
    var n = {
        playerData: e,
        hash: simpleHash(JSON.stringify(e))
    },
        r = new Blob([JSON.stringify(n)], {
            type: "application/json"
        }),
        s = URL.createObjectURL(r),
        i = document.createElement("a");
    i.href = s, i.download = worldName + "_session_" + Date.now() + ".json", document.body.appendChild(i), i.click(), i.remove(), URL.revokeObjectURL(s), addMessage("Session downloaded");
    var l = Array.from(worldState.chunkDeltas.keys()).filter(chunkKey => {
        const changes = worldState.chunkDeltas.get(chunkKey);
        return changes && changes.some(change => change.source === 'local');
    });
    var d = await Promise.all(l.map((async function (e) {
        var t = await GetPublicAddressByKeyword(e);
        return t ? t.trim().replace(/^"|"$/g, "") : e
    })));
    document.getElementById("downloadAddressList").value = d.join(","), document.getElementById("downloadModal").style.display = "block"
}

// Add this call to the end of startGame
handleResizeAndOrientation();


function addMessage(e, t) {
    var o = document.getElementById("messages"),
        a = document.createElement("div");
    a.className = "msg", a.innerText = e, o.prepend(a), setTimeout((function () {
        a.remove()
    }), t || 2e3)
}

function updateHealthBar() {
    var e = Math.max(0, Math.min(1, player.health / 999));
    document.getElementById("healthBarInner").style.width = 100 * e + "%"
}

function updateSaveChangesButton() {
    const worldState = getCurrentWorldState();
    document.getElementById("saveChangesBtn").style.display = worldState.chunkDeltas.size > 0 ? "inline-block" : "none"
}

function updateHudButtons() {
    document.getElementById("joinScriptBtn").style.display = "none", updateSaveChangesButton();
    var e = document.getElementById("usersBtn"),
        t = peers.size > 0 ? peers.size - (peers.has(userName) ? 1 : 0) : 0;
    console.log("[WebRTC] Updating usersBtn: peerCount=", t, "peers=", Array.from(peers.keys())), e.style.display = "inline-block", e.innerText = "🌐 " + t, e.onclick = function () {
        console.log("[Modal] usersBtn clicked, opening modal"), openUsersModal()
    }, setupPendingModal()
}

function updateHud() {
    var e = document.getElementById("score");
    e && (e.innerText = player.score);
    var t = document.getElementById("health");
    t && (t.innerText = player.health);
    var o = document.getElementById("posLabel");
    o && (o.innerText = Math.floor(player.x) + ", " + Math.floor(player.y) + ", " + Math.floor(player.z));
    var a = Math.hypot(player.x - spawnPoint.x, player.z - spawnPoint.z);
    document.getElementById("homeIcon").style.display = a > 10 ? "inline" : "none", updateHealthBar(), updateHotbarUI(), updateHudButtons()
}

function isMobile() {
    return /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)
}

function setupMobile() {
    if (!isMobile()) return;

    // Joystick variables
    const joystickZone = document.getElementById("mobileJoystickZone");
    const joystickKnob = document.getElementById("mobileJoystickKnob");
    let joystickOrigin = { x: 0, y: 0 };
    let joystickId = null;

    // Joystick Event Handlers
    joystickZone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickId = touch.identifier;
        joystickOrigin = { x: touch.clientX, y: touch.clientY };

        joystickKnob.style.display = "block";
        joystickKnob.style.left = touch.clientX + "px";
        joystickKnob.style.top = touch.clientY + "px";
        joystickKnob.style.transform = "translate(-50%, -50%)"; // Reset transform for centering
    }, { passive: false });

    joystickZone.addEventListener("touchmove", (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                const touch = e.changedTouches[i];
                const dx = touch.clientX - joystickOrigin.x;
                const dy = touch.clientY - joystickOrigin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 50; // Max joystick radius

                let clampedX = dx;
                let clampedY = dy;

                if (distance > maxDist) {
                    const ratio = maxDist / distance;
                    clampedX = dx * ratio;
                    clampedY = dy * ratio;
                }

                joystickKnob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

                // Update joystick input state
                // Normalize to -1 to 1
                const normX = clampedX / maxDist;
                const normY = clampedY / maxDist;

                // Deadzone
                const deadzone = 0.2;

                joystick.right = normX > deadzone;
                joystick.left = normX < -deadzone;
                joystick.down = normY > deadzone;
                joystick.up = normY < -deadzone;

                break;
            }
        }
    }, { passive: false });

    const endJoystick = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                joystickId = null;
                joystickKnob.style.display = "none";
                joystick.up = false;
                joystick.down = false;
                joystick.left = false;
                joystick.right = false;
                break;
            }
        }
    };

    joystickZone.addEventListener("touchend", endJoystick, { passive: false });
    joystickZone.addEventListener("touchcancel", endJoystick, { passive: false });

    // Look/Interact Zone variables
    const lookZone = document.getElementById("mobileLookZone");
    let lookOrigin = { x: 0, y: 0 };
    let lookId = null;
    let lookStartTime = 0;
    let lookMoved = false;
    let lastPinchDistance = 0;

    // Look Event Handlers
    lookZone.addEventListener("touchstart", (e) => {
        e.preventDefault();

        // Handle initial pinch distance
        if (e.touches.length === 2 && cameraMode === "third") {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            return; // Don't start look logic if pinching
        }

        const touch = e.changedTouches[0];
        lookId = touch.identifier;
        lookOrigin = { x: touch.clientX, y: touch.clientY };
        lookStartTime = Date.now();
        lookMoved = false;
    }, { passive: false });

    lookZone.addEventListener("touchmove", (e) => {
        e.preventDefault();

        // Handle Pinch to Zoom in 3rd Person
        if (e.touches.length === 2 && cameraMode === "third") {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (lastPinchDistance > 0) {
                const delta = distance - lastPinchDistance;
                // Zoom sensitivity
                const zoomSpeed = 0.05;

                // Adjust camera distance
                const eye = new THREE.Vector3().copy(controls.object.position).sub(controls.target);
                let len = eye.length();

                // Spread (positive delta) -> Zoom In (shorter distance)
                // Pinch (negative delta) -> Zoom Out (longer distance)
                // Wait, typically spread enlarges content.
                // If I spread fingers, I want to see MORE detail, so zoom IN.
                // So delta > 0 should DECREASE distance.

                len -= delta * zoomSpeed;

                // Clamp
                len = Math.max(controls.minDistance, Math.min(controls.maxDistance, len));

                eye.normalize().multiplyScalar(len);
                controls.object.position.copy(controls.target).add(eye);
                controls.update();
            }

            lastPinchDistance = distance;
            return; // Skip look logic
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookId) {
                const touch = e.changedTouches[i];
                const dx = touch.clientX - lookOrigin.x;
                const dy = touch.clientY - lookOrigin.y;

                // Update Look
                const sensitivity = 0.005;
                if (cameraMode === "first") {
                    player.yaw -= dx * sensitivity;
                    player.pitch -= dy * sensitivity;
                    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));

                    camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
                    if (avatarGroup && avatarGroup.children[3]) {
                        avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
                    }
                } else {
                    // Third person orbit
                    if (controls && controls.enabled) {
                        controls.rotateLeft(dx * sensitivity);
                        controls.rotateUp(dy * sensitivity);
                        controls.update();
                    }
                }

                lookOrigin = { x: touch.clientX, y: touch.clientY };

                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                    lookMoved = true;
                }
                break;
            }
        }
    }, { passive: false });

    const endLook = (e) => {
        e.preventDefault();

        // Reset pinch if fingers lifted
        if (e.touches.length < 2) {
            lastPinchDistance = 0;
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookId) {
                const touch = e.changedTouches[i];
                const duration = Date.now() - lookStartTime;

                if (!lookMoved && duration < 300) {
                    // Short Tap - Interact / Use
                    const item = INVENTORY[selectedHotIndex];
                    let button = 2; // Default to Right Click (Place/Interact)

                    // If item is a gun (121, 126) or consumable (122), use Left Click (Button 0)
                    // because Right Click with hand_attachable items triggers 'drop' logic.
                    // Guns and honey are usually 0 to fire/eat.
                    if (item && (item.id === 121 || item.id === 126 || item.id === 122)) {
                        button = 0;
                    }

                    onPointerDown({
                        button: button,
                        preventDefault: () => {}
                    });
                }

                // Reset
                lookId = null;
                clearInterval(breakInterval);
                breakInterval = null;
                break;
            }
        }
    };

    let breakInterval = null;
    lookZone.addEventListener("touchstart", (e) => {
        // Start holding timer
        if (breakInterval) clearInterval(breakInterval);
        breakInterval = setTimeout(() => {
            if (!lookMoved) {
                // Long press - Break/Attack (Left Click equivalent)
                onPointerDown({
                    button: 0, // Left click / Break
                    preventDefault: () => {}
                });
                // Repeated breaking if holding? The prompt says "tapped and held down for a moment", implying single action or continuous?
                // Standard minecraft is continuous. Let's make it continuous if held?
                // For now, let's just trigger one action or set a flag.
                // onPointerDown handles one hit.

                // Let's set a repeated attack interval
                breakInterval = setInterval(() => {
                     if (!lookMoved) {
                        onPointerDown({
                            button: 0,
                            preventDefault: () => {}
                        });
                     }
                }, 250); // 4 hits per second
            }
        }, 300); // 300ms threshold
    }, { passive: false });

    lookZone.addEventListener("touchend", (e) => {
        // Clear interval on end
        if (breakInterval) {
            clearTimeout(breakInterval);
            clearInterval(breakInterval);
            breakInterval = null;
        }
        endLook(e);
    }, { passive: false });

    lookZone.addEventListener("touchcancel", (e) => {
        if (breakInterval) {
            clearTimeout(breakInterval);
            clearInterval(breakInterval);
            breakInterval = null;
        }
        endLook(e);
    }, { passive: false });


    // Buttons
    document.getElementById("mobileJumpBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        playerJump();
    });

    document.getElementById("mobileSprintBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        isSprinting = !isSprinting;
        addMessage(isSprinting ? "Sprinting enabled" : "Sprinting disabled", 1000);
    });

    document.getElementById("mobileInventoryBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleInventory();
    });

    document.getElementById("mobileCamBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleCameraMode();
    });
}

function updateLoginUI() {
    try {
        console.log("[Debug] updateLoginUI started, knownWorlds:", knownWorlds.size, "knownUsers:", knownUsers.size);
        var e = document.getElementById("worldNameInput"),
            t = document.getElementById("userInput"),
            o = document.getElementById("worldSuggestions"),
            a = document.getElementById("userSuggestions");
        if (!(e && t && o && a)) return console.error("[Debug] Input or suggestion elements not found in DOM"), void addMessage("UI initialization failed: elements missing", 3e3);

        function n() {
            var t = e.value.toLowerCase(),
                a = Array.from(knownWorlds.keys()).filter((e => e.toLowerCase().startsWith(t))).slice(0, 10);
            o.innerHTML = a.map((e => `<div data-value="${e}">${e}</div>`)).join(""), o.style.display = a.length > 0 && t ? "block" : "none"
        }

        function r() {
            var e = t.value.toLowerCase(),
                o = Array.from(knownUsers.keys()).filter((t => t.toLowerCase().startsWith(e))).slice(0, 10);
            a.innerHTML = o.map((e => `<div data-value="${e}">${e}</div>`)).join(""), a.style.display = o.length > 0 && e ? "block" : "none", console.log("[LoginUI] User suggestions updated:", o.length)
        }

        function s() {
            n(), r()
        }
        e.addEventListener("input", n), t.addEventListener("input", r), setTimeout(s, 1e3), s(), o.addEventListener("click", (function (t) {
            t.target.dataset.value && (e.value = t.target.dataset.value, o.style.display = "none", console.log("[LoginUI] Selected world:", t.target.dataset.value))
        })), a.addEventListener("click", (function (e) {
            e.target.dataset.value && (t.value = e.target.dataset.value, a.style.display = "none", console.log("[LoginUI] Selected user:", e.target.dataset.value))
        })), document.addEventListener("click", (function (n) {
            e.contains(n.target) || o.contains(n.target) || (o.style.display = "none"), t.contains(n.target) || a.contains(n.target) || (a.style.display = "none")
        })), console.log("[Debug] updateLoginUI completed"), a.addEventListener("click", (function (e) {
            e.target.dataset.value && (t.value = e.target.dataset.value, a.style.display = "none", console.log("[LoginUI] Selected user:", e.target.dataset.value))
        })), document.addEventListener("click", (function (n) {
            e.contains(n.target) || o.contains(n.target) || (o.style.display = "none"), t.contains(n.target) || a.contains(n.target) || (a.style.display = "none")
        })), console.log("[Debug] updateLoginUI completed")
    } catch (i) {
        console.error("[Debug] Error in updateLoginUI:", i), addMessage("Failed to initialize login UI", 3e3)
    }
}
async function populateSpawnChunks() {
    // spawnChunks is keyed by username@worldname to avoid conflicts between worlds
    for (var e of spawnChunks) {
        var spawnKey = e[0],
            spawnData = e[1],
            // Use existing spawn if available, otherwise calculate
            spawn = spawnData.spawn || calculateSpawnPoint(spawnData.username + "@" + spawnData.world);
        const chunkX = Math.floor(spawn.x / CHUNK_SIZE);
        const chunkZ = Math.floor(spawn.z / CHUNK_SIZE);
        const chunkKey = makeChunkKey(spawnData.world, chunkX, chunkZ);

        // Check for home spawn collision
        const existing = OWNED_CHUNKS.get(chunkKey);
        if (existing && existing.type === 'home' && existing.username !== spawnData.username) {
            console.log(`[Ownership] Home spawn collision detected for ${spawnData.username} at chunk ${chunkKey} (owned by ${existing.username})`);
            // Spiral search for free chunk
            let spiralRadius = 1;
            let foundFree = false;
            while (spiralRadius <= 10 && !foundFree) {
                for (let dx = -spiralRadius; dx <= spiralRadius && !foundFree; dx++) {
                    for (let dz = -spiralRadius; dz <= spiralRadius && !foundFree; dz++) {
                        if (Math.abs(dx) === spiralRadius || Math.abs(dz) === spiralRadius) {
                            const testCx = chunkX + dx;
                            const testCz = chunkZ + dz;
                            const testKey = makeChunkKey(spawnData.world, testCx, testCz);
                            const testOwner = OWNED_CHUNKS.get(testKey);
                            if (!testOwner || testOwner.type !== 'home') {
                                // Found free chunk, calculate new spawn
                                const newX = testCx * CHUNK_SIZE + CHUNK_SIZE / 2;
                                const newZ = testCz * CHUNK_SIZE + CHUNK_SIZE / 2;
                                const newY = chunkManager.getSurfaceY(newX, newZ) + 2;
                                spawn = { x: newX, y: newY, z: newZ };
                                updateChunkOwnership(testKey, spawnData.username, Date.now(), 'home');
                                foundFree = true;
                                console.log(`[Ownership] Reassigned ${spawnData.username} home spawn to chunk ${testKey}`);
                            }
                        }
                    }
                }
                spiralRadius++;
            }
            if (!foundFree) {
                addMessage(`Warning: Could not find free home spawn for ${spawnData.username}`, 5000);
            }
        } else {
            // No collision, assign ownership
            updateChunkOwnership(chunkKey, spawnData.username, Date.now(), 'home');
        }

        // Update the spawnChunks entry with the new key format (username@worldname)
        spawnChunks.set(spawnKey, {
            cx: Math.floor(spawn.x / CHUNK_SIZE),
            cz: Math.floor(spawn.z / CHUNK_SIZE),
            username: spawnData.username,
            world: spawnData.world,
            spawn: spawn
        });
    }
}
async function startGame() {
    // Guard to prevent double game initialization
    if (gameStarted) {
        console.log("[LOGIN] Game already started, skipping duplicate initialization");
        return;
    }
    gameStarted = true;

    var e = document.getElementById("startBtn");
    e && e.blur(), console.log("[LOGIN] Start game triggered"), isPromptOpen = !1;
    var t = document.getElementById("worldNameInput").value,
        o = document.getElementById("userInput").value;

    // Validate inputs - use helper function to avoid repetitive gameStarted reset
    function validateAndReset(condition, message) {
        if (condition) {
            gameStarted = false;
            addMessage(message, 3e3);
            return true;
        }
        return false;
    }
    if (validateAndReset(t.length > 8, "World name too long (max 8 chars)")) return;
    if (validateAndReset(o.length > 20, "Username too long (max 20 chars)")) return;
    if (validateAndReset(!t || !o, "Please enter a world and username")) return;

    worldName = t.slice(0, 8), userName = o.slice(0, 20);
    const a = makeSeededRandom((worldSeed = worldName) + "_colors");
    for (const e in BLOCKS)
        if (Object.hasOwnProperty.call(BLOCKS, e)) {
            const t = BLOCKS[e],
                o = new THREE.Color(t.color),
                n = {};
            o.getHSL(n);
            const r = n.h + .05 * (a() - .5),
                s = Math.max(.4, Math.min(.9, n.s + .2 * (a() - .5))),
                i = Math.max(.1, Math.min(.5, n.l + .2 * (a() - .5)));
            o.setHSL(r, s, i), t.color = "#" + o.getHexString()
        } var n, r = userName + "@" + worldName;
    try {
        n = await GetProfileByURN(userName)
    } catch (e) {
        console.error("Failed to get profile by URN", e), n = null
    }
    userAddress = n && n.Creators ? n.Creators[0] : "anonymous";
    if (!knownUsers.has(userName)) knownUsers.set(userName, userAddress);

    if (knownWorlds.has(worldName)) {
        let wData = knownWorlds.get(worldName);
        // Defensive coding: convert deprecated Set to Map if necessary
        if (wData.users instanceof Set) {
            const newMap = new Map();
            wData.users.forEach(u => newMap.set(u, { timestamp: Date.now(), address: null }));
            wData.users = newMap;
        }
        wData.users.set(userName, { timestamp: Date.now(), address: userAddress });
    } else {
        knownWorlds.set(worldName, {
            discoverer: userName,
            users: new Map([[userName, { timestamp: Date.now(), address: userAddress }]]),
            toAddress: userAddress
        });
    }
    keywordCache.set(userAddress, r);
    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("hud").style.display = "block";
    document.getElementById("hotbar").style.display = "flex";
    document.getElementById("rightPanel").style.display = "flex";
    document.getElementById("worldLabel").textContent = worldName;
    document.getElementById("seedLabel").textContent = "User " + userName;
    updateHudButtons();
    console.log("[LOGIN] Initializing Three.js");
    try {
        await initAudio()
    } catch (e) {
        console.error("Failed to initialize audio:", e), addMessage("Could not initialize audio, continuing without it.", 3e3)
    }
    console.log("[LOGIN] Initializing Three.js after audio"), initThree(), initMusicPlayer(), initVideoPlayer(), INVENTORY[0] = {
        id: 120,
        count: 8
    }, INVENTORY[1] = {
        id: 121,
        count: 1
    }, selectedHotIndex = 0, selectedBlockId = 120, initHotbar(), updateHotbarUI(), console.log("[LOGIN] Creating ChunkManager"), chunkManager = new ChunkManager(worldSeed), populateSpawnChunks(), console.log("[LOGIN] Calculating spawn point");
    var s = calculateSpawnPoint(r);

    // Check for initial teleport location to avoid double-hop
    if (initialTeleportLocation) {
        console.log("[LOGIN] Using initial teleport location:", initialTeleportLocation);
        s = { x: initialTeleportLocation.x, y: initialTeleportLocation.y, z: initialTeleportLocation.z };
    }

    player.x = s.x, player.z = s.z;

    if (initialTeleportLocation && initialTeleportLocation.y !== undefined) {
         player.y = initialTeleportLocation.y;
    } else {
         player.y = chunkManager.getSurfaceY(s.x, s.z) + 1;
    }

    spawnPoint = {
        x: player.x,
        y: player.y,
        z: player.z
    }, player.vy = 0, player.onGround = !0;

    initialTeleportLocation = null;

    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var i = Math.floor(s.x / CHUNK_SIZE),
        l = Math.floor(s.z / CHUNK_SIZE);

    // Assign home spawn ownership for the local player
    const homeChunkKey = makeChunkKey(worldName, i, l);
    updateChunkOwnership(homeChunkKey, userName, Date.now(), 'home');
    console.log(`[Ownership] Home spawn chunk ${homeChunkKey} assigned to ${userName}`);

    // Update local spawnChunks map with key format: username@worldname
    const spawnKey = userName + "@" + worldName;
    spawnChunks.set(spawnKey, {
        cx: i,
        cz: l,
        username: userName,
        world: worldName,
        spawn: s
    });

    if (console.log("[LOGIN] Preloading initial chunks"), chunkManager.preloadChunks(i, l, INITIAL_LOAD_RADIUS), setupMobile(), initMinimap(), updateHotbarUI(), cameraMode = "first", controls.enabled = !1, avatarGroup.visible = !1, camera.position.set(player.x, player.y + 1.62, player.z), camera.rotation.set(0, 0, 0, "YXZ"), !isMobile()) {
        try {
            renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
        } catch (e) {
            addMessage("Pointer lock failed. Serve over HTTPS or ensure allow-pointer-lock is set in iframe.", 3e3)
        }
    } else {
        // Mobile start
        if (cameraMode === "first") {
            document.getElementById("crosshair").style.display = "block";
        }
    }
    player.yaw = 0, player.pitch = 0, lastFrame = performance.now(), lastRegenTime = lastFrame;
    registerKeyEvents();
    console.log("[LOGIN] Starting game loop"), requestAnimationFrame(gameLoop), addMessage("Welcome — world wraps at edges. Toggle camera with T. Good luck!", 5e3);
    var d = document.getElementById("health");
    d && (d.innerText = player.health);
    var c = document.getElementById("score");
    c && (c.innerText = player.score), await initServers(), worker.postMessage({
        type: "sync_processed",
        ids: Array.from(processedMessages)
    }), startWorker(), setInterval(scanExpiredOwnership, 600000), addMessage("Joined world " + worldName + " as " + userName, 3e3);
    handleResizeAndOrientation();
}

function scanExpiredOwnership() {
    if (!isHost) return; // Only host scans for expired ownership

    const now = Date.now();
    const expired = [];

    for (const [chunkKey, ownership] of OWNED_CHUNKS.entries()) {
        // Only scan IPFS ownership (home spawns never expire)
        if (ownership.type === 'ipfs' && ownership.expiryDate && now > ownership.expiryDate) {
            expired.push(chunkKey);
        }

        // Update pending status if maturity period has passed
        if (ownership.pending && ownership.claimDate && now - ownership.claimDate >= IPFS_MATURITY_PERIOD) {
            ownership.pending = false;
            console.log(`[Ownership] Chunk ${chunkKey} claim matured for ${ownership.username}`);
        }
    }

    // Remove expired ownerships
    for (const chunkKey of expired) {
        const ownership = OWNED_CHUNKS.get(chunkKey);
        OWNED_CHUNKS.delete(chunkKey);
        console.log(`[Ownership] Expired IPFS ownership removed for chunk ${chunkKey} (was owned by ${ownership.username})`);
    }

    if (expired.length > 0) {
        console.log(`[Ownership] Scanned ownership: ${expired.length} expired claims removed, ${OWNED_CHUNKS.size} active claims remaining`);
    }
}

function setupEmojiPicker() {
    const e = document.getElementById("emojiBtn"),
        t = document.getElementById("emojiBtnUser"),
        o = document.getElementById("emojiModal"),
        a = document.getElementById("emojiGrid"),
        n = document.getElementById("worldNameInput"),
        r = document.getElementById("userInput");
    let s = null;
    const i = {
        Faces: ["😀", "😂", "😍", "🤔", "😎", "😭", "😡", "😱", "😇", "😈", "👻", "👽", "🤖"],
        Objects: ["⭐", "💎", "🌳", "🏰", "⚔️", "🍕", "🎉", "🔥", "💧", "🌱", "🍄", "🍎", "🚬", "💣", "🔫", "🔑", "❤️"],
        Animals: ["🐶", "🐱", "🐭", "🦊", "🐻", "🐼", "🐨", "🐵", "🦁", "🐸", "🐢", "🐍", "🦄", "🦅", "🦋"],
        Travel: ["🌎", "🚀", "✈️", "🚗", "⛵️", "⛰️", "🏝️", "🏜️", "🏞️", "🏛️", "🏠", "⛺️"]
    };
    a.innerHTML = "";
    for (const e in i) {
        const t = document.createElement("div");
        t.innerText = e, t.style.gridColumn = "1 / -1", t.style.fontWeight = "bold", t.style.marginTop = "10px", a.appendChild(t), i[e].forEach((e => {
            const t = document.createElement("div");
            t.innerText = e, t.style.cursor = "pointer", t.style.padding = "8px", t.style.borderRadius = "4px", t.style.textAlign = "center", t.style.fontSize = "24px", t.onmouseover = () => t.style.background = "#1a2632", t.onmouseout = () => t.style.background = "transparent", t.addEventListener("click", (() => {
                s && (s.value += e), o.style.display = "none"
            })), a.appendChild(t)
        }))
    }

    function l(e) {
        s = e, o.style.display = "flex"
    }
    e.addEventListener("click", (e => {
        e.preventDefault(), l(n)
    })), t.addEventListener("click", (e => {
        e.preventDefault(), l(r)
    })), o.addEventListener("click", (e => {
        e.target === o && (o.style.display = "none")
    }))
}

function flashDamageEffect() {
    const e = document.getElementById("damageFlash");
    e.style.background = "rgba(255, 0, 0, 0.5)", setTimeout((() => {
        e.style.background = "rgba(255, 0, 0, 0)"
    }), 100)
}

function cleanupPeer(e) {
    const t = peers.get(e);
    if (t && (t.pc && t.pc.close(), peers.delete(e)), playerAvatars.has(e)) {
        const t = playerAvatars.get(e);
        scene.remove(t), disposeObject(t), playerAvatars.delete(e)
    }
    if (userAudioStreams.has(e)) {
        const t = userAudioStreams.get(e);
        t.audio.srcObject = null, t.audio.remove(), userAudioStreams.delete(e)
    }
    userVideoStreams.has(e) && userVideoStreams.delete(e), delete userPositions[e], addMessage(`${e} has disconnected.`), updateHudButtons(), console.log(`[WebRTC] Cleaned up peer: ${e}`)
}
async function toggleCamera() {
    const e = document.getElementById("cameraBtn"),
        t = document.getElementById("proximityVideo"),
        o = document.getElementById("proximityVideoElement"),
        a = document.getElementById("proximityVideoLabel");
    if (localVideoStream) {
        localVideoStream.getTracks().forEach((e => e.stop())), localVideoStream = null;
        for (const [e, t] of peers.entries()) {
            if (t.pc) {
                t.pc.getSenders().filter((e => e.track && "video" === e.track.kind)).forEach((e => t.pc.removeTrack(e)));
                const e = await t.pc.createOffer();
                await t.pc.setLocalDescription(e), t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                    type: "renegotiation_offer",
                    offer: e
                }))
            }
            t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                type: "video_stopped",
                username: userName
            }))
        }
        e.style.opacity = "0.5", t.style.display = "none", o.srcObject && (o.srcObject = null), addMessage("Camera disabled", 2e3)
    } else try {
        localVideoStream = await navigator.mediaDevices.getUserMedia({
            video: !0
        });
        for (const [e, t] of peers.entries()) {
            if (t.pc) {
                localVideoStream.getTracks().forEach((e => t.pc.addTrack(e, localVideoStream)));
                const e = await t.pc.createOffer();
                await t.pc.setLocalDescription(e), t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                    type: "renegotiation_offer",
                    offer: e
                }))
            }
            t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                type: "video_started",
                username: userName
            }))
        }
        e.style.opacity = "1", o.srcObject = localVideoStream, a.innerText = userName, t.style.display = "block", addMessage("Camera enabled", 2e3), lastProximityVideoChangeTime = Date.now(), proximityVideoUsers = [userName, ...proximityVideoUsers.filter((e => e !== userName))], currentProximityVideoIndex = 0
    } catch (e) {
        addMessage("Could not access camera", 3e3), console.error("Error accessing camera:", e)
    }
}
// initAudio is now a no-op - microphone permission is requested lazily
// when the first peer connection is established (in web-rtc.js)
async function initAudio() {
    // This function is intentionally empty
    // Microphone permission is requested on first peer connection via ensureAudioInitialized()
    console.log("[Audio] initAudio called - microphone will be requested on first peer connection");
}

function animateAttack() {
    isAttacking || (isAttacking = !0, attackStartTime = performance.now())
}

function updateProximityVideo() {
    const e = Date.now(),
        t = document.getElementById("proximityVideo"),
        o = document.getElementById("proximityVideoElement"),
        a = document.getElementById("proximityVideoLabel"),
        n = new THREE.Vector3(player.x, player.y, player.z),
        r = [];
    for (const [e, t] of userVideoStreams.entries())
        if (e !== userName && userPositions[e]) {
            const t = userPositions[e],
                o = new THREE.Vector3(t.targetX, t.targetY, t.targetZ);
            n.distanceTo(o) <= 32 && r.push(e)
        } let s = [...r];
    if (localVideoStream && s.unshift(userName), proximityVideoUsers = s, 0 === proximityVideoUsers.length) return t.style.display = "none", o.srcObject && (o.srcObject = null), void (currentProximityVideoIndex = 0);
    t.style.display = "block", currentProximityVideoIndex >= proximityVideoUsers.length && (currentProximityVideoIndex = 0);
    e - lastProximityVideoChangeTime > 3e4 && (lastProximityVideoChangeTime = e, currentProximityVideoIndex = (currentProximityVideoIndex + 1) % proximityVideoUsers.length);
    const i = proximityVideoUsers[currentProximityVideoIndex],
        l = i === userName ? localVideoStream : userVideoStreams.get(i)?.stream;
    o.srcObject !== l && (a.innerText = i, o.srcObject = l)
}

function switchWorld(newWorldName, targetSpawn) {
    worldArchetype = null;
    const e = newWorldName || prompt("Enter the name of the world to switch to:");
    if (!e || "" === e.trim()) return void addMessage("World name cannot be empty.", 3e3);

    // Store the old world name before updating
    const oldWorldName = worldName;

    // --- SAVE CURRENT WORLD'S STONE DATA BEFORE SWITCHING ---
    // This preserves stone metadata (URLs, text, settings) so they can be restored when returning to this world.
    // The mesh objects are disposed but the configuration data is retained in WORLD_STONE_DATA.
    saveCurrentWorldStoneData(oldWorldName);

    // Clear mobs and their meshes
    mobs.forEach(mob => {
        if (mob.mesh) scene.remove(mob.mesh);
        if (mob.particles) scene.remove(mob.particles);
    });
    mobs = [];

    // Clear volcanoes and related particles
    volcanoes = [];
    activeEruptions = [];
    eruptedBlocks.forEach(block => scene.remove(block.mesh));
    eruptedBlocks = [];
    pebbles.forEach(pebble => scene.remove(pebble.mesh));
    pebbles = [];
    smokeParticles.forEach(particle => scene.remove(particle));
    smokeParticles = [];

    // Clear magician stones (3D models) and their loading registry
    // Note: Metadata is already saved above; here we only dispose the 3D meshes and media elements.
    for (const key in magicianStones) {
        if (magicianStones[key]) {
            // Use the cleanup helper to properly dispose all resources including GIF data
            cleanupMagicianStone(magicianStones[key], key);
        }
    }
    magicianStones = {};
    magicianStonesLoading.clear();

    // Clear calligraphy stones and their loading registry
    // Note: Metadata is already saved above; here we only dispose the 3D meshes.
    for (const key in calligraphyStones) {
        if (calligraphyStones[key] && calligraphyStones[key].mesh) {
            scene.remove(calligraphyStones[key].mesh);
            disposeObject(calligraphyStones[key].mesh);
        }
    }
    calligraphyStones = {};
    calligraphyStonesLoading.clear();

    // Clear other world-specific data
    hiveLocations = [];
    flowerLocations = [];
    torchRegistry.clear();
    torchLights.clear();
    torchParticles.forEach(p => scene.remove(p));
    torchParticles.clear();

    worldName = e.slice(0, 8), worldSeed = worldName, chunkManager.chunks.clear(), meshGroup.children.forEach(disposeObject), meshGroup.children = [], mobs.forEach((e => scene.remove(e.mesh))), mobs = [], skyProps && (skyProps.suns.forEach((e => scene.remove(e.mesh))), skyProps.moons.forEach((e => scene.remove(e.mesh)))), stars && scene.remove(stars), clouds && scene.remove(clouds), document.getElementById("worldLabel").textContent = worldName;

    let t;
    if (targetSpawn) {
        t = targetSpawn;
    } else {
        t = calculateSpawnPoint(userName + "@" + worldName);
    }

    player.x = t.x, player.y = t.y, player.z = t.z, spawnPoint = {
        x: player.x,
        y: player.y,
        z: player.z
    }, emberTexture = createEmberTexture(worldSeed), chunkManager = new ChunkManager(worldSeed), initSky();
    const o = Math.floor(t.x / CHUNK_SIZE),
        a = Math.floor(t.z / CHUNK_SIZE);

    // Assign home spawn ownership for the new world
    const homeChunkKey = makeChunkKey(worldName, o, a);
    updateChunkOwnership(homeChunkKey, userName, Date.now(), 'home');
    console.log(`[Ownership] Home spawn chunk ${homeChunkKey} assigned to ${userName} after world switch`);

    // Update spawnChunks map with new world data using key format: username@worldname
    const spawnKey = userName + "@" + worldName;
    spawnChunks.set(spawnKey, {
        cx: o,
        cz: a,
        username: userName,
        world: worldName,
        spawn: t
    });

    chunkManager.preloadChunks(o, a, LOAD_RADIUS);

    // --- RESTORE STONE DATA FOR THE NEW WORLD ---
    // This reloads stone media/behaviors when returning to a previously visited world.
    // If this is a new world with no saved data, nothing is restored.
    restoreWorldStoneData(worldName);

    addMessage(`Switched to world: ${worldName}`, 4e3);

    for (const [peerUsername, peer] of peers.entries()) {
        if (peer.dc && peer.dc.readyState === 'open') {
            peer.dc.send(JSON.stringify({
                type: 'world_switch',
                world: worldName,
                username: userName
            }));
        }
    }

    // Refresh ownership for all known users in this world
    populateSpawnChunks();

    // Stop polling for the old world before initializing new one
    stopAllPolling();

    // Re-initialize signaling for the new world - cache messages and start polling for offers/answers
    initServers();
}

/**
 * Saves the current world's stone metadata to WORLD_STONE_DATA.
 * This preserves URLs, text, settings, and other configuration data so that
 * stones can be fully reconstructed when the player returns to this world.
 * Called automatically before switching to a different world.
 * @param {string} currentWorldName - The name of the world being left
 */
function saveCurrentWorldStoneData(currentWorldName) {
    if (!currentWorldName) return;
    
    // Serialize magician stones (exclude mesh and media elements, keep config data)
    const savedMagicianStones = {};
    for (const key in magicianStones) {
        if (Object.hasOwnProperty.call(magicianStones, key)) {
            const stone = magicianStones[key];
            savedMagicianStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                url: stone.url,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                loop: stone.loop,
                autoplay: stone.autoplay,
                autoplayAnimation: stone.autoplayAnimation,
                distance: stone.distance,
                direction: stone.direction,
                source: stone.source
            };
        }
    }

    // Serialize calligraphy stones (exclude mesh, keep config data)
    const savedCalligraphyStones = {};
    for (const key in calligraphyStones) {
        if (Object.hasOwnProperty.call(calligraphyStones, key)) {
            const stone = calligraphyStones[key];
            savedCalligraphyStones[key] = {
                x: stone.x,
                y: stone.y,
                z: stone.z,
                width: stone.width,
                height: stone.height,
                offsetX: stone.offsetX,
                offsetY: stone.offsetY,
                offsetZ: stone.offsetZ,
                bgColor: stone.bgColor,
                transparent: stone.transparent,
                fontFamily: stone.fontFamily,
                fontSize: stone.fontSize,
                fontWeight: stone.fontWeight,
                fontColor: stone.fontColor,
                text: stone.text,
                link: stone.link,
                direction: stone.direction,
                source: stone.source
            };
        }
    }

    // Store in per-world map
    WORLD_STONE_DATA.set(currentWorldName, {
        magicianStones: savedMagicianStones,
        calligraphyStones: savedCalligraphyStones
    });

    console.log(`[WorldSwitch] Saved ${Object.keys(savedMagicianStones).length} magician stone(s) and ${Object.keys(savedCalligraphyStones).length} calligraphy stone(s) for world: ${currentWorldName}`);
}

/**
 * Restores stone metadata from WORLD_STONE_DATA for the specified world.
 * This recreates stone meshes and media when the player returns to a previously visited world.
 * Called automatically after switching to a world.
 * @param {string} targetWorldName - The name of the world being entered
 */
function restoreWorldStoneData(targetWorldName) {
    if (!targetWorldName) return;

    const savedData = WORLD_STONE_DATA.get(targetWorldName);
    if (!savedData) {
        console.log(`[WorldSwitch] No saved stone data for world: ${targetWorldName}`);
        return;
    }

    // Restore magician stones
    if (savedData.magicianStones) {
        const stoneCount = Object.keys(savedData.magicianStones).length;
        console.log(`[WorldSwitch] Restoring ${stoneCount} magician stone(s) for world: ${targetWorldName}`);
        for (const key in savedData.magicianStones) {
            if (Object.hasOwnProperty.call(savedData.magicianStones, key)) {
                const stoneData = savedData.magicianStones[key];
                // Recreate the stone screen with its saved configuration
                createMagicianStoneScreen(stoneData);
            }
        }
    }

    // Restore calligraphy stones
    if (savedData.calligraphyStones) {
        const stoneCount = Object.keys(savedData.calligraphyStones).length;
        console.log(`[WorldSwitch] Restoring ${stoneCount} calligraphy stone(s) for world: ${targetWorldName}`);
        for (const key in savedData.calligraphyStones) {
            if (Object.hasOwnProperty.call(savedData.calligraphyStones, key)) {
                const stoneData = savedData.calligraphyStones[key];
                // Recreate the stone screen with its saved configuration
                createCalligraphyStoneScreen(stoneData);
            }
        }
    }
}

function updateAvatarAnimation(e, t) {
    if (!avatarGroup) return;
    if (isAttacking) {
        const t = e - attackStartTime;
        if (t < 500) {
            const e = 1.5 * Math.sin(t / 500 * Math.PI);
            avatarGroup.children[4].rotation.x = e, avatarGroup.children[5].rotation.x = e
        } else isAttacking = !1, avatarGroup.children[4].rotation.x = 0, avatarGroup.children[5].rotation.x = 0
    } else if (t) {
        const t = .5 * Math.sin(.005 * e);
        avatarGroup.children[0].rotation.x = t, avatarGroup.children[1].rotation.x = -t, avatarGroup.children[4].rotation.x = -t, avatarGroup.children[5].rotation.x = t
    } else avatarGroup.children[0].rotation.x = 0, avatarGroup.children[1].rotation.x = 0, avatarGroup.children[4].rotation.x = 0, avatarGroup.children[5].rotation.x = 0
}

function initMinimap() {
    var e = document.getElementById("minimap");
    minimapCtx = e.getContext("2d"), e.width = 120, e.height = 120, updateMinimap();
    var t = document.createElement("input");
    t.type = "file", t.accept = ".json", t.style.display = "none", document.body.appendChild(t), e.addEventListener("dblclick", (function () {
        console.log("[MINIMAP] Double-click detected, triggering file upload"), t.click()
    })), e.addEventListener("dragover", (function (t) {
        t.preventDefault(), t.dataTransfer.dropEffect = "copy", e.style.border = "2px dashed var(--accent)"
    })), e.addEventListener("dragleave", (function () {
        e.style.border = "1px solid rgba(255,255,255,0.1)"
    })), e.addEventListener("drop", (async function (t) {
        t.preventDefault(), e.style.border = "1px solid rgba(255,255,255,0.1)";
        const o = t.dataTransfer.files;
        for (const e of o) e && "application/json" === e.type ? (console.log("[MINIMAP] File dropped:", e.name), await handleMinimapFile(e)) : (addMessage("Skipped non-JSON file: " + (e ? e.name : "unknown"), 3e3), console.log("[MINIMAP] Invalid file dropped:", e ? e.type : "no file"))
    })), t.addEventListener("change", (async function () {
        if (t.files.length > 0) {
            for (const e of t.files) console.log("[MINIMAP] File selected via double-click:", e.name), await handleMinimapFile(e);
            t.value = ""
        }
    })), console.log("[MINIMAP] Events attached: double-click and drag-and-drop enabled")
}

function gameLoop(e) {
    if (isDying) {
        const t = 1500,
            o = 1e3,
            a = t + o,
            n = e - deathAnimationStart,
            r = Math.min(1, n / a);
        if (n < t) {
            const e = n / t;
            avatarGroup.rotation.x = Math.PI / 2 * e
        } else avatarGroup.rotation.x = Math.PI / 2;
        if (n > t) {
            const e = (n - t) / o;
            avatarGroup.position.y -= .05 * e
        }
        return r >= 1 && (isDying = !1, deathScreenShown = !0, document.getElementById("deathScreen").style.display = "flex"), renderer.render(scene, camera), void requestAnimationFrame(gameLoop)
    }
    var t = Math.min(.06, (e - lastFrame) / 1e3);
    if (lastFrame = e, player.health <= 0 && !isDying && handlePlayerDeath(), deathScreenShown) {
        mobs.forEach((function (e) {
            e.update(t)
        })), updateSky(t), updateMinimap();
        var o = document.getElementById("score");
        o && (o.innerText = player.score), renderer.render(scene, camera)
    } else {
        var a, n, r = isSprinting ? 4.3 * 3 : 4.3,
            s = 0,
            i = 0;
        isMobile() ? (joystick.up && (i += 1), joystick.down && (i -= 1), joystick.left && (s -= 1), joystick.right && (s += 1)) : (keys.w && (i += 1), keys.s && (i -= 1), keys.a && (s -= 1), keys.d && (s += 1), i <= 0 && isSprinting && (isSprinting = !1, addMessage("Sprinting disabled", 1500)), "first" === cameraMode && (keys.arrowup && (player.pitch += .02), keys.arrowdown && (player.pitch -= .02), keys.arrowleft && (player.yaw += .02), keys.arrowright && (player.yaw -= .02), player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch)), camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"))), "first" === cameraMode ? a = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0, "YXZ")) : (a = new THREE.Vector3, camera.getWorldDirection(a)), a.y = 0, a.normalize(), n = (new THREE.Vector3).crossVectors(a, new THREE.Vector3(0, 1, 0));
        var l = new THREE.Vector3;
        l.addScaledVector(a, i), l.addScaledVector(n, s);
        const o = l.length() > .001;
        o && (l.normalize(), "third" === cameraMode && (player.yaw = Math.atan2(l.x, l.z)));
        var d = l.x * r * t,
            c = l.z * r * t;
        d += player.vx * t, c += player.vz * t, player.vx *= 1 - 2 * t, player.vz *= 1 - 2 * t;
        let M = player.x + d;
        checkCollision(M, player.y, player.z) ? player.vx = 0 : player.x = M;
        let S = player.z + c;
        checkCollision(player.x, player.y, S) ? player.vz = 0 : player.z = S, player.x = modWrap(player.x, MAP_SIZE), player.z = modWrap(player.z, MAP_SIZE), player.vy -= gravity * t;
        var u = player.vy * t,
            p = player.y + u;
        if (checkCollision(player.x, p, player.z)) {
            if (u < 0) {
                if (checkBlockCollision(player.x, p, player.z)) {
                    player.y = Math.ceil(p - .001);
                } else {
                    const meshY = getMeshSurfaceY(player.x, player.y, player.z);
                    if (meshY !== null) {
                        player.y = meshY;
                    }
                }
                player.vy = 0;
                player.onGround = !0;
            } else if (u > 0) {
                if (checkBlockCollision(player.x, p, player.z)) {
                    player.y = Math.floor(p + player.height) - player.height;
                }
                player.vy = 0;
            }
        } else {
            player.y = p;
            player.onGround = !1;
        }
        checkCollision(player.x, player.y, player.z) && (pushPlayerOut() || (player.y = chunkManager.getSurfaceY(player.x, player.z) + 1, player.vy = 0, player.onGround = !0, addMessage("Stuck in block, respawned")));
        for (const e of mobs)
            if ("grub" === e.type && Date.now() - lastDamageTime > 1e3) {
                const t = (new THREE.Box3).setFromCenterAndSize(new THREE.Vector3(player.x + player.width / 2, player.y + player.height / 2, player.z + player.depth / 2), new THREE.Vector3(player.width, player.height, player.depth)),
                    o = (new THREE.Box3).setFromObject(e.mesh);
                t.intersectsBox(o) && (player.health = Math.max(0, player.health - 2), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit by a Grub! HP: " + player.health, 1e3), flashDamageEffect(), player.health <= 0 && handlePlayerDeath())
            } if (player.y < -10 && (player.x = modWrap(player.x, MAP_SIZE), player.z = modWrap(player.z, MAP_SIZE), player.y = chunkManager.getSurfaceY(player.x, player.z) + 1, player.vy = 0, player.onGround = !0, addMessage("Fell off world, respawned")), isHost || 0 === peers.size) {
                16 === getBlockAt(player.x, player.y + .5, player.z) && e - lastDamageTime > 500 && (player.health = Math.max(0, player.health - 1), lastDamageTime = e, document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Burning in lava! HP: " + player.health, 1e3), flashDamageEffect(), player.health <= 0 && handlePlayerDeath())
            }
        if (isHost)
            for (const [t, o] of peers.entries())
                if (userPositions[t]) {
                    const a = userPositions[t];
                    16 === getBlockAt(a.targetX, a.targetY + .5, a.targetZ) && (!o.lastLavaDamageTime || e - o.lastLavaDamageTime > 500) && (o.lastLavaDamageTime = e, o.dc && "open" === o.dc.readyState && o.dc.send(JSON.stringify({
                        type: "player_damage",
                        damage: 1,
                        attacker: "lava"
                    })))
                }
        for (const mob of mobs) {
            if (mob.type === "grub" && Date.now() - mob.lastDamageTime > 30000 && Date.now() - mob.lastRegenTime > 10000 && mob.hp < 40) {
                mob.hp = Math.min(40, mob.hp + 1);
                mob.lastRegenTime = Date.now();
            }
        }
        if (Date.now() - lastDamageTime > 3e4 && Date.now() - lastRegenTime > 1e4 && player.health < 20) {
                    player.health = Math.min(20, player.health + 1), lastRegenTime = Date.now();
                    var m = document.getElementById("health");
                    m && (m.innerText = player.health), updateHealthBar(), addMessage("Health regenerated: " + player.health, 1e3)
                }
        var y = Math.hypot(player.x - spawnPoint.x, player.z - spawnPoint.z);
        document.getElementById("homeIcon").style.display = y > 10 ? "inline" : "none", avatarGroup.position.set(player.x + player.width / 2, player.y, player.z + player.depth / 2), "third" === cameraMode ? avatarGroup.rotation.y = player.yaw : camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"), updateAvatarAnimation(e, o), chunkManager.update(player.x, player.z, l), lightManager.update(new THREE.Vector3(player.x, player.y, player.z)), mobs.forEach((function (e) {
            e.update(t)
        })), manageMobs(), manageVolcanoes(), updateSky(t), stars && stars.position.copy(camera.position), clouds && clouds.position.copy(camera.position);

        // Update chest animations
        for (const key in chests) {
            const chest = chests[key];
            if (chest && chest.lid) {
                const targetRotation = chest.isOpen ? -Math.PI / 2 : 0;
                chest.lid.rotation.x += (targetRotation - chest.lid.rotation.x) * 5 * t;
            }
        }
        for (const [e, o] of torchParticles.entries()) {
            const e = o.geometry.attributes.position.array,
                a = o.geometry.velocities;
            for (let n = 0; n < a.length; n++) e[3 * n] += a[n].x, e[3 * n + 1] += a[n].y, e[3 * n + 2] += a[n].z, a[n].life -= t, a[n].life <= 0 && (e[3 * n] = o.position.x, e[3 * n + 1] = o.position.y, e[3 * n + 2] = o.position.z, a[n].life = 1 * Math.random());
            o.geometry.attributes.position.needsUpdate = !0
        }
        for (const e of smokeParticles) {
            const o = e.geometry.attributes.alpha,
                a = e.geometry.attributes.position,
                n = e.geometry.attributes.color;
            if (!o || !a) {
                console.warn("[Volcano] Smoke particle system is missing attributes, skipping animation.");
                continue
            }
            const r = a.array,
                s = o.array,
                i = e.geometry.velocities,
                l = !!n;
            for (let o = 0; o < i.length; o++)
                if (i[o].life -= t, i[o].life > 0) {
                    r[3 * o] += i[o].x * t, r[3 * o + 1] += i[o].y * t, r[3 * o + 2] += i[o].z * t;
                    const e = l ? 10 : 7,
                        a = i[o].life / e;
                    s[o] = Math.min(1, a)
                } else if (l) s[o] = 0;
                else {
                    const t = volcanoes.find((t => t.chunkKey === e.userData.chunkKey));
                    t ? (r[3 * o] = t.x + 10 * (Math.random() - .5), r[3 * o + 1] = t.y + 5 * (Math.random() - .5), r[3 * o + 2] = t.z + 10 * (Math.random() - .5), i[o].life = 3 + 4 * Math.random(), s[o] = 1) : s[o] = 0
                }
            a.needsUpdate = !0, o.needsUpdate = !0, n && (n.needsUpdate = !0)
        }
        for (let e = smokeParticles.length - 1; e >= 0; e--) {
            const t = smokeParticles[e];
            t.createdAt && Date.now() - t.createdAt > 2e4 && (scene.remove(t), disposeObject(t), smokeParticles.splice(e, 1))
        }
        updateMinimap();
        var h = document.getElementById("posLabel");
        if (h && (h.innerText = Math.floor(player.x) + ", " + Math.floor(player.y) + ", " + Math.floor(player.z)), "third" === cameraMode) {
             controls.target.set(player.x + player.width / 2, player.y + .6, player.z + player.depth / 2);
             // Do NOT call controls.update() here every frame if we want manual control logic to persist without jitter?
             // Actually, controls.update() is required for damping and auto-rotation.
             // But if we are manually setting position, we might fight it.
             // Standard OrbitControls usage: set target, call update.
             controls.update();
        } else {
            var f = new THREE.Vector3(player.x + player.width / 2, player.y + 1.62, player.z + player.depth / 2);
            camera.position.copy(f)
        }
        const I = Math.hypot(player.x - lastSentPosition.x, player.y - lastSentPosition.y, player.z - lastSentPosition.z) > .1,
            k = Math.abs(player.yaw - lastSentPosition.yaw) > .01 || Math.abs(player.pitch - lastSentPosition.pitch) > .01;
        if (e - lastUpdateTime > 50 && (I || k)) {
            isSprinting && !previousIsSprinting ? (sprintStartPosition.set(player.x, player.y, player.z), currentLoadRadius = LOAD_RADIUS) : !isSprinting && previousIsSprinting && new THREE.Vector3(player.x, player.y, player.z).distanceTo(sprintStartPosition) > 100 && (currentLoadRadius = INITIAL_LOAD_RADIUS), previousIsSprinting = isSprinting, lastUpdateTime = e, lastMoveTime = e, lastSentPosition = {
                x: player.x,
                y: player.y,
                z: player.z,
                yaw: player.yaw,
                pitch: player.pitch
            };
            const t = {
                type: "player_move",
                username: userName,
                world: worldName,
                x: player.x,
                y: player.y,
                z: player.z,
                yaw: player.yaw,
                pitch: player.pitch,
                isMoving: o,
                isAttacking: isAttacking,
                timestamp: Date.now()
            };
            for (const [e, o] of peers.entries()) e !== userName && o.dc && "open" === o.dc.readyState && o.dc.send(JSON.stringify(t))
        }
        for (var g of playerAvatars) {
            var E = g[0],
                v = g[1];
            if (E !== userName && userPositions[E]) {
                const e = userPositions[E];
                if (e.isDying);
                else if (void 0 !== e.prevX) {
                    const t = performance.now() - e.lastUpdate,
                        o = 100,
                        a = Math.min(1, t / o),
                        n = new THREE.Vector3(e.prevX + (e.targetX - e.prevX) * a, e.prevY + (e.targetY - e.prevY) * a, e.prevZ + (e.targetZ - e.prevZ) * a);
                    v.position.copy(n);
                    const r = (new THREE.Quaternion).setFromEuler(new THREE.Euler(0, e.prevYaw, 0, "YXZ")),
                        s = (new THREE.Quaternion).setFromEuler(new THREE.Euler(0, e.targetYaw, 0, "YXZ"));
                    if (v.quaternion.slerpQuaternions(r, s, a), void 0 !== e.prevPitch) {
                        const t = e.prevPitch + (e.targetPitch - e.prevPitch) * a;
                        v.children[3].rotation.set(t, 0, 0)
                    } else v.children[3].rotation.set(e.targetPitch, 0, 0)
                } else void 0 !== e.targetX && (v.position.set(e.targetX, e.targetY - .9, e.targetZ), v.rotation.set(e.targetPitch, e.targetYaw, 0, "YXZ"));
                const t = performance.now();
                if (e.isAttacking && e.localAnimStartTime) {
                    const o = t - e.localAnimStartTime,
                        a = 500;
                    if (o < a) {
                        const e = 1.5 * Math.sin(o / a * Math.PI);
                        v.children[4].rotation.x = e, v.children[5].rotation.x = e
                    } else e.localAnimStartTime = null
                } else if (e.isMoving) {
                    const e = .5 * Math.sin(.005 * t);
                    v.children[0].rotation.x = e, v.children[1].rotation.x = -e, v.children[4].rotation.x = -e, v.children[5].rotation.x = e
                } else v.children[0].rotation.x = 0, v.children[1].rotation.x = 0, v.children[4].rotation.x = 0, v.children[5].rotation.x = 0;
                if (e.isDying) {
                    const o = 1500,
                        a = 1e3,
                        n = o + a,
                        r = t - e.deathAnimationStart,
                        s = Math.min(1, r / n);
                    if (r < o) {
                        const e = r / o;
                        v.rotation.x = Math.PI / 2 * e
                    } else v.rotation.x = Math.PI / 2;
                    if (r > o) {
                        const e = (r - o) / a;
                        v.position.y -= .05 * e
                    }
                    s >= 1 && (e.isDying = !1)
                } else v.visible = Math.hypot(player.x - v.position.x, player.z - v.position.z) < 32
            }
        }
        for (const [e, t] of userAudioStreams.entries())
            if (userPositions[e]) {
                const o = userPositions[e],
                    a = Math.hypot(player.x - o.targetX, player.y - o.targetY, player.z - o.targetZ);
                let n = 0;
                a < maxAudioDistance && (n = Math.max(0, 1 - a / maxAudioDistance), n = Math.pow(n, rolloffFactor)), t.audio.volume = n
            } for (const e of activeEruptions) {
                const t = document.getElementById(e.soundId);
                if (t) {
                    const o = Math.hypot(player.x - e.volcano.x, player.y - e.volcano.y, player.z - e.volcano.z),
                        a = 192;
                    t.volume = o < a ? Math.max(0, 1 - o / a) : 0
                }
            }
        updateProximityVideo(), lastPollPosition.distanceTo(player) > CHUNK_SIZE && (hasMovedSubstantially = !0), o && (lastMoveTime = e), hasMovedSubstantially && e - lastMoveTime > 1e4 && (triggerPoll(), lastPollPosition.copy(player), hasMovedSubstantially = !1);
        for (let o = eruptedBlocks.length - 1; o >= 0; o--) {
            const a = eruptedBlocks[o];
            if (isHost || 0 === peers.size)
                if ("boulder" === a.type) {
                    a.velocity.y -= gravity * t, a.mesh.position.add(a.velocity.clone().multiplyScalar(t));
                    const o = chunkManager.getSurfaceYForBoulders(a.mesh.position.x, a.mesh.position.z) + a.size / 2;
                    if (a.mesh.position.y <= o && (a.mesh.position.y = o, 2 !== a.mass || a.isRolling ? a.velocity.set(0, 0, 0) : (a.isRolling = !0, a.velocity.y = 0, a.velocity.x *= .8, a.velocity.z *= .8)), a.isRolling && (a.mesh.rotation.x += a.velocity.z * t * 2, a.mesh.rotation.z -= a.velocity.x * t * 2, a.velocity.multiplyScalar(1 - .5 * t), a.velocity.length() < .1 && (a.isRolling = !1)), 4 === a.mass) {
                        const t = (new THREE.Box3).setFromCenterAndSize(new THREE.Vector3(player.x + player.width / 2, player.y + player.height / 2, player.z + player.depth / 2), new THREE.Vector3(player.width, player.height, player.depth)),
                            o = (new THREE.Box3).setFromObject(a.mesh);
                        t.intersectsBox(o) && e - lastDamageTime > 1e3 && (player.health = Math.max(0, player.health - 10), lastDamageTime = e, document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit by a boulder! -10 HP", 2e3), flashDamageEffect(), player.health <= 0 && handlePlayerDeath())
                    }
                } else a.velocity.y -= gravity * t, a.mesh.position.add(a.velocity.clone().multiplyScalar(t));
            else if ("boulder" === a.type && a.lastUpdate > 0) {
                const t = e - a.lastUpdate,
                    o = Math.min(1, t / 100);
                a.mesh.position.lerp(a.targetPosition, o), a.mesh.quaternion.slerp(a.targetQuaternion, o)
            } else "boulder" !== a.type && (a.velocity.y -= gravity * t, a.mesh.position.add(a.velocity.clone().multiplyScalar(t)));
            (a.mesh.position.y < -10 || Date.now() - a.createdAt > 15e3) && (scene.remove(a.mesh), disposeObject(a.mesh), eruptedBlocks.splice(o, 1))
        }
        if ((isHost || 0 === peers.size) && e - (lastStateUpdateTime || 0) > 100) {
            const e = eruptedBlocks.filter((e => "boulder" === e.type)).map((e => ({
                id: e.id,
                position: e.mesh.position.toArray(),
                quaternion: e.mesh.quaternion.toArray()
            })));
            if (e.length > 0) {
                const t = {
                    type: "boulder_update",
                    boulders: e
                };
                for (const [e, o] of peers.entries()) o.dc && "open" === o.dc.readyState && o.dc.send(JSON.stringify(t))
            }
        }
        for (let e = pebbles.length - 1; e >= 0; e--) {
            const o = pebbles[e];
            o.mesh.position.add(o.velocity.clone().multiplyScalar(t));
            const a = chunkManager.getSurfaceY(o.mesh.position.x, o.mesh.position.z);
            o.mesh.position.y <= a && (o.isGlowing ? setTimeout((() => {
                scene.remove(o.mesh), disposeObject(o.mesh)
            }), 500) : (scene.remove(o.mesh), disposeObject(o.mesh)), pebbles.splice(e, 1))
        }
        for (let e = droppedItems.length - 1; e >= 0; e--) {
            const o = droppedItems[e],
                a = chunkManager.getSurfaceY(o.mesh.position.x, o.mesh.position.z);
            if (o.mesh.position.y > a + .25 ? o.mesh.position.y -= 4 * t : o.mesh.position.y = a + .25, Date.now() - o.createdAt > 3e5) {
                scene.remove(o.mesh), droppedItems.splice(e, 1);
                continue
            }
            if (o.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y + .9, player.z)) < 1.5) {
                if (o.dropper === userName && Date.now() - o.createdAt < 2e3) continue;
                addToInventory(o.blockId, o.count || 1, o.originSeed), scene.remove(o.mesh), droppedItems.splice(e, 1);
                const t = JSON.stringify({
                    type: "item_picked_up",
                    dropId: o.id,
                    world: worldName
                });
                for (const [e, o] of peers.entries()) o.dc && "open" === o.dc.readyState && o.dc.send(t)
            }
        }
        if (e - lastLaserBatchTime > 100 && laserFireQueue.length > 0) {
            const t = JSON.stringify({
                type: "laser_fired_batch",
                projectiles: laserFireQueue
            });
            for (const [e, s] of peers.entries()) e !== userName && s.dc && "open" === s.dc.readyState && s.dc.send(t);
            laserFireQueue = [], lastLaserBatchTime = e
        }
        if (laserQueue.length > 0) {
            const e = laserQueue.shift();
            if ("laser_fired_batch" === e.type)
                for (const t of e.projectiles) t.user !== userName && createProjectile(t.id, t.user, new THREE.Vector3(t.position.x, t.position.y, t.position.z), new THREE.Vector3(t.direction.x, t.direction.y, t.direction.z), t.color);
            else e.user !== userName && createProjectile(e.id, e.user, new THREE.Vector3(e.position.x, e.position.y, e.position.z), new THREE.Vector3(e.direction.x, e.direction.y, e.direction.z), e.color)
        }
        for (let e = projectiles.length - 1; e >= 0; e--) {
            const o = projectiles[e];
            o.mesh.position.x += o.velocity.x * t, o.mesh.position.y += o.velocity.y * t, o.mesh.position.z += o.velocity.z * t, o.light.position.copy(o.mesh.position);
            const a = Math.floor(o.mesh.position.x),
                n = Math.floor(o.mesh.position.y),
                r = Math.floor(o.mesh.position.z);
            if (isSolid(getBlockAt(a, n, r))) {
                if (isHost || peers.size === 0) {
                    removeBlockAt(a, n, r, o.user);
                } else {
                    const blockId = getBlockAt(a, n, r);
                    if (blockId > 0) {
                        const blockHitMsg = JSON.stringify({
                            type: 'block_hit',
                            x: a,
                            y: n,
                            z: r,
                            username: o.user,
                            world: worldName,
                            blockId: blockId
                        });
                        for (const [, peer] of peers.entries()) {
                            if (peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(blockHitMsg);
                            }
                        }
                    }
                }
                scene.remove(o.mesh);
                scene.remove(o.light);
                projectiles.splice(e, 1);
                continue;
            }
            let s = !1;
            for (const t of mobs)
                if (o.mesh.position.distanceTo(t.pos) < 1) {
                    const a = o.isGreen ? 10 : 5;
                    if (isHost || 0 === peers.size) t.hurt(a, o.user);
                    else
                        for (const [e, n] of peers.entries()) n.dc && "open" === n.dc.readyState && n.dc.send(JSON.stringify({
                            type: "mob_hit",
                            id: t.id,
                            damage: a,
                            username: o.user
                        }));
                    scene.remove(o.mesh), scene.remove(o.light), projectiles.splice(e, 1), s = !0;
                    break
                } if (!s) {
            // HOST-AUTHORITATIVE PVP DAMAGE LOGIC
            if (isHost) {
                let hitPlayer = false;

                // First, check for collision with the host player itself
                if (o.user !== userName) { // Can't be hit by your own projectile
                    const hostPlayerPos = new THREE.Vector3(player.x, player.y + player.height / 2, player.z);
                    if (o.mesh.position.distanceTo(hostPlayerPos) < 1.5) {
                        const damage = o.isGreen ? 10 : 5;
                        player.health -= damage;
                        document.getElementById("health").innerText = player.health;
                        updateHealthBar();
                        addMessage("Hit by " + o.user + "! HP: " + player.health, 1e3);
                        flashDamageEffect();
                        safePlayAudio(soundHit);
                        player.health <= 0 && handlePlayerDeath();

                        hitPlayer = true;
                    }
                }

                // If no hit on host, check remote players
                if (!hitPlayer) {
                    for (const [username, avatar] of playerAvatars.entries()) {
                        // This check is redundant if projectile owner is not in playerAvatars, but good for safety
                        if (o.user === username) continue;

                        const remotePlayerPos = new THREE.Vector3();
                        avatar.getWorldPosition(remotePlayerPos);
                        remotePlayerPos.y += player.height / 2; // Adjust to player center

                        if (o.mesh.position.distanceTo(remotePlayerPos) < 1.5) {
                            const damage = o.isGreen ? 10 : 5;
                            const peer = peers.get(username);
                            if (peer && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(JSON.stringify({
                                    type: 'player_damage',
                                    damage: damage,
                                    attacker: o.user
                                }));
                            }
                            hitPlayer = true;
                            break;
                        }
                    }
                }

                // If any player was hit, destroy the projectile and move to the next one
                if (hitPlayer) {
                    scene.remove(o.mesh);
                    scene.remove(o.light);
                    projectiles.splice(e, 1);
                    continue;
                }
            }

            // Age out projectile if it didn't hit anything
            if (Date.now() - o.createdAt > 5e3) {
                scene.remove(o.mesh);
                scene.remove(o.light);
                projectiles.splice(e, 1);
            }
        }
        }

        // Magician stone media playback and animation logic
        const playerPosition = new THREE.Vector3(player.x, player.y, player.z);
        for (const key in magicianStones) {
            if (Object.hasOwnProperty.call(magicianStones, key)) {
                const stone = magicianStones[key];
                const stonePosition = new THREE.Vector3(stone.x, stone.y, stone.z);
                const distance = playerPosition.distanceTo(stonePosition);
                const mediaElement = stone.videoElement || stone.audioElement;

                // Update animation mixer if exists
                if (stone.mixer) {
                    stone.mixer.update(t);
                }

                // Update GIF animation
                if (stone.gifData && stone.gifData.reader) {
                    const gif = stone.gifData;
                    gif.accumulatedTime += t * 1000; // Convert dt (seconds) to ms

                    let frameInfo = gif.reader.frameInfo(gif.currentFrame);
                    let delay = frameInfo.delay * 10; // Delay is in 100ths of a second
                    if (delay === 0) delay = 100; // Default delay if 0

                    while (gif.accumulatedTime >= delay) {
                        gif.accumulatedTime -= delay;

                        // Handle disposal of the CURRENT frame (that we are about to overwrite)
                        // If disposal method was 2 (Restore to Background), we must clear its area in our persistent buffer.
                        // Note: frameInfo currently points to the frame we just displayed.
                        if (frameInfo.disposal === 2) {
                             // Clear the rect in the persistent buffer
                             const data = gif.tempImageData.data;
                             const width = gif.reader.width; // Buffer is always full width

                             // Bounds to clear
                             const cx = frameInfo.x;
                             const cy = frameInfo.y;
                             const cw = frameInfo.width;
                             const ch = frameInfo.height;

                             // Iterate and clear to 0
                             for (let y = cy; y < cy + ch; y++) {
                                 for (let x = cx; x < cx + cw; x++) {
                                     // Safety check for bounds
                                     if (x >= 0 && x < width && y >= 0 && y < gif.reader.height) {
                                         const offset = (y * width + x) * 4;
                                         data[offset] = 0;
                                         data[offset + 1] = 0;
                                         data[offset + 2] = 0;
                                         data[offset + 3] = 0;
                                     }
                                 }
                             }
                        }

                        // Advance to next frame
                        gif.currentFrame = (gif.currentFrame + 1) % gif.numFrames;

                        // If we looped back to 0, we might need to clear if the whole animation expects a fresh start?
                        // However, disposal logic usually handles this frame-by-frame.
                        // Standard GIF behavior relies on frame 0 being drawn over whatever (or cleared if frame n-1 said so).

                        // Decode NEXT frame into the persistent buffer
                        // decodeAndBlitFrameRGBA writes new pixels into the buffer.
                        // It skips transparent pixels, so previous data is preserved (compositing).
                        // CRITICAL: The buffer MUST be the size of the full logical screen (gif.reader.width/height)
                        // because omggif calculates offsets based on global width.
                        gif.reader.decodeAndBlitFrameRGBA(gif.currentFrame, gif.tempImageData.data);

                        // Push the updated full buffer to the canvas
                        gif.ctx.putImageData(gif.tempImageData, 0, 0);
                        gif.texture.needsUpdate = true;

                        // Update info for next loop check
                        frameInfo = gif.reader.frameInfo(gif.currentFrame);
                        delay = frameInfo.delay * 10;
                        if (delay === 0) delay = 100;
                    }
                }

                if (mediaElement && stone.autoplay) {
                    // Don't attempt to play if autoplay is paused due to browser restrictions
                    if (isAutoplayPaused) {
                        if (!mediaElement.paused) {
                            mediaElement.pause();
                        }
                    } else if (distance <= stone.distance) {
                        if (mediaElement.paused) {
                            mediaElement.play().catch(err => {
                                // Check if this is an autoplay restriction error
                                if (typeof isAutoplayError === 'function' && isAutoplayError(err)) {
                                    isAutoplayPaused = true;
                                    console.log('[AutoplayPause] Magician stone media blocked by browser, waiting for user interaction');
                                } else {
                                    console.error("Autoplay failed:", err);
                                }
                            });
                        }
                        // Proximity-based volume for audio
                        if (stone.audioElement) {
                            const volume = Math.max(0, 1 - (distance / stone.distance));
                            stone.audioElement.volume = stone.isMuted ? 0 : volume;
                        }
                        if (stone.videoElement) {
                            const volume = Math.max(0, 1 - (distance / stone.distance));
                            stone.videoElement.volume = stone.isMuted ? 0 : volume;
                        }
                    } else {
                        if (!mediaElement.paused) {
                            mediaElement.pause();
                        }
                    }
                }
            }
        }
        renderer.render(scene, camera)
    }
    requestAnimationFrame(gameLoop)
}
document.addEventListener("DOMContentLoaded", (async function () {
    try {
        const i = new URLSearchParams(window.location.search),
            l = i.get("world-seed"),
            d = i.get("user-name"),
            c = i.get("loc");
        if (l && (document.getElementById("worldNameInput").value = l), d && (document.getElementById("userInput").value = d), c) {
            const e = c.split(",");
            if (3 === e.length) {
                const t = parseFloat(e[0]),
                    o = parseFloat(e[1]),
                    a = parseFloat(e[2]);
                isNaN(t) || isNaN(o) || isNaN(a) || (initialTeleportLocation = {
                    x: t,
                    y: o,
                    z: a
                })
            }
        }
        console.log("[SYSTEM] DOMContentLoaded fired, initializing login elements");
        var e = document.getElementById("startBtn");
        l && d && startGame();
        var o = document.getElementById("newUserJoinScriptBtn"),
            a = document.getElementById("acceptAll"),
            n = document.getElementById("pendingModal"),
            r = document.getElementById("loginOverlay");
        if (!(e && o && r)) return console.error("[SYSTEM] Login buttons or overlay not found in DOM"), void addMessage("UI initialization failed: buttons or overlay missing", 3e3);
        a ? a.addEventListener("change", (function (e) {
            document.querySelectorAll(".selectOffer").forEach((function (t) {
                t.checked = e.target.checked
            })), console.log("[MODAL] Accept All checkbox changed")
        })) : console.warn("[MODAL] acceptAll element not found"), n ? (n.addEventListener("click", (function (e) {
            e.stopPropagation()
        })), console.log("[MODAL] Pending modal click listener added")) : console.warn("[MODAL] pendingModal element not found"), e.addEventListener("click", startGame), o.addEventListener("click", (async function () {
            this.blur(), console.log("[LOGIN] Create Join Script button clicked"), isPromptOpen = !0;
            var e = document.getElementById("worldNameInput").value,
                t = document.getElementById("userInput").value;
            if (e.length > 8) addMessage("World name too long (max 8 chars)", 3e3);
            else if (t.length > 20) addMessage("Username too long (max 20 chars)", 3e3);
            else if (e && t) {
                var o = e.slice(0, 8),
                    a = t.slice(0, 20),
                    n = o + "@" + a,
                    r = knownWorlds.get(o);
                if (r && r.users.has(a)) addMessage("User already in this world. Choose a different username.", 3e3);
                else {
                    var s = await GetPublicAddressByKeyword(n),
                        i = await GetPublicAddressByKeyword(MASTER_WORLD_KEY),
                        l = [s ? s.trim() : n, i ? i.trim() : MASTER_WORLD_KEY].filter((function (e) {
                            return e
                        })).join(",").replace(/["']/g, "");
                    document.getElementById("joinScriptText").value = l, document.getElementById("joinScriptModal").style.display = "block", document.getElementById("joinScriptModal").querySelector("h3").innerText = "Join World", document.getElementById("joinScriptModal").querySelector("p").innerText = "Copy this address and paste it into a Sup!? message To: field and click 📢 to join the world.", addMessage("Join script ready to share", 3e3)
                }
            } else addMessage("Please enter a world and username", 3e3)
        })), document.getElementById("homeIcon").addEventListener("click", (function () {
            respawnPlayer(), this.blur()
        })), document.getElementById("camToggle").addEventListener("click", (function () {
            toggleCameraMode(), this.blur()
        })), document.getElementById("openCraft").addEventListener("click", (function () {
            openCrafting(), this.blur()
        })), document.getElementById("teleportBtn").addEventListener("click", (function () {
            isPromptOpen = !0, document.getElementById("teleportModal").style.display = "block", document.getElementById("teleportX").value = Math.floor(player.x), document.getElementById("teleportY").value = Math.floor(player.y), document.getElementById("teleportZ").value = Math.floor(player.z), this.blur()
        })), document.getElementById("shareWorldBtn").addEventListener("click", (function () {
            var e = document.getElementById("teleportX").value,
                t = document.getElementById("teleportY").value,
                o = document.getElementById("teleportZ").value,
                a = `https://supgalaxy.org/index.html?world-seed=${encodeURIComponent(worldSeed)}&user-name=${encodeURIComponent(userName)}&loc=${e},${t},${o}`;
            navigator.clipboard.writeText(a).then((function () {
                addMessage("Shareable URL copied to clipboard!", 3e3)
            }), (function (e) {
                addMessage("Failed to copy URL.", 3e3)
            })), this.blur()
        })), document.getElementById("switchWorldBtn").addEventListener("click", (function () {
            switchWorld(), this.blur()
        })), document.getElementById("saveChangesBtn").addEventListener("click", (function () {
            downloadSession(), this.blur()
        })), document.getElementById("joinScriptBtn").addEventListener("click", (async function () {
            this.blur();
            isPromptOpen = !0;
            var e = await GetPublicAddressByKeyword(userName + "@" + worldName),
                t = await GetPublicAddressByKeyword(MASTER_WORLD_KEY),
                o = [e || userName + "@" + worldName, t || MASTER_WORLD_KEY].filter((function (e) {
                    return e
                })).join(",").replace(/["']/g, "");
            document.getElementById("joinScriptText").value = o, document.getElementById("joinScriptModal").style.display = "block"
        })), document.getElementById("usersBtn").addEventListener("click", (function () {
            openUsersModal(), this.blur()
        })), document.getElementById("closeCraft").addEventListener("click", (function () {
            isPromptOpen = !1, document.getElementById("craftModal").style.display = "none", this.blur()
        })), document.getElementById("closeChest").addEventListener("click", (function () {
            closeChest(), this.blur()
        })), document.getElementById("closeInventory").addEventListener("click", (function () {
            toggleInventory(), this.blur()
        })), document.getElementById("closeJoinScript").addEventListener("click", (function () {
            isPromptOpen = !1, isConnecting = !1, document.getElementById("joinScriptModal").style.display = "none", this.blur()
        })), document.getElementById("closeDownloadModal").addEventListener("click", (function () {
            isPromptOpen = !1, document.getElementById("downloadModal").style.display = "none", this.blur()
        })), document.getElementById("closeSaveOptionsModal").addEventListener("click", (function () {
            isPromptOpen = !1, document.getElementById("saveOptionsModal").style.display = "none", this.blur()
        })), document.getElementById("saveFullSessionBtn").addEventListener("click", (function () {
            saveFullSession(), this.blur()
        })), document.getElementById("savePlayerChangesBtn").addEventListener("click", (function () {
            savePlayerChangesOnly(), this.blur()
        })), document.getElementById("teleportCancel").addEventListener("click", (function () {
            isPromptOpen = !1, document.getElementById("teleportModal").style.display = "none", this.blur()
        })), document.getElementById("teleportOk").addEventListener("click", (function () {
            var e = parseFloat(document.getElementById("teleportX").value),
                t = parseFloat(document.getElementById("teleportY").value),
                o = parseFloat(document.getElementById("teleportZ").value);
            isNaN(e) || isNaN(t) || isNaN(o) ? addMessage("Invalid coordinates", 3e3) : (respawnPlayer(e, t, o), document.getElementById("teleportModal").style.display = "none", isPromptOpen = !1, this.blur())
        })), document.getElementById("respawnBtn").addEventListener("click", (function () {
            respawnPlayer(), this.blur()
        })), document.getElementById("acceptPending").addEventListener("click", (function () {
            acceptPendingOffers(), this.blur()
        })), document.getElementById("closePending").addEventListener("click", (function () {
            document.getElementById("pendingModal").style.display = "none", pendingOffers = [], updatePendingModal(), this.blur()
        })), async function () {
            console.log("[USERS] Initializing worlds and users");
            var e = await GetPublicAddressByKeyword(MASTER_WORLD_KEY);
            if (e) {
                var t = await GetPublicMessagesByAddress(e);
                for (var o of t || [])
                    if (o.TransactionId && !processedMessages.has(o.TransactionId)) {
                        console.log("[USERS] Processing message:", o.TransactionId);
                        var a = await GetProfileByAddress(o.FromAddress);
                        if (!a || !a.URN) {
                            console.log("[USERS] Skipping message: No valid URN for address:", o.FromAddress);
                            continue
                        }
                        var n = a.URN,
                            r = await GetProfileByURN(n);
                        if (!r || !r.Creators || !r.Creators.includes(o.FromAddress)) {
                            console.log("[USERS] Skipping message: Invalid profile for user:", n);
                            continue
                        }
                        var s = await GetKeywordByPublicAddress(o.ToAddress);
                        if (!s) {
                            console.log("[USERS] Skipping message: No keyword for address:", o.ToAddress);
                            continue
                        }
                        var i = s.replace(/^"|"$/g, "");
                        var worldNameFromKey = null;

                        // Logic to handle MCUserJoin format (Discovery)
                        if (i.includes("MCUserJoin@")) {
                            var joinParts = i.split("@");
                            if (joinParts.length >= 2) {
                                worldNameFromKey = joinParts[1];
                            }
                        } else {
                            // Logic to handle world@user format (Direct/Legacy)
                            var parts = i.split("@");
                            if (parts.length >= 2) {
                                var potentialWorld = parts[0];
                                var potentialUser = parts.slice(1).join("@");
                                // Verify user match only if we are parsing user from key
                                if (n.startsWith(potentialUser)) {
                                    worldNameFromKey = potentialWorld;
                                }
                            }
                        }

                        if (n && worldNameFromKey) {
                            // Ensure n (profile URN) is used as the username
                            // Previously n was stripped. Now n comes from a.URN directly (see below change).
                            // Wait, I need to change where 'n' is defined too.

                            console.log("[USERS] Adding user:", n, "to world:", worldNameFromKey);
                            if (!knownWorlds.has(worldNameFromKey)) {
                                knownWorlds.set(worldNameFromKey, {
                                    discoverer: n,
                                    users: new Map(), // Store user details (timestamp, etc.)
                                    toAddress: o.ToAddress
                                });
                            }

                            var worldData = knownWorlds.get(worldNameFromKey);
                            // Store user with timestamp
                            worldData.users.set(n, {
                                timestamp: Date.parse(o.BlockDate) || Date.now(),
                                address: o.FromAddress
                            });

                            knownUsers.has(n) || knownUsers.set(n, o.FromAddress);

                            // Calculate spawn point for known user to enforce ownership
                            var spawn = calculateSpawnPoint(n + "@" + worldNameFromKey);
                            var cx = Math.floor(spawn.x / CHUNK_SIZE);
                            var cz = Math.floor(spawn.z / CHUNK_SIZE);

                            // Use key format: username@worldname to avoid conflicts
                            var spawnMapKey = n + "@" + worldNameFromKey;
                            spawnChunks.set(spawnMapKey, {
                                cx: cx,
                                cz: cz,
                                username: n,
                                world: worldNameFromKey,
                                spawn: spawn
                            });

                            // Immediately protect home chunk for known users
                            var chunkKey = makeChunkKey(worldNameFromKey, cx, cz);
                            updateChunkOwnership(chunkKey, n, Date.now(), 'home');

                            processedMessages.add(o.TransactionId);
                        }
                    } else o.TransactionId && console.log("[USERS] Skipping already processed message:", o.TransactionId);
                console.log("[USERS] Discovered worlds:", knownWorlds.size, "and users:", knownUsers.size)
            }
        }(), updateLoginUI(), setupEmojiPicker();
        var s = document.getElementById("dropZone");
        s.addEventListener("dragover", (function (e) {
            e.preventDefault(), s.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
        })), s.addEventListener("dragleave", (function (e) {
            e.preventDefault(), s.style.backgroundColor = ""
        })), s.addEventListener("drop", (function (e) {
            e.preventDefault(), s.style.backgroundColor = "";
            var t = e.dataTransfer.files[0];
            if (t) {
                var o = new FileReader;
                o.onload = function (e) {
                    try {
                        // Manual file upload uses current time as BlockDate (for local-only changes)
                        applySaveFile(JSON.parse(e.target.result), "local", null)
                    } catch (e) {
                        console.error("Error parsing session file:", e), addMessage("Sorry, file malformed.", 3e3)
                    }
                }, o.readAsText(t)
            }
        }));

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        s.addEventListener('dblclick', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(event) {
            var file = event.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        // Manual file upload uses current time as BlockDate (for local-only changes)
                        applySaveFile(JSON.parse(e.target.result), "local", null);
                    } catch (err) {
                        console.error("Error parsing session file:", err);
                        addMessage("Sorry, file malformed.", 3000);
                    }
                };
                reader.readAsText(file);
            }
        });

        console.log("[SYSTEM] DOMContentLoaded completed, all listeners attached")
    } catch (e) {
        console.error("[SYSTEM] Error in DOMContentLoaded:", e), addMessage("Failed to initialize login system", 3e3)
    }
})), console.log("[SYSTEM] Script loaded");

function resetMagicianStoneDialog() {
    document.getElementById('magicianStoneUrl').value = '';
    document.getElementById('magicianStoneWidth').value = '2';
    document.getElementById('magicianStoneHeight').value = '1.5';
    document.getElementById('magicianStoneOffsetX').value = '0';
    document.getElementById('magicianStoneOffsetY').value = '0';
    document.getElementById('magicianStoneOffsetZ').value = '0';
    document.getElementById('magicianStoneLoop').checked = false;
    document.getElementById('magicianStoneAutoplay').checked = false;
    document.getElementById('magicianStoneAutoplayAnimation').checked = true;
    document.getElementById('magicianStoneDistance').value = '10';
    document.getElementById('magicianStonePreview').innerHTML = '<span>URL Preview</span>';
}

document.getElementById('magicianStoneCancel').addEventListener('click', function() {
    resetMagicianStoneDialog();
    document.getElementById('magicianStoneModal').style.display = 'none';
    isPromptOpen = false;
    magicianStonePlacement = null;
});

function handleResizeAndOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isSmallScreen = window.innerWidth < 700;

    const hud = document.getElementById('hud');
    const mobileControls = document.getElementById('mobileControls');
    const mobileRight = document.getElementById('mobileRight');
    const hotbar = document.getElementById('hotbar');
    const rightPanel = document.getElementById('rightPanel');
    const mobileModeToggle = document.getElementById('mobileModeToggle');

    const mobileInterface = document.getElementById('mobileInterface');

    if (isSmallScreen && isPortrait) {
        hud.style.display = 'none';
        // Auto-enable mobile controls in portrait on small screens
        // Only show if user is actually logged in/playing, not on login screen
        if (document.getElementById("loginOverlay").style.display === "none") {
             if (mobileInterface) mobileInterface.style.display = 'block';
             document.body.classList.add('is-mobile-mode');
        } else {
             if (mobileInterface) mobileInterface.style.display = 'none';
             document.body.classList.remove('is-mobile-mode');
        }

        hotbar.classList.add('mobile-hotbar');
        updateHotbarSlots(4);
        mobileModeToggle.style.display = 'none';
    } else {
        mobileModeToggle.style.display = 'block';
        if (mobileModeActive) {
            hud.style.display = 'none';
            if (mobileInterface) mobileInterface.style.display = 'block';
            document.body.classList.add('is-mobile-mode');
            rightPanel.classList.add('minimap-small');
        } else {
            const isLoginVisible = document.getElementById("loginOverlay").style.display !== "none";
            hud.style.display = isLoginVisible ? 'none' : 'block';
            if (mobileInterface) mobileInterface.style.display = 'none';
            document.body.classList.remove('is-mobile-mode');
            rightPanel.classList.remove('minimap-small');
        }
        hotbar.classList.remove('mobile-hotbar');
        updateHotbarSlots(9);
    }

    // Ensure old controls are hidden
    if (mobileControls) mobileControls.style.display = 'none';
    if (mobileRight) mobileRight.style.display = 'none';
}

function updateHotbarSlots(numSlots) {
    const hotbar = document.getElementById('hotbar');
    const slots = hotbar.children;
    for (let i = 0; i < slots.length; i++) {
        slots[i].style.display = i < numSlots ? 'flex' : 'none';
    }
}

document.getElementById('mobileModeToggle').addEventListener('click', function() {
    mobileModeActive = !mobileModeActive;
    this.style.opacity = mobileModeActive ? '1' : '0.5';
    handleResizeAndOrientation();
});

window.addEventListener('resize', handleResizeAndOrientation);
window.addEventListener('orientationchange', handleResizeAndOrientation);

document.getElementById('magicianStoneUrl').addEventListener('input', async function() {
    let url = this.value;
    const previewContainer = document.getElementById('magicianStonePreview');
    previewContainer.innerHTML = ''; // Clear previous preview

    if (url.startsWith('IPFS:')) {
        previewContainer.innerHTML = '<span>Resolving IPFS link...</span>';
        try {
            url = await resolveIPFS(url);
        } catch (error) {
            console.error('Error resolving IPFS URL:', error);
            previewContainer.innerHTML = '<span>Failed to resolve IPFS URL.</span>';
            return;
        }
    }

    const fileExtension = this.value.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '150px';
        previewContainer.appendChild(img);
    } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
        const video = document.createElement('video');
        video.src = url;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '150px';
        video.controls = true;
        video.muted = true;
        previewContainer.appendChild(video);
    } else if (['mp3', 'wav', 'oga'].includes(fileExtension)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        previewContainer.appendChild(audio);
    } else if (['glb', 'gltf'].includes(fileExtension)) {
        // Show loading indicator while checking GLB/GLTF file
        previewContainer.innerHTML = '<span style="color: #888;">Loading 3D model...</span>';

        // Validate the GLB/GLTF file by attempting to load it
        const loader = new THREE.GLTFLoader();
        loader.load(
            url,
            function(gltf) {
                // Success - show model info
                const animationCount = gltf.animations.length;
                const modelName = url.split('/').pop();

                let infoHTML = '<div style="padding: 10px; background: #2a2a2a; border-radius: 4px;">';
                infoHTML += '<div style="color: #4CAF50; font-size: 18px; margin-bottom: 8px;">✓ 3D Model Ready</div>';
                infoHTML += '<div style="color: #ccc; font-size: 12px; margin-bottom: 4px;">File: ' + modelName + '</div>';

                if (animationCount > 0) {
                    infoHTML += '<div style="color: #64B5F6; font-size: 12px;">🎬 ' + animationCount + ' animation(s) detected</div>';
                } else {
                    infoHTML += '<div style="color: #888; font-size: 12px;">Static model (no animations)</div>';
                }

                infoHTML += '</div>';
                previewContainer.innerHTML = infoHTML;
            },
            function(progress) {
                // Loading progress - could show percentage if needed
            },
            function(error) {
                console.error('Error loading GLB/GLTF:', error);
                previewContainer.innerHTML = '<span style="color: #ff6666;">Failed to load 3D model</span>';
            }
        );
    } else {
        previewContainer.innerHTML = '<span>URL Preview</span>';
    }
});

document.getElementById('magicianStoneSave').addEventListener('click', function() {
    const url = document.getElementById('magicianStoneUrl').value;
    if (!url) {
        addMessage("URL is required.", 3000);
        return;
    }

    const stoneData = {
        x: magicianStonePlacement.x,
        y: magicianStonePlacement.y,
        z: magicianStonePlacement.z,
        url: url,
        width: parseFloat(document.getElementById('magicianStoneWidth').value),
        height: parseFloat(document.getElementById('magicianStoneHeight').value),
        offsetX: parseFloat(document.getElementById('magicianStoneOffsetX').value),
        offsetY: parseFloat(document.getElementById('magicianStoneOffsetY').value),
        offsetZ: parseFloat(document.getElementById('magicianStoneOffsetZ').value),
        loop: document.getElementById('magicianStoneLoop').checked,
        autoplay: document.getElementById('magicianStoneAutoplay').checked,
        autoplayAnimation: document.getElementById('magicianStoneAutoplayAnimation').checked,
        distance: parseFloat(document.getElementById('magicianStoneDistance').value),
        direction: magicianStonePlacement.direction // Use the direction saved on placement
    , source: 'local'
    };

    createMagicianStoneScreen(stoneData);

    const n = INVENTORY[selectedHotIndex];
    if (magicianStonePlacement && n && n.id === 127) {
        chunkManager.setBlockGlobal(magicianStonePlacement.x, magicianStonePlacement.y, magicianStonePlacement.z, 127, true, n.originSeed);

        n.count -= 1;
        if (n.count <= 0) {
            INVENTORY[selectedHotIndex] = null;
        }
        updateHotbarUI();
        safePlayAudio(soundPlace);

        // Send magician stone data to other peers
        const message = JSON.stringify({
            type: 'magician_stone_placed',
            stoneData: stoneData
        });
        for (const [username, peer] of peers.entries()) {
            if (peer.dc && peer.dc.readyState === 'open') {
                peer.dc.send(message);
            }
        }
    }

    resetMagicianStoneDialog();
    document.getElementById('magicianStoneModal').style.display = 'none';
    isPromptOpen = false;
    magicianStonePlacement = null;
});

// Calligraphy Stone event handlers
document.getElementById('calligraphyStoneCancel').addEventListener('click', function() {
    document.getElementById('calligraphyStoneModal').style.display = 'none';
    isPromptOpen = false;
    calligraphyStonePlacement = null;
});

document.getElementById('calligraphyStoneSave').addEventListener('click', function() {
    const text = document.getElementById('calligraphyStoneText').value;
    if (!text || typeof text !== 'string' || !text.trim()) {
        addMessage("Text is required.", 3000);
        return;
    }

    const stoneData = {
        x: calligraphyStonePlacement.x,
        y: calligraphyStonePlacement.y,
        z: calligraphyStonePlacement.z,
        width: parseFloat(document.getElementById('calligraphyStoneWidth').value),
        height: parseFloat(document.getElementById('calligraphyStoneHeight').value),
        offsetX: parseFloat(document.getElementById('calligraphyStoneOffsetX').value),
        offsetY: parseFloat(document.getElementById('calligraphyStoneOffsetY').value),
        offsetZ: parseFloat(document.getElementById('calligraphyStoneOffsetZ').value),
        bgColor: document.getElementById('calligraphyStoneBgColor').value,
        transparent: document.getElementById('calligraphyStoneTransparent').checked,
        fontFamily: document.getElementById('calligraphyStoneFontFamily').value,
        fontSize: parseFloat(document.getElementById('calligraphyStoneFontSize').value),
        fontWeight: document.getElementById('calligraphyStoneFontWeight').value,
        fontColor: document.getElementById('calligraphyStoneFontColor').value,
        text: text,
        link: document.getElementById('calligraphyStoneUrl').value,
        direction: calligraphyStonePlacement.direction // Use the direction saved on placement
    , source: 'local'
    };

    createCalligraphyStoneScreen(stoneData);

    const n = INVENTORY[selectedHotIndex];
    if (calligraphyStonePlacement && n && n.id === 128) {
        chunkManager.setBlockGlobal(calligraphyStonePlacement.x, calligraphyStonePlacement.y, calligraphyStonePlacement.z, 128, true, n.originSeed);

        n.count -= 1;
        if (n.count <= 0) {
            INVENTORY[selectedHotIndex] = null;
        }
        updateHotbarUI();
        safePlayAudio(soundPlace);

        // Send calligraphy stone data to other peers
        const message = JSON.stringify({
            type: 'calligraphy_stone_placed',
            stoneData: stoneData
        });
        for (const [username, peer] of peers.entries()) {
            if (peer.dc && peer.dc.readyState === 'open') {
                peer.dc.send(message);
            }
        }
    }

    document.getElementById('calligraphyStoneModal').style.display = 'none';
    isPromptOpen = false;
    calligraphyStonePlacement = null;
});
