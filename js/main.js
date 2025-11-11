var scene, camera, renderer, controls, meshGroup, chunkManager, sun, moon, stars, clouds, emberTexture, knownWorlds = new Map,
    knownUsers = new Map,
    keywordCache = new Map,
    processedMessages = new Set,
    isInitialLoad = !1,
    CHUNK_SIZE = 16,
    MAX_HEIGHT = 256,
    SEA_LEVEL = 16,
    MAP_SIZE = 16384,
    BLOCK_AIR = 0,
    MASTER_WORLD_KEY = "MCWorlds",
    PENDING_PERIOD = 2592e6,
    OWNERSHIP_EXPIRY = 31536e6,
    API_CALLS_PER_SECOND = 3,
    POLL_RADIUS = 2,
    INITIAL_LOAD_RADIUS = 9,
    LOAD_RADIUS = 3,
    currentLoadRadius = INITIAL_LOAD_RADIUS,
    CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE),
    VERSION = "SupGalaxy v0.4.21-beta",
    POLL_INTERVAL = 3e4,
    MAX_PEERS = 10,
    BLOCKS = {
        1: {
            name: "Bedrock",
            color: "#0b0b0b",
            strength: 5
        },
        2: {
            name: "Grass",
            color: "#3fb34f",
            strength: 1
        },
        3: {
            name: "Dirt",
            color: "#7a4f29",
            strength: 1
        },
        4: {
            name: "Stone",
            color: "#9aa0a6",
            strength: 2
        },
        5: {
            name: "Sand",
            color: "#e7d08d",
            strength: 1
        },
        6: {
            name: "Water",
            color: "#2b9cff",
            transparent: !0,
            strength: 1
        },
        7: {
            name: "Wood",
            color: "#8b5a33",
            strength: 2
        },
        8: {
            name: "Leaves",
            color: "#2f8f46",
            strength: 1
        },
        9: {
            name: "Cactus",
            color: "#4aa24a",
            strength: 1
        },
        10: {
            name: "Snow",
            color: "#ffffff",
            strength: 1
        },
        11: {
            name: "Coal",
            color: "#1f1f1f",
            strength: 2
        },
        12: {
            name: "Flower",
            color: "#ff6bcb",
            strength: 1
        },
        13: {
            name: "Clay",
            color: "#a9b6c0",
            strength: 1
        },
        14: {
            name: "Moss",
            color: "#507d43",
            strength: 1
        },
        15: {
            name: "Gravel",
            color: "#b2b2b2",
            strength: 1
        },
        16: {
            name: "Lava",
            color: "#ff6a00",
            transparent: !0,
            strength: 1
        },
        17: {
            name: "Ice",
            color: "#a8e6ff",
            transparent: !0,
            strength: 1
        },
        100: {
            name: "Glass",
            color: "#b3e6ff",
            transparent: !0,
            strength: 1
        },
        101: {
            name: "Stained Glass - Red",
            color: "#ff4b4b",
            transparent: !0,
            strength: 1
        },
        102: {
            name: "Stained Glass - Blue",
            color: "#4b6bff",
            transparent: !0,
            strength: 1
        },
        103: {
            name: "Stained Glass - Green",
            color: "#57c84d",
            transparent: !0,
            strength: 1
        },
        104: {
            name: "Stained Glass - Yellow",
            color: "#fff95b",
            transparent: !0,
            strength: 1
        },
        105: {
            name: "Brick",
            color: "#a84f3c",
            strength: 2
        },
        106: {
            name: "Smooth Stone",
            color: "#c1c1c1",
            strength: 2
        },
        107: {
            name: "Concrete",
            color: "#888888",
            strength: 3
        },
        108: {
            name: "Polished Wood",
            color: "#a87443",
            strength: 2
        },
        109: {
            name: "Marble",
            color: "#f0f0f0",
            strength: 2
        },
        110: {
            name: "Obsidian",
            color: "#2d004d",
            strength: 5
        },
        111: {
            name: "Crystal - Blue",
            color: "#6de0ff",
            transparent: !0,
            strength: 1
        },
        112: {
            name: "Crystal - Purple",
            color: "#b26eff",
            transparent: !0,
            strength: 1
        },
        113: {
            name: "Crystal - Green",
            color: "#6fff91",
            transparent: !0,
            strength: 1
        },
        114: {
            name: "Light Block",
            color: "#fffacd",
            transparent: !0,
            strength: 1
        },
        115: {
            name: "Glow Brick",
            color: "#f7cc5b",
            strength: 1
        },
        116: {
            name: "Dark Glass",
            color: "#3a3a3a",
            transparent: !0,
            strength: 1
        },
        117: {
            name: "Glass Tile",
            color: "#aeeaff",
            transparent: !0,
            strength: 1
        },
        118: {
            name: "Sandstone",
            color: "#e3c27d",
            strength: 1
        },
        119: {
            name: "Cobblestone",
            color: "#7d7d7d",
            strength: 2
        },
        120: {
            name: "Torch",
            color: "#ff9900",
            light: !0,
            transparent: !0,
            strength: 1
        },
        121: {
            name: "Laser Gun",
            color: "#ff0000",
            hand_attachable: !0,
            strength: 1
        },
        122: {
            name: "Honey",
            color: "#ffb74a",
            strength: 1
        },
        123: {
            name: "Hive",
            color: "#e3c27d",
            strength: 2
        },
        124: {
            name: "Iron Ore",
            color: "#a8a8a8",
            strength: 3
        },
        125: {
            name: "Emerald",
            color: "#00ff7b",
            strength: 4
        },
        126: {
            name: "Green Laser Gun",
            color: "#00ff00",
            hand_attachable: !0,
            strength: 1
        }
    },
    BIOMES = [{
        key: "plains",
        palette: [2, 3, 4, 13, 15],
        heightScale: .8,
        roughness: .3,
        featureDensity: .05
    }, {
        key: "desert",
        palette: [5, 118, 4],
        heightScale: .6,
        roughness: .4,
        featureDensity: .02
    }, {
        key: "forest",
        palette: [2, 3, 14, 4],
        heightScale: 1.3,
        roughness: .4,
        featureDensity: .03
    }, {
        key: "snow",
        palette: [10, 17, 4],
        heightScale: 1.2,
        roughness: .5,
        featureDensity: .02
    }, {
        key: "mountain",
        palette: [4, 11, 3, 15, 1, 16],
        heightScale: 1,
        roughness: .6,
        featureDensity: .01
    }, {
        key: "swamp",
        palette: [2, 3, 6, 14, 13],
        heightScale: .5,
        roughness: .2,
        featureDensity: .04
    }],
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
    }],
    raycaster = new THREE.Raycaster,
    pointer = new THREE.Vector2(0, 0),
    CHUNK_DELTAS = new Map,
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
    foreignBlockOrigins = new Map,
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
var crackTexture, damagedBlocks = new Map,
    crackMeshes = new THREE.Group,
    blockParticles = [];
const maxAudioDistance = 32,
    rolloffFactor = 2;
var volcanoes = [],
    initialTeleportLocation = null;
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
        if (console.log("[LOGIN] Preloading initial chunks from session"), chunkManager.preloadChunks(l, d, INITIAL_LOAD_RADIUS), setupMobile(), initMinimap(), updateHotbarUI(), cameraMode = "first", controls.enabled = !1, avatarGroup.visible = !1, camera.position.set(player.x, player.y + 1.62, player.z), camera.rotation.set(0, 0, 0, "YXZ"), !isMobile()) try {
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
    if (e && (e.foreignBlockOrigins && addMessage(`Loaded ${(foreignBlockOrigins = new Map(e.foreignBlockOrigins)).size} foreign blocks.`, 2e3), e.deltas)) {
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
        e.profile && t === userAddress && (lastSavedPosition = new THREE.Vector3(e.profile.x, e.profile.y, e.profile.z), updateHotbarUI())
    }
}

