// Wrist-centered first-person swing: positive X lifts the handle, negative X chops.
function pickaxeSwingEase(t) {
    return t * t * (3 - 2 * t);
}

function pickaxeAttackSwing(progress) {
    if (progress < 0 || progress >= 1) return 0;
    if (progress < .22) return .55 * pickaxeSwingEase(progress / .22);
    if (progress < .55) return .55 - 2 * pickaxeSwingEase((progress - .22) / .33);
    return -1.45 * (1 - pickaxeSwingEase((progress - .55) / .45));
}

// Shoulder-centered swing stays positive so the lower tip strikes down in front (-Z).
function pickaxeArmAttackSwing(progress) {
    if (progress < 0 || progress >= 1) return 0;
    if (progress < .22) return 1.4 * pickaxeSwingEase(progress / .22);
    if (progress < .55) return 1.4 - 1.25 * pickaxeSwingEase((progress - .22) / .33);
    return .15 * (1 - pickaxeSwingEase((progress - .55) / .45));
}

// Laser guns snap from barrel-up rest to on-target, stay aimed while shots keep coming, then lower.
// sinceAimStart times the raise; sinceAimRefresh (last shot or held trigger) times the hold and lowering.
function laserGunAimWeight(sinceAimStart, sinceAimRefresh) {
    if (!(sinceAimStart >= 0) || !(sinceAimRefresh >= 0) || sinceAimRefresh >= 1700) return 0;
    const raise = sinceAimStart < 90 ? pickaxeSwingEase(sinceAimStart / 90) : 1;
    // The hold outlasts the slowest auto-fire gap (1s red cooldown + 200ms repeat) so bursts never dip.
    const lower = sinceAimRefresh < 1300 ? 1 : 1 - pickaxeSwingEase((sinceAimRefresh - 1300) / 400);
    return Math.min(raise, lower);
}

// Shoulder angle that points a hanging arm (default box, VOX or skeletal) along the view pitch.
function laserGunArmAngle(pitch) {
    return Math.PI / 2 + Math.max(-1.2, Math.min(1.2, pitch || 0));
}

