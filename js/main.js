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
    VERSION = "SupGalaxy v0.5.5-beta", // Contributed to by Jules
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
        },
        127: {
            name: "Magician's Stone",
            color: "#8A2BE2",
            strength: 3
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
const gltfLoader = new THREE.GLTFLoader();
const clock = new THREE.Clock();
let mixer;
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
// ... (rest of the file is the same until createMagicianStoneScreen)

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
    let { x, y, z, url, width, height, offsetX, offsetY, offsetZ, loop, autoplay, distance } = stoneData;
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

    let screenMesh;

    if (['glb'].includes(fileExtension)) {
        gltfLoader.load(url, (gltf) => {
            screenMesh = gltf.scene;
            const box = new THREE.Box3().setFromObject(screenMesh);
            const size = box.getSize(new THREE.Vector3());
            const scale = Math.min(width / size.x, height / size.y);
            screenMesh.scale.set(scale, scale, scale);

            positionAndOrientMesh(screenMesh, stoneData);

            let mixer, action;
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(screenMesh);
                action = mixer.clipAction(gltf.animations[0]);
                if (autoplay) {
                    action.play();
                }
            }

            magicianStones[key] = { ...stoneData, mesh: screenMesh, mixer, action, isMuted: false };
            scene.add(screenMesh);
        }, undefined, (error) => {
            console.error('An error happened while loading the GLB model:', error);
        });
        return;
    }

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
        texture = new THREE.VideoTexture(video);
        stoneData.videoElement = video;
    } else if (['mp3', 'wav', 'oga'].includes(fileExtension)) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.loop = loop;
        stoneData.audioElement = audio;
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#111'; context.fillRect(0, 0, 256, 128);
        context.fillStyle = '#fff'; context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('Audio: ' + url.split('/').pop(), 128, 64);
        texture = new THREE.CanvasTexture(canvas);
    } else {
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

    positionAndOrientMesh(screenMesh, stoneData);
    magicianStones[key] = { ...stoneData, mesh: screenMesh, isMuted: false };
    scene.add(screenMesh);
}

function positionAndOrientMesh(mesh, stoneData) {
    let { x, y, z, offsetX, offsetY, offsetZ } = stoneData;

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

    mesh.position.copy(position);

    const lookAtTarget = new THREE.Vector3().copy(mesh.position).add(playerDirection);
    mesh.lookAt(lookAtTarget);
}

// ... (rest of the file is the same until gameLoop)

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

        const delta = clock.getDelta();
        const playerPosition = new THREE.Vector3(player.x, player.y, player.z);
        for (const key in magicianStones) {
            if (Object.hasOwnProperty.call(magicianStones, key)) {
                const stone = magicianStones[key];
                const stonePosition = new THREE.Vector3(stone.x, stone.y, stone.z);
                const distanceToPlayer = playerPosition.distanceTo(stonePosition);

                const isInRange = stone.autoplay && distanceToPlayer <= stone.distance;

                // Animation logic
                if (stone.mixer) {
                    if (isInRange) {
                        if (stone.action && !stone.action.isRunning()) {
                            stone.action.play();
                        }
                    } else {
                        if (stone.action && stone.action.isRunning()) {
                            stone.action.stop();
                        }
                    }
                    stone.mixer.update(delta);
                }

                // Media logic (video/audio)
                const mediaElement = stone.videoElement || stone.audioElement;
                if (mediaElement) {
                    if (isInRange) {
                        if (mediaElement.paused) {
                            mediaElement.play().catch(e => console.error("Autoplay failed:", e));
                        }
                        const volume = Math.max(0, 1 - (distanceToPlayer / stone.distance));
                        mediaElement.volume = stone.isMuted ? 0 : volume;
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
// ... (rest of the file is the same)
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
        width: parseFloat(document.getElementById('magicianStoneMaxWidth').value),
        height: parseFloat(document.getElementById('magicianStoneMaxHeight').value),
        offsetX: parseFloat(document.getElementById('magicianStoneOffsetX').value),
        offsetY: parseFloat(document.getElementById('magicianStoneOffsetY').value),
        offsetZ: parseFloat(document.getElementById('magicianStoneOffsetZ').value),
        loop: document.getElementById('magicianStoneLoop').checked,
        autoplay: document.getElementById('magicianStoneAutoplay').checked,
        distance: parseFloat(document.getElementById('magicianStoneAutoplayDistance').value),
        direction: magicianStonePlacement.direction
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

// ... (rest of file)