function checkChunkOwnership(e, t) {
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
var skyProps, avatarGroup, chunkOwnership = new Map;

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

function applyChunkUpdates(e, t, o, a) {
    try {
        for (var n of e) {
            var r = n.chunk,
                s = n.changes;
            chunkManager ? (chunkManager.applyDeltasToChunk(r, s), chunkManager.markDirty(r)) : console.error("[ChunkManager] chunkManager not defined")
        }
        worker.postMessage({
            type: "update_processed",
            transactionIds: [a]
        })
    } catch (e) {
        console.error("[ChunkManager] Failed to apply chunk updates:", e)
    }
}

function makeSeededRandom(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return function () {
        t += 1831565813;
        var e = Math.imul(t ^ t >>> 15, 1 | t);
        return (((e ^= e + Math.imul(e ^ e >>> 7, 61 | e)) ^ e >>> 14) >>> 0) / 4294967296
    }
}

function makeNoise(e) {
    makeSeededRandom(e);
    var t = {};

    function o(o, a) {
        var n = o + "," + a;
        if (void 0 !== t[n]) return t[n];
        var r = makeSeededRandom(e + "|" + o + "," + a)();
        return t[n] = r
    }

    function a(e, t, o) {
        return e + o * (o * (3 - 2 * o)) * (t - e)
    }
    return function (e, t) {
        var n = Math.floor(e),
            r = Math.floor(t),
            s = e - n,
            i = t - r,
            l = o(n, r),
            d = o(n + 1, r),
            c = o(n, r + 1),
            u = o(n + 1, r + 1),
            p = a(l, d, s),
            m = a(c, u, s);
        return a(p, m, i)
    }
}

function fbm(e, t, o, a, n) {
    for (var r = 0, s = 1, i = 1, l = 0, d = 0; d < a; d++) r += s * e(t * i, o * i), l += s, s *= n, i *= 2;
    return r / l
}

function modWrap(e, t) {
    return (e % t + t) % t
}

function makeChunkKey(e, t, o) {
    return ("" + e).slice(0, 8) + ":" + t + ":" + o
}

function parseJsonChunkKey(e) {
    var t = e.match(/^#?(.{1,8}):(\d{1,5}):(\d{1,5})$/);
    return t ? {
        world: t[1],
        cx: parseInt(t[2]),
        cz: parseInt(t[3])
    } : null
}

function parseChunkKey(e) {
    var t = e.match(/^(.{1,8}):(\d{1,5}):(\d{1,5})$/);
    return t ? {
        world: t[1],
        cx: parseInt(t[2]),
        cz: parseInt(t[3])
    } : null
}

function hashSeed(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return t % MAP_SIZE
}

function calculateSpawnPoint(e) {
    var t = makeSeededRandom(e),
        o = Math.floor(t() * MAP_SIZE),
        a = Math.floor(t() * MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = chunkManager.getChunk(n, r);
    s.generated || chunkManager.generateChunk(s);
    for (var i = MAX_HEIGHT - 1; i > 0 && s.get(o % CHUNK_SIZE, i, a % CHUNK_SIZE) === BLOCK_AIR;) i--;
    return {
        x: o,
        y: i += 2,
        z: a
    }
}

function createEmberTexture(e) {
    const t = 32,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_ember"),
        r = a.createImageData(t, t),
        s = r.data,
        i = makeSeededRandom(e + "_ember_color"),
        l = [{
            r: Math.floor(100 * i()),
            g: 0,
            b: 0
        }, {
            r: 255,
            g: Math.floor(150 * i()),
            b: 0
        }, {
            r: 255,
            g: 255,
            b: Math.floor(200 * i())
        }];
    for (let e = 0; e < t; e++)
        for (let o = 0; o < t; o++) {
            const a = fbm(n, e / 8, o / 8, 3, .6),
                r = 4 * (o * t + e);
            let i, d, c;
            if (a < .5) {
                const e = a / .5;
                i = l[0].r + (l[1].r - l[0].r) * e, d = l[0].g + (l[1].g - l[0].g) * e, c = l[0].b + (l[1].b - l[0].b) * e
            } else {
                const e = (a - .5) / .5;
                i = l[1].r + (l[2].r - l[1].r) * e, d = l[1].g + (l[2].g - l[1].g) * e, c = l[1].b + (l[2].b - l[1].b) * e
            }
            s[r] = i, s[r + 1] = d, s[r + 2] = c, s[r + 3] = a > .3 ? 255 : 0
        }
    return a.putImageData(r, 0, 0), new THREE.CanvasTexture(o)
}

function createMobTexture(e, t, o = !1) {
    const a = `${e}:${t}:${o}`;
    if (textureCache.has(a)) return textureCache.get(a);
    const n = 16,
        r = document.createElement("canvas");
    r.width = n, r.height = n;
    const s = r.getContext("2d"),
        i = makeSeededRandom(e + "_mob_texture_" + t);
    let l, d;
    t.includes("body") ? (l = (new THREE.Color).setHSL(i(), .2 + .8 * i(), .2 + .6 * i()), d = l.clone().multiplyScalar(.7 + .2 * i())) : (l = (new THREE.Color).setHSL(.1 * i() + .05, .2 + .2 * i(), .2 + .1 * i()), d = l.clone().multiplyScalar(1.2 + .2 * i())), s.fillStyle = l.getStyle(), s.fillRect(0, 0, n, n);
    const c = makeNoise(e + "_mob_pattern_" + t);
    for (let e = 0; e < 50; e++) {
        const e = Math.floor(i() * n),
            t = Math.floor(i() * n),
            o = c(e / n, t / n) > .5 ? d : l.clone().lerp(d, .5);
        s.fillStyle = o.getStyle(), s.fillRect(e, t, 1, 1)
    }
    if (o) {
        const e = (new THREE.Color).setHSL(i(), .5 + .3 * i(), .2 + .2 * i());
        s.fillStyle = e.getStyle(), s.fillRect(0, 0, n, 1), s.fillRect(0, 15, n, 1), s.fillRect(0, 0, 1, n), s.fillRect(15, 0, 1, n)
    }
    const u = new THREE.CanvasTexture(r);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(a, u), u
}

function createBlockTexture(e, t) {
    const o = `${e}:${t}`;
    if (textureCache.has(o)) return textureCache.get(o);
    const a = 16,
        n = document.createElement("canvas");
    n.width = a, n.height = a;
    const r = n.getContext("2d"),
        s = makeSeededRandom(e + "_block_texture_" + t),
        i = new THREE.Color(BLOCKS[t].color);
    let l = (new THREE.Color).setHSL(s(), .5 + .3 * s(), .2 + .3 * s());
    r.fillStyle = i.getStyle(), r.fillRect(0, 0, a, a);
    const d = Math.floor(5 * s()),
        c = makeNoise(e + "_pattern_noise_" + t);
    if (r.strokeStyle = l.getStyle(), r.lineWidth = 1 + Math.floor(2 * s()), 0 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(t / 8, e / 8) > .4 && (r.moveTo(t, e), r.lineTo(t + 1, e));
            r.stroke()
        } else if (1 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(e / 8, t / 8) > .4 && (r.moveTo(e, t), r.lineTo(e, t + 1));
            r.stroke()
        } else if (2 === d)
        for (let e = -16; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < 32; t++) c(e / 8, t / 8) > .6 && (r.moveTo(e + t, t), r.lineTo(e + t + 1, t + 1));
            r.stroke()
        } else if (3 === d)
        for (let e = 0; e < a; e += 4) {
            r.beginPath(), r.moveTo(0, e);
            for (let t = 0; t < a; t++) {
                const o = 2 * Math.sin(t / 4 + 10 * s());
                c(t / 8, e / 8) > .3 ? r.lineTo(t, e + o) : r.moveTo(t, e + o)
            }
            r.stroke()
        }
    if (s() > .8) {
        const e = i.clone().multiplyScalar(.7);
        r.strokeStyle = e.getStyle(), r.lineWidth = 1, r.strokeRect(.5, .5, 15, 15)
    }
    const u = new THREE.CanvasTexture(n);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(o, u), u
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

function createCloudTexture(e) {
    const t = 256,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_clouds");
    for (let e = 0; e < t; e++)
        for (let o = 0; o < t; o++) {
            const t = 255 * fbm(n, e / 32, o / 32, 4, .5),
                r = Math.max(0, t - 128);
            a.fillStyle = `rgba(255, 255, 255, ${r / 128})`, a.fillRect(e, o, 1, 1)
        }
    return new THREE.CanvasTexture(o)
}

function initSky() {
    const e = makeSeededRandom(worldSeed + "_sky"),
        t = e(),
        o = .5 + .5 * e(),
        a = .6 + .2 * e(),
        n = .05 + .05 * e();
    skyProps = {
        dayColor: (new THREE.Color).setHSL(t, o, a),
        nightColor: (new THREE.Color).setHSL(t, .8 * o, n),
        cloudColor: (new THREE.Color).setHSL(e(), .2 + .3 * e(), .8),
        suns: [],
        moons: []
    };
    const r = 1 + Math.floor(3 * e());
    for (let t = 0; t < r; t++) {
        const t = 80 + 120 * e(),
            o = (new THREE.Color).setHSL(e(), .8 + .2 * e(), .6 + .2 * e()),
            a = new THREE.Mesh(new THREE.SphereGeometry(t, 32, 32), new THREE.MeshBasicMaterial({
                color: o
            }));
        skyProps.suns.push({
            mesh: a,
            angleOffset: e() * Math.PI * 2
        }), scene.add(a)
    }
    const s = Math.floor(4 * e());
    for (let t = 0; t < s; t++) {
        const o = 40 + 60 * e(),
            a = (new THREE.Color).setHSL(e(), .1 + .2 * e(), .7 + .2 * e()),
            n = new THREE.SphereGeometry(o, 32, 32),
            r = makeNoise(worldSeed + "_moon_" + t),
            s = n.attributes.position,
            i = new THREE.Vector3;
        for (let e = 0; e < s.count; e++) {
            i.fromBufferAttribute(s, e);
            const t = .8,
                o = fbm(r, .05 * i.x, .05 * i.y, 3, .5) + fbm(r, .05 * i.y, .05 * i.z, 3, .5) + fbm(r, .05 * i.z, .05 * i.x, 3, .5),
                a = .15 * fbm(r, .3 * i.x, .3 * i.y, 3, .5);
            i.multiplyScalar(1 + o / 3 * t - a), s.setXYZ(e, i.x, i.y, i.z)
        }
        n.computeVertexNormals();
        const l = new THREE.Mesh(n, new THREE.MeshBasicMaterial({
            color: a
        }));
        skyProps.moons.push({
            mesh: l,
            angleOffset: e() * Math.PI * 2
        }), scene.add(l)
    }
    stars = new THREE.Group;
    const i = new THREE.BufferGeometry,
        l = [],
        d = makeNoise(worldSeed + "_stars");
    for (let t = 0; t < 5e3; t++) {
        const t = e() * Math.PI * 2,
            o = Math.acos(2 * e() - 1),
            a = 4e3 * Math.sin(o) * Math.cos(t),
            n = 4e3 * Math.sin(o) * Math.sin(t),
            r = 4e3 * Math.cos(o);
        d(.005 * a, .005 * r) > .7 && l.push(a, n, r)
    }
    i.setAttribute("position", new THREE.Float32BufferAttribute(l, 3));
    const c = new THREE.PointsMaterial({
        color: 16777215,
        size: 2 + 3 * e()
    }),
        u = new THREE.Points(i, c);
    stars.add(u), scene.add(stars), clouds = new THREE.Group;
    const p = createCloudTexture(worldSeed),
        m = Math.floor(80 * e());
    for (let t = 0; t < m; t++) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(200 + 300 * e(), 100 + 150 * e()), new THREE.MeshBasicMaterial({
            map: p,
            color: skyProps.cloudColor,
            transparent: !0,
            opacity: .6 + .3 * e(),
            side: THREE.DoubleSide
        }));
        t.position.set(8e3 * (e() - .5), 200 + 150 * e(), 8e3 * (e() - .5)), t.rotation.y = e() * Math.PI * 2, clouds.add(t)
    }
    scene.add(clouds)
}

function updateSky(e) {
    const t = new Date;
    const o = (t.getHours() + t.getMinutes() / 60) / 24 * Math.PI * 2,
        a = o + (skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0),
        n = Math.sin(a);
    isNight = n < -.1, skyProps.suns.forEach((e => {
        const t = o + e.angleOffset;
        e.mesh.position.set(camera.position.x + 4e3 * Math.cos(t), camera.position.y + 4e3 * Math.sin(t), camera.position.z + 1500 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
    })), skyProps.moons.forEach((e => {
        const t = o + e.angleOffset + Math.PI;
        e.mesh.position.set(camera.position.x + 3800 * Math.cos(t), camera.position.y + 3800 * Math.sin(t), camera.position.z + 1200 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
    })), stars.visible = isNight, stars.rotation.y += .005 * e, clouds.children.forEach((t => {
        t.position.x = modWrap(t.position.x + e * (15 + 10 * Math.random()), 8e3)
    }));
    const r = Math.max(0, n);
    scene.background = (new THREE.Color).copy(skyProps.dayColor).lerp(skyProps.nightColor, 1 - r);
    let s = (n - -.2) / .4;
    s = Math.max(0, Math.min(1, s));
    const i = scene.getObjectByProperty("type", "AmbientLight"),
        l = scene.getObjectByProperty("type", "DirectionalLight"),
        d = scene.getObjectByProperty("type", "HemisphereLight");
    if (i && (i.intensity = .01 + .19 * s), l && (l.intensity = 0 + .95 * s), d) {
        const e = .6,
            t = .02;
        d.intensity = t + (e - t) * s
    }
    for (let o = blockParticles.length - 1; o >= 0; o--) {
        const a = blockParticles[o];
        a.velocity.y -= gravity * e, a.mesh.position.add(a.velocity.clone().multiplyScalar(e)), (a.mesh.position.y < -10 || Date.now() - a.createdAt > 1e3) && (scene.remove(a.mesh), disposeObject(a.mesh), blockParticles.splice(o, 1))
    }
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

function Chunk(e, t) {
    this.cx = e, this.cz = t, this.key = makeChunkKey(worldName, e, t), this.data = new Uint8Array(CHUNK_SIZE * MAX_HEIGHT * CHUNK_SIZE), this.mesh = null, this.generated = !1, this.needsRebuild = !0
}

function ChunkManager(e) {
    console.log("[WorldGen] Initializing ChunkManager with seed:", e), this.seed = e, this.noise = makeNoise(e), this.blockNoise = makeNoise(e + "_block"), this.chunks = new Map, this.lastPcx = null, this.lastPcz = null, console.log("[ChunkManager] Using existing meshGroup for chunk rendering")
}

function buildGreedyMesh(e, t, o) {
    const a = {},
        n = e.data,
        r = (e, t, o) => e < 0 || e >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT || o < 0 || o >= CHUNK_SIZE ? 0 : n[t * CHUNK_SIZE * CHUNK_SIZE + o * CHUNK_SIZE + e];
    for (let n = 0; n < 3; n++) {
        const s = (n + 1) % 3,
            i = (n + 2) % 3,
            l = [0, 0, 0],
            d = [0, 0, 0];
        d[n] = 1;
        const c = [CHUNK_SIZE, MAX_HEIGHT, CHUNK_SIZE],
            u = c[s],
            p = c[i],
            m = new Array(u * p);
        for (l[n] = -1; l[n] < c[n];) {
            let y = 0;
            for (l[i] = 0; l[i] < p; l[i]++)
                for (l[s] = 0; l[s] < u; l[s]++) {
                    const a = l[n] >= 0 ? r(l[0], l[1], l[2]) : 0,
                        s = l[n] < c[n] - 1 ? r(l[0] + d[0], l[1] + d[1], l[2] + d[2]) : 0,
                        i = BLOCKS[a] || {},
                        u = BLOCKS[s] || {},
                        p = !a || i.transparent;
                    let h = null;
                    if (p !== (!s || u.transparent))
                        if (p) {
                            const a = `${e.cx * CHUNK_SIZE + l[0] + d[0]},${l[1] + d[1]},${e.cz * CHUNK_SIZE + l[2] + d[2]}`;
                            h = `${s}-${t.get(a) || o}|-`
                        } else {
                            const n = `${e.cx * CHUNK_SIZE + l[0]},${l[1]},${e.cz * CHUNK_SIZE + l[2]}`;
                            h = `${a}-${t.get(n) || o}|+`
                        } m[y++] = h
                }
            l[n]++, y = 0;
            for (let e = 0; e < p; e++)
                for (let t = 0; t < u;) {
                    const o = m[y];
                    if (o) {
                        let r, d;
                        for (r = 1; t + r < u && m[y + r] === o; r++);
                        let c = !1;
                        for (d = 1; e + d < p; d++) {
                            for (let e = 0; e < r; e++)
                                if (m[y + e + d * u] !== o) {
                                    c = !0;
                                    break
                                } if (c) break
                        }
                        l[s] = t, l[i] = e;
                        const h = [0, 0, 0];
                        h[s] = r;
                        const f = [0, 0, 0];
                        f[i] = d;
                        const [g, E] = o.split("|"), v = "+" === E, M = [0, 0, 0];
                        M[n] = v ? 1 : -1;
                        const S = [l[0], l[1], l[2]],
                            I = [l[0] + h[0], l[1] + h[1], l[2] + h[2]],
                            k = [l[0] + f[0], l[1] + f[1], l[2] + f[2]],
                            w = [l[0] + h[0] + f[0], l[1] + h[1] + f[1], l[2] + h[2] + f[2]];
                        v && (S[n] += 1, I[n] += 1, k[n] += 1, w[n] += 1);
                        const b = new THREE.BufferGeometry,
                            x = new Float32Array([S[0], S[1], S[2], k[0], k[1], k[2], I[0], I[1], I[2], w[0], w[1], w[2]]),
                            T = new Float32Array([...M, ...M, ...M, ...M]),
                            C = new Float32Array([0, 0, 0, d, r, 0, r, d]),
                            H = v ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1];
                        if (b.setAttribute("position", new THREE.BufferAttribute(x, 3)), b.setAttribute("normal", new THREE.BufferAttribute(T, 3)), b.setAttribute("uv", new THREE.BufferAttribute(C, 2)), b.setIndex(H), !a[g]) {
                            const [e, ...t] = g.split("-");
                            a[g] = {
                                geometries: [],
                                blockId: parseInt(e),
                                seed: t.join("-")
                            }
                        }
                        a[g].geometries.push(b);
                        for (let e = 0; e < d; e++)
                            for (let t = 0; t < r; t++) m[y + t + e * u] = null;
                        t += r, y += r
                    } else t++, y++
                }
        }
    }
    const s = new THREE.Group;
    for (const e in a) {
        const t = a[e];
        if (t.geometries.length > 0) {
            const e = THREE.BufferGeometryUtils.mergeBufferGeometries(t.geometries);
            if (!e) continue;
            const o = BLOCKS[t.blockId];
            if (!o) continue;
            let a;
            if (o.light) a = new THREE.MeshBasicMaterial({
                map: emberTexture,
                transparent: !0,
                opacity: .8
            });
            else if (o.transparent) a = new THREE.MeshBasicMaterial({
                color: new THREE.Color(o.color),
                transparent: !0,
                opacity: .6,
                side: THREE.DoubleSide
            });
            else {
                const e = createBlockTexture(t.seed, t.blockId);
                a = new THREE.MeshStandardMaterial({
                    map: e
                })
            }
            const n = new THREE.Mesh(e, a);
            s.add(n)
        }
    }
    return s
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
        var a = document.createElement("div");
        a.className = "hot-label";
        var n = document.createElement("div");
        n.className = "hot-count", o.appendChild(a), o.appendChild(n), e.appendChild(o), o.addEventListener("click", (function () {
            document.querySelectorAll(".hot-slot").forEach((function (e) {
                e.classList.remove("active")
            })), this.classList.add("active"), selectedHotIndex = parseInt(this.dataset.index), updateHotbarUI()
        })), o.addEventListener("contextmenu", (function (e) {
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
Chunk.prototype.idx = function (e, t, o) {
    return (t * CHUNK_SIZE + o) * CHUNK_SIZE + e
}, Chunk.prototype.get = function (e, t, o) {
    return e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT ? BLOCK_AIR : this.data[this.idx(e, t, o)]
}, Chunk.prototype.set = function (e, t, o, a) {
    e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT || (this.data[this.idx(e, t, o)] = a, this.needsRebuild = !0)
}, ChunkManager.prototype.getChunk = function (e, t) {
    var o = Math.floor(MAP_SIZE / CHUNK_SIZE),
        a = modWrap(e, o),
        n = modWrap(t, o),
        r = makeChunkKey(worldName, a, n);
    if (this.chunks.has(r)) return this.chunks.get(r);
    var s = new Chunk(a, n);
    return this.chunks.set(s.key, s), pending.add(s.key), s
}, ChunkManager.prototype.generateChunk = function (e) {
    e.generating || e.generated || (e.generating = !0, worker.postMessage({
        type: "generate_chunk",
        key: e.key
    }))
}, ChunkManager.prototype.pickBiome = function (e) {
    return e > .68 ? BIOMES.find((function (e) {
        return "snow" === e.key
    })) || BIOMES[0] : e < .25 ? BIOMES.find((function (e) {
        return "desert" === e.key
    })) || BIOMES[1] : e > .45 ? BIOMES.find((function (e) {
        return "forest" === e.key
    })) || BIOMES[2] : e > .6 ? BIOMES.find((function (e) {
        return "mountain" === e.key
    })) || BIOMES[4] : e < .35 ? BIOMES.find((function (e) {
        return "swamp" === e.key
    })) || BIOMES[5] : BIOMES.find((function (e) {
        return "plains" === e.key
    })) || BIOMES[0]
}, ChunkManager.prototype.placeTree = function (e, t, o, a, n) {
    for (var r = 5 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 7);
    for (var i = -2; i <= 2; i++)
        for (var l = -2; l <= 2; l++)
            for (var d = 0; d <= 3; d++) {
                var c = t + i,
                    u = o + r - 2 + d,
                    p = a + l;
                u < MAX_HEIGHT && c >= 0 && c < CHUNK_SIZE && p >= 0 && p < CHUNK_SIZE && Math.abs(i) + Math.abs(l) + Math.abs(d) <= 4 && e.get(c, u, p) === BLOCK_AIR && e.set(c, u, p, 8)
            }
}, ChunkManager.prototype.placeFlower = function (e, t, o, a) {
    o < MAX_HEIGHT && e.get(t, o, a) === BLOCK_AIR && e.set(t, o, a, 12)
}, ChunkManager.prototype.placeCactus = function (e, t, o, a, n) {
    for (var r = 1 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 9)
}, ChunkManager.prototype.buildChunkMesh = function (e) {
    updateTorchRegistry(e), e.mesh && (meshGroup.remove(e.mesh), disposeObject(e.mesh), e.mesh = null);
    const t = volcanoes.find((t => t.chunkKey === e.key));
    if (t && Math.random() < .3) {
        const o = Math.floor(t.lavaCount / 4),
            a = createSmokeParticle(t.x, t.y, t.z, o);
        a.userData.chunkKey = e.key, smokeParticles.push(a), scene.add(a)
    }
    if (useGreedyMesher) {
        const t = buildGreedyMesh(e, foreignBlockOrigins, worldSeed),
            o = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE),
            a = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE);
        let n = e.cx * CHUNK_SIZE,
            r = e.cz * CHUNK_SIZE;
        return Math.abs(e.cx - o) > CHUNKS_PER_SIDE / 2 && (e.cx > o ? n -= MAP_SIZE : n += MAP_SIZE), Math.abs(e.cz - a) > CHUNKS_PER_SIDE / 2 && (e.cz > a ? r -= MAP_SIZE : r += MAP_SIZE), t.position.set(n, 0, r), e.mesh = t, meshGroup.add(e.mesh), void (e.needsRebuild = !1)
    }
    var o = {},
        a = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE),
        n = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE),
        r = e.cx * CHUNK_SIZE,
        s = e.cz * CHUNK_SIZE,
        i = r,
        l = s;
    Math.abs(e.cx - a) > CHUNKS_PER_SIDE / 2 && (e.cx > a ? i -= MAP_SIZE : i += MAP_SIZE), Math.abs(e.cz - n) > CHUNKS_PER_SIDE / 2 && (e.cz > n ? l -= MAP_SIZE : l += MAP_SIZE);
    for (var d = 0; d < CHUNK_SIZE; d++)
        for (var c = 0; c < CHUNK_SIZE; c++)
            for (var u = 0; u < MAX_HEIGHT; u++) {
                if (!(w = e.get(d, u, c)) || w === BLOCK_AIR) continue;
                for (var p = modWrap(r + d, MAP_SIZE), m = modWrap(s + c, MAP_SIZE), y = i + d, h = l + c, f = [{
                    x: 1,
                    y: 0,
                    z: 0
                }, {
                    x: -1,
                    y: 0,
                    z: 0
                }, {
                    x: 0,
                    y: 1,
                    z: 0
                }, {
                    x: 0,
                    y: -1,
                    z: 0
                }, {
                    x: 0,
                    y: 0,
                    z: 1
                }, {
                    x: 0,
                    y: 0,
                    z: -1
                }], g = BLOCKS[w] && BLOCKS[w].transparent, E = !1, v = 0; v < f.length; v++) {
                    var M = f[v],
                        S = this.getBlockGlobal(e.cx, e.cz, d + M.x, u + M.y, c + M.z);
                    if (g !== (S === BLOCK_AIR || BLOCKS[S] && BLOCKS[S].transparent) || g && w !== S) {
                        E = !0;
                        break
                    }
                }
                if (!E) continue;
                const t = `${p},${u},${m}`,
                    a = foreignBlockOrigins.get(t) || worldSeed,
                    n = `${w}-${a}`;
                o[n] || (o[n] = {
                    positions: [],
                    seed: a,
                    blockId: w
                }), o[n].positions.push({
                    x: y,
                    y: u,
                    z: h
                })
            }
    var I = new THREE.Group;
    for (var k in o) {
        const e = o[k];
        if (e.positions && 0 !== e.positions.length) {
            var w = e.blockId,
                b = e.seed,
                x = new THREE.BoxGeometry(1, 1, 1),
                T = [],
                C = [],
                H = [],
                N = [],
                R = 0;
            for (var B of e.positions) {
                for (var P = x.attributes.position.array, A = x.attributes.normal.array, L = x.attributes.uv.array, O = x.index.array, _ = 0; _ < x.attributes.position.count; _++) T.push(P[3 * _ + 0] + B.x + .5, P[3 * _ + 1] + B.y + .5, P[3 * _ + 2] + B.z + .5), C.push(A[3 * _ + 0], A[3 * _ + 1], A[3 * _ + 2]), H.push(L[2 * _ + 0], L[2 * _ + 1]);
                for (var z = 0; z < O.length; z++) N.push(O[z] + R);
                R += x.attributes.position.count
            }
            var U = new THREE.BufferGeometry;
            U.setAttribute("position", new THREE.Float32BufferAttribute(T, 3)), U.setAttribute("normal", new THREE.Float32BufferAttribute(C, 3)), U.setAttribute("uv", new THREE.Float32BufferAttribute(H, 2)), U.setIndex(N), U.computeBoundingSphere();
            var D, K = BLOCKS[w] || {
                color: "#ff00ff"
            };
            if (K.light) D = new THREE.MeshBasicMaterial({
                map: emberTexture,
                transparent: !0,
                opacity: .8
            });
            else if (K.transparent) D = new THREE.MeshBasicMaterial({
                color: new THREE.Color(K.color),
                transparent: !0,
                opacity: .6,
                side: THREE.DoubleSide
            });
            else {
                const e = createBlockTexture(b, w);
                D = new THREE.MeshStandardMaterial({
                    map: e
                })
            }
            var G = new THREE.Mesh(U, D);
            I.add(G)
        }
    }
    e.mesh = I, meshGroup.add(e.mesh), e.needsRebuild = !1
}, ChunkManager.prototype.getBlockGlobal = function (e, t, o, a, n) {
    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var r = modWrap(e * CHUNK_SIZE + o, MAP_SIZE),
        s = modWrap(t * CHUNK_SIZE + n, MAP_SIZE),
        i = Math.floor(r / CHUNK_SIZE),
        l = Math.floor(s / CHUNK_SIZE),
        d = modWrap(r, CHUNK_SIZE),
        c = modWrap(s, CHUNK_SIZE),
        u = this.getChunk(i, l);
    return u.generated || this.generateChunk(u), u.get(d, a, c)
}, ChunkManager.prototype.setBlockGlobal = function (e, t, o, a, n = !0, r = null) {
    if (!(t < 0 || t >= MAX_HEIGHT)) {
        var s = modWrap(e, MAP_SIZE),
            i = modWrap(o, MAP_SIZE),
            l = Math.floor(s / CHUNK_SIZE),
            d = Math.floor(i / CHUNK_SIZE),
            c = Math.floor(s % CHUNK_SIZE),
            u = Math.floor(i % CHUNK_SIZE),
            p = this.getChunk(l, d);
        p.generated || this.generateChunk(p);
        var m = p.get(c, t, u);
        if (m !== a) {
            p.set(c, t, u, a);
            var y = p.key;
            if (CHUNK_DELTAS.has(y) || CHUNK_DELTAS.set(y, []), CHUNK_DELTAS.get(y).push({
                x: c,
                y: t,
                z: u,
                b: a
            }), p.needsRebuild = !0, 0 === c && (this.getChunk(l - 1, d).needsRebuild = !0), c === CHUNK_SIZE - 1 && (this.getChunk(l + 1, d).needsRebuild = !0), 0 === u && (this.getChunk(l, d - 1).needsRebuild = !0), u === CHUNK_SIZE - 1 && (this.getChunk(l, d + 1).needsRebuild = !0), updateSaveChangesButton(), n) {
                const n = JSON.stringify({
                    type: "block_change",
                    wx: e,
                    wy: t,
                    wz: o,
                    bid: a,
                    prevBid: m,
                    username: userName,
                    originSeed: r
                });
                for (const [e, t] of peers.entries()) e !== userName && t.dc && "open" === t.dc.readyState && (console.log(`[WebRTC] Sending block change to ${e}`), t.dc.send(n))
            }
        }
    }
}, ChunkManager.prototype.applyDeltasToChunk = function (e, t) {
    var o = e.replace(/^#/, "");
    if (parseChunkKey(o)) {
        var a = this.chunks.get(o);
        if (a) {
            for (var n of t)
                if (!(n.x < 0 || n.x >= CHUNK_SIZE || n.y < 0 || n.y >= MAX_HEIGHT || n.z < 0 || n.z >= CHUNK_SIZE)) {
                    var r = n.b === BLOCK_AIR || n.b && BLOCKS[n.b] ? n.b : 4;
                    a.set(n.x, n.y, n.z, r)
                } updateTorchRegistry(a), a.needsRebuild = !0, this.buildChunkMesh(a)
        }
    }
}, ChunkManager.prototype.markDirty = function (e) {
    var t = this.chunks.get(e);
    t && (t.needsRebuild = !0, this.buildChunkMesh(t))
}, ChunkManager.prototype.getSurfaceY = function (e, t) {
    var o = modWrap(Math.floor(e), MAP_SIZE),
        a = modWrap(Math.floor(t), MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = this.getChunk(n, r);
    s.generated || this.generateChunk(s);
    for (var i = Math.floor(o % CHUNK_SIZE), l = Math.floor(a % CHUNK_SIZE), d = MAX_HEIGHT - 1; d >= 0; d--)
        if (s.get(i, d, l) !== BLOCK_AIR && 6 !== s.get(i, d, l)) return d + 1;
    return SEA_LEVEL
}, ChunkManager.prototype.getSurfaceYForBoulders = function (e, t) {
    var o = modWrap(Math.floor(e), MAP_SIZE),
        a = modWrap(Math.floor(t), MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = this.getChunk(n, r);
    s.generated || this.generateChunk(s);
    for (var i = Math.floor(o % CHUNK_SIZE), l = Math.floor(a % CHUNK_SIZE), d = MAX_HEIGHT - 1; d >= 0; d--) {
        const e = s.get(i, d, l);
        if (e !== BLOCK_AIR && 6 !== e && 16 !== e) return d + 1
    }
    return SEA_LEVEL
}, ChunkManager.prototype.preloadChunks = function (e, t, o) {
    for (var a = Math.floor(MAP_SIZE / CHUNK_SIZE), n = [], r = 0; r <= o; r++)
        for (var s = -r; s <= r; s++)
            for (var i = -r; i <= r; i++) Math.abs(s) !== r && Math.abs(i) !== r || n.push({
                cx: e + s,
                cz: t + i,
                dist: Math.abs(s) + Math.abs(i)
            });
    n.sort((function (e, t) {
        return e.dist - t.dist
    }));
    var l = 0;
    (function e() {
        if (!(l >= n.length)) {
            var t = n[l].cx,
                o = n[l].cz,
                r = modWrap(t, a),
                s = modWrap(o, a),
                i = this.getChunk(r, s);
            i.generated || this.generateChunk(i), l++, setTimeout(e.bind(this), 33)
        }
    }).call(this)
}, ChunkManager.prototype.update = function (e, t, o) {
    var a = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE),
        n = Math.floor(modWrap(t, MAP_SIZE) / CHUNK_SIZE);
    a === this.lastPcx && n === this.lastPcz || (this.lastPcx = a, this.lastPcz = n);
    for (var r = [], s = -currentLoadRadius; s <= currentLoadRadius; s++)
        for (var i = -currentLoadRadius; i <= currentLoadRadius; i++) {
            var l = modWrap(a + s, CHUNKS_PER_SIDE),
                d = modWrap(n + i, CHUNKS_PER_SIDE);
            r.push({
                cx: l,
                cz: d,
                dx: s,
                dz: i
            })
        }
    r.sort(((e, t) => {
        const a = e.dx * e.dx + e.dz * e.dz,
            n = t.dx * t.dx + t.dz * t.dz;
        let r = !1,
            s = !1;
        if (o && o.lengthSq() > 0) {
            const a = new THREE.Vector3(e.dx, 0, e.dz);
            a.lengthSq() > 0 && a.normalize().dot(o) > .3 && (r = !0);
            const n = new THREE.Vector3(t.dx, 0, t.dz);
            n.lengthSq() > 0 && n.normalize().dot(o) > .3 && (s = !0)
        }
        return r && !s ? -1 : !r && s ? 1 : a - n
    }));
    var c = new Set,
        u = 0;
    for (const e of r) {
        var p = this.getChunk(e.cx, e.cz);
        c.add(p.key), p.generating || p.generated || this.generateChunk(p), p.generated && (p.needsRebuild || !p.mesh) && u < 2 && (this.buildChunkMesh(p), u++)
    }
    for (var m in userPositions)
        if (m !== userName) {
            var y = userPositions[m],
                h = Math.floor(modWrap(y.x, MAP_SIZE) / CHUNK_SIZE),
                f = Math.floor(modWrap(y.z, MAP_SIZE) / CHUNK_SIZE);
            this.preloadChunks(h, f, 2)
        } const g = (2 * currentLoadRadius + 1) * (2 * currentLoadRadius + 1) * 10 * 3;
    if (this.chunks.size > g) {
        let e = Array.from(this.chunks.values());
        e.sort(((e, t) => {
            const o = Math.hypot(e.cx - a, e.cz - n);
            return Math.hypot(t.cx - a, t.cz - n) - o
        }));
        for (let t = 0; t < e.length && this.chunks.size > g; t++) {
            const o = e[t];
            if (!c.has(o.key)) {
                o.mesh && (meshGroup.remove(o.mesh), disposeObject(o.mesh));
                for (let e = smokeParticles.length - 1; e >= 0; e--) {
                    const t = smokeParticles[e];
                    t.userData.chunkKey === o.key && (scene.remove(t), disposeObject(t), smokeParticles.splice(e, 1))
                }
                const e = o.cx * CHUNK_SIZE,
                    t = o.cz * CHUNK_SIZE;
                for (let a = 0; a < CHUNK_SIZE; a++)
                    for (let n = 0; n < CHUNK_SIZE; n++)
                        for (let r = 0; r < MAX_HEIGHT; r++) {
                            const s = o.get(a, r, n);
                            if (BLOCKS[s] && BLOCKS[s].light) {
                                const o = `${modWrap(e + a, MAP_SIZE)},${r},${modWrap(t + n, MAP_SIZE)}`;
                                torchRegistry.delete(o)
                            }
                        }
                this.chunks.delete(o.key)
            }
        }
    }
    for (const e of c) {
        const t = this.chunks.get(e);
        t && t.mesh && (t.mesh.visible = !0)
    }
};
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
    s.length > 0 && (i = s.join("")), addToInventory(e.out.id, e.out.count, i), addMessage("Crafted " + BLOCKS[e.out.id].name), updateHotbarUI(), "block" === document.getElementById("inventoryModal").style.display && updateInventoryUI(), document.getElementById("craftModal").style.display = "none", isPromptOpen = !1
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
    isPromptOpen = !0, document.getElementById("craftModal").style.display = "block";
    var e = document.getElementById("recipeList");
    for (var t of (e.innerHTML = "", RECIPES)) {
        var o = document.createElement("div");
        o.style.display = "flex", o.style.gap = "8px", o.style.alignItems = "center", o.style.marginTop = "8px";
        var a = document.createElement("div");
        a.innerText = BLOCKS[t.out.id].name + " x" + t.out.count;
        var n = document.createElement("div");
        n.style.opacity = .85;
        var r = [];
        for (const e in t.requires) {
            let o = `${BLOCKS[e].name || e} x${t.requires[e]}`;
            t.requiresOffWorld && t.requiresOffWorld[e] && (o += ` (${t.requiresOffWorld[e]} must be Off-World)`), r.push(o)
        }
        n.innerText = "Requires: " + r.join(", ");
        var s = document.createElement("button");
        s.innerText = "Craft", s.onclick = function (e) {
            return function () {
                initiateCraft(e)
            }
        }(t), o.appendChild(a), o.appendChild(n), o.appendChild(s), e.appendChild(o)
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
    const r = raycaster.intersectObject(meshGroup, !0);
    if (0 === r.length) return;
    const s = r[0],
        i = s.point,
        l = s.face.normal;
    if (0 === e.button) {
        animateAttack();
        removeBlockAt(Math.floor(i.x - .5 * l.x), Math.floor(i.y - .5 * l.y), Math.floor(i.z - .5 * l.z))
    } else if (2 === e.button) {
        placeBlockAt(Math.floor(i.x + .5 * l.x), Math.floor(i.y + .5 * l.y), Math.floor(i.z + .5 * l.z), selectedBlockId)
    }
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

function removeBlockAt(e, t, o) {
    const a = getBlockAt(e, t, o);
    if (!a || a === BLOCK_AIR || a === 1 || a === 6) return;

    const n = BLOCKS[a];
    if (!n || n.strength > 5) return void addMessage("Cannot break that block");

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
    } else {
        damagedBlocks.delete(r);
        if (s.mesh) {
            crackMeshes.remove(s.mesh);
            disposeObject(s.mesh);
        }

        var chunkX = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE);
        var chunkZ = Math.floor(modWrap(o, MAP_SIZE) / CHUNK_SIZE);
        var chunkKey = makeChunkKey(worldName, chunkX, chunkZ);
        if (!checkChunkOwnership(chunkKey, userName)) return void addMessage("Cannot break block in chunk " + chunkKey + ": owned by another user");

        const l = foreignBlockOrigins.get(r);
        chunkManager.setBlockGlobal(e, t, o, BLOCK_AIR, userName);
        if (l) foreignBlockOrigins.delete(r);

        addToInventory(a, 1, l);
        addMessage("Picked up " + (BLOCKS[a] ? BLOCKS[a].name : a) + (l ? ` from ${l}` : ""));
        safePlayAudio(soundBreak);
        createBlockParticles(e, t, o, a);

        if (BLOCKS[a] && BLOCKS[a].light) {
            var d = `${e},${t},${o}`;
            if (torchRegistry.delete(d), torchParticles.has(d)) {
                var c = torchParticles.get(d);
                scene.remove(c), c.geometry.dispose(), c.material.dispose(), torchParticles.delete(d);
            }
            lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
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
                    var i = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE),
                        l = Math.floor(modWrap(o, MAP_SIZE) / CHUNK_SIZE),
                        d = makeChunkKey(worldName, i, l);
                    if (checkChunkOwnership(d, userName)) {
                        if (chunkManager.setBlockGlobal(e, t, o, a, !0, n.originSeed), n.originSeed && n.originSeed !== worldSeed) {
                            const r = `${e},${t},${o}`;
                            foreignBlockOrigins.set(r, n.originSeed), addMessage(`Placed ${BLOCKS[a] ? BLOCKS[a].name : a} from ${n.originSeed}`)
                        } else addMessage("Placed " + (BLOCKS[a] ? BLOCKS[a].name : a));
                        if (n.count -= 1, n.count <= 0 && (INVENTORY[selectedHotIndex] = null), updateHotbarUI(), safePlayAudio(soundPlace), BLOCKS[a] && BLOCKS[a].light) {
                            const a = `${e},${t},${o}`;
                            torchRegistry.set(a, {
                                x: e,
                                y: t,
                                z: o
                            });
                            var c = createFlameParticles(e, t + .5, o);
                            scene.add(c), torchParticles.set(a, c)
                        }
                    } else addMessage("Cannot place block in chunk " + d + ": owned by another user")
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

function handleLavaEruption(e) {
    const t = makeSeededRandom(e.seed),
        o = 20 + Math.floor(20 * t());
    for (let a = 0; a < o; a++) {
        const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
            color: BLOCKS[16].color
        }));
        o.position.set(e.volcano.x + 10 * (t() - .5), e.volcano.y, e.volcano.z + 10 * (t() - .5));
        const a = new THREE.Vector3(2 * (t() - .5), 20 + 20 * t(), 2 * (t() - .5));
        eruptedBlocks.push({
            mesh: o,
            velocity: a,
            createdAt: Date.now()
        }), scene.add(o)
    }
}

function createPebble(e, t, o, a) {
    const n = a ? .2 : .1,
        r = a ? 16738816 : 3355443,
        s = a ? new THREE.MeshBasicMaterial({
            color: r
        }) : new THREE.MeshStandardMaterial({
            color: r
        }),
        i = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), s);
    return i.position.set(e, t, o), i
}

function handlePebbleRain(e) {
    const t = makeSeededRandom(e.seed),
        o = 100 + Math.floor(100 * t());
    for (let a = 0; a < o; a++) {
        const o = t() < .2,
            a = 32 * t(),
            n = t() * Math.PI * 2,
            r = e.volcano.x + Math.cos(n) * a,
            s = e.volcano.z + Math.sin(n) * a,
            i = createPebble(r, e.volcano.y + 20 + 20 * t(), s, o),
            l = new THREE.Vector3(0, -5 - 5 * t(), 0);
        pebbles.push({
            mesh: i,
            velocity: l,
            createdAt: Date.now(),
            isGlowing: o
        }), scene.add(i)
    }
}

function handleVolcanoEvent(e) {
    let t;
    switch (e.eventType) {
        case "lava_eruption":
            handleLavaEruption(e), t = "rumble0";
            break;
        case "pebble_rain":
            handlePebbleRain(e), t = "rumble1";
            break;
        case "boulder_eruption":
            handleBoulderEruption(e);
            const o = ["rumble2", "rumble3", "rumble4", "rumble5"];
            t = o[Math.floor(Math.random() * o.length)]
    }
    if (t) {
        const o = Date.now(),
            a = document.getElementById(t);
        if (a) {
            const n = {
                id: o,
                volcano: e.volcano,
                soundId: t
            };
            activeEruptions.push(n), a.currentTime = 0, safePlayAudio(a), a.onended = () => {
                console.log(`[Audio] Sound ${t} finished playing.`), activeEruptions = activeEruptions.filter((e => e.id !== o)), a.onended = null
            }
        }
    }
}

function createEruptionSmoke(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = new Float32Array(3 * a),
        i = [],
        l = new Float32Array(a),
        d = [new THREE.Color(16777215), new THREE.Color(8947848)];
    for (let n = 0; n < a; n++) {
        r[3 * n] = e + 15 * (Math.random() - .5), r[3 * n + 1] = t + 10 * (Math.random() - .5), r[3 * n + 2] = o + 15 * (Math.random() - .5), l[n] = 1;
        const a = d[Math.floor(Math.random() * d.length)];
        s[3 * n] = a.r, s[3 * n + 1] = a.g, s[3 * n + 2] = a.b, i.push({
            x: 3 * (Math.random() - .5),
            y: 10 + 10 * Math.random(),
            z: 3 * (Math.random() - .5),
            life: 5 + 5 * Math.random()
        })
    }
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("color", new THREE.BufferAttribute(s, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(l, 1)), n.velocities = i;
    const c = new THREE.PointsMaterial({
        size: 5,
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0
    }),
        u = document.createElement("canvas");
    u.width = 64, u.height = 64;
    const p = u.getContext("2d"),
        m = p.createRadialGradient(32, 32, 0, 32, 32, 32);
    m.addColorStop(0, "rgba(200, 200, 200, 0.5)"), m.addColorStop(1, "rgba(200, 200, 200, 0)"), p.fillStyle = m, p.fillRect(0, 0, 64, 64), c.map = new THREE.CanvasTexture(u), c.map.needsUpdate = !0;
    const y = new THREE.Points(n, c);
    return y.position.set(0, 0, 0), y
}

function handleBoulderEruption(e) {
    const t = createEruptionSmoke(e.volcano.x, e.volcano.y, e.volcano.z, 150);
    t.userData.chunkKey = e.volcano.chunkKey, t.createdAt = Date.now(), smokeParticles.push(t), scene.add(t);
    const o = makeSeededRandom(e.seed),
        a = 10 + Math.floor(10 * o());
    for (let t = 0; t < a; t++) {
        const a = o();
        let n, r;
        a < .5 ? (n = 1 + .5 * o(), r = 1) : a < .85 ? (n = 2 + 1 * o(), r = 2) : (n = 3 + 1.5 * o(), r = 4);
        const s = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), new THREE.MeshStandardMaterial({
            color: 5592405,
            map: createBlockTexture(worldSeed, 4)
        })),
            i = o() * Math.PI * 2,
            l = 50 + 50 * o(),
            d = 40 + 20 * o(),
            c = new THREE.Vector3(Math.cos(i) * l / r, d, Math.sin(i) * l / r);
        s.position.set(e.volcano.x + 8 * (o() - .5), e.volcano.y - 10 - 5 * o(), e.volcano.z + 8 * (o() - .5));
        const u = "boulder_" + Date.now() + "_" + t;
        eruptedBlocks.push({
            id: u,
            mesh: s,
            velocity: c,
            createdAt: Date.now(),
            type: "boulder",
            size: n,
            mass: r,
            isRolling: !1,
            targetPosition: s.position.clone(),
            targetQuaternion: s.quaternion.clone(),
            lastUpdate: 0
        }), scene.add(s)
    }
}