var scene, camera, renderer, controls, meshGroup, chunkManager, sun, moon, stars, clouds, emberTexture, knownWorlds = new Map,
    knownUsers = new Map,
    keywordCache = new Map,
    processedMessages = new Set,
    isInitialLoad = !1,
    gameStarted = !1, // Guard to prevent double game initialization
    CHUNK_SIZE = 16,
    MAX_HEIGHT = 256,
    SEA_LEVEL = 16,
    MAP_SIZE = 16384,
    BLOCK_AIR = 0,
    MASTER_WORLD_KEY = "hive",
    PENDING_PERIOD = 2592e6,
    OWNERSHIP_EXPIRY = 31536e6,
    IPFS_MATURITY_PERIOD = 30 * 24 * 60 * 60 * 1000,
    IPFS_MAX_OWNERSHIP_PERIOD = 365 * 24 * 60 * 60 * 1000,
    MS_PER_DAY = 24 * 60 * 60 * 1000, // Milliseconds in one day
    // Custom epoch for IPFS truncated unix date versioning: 2025-09-21 00:00:00 UTC
    // This provides a compact integer representing seconds since this epoch for ordering block updates
    // Note: JavaScript months are 0-indexed, so month 8 = September
    IPFS_EPOCH_2025_09_21 = Math.floor(Date.UTC(2025, 8, 21, 0, 0, 0) / 1000),
    // Default local IPFS root path for Sup!? local mode - defaults to C:/Sup/ipfs on Windows
    // Note: Use forward slashes even on Windows for file:// URLs
    DEFAULT_LOCAL_IPFS_ROOT = 'C:/Sup/ipfs',
    IPFS_GATEWAYS = ['https://ipfs.filebase.io/ipfs/','https://p2fk.io/ipfs/'],
    API_CALLS_PER_SECOND = 10,
    POLL_RADIUS = 2,
    // Render distance configuration:
    // INITIAL_LOAD_RADIUS: Maximum number of chunks to render around the player (reduced by ~20% for performance)
    // LOAD_RADIUS: Reduced radius used during sprinting to improve performance
    // currentLoadRadius: Dynamic radius that switches between INITIAL and LOAD based on player state
    // MAX_LOADED_CHUNKS: Hard cap on total chunks to prevent memory issues and crashes
    INITIAL_LOAD_RADIUS = 7,
    LOAD_RADIUS = 3,
    MAX_LOADED_CHUNKS = 420,
    // Horizontal distance (blocks) within which other players' avatars are drawn.
    REMOTE_PLAYER_VIEW_DISTANCE = 64,
    currentLoadRadius = INITIAL_LOAD_RADIUS,
    CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE),
    VERSION = "SupGalaxy v2.0.0",
    POLL_INTERVAL = 3e4,
    MAX_PEERS = 20,
    BLOCKS = {
        1: {
            name: "Bedrock",
            color: "#0b0b0b",
            strength: 5,
            unbreakable: !0
        },
        2: {
            name: "Grass",
            color: "#3fb34f",
            strength: 1
        },
        3: {
            name: "Dirt",
            color: "#7a4f29",
            strength: 2
        },
        4: {
            name: "Stone",
            color: "#9aa0a6",
            strength: 4,
            requiresPick: !0
        },
        5: {
            name: "Sand",
            color: "#e7d08d",
            textureStyle: "sand",
            strength: 2
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
            strength: 4
        },
        8: {
            name: "Leaves",
            color: "#2f8f46",
            strength: 1,
            noShadow: true
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
            strength: 2
        },
        101: {
            name: "Stained Glass - Red",
            color: "#ff4b4b",
            transparent: !0,
            strength: 2
        },
        102: {
            name: "Stained Glass - Blue",
            color: "#4b6bff",
            transparent: !0,
            strength: 2
        },
        103: {
            name: "Stained Glass - Green",
            color: "#57c84d",
            transparent: !0,
            strength: 2
        },
        104: {
            name: "Stained Glass - Yellow",
            color: "#fff95b",
            transparent: !0,
            strength: 2
        },
        105: {
            name: "Brick",
            color: "#a84f3c",
            textureStyle: "weathered_brick",
            strength: 2
        },
        172: {
            name: "Polished Brick",
            color: "#a84f3c",
            textureStyle: "polished_brick",
            strength: 4
        },
        173: {
            name: "Brick",
            color: "#a84f3c",
            textureStyle: "weathered_brick",
            textureSeedId: 105,
            strength: 2,
            dropId: 105
        },
        106: {
            name: "Smooth Stone",
            color: "#c1c1c1",
            textureStyle: "polished_stone",
            strength: 2
        },
        107: {
            name: "Concrete",
            color: "#888888",
            textureStyle: "concrete",
            strength: 3
        },
        108: {
            name: "Polished Wood",
            color: "#a87443",
            textureStyle: "planks",
            strength: 2
        },
        109: {
            name: "Marble",
            color: "#f0f0f0",
            textureStyle: "marble",
            strength: 2
        },
        110: {
            name: "Obsidian",
            color: "#2d004d",
            textureStyle: "obsidian",
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
            textureStyle: "brick",
            strength: 1
        },
        116: {
            name: "Dark Glass",
            color: "#3a3a3a",
            transparent: !0,
            strength: 2,
            requiresPick: !0
        },
        117: {
            name: "Glass Tile",
            color: "#aeeaff",
            transparent: !0,
            strength: 2
        },
        118: {
            name: "Sandstone",
            color: "#e3c27d",
            textureStyle: "sandstone_bricks",
            strength: 1
        },
        119: {
            name: "Cobblestone",
            color: "#7d7d7d",
            textureStyle: "cobble",
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
            transparent: !0,
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
            strength: 4
        },
        125: {
            name: "Emerald",
            color: "#00ff7b",
            strength: 6,
            requiresPick: !0
        },
        134: {
            name: "Blue Calcite",
            color: "#4da6ff",
            transparent: !0,
            strength: 4,
            light: !0
        },
        135: {
            name: "Tree Seed",
            color: "#4a3c31"
        },
        136: {
            name: "Seaweed",
            color: "#2b8a57",
            transparent: true,
            strength: 0.5,
            noShadow: true
        },
        137: {
            name: "Tuna",
            color: "#ff9bcb",
            itemOnly: true
        },
        138: {
            name: "Iwashi",
            color: "#55d8e8",
            itemOnly: true,
            strength: 1
        },
        177: {
            name: "Fusion Reactor",
            color: "#42e8ff",
            strength: 4,
            fusionReactor: true
        },
        126: {
            name: "Green Laser Gun",
            color: "#00ff00",
            hand_attachable: !0,
            strength: 1
        },
        133: {
            name: "Blue Laser Gun",
            color: "#0000ff",
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
            textureStyle: "planks",
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
        },
        139: {
            name: "Castle Stone Bricks",
            color: "#72777d",
            textureStyle: "stone_bricks",
            strength: 30,
            breakable: !0
        },
        140: {
            name: "Mossy Castle Bricks",
            color: "#63745d",
            textureStyle: "mossy_bricks",
            strength: 30,
            breakable: !0
        },
        141: {
            name: "Chiseled Limestone",
            color: "#c4b99e",
            textureStyle: "chiseled_stone",
            strength: 2
        },
        142: {
            name: "Polished Limestone",
            color: "#aaa99e",
            textureStyle: "limestone",
            strength: 2
        },
        143: {
            name: "Red Roof Tile",
            color: "#9d4336",
            textureStyle: "roof_tiles",
            strength: 2
        },
        144: {
            name: "Slate Roof Tile",
            color: "#48515a",
            textureStyle: "roof_tiles",
            strength: 3
        },
        145: {
            name: "Oak Support Beam",
            color: "#704425",
            textureStyle: "beam",
            strength: 3
        },
        146: {
            name: "Oak Door",
            color: "#704425",
            transparent: !0,
            model: "door_closed",
            textureStyle: "planks",
            facing: 0,
            openId: 147,
            strength: 2
        },
        147: {
            name: "Oak Door (Open)",
            color: "#704425",
            transparent: !0,
            model: "door_open",
            textureStyle: "planks",
            facing: 0,
            closedId: 146,
            doorOpen: !0,
            strength: 2
        },
        154: {
            name: "Oak Door",
            color: "#704425",
            transparent: !0,
            model: "door_closed",
            textureStyle: "planks",
            facing: 1,
            openId: 155,
            strength: 2
        },
        155: {
            name: "Oak Door (Open)",
            color: "#704425",
            transparent: !0,
            model: "door_open",
            textureStyle: "planks",
            facing: 1,
            closedId: 154,
            doorOpen: !0,
            strength: 2
        },
        156: {
            name: "Oak Door",
            color: "#704425",
            transparent: !0,
            model: "door_closed",
            textureStyle: "planks",
            facing: 2,
            openId: 157,
            strength: 2
        },
        157: {
            name: "Oak Door (Open)",
            color: "#704425",
            transparent: !0,
            model: "door_open",
            textureStyle: "planks",
            facing: 2,
            closedId: 156,
            doorOpen: !0,
            strength: 2
        },
        158: {
            name: "Oak Door",
            color: "#704425",
            transparent: !0,
            model: "door_closed",
            textureStyle: "planks",
            facing: 3,
            openId: 159,
            strength: 2
        },
        159: {
            name: "Oak Door (Open)",
            color: "#704425",
            transparent: !0,
            model: "door_open",
            textureStyle: "planks",
            facing: 3,
            closedId: 158,
            doorOpen: !0,
            strength: 2
        },
        148: {
            name: "Oak Stairs",
            color: "#8b5a33",
            transparent: !0,
            model: "stairs",
            textureStyle: "planks",
            facing: 0,
            strength: 2
        },
        149: {
            name: "Castle Stone Stairs",
            color: "#72777d",
            transparent: !0,
            model: "stairs",
            textureStyle: "stone_bricks",
            facing: 0,
            strength: 30,
            breakable: !0
        },
        160: {
            name: "Oak Stairs",
            color: "#8b5a33",
            transparent: !0,
            model: "stairs",
            textureStyle: "planks",
            facing: 1,
            strength: 2
        },
        161: {
            name: "Oak Stairs",
            color: "#8b5a33",
            transparent: !0,
            model: "stairs",
            textureStyle: "planks",
            facing: 2,
            strength: 2
        },
        162: {
            name: "Oak Stairs",
            color: "#8b5a33",
            transparent: !0,
            model: "stairs",
            textureStyle: "planks",
            facing: 3,
            strength: 2
        },
        163: {
            name: "Castle Stone Stairs",
            color: "#72777d",
            transparent: !0,
            model: "stairs",
            textureStyle: "stone_bricks",
            facing: 1,
            strength: 30,
            breakable: !0
        },
        164: {
            name: "Castle Stone Stairs",
            color: "#72777d",
            transparent: !0,
            model: "stairs",
            textureStyle: "stone_bricks",
            facing: 2,
            strength: 30,
            breakable: !0
        },
        165: {
            name: "Castle Stone Stairs",
            color: "#72777d",
            transparent: !0,
            model: "stairs",
            textureStyle: "stone_bricks",
            facing: 3,
            strength: 30,
            breakable: !0
        },
        166: {
            name: "Wooden Planks",
            color: "#8b5a33",
            textureStyle: "planks",
            textureSeedId: 129,
            facing: 1,
            dropId: 129,
            strength: 2
        },
        167: {
            name: "Wooden Planks",
            color: "#8b5a33",
            textureStyle: "planks",
            textureSeedId: 129,
            facing: 2,
            dropId: 129,
            strength: 2
        },
        168: {
            name: "Wooden Planks",
            color: "#8b5a33",
            textureStyle: "planks",
            textureSeedId: 129,
            facing: 3,
            dropId: 129,
            strength: 2
        },
        169: {
            name: "Portcullis",
            color: "#454c53",
            transparent: !0,
            model: "portcullis",
            textureStyle: "metal",
            facing: 1,
            dropId: 151,
            strength: 5
        },
        170: {
            name: "Portcullis",
            color: "#454c53",
            transparent: !0,
            model: "portcullis",
            textureStyle: "metal",
            facing: 2,
            dropId: 151,
            strength: 5
        },
        171: {
            name: "Portcullis",
            color: "#454c53",
            transparent: !0,
            model: "portcullis",
            textureStyle: "metal",
            facing: 3,
            dropId: 151,
            strength: 5
        },
        150: {
            name: "Portcullis",
            color: "#454c53",
            transparent: !0,
            model: "portcullis",
            textureStyle: "metal",
            facing: 0,
            dropId: 151,
            strength: 5
        },
        151: {
            name: "Portcullis",
            color: "#454c53",
            transparent: !0,
            model: "portcullis",
            textureStyle: "metal",
            facing: 0,
            strength: 5
        },
        152: {
            name: "Rose Stained Glass",
            color: "#d88ea2",
            transparent: !0,
            strength: 2
        },
        153: {
            name: "Battlement Stone",
            color: "#8a8d8f",
            textureStyle: "stone_bricks",
            model: "battlement",
            strength: 30,
            breakable: !0
        },
        174: {
            name: "Iron Pick",
            color: "#a8a8a8",
            itemOnly: !0,
            hand_attachable: !0,
            pickaxe: !0,
            breakChance: 1 / 500,
            meleeMultiplier: 2
        },
        175: {
            name: "Blue Iron Pick",
            color: "#4da6ff",
            itemOnly: !0,
            hand_attachable: !0,
            pickaxe: !0,
            breakChance: 1 / 100,
            meleeMultiplier: 3
        },
        176: {
            name: "Bone",
            color: "#ece4cf",
            itemOnly: !0,
            craftingItem: !0,
            bone: !0
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
        id: "iron_pick",
        out: { id: 174, count: 1 },
        requires: { 124: 1, 5: 1, 120: 1, 7: 1 }
    }, {
        id: "blue_iron_pick",
        out: { id: 175, count: 1 },
        requires: { 16: 1, 174: 1, 134: 1 }
    }, {
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
        id: "polished_brick",
        out: {
            id: 172,
            count: 4
        },
        requires: {
            105: 4
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
    }, {
        id: "castle_stone_bricks",
        out: {
            id: 139,
            count: 4
        },
        requires: {
            4: 3,
            105: 1
        }
    }, {
        id: "mossy_castle_bricks",
        out: {
            id: 140,
            count: 4
        },
        requires: {
            139: 3,
            14: 1
        }
    }, {
        id: "chiseled_limestone",
        out: {
            id: 141,
            count: 2
        },
        requires: {
            109: 2,
            11: 1
        }
    }, {
        id: "polished_limestone",
        out: {
            id: 142,
            count: 4
        },
        requires: {
            106: 3,
            5: 1
        }
    }, {
        id: "red_roof_tile",
        out: {
            id: 143,
            count: 4
        },
        requires: {
            105: 2,
            13: 1
        }
    }, {
        id: "slate_roof_tile",
        out: {
            id: 144,
            count: 4
        },
        requires: {
            119: 2,
            11: 1
        }
    }, {
        id: "oak_support_beam",
        out: {
            id: 145,
            count: 4
        },
        requires: {
            7: 2,
            129: 2
        }
    }, {
        id: "oak_door",
        out: {
            id: 146,
            count: 1
        },
        requires: {
            129: 5,
            124: 1
        }
    }, {
        id: "oak_stairs",
        out: {
            id: 148,
            count: 4
        },
        requires: {
            129: 6
        }
    }, {
        id: "castle_stone_stairs",
        out: {
            id: 149,
            count: 4
        },
        requires: {
            139: 6
        }
    }, {
        id: "portcullis",
        out: {
            id: 151,
            count: 1
        },
        requires: {
            124: 4,
            11: 1
        }
    }, {
        id: "rose_stained_glass",
        out: {
            id: 152,
            count: 2
        },
        requires: {
            100: 2,
            12: 1
        }
    }, {
        id: "battlement_stone",
        out: {
            id: 153,
            count: 4
        },
        requires: {
            139: 3,
            106: 1
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
    // Autoplay pause state: when true, audio/video playback is paused due to browser autoplay restrictions
    // This prevents retry loops and waits for user interaction to resume
    isAutoplayPaused = !1,
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
    projectileLightPool = [],
    laserImpactLights = [],
    laserImpactLightPool = [],
    projectileMeshPool = [],
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
    magicianStonesLoading = new Set(), // Entity-based deduplication: tracks stones by position key during loading to prevent duplicate instantiation across ALL file types
    calligraphyStonePlacement = null,
    calligraphyStones = {},
    calligraphyStonesLoading = new Set(), // Entity-based deduplication: tracks calligraphy stones by position key during loading
    chests = {},
    currentChestKey = null,
    // Per-world stone data storage: Stores magician and calligraphy stone metadata per world.
    // This allows stone media/behaviors to be preserved and restored when switching worlds.
    // Key: worldName, Value: { magicianStones: {}, calligraphyStones: {}, chests: {} }
    WORLD_STONE_DATA = new Map();
const BLUE_CALCITE_LIGHT = {
    surfaceIntensity: .45,
    undergroundIntensity: .55,
    color: 0x4da6ff,
    distance: 36,
    decay: 1
};

function applyBlueCalciteLight(light, underground) {
    light.intensity = underground ? BLUE_CALCITE_LIGHT.undergroundIntensity : BLUE_CALCITE_LIGHT.surfaceIntensity;
    light.color.setHex(BLUE_CALCITE_LIGHT.color);
    light.distance = BLUE_CALCITE_LIGHT.distance;
    light.decay = BLUE_CALCITE_LIGHT.decay;
}

const lightManager = {
    lights: [],
    poolSize: 8,
    playerLight: null,
    getOpaqueSurfaceY: function (x, z) {
        const worldX = modWrap(Math.floor(x), MAP_SIZE);
        const worldZ = modWrap(Math.floor(z), MAP_SIZE);
        const chunk = chunkManager.getChunk(Math.floor(worldX / CHUNK_SIZE), Math.floor(worldZ / CHUNK_SIZE));
        if (!chunk.generated) chunkManager.generateChunk(chunk);
        const localX = worldX % CHUNK_SIZE;
        const localZ = worldZ % CHUNK_SIZE;
        for (let y = MAX_HEIGHT - 1; y >= 0; y--) {
            const blockId = chunk.get(localX, y, localZ);
            const block = BLOCKS[blockId];
            if (blockId !== BLOCK_AIR && blockId !== 6 && !(block && (block.transparent || block.noShadow))) return y + 1;
        }
        return SEA_LEVEL;
    },
    getLightTransmission: function (sourceX, sourceY, sourceZ, targetX, targetY, targetZ) {
        const startX = sourceX + .5,
            startY = sourceY + .5,
            startZ = sourceZ + .5,
            endX = targetX + .5,
            endY = targetY + 1,
            endZ = targetZ + .5,
            dx = endX - startX,
            dy = endY - startY,
            dz = endZ - startZ;
        let x = Math.floor(startX),
            y = Math.floor(startY),
            z = Math.floor(startZ),
            blockedCells = 0;
        const stepX = Math.sign(dx),
            stepY = Math.sign(dy),
            stepZ = Math.sign(dz),
            deltaX = dx ? Math.abs(1 / dx) : Infinity,
            deltaY = dy ? Math.abs(1 / dy) : Infinity,
            deltaZ = dz ? Math.abs(1 / dz) : Infinity;
        let maxX = dx ? ((stepX > 0 ? x + 1 : x) - startX) / dx : Infinity,
            maxY = dy ? ((stepY > 0 ? y + 1 : y) - startY) / dy : Infinity,
            maxZ = dz ? ((stepZ > 0 ? z + 1 : z) - startZ) / dz : Infinity;

        for (let cell = 0; cell < 128; cell++) {
            if (maxX <= maxY && maxX <= maxZ) {
                x += stepX;
                if (maxX >= 1) break;
                maxX += deltaX;
            } else if (maxY <= maxZ) {
                y += stepY;
                if (maxY >= 1) break;
                maxY += deltaY;
            } else {
                z += stepZ;
                if (maxZ >= 1) break;
                maxZ += deltaZ;
            }

            const blockId = getBlockAt(x, y, z),
                block = BLOCKS[blockId];
            if (blockId !== BLOCK_AIR && !(block && block.transparent)) {
                blockedCells++;
                if (blockedCells >= 3) return .001;
            }
        }
        return Math.pow(.12, blockedCells);
    },
    getUndergroundContext: function (x, y, z) {
        const playerY = Math.floor(y);
        let coveredColumns = 0;
        let nearestCeilingDepth = Infinity;
        let centerCovered = false;
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
            for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                const surfaceY = this.getOpaqueSurfaceY(x + offsetX, z + offsetZ);
                if (surfaceY > playerY + 1) {
                    coveredColumns++;
                    nearestCeilingDepth = Math.min(nearestCeilingDepth, surfaceY - 1 - playerY);
                    if (offsetX === 0 && offsetZ === 0) centerCovered = true;
                }
            }
        }
        return {
            isUnderground: coveredColumns >= 5,
            centerCovered,
            depth: nearestCeilingDepth
        };
    },
    init: function () {
        for (let e = 0; e < this.poolSize; e++) {
            const e = new THREE.PointLight(16755251, 0, 0);
            e.castShadow = !1, this.lights.push(e), scene.add(e)
        }
        this.playerLight = new THREE.PointLight(16755251, 0, 18);
        this.playerLight.castShadow = !1;
        scene.add(this.playerLight);
    },
    update: function (e) {
        const heldLightVisible = !isDying && !deathScreenShown && player.health > 0 &&
            !avatarGroup?.userData.customAvatar?.ambientPlaying;
        if (heldLightVisible && (selectedBlockId === 120 || selectedBlockId === 175)) {
            const underground = this.getUndergroundContext(e.x, e.y, e.z).isUnderground;
            if (selectedBlockId === 175) {
                applyBlueCalciteLight(this.playerLight, underground);
            } else {
                this.playerLight.intensity = underground ? 1.15 : 0.9;
                this.playerLight.color.setHex(16755251);
                this.playerLight.distance = underground ? 22 : 18;
                this.playerLight.decay = 1;
            }
            this.playerLight.position.set(e.x, e.y + 2, e.z);
        } else {
            this.playerLight.intensity = 0;
        }

        const t = [];
        for (const torch of torchRegistry.values()) {
            const dx = torch.x - e.x;
            const dy = torch.y - e.y;
            const dz = torch.z - e.z;
            const distance = dx * dx + dy * dy + dz * dz;
            let index = 0;
            while (index < t.length && t[index].distance <= distance) index++;
            if (index >= this.poolSize && t.length >= this.poolSize) continue;
            t.splice(index, 0, { torch, distance });
            if (t.length > this.poolSize) t.pop();
        }
        // e is the player position Vector3
        const playerIsOnSurface = !this.getUndergroundContext(e.x, e.y, e.z).isUnderground;

        for (let idx = 0; idx < this.poolSize; idx++)
            if (idx < t.length) {
                const o = t[idx].torch,
                    a = this.lights[idx];
                a.position.set(o.x + .5, o.y + .5, o.z + .5);

                // Prevent underground lights bleeding through surface
                const lightIsDeep = o.y < this.getOpaqueSurfaceY(o.x, o.z) - 5;
                if (playerIsOnSurface && lightIsDeep) {
                    a.intensity = 0;
                    continue;
                }

                if (o.type === 134) {
                    applyBlueCalciteLight(a, !playerIsOnSurface);
                } else {
                    a.intensity = playerIsOnSurface ? 0.9 : 1.15;
                    a.color.setHex(16755251);
                    a.distance = playerIsOnSurface ? 18 : 22;
                }
                a.intensity *= this.getLightTransmission(o.x, o.y, o.z, e.x, e.y, e.z);
            } else this.lights[idx].intensity = 0
    }
};

/**
 * Cached effective local IPFS root path - determined once from URL query parameter.
 * Initialized to null and set on first call to getLocalIpfsRoot().
 */
function getPickaxeMultiplier(toolId) {
    const tool = BLOCKS[toolId];
    return tool && tool.pickaxe ? tool.meleeMultiplier : 1;
}

function getMiningDamage(blockId, toolId = null, laserColor = null) {
    const block = BLOCKS[blockId];
    if (!block || block.unbreakable || blockId === 6) return 0;
    // Blue lasers blast through any breakable block in one hit; obsidian resists for four hits.
    if (laserColor === "blue") return blockId === 110 ? block.strength / 4 : block.strength;
    if (laserColor === "green") return blockId === 110 ? 0 : 1;
    if (laserColor === "red") toolId = null;
    if (blockId === 110) return toolId === 175 ? block.strength / 4 : 0;
    const tool = BLOCKS[toolId];
    if (block.requiresPick && !(tool && tool.pickaxe)) return 0;
    if (toolId === 174) return 2;
    if (toolId === 175) return 4;
    return 1;
}

var effectiveLocalIpfsRoot = null;

/**
 * Gets the effective local IPFS root path for the current session.
 * On first call, reads the 'ipfs-path' query parameter from the URL and caches it.
 * If not present or empty, falls back to DEFAULT_LOCAL_IPFS_ROOT.
 * 
 * This allows runtime override of the local IPFS path via URL querystring,
 * enabling users to specify custom IPFS directories without code changes.
 * 
 * @returns {string} The effective local IPFS root path to use
 */
function getLocalIpfsRoot() {
    if (effectiveLocalIpfsRoot === null) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ipfsPathParam = urlParams.get('ipfs-path');
            
            // Use the parameter if it's present and non-empty/non-whitespace
            if (ipfsPathParam && ipfsPathParam.trim()) {
                effectiveLocalIpfsRoot = ipfsPathParam.trim();
                console.log('[IPFS Config] Using custom IPFS root from URL parameter:', effectiveLocalIpfsRoot);
            } else {
                effectiveLocalIpfsRoot = DEFAULT_LOCAL_IPFS_ROOT;
                console.log('[IPFS Config] Using default IPFS root:', effectiveLocalIpfsRoot);
            }
        } catch (e) {
            // Fallback to default if there's any error reading URL parameters
            console.warn('[IPFS Config] Error reading ipfs-path parameter, using default:', e);
            effectiveLocalIpfsRoot = DEFAULT_LOCAL_IPFS_ROOT;
        }
    }
    return effectiveLocalIpfsRoot;
}

