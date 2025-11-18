var scene, camera, renderer, controls, meshGroup, chunkManager, sun, moon, stars, clouds, emberTexture, knownWorlds = new Map,
    knownUsers = new Map,
    keywordCache = new Map,
    processedMessages = new Set,
    isInitialLoad = !1,
    MASTER_WORLD_KEY = "MCWorlds",
    PENDING_PERIOD = 2592e6,
    OWNERSHIP_EXPIRY = 31536e6,
    API_CALLS_PER_SECOND = 3,
    POLL_RADIUS = 2,
    INITIAL_LOAD_RADIUS = 9,
    LOAD_RADIUS = 3,
    currentLoadRadius = INITIAL_LOAD_RADIUS,
    CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE),
    VERSION = "SupGalaxy v0.5.5-beta", // Contributed to by Jules
    POLL_INTERVAL = 3e4,
    MAX_PEERS = 10,
    RECIPES = [{
        id: "glass",
        out: {
            id: 100,
            count: 4
        },
        requires: {
            5: 2,
            11: 1
        }
    }, {
        id: "stained_red",
        out: {
            id: 101,
            count: 2
        },
        requires: {
            100: 1,
            12: 1
        }
    }, {
        id: "stained_blue",
        out: {
            id: 102,
            count: 2
        },
        requires: {
            100: 1,
            116: 1
        }
    }, {
        id: "stained_green",
        out: {
            id: 103,
            count: 2
        },
        requires: {
            100: 1,
            8: 1
        }
    }, {
        id: "stained_yellow",
        out: {
            id: 104,
            count: 2
        },
        requires: {
            100: 1,
            5: 1
        }
    }, {
        id: "brick",
        out: {
            id: 105,
            count: 4
        },
        requires: {
            13: 2,
            4: 1
        }
    }, {
        id: "smooth_stone",
        out: {
            id: 106,
            count: 4
        },
        requires: {
            4: 4
        }
    }, {
        id: "concrete",
        out: {
            id: 107,
            count: 4
        },
        requires: {
            4: 2,
            5: 2
        }
    }, {
        id: "polished_wood",
        out: {
            id: 108,
            count: 2
        },
        requires: {
            7: 2
        }
    }, {
        id: "marble",
        out: {
            id: 109,
            count: 1
        },
        requires: {
            4: 3,
            10: 1
        }
    }, {
        id: "obsidian",
        out: {
            id: 110,
            count: 1
        },
        requires: {
            4: 4
        },
        requiresOffWorld: {
            4: 2
        }
    }, {
        id: "crystal_blue",
        out: {
            id: 111,
            count: 1
        },
        requires: {
            100: 1,
            116: 1
        }
    }, {
        id: "crystal_purple",
        out: {
            id: 112,
            count: 1
        },
        requires: {
            100: 1,
            11: 1
        }
    }, {
        id: "crystal_green",
        out: {
            id: 113,
            count: 1
        },
        requires: {
            100: 1,
            8: 1
        }
    }, {
        id: "light_block",
        out: {
            id: 114,
            count: 1
        },
        requires: {
            100: 1,
            11: 1
        }
    }, {
        id: "glow_brick",
        out: {
            id: 115,
            count: 1
        },
        requires: {
            105: 1,
            11: 1
        }
    }, {
        id: "dark_glass",
        out: {
            id: 116,
            count: 1
        },
        requires: {
            100: 1,
            11: 1
        }
    }, {
        id: "glass_tile",
        out: {
            id: 117,
            count: 2
        },
        requires: {
            100: 2
        }
    }, {
        id: "sandstone",
        out: {
            id: 118,
            count: 2
        },
        requires: {
            5: 2
        }
    }, {
        id: "cobblestone",
        out: {
            id: 119,
            count: 4
        },
        requires: {
            4: 4
        }
    }, {
        id: "torch",
        out: {
            id: 120,
            count: 4
        },
        requires: {
            11: 1,
            8: 1
        }
    }, {
        id: "laser_gun",
        out: {
            id: 121,
            count: 1
        },
        requires: {
            111: 1,
            11: 1,
            106: 1
        }
    }, {
        id: "green_laser_gun",
        out: {
            id: 126,
            count: 1
        },
        requires: {
            121: 1,
            113: 1,
            16: 1
        }
    }, {
        id: "magicians_stone",
        out: {
            id: 127,
            count: 1
        },
        requires: {
            5: 4
        }
    }],
    raycaster = new THREE.Raycaster,
    pointer = new THREE.Vector2(0, 0),
    WORLD_STATES = new Map,
    worldSeed = "KANYE",
    worldName = "KANYE",
    userName = "player",
    userAddress = "anonymous",
    player = {
        x: 0,
        y: 24,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        onGround: !1,
        health: 20,
        score: 0,
        width: .8,
        height: 1.8,
        depth: .8,
        yaw: 0,
        pitch: 0
    },
    isAttacking = !1,
    attackStartTime = 0,
    useGreedyMesher = !1,
    isSprinting = !1,
    lastWPress = 0,
    sprintStartPosition = new THREE.Vector3,
    previousIsSprinting = !1,
    lastSentPosition = {
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        pitch: 0
    },
    lastUpdateTime = 0,
    lastStateUpdateTime = 0,
    spawnPoint = {
        x: 0,
        y: 0,
        z: 0
    },
    lastSavedPosition = new THREE.Vector3(0, 24, 0),
    selectedBlockId = null,
    selectedHotIndex = 0,
    selectedInventoryIndex = -1,
    hotbarOffset = 0,
    cameraMode = "third",
    mobs = [],
    lastDamageTime = 0,
    lastRegenTime = 0,
    joystick = {
        up: !1,
        down: !1,
        left: !1,
        right: !1
    },
    lastFrame = performance.now(),
    mouseLocked = !1,
    lastMobBatchTime = 0,
    lastMobManagement = 0,
    lastVolcanoManagement = 0,
    deathScreenShown = !1,
    isDying = !1,
    isNight = !1,
    mobileModeActive = !1,
    deathAnimationStart = 0,
    lastPollPosition = new THREE.Vector3,
    pauseTimer = 0,
    lastMoveTime = 0,
    hasMovedSubstantially = !1,
    soundBreak = document.getElementById("soundBreak"),
    soundPlace = document.getElementById("soundPlace"),
    soundJump = document.getElementById("soundJump"),
    soundHit = document.getElementById("soundHit"),
    pending = (knownWorlds = new Map, knownUsers = new Map, new Set),
    spawnChunks = new Map,
    chunkOwners = new Map,
    apiCallTimestamps = [],
    audioErrorLogged = !1,
    textureCache = new Map,
    torchRegistry = new Map,
    torchLights = new Map,
    torchParticles = new Map,
    INVENTORY = new Array(36).fill(null),
    isPromptOpen = !1,
    craftingState = null,
    worldArchetype = null,
    gravity = 16,
    projectiles = [],
    laserQueue = [],
