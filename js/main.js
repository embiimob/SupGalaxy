function getCurrentWorldState() {
    if (!WORLD_STATES.has(worldName)) {
        WORLD_STATES.set(worldName, {
            chunkDeltas: new Map,
            foreignBlockOrigins: new Map
        });
    }
    return WORLD_STATES.get(worldName);
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
                foreignBlockOrigins: new Map(data.foreignBlockOrigins)
            });
        }
        processedMessages = new Set(e.processedMessages);
        addMessage("Host session loaded. Restoring all world states.", 3e3);
    }
    if (e.playerData && e.hash) {
        const t = e.playerData,
            o = e.hash;
        if (simpleHash(JSON.stringify(t)) !== o) return void addMessage("Sorry, file malformed and does not login.", 3e3);
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
        if (userAddress = a && a.Creators ? a.Creators[0] : "anonymous", knownUsers.has(userName) || knownUsers.set(userName, userAddress), knownWorlds.has(worldName) ? knownWorlds.get(worldName).users.add(userName) : knownWorlds.set(worldName, {
            discoverer: userName,
            users: new Set([userName]),
            toAddress: userAddress
        }), keywordCache.set(userAddress, n), document.getElementById("loginOverlay").style.display = "none", document.getElementById("hud").style.display = "block", document.getElementById("hotbar").style.display = "flex", document.getElementById("rightPanel").style.display = "flex", document.getElementById("worldLabel").textContent = worldName, document.getElementById("seedLabel").textContent = "User " + userName, updateHudButtons(), console.log("[LOGIN] Initializing Three.js from session"), await initAudio(), initThree(), initMusicPlayer(), initVideoPlayer(), player.x = t.profile.x, player.y = t.profile.y, player.z = t.profile.z, player.health = t.profile.health, player.score = t.profile.score, INVENTORY = t.profile.inventory, musicPlaylist = t.musicPlaylist || [], videoPlaylist = t.videoPlaylist || [], selectedHotIndex = 0, selectedBlockId = INVENTORY[0] ? INVENTORY[0].id : null, initHotbar(), updateHotbarUI(), console.log("[LOGIN] Creating ChunkManager from session"), chunkManager = new ChunkManager(worldSeed), t.deltas)
            for (var r of t.deltas) {
                var s = r.chunk.replace(/^#/, ""),
                    i = r.changes;
                chunkManager.applyDeltasToChunk(s, i)
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
            magicianStones = {}; // Clear existing stones
            for (const key in t.magicianStones) {
                if (Object.hasOwnProperty.call(t.magicianStones, key)) {
                    const stoneData = t.magicianStones[key];
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
                    const stoneData = t.calligraphyStones[key];
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
        }), startWorker(), void setInterval(pollServers, POLL_INTERVAL)
    }
    if (e && (e.foreignBlockOrigins && (getCurrentWorldState().foreignBlockOrigins = new Map(e.foreignBlockOrigins)), addMessage(`Loaded ${getCurrentWorldState().foreignBlockOrigins.size} foreign blocks.`, 2e3), e.deltas)) {
        var c = await GetProfileByAddress(t),
            u = c && c.URN ? c.URN.replace(/[^a-zA-Z0-9]/g, "") : "anonymous",
            p = Date.now();
        const blockDate = new Date(o).getTime();
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
                    createMagicianStoneScreen(e.magicianStones[key]);
                }
            }
        }
        if (e.calligraphyStones) {
            for (const key in e.calligraphyStones) {
                if (Object.hasOwnProperty.call(e.calligraphyStones, key)) {
                    createCalligraphyStoneScreen(e.calligraphyStones[key]);
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
        if ("first" === cameraMode && !mouseLocked && !isMobile()) try {
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
        var o = document.createElement("div");
        o.className = "hot-slot", o.dataset.index = t;
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
        o.addEventListener("click", (function() {
            document.querySelectorAll(".hot-slot").forEach((function(e) {
                e.classList.remove("active")
            })), this.classList.add("active"), selectedHotIndex = parseInt(this.dataset.index), updateHotbarUI();
            if ("flex" === document.getElementById("mobileControls").style.display) {
                onPointerDown({
                    button: 2,
                    preventDefault: () => {}
                })
            }
        })), o.addEventListener("contextmenu", (function(e) {
            e.preventDefault(), INVENTORY[this.dataset.index] && INVENTORY[this.dataset.index].count > 0 && (trashIndex = this.dataset.index, document.getElementById("trashItemName").innerText = "Trash " + BLOCKS[INVENTORY[trashIndex].id].name + " x" + INVENTORY[trashIndex].count + " ? ", document.getElementById("trashConfirm").style.display = "block")
        }))
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


function handleMobHit(e) {
    if (isHost || 0 === peers.size) e.hurt(4, userName);
    else
        for (const [t, o] of peers.entries()) o.dc && "open" === o.dc.readyState && (console.log(`[WebRTC] Sending mob_hit to host ${t}`), o.dc.send(JSON.stringify({
            type: "mob_hit",
            id: e.id,
            damage: 4,
            username: userName
        })));
    safePlayAudio(soundHit), addMessage("Hit mob!", 800)
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

function createDroppedItemOrb(e, t, o, a, n) {
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
    const d = new THREE.PointLight(r.color, .8, 5);
    d.position.copy(t), l.light = d, scene.add(d);
    const c = {
        id: e,
        blockId: o,
        originSeed: a,
        mesh: l,
        light: d,
        createdAt: Date.now(),
        dropper: n
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

async function createMagicianStoneScreen(stoneData) {
    let { x, y, z, url, width, height, offsetX, offsetY, offsetZ, loop, autoplay, autoplayAnimation, distance } = stoneData;
    const key = `${x},${y},${z}`;

    // Remove existing screen if it exists
    if (magicianStones[key] && magicianStones[key].mesh) {
        scene.remove(magicianStones[key].mesh);
        disposeObject(magicianStones[key].mesh);
    }

    if (url.startsWith('IPFS:')) {
        try {
            url = await resolveIPFS(url);
        } catch (error) {
            console.error('Error resolving IPFS URL for in-world screen:', error);
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
                scene.add(screenMesh);
            }
        );
        return;
    }

    // Original code for non-GLB/GLTF files
    const planeGeometry = new THREE.PlaneGeometry(width, height);
    let texture;

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
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
    scene.add(screenMesh);
}

function createCalligraphyStoneScreen(stoneData) {
    let { x, y, z, width, height, offsetX, offsetY, offsetZ, bgColor, transparent, fontFamily, fontSize, fontWeight, fontColor, text, link, direction } = stoneData;
    const key = `${x},${y},${z}`;

    // Remove existing screen if it exists
    if (calligraphyStones[key] && calligraphyStones[key].mesh) {
        scene.remove(calligraphyStones[key].mesh);
        disposeObject(calligraphyStones[key].mesh);
    }

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
    scene.add(screenMesh);
}

function dropSelectedItem() {
    const e = INVENTORY[selectedHotIndex];
    if (!e || e.count <= 0) return void addMessage("Nothing to drop!");
    const t = `${userName}-${Date.now()}`,
        o = new THREE.Vector3;
    camera.getWorldDirection(o);
    const a = new THREE.Vector3(player.x, player.y + 1, player.z).add(o.multiplyScalar(1.5));
    createDroppedItemOrb(t, a, e.id, e.originSeed, userName), e.count--, e.count <= 0 && (INVENTORY[selectedHotIndex] = null), updateHotbarUI();
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
    for (const [e, t] of peers.entries()) t.dc && "open" === t.dc.readyState && t.dc.send(n)
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
            chunkManager.setBlockGlobal(e, t, o, BLOCK_AIR, userName);
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
                if (magicianStones[key].mesh) {
                    scene.remove(magicianStones[key].mesh);
                    disposeObject(magicianStones[key].mesh);
                }
                if (magicianStones[key].videoElement) {
                    magicianStones[key].videoElement.pause();
                    magicianStones[key].videoElement.src = '';
                }
                 if (magicianStones[key].audioElement) {
                    magicianStones[key].audioElement.pause();
                    magicianStones[key].audioElement.src = '';
                }
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
                        
                        if (chunkManager.setBlockGlobal(e, t, o, a, !0, n.originSeed), n.originSeed && n.originSeed !== worldSeed) {
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
    var a = modWrap(e || spawnPoint.x, MAP_SIZE),
        n = modWrap(o || spawnPoint.z, MAP_SIZE),
        r = t || chunkManager.getSurfaceY(a, n) + 1;
    if (checkCollision(a, r, n)) {
        for (var s = !1, i = 0; i <= 5; i++)
            if (!checkCollision(a, r + i, n)) {
                player.x = a, player.y = r + i, player.z = n, player.vy = 0, player.onGround = !1, s = !0;
                break
            } s || (player.x = a, player.y = chunkManager.getSurfaceY(a, n) + 1, player.z = n, player.vy = 0, player.onGround = !0, player.health = 20, player.yaw = 0, player.pitch = 0)
    } else player.x = a, player.y = r, player.z = n, player.vy = 0, player.onGround = !1, player.health = 20, player.yaw = 0, player.pitch = 0;
    updateHotbarUI(), updateHealthBar(), document.getElementById("health").innerText = player.health;
    var l = Math.floor(a / CHUNK_SIZE),
        d = Math.floor(n / CHUNK_SIZE);
    currentLoadRadius = INITIAL_LOAD_RADIUS, chunkManager.preloadChunks(l, d, currentLoadRadius);
    for (var c = -currentLoadRadius; c <= currentLoadRadius; c++)
        for (var u = -currentLoadRadius; u <= currentLoadRadius; u++) {
            var p = modWrap(l + c, CHUNKS_PER_SIDE),
                m = modWrap(d + u, CHUNKS_PER_SIDE),
                y = chunkManager.getChunk(p, m);
            y.generated || chunkManager.generateChunk(y), !y.needsRebuild && y.mesh || chunkManager.buildChunkMesh(y)
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

function checkCollision(e, t, o) {
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
        keys[t] = !0, "Escape" === e.key && mouseLocked && (document.exitPointerLock(), mouseLocked = !1), "t" === e.key.toLowerCase() && toggleCameraMode(), "c" === e.key.toLowerCase() && openCrafting(), "i" === e.key.toLowerCase() && toggleInventory(), "p" === e.key.toLowerCase() && (isPromptOpen = !0, document.getElementById("teleportModal").style.display = "block", document.getElementById("teleportX").value = Math.floor(player.x), document.getElementById("teleportY").value = Math.floor(player.y), document.getElementById("teleportZ").value = Math.floor(player.z)), "x" === e.key.toLowerCase() && getCurrentWorldState().chunkDeltas.size > 0 && downloadSession(), "u" === e.key.toLowerCase() && openUsersModal(), " " === e.key.toLowerCase() && (playerJump(), safePlayAudio(soundJump)), "q" === e.key.toLowerCase() && onPointerDown({
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
    player.onGround && (player.vy = isSprinting ? 25.5 : 8.5, player.onGround = !1, safePlayAudio(soundJump))
}

function toggleCameraMode() {
    if (addMessage("Camera: " + (cameraMode = "third" === cameraMode ? "first" : "third")), controls.enabled = "third" === cameraMode, avatarGroup.visible = "third" === cameraMode, "third" === cameraMode) camera.position.set(player.x, player.y + 5, player.z + 10), controls.target.set(player.x, player.y + .6, player.z), controls.update(), isMobile() || document.exitPointerLock(), mouseLocked = !1, document.getElementById("crosshair").style.display = "none";
    else {
        if (isMobile()) document.getElementById("crosshair").style.display = "block";
        else try {
            renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
        } catch (e) {
            addMessage("Pointer lock failed. Please serve over HTTPS or ensure allow-pointer-lock is set in iframe."), document.getElementById("crosshair").style.display = "block"
        }
        player.yaw = 0, player.pitch = 0, camera.rotation.set(0, 0, 0, "YXZ")
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
    if (isHost) {
        if (confirm("Save the entire multiplayer session? (Host only)")) {
            downloadHostSession();
        } else {
            downloadSinglePlayerSession();
        }
    } else {
        downloadSinglePlayerSession();
    }
}

async function downloadHostSession() {
    const serializableWorldStates = Array.from(WORLD_STATES.entries()).map(([worldName, data]) => {
        return [worldName, {
            chunkDeltas: Array.from(data.chunkDeltas.entries()),
            foreignBlockOrigins: Array.from(data.foreignBlockOrigins.entries())
        }];
    });

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

    var e = {
        world: worldName,
        seed: worldSeed,
        user: userName,
        savedAt: (new Date).toISOString(),
        deltas: [],
        foreignBlockOrigins: Array.from(getCurrentWorldState().foreignBlockOrigins.entries()),
        magicianStones: serializableMagicianStones,
        calligraphyStones: serializableCalligraphyStones,
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
        parseChunkKey(o) && e.deltas.push({
            chunk: o,
            changes: a
        })
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
    var l = Array.from(worldState.chunkDeltas.keys()),
        d = await Promise.all(l.map((async function (e) {
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
    if (isMobile()) {
        var e = document.getElementById("mUp"),
            t = document.getElementById("mDown"),
            o = document.getElementById("mLeft"),
            a = document.getElementById("mRight");
        e.addEventListener("touchstart", (function (e) {
            joystick.up = !0, e.preventDefault()
        })), e.addEventListener("touchend", (function (e) {
            joystick.up = !1, e.preventDefault()
        })), t.addEventListener("touchstart", (function (e) {
            joystick.down = !0, e.preventDefault()
        })), t.addEventListener("touchend", (function (e) {
            joystick.down = !1, e.preventDefault()
        })), o.addEventListener("touchstart", (function (e) {
            joystick.left = !0, e.preventDefault()
        })), o.addEventListener("touchend", (function (e) {
            joystick.left = !1, e.preventDefault()
        })), a.addEventListener("touchstart", (function (e) {
            joystick.right = !0, e.preventDefault()
        })), a.addEventListener("touchend", (function (e) {
            joystick.right = !1, e.preventDefault()
        })), document.getElementById("mJump").addEventListener("touchstart", (function (e) {
            playerJump(), safePlayAudio(soundJump), e.preventDefault()
        })), document.getElementById("mInventory").addEventListener("touchstart", (function (e) {
            toggleInventory(), e.preventDefault()
        })), document.getElementById("mCam").addEventListener("touchstart", (function (e) {
            toggleCameraMode(), e.preventDefault()
        }))
    }
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
    for (var e of spawnChunks) {
        var t = e[0],
            o = e[1],
            a = calculateSpawnPoint(t + "@" + o.world);
        const chunkX = Math.floor(a.x / CHUNK_SIZE);
        const chunkZ = Math.floor(a.z / CHUNK_SIZE);
        const chunkKey = makeChunkKey(o.world, chunkX, chunkZ);
        
        // Check for home spawn collision
        const existing = OWNED_CHUNKS.get(chunkKey);
        if (existing && existing.type === 'home' && existing.username !== t) {
            console.log(`[Ownership] Home spawn collision detected for ${t} at chunk ${chunkKey} (owned by ${existing.username})`);
            // Spiral search for free chunk
            let spiralRadius = 1;
            let foundFree = false;
            while (spiralRadius <= 10 && !foundFree) {
                for (let dx = -spiralRadius; dx <= spiralRadius && !foundFree; dx++) {
                    for (let dz = -spiralRadius; dz <= spiralRadius && !foundFree; dz++) {
                        if (Math.abs(dx) === spiralRadius || Math.abs(dz) === spiralRadius) {
                            const testCx = chunkX + dx;
                            const testCz = chunkZ + dz;
                            const testKey = makeChunkKey(o.world, testCx, testCz);
                            const testOwner = OWNED_CHUNKS.get(testKey);
                            if (!testOwner || testOwner.type !== 'home') {
                                // Found free chunk, calculate new spawn
                                const newX = testCx * CHUNK_SIZE + CHUNK_SIZE / 2;
                                const newZ = testCz * CHUNK_SIZE + CHUNK_SIZE / 2;
                                const newY = chunkManager.getSurfaceY(newX, newZ) + 2;
                                a = { x: newX, y: newY, z: newZ };
                                updateChunkOwnership(testKey, t, Date.now(), 'home');
                                foundFree = true;
                                console.log(`[Ownership] Reassigned ${t} home spawn to chunk ${testKey}`);
                            }
                        }
                    }
                }
                spiralRadius++;
            }
            if (!foundFree) {
                addMessage(`Warning: Could not find free home spawn for ${t}`, 5000);
            }
        } else {
            // No collision, assign ownership
            updateChunkOwnership(chunkKey, t, Date.now(), 'home');
        }
        
        spawnChunks.set(t, {
            cx: Math.floor(a.x / CHUNK_SIZE),
            cz: Math.floor(a.z / CHUNK_SIZE),
            username: o.username,
            world: o.world,
            spawn: a
        });
    }
}
async function startGame() {
    var e = document.getElementById("startBtn");
    e && e.blur(), console.log("[LOGIN] Start game triggered"), isPromptOpen = !1;
    var t = document.getElementById("worldNameInput").value,
        o = document.getElementById("userInput").value;
    if (t.length > 8) return void addMessage("World name too long (max 8 chars)", 3e3);
    if (o.length > 20) return void addMessage("Username too long (max 20 chars)", 3e3);
    if (!t || !o) return void addMessage("Please enter a world and username", 3e3);
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
    userAddress = n && n.Creators ? n.Creators[0] : "anonymous", knownUsers.has(userName) || knownUsers.set(userName, userAddress), knownWorlds.has(worldName) ? knownWorlds.get(worldName).users.add(userName) : knownWorlds.set(worldName, {
        discoverer: userName,
        users: new Set([userName]),
        toAddress: userAddress
    }), keywordCache.set(userAddress, r), document.getElementById("loginOverlay").style.display = "none", document.getElementById("hud").style.display = "block", document.getElementById("hotbar").style.display = "flex", document.getElementById("rightPanel").style.display = "flex", document.getElementById("worldLabel").textContent = worldName, document.getElementById("seedLabel").textContent = "User " + userName, updateHudButtons(), console.log("[LOGIN] Initializing Three.js");
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
    player.x = s.x, player.y = chunkManager.getSurfaceY(s.x, s.z) + 1, player.z = s.z, spawnPoint = {
        x: player.x,
        y: player.y,
        z: player.z
    }, player.vy = 0, player.onGround = !0;
    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var i = Math.floor(s.x / CHUNK_SIZE),
        l = Math.floor(s.z / CHUNK_SIZE);
    
    // Assign home spawn ownership for the local player
    const homeChunkKey = makeChunkKey(worldName, i, l);
    updateChunkOwnership(homeChunkKey, userName, Date.now(), 'home');
    console.log(`[Ownership] Home spawn chunk ${homeChunkKey} assigned to ${userName}`);
    
    // Update local spawnChunks map
    spawnChunks.set(userName, {
        cx: i,
        cz: l,
        username: userName,
        world: worldName,
        spawn: s
    });
    
    if (console.log("[LOGIN] Preloading initial chunks"), chunkManager.preloadChunks(i, l, INITIAL_LOAD_RADIUS), setupMobile(), initMinimap(), updateHotbarUI(), cameraMode = "first", controls.enabled = !1, avatarGroup.visible = !1, camera.position.set(player.x, player.y + 1.62, player.z), camera.rotation.set(0, 0, 0, "YXZ"), !isMobile()) try {
        renderer.domElement.requestPointerLock(), mouseLocked = !0, document.getElementById("crosshair").style.display = "block"
    } catch (e) {
        addMessage("Pointer lock failed. Serve over HTTPS or ensure allow-pointer-lock is set in iframe.", 3e3)
    }
    player.yaw = 0, player.pitch = 0, lastFrame = performance.now(), lastRegenTime = lastFrame;
    registerKeyEvents();
    console.log("[LOGIN] Starting game loop"), requestAnimationFrame(gameLoop), addMessage("Welcome — world wraps at edges. Toggle camera with T. Good luck!", 5e3);
    var d = document.getElementById("health");
    d && (d.innerText = player.health);
    var c = document.getElementById("score");
    c && (c.innerText = player.score), initServers(), worker.postMessage({
        type: "sync_processed",
        ids: Array.from(processedMessages)
    }), startWorker(), setInterval(pollServers, POLL_INTERVAL), setInterval(scanExpiredOwnership, 600000), addMessage("Joined world " + worldName + " as " + userName, 3e3), initialTeleportLocation && (respawnPlayer(initialTeleportLocation.x, initialTeleportLocation.y, initialTeleportLocation.z), initialTeleportLocation = null)
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
async function initAudio() {
    try {
        localAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: !0,
                noiseSuppression: !0,
                autoGainControl: !0
            }
        })
    } catch (e) {
        console.error("Error accessing microphone:", e), addMessage("Microphone access denied. Proximity chat will be disabled.", 5e3)
    }
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

function switchWorld(newWorldName) {
    worldArchetype = null;
    const e = newWorldName || prompt("Enter the name of the world to switch to:");
    if (!e || "" === e.trim()) return void addMessage("World name cannot be empty.", 3e3);

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

    // Clear other world-specific data
    hiveLocations = [];
    flowerLocations = [];
    torchRegistry.clear();
    torchLights.clear();
    torchParticles.forEach(p => scene.remove(p));
    torchParticles.clear();

    worldName = e.slice(0, 8), worldSeed = worldName, chunkManager.chunks.clear(), meshGroup.children.forEach(disposeObject), meshGroup.children = [], mobs.forEach((e => scene.remove(e.mesh))), mobs = [], skyProps && (skyProps.suns.forEach((e => scene.remove(e.mesh))), skyProps.moons.forEach((e => scene.remove(e.mesh)))), stars && scene.remove(stars), clouds && scene.remove(clouds), document.getElementById("worldLabel").textContent = worldName;
    const t = calculateSpawnPoint(userName + "@" + worldName);
    player.x = t.x, player.y = t.y, player.z = t.z, spawnPoint = {
        x: player.x,
        y: player.y,
        z: player.z
    }, chunkManager = new ChunkManager(worldSeed), initSky();
    const o = Math.floor(t.x / CHUNK_SIZE),
        a = Math.floor(t.z / CHUNK_SIZE);
    
    // Assign home spawn ownership for the new world
    const homeChunkKey = makeChunkKey(worldName, o, a);
    updateChunkOwnership(homeChunkKey, userName, Date.now(), 'home');
    console.log(`[Ownership] Home spawn chunk ${homeChunkKey} assigned to ${userName} after world switch`);
    
    // Update spawnChunks map with new world data
    spawnChunks.set(userName, {
        cx: o,
        cz: a,
        username: userName,
        world: worldName,
        spawn: t
    });
    
    chunkManager.preloadChunks(o, a, LOAD_RADIUS), addMessage(`Switched to world: ${worldName}`, 4e3)

    for (const [peerUsername, peer] of peers.entries()) {
        if (peer.dc && peer.dc.readyState === 'open') {
            peer.dc.send(JSON.stringify({
                type: 'world_switch',
                world: worldName,
                username: userName
            }));
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
        isMobile() ? (joystick.up && (i -= 1), joystick.down && (i += 1), joystick.left && (s -= 1), joystick.right && (s += 1)) : (keys.w && (i += 1), keys.s && (i -= 1), keys.a && (s -= 1), keys.d && (s += 1), i <= 0 && isSprinting && (isSprinting = !1, addMessage("Sprinting disabled", 1500)), "first" === cameraMode && (keys.arrowup && (player.pitch += .02), keys.arrowdown && (player.pitch -= .02), keys.arrowleft && (player.yaw += .02), keys.arrowright && (player.yaw -= .02), player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch)), camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"))), "first" === cameraMode ? a = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0, "YXZ")) : (a = new THREE.Vector3, camera.getWorldDirection(a)), a.y = 0, a.normalize(), n = (new THREE.Vector3).crossVectors(a, new THREE.Vector3(0, 1, 0));
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
        checkCollision(player.x, p, player.z) ? u < 0 ? (player.y = Math.ceil(p - .001), player.vy = 0, player.onGround = !0) : u > 0 && (player.y = Math.floor(p + player.height) - player.height, player.vy = 0) : (player.y = p, player.onGround = !1), checkCollision(player.x, player.y, player.z) && (pushPlayerOut() || (player.y = chunkManager.getSurfaceY(player.x, player.z) + 1, player.vy = 0, player.onGround = !0, addMessage("Stuck in block, respawned")));
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
        if (h && (h.innerText = Math.floor(player.x) + ", " + Math.floor(player.y) + ", " + Math.floor(player.z)), "third" === cameraMode) controls.target.set(player.x + player.width / 2, player.y + .6, player.z + player.depth / 2), controls.update();
        else {
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
            if (o.mesh.position.y > a + .25 ? o.mesh.position.y -= 4 * t : o.mesh.position.y = a + .25, o.light.position.copy(o.mesh.position), Date.now() - o.createdAt > 3e5) {
                scene.remove(o.mesh), scene.remove(o.light), droppedItems.splice(e, 1);
                continue
            }
            if (o.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y + .9, player.z)) < 1.5) {
                if (o.dropper === userName && Date.now() - o.createdAt < 2e3) continue;
                addToInventory(o.blockId, 1, o.originSeed), scene.remove(o.mesh), scene.remove(o.light), droppedItems.splice(e, 1);
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

                if (mediaElement && stone.autoplay) {
                    if (distance <= stone.distance) {
                        if (mediaElement.paused) {
                            mediaElement.play().catch(e => console.error("Autoplay failed:", e));
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
        var t = document.getElementById("announceLoginBtn"),
            o = document.getElementById("newUserJoinScriptBtn"),
            a = document.getElementById("acceptAll"),
            n = document.getElementById("pendingModal"),
            r = document.getElementById("loginOverlay");
        if (!(e && t && o && r)) return console.error("[SYSTEM] Login buttons or overlay not found in DOM"), void addMessage("UI initialization failed: buttons or overlay missing", 3e3);
        a ? a.addEventListener("change", (function (e) {
            document.querySelectorAll(".selectOffer").forEach((function (t) {
                t.checked = e.target.checked
            })), console.log("[MODAL] Accept All checkbox changed")
        })) : console.warn("[MODAL] acceptAll element not found"), n ? (n.addEventListener("click", (function (e) {
            e.stopPropagation()
        })), console.log("[MODAL] Pending modal click listener added")) : console.warn("[MODAL] pendingModal element not found"), e.addEventListener("click", startGame), t.addEventListener("click", (async function () {
            this.blur(), console.log("[LOGIN] Announce Server button clicked"), isPromptOpen = !0;
            var e = document.getElementById("worldNameInput").value,
                t = document.getElementById("userInput").value;
            if (e.length > 8) addMessage("World name too long (max 8 chars)", 3e3);
            else if (t.length > 20) addMessage("Username too long (max 20 chars)", 3e3);
            else if (e && t) {
                var o = e.slice(0, 8),
                    u = t.slice(0, 20),
                    a = makePeerKeyword(o, u),
                    n = await GetPublicAddressByKeyword(a);
                document.getElementById("joinScriptText").value = n ? n.trim().replace(/^"|"$/g, "") : a, document.getElementById("joinScriptModal").style.display = "block", document.getElementById("joinScriptModal").querySelector("h3").innerText = "Announce Server", document.getElementById("joinScriptModal").querySelector("p").innerText = "Copy this address and paste it into a Sup!? message To: field, attach a server JSON file after starting, and click 📢 to announce your server. Keyword: " + a, addMessage("Prepare to announce server after starting", 3e3)
            } else addMessage("Please enter a world and username", 3e3)
        })), o.addEventListener("click", (async function () {
            this.blur(), console.log("[LOGIN] Create Join Script button clicked"), isPromptOpen = !0;
            var e = document.getElementById("worldNameInput").value,
                t = document.getElementById("userInput").value;
            if (e.length > 8) addMessage("World name too long (max 8 chars)", 3e3);
            else if (t.length > 20) addMessage("Username too long (max 20 chars)", 3e3);
            else if (e && t) {
                var o = e.slice(0, 8),
                    a = t.slice(0, 20),
                    n = a + "@" + o,
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
            this.blur(), isPromptOpen = !0, document.getElementById("teleportX").value = "", document.getElementById("teleportY").value = "", document.getElementById("teleportZ").value = ""
        })), document.getElementById("saveChangesBtn").addEventListener("click", downloadSession), document.getElementById("joinScriptBtn").addEventListener("click", (async function () {
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
        })), document.getElementById("closeInventory").addEventListener("click", (function () {
            toggleInventory(), this.blur()
        })), document.getElementById("closeJoinScript").addEventListener("click", (function () {
            isPromptOpen = !1, isConnecting = !1, document.getElementById("joinScriptModal").style.display = "none", this.blur()
        })), document.getElementById("closeDownloadModal").addEventListener("click", (function () {
            isPromptOpen = !1, document.getElementById("downloadModal").style.display = "none", this.blur()
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
                        var n = a.URN.replace(/[^a-zA-Z0-9]/g, ""),
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
                        if (!i.includes("MCUserJoin@")) {
                            console.log("[USERS] Skipping message: Invalid keyword:", i);
                            continue
                        }
                        var l = i.split("@")[1].replace(/[^a-zA-Z0-9]/g, "");
                        n && l && (console.log("[USERS] Adding user:", n, "to world:", l), knownWorlds.has(l) ? knownWorlds.get(l).users.add(n) : knownWorlds.set(l, {
                            discoverer: n,
                            users: new Set([n]),
                            toAddress: o.ToAddress
                        }), knownUsers.has(n) || knownUsers.set(n, o.FromAddress), spawnChunks.set(n, {
                            cx: null,
                            cz: null,
                            username: n,
                            world: l
                        }), processedMessages.add(o.TransactionId))
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
                        applySaveFile(JSON.parse(e.target.result), "local", (new Date).toISOString())
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
                        applySaveFile(JSON.parse(e.target.result), "local", new Date().toISOString());
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

    if (isSmallScreen && isPortrait) {
        hud.style.display = 'none';
        mobileControls.style.display = 'flex';
        mobileRight.style.display = 'flex';
        hotbar.classList.add('mobile-hotbar');
        updateHotbarSlots(4);
        mobileModeToggle.style.display = 'none';
    } else {
        mobileModeToggle.style.display = 'block';
        if (mobileModeActive) {
            hud.style.display = 'none';
            mobileControls.style.display = 'flex';
            mobileRight.style.display = 'flex';
            rightPanel.classList.add('minimap-small');
        } else {
            hud.style.display = 'block';
            mobileControls.style.display = 'none';
            mobileRight.style.display = 'none';
            rightPanel.classList.remove('minimap-small');
        }
        hotbar.classList.remove('mobile-hotbar');
        updateHotbarSlots(9);
    }
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