function encodeIPFSPath(path) {
    return String(path)
        .split('/')
        .filter(Boolean)
        .map(part => encodeURIComponent(part))
        .join('/');
}

function buildIPFSGatewayUrls(hash, filename = null) {
    const path = filename ? '/' + encodeIPFSPath(filename) : '';
    return IPFS_GATEWAYS.map(gateway => `${gateway}${hash}${path}`);
}

function buildIPFSGatewayUrl(hash, filename = null, gatewayIndex = 0) {
    const gatewayUrls = buildIPFSGatewayUrls(hash, filename);
    return gatewayUrls[gatewayIndex] || gatewayUrls[0];
}

/**
 * Computes a truncated unix date for IPFS Loading updates.
 * The truncated date is the number of seconds since 2025-09-21 00:00:00 UTC (IPFS_EPOCH_2025_09_21).
 * This provides a compact integer for monotonic ordering of block updates.
 * 
 * @param {number} blockTimestampMs - The BlockDate timestamp in milliseconds (standard JS Date.getTime())
 * @returns {number} Truncated unix date (seconds since 2025-09-21), or 0 if invalid/before epoch
 */
function computeIpfsTruncatedDate(blockTimestampMs) {
    if (!blockTimestampMs || typeof blockTimestampMs !== 'number' || isNaN(blockTimestampMs)) {
        return 0;
    }
    // Convert milliseconds to seconds
    const blockTimestampSeconds = Math.floor(blockTimestampMs / 1000);
    const truncatedDate = blockTimestampSeconds - IPFS_EPOCH_2025_09_21;
    // Clamp to 0 if the block is before the epoch
    return truncatedDate > 0 ? truncatedDate : 0;
}