laserFireQueue = [],
lastLaserBatchTime = 0,
    droppedItems = [],
    eruptedBlocks = [],
    pebbles = [],
    smokeParticles = [],
    activeEruptions = [],
    hiveLocations = [],
    flowerLocations = [];

function getCurrentWorldState() {
    if (!WORLD_STATES.has(worldName)) {
        WORLD_STATES.set(worldName, {
            chunkDeltas: new Map,
            foreignBlockOrigins: new Map
        });
    }
    return WORLD_STATES.get(worldName);
}

var crackTexture, damagedBlocks = new Map,
    crackMeshes = new THREE.Group,
    blockParticles = [];
const maxAudioDistance = 32,
    rolloffFactor = 2;
var volcanoes = [],
    initialTeleportLocation = null,
    magicianStonePlacement = null,
    magicianStones = {};
const lightManager = {
    lights: [],
    poolSize: 8,
    init: function () {
        for (let e = 0; e < this.poolSize; e++) {
            const e = new THREE.PointLight(16755251, 0, 0);
            e.castShadow = !1, this.lights.push(e), scene.add(e)
        }
    },
    update: function (e) {
        const t = Array.from(torchRegistry.values()).sort(((t, o) => e.distanceTo(new THREE.Vector3(t.x, t.y, t.z)) - e.distanceTo(new THREE.Vector3(o.x, o.y, o.z))));
        for (let e = 0; e < this.poolSize; e++)
            if (e < t.length) {
                const o = t[e],
                    a = this.lights[e];
                a.position.set(o.x + .5, o.y + .5, o.z + .5), a.intensity = .8, a.distance = 16
            } else this.lights[e].intensity = 0
    }
};

