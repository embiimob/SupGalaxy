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
    IPFS_MATURITY_PERIOD = 30 * 24 * 60 * 60 * 1000,
    IPFS_MAX_OWNERSHIP_PERIOD = 365 * 24 * 60 * 60 * 1000,
    API_CALLS_PER_SECOND = 3,
    POLL_RADIUS = 2,
    INITIAL_LOAD_RADIUS = 9,
    LOAD_RADIUS = 3,
    currentLoadRadius = INITIAL_LOAD_RADIUS,
    CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE),
    VERSION = "SupGalaxy v0.6.0",
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
        },
        128: {
            name: "Calligraphy Stone",
            color: "#D4AF37",
            strength: 3
        },
        129: {
            name: "Wooden Planks",
            color: "#8b5a33",
            strength: 2
        },
        130: {
            name: "Crafting Table",
            color: "#8b5a33",
            strength: 2
        },
        131: {
            name: "Chest",
            color: "#654321",
            strength: 2,
            transparent: !0
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
    }, {
        id: "calligraphy_stone",
        out: {
            id: 128,
            count: 1
        },
        requires: {
            4: 2,
            11: 2
        }
    }, {
        id: "wooden_planks",
        out: {
            id: 129,
            count: 4
        },
        requires: {
            7: 1
        }
    }, {
        id: "crafting_table",
        out: {
            id: 130,
            count: 1
        },
        requires: {
            129: 4
        }
    }, {
        id: "chest",
        out: {
            id: 131,
            count: 1
        },
        requires: {
            129: 8
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
    soundHit = document.getElementById("soundHit"),
    pending = (knownWorlds = new Map, knownUsers = new Map, new Set),
    spawnChunks = new Map,
    chunkOwners = new Map,
    OWNED_CHUNKS = new Map,
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
var crackTexture, damagedBlocks = new Map,
    crackMeshes = new THREE.Group,
    blockParticles = [];
const maxAudioDistance = 32,
    rolloffFactor = 2;
var volcanoes = [],
    initialTeleportLocation = null,
    magicianStonePlacement = null,
    magicianStones = {},
    calligraphyStonePlacement = null,
    calligraphyStones = {},
    chests = {},
    currentChestKey = null;
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