/**
 * Determines whether an IPFS Loading update should be applied to a block.
 * Implements monotonic ordering: updates are only accepted if the incoming
 * truncated unix date is strictly greater than the existing one.
 * 
 * This ensures that block changes remain in correct chronological order
 * even if IPFS files arrive or are processed out of order.
 * 
 * @param {number|null|undefined} existingTruncated - The existing truncated date on the block (0, null, or undefined means no previous timestamp)
 * @param {number|null|undefined} incomingTruncated - The incoming truncated date from the IPFS update
 * @returns {boolean} True if the update should be applied, false if it should be skipped
 */
function shouldApplyIpfsUpdate(existingTruncated, incomingTruncated) {
    // Invalid incoming timestamp: reject the update
    if (!incomingTruncated || incomingTruncated <= 0) {
        return false;
    }
    // No existing timestamp or zero: accept the first IPFS update
    if (!existingTruncated || existingTruncated <= 0) {
        return true;
    }
    // Accept if incoming is greater than or equal to existing
    // Equal dates are accepted to allow multiple updates in the same block
    return incomingTruncated >= existingTruncated;
}

/**
 * Cleans up all resources associated with a magician stone.
 * This includes:
 * - Removing the mesh from the scene and disposing it
 * - Stopping and cleaning up video elements
 * - Stopping and cleaning up audio elements
 * - Disposing GIF animation resources (texture, canvas, reader)
 * - Stopping any animation mixers
 * 
 * This function is defined in declare.js to be available to all scripts
 * (especially web-rtc.js which needs to handle network stone removal events).
 * 
 * @param {Object} stone - The magician stone object to clean up
 * @param {string} key - The key of the stone (for logging purposes)
 */