function simpleHash(e) {
    let t = 0;
    for (let o = 0; o < e.length; o++) {
        t = (t << 5) - t + e.charCodeAt(o), t |= 0
    }
    return Math.abs(t)
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
        for (var r of e.deltas) {
            s = r.chunk.replace(/^#/, ""), i = r.changes;
            var m = chunkOwners.get(s) || {
                username: "",
                timestamp: 0,
                pending: !0
            };
            !m.username || m.username === u || p - m.timestamp >= OWNERSHIP_EXPIRY ? (chunkManager.applyDeltasToChunk(s, i), chunkOwners.set(s, {
                username: u,
                timestamp: new Date(o).getTime(),
                pending: p - new Date(o).getTime() < PENDING_PERIOD
            }), addMessage("Updated chunk " + s, 1e3)) : addMessage("Cannot edit chunk " + s + ": owned by another user", 3e3)
        }
        if (e.magicianStones) {
            for (const key in e.magicianStones) {
                if (Object.hasOwnProperty.call(e.magicianStones, key)) {
                    createMagicianStoneScreen(e.magicianStones[key]);
                }
            }
        }
        e.profile && t === userAddress && (lastSavedPosition = new THREE.Vector3(e.profile.x, e.profile.y, e.profile.z), updateHotbarUI())
    }
}

function checkChunkOwnership(e, t) {
    if (peers.size > 0 && !isHost) {
        return true;
    }
    const o = e.replace(/^#/, "");
    if (spawnChunks.size > 0)
        for (const [e, a] of spawnChunks) {
            const n = parseChunkKey(o);
            if (!n) return !1;
            if (a.cx === n.cx && a.cz === n.cz && e !== t) return !1
        }
    const a = chunkOwners.get(o);
    if (!a) return !0;
    const n = Date.now();
    return n - a.timestamp > OWNERSHIP_EXPIRY || (!!(a.pending && n - a.timestamp < PENDING_PERIOD) || a.username === t)
}
var avatarGroup, chunkOwnership = new Map;

function updateChunkOwnership(e, t, o) {
    try {
        chunkOwnership.set(e, {
            username: t,
            timestamp: o
        })
    } catch (e) {
        console.error("[ChunkManager] Failed to update chunk ownership:", e)
    }
}

function applyChunkUpdates(e, t, o, a, sourceUsername) {
    try {
        for (var n of e) {
            var r = n.chunk,
                s = n.changes;
            if (chunkManager) {
                const worldNameFromChunk = parseChunkKey(r)?.world;
                if (worldNameFromChunk) {
                    if (!WORLD_STATES.has(worldNameFromChunk)) {
                        WORLD_STATES.set(worldNameFromChunk, {
                            chunkDeltas: new Map(),
                            foreignBlockOrigins: new Map()
                        });
                    }
                    const worldState = WORLD_STATES.get(worldNameFromChunk);
                    if (!worldState.chunkDeltas.has(r)) {
                        worldState.chunkDeltas.set(r, []);
                    }
                    worldState.chunkDeltas.get(r).push(...s);
                }
                chunkManager.applyDeltasToChunk(r, s), chunkManager.markDirty(r)
            } else console.error("[ChunkManager] chunkManager not defined")
        }

        const dataString = JSON.stringify(e);
        const chunkSize = 16384; // 16KB chunks
        const chunks = [];
        for (let i = 0; i < dataString.length; i += chunkSize) {
            chunks.push(dataString.slice(i, i + chunkSize));
        }

        function sendChunksAsync(peer, messageType, chunks, transactionId) {
            let i = 0;
            const highWaterMark = 1024 * 1024; // 1 MB buffer threshold

            function sendChunk() {
                if (!peer.dc || peer.dc.readyState !== 'open' || i >= chunks.length) return;

                // Check if buffer is full and wait if necessary
                if (peer.dc.bufferedAmount > highWaterMark) {
                    peer.dc.onbufferedamountlow = () => {
                        peer.dc.onbufferedamountlow = null;
                        setTimeout(sendChunk, 0); // Yield before sending next chunk
                    };
                    return;
                }

                // Send one chunk
                peer.dc.send(JSON.stringify({
                    type: messageType,
                    transactionId: transactionId,
                    index: i,
                    chunk: chunks[i],
                    total: chunks.length
                }));
                i++;

                // Yield to the event loop before sending the next chunk
                setTimeout(sendChunk, 0);
            }

            sendChunk(); // Start the sending process
        }

        if (isHost) {
            const startMessage = JSON.stringify({
                type: 'ipfs_chunk_update_start',
                total: chunks.length,
                fromAddress: t,
                timestamp: o,
                transactionId: a
            });
            for (const [peerUsername, peer] of peers.entries()) {
                if (peerUsername !== sourceUsername && peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(startMessage);
                    sendChunksAsync(peer, 'ipfs_chunk_update_chunk', chunks, a);
                }
            }
        } else if (sourceUsername === undefined) {
             const startMessage = JSON.stringify({
                type: 'ipfs_chunk_from_client_start',
                total: chunks.length,
                fromAddress: t,
                timestamp: o,
                transactionId: a
            });
            for (const [, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(startMessage);
                    sendChunksAsync(peer, 'ipfs_chunk_from_client_chunk', chunks, a);
                }
            }
        }

        worker.postMessage({
            type: "update_processed",
            transactionIds: [a]
        });

        const message = JSON.stringify({
            type: 'processed_transaction_id',
            transactionId: a
        });
        for (const [, peer] of peers.entries()) {
            if (peer.dc && peer.dc.readyState === 'open') {
                peer.dc.send(message);
            }
        }
    } catch (e) {
        console.error("[ChunkManager] Failed to apply chunk updates:", e)
    }
}

function drawCracksOnCanvas(canvas) {
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; // More opaque
    ctx.lineWidth = 1; // Thinner
    ctx.beginPath();

    const centerX = size / 2;
    const centerY = size / 2;

    // Draw 2 new major cracks each time this is called
    for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const length = (Math.random() * 0.4 + 0.1) * size;

        ctx.moveTo(centerX, centerY);
        const endX = centerX + length * Math.cos(angle);
        const endY = centerY + length * Math.sin(angle);
        ctx.lineTo(endX, endY);

        // Add smaller splinters
        for (let j = 0; j < Math.random() * 2; j++) {
            ctx.moveTo(endX, endY);
            const splinterAngle = angle + (Math.random() - 0.5) * (Math.PI / 2);
            const splinterLength = length * (Math.random() * 0.3 + 0.3);
            ctx.lineTo(endX + splinterLength * Math.cos(splinterAngle), endY + splinterLength * Math.sin(splinterAngle));
        }
    }
    ctx.stroke();
}

