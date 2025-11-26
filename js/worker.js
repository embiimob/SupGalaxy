        var worker = new Worker(URL.createObjectURL(new Blob([`
const CHUNK_SIZE = 16;
const MAX_HEIGHT = 256;
const SEA_LEVEL = 16;
const MAP_SIZE = 16384;
const BLOCK_AIR = 0;

const ARCHETYPES = {
    'Earth': {
        name: 'Earth',
        gravity: 16.0,
        skyType: 'earth',
        mobSpawnRules: { day: ['bee'], night: ['crawley'] },
        terrainGenerator: 'generateStandardTerrain',
        biomeModifications: {},
        flora: ['trees', 'flowers', 'hives']
    },
    'Moon': {
        name: 'Moon',
        gravity: 8.0,
        skyType: 'moon',
        mobSpawnRules: { day: ['crawley'], night: [] },
        terrainGenerator: 'generateMoonTerrain',
        biomeModifications: { noWater: true },
        flora: []
    },
    'Vulcan': {
        name: 'Vulcan',
        gravity: 16.0,
        skyType: 'vulcan',
        mobSpawnRules: { day: ['crawley'], night: ['crawley'] },
        terrainGenerator: 'generateVulcanTerrain',
        biomeModifications: { moreLava: true },
        flora: []
    },
    'Desert': {
        name: 'Desert',
        gravity: 16.0,
        skyType: 'desert',
            mobSpawnRules: { day: ['grub'], night: ['crawley', 'grub'] },
        terrainGenerator: 'generateDesertTerrain',
        biomeModifications: { onlyDesert: true },
        flora: ['cactus']
    },
    'Massive': {
        name: 'Massive',
        gravity: 30.0,
        skyType: 'earth',
        mobSpawnRules: { day: [], night: ['bee', 'crawley'] },
        terrainGenerator: 'generateStandardTerrain',
        biomeModifications: { largeBiomes: true },
        flora: ['trees', 'flowers', 'hives']
    }
};

function selectArchetype(seed) {
    if (worldArchetypes.has(seed)) {
        return worldArchetypes.get(seed);
    }
    const rnd = makeSeededRandom(seed + '_archetype_selector');
    const types = Object.keys(ARCHETYPES);
    const selectedKey = types[Math.floor(rnd() * types.length)];
    const archetype = ARCHETYPES[selectedKey];
    worldArchetypes.set(seed, archetype);
    return archetype;
}

var worldArchetypes = new Map();
const BLOCKS = {
        1: { name: 'Bedrock', color: '#0b0b0b' }, 2: { name: 'Grass', color: '#3fb34f' },
        3: { name: 'Dirt', color: '#7a4f29' }, 4: { name: 'Stone', color: '#9aa0a6' },
        5: { name: 'Sand', color: '#e7d08d' }, 6: { name: 'Water', color: '#2b9cff', transparent: true },
        7: { name: 'Wood', color: '#8b5a33' }, 8: { name: 'Leaves', color: '#2f8f46' },
        9: { name: 'Cactus', color: '#4aa24a' }, 10: { name: 'Snow', color: '#ffffff' },
        11: { name: 'Coal', color: '#1f1f1f' }, 12: { name: 'Flower', color: '#ff6bcb' },
        13: { name: 'Clay', color: '#a9b6c0' }, 14: { name: 'Moss', color: '#507d43' },
        15: { name: 'Gravel', color: '#b2b2b2' }, 16: { name: 'Lava', color: '#ff6a00', transparent: true },
        17: { name: 'Ice', color: '#a8e6ff', transparent: true }, 100: { name: 'Glass', color: '#b3e6ff', transparent: true },
        101: { name: 'Stained Glass - Red', color: '#ff4b4b', transparent: true }, 102: { name: 'Stained Glass - Blue', color: '#4b6bff', transparent: true },
        103: { name: 'Stained Glass - Green', color: '#57c84d', transparent: true }, 104: { name: 'Stained Glass - Yellow', color: '#fff95b', transparent: true },
        105: { name: 'Brick', color: '#a84f3c' }, 106: { name: 'Smooth Stone', color: '#c1c1c1' },
        107: { name: 'Concrete', color: '#888888' }, 108: { name: 'Polished Wood', color: '#a87443' },
        109: { name: 'Marble', color: '#f0f0f0' }, 110: { name: 'Obsidian', color: '#2d004d' },
        111: { name: 'Crystal - Blue', color: '#6de0ff', transparent: true }, 112: { name: 'Crystal - Purple', color: '#b26eff', transparent: true },
        113: { name: 'Crystal - Green', color: '#6fff91', transparent: true }, 114: { name: 'Light Block', color: '#fffacd', transparent: true },
        115: { name: 'Glow Brick', color: '#f7cc5b' }, 116: { name: 'Dark Glass', color: '#3a3a3a', transparent: true },
        117: { name: 'Glass Tile', color: '#aeeaff', transparent: true }, 118: { name: 'Sandstone', color: '#e3c27d' },
        119: { name: 'Cobblestone', color: '#7d7d7d' },
        120: { name: 'Torch', color: '#ff9900', light: true },
        121: { name: 'Laser Gun', color: '#ff0000', hand_attachable: true },
        122: { name: 'Honey', color: '#ffb74a' },
        123: { name: 'Hive', color: '#e3c27d' },
        125: { name: 'Emerald', color: '#00ff7b' },
        126: { name: 'Green Laser Gun', color: '#00ff00', hand_attachable: true },
        127: { name: "Magician's Stone", color: "#8A2BE2" },
        128: { name: "Calligraphy Stone", color: "#D4AF37" },
};

const BIOMES = [
        { key: 'plains', palette: [2, 3, 4, 13, 15], heightScale: 0.8, roughness: 0.3, featureDensity: 0.05 },
        { key: 'desert', palette: [5, 118, 4], heightScale: 0.6, roughness: 0.4, featureDensity: 0.02 },
        { key: 'forest', palette: [2, 3, 14, 4], heightScale: 1.3, roughness: 0.4, featureDensity: 0.03 },
        { key: 'snow', palette: [10, 17, 4], heightScale: 1.2, roughness: 0.5, featureDensity: 0.02 },
        { key: 'mountain', palette: [4, 11, 3, 15, 1], heightScale: 10.5, roughness: 0.6, featureDensity: 0.01 },
        { key: 'swamp', palette: [2, 3, 6, 14, 13], heightScale: 0.5, roughness: 0.2, featureDensity: 0.04 },
];

function makeSeededRandom(seed) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
        return function () {
            h += 0x6D2B79F5;
            var t = Math.imul(h ^ (h >>> 15), 1 | h);
            t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
}

function makeNoise(seed) {
        var rnd = makeSeededRandom(seed);
        var cache = {};
        function corner(ix, iy) {
            var k = ix + ',' + iy;
            if (cache[k] !== undefined) return cache[k];
            var s = seed + '|' + ix + ',' + iy;
            var r = makeSeededRandom(s)();
            return cache[k] = r;
        }
        function interp(a, b, t) { return a + (b - a) * (t * (t * (3 - 2 * t))); }
        return function (x, y) {
            var ix = Math.floor(x), iy = Math.floor(y);
            var fx = x - ix, fy = y - iy;
            var a = corner(ix, iy), b = corner(ix + 1, iy), c = corner(ix, iy + 1), d = corner(ix + 1, iy + 1);
            var ab = interp(a, b, fx), cd = interp(c, d, fx);
            return interp(ab, cd, fy);
        };
}

function fbm(noiseFn, x, y, oct, persistence) {
        var sum = 0, amp = 1, freq = 1, max = 0;
        for (var i = 0; i < oct; i++) {
            sum += amp * noiseFn(x * freq, y * freq);
            max += amp;
            amp *= persistence;
            freq *= 2;
        }
        return sum / max;
}

function placeTree(chunkData, lx, cy, lz, rnd) {
        const treeHeight = 5 + Math.floor(rnd() * 6);
        const canopySize = 2 + Math.floor(rnd() * 2);
        const trunkBlock = 7; // Wood
        const leafBlock = 8; // Leaves

        // Trunk
        for (let i = 0; i < treeHeight; i++) {
            if (cy + i < MAX_HEIGHT) {
                chunkData[(cy + i) * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = trunkBlock;
            }
        }

        // Canopy
        for (let dy = -canopySize; dy <= canopySize; dy++) {
            for (let dx = -canopySize; dx <= canopySize; dx++) {
                for (let dz = -canopySize; dz <= canopySize; dz++) {
                    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (d <= canopySize + 0.5 * rnd()) {
                        const rx = lx + dx;
                        const ry = cy + treeHeight + dy;
                        const rz = lz + dz;
                        if (ry < MAX_HEIGHT && rx >= 0 && rx < CHUNK_SIZE && rz >= 0 && rz < CHUNK_SIZE) {
                            if (chunkData[ry * CHUNK_SIZE * CHUNK_SIZE + rz * CHUNK_SIZE + rx] === BLOCK_AIR) {
                                chunkData[ry * CHUNK_SIZE * CHUNK_SIZE + rz * CHUNK_SIZE + rx] = leafBlock;
                            }
                        }
                    }
                }
            }
        }
}

function placeFlower(chunkData, lx, cy, lz, wx, wz) {
        if (cy < MAX_HEIGHT && chunkData[cy * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] === BLOCK_AIR) {
            chunkData[cy * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 12;
            self.postMessage({ type: 'flower_location', location: { x: wx, y: cy, z: wz } });
        }
}

function placeCactus(chunkData, lx, cy, lz, rnd) {
        var h = 1 + Math.floor(rnd() * 3);
        for (var i = 0; i < h; i++) if (cy + i < MAX_HEIGHT) chunkData[(cy + i) * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 9;
}

function placeHive(chunkData, lx, cy, lz, wx, wz) {
    const hiveHeight = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < hiveHeight; i++) {
        if (cy + i < MAX_HEIGHT) {
            chunkData[(cy + i) * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 123; // Hive block
        }
    }
    self.postMessage({ type: 'hive_location', location: { x: wx, y: cy, z: wz } });
}

function pickBiome(n, biomes, archetype) {
        if (archetype.biomeModifications.onlyDesert) {
            return biomes.find(b => b.key === 'desert') || biomes[1];
        }
        if (n > 0.68) return biomes.find(b => b.key === 'snow') || biomes[0];
        if (n < 0.25) return biomes.find(b => b.key === 'desert') || biomes[1];
        if (n > 0.45) return biomes.find(b => b.key === 'forest') || biomes[2];
        if (n > 0.60) return biomes.find(b => b.key === 'mountain') || biomes[4];
        if (n < 0.35) return biomes.find(b => b.key === 'swamp') || biomes[5];
        return biomes.find(b => b.key === 'plains') || biomes[0];
}

function generateStandardTerrain(chunkData, chunkKey, archetype) {
    const worldSeed = chunkKey.split(':')[0];
    const biomeRnd = makeSeededRandom(worldSeed + '_biomes');
    const modifiedBiomes = BIOMES.map(biome => ({
        ...biome,
        heightScale: Math.max(0.1, biome.heightScale + (biomeRnd() - 0.5) * biome.heightScale * 0.5),
        roughness: Math.max(0.1, biome.roughness + (biomeRnd() - 0.5) * biome.roughness * 0.5),
        featureDensity: Math.max(0.005, biome.featureDensity + (biomeRnd() - 0.5) * biome.featureDensity * 0.5)
    }));
    const noise = makeNoise(worldSeed);
    const blockNoise = makeNoise(worldSeed + '_block');
    const chunkRnd = makeSeededRandom(chunkKey);
    const cx = parseInt(chunkKey.split(':')[1]);
    const cz = parseInt(chunkKey.split(':')[2]);
    var baseX = cx * CHUNK_SIZE;
    var baseZ = cz * CHUNK_SIZE;
    const hiveNoise = makeNoise(worldSeed + '_hive');
    for (var lx = 0; lx < CHUNK_SIZE; lx++) {
        for (var lz = 0; lz < CHUNK_SIZE; lz++) {
            var wx = baseX + lx;
            var wz = baseZ + lz;
            var nx = (wx % MAP_SIZE) / MAP_SIZE * 10000;
            var nz = (wz % MAP_SIZE) / MAP_SIZE * 10000;
            const biomeNoiseScale = archetype.biomeModifications.largeBiomes ? 0.002 : 0.005;
            var n = fbm(noise, nx * biomeNoiseScale, nz * biomeNoiseScale, 5, 0.6);
            var biome = pickBiome(n, modifiedBiomes, archetype);
            var heightScale = biome.heightScale;
            var roughness = biome.roughness;
            var height = Math.floor(n * 40 * heightScale + 8);
            if (n > 0.7) height += Math.floor((n - 0.7) * 60 * heightScale);
            var localN = fbm(noise, nx * 0.05, nz * 0.05, 4, 0.5);
            height += Math.floor(localN * 15 * roughness);
            height = Math.max(1, Math.min(MAX_HEIGHT - 1, height));
            for (var y = 0; y <= height; y++) {
                var id = BLOCK_AIR;
                if (y === 0) id = 1;
                else if (y < height - 3) id = 4;
                else if (y < height) id = 3;
                else {
                    var blockN = fbm(blockNoise, nx * 0.1, nz * 0.1, 3, 0.6);
                    var paletteIndex = Math.floor(blockN * biome.palette.length);
                    id = biome.palette[paletteIndex % biome.palette.length];
                }
                chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = id;
            }
            if (!archetype.biomeModifications.noWater) {
                for (var y = height + 1; y <= SEA_LEVEL; y++) chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 6;
            }
            const hiveValue = hiveNoise(nx * 0.1, nz * 0.1);
            if (archetype.flora.includes('hives') && biome.key === 'forest' && hiveValue > 0.98) {
                placeHive(chunkData, lx, height + 1, lz, wx, wz);
            }
            else if (archetype.flora.includes('trees') && biome.key === 'forest' && chunkRnd() < biome.featureDensity) placeTree(chunkData, lx, height + 1, lz, chunkRnd);
            else if (archetype.flora.includes('flowers') && biome.key === 'plains' && chunkRnd() < biome.featureDensity) placeFlower(chunkData, lx, height + 1, lz, wx, wz);
            else if (archetype.flora.includes('cactus') && biome.key === 'desert' && chunkRnd() < biome.featureDensity) placeCactus(chunkData, lx, height + 1, lz, chunkRnd);
        }
    }
}

function generateMoonTerrain(chunkData, chunkKey, archetype) {
    const worldSeed = chunkKey.split(':')[0];
    const noise = makeNoise(worldSeed);
    const craterNoise = makeNoise(worldSeed + '_craters');
    const cx = parseInt(chunkKey.split(':')[1]);
    const cz = parseInt(chunkKey.split(':')[2]);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wx = baseX + lx;
            const wz = baseZ + lz;
            const nx = (wx % MAP_SIZE) / MAP_SIZE * 100;
            const nz = (wz % MAP_SIZE) / MAP_SIZE * 100;

            let height = 30 + fbm(noise, nx * 0.1, nz * 0.1, 6, 0.5) * 20;

            // Add craters
            const craterValue = fbm(craterNoise, nx * 0.5, nz * 0.5, 3, 0.5);
            if (craterValue > 0.7) {
                const craterDepth = (craterValue - 0.7) * 30;
                height -= craterDepth;
            }

            height = Math.max(1, Math.min(MAX_HEIGHT - 1, height));

            for (let y = 0; y <= height; y++) {
                const id = (y === 0) ? 1 : 4; // Bedrock and Stone
                chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = id;
            }
        }
    }
}

function generateVulcanTerrain(chunkData, chunkKey, archetype) {
    const worldSeed = chunkKey.split(':')[0];
    const noise = makeNoise(worldSeed);
    const mountainNoise = makeNoise(worldSeed + '_mountains');
    const resourceNoise = makeNoise(worldSeed + '_resources');
    const cx = parseInt(chunkKey.split(':')[1]);
    const cz = parseInt(chunkKey.split(':')[2]);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wx = baseX + lx;
            const wz = baseZ + lz;
            const nx = (wx % MAP_SIZE) / MAP_SIZE * 200;
            const nz = (wz % MAP_SIZE) / MAP_SIZE * 200;

            // Sharper peaks and deeper valleys
            let mountainHeight = fbm(mountainNoise, nx * 0.3, nz * 0.3, 8, 0.55);
            mountainHeight = Math.pow(mountainHeight, 2.5) * 220;

            let groundHeight = 10 + fbm(noise, nx * 0.1, nz * 0.1, 6, 0.5) * 20;
            let baseHeight = Math.max(mountainHeight, groundHeight);

            let height = baseHeight;
            const isVolcano = mountainHeight > 100 && fbm(noise, nx * 0.8, nz * 0.8, 4, 0.6) > 0.6;

            if (isVolcano) {
                const peak = mountainHeight;
                const craterRadius = 20 + fbm(noise, nx, nz, 2, 0.5) * 15;
                const craterDepth = 15 + fbm(noise, nz, nx, 2, 0.5) * 10;

                // Simplified caldera carving without complex shape factors
                const distFromPeakCenter = Math.hypot(wx - (cx * CHUNK_SIZE + 8), wz - (cz * CHUNK_SIZE + 8));

                if (distFromPeakCenter < craterRadius) {
                    const t = distFromPeakCenter / craterRadius;
                    const craterFloor = peak - craterDepth * (1 - t * t * t);
                    height = Math.min(height, craterFloor);

                    const lavaLevel = peak - craterDepth + 5;
                    if (height < lavaLevel) {
                        for (let y = Math.floor(height) + 1; y <= Math.floor(lavaLevel); y++) {
                            if (y < MAX_HEIGHT) {
                                chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 16; // Lava
                            }
                        }
                    }
                }
            }

            height = Math.max(1, Math.min(MAX_HEIGHT - 1, Math.floor(height)));

            for (let y = 0; y <= height; y++) {
                let id;
                if (y < height - 10) {
                    id = 110; // Obsidian
                } else {
                    id = 4; // Stone
                }
                if (y === 0) id = 1; // Bedrock

                chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = id;

                // Add coal and a new block for iron ore
                if (id === 4) { // Only replace stone
                    const r = resourceNoise(nx * 2, y * 0.1, nz * 2);
                    if (r > 0.95) {
                        chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 124; // Iron Ore Placeholder
                    } else if (r > 0.92) {
                        chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 11; // Coal
                    }
                }
            }

            // Ocean and beaches
            const VULCAN_SEA_LEVEL = 32;
            if (height < VULCAN_SEA_LEVEL + 4) { // Process chunks near the sea level
                if (height < VULCAN_SEA_LEVEL) {
                    // This part is for land below sea level.
                    // First, create the underwater sand slope.
                    for (let y = height; y > height - 4 && y > 0; y--) {
                        chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 5; // Sand
                    }
                    // Then, fill with water.
                    for (let y = height + 1; y <= VULCAN_SEA_LEVEL; y++) {
                        chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 6; // Water
                    }
                } else {
                    // This part is for land at or just above sea level.
                    // Convert the top layers to sand to create the beach.
                     for (let y = height; y > height - 4 && y > 0; y--) {
                        chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] = 5; // Sand
                    }
                }
            }
        }
    }

    // After generating the terrain, scan for volcanoes
    const calderaThreshold = 50; // Min lava blocks to be considered a caldera
    const minCalderaAltitude = 60;
    let lavaCount = 0;
    let totalLavaX = 0, totalLavaY = 0, totalLavaZ = 0;

    for (let y = minCalderaAltitude; y < MAX_HEIGHT; y++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                if (chunkData[y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx] === 16) { // Lava
                    lavaCount++;
                    totalLavaX += baseX + lx;
                    totalLavaY += y;
                    totalLavaZ += baseZ + lz;
                }
            }
        }
    }

    if (lavaCount > calderaThreshold) {
        const centerX = totalLavaX / lavaCount;
        const centerY = totalLavaY / lavaCount;
        const centerZ = totalLavaZ / lavaCount;
        self.postMessage({
            type: 'volcano_location',
            location: {
                x: centerX,
                y: centerY,
                z: centerZ,
                lavaCount: lavaCount,
                chunkKey: chunkKey
            }
        });
    }
}

function generateDesertTerrain(chunkData, chunkKey, archetype) {
    generateStandardTerrain(chunkData, chunkKey, archetype);
}

function generateChunkData(chunkKey) {
        const worldSeed = chunkKey.split(':')[0];
        const archetype = selectArchetype(worldSeed);
        self.postMessage({ type: 'world_archetype', archetype: archetype, seed: worldSeed });

        const chunkData = new Uint8Array(CHUNK_SIZE * MAX_HEIGHT * CHUNK_SIZE);

        switch (archetype.terrainGenerator) {
            case 'generateStandardTerrain':
                generateStandardTerrain(chunkData, chunkKey, archetype);
                break;
            case 'generateMoonTerrain':
                generateMoonTerrain(chunkData, chunkKey, archetype);
                break;
            case 'generateVulcanTerrain':
                generateVulcanTerrain(chunkData, chunkKey, archetype);
                break;
            case 'generateDesertTerrain':
                generateDesertTerrain(chunkData, chunkKey, archetype);
                break;
            default:
                generateStandardTerrain(chunkData, chunkKey, archetype);
        }
        return chunkData;
}

var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();
var processedMessages = new Set();
var API_CALLS_PER_SECOND = 3;
var apiDelay = 350;
async function fetchData(url) {
        try {
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch(url);
            return response.ok ? await response.json() : null;
        } catch (e) {
            console.error('[Worker] Fetch error:', url, e);
            return null;
        }
}
async function fetchText(url) {
        try {
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch(url);
            return response.ok ? await response.text() : null;
        } catch (e) {
            console.error('[Worker] Fetch text error:', url, e);
            return null;
        }
}
async function getPublicAddressByKeyword(keyword) {
        try {
            if (addressByKeywordCache.has(keyword)) return addressByKeywordCache.get(keyword);
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch("https://p2fk.io/GetPublicAddressByKeyword/" + keyword + "?mainnet=false");
            if (!response.ok) {
                console.error('[Worker] Failed to fetch address for keyword:', keyword, 'status:', response.status);
                return null;
            }
            var address = await response.text();
            var cleanAddress = address ? address.replace(/"|'/g, "").trim() : null;
            if (cleanAddress) addressByKeywordCache.set(keyword, cleanAddress);
            return cleanAddress;
        } catch (e) {
            console.error('[Worker] Error fetching address for keyword:', keyword, e);
            return null;
        }
}
async function getPublicMessagesByAddress(address, skip, qty) {
        try {
            var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ""));
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch("https://p2fk.io/GetPublicMessagesByAddress/" + cleanAddress + "?skip=" + skip + "&qty=" + qty + "&mainnet=false");
            if (!response.ok) {
                console.error('[Worker] Failed to fetch messages for address:', cleanAddress, 'status:', response.status);
                return [];
            }
            var messages = await response.json();
            return messages;
        } catch (e) {
            console.error('[Worker] Error fetching messages for address:', address, e);
            return [];
        }
}
async function getProfileByURN(urn) {
        if (!urn || urn.trim() === "") return null;
        try {
            if (profileByURNCache.has(urn)) return profileByURNCache.get(urn);
            var cleanUrn = encodeURIComponent(urn.trim().replace(/[^a-zA-Z0-9]/g, ""));
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch("https://p2fk.io/GetProfileByURN/" + cleanUrn + "?mainnet=false");
            if (!response.ok) {
                console.error('[Worker] Failed to fetch profile for URN:', cleanUrn, 'status:', response.status);
                return null;
            }
            var profile = await response.json();
            if (profile) profileByURNCache.set(urn, profile);
            return profile;
        } catch (e) {
            console.error('[Worker] Error fetching profile for URN:', urn, e);
            return null;
        }
}
async function getProfileByAddress(address) {
        try {
            if (profileByAddressCache.has(address)) return profileByAddressCache.get(address);
            var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ""));
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch("https://p2fk.io/GetProfileByAddress/" + cleanAddress + "?mainnet=false");
            if (!response.ok) {
                console.error('[Worker] Failed to fetch profile for address:', cleanAddress, 'status:', response.status);
                return null;
            }
            var profile = await response.json();
            if (profile) profileByAddressCache.set(address, profile);
            return profile;
        } catch (e) {
            console.error('[Worker] Error fetching profile for address:', address, e);
            return null;
        }
}
async function getKeywordByPublicAddress(address) {
        try {
            if (keywordByAddressCache.has(address)) return keywordByAddressCache.get(address);
            var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ""));
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var response = await fetch("https://p2fk.io/GetKeywordByPublicAddress/" + cleanAddress + "?mainnet=false");
            if (!response.ok) {
                console.error('[Worker] Failed to fetch keyword for address:', cleanAddress, 'status:', response.status);
                return null;
            }
            var keyword = await response.text();
            var cleanKeyword = keyword ? keyword.trim() : null;
            if (cleanKeyword) keywordByAddressCache.set(address, cleanKeyword);
            return cleanKeyword;
        } catch (e) {
            console.error('[Worker] Error fetching keyword for address:', address, e);
            return null;
        }
}
async function fetchIPFS(hash) {
        let attempts = 0;
        while (attempts < 3) {
            try {
                await new Promise(resolve => setTimeout(resolve, apiDelay * (attempts + 1)));
                var response = await fetch("https://ipfs.io/ipfs/" + hash);
                if (response.ok) {
                    return await response.json();
                }
                console.error('[Worker] Failed to fetch IPFS for hash:', hash, 'status:', response.status);
            } catch (e) {
                console.error('[Worker] Error fetching IPFS for hash:', hash, e);
            }
            attempts++;
        }
        return null;
}
self.onmessage = async function(e) {
        var data = e.data;
        var type = data.type, chunkKeys = data.chunkKeys, masterKey = data.masterKey, userAddress = data.userAddress, worldName = data.worldName, serverKeyword = data.serverKeyword, offerKeyword = data.offerKeyword, answerKeywords = data.answerKeywords, userName = data.userName;

        if (type === 'generate_chunk') {
            const chunkData = generateChunkData(data.key);
            self.postMessage({ type: 'chunk_generated', key: data.key, data: chunkData }, [chunkData.buffer]);
            return;
        }

        console.log('[Worker] Received message type:', type, 'offerKeyword:', offerKeyword, 'worldName:', worldName);
        if (type === "sync_processed") {
            data.ids.forEach(id => processedMessages.add(id));
            console.log('[Worker] Synced processedMessages, size:', processedMessages.size);
            return;
        }
        if (type === "poll") {
            try {
                var masterAddr = await getPublicAddressByKeyword(masterKey);
                var worlds = new Map();
                var users = new Map();
                var joinData = [];
                var processedIds = [];
                if (masterAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        var response = await getPublicMessagesByAddress(masterAddr, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    }
                    for (var msg of messages || []) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[Worker] Stopping worlds_users processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (!msg.TransactionId) continue;
                        var fromProfile = await getProfileByAddress(msg.FromAddress);
                        if (!fromProfile || !fromProfile.URN) {
                            console.log('[Worker] Skipping worlds_users message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                            continue;
                        }
                        var user = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, "");
                        var userProfile = await getProfileByURN(user);
                        if (!userProfile) {
                            console.log('[Worker] No profile for user:', user, 'txId:', msg.TransactionId);
                            users.set(user, msg.FromAddress); // Allow partial data
                            continue;
                        }
                        if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                            console.log('[Worker] Skipping worlds_users message, invalid creators for user:', user, 'txId:', msg.TransactionId);
                            users.set(user, msg.FromAddress); // Allow partial data
                            continue;
                        }
                        var toKeywordRaw = await getKeywordByPublicAddress(msg.ToAddress);
                        if (!toKeywordRaw) {
                            console.log('[Worker] Skipping worlds_users message, no keyword for address:', msg.ToAddress, 'txId:', msg.TransactionId);
                            continue;
                        }
                        var toKeyword = toKeywordRaw.replace(/"|'/g, "");
                        if (!toKeyword.includes("MCUserJoin@")) {
                            console.log('[Worker] Skipping worlds_users message, invalid keyword:', toKeyword, 'txId:', msg.TransactionId);
                            continue;
                        }
                        var world = toKeyword.split("@")[1].replace(/[^a-zA-Z0-9]/g, "");
                        if (user && world) {
                            if (!worlds.has(world)) worlds.set(world, msg.ToAddress);
                            if (!users.has(user)) users.set(user, msg.FromAddress);
                            joinData.push({ user: user, world: world, username: user, transactionId: msg.TransactionId });
                            processedMessages.add(msg.TransactionId);
                            processedIds.push(msg.TransactionId);
                        }
                    }
                    self.postMessage({ type: "worlds_users", worlds: Object.fromEntries(worlds), users: Object.fromEntries(users), joinData: joinData, processedIds: processedIds });
                } else {
                    console.error('[Worker] Failed to fetch master address for:', masterKey);
                    self.postMessage({ type: "worlds_users", worlds: {}, users: {}, joinData: [], processedIds: [] });
                }
            } catch (e) {
                console.error('[Worker] Error in worlds_users poll:', e);
                self.postMessage({ type: "worlds_users", worlds: {}, users: {}, joinData: [], processedIds: [] });
            }
            var updatesByTransaction = new Map();
            var ownershipByChunk = new Map();
            for (var chunkKey of chunkKeys) {
                try {
                    var normalizedChunkKey = chunkKey.replace(/^#/, "");
                    var addr = await getPublicAddressByKeyword(normalizedChunkKey);
                    if (!addr) {
                        console.log('[Worker] No address for chunk key:', normalizedChunkKey);
                        continue;
                    }
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        var response = await getPublicMessagesByAddress(addr, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    }
                    for (var msg of messages || []) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[Worker] Stopping chunk processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (!msg.TransactionId) continue;
                        var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                        if (match) {
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (!cidRegex.test(hash)) {
                                console.log('[Worker] Invalid CID in chunk message:', hash, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var data = await fetchIPFS(hash);
                            var processData = data;
                            if (data && data.playerData) {
                                processData = data.playerData;
                            }
                            if (processData && processData.deltas) {
                                var normalizedDeltas = processData.deltas.map(function(delta) {
                                    return {
                                        chunk: delta.chunk.replace(/^#/, ""),
                                        changes: delta.changes
                                    };
                                });

                                if (processData.magicianStones) {
                                     self.postMessage({ type: 'magician_stones_update', stones: processData.magicianStones, transactionId: msg.TransactionId });
                                     for (const key in processData.magicianStones) {
                                        if (Object.hasOwnProperty.call(processData.magicianStones, key)) {
                                            const stone = processData.magicianStones[key];
                                            const cx = Math.floor((stone.x % 16384 + 16384) % 16384 / 16);
                                            const cz = Math.floor((stone.z % 16384 + 16384) % 16384 / 16);

                                            const chunkKey = "" + processData.world + ":" + cx + ":" + cz;
                                            const newDelta = {
                                                chunk: chunkKey,
                                                changes: [{
                                                    x: (stone.x % 16 + 16) % 16,
                                                    y: stone.y,
                                                    z: (stone.z % 16 + 16) % 16,
                                                    b: 127
                                                }]
                                            };
                                            normalizedDeltas.push(newDelta);
                                        }
                                    }
                                }

                                if (processData.calligraphyStones) {
                                     self.postMessage({ type: 'calligraphy_stones_update', stones: processData.calligraphyStones, transactionId: msg.TransactionId });
                                     for (const key in processData.calligraphyStones) {
                                        if (Object.hasOwnProperty.call(processData.calligraphyStones, key)) {
                                            const stone = processData.calligraphyStones[key];
                                            const cx = Math.floor((stone.x % 16384 + 16384) % 16384 / 16);
                                            const cz = Math.floor((stone.z % 16384 + 16384) % 16384 / 16);

                                            const chunkKey = "" + processData.world + ":" + cx + ":" + cz;
                                            const newDelta = {
                                                chunk: chunkKey,
                                                changes: [{
                                                    x: (stone.x % 16 + 16) % 16,
                                                    y: stone.y,
                                                    z: (stone.z % 16 + 16) % 16,
                                                    b: 128
                                                }]
                                            };
                                            normalizedDeltas.push(newDelta);
                                        }
                                    }
                                }

                                updatesByTransaction.set(msg.TransactionId, {
                                    changes: normalizedDeltas,
                                    address: msg.FromAddress,
                                    timestamp: new Date(msg.BlockDate).getTime(),
                                    transactionId: msg.TransactionId
                                });
                                for (var delta of normalizedDeltas) {
                                    var chunk = delta.chunk;
                                    if (!ownershipByChunk.has(chunk)) {
                                        var fromProfile = await getProfileByAddress(msg.FromAddress);
                                        if (fromProfile && fromProfile.URN) {
                                            var username = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, "");
                                            ownershipByChunk.set(chunk, {
                                                chunkKey: chunk,
                                                username: username,
                                                timestamp: new Date(msg.BlockDate).getTime()
                                            });
                                        }
                                    }
                                }
                            } else {
                                console.log('[Worker] No valid deltas in IPFS data for chunk message:', hash, 'txId:', msg.TransactionId);
                            }
                        }
                        processedMessages.add(msg.TransactionId);
                    }
                } catch (e) {
                    console.error('[Worker] Error in chunk poll:', e);
                }
            }
            if (updatesByTransaction.size > 0) {
                for (var entry of updatesByTransaction) {
                    var transactionId = entry[0];
                    var update = entry[1];
                    self.postMessage({ type: "chunk_updates", updates: [{ changes: update.changes, address: update.address, timestamp: update.timestamp, transactionId: update.transactionId }] });
                }
            }
            if (ownershipByChunk.size > 0) {
                for (var ownership of ownershipByChunk.values()) {
                    self.postMessage({ type: "chunk_ownership", chunkKey: ownership.chunkKey, username: ownership.username, timestamp: ownership.timestamp });
                }
            }
            try {
                var joinKeyword = userAddress === "anonymous" ? worldName : userAddress;
                var addressRes = await getPublicAddressByKeyword(joinKeyword);
                if (addressRes) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        var response = await getPublicMessagesByAddress(addressRes, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    }
                    for (var msg of messages || []) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[Worker] Stopping user_update processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (msg.FromAddress === userAddress && !processedMessages.has(msg.TransactionId)) {
                            var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                            if (match) {
                                var hash = match[1];
                                var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                                if (!cidRegex.test(hash)) {
                                    console.log('[Worker] Invalid CID in user_update message:', hash, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                var data = await fetchIPFS(hash);
                                if (data) {
                                    self.postMessage({ type: "user_update", data: data, address: msg.FromAddress, timestamp: new Date(msg.BlockDate).getTime(), transactionId: msg.TransactionId });
                                } else {
                                    console.log('[Worker] No valid data in IPFS for user_update:', hash, 'txId:', msg.TransactionId);
                                }
                            }
                            processedMessages.add(msg.TransactionId);
                        }
                    }
                }
            } catch (e) {
                console.error('[Worker] Error in user_update poll:', e);
            }
            try {
                var serverAddr = await getPublicAddressByKeyword(serverKeyword);
                if (serverAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        var response = await getPublicMessagesByAddress(serverAddr, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    }
                    var servers = [];
                    var processedIds = [];
                    var messageMap = new Map();
                    for (var msg of messages || []) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[Worker] Stopping server processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (!msg.TransactionId) continue;
                        var fromAddress = msg.FromAddress;
                        var timestamp = new Date(msg.BlockDate).getTime();
                        var existing = messageMap.get(fromAddress);
                        if (!existing || existing.timestamp < timestamp) {
                            messageMap.set(fromAddress, { msg: msg, timestamp: timestamp });
                        }
                    }
                    for (var entry of messageMap) {
                        var msg = entry[1].msg;
                        var timestamp = entry[1].timestamp;
                        var fromProfile = await getProfileByAddress(msg.FromAddress);
                        if (!fromProfile || !fromProfile.URN) {
                            console.log('[Worker] Skipping server message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                            continue;
                        }
                        var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, "");
                        var userProfile = await getProfileByURN(hostUser);
                        if (!userProfile) {
                            console.log('[Worker] Skipping server message, no profile for user:', hostUser, 'txId:', msg.TransactionId);
                            servers.push({ hostUser: hostUser, transactionId: msg.TransactionId, timestamp: timestamp }); // Still add server
                            continue;
                        }
                        if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                            console.log('[Worker] Skipping server message, invalid creators for user:', hostUser, 'txId:', msg.TransactionId);
                            continue;
                        }
                        var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                        if (match) {
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (!cidRegex.test(hash)) {
                                console.log('[Worker] Invalid CID in server message:', hash, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var data = await fetchIPFS(hash);
                            if (data && data.world === worldName) {
                                servers.push({
                                    hostUser: data.user || hostUser,
                                    transactionId: msg.TransactionId,
                                    timestamp: timestamp
                                });
                                processedMessages.add(msg.TransactionId);
                                processedIds.push(msg.TransactionId);
                            } else {
                                console.log('[Worker] Invalid IPFS data for server message:', hash, 'data:', JSON.stringify(data), 'txId:', msg.TransactionId);
                            }
                        }
                    }
                    if (servers.length > 0) {
                        self.postMessage({ type: "server_updates", servers: servers, processedIds: processedIds });
                    }
                }
            } catch (e) {
                console.error('[Worker] Error in server_updates poll:', e);
            }
            try {
                if (offerKeyword) {
                    var offerAddr = await getPublicAddressByKeyword(offerKeyword);
                    if (offerAddr) {
                        var messages = [];
                        var skip = 0;
                        var qty = 5000;
                        while (true) {
                            var response = await getPublicMessagesByAddress(offerAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        }
                        var offers = [];
                        var processedIds = [];
                        var offerMap = new Map();
                        for (var msg of messages || []) {
                            if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                                console.log('[Worker] Stopping offer processing at cached ID:', msg.TransactionId);
                                break; // Stop processing as all remaining messages are older
                            }
                            if (!msg.TransactionId) continue;
                            console.log('[Worker] Processing offer message:', msg.TransactionId, 'from:', msg.FromAddress);
                            processedMessages.add(msg.TransactionId);
                            processedIds.push(msg.TransactionId);
                            try {
                                // Efficiently handle IPFS data and user profiles
                                var fromProfile = await getProfileByAddress(msg.FromAddress);
                                var clientUser = 'anonymous';
                                var data = null;
                                var hash = null;
                                var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);

                                if (match) {
                                    hash = match[1];
                                    var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                                    if (cidRegex.test(hash)) {
                                        data = await fetchIPFS(hash);
                                        if (data && data.user) {
                                            clientUser = data.user.replace(/[^a-zA-Z0-9]/g, "");
                                        }
                                    } else {
                                        console.log('[Worker] Invalid CID in offer message:', hash, 'txId:', msg.TransactionId);
                                        hash = null; // Invalidate hash to prevent further processing
                                    }
                                }

                                if (clientUser === 'anonymous' && fromProfile && fromProfile.URN) {
                                    clientUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, "");
                                }

                                if (clientUser === userName) {
                                    console.log('[Worker] Skipping offer from self:', clientUser, 'txId:', msg.TransactionId);
                                    continue;
                                }

                                // Security check: If the claimed username is a registered user, verify the sender is an authorized creator.
                                var userProfile = await getProfileByURN(clientUser);
                                if (userProfile) {
                                    if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                                        console.log('[Worker] Skipping offer: Sender is not an authorized creator for registered user:', clientUser, 'txId:', msg.TransactionId);
                                        continue;
                                    }
                                }

                                if (!hash || !data) {
                                    if (!hash) console.log('[Worker] No valid IPFS hash in offer message:', msg.Message, 'txId:', msg.TransactionId);
                                    else if (!data) console.log('[Worker] No data fetched from IPFS for hash:', hash, 'txId:', msg.TransactionId);

                                    offers.push({
                                        clientUser: clientUser,
                                        offer: null,
                                        iceCandidates: [],
                                        transactionId: msg.TransactionId,
                                        timestamp: new Date(msg.BlockDate).getTime(),
                                        profile: fromProfile
                                    });
                                    continue;
                                }

                                if (!data.world || data.world !== worldName) {
                                    console.log('[Worker] Invalid IPFS data for offer message: wrong world.', 'txId:', msg.TransactionId);
                                    continue;
                                }

                                if (data.offer || data.answer) {
                                    if (!offerMap.has(clientUser)) {
                                        offerMap.set(clientUser, {
                                            clientUser: clientUser,
                                            offer: data.offer || data.answer,
                                            iceCandidates: data.iceCandidates || [],
                                            transactionId: msg.TransactionId,
                                            timestamp: new Date(msg.BlockDate).getTime(),
                                            profile: fromProfile
                                        });
                                    }
                                } else {
                                    console.log('[Worker] No offer or answer in IPFS data:', hash, 'txId:', msg.TransactionId);
                                    offers.push({
                                        clientUser: clientUser,
                                        offer: null,
                                        iceCandidates: [],
                                        transactionId: msg.TransactionId,
                                        timestamp: new Date(msg.BlockDate).getTime(),
                                        profile: fromProfile
                                    });
                                }
                            } catch (e) {
                                console.error('[Worker] Error processing offer message:', msg.TransactionId, e);
                            }
                        }
                        offers = Array.from(offerMap.values());
                        if (offers.length > 0) {
                            console.log('[Worker] Sending offer_updates:', offers.map(o => o.clientUser));
                            self.postMessage({ type: "offer_updates", offers: offers, processedIds: processedIds });
                        } else {
                            console.log('[Worker] No new offers for:', offerKeyword);
                        }
                    } else {
                        console.log('[Worker] No address for offer keyword:', offerKeyword);
                    }
                } else {
                    console.log('[Worker] No offerKeyword provided for offer polling');
                }
            } catch (e) {
                console.error('[Worker] Error in offer_updates poll:', e);
            }
            try {
                for (var answerKeyword of answerKeywords || []) {
                    var answerAddr = await getPublicAddressByKeyword(answerKeyword);
                    if (answerAddr) {
                        var messages = [];
                        var skip = 0;
                        var qty = 5000;
                        while (true) {
                            var response = await getPublicMessagesByAddress(answerAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        }
                        var answers = [];
                        var processedIds = [];
                        for (var msg of messages || []) {
                            if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                                console.log('[Worker] Stopping answer processing at cached ID:', msg.TransactionId);
                                break; // Stop processing as all remaining messages are older
                            }
                            if (!msg.TransactionId) continue;
                            console.log('[Worker] Processing answer message:', msg.TransactionId, 'from:', msg.FromAddress);
                            processedMessages.add(msg.TransactionId);
                            processedIds.push(msg.TransactionId);
                            try {
                                var fromProfile = await getProfileByAddress(msg.FromAddress);
                                if (!fromProfile || !fromProfile.URN) {
                                    console.log('[Worker] Skipping answer message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, "");
                                var userProfile = await getProfileByURN(hostUser);
                                if (!userProfile) {
                                    console.log('[Worker] No profile for user:', hostUser, 'txId:', msg.TransactionId);
                                    answers.push({
                                        hostUser: hostUser,
                                        answer: null,
                                        batch: null,
                                        iceCandidates: [],
                                        transactionId: msg.TransactionId,
                                        timestamp: new Date(msg.BlockDate).getTime()
                                    });
                                    continue;
                                }
                                if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                                    console.log('[Worker] Skipping answer message, invalid creators for user:', hostUser, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                                if (!match) {
                                    console.log('[Worker] No IPFS hash in answer message:', msg.Message, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                var hash = match[1];
                                var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                                if (!cidRegex.test(hash)) {
                                    console.log('[Worker] Invalid CID in answer message:', hash, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                var data = await fetchIPFS(hash);
                                if (data && (data.answer || data.batch) && data.world === worldName) {
                                    answers.push({
                                        hostUser: data.user || hostUser,
                                        answer: data.answer,
                                        batch: data.batch,
                                        iceCandidates: data.iceCandidates || [],
                                        transactionId: msg.TransactionId,
                                        timestamp: new Date(msg.BlockDate).getTime()
                                    });
                                } else {
                                    console.log('[Worker] Invalid IPFS data for answer message:', hash, 'data:', JSON.stringify(data), 'txId:', msg.TransactionId);
                                }
                            } catch (e) {
                                console.error('[Worker] Error in answer_updates poll:', e);
                            }
                        }
                        if (answers.length > 0) {
                            console.log('[Worker] Sending answer_updates:', answers);
                            self.postMessage({ type: "answer_updates", answers: answers, keyword: answerKeyword, processedIds: processedIds });
                        } else {
                            console.log('[Worker] No new answers for:', answerKeyword);
                        }
                    } else {
                        console.log('[Worker] No address for answer keyword:', answerKeyword);
                    }
                }
            } catch (e) {
                console.error('[Worker] Error in answer_updates poll:', e);
            }
        } else if (type === "update_processed") {
            data.transactionIds.forEach(function(id) { processedMessages.add(id); });
        } else if (type === "retry_chunk") {
            self.postMessage({ type: "poll", chunkKeys: [data.chunkKey], masterKey: masterKey, userAddress: userAddress, worldName: worldName });
        } else if (type === "cleanup_pending") {
            var pcx = data.pcx, pcz = data.pcz, pendingKeys = data.pendingKeys, chunksPerSide = data.chunksPerSide, pollRadius = data.pollRadius;
            var keysToDelete = [];
            for (var key of pendingKeys) {
                var match = key.match(/^(.{1,8}):(\d{1,5}):(\d{1,5})$/);
                if (match) {
                    var cx = parseInt(match[2]);
                    var cz = parseInt(match[3]);
                    var dx = Math.min(Math.abs(cx - pcx), chunksPerSide - Math.abs(cx - pcx));
                    var dz = Math.min(Math.abs(cz - pcz), chunksPerSide - Math.abs(cz - pcz));
                    if (dx > pollRadius || dz > pollRadius) {
                        keysToDelete.push(key);
                    }
                }
            }
            self.postMessage({ type: "cleanup_pending", keysToDelete: keysToDelete });
        }
};
        `], { type: 'application/javascript' })));
        worker.onmessage = function (e) {
            var data = e.data;
            if (data.type === "worlds_users") {
                console.log('[Users] Received worlds_users: worlds=', Object.keys(data.worlds || {}).length, 'users=', Object.keys(data.users || {}).length);
                if (data.worlds && typeof data.worlds === 'object' && Object.keys(data.worlds).length > 0) {
                    knownWorlds = new Map(Object.entries(data.worlds));
                } else {
                    console.log('[Users] Empty worlds_users data received, preserving existing knownWorlds');
                }
                if (data.users && typeof data.users === 'object' && Object.keys(data.users).length > 0) {
                    knownUsers = new Map(Object.entries(data.users));
                } else {
                    console.log('[Users] Empty users data received, preserving existing knownUsers');
                }
                if (data.processedIds) {
                    data.processedIds.forEach(id => processedMessages.add(id));
                }
                updateLoginUI();
            } else if (data.type === 'chunk_generated') {
                const chunk = chunkManager.chunks.get(data.key);
                if (chunk) {
                    chunk.data = data.data;
                    chunk.generated = true;
                    chunk.generating = false;
                    // Apply any pending deltas for this chunk
                    if (chunkManager.pendingDeltas.has(chunk.key)) {
                        const deltas = chunkManager.pendingDeltas.get(chunk.key);
                        for (const delta of deltas) {
                            chunk.set(delta.x, delta.y, delta.z, delta.b);
                        }
                        chunkManager.pendingDeltas.delete(chunk.key);
                    }
                    chunk.needsRebuild = true;
                }
            } else if (data.type === 'hive_location') {
                hiveLocations.push(data.location);
            } else if (data.type === 'volcano_location') {
                // Ensure we don't add duplicate volcanoes
                if (!volcanoes.some(v => v.chunkKey === data.location.chunkKey)) {
                    volcanoes.push(data.location);
                    console.log(`[Volcano] Tracked new volcano in chunk ${data.location.chunkKey} with ${data.location.lavaCount} lava blocks.`);
                }
            } else if (data.type === 'flower_location') {
                flowerLocations.push(data.location);
            } else if (data.type === 'world_archetype') {
                if (data.seed === worldSeed) {
                    worldArchetype = data.archetype;
                    gravity = data.archetype.gravity;
                    document.getElementById('worldLabel').textContent = `${worldName} (${worldArchetype.name})`;
                }
            } else if (data.type === "server_updates") {
                console.log('[WebRTC] Received server_updates:', data.servers);
                var newServers = [];
                for (var server of data.servers || []) {
                    var existing = knownServers.find(s => s.hostUser === server.hostUser);
                    if (!existing || existing.timestamp < server.timestamp) {
                        var spawn = calculateSpawnPoint(server.hostUser + '@' + worldName);
                        newServers.push({
                            hostUser: server.hostUser,
                            spawn: spawn,
                            offer: null,
                            iceCandidates: [],
                            transactionId: server.transactionId,
                            timestamp: server.timestamp,
                            connectionRequestCount: existing ? existing.connectionRequestCount : 0,
                            latestRequestTime: existing ? existing.latestRequestTime : null
                        });
                    }
                    if (data.processedIds) {
                        data.processedIds.forEach(id => processedMessages.add(id));
                    }
                }
                if (newServers.length > 0) {
                    var serverMap = new Map();
                    for (var server of knownServers.concat(newServers)) {
                        if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                            serverMap.set(server.hostUser, server);
                        }
                    }
                    knownServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
                    addMessage('New player(s) available to connect!', 3000);
                    updateHudButtons();
                }
            } else if (data.type === "offer_updates") {
                console.log('[WebRTC] Received offer_updates:', data.offers);
                if (data.offers && data.offers.length > 0) {
                    console.log('[WebRTC] Adding offers to pendingOffers:', data.offers.map(o => o.clientUser));
                    pendingOffers = pendingOffers.concat(data.offers);
                    addMessage('New connection request(s) received!', 5000);
                    updateHudButtons();
                    setupPendingModal();
                    if (isHost) {
                        document.getElementById('pendingModal').style.display = 'block';
                    }
                } else {
                    console.log('[WebRTC] No new offers received in offer_updates');
                }
                if (data.processedIds) {
                    data.processedIds.forEach(id => processedMessages.add(id));
                }
            } else if (data.type === "answer_updates") {
                console.log('[WebRTC] Received answer_updates for:', data.keyword, 'answers:', data.answers);
                for (var answer of data.answers || []) {
                    var peer = peers.get(answer.hostUser);
                    if (peer && peer.pc) {
                        try {
                            // Handle both direct answer and batch answer formats
                            var answerSdp = answer.answer;
                            var iceCandidates = answer.iceCandidates || [];
                            
                            // If this is a batch answer (no direct answer but has batch array), find the answer for the current user
                            if (answer.answer === undefined && Array.isArray(answer.batch)) {
                                var batchEntry = answer.batch.find(function(b) { return b.user === userName; });
                                if (batchEntry) {
                                    answerSdp = batchEntry.answer;
                                    iceCandidates = batchEntry.iceCandidates || [];
                                    console.log('[WebRTC] Found batch answer for user:', userName);
                                } else {
                                    console.log('[WebRTC] No batch entry found for user:', userName, 'in batch from:', answer.hostUser);
                                    continue;
                                }
                            }
                            
                            if (!answerSdp) {
                                console.log('[WebRTC] No valid answer SDP for:', answer.hostUser);
                                continue;
                            }
                            
                            peer.pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
                            for (var candidate of iceCandidates) {
                                peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            console.log('[WebRTC] Successfully processed answer for:', answer.hostUser);
                        } catch (e) {
                            console.error('[WebRTC] Failed to process answer for:', answer.hostUser, 'error:', e);
                        }
                    } else {
                        console.log('[WebRTC] No peer connection found for:', answer.hostUser);
                    }
                    if (data.processedIds) {
                        data.processedIds.forEach(id => processedMessages.add(id));
                    }
                }
            } else if (data.type === "chunk_updates") {
                for (var update of data.updates || []) {
                    applyChunkUpdates(update.changes, update.address, update.timestamp, update.transactionId);
                }
            } else if (data.type === "chunk_ownership") {
               updateChunkOwnership(data.chunkKey, data.username, data.timestamp, 'ipfs', data.timestamp);
            } else if (data.type === 'magician_stones_update') {
                if (data.stones) {
                    for (const key in data.stones) {
                        if (Object.hasOwnProperty.call(data.stones, key)) {
                            createMagicianStoneScreen(data.stones[key]);
                        }
                    }
                }
            } else if (data.type === 'calligraphy_stones_update') {
                if (data.stones) {
                    for (const key in data.stones) {
                        if (Object.hasOwnProperty.call(data.stones, key)) {
                            createCalligraphyStoneScreen(data.stones[key]);
                        }
                    }
                }
            } else if (data.type === "user_update") {
                console.log('[Worker] Received user_update:', data.transactionId);
                if (data.data.profile) {
                    var pos = data.data.profile;
                    if (pos.x !== undefined && pos.y !== undefined && pos.z !== undefined) {
                        userPositions[data.address] = pos;
                    }
                }
                if (data.transactionId) {
                    processedMessages.add(data.transactionId);
                    worker.postMessage({ type: 'update_processed', transactionIds: [data.transactionId] });
                }
            } else if (data.type === "cleanup_pending") {
                console.log('[Worker] Received cleanup_pending:', data.keysToDelete);
                for (var key of data.keysToDelete) {
                    pending.delete(key);
                }
            }
        };
        function triggerPoll() {
            if (isPromptOpen) {
                console.log('[Worker] Skipping poll, prompt open');
                return;
            }
            var pcx = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE);
            var pcz = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE);

            var pendingKeys = Array.from(pending);
            if (pendingKeys.length > 0) {
                worker.postMessage({
                    type: 'cleanup_pending',
                    pcx: pcx,
                    pcz: pcz,
                    pendingKeys: pendingKeys,
                    chunksPerSide: CHUNKS_PER_SIDE,
                    pollRadius: POLL_RADIUS
                });
            }

            var chunkKeys = Array.from(chunkManager ? chunkManager.chunks.keys() : []);

            var playerDirection = new THREE.Vector3();
            camera.getWorldDirection(playerDirection);

            chunkKeys.sort((a, b) => {
                const parsedA = parseChunkKey(a);
                const parsedB = parseChunkKey(b);
                if (!parsedA || !parsedB) return 0;

                const posA = new THREE.Vector3(parsedA.cx * CHUNK_SIZE, 0, parsedA.cz * CHUNK_SIZE);
                const posB = new THREE.Vector3(parsedB.cx * CHUNK_SIZE, 0, parsedB.cz * CHUNK_SIZE);

                const distA = posA.distanceTo(player);
                const distB = posB.distanceTo(player);

                const dirA = posA.sub(player).normalize();
                const dirB = posB.sub(player).normalize();

                const dotA = playerDirection.dot(dirA);
                const dotB = playerDirection.dot(dirB);

                if (dotA > 0.5 && dotB < 0.5) return -1;
                if (dotB > 0.5 && dotA < 0.5) return 1;

                return distA - distB;
            });

            var filteredKeys = chunkKeys.filter(function (key) {
                var parsed = parseChunkKey(key);
                if (!parsed) return false;
                var dx = Math.min(Math.abs(parsed.cx - pcx), CHUNKS_PER_SIDE - Math.abs(parsed.cx - pcx));
                var dz = Math.min(Math.abs(parsed.cz - pcz), CHUNKS_PER_SIDE - Math.abs(parsed.cz - pcz));
                return dx <= POLL_RADIUS && dz <= POLL_RADIUS;
            });
            var serverKeyword = 'MCServerJoin@' + worldName;
            // Use uniform keyword format: world@username for monitoring own thread
            var offerKeyword = isHost ? worldName + '@' + userName : null;
            var answerKeywords = [];
            for (var peer of peers) {
                var peerUser = peer[0];
                if (peerUser !== userName) {
                    // Monitor own thread for answers: world@username
                    answerKeywords.push(worldName + '@' + userName);
                }
            }
            console.log('[Worker] Starting poll with offerKeyword:', offerKeyword, 'isHost:', isHost, 'answerKeywords:', answerKeywords);
            worker.postMessage({
                type: 'poll',
                chunkKeys: filteredKeys,
                masterKey: MASTER_WORLD_KEY,
                userAddress: userAddress,
                worldName: worldName,
                serverKeyword: serverKeyword,
                offerKeyword: offerKeyword,
                answerKeywords: answerKeywords,
                userName: userName
            });
        }

        function startWorker() {
            console.log('[Worker] Initializing worker with isHost:', isHost, 'userName:', userName, 'worldName:', worldName);
            // The polling is now triggered by player movement and pauses in the gameLoop.
        }