function cleanupMagicianStone(stone, key) {
    if (typeof StoneCollision !== 'undefined') StoneCollision.dispose(stone, key);
    if (!stone) return;
    if (stone.colliderMesh) {
        disposeObject(stone.colliderMesh);
        stone.colliderMesh = null;
    }

    // Remove and dispose the 3D mesh
    if (stone.mesh) {
        scene.remove(stone.mesh);
        disposeObject(stone.mesh);
    }

    // Stop and clean up video element
    if (stone.videoElement) {
        try {
            stone.videoElement.pause();
            stone.videoElement.src = '';
            stone.videoElement.load(); // Force release of video resources
        } catch (e) {
            console.warn(`[MagicianStone] Error cleaning up video element for key ${key}:`, e);
        }
    }

    // Stop and clean up audio element
    if (stone.audioElement) {
        try {
            stone.audioElement.pause();
            stone.audioElement.src = '';
            stone.audioElement.load(); // Force release of audio resources
        } catch (e) {
            console.warn(`[MagicianStone] Error cleaning up audio element for key ${key}:`, e);
        }
    }

    if (stone.mediaObjectUrl) {
        URL.revokeObjectURL(stone.mediaObjectUrl);
        stone.mediaObjectUrl = null;
    }

    // Clean up GIF animation resources - this is the critical fix for the GIF artifact bug
    if (stone.gifData) {
        // Dispose the THREE.CanvasTexture to release WebGL resources
        if (stone.gifData.texture) {
            stone.gifData.texture.dispose();
        }
        // Clear the canvas context to help garbage collection
        if (stone.gifData.ctx && stone.gifData.canvas) {
            stone.gifData.ctx.clearRect(0, 0, stone.gifData.canvas.width, stone.gifData.canvas.height);
        }
        // Nullify references to allow garbage collection
        stone.gifData.reader = null;
        stone.gifData.canvas = null;
        stone.gifData.ctx = null;
        stone.gifData.texture = null;
        stone.gifData.tempImageData = null;
        stone.gifData = null;
    }

    // Stop any animation mixer (for 3D models with animations)
    if (stone.mixer) {
        stone.mixer.stopAllAction();
        stone.mixer = null;
    }

    console.log(`[MagicianStone] Cleaned up resources for key ${key}`);
}

/**
 * Globally available function to cleanly remove a Calligraphy Stone and all its associated resources.
 * @param {Object} stone - The calligraphy stone object to clean up
 * @param {string} key - The key of the stone (for logging purposes)
 */
function cleanupCalligraphyStone(stone, key) {
    if (!stone) return;
    if (stone.mesh) {
        scene.remove(stone.mesh);
        disposeObject(stone.mesh);
    }
}

/**
 * Globally available function to cleanly remove a Chest and all its associated resources.
 * @param {Object} chest - The chest object to clean up
 * @param {string} key - The key of the chest (for logging purposes)
 */
function cleanupChest(chest, key) {
    if (!chest) return;
    if (chest.mesh) {
        scene.remove(chest.mesh);
        disposeObject(chest.mesh);
    }
}

// Keep visible version labels in sync with the VERSION constant.
(function applyVersionLabels() {
    if (typeof document === "undefined") return;
    const label = document.getElementById("versionLabel");
    if (label) label.textContent = VERSION;
    document.title = VERSION;
})();