function createBlockParticles(e, t, o, a) {
    const n = BLOCKS[a];
    if (!n) return;
    const r = createBlockTexture(worldSeed, a);
    for (let s = 0; s < 10; s++) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshBasicMaterial({
            map: r
        }));
        a.position.set(e + .5, t + .5, o + .5);
        const i = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2);
        blockParticles.push({
            mesh: a,
            velocity: i,
            createdAt: Date.now()
        }), scene.add(a)
    }
}

function createFlameParticles(e, t, o) {
    const a = new THREE.BufferGeometry,
        n = new Float32Array(60),
        r = [];
    for (let a = 0; a < 20; a++) n[3 * a] = e, n[3 * a + 1] = t, n[3 * a + 2] = o, r.push({
        x: .01 * (Math.random() - .5),
        y: .05 * Math.random(),
        z: .01 * (Math.random() - .5),
        life: 1 * Math.random()
    });
    a.setAttribute("position", new THREE.BufferAttribute(n, 3)), a.velocities = r;
    const s = new THREE.PointsMaterial({
        color: 16755251,
        size: .2,
        transparent: !0,
        blending: THREE.AdditiveBlending,
        depthWrite: !1
    }),
        i = new THREE.Points(a, s);
    return i.position.set(e, t, o), i
}

function createSmokeParticle(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = [],
        i = new Float32Array(a);
    for (let n = 0; n < a; n++) r[3 * n] = e + 10 * (Math.random() - .5), r[3 * n + 1] = t + 5 * (Math.random() - .5), r[3 * n + 2] = o + 10 * (Math.random() - .5), i[n] = 1, s.push({
        x: 4 * (Math.random() - .5),
        y: 10 + 15 * Math.random(),
        z: 4 * (Math.random() - .5),
        life: 6 + 6 * Math.random()
    });
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(i, 1)), n.velocities = s;
    const l = new THREE.PointsMaterial({
        size: 4,
        map: new THREE.CanvasTexture(document.createElement("canvas")),
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0,
        color: 8947848
    }),
        d = document.createElement("canvas");
    d.width = 64, d.height = 64;
    const c = d.getContext("2d"),
        u = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    u.addColorStop(0, "rgba(200, 200, 200, 0.5)"), u.addColorStop(1, "rgba(200, 200, 200, 0)"), c.fillStyle = u, c.fillRect(0, 0, 64, 64), l.map.image = d, l.map.needsUpdate = !0;
    const p = new THREE.Points(n, l);
    return p.position.set(0, 0, 0), p
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

function safePlayAudio(e) {
    if (e) {
        var t = e.play();
        void 0 !== t && t.catch((function (e) {
            audioErrorLogged || (addMessage("Audio playback issue detected", 3e3), audioErrorLogged = !0)
        }))
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