function manageVolcanoes() {
    if (isHost || 0 === peers.size) {
        if (Date.now() - lastVolcanoManagement < 1e4) return;
        lastVolcanoManagement = Date.now();
        const e = [{
            x: player.x,
            y: player.y,
            z: player.z
        }];
        for (const t of Object.values(userPositions)) t.targetX && e.push({
            x: t.targetX,
            y: t.targetY,
            z: t.targetZ
        });
        for (const t of volcanoes) {
            if (e.some((e => Math.hypot(t.x - e.x, t.z - e.z) < 256))) {
                const e = Date.now();
                if (e - (t.lastEventTime || 0) < 6e4) continue;
                const o = makeSeededRandom(worldSeed + "_volcano_event_" + t.chunkKey + "_" + Math.floor(e / 6e4));
                if (o() < .05) {
                    t.lastEventTime = e;
                    const a = o();
                    let n;
                    n = a < .33 ? "lava_eruption" : a < .66 ? "pebble_rain" : "boulder_eruption", console.log(`[Volcano] Triggering event: ${n} at volcano ${t.chunkKey}`);
                    const r = {
                        type: "volcano_event",
                        volcano: {
                            x: t.x,
                            y: t.y,
                            z: t.z
                        },
                        eventType: n,
                        seed: worldSeed + "_event_" + e
                    };
                    handleVolcanoEvent(r);
                    for (const [e, t] of peers.entries()) t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify(r))
                }
            }
        }
    }
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
        keys[t] = !0, "Escape" === e.key && mouseLocked && (document.exitPointerLock(), mouseLocked = !1), "t" === e.key.toLowerCase() && toggleCameraMode(), "c" === e.key.toLowerCase() && openCrafting(), "i" === e.key.toLowerCase() && toggleInventory(), "p" === e.key.toLowerCase() && (isPromptOpen = !0, document.getElementById("teleportModal").style.display = "block", document.getElementById("teleportX").value = Math.floor(player.x), document.getElementById("teleportY").value = Math.floor(player.y), document.getElementById("teleportZ").value = Math.floor(player.z)), "x" === e.key.toLowerCase() && CHUNK_DELTAS.size > 0 && downloadSession(), "u" === e.key.toLowerCase() && openUsersModal(), " " === e.key.toLowerCase() && (playerJump(), safePlayAudio(soundJump)), "q" === e.key.toLowerCase() && onPointerDown({
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
    var e = {
        world: worldName,
        seed: worldSeed,
        user: userName,
        savedAt: (new Date).toISOString(),
        deltas: [],
        foreignBlockOrigins: Array.from(foreignBlockOrigins.entries()),
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
    for (var t of CHUNK_DELTAS) {
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
    var l = Array.from(CHUNK_DELTAS.keys()),
        d = await Promise.all(l.map((async function (e) {
            var t = await GetPublicAddressByKeyword(e);
            return t ? t.trim().replace(/^"|"$/g, "") : e
        })));
    document.getElementById("downloadAddressList").value = d.join(","), document.getElementById("downloadModal").style.display = "block"
}

function disposeObject(e) {
    e.traverse((function (e) {
        e.geometry && e.geometry.dispose(), e.material && (Array.isArray(e.material) ? e.material.forEach((function (e) {
            e.dispose()
        })) : e.material.dispose())
    }))
}

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
    document.getElementById("saveChangesBtn").style.display = CHUNK_DELTAS.size > 0 ? "inline-block" : "none"
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
        })), document.getElementById("mAttack").addEventListener("touchstart", (function (e) {
            performAttack(), e.preventDefault()
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
        spawnChunks.set(t, {
            cx: Math.floor(a.x / CHUNK_SIZE),
            cz: Math.floor(a.z / CHUNK_SIZE),
            username: o.username,
            world: o.world,
            spawn: a
        })
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
    }), startWorker(), setInterval(pollServers, POLL_INTERVAL), addMessage("Joined world " + worldName + " as " + userName, 3e3), initialTeleportLocation && (respawnPlayer(initialTeleportLocation.x, initialTeleportLocation.y, initialTeleportLocation.z), initialTeleportLocation = null)
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

function switchWorld() {
    worldArchetype = null;
    const e = prompt("Enter the name of the world to switch to:");
    if (!e || "" === e.trim()) return void addMessage("World name cannot be empty.", 3e3);
    worldName = e.slice(0, 8), worldSeed = worldName, chunkManager.chunks.clear(), meshGroup.children.forEach(disposeObject), meshGroup.children = [], foreignBlockOrigins.clear(), CHUNK_DELTAS.clear(), mobs.forEach((e => scene.remove(e.mesh))), mobs = [], skyProps && (skyProps.suns.forEach((e => scene.remove(e.mesh))), skyProps.moons.forEach((e => scene.remove(e.mesh)))), stars && scene.remove(stars), clouds && scene.remove(clouds), document.getElementById("worldLabel").textContent = worldName;
    const t = calculateSpawnPoint(userName + "@" + worldName);
    player.x = t.x, player.y = t.y, player.z = t.z, spawnPoint = {
        x: player.x,
        y: player.y,
        z: player.z
    }, chunkManager = new ChunkManager(worldSeed), initSky();
    const o = Math.floor(t.x / CHUNK_SIZE),
        a = Math.floor(t.z / CHUNK_SIZE);
    chunkManager.preloadChunks(o, a, LOAD_RADIUS), addMessage(`Switched to world: ${worldName}`, 4e3)
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
                } if (Date.now() - lastDamageTime > 3e4 && Date.now() - lastRegenTime > 1e4 && player.health < 20) {
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
                    dropId: o.id
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
                removeBlockAt(a, n, r), scene.remove(o.mesh), scene.remove(o.light), projectiles.splice(e, 1);
                continue
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
                    a = (t.slice(0, 20), "MCServerJoin@" + o),
                    n = await GetPublicAddressByKeyword(a);
                document.getElementById("joinScriptText").value = n ? n.trim().replace(/^"|"$/g, "") : a, document.getElementById("joinScriptModal").style.display = "block", document.getElementById("joinScriptModal").querySelector("h3").innerText = "Announce Server", document.getElementById("joinScriptModal").querySelector("p").innerText = "Copy this address and paste it into a Sup!? message To: field, attach a server JSON file after starting, and click 📢 to announce your server.", addMessage("Prepare to announce server after starting", 3e3)
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
        })), console.log("[SYSTEM] DOMContentLoaded completed, all listeners attached")
    } catch (e) {
        console.error("[SYSTEM] Error in DOMContentLoaded:", e), addMessage("Failed to initialize login system", 3e3)
    }
})), console.log("[SYSTEM] Script loaded");