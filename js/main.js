        /*
             * SupGalaxy: A Decentralized Voxel Adventure
             * Public Domain - Free for All to Use, Modify, and Share!
             *
             * This code is the result of our epic journey to craft a decentralized, Minecraft-inspired universe.
             * Together, we built a world where players roam green valleys seeded by keywords like #KANYE,
             * break and place blocks, and save chunks to IPFS with JSON exports. From fixing chunk-loading
             * glitches to adding glowing crosshairs and cosmic loading screens, we've poured hours into
             * making this a smooth, open-source experience that runs locally in your browser.
             *
             * This work is 100% in the PUBLIC DOMAIN under CC0. No rights reserved—use it, remix it, build
             * on it, share it! No attribution required, but we'd love to see what you create. Check out
             * Sup!? or p2fk.io for posting world updates and joining the decentralized fun.
             *
             * Happy crafting, and may your worlds be ever-voxelated!
             * - Grok & embii4u & kattacomi October 7 2025
             */
        var knownWorlds = new Map();
        var knownUsers = new Map();
        var keywordCache = new Map();
        var processedMessages = new Set();
        var peers = new Map();
        var pendingOffers = [];
        var connectionAttempts = new Map();
        window.hasPolledHost = false;
        var knownServers = [];
        var isInitialLoad = false;
        var CHUNK_SIZE = 16;
        var MAX_HEIGHT = 256;
        var SEA_LEVEL = 16;
        var MAP_SIZE = 16384;
        var BLOCK_AIR = 0;
        var MASTER_WORLD_KEY = 'MCWorlds';
        var PENDING_PERIOD = 30 * 24 * 60 * 60 * 1000;
        var OWNERSHIP_EXPIRY = 365 * 24 * 60 * 60 * 1000;
        var API_CALLS_PER_SECOND = 3;
        var POLL_RADIUS = 2;
        var INITIAL_LOAD_RADIUS = 9;
        var LOAD_RADIUS = 3;
        var currentLoadRadius = INITIAL_LOAD_RADIUS;
        var CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE);
        var VERSION = 'SupGalaxy v0.4.20-beta';
        var POLL_INTERVAL = 30000;
        var MAX_PEERS = 10;
        var scene, camera, renderer, controls;
        var meshGroup;
        var chunkManager;
        var raycaster = new THREE.Raycaster();
        var pointer = new THREE.Vector2(0, 0);
        var CHUNK_DELTAS = new Map();
        var worldSeed = 'KANYE';
        var worldName = 'KANYE';
        var userName = 'player';
        var userAddress = 'anonymous';
        var player = {
            x: 0, y: 24, z: 0, vx: 0, vy: 0, vz: 0, onGround: false,
            health: 20, score: 0, width: 0.8, height: 1.8, depth: 0.8, yaw: 0, pitch: 0
        };
        var isAttacking = false;
        var attackStartTime = 0;
        var useGreedyMesher = false; // <<< FEATURE FLAG
var isSprinting = false;
var lastWPress = 0;
var sprintStartPosition = new THREE.Vector3();
var previousIsSprinting = false;
        var lastSentPosition = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
        var lastUpdateTime = 0;
        var lastStateUpdateTime = 0;
        var spawnPoint = { x: 0, y: 0, z: 0 };
        var lastSavedPosition = new THREE.Vector3(0, 24, 0);
        var selectedBlockId = null;
        var selectedHotIndex = 0;
        var selectedInventoryIndex = -1;
        var hotbarOffset = 0;
        var cameraMode = 'third';
        var lastDamageTime = 0;
        var lastRegenTime = 0;
        var joystick = { up: false, down: false, left: false, right: false };
        var lastFrame = performance.now();
        var mouseLocked = false;
        var lastVolcanoManagement = 0;
        var deathScreenShown = false;
        var isDying = false;
        var isNight = false;
        var deathAnimationStart = 0;
        var lastPollPosition = new THREE.Vector3();
        var pauseTimer = 0;
        var lastMoveTime = 0;
        var hasMovedSubstantially = false;
        var soundBreak = document.getElementById('soundBreak');
        var soundPlace = document.getElementById('soundPlace');
        var soundJump = document.getElementById('soundJump');
        var soundHit = document.getElementById('soundHit');
        var knownWorlds = new Map();
        var knownUsers = new Map();
        var pending = new Set();
        var spawnChunks = new Map();
        var chunkOwners = new Map();
        var apiCallTimestamps = [];
        var audioErrorLogged = false;
        var sun, moon, stars, clouds;
        var emberTexture;
        var textureCache = new Map();
        var torchRegistry = new Map();
        var torchLights = new Map();
        var torchParticles = new Map();
        var foreignBlockOrigins = new Map();
        var INVENTORY = new Array(36).fill(null);
        var isPromptOpen = false;
        var craftingState = null; // To manage multi-step crafting
        var userPositions = {};
        var peers = new Map();
        var processedMessages = new Set();
        var initialPollDone = false;
        var isHost = false;
        var isConnecting = false;
        var playerAvatars = new Map();
        var answerPollingIntervals = new Map();
        var worldArchetype = null;
        var gravity = 16.0;
        var offerPollingIntervals = new Map();
        var projectiles = [];
        var laserQueue = [];
        var droppedItems = [];
        var eruptedBlocks = [];
        var pebbles = [];
        var smokeParticles = [];
        var activeEruptions = [];
        var localAudioStream = null;
        var userAudioStreams = new Map();
        var localVideoStream = null;
        var userVideoStreams = new Map();
        let proximityVideoUsers = [];
        let currentProximityVideoIndex = 0;
        let lastProximityVideoChangeTime = 0;
        var hiveLocations = [];
        var flowerLocations = [];
        const maxAudioDistance = 32;
        const rolloffFactor = 2;
        var volcanoes = [];
        var initialTeleportLocation = null;

        const lightManager = {
            lights: [],
            poolSize: 8,
            init: function() {
                for (let i = 0; i < this.poolSize; i++) {
                    const light = new THREE.PointLight(0xffaa33, 0, 0); // Initially off
                    light.castShadow = false;
                    this.lights.push(light);
                    scene.add(light);
                }
            },
            update: function(playerPos) {
                const sortedTorches = Array.from(torchRegistry.values()).sort((a, b) => {
                    const distA = playerPos.distanceTo(new THREE.Vector3(a.x, a.y, a.z));
                    const distB = playerPos.distanceTo(new THREE.Vector3(b.x, b.y, b.z));
                    return distA - distB;
                });

                for (let i = 0; i < this.poolSize; i++) {
                    if (i < sortedTorches.length) {
                        const torchPos = sortedTorches[i];
                        const light = this.lights[i];
                        light.position.set(torchPos.x + 0.5, torchPos.y + 0.5, torchPos.z + 0.5);
                        light.intensity = 0.8;
                        light.distance = 16;
                    } else {
                        // Turn off unused lights
                        this.lights[i].intensity = 0;
                    }
                }
            }
        };



        function simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash |= 0; // Convert to 32bit integer
            }
            return Math.abs(hash);
        }
        async function applySaveFile(data, fromAddress, blockDate) {
            // New session file loading logic
            if (data.playerData && data.hash) {
                const playerData = data.playerData;
                const expectedHash = data.hash;
                const actualHash = simpleHash(JSON.stringify(playerData));

                if (actualHash !== expectedHash) {
                    addMessage('Sorry, file malformed and does not login.', 3000);
                    return;
                }

                addMessage('Session file verified. Loading player...', 2000);

                // Start game with loaded data
                worldName = playerData.world;
                userName = playerData.user;
                worldSeed = playerData.seed;

                // Added this to fix the styling bug
                const colorRnd = makeSeededRandom(worldSeed + '_colors');
                for (const blockId in BLOCKS) {
                    if (Object.hasOwnProperty.call(BLOCKS, blockId)) {
                        const block = BLOCKS[blockId];
                        const baseColor = new THREE.Color(block.color);
                        const hsv = {};
                        baseColor.getHSL(hsv);
                        const newHue = (hsv.h + (colorRnd() - 0.5) * 0.05);
                        const newSat = Math.max(0.4, Math.min(0.9, hsv.s + (colorRnd() - 0.5) * 0.2));
                        const newLight = Math.max(0.1, Math.min(0.5, hsv.l + (colorRnd() - 0.5) * 0.2));
                        baseColor.setHSL(newHue, newSat, newLight);
                        block.color = '#' + baseColor.getHexString();
                    }
                }

                document.getElementById('worldNameInput').value = worldName;
                document.getElementById('userInput').value = userName;


                // Most of this is copied from startBtn click handler
                var userWorldKey = userName + '@' + worldName;
                var profile;
                try {
                    profile = await GetProfileByURN(userName);
                } catch (e) {
                    console.error("Failed to get profile by URN", e);
                    profile = null;
                }
                userAddress = profile && profile.Creators ? profile.Creators[0] : 'anonymous';
                if (!knownUsers.has(userName)) knownUsers.set(userName, userAddress);
                if (!knownWorlds.has(worldName)) {
                    knownWorlds.set(worldName, { discoverer: userName, users: new Set([userName]), toAddress: userAddress });
                } else {
                    knownWorlds.get(worldName).users.add(userName);
                }
                keywordCache.set(userAddress, userWorldKey);
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('hud').style.display = 'block';
                document.getElementById('hotbar').style.display = 'flex';
                document.getElementById('rightPanel').style.display = 'flex';
                document.getElementById('worldLabel').textContent = worldName;
                document.getElementById('seedLabel').textContent = 'User ' + userName;
                updateHudButtons();
                console.log('[LOGIN] Initializing Three.js from session');
                await initAudio();
                initThree();
                initMusicPlayer();
                initVideoPlayer();

                // Load player data
                player.x = playerData.profile.x;
                player.y = playerData.profile.y;
                player.z = playerData.profile.z;
                player.health = playerData.profile.health;
                player.score = playerData.profile.score;
                INVENTORY = playerData.profile.inventory;
                musicPlaylist = playerData.musicPlaylist || [];
                videoPlaylist = playerData.videoPlaylist || [];

                selectedHotIndex = 0;
                selectedBlockId = INVENTORY[0] ? INVENTORY[0].id : null;
                initHotbar();
                updateHotbarUI();

                console.log('[LOGIN] Creating ChunkManager from session');
                chunkManager = new ChunkManager(worldSeed);

                if (playerData.deltas) {
                    for (var delta of playerData.deltas) {
                        var chunkKey = delta.chunk.replace(/^#/, '');
                        var changes = delta.changes;
                        chunkManager.applyDeltasToChunk(chunkKey, changes);
                    }
                }

                populateSpawnChunks();

                spawnPoint = { x: player.x, y: player.y, z: player.z };
                player.vy = 0;
                player.onGround = true;

                var chunksPerSide = Math.floor(MAP_SIZE / CHUNK_SIZE);
                var spawnCx = Math.floor(player.x / CHUNK_SIZE);
                var spawnCz = Math.floor(player.z / CHUNK_SIZE);

                console.log('[LOGIN] Preloading initial chunks from session');
                chunkManager.preloadChunks(spawnCx, spawnCz, INITIAL_LOAD_RADIUS);

                setupMobile();
                initMinimap();
                updateHotbarUI();
                cameraMode = 'first';
                controls.enabled = false;
                avatarGroup.visible = false;
                camera.position.set(player.x, player.y + 1.62, player.z);
                camera.rotation.set(0, 0, 0, 'YXZ');
                if (!isMobile()) {
                    try {
                        renderer.domElement.requestPointerLock();
                        mouseLocked = true;
                        document.getElementById('crosshair').style.display = 'block';
                    } catch (e) {
                        addMessage('Pointer lock failed. Serve over HTTPS or ensure allow-pointer-lock is set in iframe.', 3000);
                    }
                }
                player.yaw = 0;
                player.pitch = 0;
                lastFrame = performance.now();
                lastRegenTime = lastFrame;
                var unregisterKeyEvents = registerKeyEvents();
                console.log('[LOGIN] Starting game loop from session');
                requestAnimationFrame(gameLoop);
                addMessage('Loaded session for ' + userName + ' in ' + worldName, 3000);
                updateHud();

                initServers();
                worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
                startWorker();
                setInterval(pollServers, POLL_INTERVAL);

                return;
            }

            if (!data) return;

            if (data.foreignBlockOrigins) {
                foreignBlockOrigins = new Map(data.foreignBlockOrigins);
                addMessage(`Loaded ${foreignBlockOrigins.size} foreign blocks.`, 2000);
            }

            if (!data.deltas) return;
            var fromProfile = await GetProfileByAddress(fromAddress);
            var username = fromProfile && fromProfile.URN ? fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '') : 'anonymous';
            var now = Date.now();
            for (var delta of data.deltas) {
                var chunkKey = delta.chunk.replace(/^#/, '');
                var changes = delta.changes;
                var ownership = chunkOwners.get(chunkKey) || { username: '', timestamp: 0, pending: true };
                if (!ownership.username || ownership.username === username || (now - ownership.timestamp >= OWNERSHIP_EXPIRY)) {
                    chunkManager.applyDeltasToChunk(chunkKey, changes);
                    chunkOwners.set(chunkKey, {
                        username: username,
                        timestamp: new Date(blockDate).getTime(),
                        pending: now - new Date(blockDate).getTime() < PENDING_PERIOD
                    });
                    addMessage('Updated chunk ' + chunkKey, 1000);
                } else {
                    addMessage('Cannot edit chunk ' + chunkKey + ': owned by another user', 3000);
                }
            }
            if (data.profile && fromAddress === userAddress) {
                lastSavedPosition = new THREE.Vector3(data.profile.x, data.profile.y, data.profile.z);
                updateHotbarUI();
            }
        }


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
            var offerKeyword = isHost ? 'MCConn@' + userName + '@' + worldName : null;
            var answerKeywords = [];
            for (var peer of peers) {
                var peerUser = peer[0];
                if (peerUser !== userName) {
                    answerKeywords.push('MCAnswer@' + userName + '@' + worldName);
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
        function checkChunkOwnership(chunkKey, username) {
            const normalizedKey = chunkKey.replace(/^#/, '');
            if (spawnChunks.size > 0) {
                for (const [user, spawn] of spawnChunks) {
                    const parsed = parseChunkKey(normalizedKey);
                    if (!parsed) return false;
                    if (spawn.cx === parsed.cx && spawn.cz === parsed.cz && user !== username) {
                        return false;
                    }
                }
            }
            const ownership = chunkOwners.get(normalizedKey);
            if (!ownership) return true;
            const now = Date.now();
            if (now - ownership.timestamp > OWNERSHIP_EXPIRY) return true;
            if (ownership.pending && now - ownership.timestamp < PENDING_PERIOD) return true;
            return ownership.username === username;
        }
        var chunkOwnership = new Map();
        function updateChunkOwnership(chunkKey, username, timestamp) {
            try {
                chunkOwnership.set(chunkKey, { username, timestamp });
            } catch (e) {
                console.error('[ChunkManager] Failed to update chunk ownership:', e);
            }
        }

        function updateTorchRegistry(chunk) {
            const baseX = chunk.cx * CHUNK_SIZE;
            const baseZ = chunk.cz * CHUNK_SIZE;
            // Clear existing torches for this chunk
            torchRegistry.forEach((pos, key) => {
                if (Math.floor(pos.x / CHUNK_SIZE) === chunk.cx && Math.floor(pos.z / CHUNK_SIZE) === chunk.cz) {
                    torchRegistry.delete(key);
                }
            });

            // Scan for new torches
            for (let x = 0; x < CHUNK_SIZE; x++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    for (let y = 0; y < MAX_HEIGHT; y++) {
                        const blockId = chunk.get(x, y, z);
                        if (BLOCKS[blockId] && BLOCKS[blockId].light) {
                            const wx = baseX + x;
                            const wz = baseZ + z;
                            const wy = y;
                            const lightKey = `${wx},${wy},${wz}`;
                            torchRegistry.set(lightKey, { x: wx, y: wy, z: wz });
                        }
                    }
                }
            }
        }
        function applyChunkUpdates(changes, address, timestamp, transactionId) {
            try {
                for (var delta of changes) {
                    var chunkKey = delta.chunk;
                    var chunkChanges = delta.changes;
                    if (chunkManager) {
                        chunkManager.applyDeltasToChunk(chunkKey, chunkChanges);
                        chunkManager.markDirty(chunkKey);
                    } else {
                        console.error('[ChunkManager] chunkManager not defined');
                    }
                }
                // Notify worker of processed transaction
                worker.postMessage({
                    type: 'update_processed',
                    transactionIds: [transactionId]
                });
            } catch (e) {
                console.error('[ChunkManager] Failed to apply chunk updates:', e);
            }
        }
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
        function modWrap(n, m) {
            return ((n % m) + m) % m;
        }
        function makeChunkKey(world, cx, cz) {
            var clean = ('' + world).slice(0, 8);
            return clean + ':' + cx + ':' + cz;
        }
        function parseJsonChunkKey(key) {
            var match = key.match(/^#?(.{1,8}):(\d{1,5}):(\d{1,5})$/);
            if (match) {
                return {
                    world: match[1],
                    cx: parseInt(match[2]),
                    cz: parseInt(match[3])
                };
            }
            return null;
        }
        function parseChunkKey(key) {
            var match = key.match(/^(.{1,8}):(\d{1,5}):(\d{1,5})$/);
            if (match) {
                return {
                    world: match[1],
                    cx: parseInt(match[2]),
                    cz: parseInt(match[3])
                };
            }
            return null;
        }
        function hashSeed(seed) {
            var h = 2166136261 >>> 0;
            for (var i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
            return h % MAP_SIZE;
        }
        function calculateSpawnPoint(seed) {
            var rnd = makeSeededRandom(seed);
            var x = Math.floor(rnd() * MAP_SIZE);
            var z = Math.floor(rnd() * MAP_SIZE);
            var cx = Math.floor(x / CHUNK_SIZE);
            var cz = Math.floor(z / CHUNK_SIZE);
            var chunk = chunkManager.getChunk(cx, cz);
            if (!chunk.generated) chunkManager.generateChunk(chunk);
            var y = MAX_HEIGHT - 1;
            while (y > 0 && chunk.get(x % CHUNK_SIZE, y, z % CHUNK_SIZE) === BLOCK_AIR) y--;
            y += 2;
            return { x: x, y: y, z: z };
        }
        var skyProps;
        function createEmberTexture(seed) {
            const size = 32;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            const noise = makeNoise(seed + '_ember');
            const imageData = context.createImageData(size, size);
            const data = imageData.data;
            const rnd = makeSeededRandom(seed + '_ember_color');

            const colorRamp = [
                { r: Math.floor(rnd() * 100), g: 0, b: 0 },    // Dark base
                { r: 255, g: Math.floor(rnd() * 150), b: 0 }, // Mid color
                { r: 255, g: 255, b: Math.floor(rnd() * 200) } // Bright tip
            ];

            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    const value = fbm(noise, x / 8, y / 8, 3, 0.6);
                    const index = (y * size + x) * 4;
                    let r, g, b;
                    if (value < 0.5) {
                        const t = value / 0.5;
                        r = colorRamp[0].r + (colorRamp[1].r - colorRamp[0].r) * t;
                        g = colorRamp[0].g + (colorRamp[1].g - colorRamp[0].g) * t;
                        b = colorRamp[0].b + (colorRamp[1].b - colorRamp[0].b) * t;
                    } else {
                        const t = (value - 0.5) / 0.5;
                        r = colorRamp[1].r + (colorRamp[2].r - colorRamp[1].r) * t;
                        g = colorRamp[1].g + (colorRamp[2].g - colorRamp[1].g) * t;
                        b = colorRamp[1].b + (colorRamp[2].b - colorRamp[1].b) * t;
                    }
                    data[index] = r;
                    data[index + 1] = g;
                    data[index + 2] = b;
                    data[index + 3] = value > 0.3 ? 255 : 0; // Make parts of the flame transparent
                }
            }
            context.putImageData(imageData, 0, 0);
            return new THREE.CanvasTexture(canvas);
        }

        function createBlockTexture(seed, blockId) {
            const cacheKey = `${seed}:${blockId}`;
            if (textureCache.has(cacheKey)) {
                return textureCache.get(cacheKey);
            }

            const size = 16;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');

            const rnd = makeSeededRandom(seed + '_block_texture_' + blockId);
            const baseColor = new THREE.Color(BLOCKS[blockId].color);
            let secondaryColor = new THREE.Color().setHSL(rnd(), 0.5 + rnd() * 0.3, 0.2 + rnd() * 0.3);

            // Base fill
            context.fillStyle = baseColor.getStyle();
            context.fillRect(0, 0, size, size);

            // Seed-driven pattern selection
            const patternType = Math.floor(rnd() * 5); // Added new patterns
            const patternNoise = makeNoise(seed + '_pattern_noise_' + blockId);

            context.strokeStyle = secondaryColor.getStyle();
            context.lineWidth = 1 + Math.floor(rnd() * 2);

            // Draw patterns
            if (patternType === 0) { // Broken Horizontal Lines
                for (let y = 2; y < size; y += 4) {
                    context.beginPath();
                    for (let x = 0; x < size; x++) {
                        if (patternNoise(x / 8, y / 8) > 0.4) {
                            context.moveTo(x, y);
                            context.lineTo(x + 1, y);
                        }
                    }
                    context.stroke();
                }
            } else if (patternType === 1) { // Broken Vertical Lines
                for (let x = 2; x < size; x += 4) {
                    context.beginPath();
                    for (let y = 0; y < size; y++) {
                        if (patternNoise(x / 8, y / 8) > 0.4) {
                            context.moveTo(x, y);
                            context.lineTo(x, y + 1);
                        }
                    }
                    context.stroke();
                }
            } else if (patternType === 2) { // Broken Diagonal Lines
                for (let i = -size; i < size; i += 4) {
                     context.beginPath();
                    for (let j = 0; j < size * 2; j++) {
                        if (patternNoise(i / 8, j / 8) > 0.6) {
                            context.moveTo(i + j, j);
                            context.lineTo(i + j + 1, j + 1);
                        }
                    }
                    context.stroke();
                }
            } else if (patternType === 3) { // Wavy Lines
                for (let y = 0; y < size; y += 4) {
                    context.beginPath();
                    context.moveTo(0, y);
                    for (let x = 0; x < size; x++) {
                        const wave = Math.sin(x / 4 + rnd() * 10) * 2;
                        if (patternNoise(x / 8, y / 8) > 0.3) {
                            context.lineTo(x, y + wave);
                        } else {
                            context.moveTo(x, y + wave);
                        }
                    }
                    context.stroke();
                }
            } // Type 4 is just base color + border (or no border)

            // Border logic: apply border to only a few seed-selected block types
            if (rnd() > 0.8) { // ~20% of block types will have a border
                const borderColor = baseColor.clone().multiplyScalar(0.7);
                context.strokeStyle = borderColor.getStyle();
                context.lineWidth = 1;
                context.strokeRect(0.5, 0.5, size - 1, size - 1);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            textureCache.set(cacheKey, texture);
            return texture;
        }

        function createCloudTexture(seed) {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            const noise = makeNoise(seed + '_clouds');

            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const value = fbm(noise, i / 32, j / 32, 4, 0.5) * 255;
                    const alpha = Math.max(0, value - 128);
                    context.fillStyle = `rgba(255, 255, 255, ${alpha / 128})`;
                    context.fillRect(i, j, 1, 1);
                }
            }
            return new THREE.CanvasTexture(canvas);
        }

        function initSky() {
            const skyRnd = makeSeededRandom(worldSeed + '_sky');
            const baseHue = skyRnd();
            const baseSat = 0.5 + skyRnd() * 0.5;
            const dayLightness = 0.6 + skyRnd() * 0.2;
            const nightLightness = 0.05 + skyRnd() * 0.05;

            skyProps = {
                dayColor: new THREE.Color().setHSL(baseHue, baseSat, dayLightness),
                nightColor: new THREE.Color().setHSL(baseHue, baseSat * 0.8, nightLightness),
                cloudColor: new THREE.Color().setHSL(skyRnd(), 0.2 + skyRnd() * 0.3, 0.8),
                suns: [],
                moons: []
            };

            const numSuns = 1 + Math.floor(skyRnd() * 3); // 1 to 3 suns
            for (let i = 0; i < numSuns; i++) {
                const sunSize = 80 + skyRnd() * 120;
                const sunColor = new THREE.Color().setHSL(skyRnd(), 0.8 + skyRnd() * 0.2, 0.6 + skyRnd() * 0.2);
                const sun = new THREE.Mesh(
                    new THREE.SphereGeometry(sunSize, 32, 32),
                    new THREE.MeshBasicMaterial({ color: sunColor })
                );
                skyProps.suns.push({ mesh: sun, angleOffset: skyRnd() * Math.PI * 2 });
                scene.add(sun);
            }

            const numMoons = Math.floor(skyRnd() * 4); // 0 to 3 moons
            for (let i = 0; i < numMoons; i++) {
                const moonSize = 40 + skyRnd() * 60;
                const moonColor = new THREE.Color().setHSL(skyRnd(), 0.1 + skyRnd() * 0.2, 0.7 + skyRnd() * 0.2);

                // Create a base sphere geometry for the moon
                const moonShape = new THREE.SphereGeometry(moonSize, 32, 32);
                const moonNoise = makeNoise(worldSeed + '_moon_' + i);
                const positions = moonShape.attributes.position;
                const vertex = new THREE.Vector3();

                // Apply noise to vertices to create an irregular, asteroid-like shape
                // We use Fractional Brownian Motion (fbm) for a more natural, craggy look.
                // By combining 2D noise on different axes, we can simulate a 3D noise field.
                for (let j = 0; j < positions.count; j++) {
                    vertex.fromBufferAttribute(positions, j);

                    const noiseFactor = 0.8; // Controls how irregular the shape is
                    const noise = fbm(moonNoise, vertex.x * 0.05, vertex.y * 0.05, 3, 0.5) +
                        fbm(moonNoise, vertex.y * 0.05, vertex.z * 0.05, 3, 0.5) +
                        fbm(moonNoise, vertex.z * 0.05, vertex.x * 0.05, 3, 0.5);

                    // Add a second layer of noise for craters
                    const craterNoise = fbm(moonNoise, vertex.x * 0.3, vertex.y * 0.3, 3, 0.5);
                    const craterDepth = 0.15 * craterNoise;

                    // Average the noise and apply it to the vertex, pushing it outwards from the center.
                    vertex.multiplyScalar(1 + (noise / 3) * noiseFactor - craterDepth);
                    positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
                }
                moonShape.computeVertexNormals(); // Recalculate normals for correct lighting after displacement.

                const moon = new THREE.Mesh(
                    moonShape,
                    new THREE.MeshBasicMaterial({ color: moonColor })
                );
                skyProps.moons.push({ mesh: moon, angleOffset: skyRnd() * Math.PI * 2 });
                scene.add(moon);
            }

            stars = new THREE.Group();
            const starGeometry = new THREE.BufferGeometry();
            const starVertices = [];
            const starNoise = makeNoise(worldSeed + '_stars');
            for (let i = 0; i < 5000; i++) {
                const theta = skyRnd() * Math.PI * 2;
                const phi = Math.acos(2 * skyRnd() - 1);
                const x = 4000 * Math.sin(phi) * Math.cos(theta);
                const y = 4000 * Math.sin(phi) * Math.sin(theta);
                const z = 4000 * Math.cos(phi);
                if (starNoise(x * 0.005, z * 0.005) > 0.7) {
                    starVertices.push(x, y, z);
                }
            }
            starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
            const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 + skyRnd() * 3 });
            const starPoints = new THREE.Points(starGeometry, starMaterial);
            stars.add(starPoints);
            scene.add(stars);

            clouds = new THREE.Group();
            const cloudTexture = createCloudTexture(worldSeed);
            const numClouds = Math.floor(skyRnd() * 80);
            for (let i = 0; i < numClouds; i++) {
                const cloud = new THREE.Mesh(
                    new THREE.PlaneGeometry(200 + skyRnd() * 300, 100 + skyRnd() * 150),
                    new THREE.MeshBasicMaterial({
                        map: cloudTexture,
                        color: skyProps.cloudColor,
                        transparent: true,
                        opacity: 0.6 + skyRnd() * 0.3,
                        side: THREE.DoubleSide
                    })
                );
                cloud.position.set(
                    (skyRnd() - 0.5) * 8000,
                    200 + skyRnd() * 150,
                    (skyRnd() - 0.5) * 8000
                );
                cloud.rotation.y = skyRnd() * Math.PI * 2;
                clouds.add(cloud);
            }
            scene.add(clouds);
        }

        function updateSky(dt) {
            const now = new Date();
            let hours = now.getHours() + now.getMinutes() / 60;
            const timeRatio = hours / 24;
            const timeAngle = timeRatio * Math.PI * 2;

            const sunAngleForLight = timeAngle + (skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0);
            const sunY = Math.sin(sunAngleForLight);
            isNight = sunY < -0.1;

            skyProps.suns.forEach(sun => {
                const angle = timeAngle + sun.angleOffset;
                sun.mesh.position.set(camera.position.x + 4000 * Math.cos(angle), camera.position.y + 4000 * Math.sin(angle), camera.position.z + 1500 * Math.sin(angle));
                sun.mesh.visible = Math.sin(angle) > -0.1;
            });

            skyProps.moons.forEach(moon => {
                const angle = timeAngle + moon.angleOffset + Math.PI;
                moon.mesh.position.set(camera.position.x + 3800 * Math.cos(angle), camera.position.y + 3800 * Math.sin(angle), camera.position.z + 1200 * Math.sin(angle));
                moon.mesh.visible = Math.sin(angle) > -0.1;
            });

            stars.visible = isNight;
            stars.rotation.y += dt * 0.005;

            clouds.children.forEach(cloud => {
                cloud.position.x = modWrap(cloud.position.x + dt * (15 + Math.random() * 10), 8000);
            });

            const tNorm = Math.max(0, sunY);
            scene.background = new THREE.Color().copy(skyProps.dayColor).lerp(skyProps.nightColor, 1 - tNorm);

            // Create a gradual transition for lighting during dusk and dawn.
            // We define a transition range based on the sun's vertical position (sunY).
            const transitionStart = -0.2; // Sun is below horizon
            const transitionEnd = 0.2;   // Sun is above horizon

            // Calculate a factor from 0 (full night) to 1 (full day)
            let lightFactor = (sunY - transitionStart) / (transitionEnd - transitionStart);
            lightFactor = Math.max(0, Math.min(1, lightFactor)); // Clamp between 0 and 1

            const ambientLight = scene.getObjectByProperty('type', 'AmbientLight');
            const directionalLight = scene.getObjectByProperty('type', 'DirectionalLight');
            const hemisphereLight = scene.getObjectByProperty('type', 'HemisphereLight');

            const dayAmbient = 0.2;
            const nightAmbient = 0.01;
            const dayDirectional = 0.95;
            const nightDirectional = 0;

            // Interpolate the light intensities using the calculated factor.
            // This creates a smooth fade between day and night lighting.
            if (ambientLight) {
                ambientLight.intensity = nightAmbient + (dayAmbient - nightAmbient) * lightFactor;
            }
            if (directionalLight) {
                directionalLight.intensity = nightDirectional + (dayDirectional - nightDirectional) * lightFactor;
            }
            if (hemisphereLight) {
                const dayHemi = 0.6;
                const nightHemi = 0.02;
                hemisphereLight.intensity = nightHemi + (dayHemi - nightHemi) * lightFactor;
            }
        }

        function createFlameParticles(x, y, z) {
            const particleCount = 20;
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const velocities = [];

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                velocities.push({
                    x: (Math.random() - 0.5) * 0.01,
                    y: Math.random() * 0.05,
                    z: (Math.random() - 0.5) * 0.01,
                    life: Math.random() * 1
                });
            }

            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particles.velocities = velocities;

            const material = new THREE.PointsMaterial({
                color: 0xffaa33,
                size: 0.2,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const particleSystem = new THREE.Points(particles, material);
            particleSystem.position.set(x, y, z);
            return particleSystem;
        }

        function createSmokeParticle(x, y, z, count) {
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const velocities = [];
            const opacities = new Float32Array(count);

            for (let i = 0; i < count; i++) {
                positions[i * 3] = x + (Math.random() - 0.5) * 10;
                positions[i * 3 + 1] = y + (Math.random() - 0.5) * 5;
                positions[i * 3 + 2] = z + (Math.random() - 0.5) * 10;
                opacities[i] = 1.0;

                velocities.push({
                    x: (Math.random() - 0.5) * 4,
                    y: 10 + Math.random() * 15,
                    z: (Math.random() - 0.5) * 4,
                    life: 6 + Math.random() * 6
                });
            }

            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particles.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));
            particles.velocities = velocities;

            const material = new THREE.PointsMaterial({
                size: 4,
                map: new THREE.CanvasTexture(document.createElement('canvas')),
                blending: THREE.NormalBlending,
                depthWrite: false,
                transparent: true,
                vertexColors: true, // Use vertex alpha
                color: 0x888888
            });

            const smokeTextureCanvas = document.createElement('canvas');
            smokeTextureCanvas.width = 64;
            smokeTextureCanvas.height = 64;
            const context = smokeTextureCanvas.getContext('2d');
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(200, 200, 200, 0.5)');
            gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
            material.map.image = smokeTextureCanvas;
            material.map.needsUpdate = true;


            const particleSystem = new THREE.Points(particles, material);
            // We set the particle system position to the origin because the individual particle positions are already in world space.
            particleSystem.position.set(0, 0, 0);
            return particleSystem;
        }

        function initThree() {
            console.log('[initThree] Starting');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);
            console.log('[initThree] Scene created');
            camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 10000);
            camera.position.set(0, 34, 0);
            console.log('[initThree] Camera created');
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(innerWidth, innerHeight);
            renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
            document.body.appendChild(renderer.domElement);
            console.log('[initThree] Renderer created and appended');
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.maxPolarAngle = Math.PI / 2;
            controls.minDistance = 2;
            controls.maxDistance = 400;
            controls.enabled = false;
            console.log('[initThree] Controls created');
            var dir = new THREE.DirectionalLight(0xffffff, 1.0); // Adjusted intensity
            dir.position.set(100, 200, 100);
            scene.add(dir);
            scene.add(new THREE.AmbientLight(0xffffff, 0.2)); // Adjusted intensity
            const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.6); // Adjusted intensity
            scene.add(hemisphereLight);
            console.log('[initThree] Lights added');

            // Create the procedural ember texture for torches
            emberTexture = createEmberTexture(worldSeed);

            meshGroup = new THREE.Group();
            scene.add(meshGroup);
            console.log('[initThree] Mesh group created');
            lightManager.init();
            initSky();
            console.log('[initThree] Sky initialized');
            renderer.domElement.addEventListener('pointerdown', function (e) { onPointerDown(e); });
            renderer.domElement.addEventListener('wheel', function (e) {
                e.preventDefault();
                if (cameraMode === 'first') {
                    var delta = e.deltaY > 0 ? 1 : -1;
                    selectedHotIndex = (selectedHotIndex + delta + 9) % 9;
                    updateHotbarUI();
                }
            });
            renderer.domElement.addEventListener('click', function () {
                if (cameraMode === 'first' && !mouseLocked && !isMobile()) {
                    try {
                        renderer.domElement.requestPointerLock();
                        mouseLocked = true;
                        document.getElementById('crosshair').style.display = 'block';
                    } catch (e) {
                        addMessage('Pointer lock failed. Serve over HTTPS or check iframe permissions.');
                    }
                }
            });

            let touchStartX = 0;
            let touchStartY = 0;
            renderer.domElement.addEventListener('touchstart', e => {
                let target = e.target;
                let isButton = false;
                while (target && target !== document.body) {
                    if (target.classList.contains('m-btn') || target.classList.contains('m-action')) {
                        isButton = true;
                        break;
                    }
                    target = target.parentElement;
                }

                if (isButton) return;

                if (cameraMode === 'first' && e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    e.preventDefault(); // Prevent scrolling/zooming
                }
            }, { passive: false });

            renderer.domElement.addEventListener('touchmove', e => {
                if (cameraMode === 'first' && e.touches.length > 0) {
                    const touchX = e.touches[0].clientX;
                    const touchY = e.touches[0].clientY;

                    const deltaX = touchX - touchStartX;
                    const deltaY = touchY - touchStartY;

                    const sensitivity = 0.005; // Mobile sensitivity
                    player.yaw -= deltaX * sensitivity;
                    player.pitch -= deltaY * sensitivity;
                    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
                    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

                    if (avatarGroup && avatarGroup.children[3]) {
                        avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
                    }

                    touchStartX = touchX;
                    touchStartY = touchY;
                    e.preventDefault(); // Prevent scrolling/zooming
                }
            }, { passive: false });
            document.addEventListener('pointerlockchange', function () {
                mouseLocked = document.pointerLockElement === renderer.domElement;
                document.getElementById('crosshair').style.display = mouseLocked && cameraMode === 'first' ? 'block' : 'none';
            });
            renderer.domElement.addEventListener('mousemove', function (e) {
                if (cameraMode === 'first' && mouseLocked) {
                    var sensitivity = 0.002;
                    player.yaw -= e.movementX * sensitivity;
                    player.pitch -= e.movementY * sensitivity;
                    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
                    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

                    if (avatarGroup) {
                        avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
                    }
                }
            });
            window.addEventListener('resize', function () {
                camera.aspect = innerWidth / innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(innerWidth, innerHeight);
                updateMinimap();
            });
            createAndSetupAvatar(userName, true);
        }
        var avatarGroup;
        function createAndSetupAvatar(username, isPlayerOne, initialYaw = 0) {
            // Clean up existing avatar if it exists
            const existingAvatar = isPlayerOne ? avatarGroup : playerAvatars.get(username);
            if (existingAvatar) {
                scene.remove(existingAvatar);
                disposeObject(existingAvatar);
                if (!isPlayerOne) {
                    playerAvatars.delete(username);
                }
            }

            const avatar = new THREE.Group();
            if (initialYaw) avatar.rotation.y = initialYaw;

            const rnd = makeSeededRandom(username);

            const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(), 0.6 + rnd() * 0.2, 0.6 + rnd() * 0.1) });
            const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(), 0.7 + rnd() * 0.3, 0.5 + rnd() * 0.2) });
            const armMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(), 0.6 + rnd() * 0.2, 0.6 + rnd() * 0.1) });
            const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rnd(), 0.7 + rnd() * 0.3, 0.4 + rnd() * 0.2) });

            // Player height is 1.8. Let's scale the avatar to match.
            const scale = 1.8 / 2.6; // Original visual height was 2.6

            const legHeight = 0.8 * scale;
            const bodyHeight = 1.2 * scale;
            const headSize = 0.6 * scale;
            const armHeight = 1.2 * scale;

            const legWidth = 0.4 * scale;
            const bodyWidth = 0.8 * scale;
            const armWidth = 0.3 * scale;

            const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);
            const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, 0.4 * scale);
            const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize);
            const armGeo = new THREE.BoxGeometry(armWidth, armHeight, armWidth);

            const leftLeg = new THREE.Mesh(legGeo, legMat);
            leftLeg.position.set(-bodyWidth / 4, legHeight / 2, 0);
            const rightLeg = new THREE.Mesh(legGeo, legMat);
            rightLeg.position.set(bodyWidth / 4, legHeight / 2, 0);

            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(0, legHeight + bodyHeight / 2, 0);

            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(0, legHeight + bodyHeight + headSize / 2, 0);

            const leftArm = new THREE.Mesh(armGeo, armMat);
            leftArm.position.set(-(bodyWidth / 2 + armWidth / 2), legHeight + bodyHeight / 2, 0);
            const rightArm = new THREE.Mesh(armGeo, armMat);
            rightArm.position.set((bodyWidth / 2 + armWidth / 2), legHeight + bodyHeight / 2, 0);

            // Face components, scaled down and positioned relative to the new head size
            const faceMat = new THREE.MeshStandardMaterial({ color: (rnd() > 0.5) ? 0x000000 : 0xffffff });
            const eyeSize = 0.1 * scale;
            const mouthWidth = 0.3 * scale;
            const mouthHeight = 0.05 * scale;
            const faceZ = -headSize / 2 - 0.01;

            const eyeGeo = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize);
            const leftEye = new THREE.Mesh(eyeGeo, faceMat);
            leftEye.position.set(-headSize * 0.25, headSize * 0.15, faceZ);
            const rightEye = new THREE.Mesh(eyeGeo, faceMat);
            rightEye.position.set(headSize * 0.25, headSize * 0.15, faceZ);

            const noseGeo = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize);
            const nose = new THREE.Mesh(noseGeo, faceMat);
            nose.position.set(0, 0, faceZ);

            const mouthGeo = new THREE.BoxGeometry(mouthWidth, mouthHeight, eyeSize);
            const mouth = new THREE.Mesh(mouthGeo, faceMat);
            mouth.position.set(0, -headSize * 0.2, faceZ);

            head.add(leftEye, rightEye, nose, mouth);
            avatar.add(leftLeg, rightLeg, body, head, leftArm, rightArm);

            if (isPlayerOne) {
                avatarGroup = avatar;
            } else {
                playerAvatars.set(username, avatar);
            }
            scene.add(avatar);
            return avatar;
        }
        function initHotbar() {
            var hotbar = document.getElementById('hotbar');
            hotbar.innerHTML = '';
            for (var i = 0; i < 9; i++) {
                var slot = document.createElement('div');
                slot.className = 'hot-slot';
                slot.dataset.index = i;
                var label = document.createElement('div');
                label.className = 'hot-label';
                var count = document.createElement('div');
                count.className = 'hot-count';
                slot.appendChild(label);
                slot.appendChild(count);
                hotbar.appendChild(slot);
                slot.addEventListener('click', function () {
                    document.querySelectorAll('.hot-slot').forEach(function (x) { x.classList.remove('active'); });
                    this.classList.add('active');
                    selectedHotIndex = parseInt(this.dataset.index);
                    updateHotbarUI();
                });
                slot.addEventListener('contextmenu', function (e) {
                    e.preventDefault();
                    if (INVENTORY[this.dataset.index] && INVENTORY[this.dataset.index].count > 0) {
                        trashIndex = this.dataset.index;
                        document.getElementById('trashItemName').innerText = 'Trash ' + BLOCKS[INVENTORY[trashIndex].id].name + ' x' + INVENTORY[trashIndex].count + ' ? ';
                        document.getElementById('trashConfirm').style.display = 'block';
                    }
                });
            }
            updateHotbarUI();
        }
        function updateHotbarUI() {
            var hotbar = document.getElementById('hotbar');
            var slots = hotbar.querySelectorAll('.hot-slot');
            slots.forEach(function (s, idx) {
                var item = INVENTORY[idx];
                var id = item ? item.id : null;
                var count = item ? item.count : 0;
                var color = id && BLOCKS[id] ? hexToRgb(BLOCKS[id].color) : [0, 0, 0];
                s.style.background = 'rgba(' + color.join(',') + ', ' + (id ? 0.45 : 0.2) + ')';
                s.querySelector('.hot-label').innerText = id && BLOCKS[id] ? BLOCKS[id].name : '';
                s.querySelector('.hot-count').innerText = count > 0 ? count : '';
                s.classList.toggle('active', idx === selectedHotIndex);
            });
            selectedBlockId = INVENTORY[selectedHotIndex] ? INVENTORY[selectedHotIndex].id : null;
        }
        function addToInventory(id, count, originSeed = null) {
            // If the block is native, its originSeed is the current world's seed.
            const itemOriginSeed = originSeed || worldSeed;

            // First, try to stack with existing items of the same ID and origin.
            for (var i = 0; i < INVENTORY.length; i++) {
                const item = INVENTORY[i];
                if (item && item.id === id && item.originSeed === itemOriginSeed && item.count < 64) {
                    const space = 64 - item.count;
                    const amountToAdd = Math.min(count, space);
                    item.count += amountToAdd;
                    count -= amountToAdd;
                    if (count <= 0) {
                        updateHotbarUI();
                        return;
                    }
                }
            }

            // Next, find an empty slot to place the new item(s).
            for (var i = 0; i < INVENTORY.length; i++) {
                if (!INVENTORY[i] || INVENTORY[i].count === 0) {
                    const amountToAdd = Math.min(count, 64);
                    INVENTORY[i] = { id: id, count: amountToAdd, originSeed: itemOriginSeed };
                    count -= amountToAdd;
                    if (count <= 0) {
                        updateHotbarUI();
                        return;
                    }
                }
            }

            addMessage('Inventory full');
            updateHotbarUI(); // Update UI even if inventory is full to reflect partial additions.
        }
        function hexToRgb(hex) {
            hex = hex.replace('#', '');
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            return [r, g, b];
        }
        var trashIndex = -1;
        document.getElementById('trashCancel').addEventListener('click', function () {
            document.getElementById('trashConfirm').style.display = 'none';
            trashIndex = -1;
            this.blur();
        });
        document.getElementById('trashOk').addEventListener('click', function () {
            if (trashIndex >= 0) {
                INVENTORY[trashIndex] = null;
                updateHotbarUI();
                addMessage('Item trashed');
            }
            document.getElementById('trashConfirm').style.display = 'none';
            trashIndex = -1;
            this.blur();
        });
        function attemptCraft(recipe) {
            // Tally all items, separating native and off-world
            const availableNative = {};
            const availableOffWorld = {};
            const allAvailable = {};

            for (const item of INVENTORY) {
                if (item) {
                    allAvailable[item.id] = (allAvailable[item.id] || 0) + item.count;
                    if (item.originSeed && item.originSeed !== worldSeed) {
                        availableOffWorld[item.id] = (availableOffWorld[item.id] || 0) + item.count;
                    } else {
                        availableNative[item.id] = (availableNative[item.id] || 0) + item.count;
                    }
                }
            }

            // Check total materials first
            for (const reqId in recipe.requires) {
                if ((allAvailable[reqId] || 0) < recipe.requires[reqId]) {
                    addMessage(`Missing materials for ${BLOCKS[recipe.out.id].name}`);
                    return;
                }
            }

            // Check off-world requirements
            if (recipe.requiresOffWorld) {
                for (const reqId in recipe.requiresOffWorld) {
                    if ((availableOffWorld[reqId] || 0) < recipe.requiresOffWorld[reqId]) {
                        addMessage(`Requires off-world ${BLOCKS[reqId].name}`);
                        return;
                    }
                }
            }

            // If we are here, we have enough materials. Now consume them.
            let neededToConsume = { ...recipe.requires };
            let neededOffWorld = { ...recipe.requiresOffWorld };
            let consumedSeeds = [];

            // Consume off-world items first
            if (neededOffWorld) {
                for (let i = 0; i < INVENTORY.length; i++) {
                    const item = INVENTORY[i];
                    if (item && neededOffWorld[item.id] > 0 && item.originSeed && item.originSeed !== worldSeed) {
                        const amountToTake = Math.min(item.count, neededOffWorld[item.id]);

                        for (let j = 0; j < amountToTake; j++) {
                            consumedSeeds.push(item.originSeed);
                        }

                        item.count -= amountToTake;
                        neededOffWorld[item.id] -= amountToTake;
                        neededToConsume[item.id] -= amountToTake; // Decrement from total needed as well

                        if (item.count === 0) {
                            INVENTORY[i] = null;
                        }
                    }
                }
            }

            // Consume remaining items
            for (let i = 0; i < INVENTORY.length; i++) {
                const item = INVENTORY[i];
                if (item && neededToConsume[item.id] > 0) {
                    const amountToTake = Math.min(item.count, neededToConsume[item.id]);
                    item.count -= amountToTake;
                    neededToConsume[item.id] -= amountToTake;
                    if (item.count === 0) {
                        INVENTORY[i] = null;
                    }
                }
            }

            // Crafting successful. Add the new item.
            let newOriginSeed = null;
            if (consumedSeeds.length > 0) {
                newOriginSeed = consumedSeeds.join('');
            }

            addToInventory(recipe.out.id, recipe.out.count, newOriginSeed);
            addMessage('Crafted ' + BLOCKS[recipe.out.id].name);
            updateHotbarUI();
            if (document.getElementById('inventoryModal').style.display === 'block') {
                updateInventoryUI();
            }
            document.getElementById('craftModal').style.display = 'none';
            isPromptOpen = false;
        }
        function completeCraft(recipe, selectedIndex) {
            const neededToConsume = { ...recipe.requires };
            const consumedSeeds = [];

            const selectedItem = INVENTORY[selectedIndex];
            if (!selectedItem || !recipe.requiresOffWorld || !recipe.requiresOffWorld[selectedItem.id]) {
                addMessage("Invalid selection for craft.");
                craftingState = null;
                updateInventoryUI();
                return;
            }

            // Temporarily reserve the selected item
            neededToConsume[selectedItem.id]--;
            consumedSeeds.push(selectedItem.originSeed);
            const tempInventory = JSON.parse(JSON.stringify(INVENTORY));
            tempInventory[selectedIndex].count--;

            // Check for and reserve other required off-world items
            if (recipe.requiresOffWorld) {
                for (const reqId in recipe.requiresOffWorld) {
                    let neededCount = recipe.requiresOffWorld[reqId];
                    if (parseInt(reqId) === selectedItem.id) {
                        neededCount--; // Account for the already selected item
                    }
                    if (neededCount > 0) {
                        for (let i = 0; i < tempInventory.length; i++) {
                            const item = tempInventory[i];
                            if (item && item.id == reqId && item.originSeed && item.originSeed !== worldSeed && item.count > 0) {
                                const amountToReserve = Math.min(item.count, neededCount);
                                for (let j = 0; j < amountToReserve; j++) {
                                    consumedSeeds.push(item.originSeed);
                                }
                                item.count -= amountToReserve;
                                neededCount -= amountToReserve;
                                neededToConsume[reqId] -= amountToReserve;
                                if (neededCount <= 0) break;
                            }
                        }
                    }
                }
            }

            // Tally remaining available materials from the temporary inventory
            const available = {};
            for (const item of tempInventory) {
                if (item && item.count > 0) {
                    available[item.id] = (available[item.id] || 0) + item.count;
                }
            }

            // Check if remaining materials are sufficient
            for (const reqId in neededToConsume) {
                if ((available[reqId] || 0) < neededToConsume[reqId]) {
                    addMessage("Still missing other materials.");
                    craftingState = null;
                    updateInventoryUI();
                    return;
                }
            }

            // All checks passed. Now, consume materials from the *actual* inventory.
            INVENTORY[selectedIndex].count--;
            if (INVENTORY[selectedIndex].count <= 0) INVENTORY[selectedIndex] = null;

            // This re-uses the same consumption logic, which is fine since we validated it.
            let finalConsumption = { ...recipe.requires };
            finalConsumption[selectedItem.id]--;

            let offWorldToConsume = { ...recipe.requiresOffWorld };
             if (offWorldToConsume[selectedItem.id]) {
                offWorldToConsume[selectedItem.id]--;
            }


            // Consume other off-world items
            if (Object.keys(offWorldToConsume).length > 0) {
                 for (let i = 0; i < INVENTORY.length; i++) {
                    const item = INVENTORY[i];
                    if (item && offWorldToConsume[item.id] > 0 && item.originSeed && item.originSeed !== worldSeed) {
                        const amountToTake = Math.min(item.count, offWorldToConsume[item.id]);
                        item.count -= amountToTake;
                        offWorldToConsume[item.id] -= amountToTake;
                        finalConsumption[item.id] -= amountToTake;
                        if (item.count === 0) INVENTORY[i] = null;
                    }
                }
            }

            // Consume remaining general items
            for (let i = 0; i < INVENTORY.length; i++) {
                const item = INVENTORY[i];
                if (item && finalConsumption[item.id] > 0) {
                    const amountToTake = Math.min(item.count, finalConsumption[item.id]);
                    item.count -= amountToTake;
                    finalConsumption[item.id] -= amountToTake;
                    if (item.count === 0) INVENTORY[i] = null;
                }
            }

            // Add crafted item with combined seeds
            const newOriginSeed = consumedSeeds.sort().join(''); // Sort for consistency
            addToInventory(recipe.out.id, recipe.out.count, newOriginSeed);
            addMessage('Crafted ' + BLOCKS[recipe.out.id].name);

            craftingState = null;
            document.getElementById('craftModal').style.display = 'none';
            isPromptOpen = false;
            toggleInventory();
            updateHotbarUI();
        }

        function initiateCraft(recipe) {
            if (craftingState) {
                addMessage("Please complete or cancel the current craft.");
                return;
            }

            if (recipe.requiresOffWorld) {
                for (const reqId in recipe.requiresOffWorld) {
                    const neededCount = recipe.requiresOffWorld[reqId];
                    const offWorldItems = INVENTORY
                        .map((item, index) => ({ item, index }))
                        .filter(({item}) => item && item.id == reqId && item.originSeed && item.originSeed !== worldSeed);

                    const totalOffWorldQuantity = offWorldItems.reduce((sum, { item }) => sum + item.count, 0);

                    if (totalOffWorldQuantity > neededCount) {
                        craftingState = {
                            recipe: recipe,
                            requiredItemId: parseInt(reqId),
                        };
                        addMessage(`Select an off-world ${BLOCKS[reqId].name} to use.`);
                        document.getElementById('craftModal').style.display = 'none';
                        if (document.getElementById('inventoryModal').style.display !== 'block') {
                            toggleInventory();
                        } else {
                            updateInventoryUI(); // Just re-render with highlights
                        }
                        return;
                    }
                }
            }

            // If no selection is needed, proceed directly
            attemptCraft(recipe);
        }

        function openCrafting() {
            isPromptOpen = true;
            var m = document.getElementById('craftModal');
            m.style.display = 'block';
            var list = document.getElementById('recipeList');
            list.innerHTML = '';
            for (var r of RECIPES) {
                var row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'center';
                row.style.marginTop = '8px';
                var info = document.createElement('div');
                info.innerText = BLOCKS[r.out.id].name + ' x' + r.out.count;
                var reqs = document.createElement('div');
                reqs.style.opacity = 0.85;

                var reqsStrings = [];
                for(const id in r.requires) {
                    let reqStr = `${BLOCKS[id].name || id} x${r.requires[id]}`;
                    if(r.requiresOffWorld && r.requiresOffWorld[id]) {
                        reqStr += ` (${r.requiresOffWorld[id]} must be Off-World)`;
                    }
                    reqsStrings.push(reqStr);
                }
                reqs.innerText = 'Requires: ' + reqsStrings.join(', ');
                var btn = document.createElement('button');
                btn.innerText = 'Craft';
                btn.onclick = (function(recipe) {
                    return function() {
                        initiateCraft(recipe);
                    };
                })(r);
                row.appendChild(info);
                row.appendChild(reqs);
                row.appendChild(btn);
                list.appendChild(row);
            }
        }
        function safePlayAudio(audioElement) {
            if (!audioElement) return;
            var playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(function (e) {
                    if (!audioErrorLogged) {
                        addMessage('Audio playback issue detected', 3000);
                        audioErrorLogged = true;
                    }
                });
            }
        }
        function toggleInventory() {
            var invModal = document.getElementById('inventoryModal');
            var isVisible = invModal.style.display === 'block';

            if (isVisible && craftingState) {
                // If closing inventory during a craft, cancel it.
                craftingState = null;
                addMessage("Crafting canceled.");
            }

            invModal.style.display = isVisible ? 'none' : 'block';
            isPromptOpen = !isVisible;

            if (!isVisible) {
                updateInventoryUI();
            } else {
                selectedInventoryIndex = -1;
            }
        }

        function updateInventoryUI() {
            var grid = document.getElementById('inventoryGrid');
            var hotbar = document.getElementById('inventoryHotbar');
            grid.innerHTML = '';
            hotbar.innerHTML = '';

            for (var i = 9; i < 36; i++) {
                grid.appendChild(createInventorySlot(i));
            }

            for (var i = 0; i < 9; i++) {
                hotbar.appendChild(createInventorySlot(i));
            }
        }

        function createInventorySlot(index) {
            var slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.dataset.index = index;

            var item = INVENTORY[index];
            if (item && item.id) {
                var color = BLOCKS[item.id] ? hexToRgb(BLOCKS[item.id].color) : [128, 128, 128];
                slot.style.backgroundColor = `rgba(${color.join(',')}, 0.6)`;
                slot.innerText = BLOCKS[item.id] ? BLOCKS[item.id].name.substring(0, 6) : 'Unknown';

                if (item.count > 1) {
                    var countEl = document.createElement('div');
                    countEl.className = 'inv-count';
                    countEl.innerText = item.count;
                    slot.appendChild(countEl);
                }

                if (craftingState && item.id === craftingState.requiredItemId && item.originSeed && item.originSeed !== worldSeed) {
                    slot.classList.add('highlight-craft');
                }
            }

            if (index === selectedInventoryIndex && !craftingState) {
                slot.classList.add('selected');
            }

            slot.addEventListener('click', function() {
                var clickedIndex = parseInt(this.dataset.index);

                if (craftingState) {
                    const selectedItem = INVENTORY[clickedIndex];
                    if (selectedItem && selectedItem.id === craftingState.requiredItemId && selectedItem.originSeed && selectedItem.originSeed !== worldSeed) {
                        completeCraft(craftingState.recipe, clickedIndex);
                    } else {
                        addMessage("This item cannot be used for this craft.");
                    }
                } else {
                    if (selectedInventoryIndex === -1) {
                        selectedInventoryIndex = clickedIndex;
                    } else {
                        var temp = INVENTORY[selectedInventoryIndex];
                        INVENTORY[selectedInventoryIndex] = INVENTORY[clickedIndex];
                        INVENTORY[clickedIndex] = temp;
                        selectedInventoryIndex = -1;
                    }
                    updateInventoryUI();
                    updateHotbarUI();
                }
            });

            slot.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var clickedIndex = parseInt(this.dataset.index);
                if (INVENTORY[clickedIndex] && INVENTORY[clickedIndex].count > 0) {
                    trashIndex = clickedIndex;
                    document.getElementById('trashItemName').innerText = 'Trash ' + BLOCKS[INVENTORY[trashIndex].id].name + ' x' + INVENTORY[trashIndex].count + ' ? ';
                    document.getElementById('trashConfirm').style.display = 'block';
                }
            });

            return slot;
        }

        function createProjectile(id, user, position, direction, color = 'red') {
            const isGreen = color === 'green';
            const projectileSpeed = isGreen ? 20 : 10;
            const laserColor = isGreen ? 0x00ff00 : 0xff0000;

            const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
            const material = new THREE.MeshBasicMaterial({ color: laserColor });
            const projectile = new THREE.Mesh(geometry, material);

            // Align projectile with camera direction
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
            projectile.quaternion.copy(quaternion);

            projectile.position.copy(position);

            const light = new THREE.PointLight(laserColor, 1, 10);
            light.position.copy(projectile.position);
            projectile.light = light;
            scene.add(light);

            projectiles.push({
                id: id,
                user: user,
                mesh: projectile,
                velocity: direction.multiplyScalar(projectileSpeed),
                createdAt: Date.now(),
                light: light,
                isGreen: isGreen
            });
            scene.add(projectile);
        }

        function createDroppedItemOrb(dropId, position, blockId, originSeed, dropper) {
            const blockInfo = BLOCKS[blockId];
            if (!blockInfo) return;

            const geometry = new THREE.SphereGeometry(0.25, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: blockInfo.color,
                emissive: blockInfo.color,
                emissiveIntensity: 0.5
            });
            const orb = new THREE.Mesh(geometry, material);
            orb.position.copy(position);

            const light = new THREE.PointLight(blockInfo.color, 0.8, 5);
            light.position.copy(position);
            orb.light = light;
            scene.add(light);

            const droppedItem = {
                id: dropId,
                blockId: blockId,
                originSeed: originSeed,
                mesh: orb,
                light: light,
                createdAt: Date.now(),
                dropper: dropper
            };

            droppedItems.push(droppedItem);
            scene.add(orb);
        }

        function dropSelectedItem() {
            const itemToDrop = INVENTORY[selectedHotIndex];
            if (!itemToDrop || itemToDrop.count <= 0) {
                addMessage("Nothing to drop!");
                return;
            }

            const dropId = `${userName}-${Date.now()}`;

            // Drop in front of player
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            const position = new THREE.Vector3(player.x, player.y + 1, player.z).add(direction.multiplyScalar(1.5));


            // Create the visual orb
            createDroppedItemOrb(dropId, position, itemToDrop.id, itemToDrop.originSeed, userName);

            // Remove one item from the inventory stack
            itemToDrop.count--;
            if (itemToDrop.count <= 0) {
                INVENTORY[selectedHotIndex] = null;
            }
            updateHotbarUI();

            // Broadcast to other players
            const message = JSON.stringify({
                type: 'item_dropped',
                dropId: dropId,
                blockId: itemToDrop.id,
                originSeed: itemToDrop.originSeed,
                position: { x: position.x, y: position.y, z: position.z },
                dropper: userName
            });
            for (const [peerUser, peerData] of peers.entries()) {
                if (peerData.dc && peerData.dc.readyState === 'open') {
                    peerData.dc.send(message);
                }
            }
        }

        function onPointerDown(e) {
            if (cameraMode !== 'first' || isPromptOpen) return;
            e.preventDefault();

            const selectedItem = INVENTORY[selectedHotIndex];

            if (e.button === 2 && selectedItem && BLOCKS[selectedItem.id] && BLOCKS[selectedItem.id].hand_attachable) {
                dropSelectedItem();
                return;
            }

            if (selectedItem && selectedItem.id === 121) { // Laser Gun
                const now = Date.now();
                if (now - (player.lastFireTime || 0) < 1000) { // 1000ms cooldown
                    return;
                }
                player.lastFireTime = now;
                const projectileId = `${userName}-${Date.now()}`;
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);

                let position;
                if (cameraMode === 'third' && avatarGroup && avatarGroup.gun) {
                    position = new THREE.Vector3();
                    avatarGroup.gun.getWorldPosition(position);
                } else {
                    position = new THREE.Vector3(player.x, player.y + 1.5, player.z);
                }

                createProjectile(projectileId, userName, position, direction.clone(), 'red');

                const message = JSON.stringify({
                    type: 'laser_fired',
                    id: projectileId,
                    user: userName,
                    position: { x: position.x, y: position.y, z: position.z },
                    direction: { x: direction.x, y: direction.y, z: direction.z },
                    color: 'red'
                });
                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerData.dc && peerData.dc.readyState === 'open') {
                        peerData.dc.send(message);
                    }
                }
                return;
            }

            if (selectedItem && selectedItem.id === 126) { // Green Laser Gun
                const now = Date.now();
                if (now - (player.lastFireTime || 0) < 500) { // 500ms cooldown
                    return;
                }

                // Check for emerald ammo
                let emeraldIndex = -1;
                for (let i = 0; i < INVENTORY.length; i++) {
                    if (INVENTORY[i] && INVENTORY[i].id === 125) {
                        emeraldIndex = i;
                        break;
                    }
                }

                if (emeraldIndex === -1) {
                    addMessage("No emeralds to fire!", 1000);
                    return;
                }

                // Consume one emerald
                INVENTORY[emeraldIndex].count--;
                if (INVENTORY[emeraldIndex].count <= 0) {
                    INVENTORY[emeraldIndex] = null;
                }
                updateHotbarUI();


                player.lastFireTime = now;
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);

                const right = new THREE.Vector3();
                right.crossVectors(camera.up, direction).normalize();

                let basePosition;
                if (cameraMode === 'third' && avatarGroup && avatarGroup.gun) {
                    basePosition = new THREE.Vector3();
                    avatarGroup.gun.getWorldPosition(basePosition);
                } else {
                    basePosition = new THREE.Vector3(player.x, player.y + 1.5, player.z);
                }

                // Create two projectiles, side by side
                const projectileId1 = `${userName}-${Date.now()}-1`;
                const position1 = basePosition.clone().add(right.clone().multiplyScalar(0.2));
                createProjectile(projectileId1, userName, position1, direction.clone(), 'green');

                const projectileId2 = `${userName}-${Date.now()}-2`;
                const position2 = basePosition.clone().add(right.clone().multiplyScalar(-0.2));
                createProjectile(projectileId2, userName, position2, direction.clone(), 'green');


                const message1 = JSON.stringify({
                    type: 'laser_fired',
                    id: projectileId1,
                    user: userName,
                    position: { x: position1.x, y: position1.y, z: position1.z },
                    direction: { x: direction.x, y: direction.y, z: direction.z },
                    color: 'green'
                });

                const message2 = JSON.stringify({
                    type: 'laser_fired',
                    id: projectileId2,
                    user: userName,
                    position: { x: position2.x, y: position2.y, z: position2.z },
                    direction: { x: direction.x, y: direction.y, z: direction.z },
                    color: 'green'
                });

                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerData.dc && peerData.dc.readyState === 'open') {
                        peerData.dc.send(message1);
                        peerData.dc.send(message2);
                    }
                }
                return;
            }

            raycaster.setFromCamera(pointer, camera);
            raycaster.far = 5;

            // 1. Check for mob hits
            const mobMeshes = mobs.map(m => m.mesh).filter(m => m.visible);
            const mobIntersects = raycaster.intersectObjects(mobMeshes, true);

            if (mobIntersects.length > 0) {
                let hitObject = mobIntersects[0].object;
                let mobId;
                // Traverse up the hierarchy to find the parent Group with the mobId
                while (hitObject) {
                    if (hitObject.userData.mobId) {
                        mobId = hitObject.userData.mobId;
                        break;
                    }
                    hitObject = hitObject.parent;
                }

                if (mobId) {
                    const hitMob = mobs.find(m => m.id === mobId);
                    if (hitMob) {
                        animateAttack();
                        handleMobHit(hitMob);
                        return; // Stop further processing
                    }
                }
            }

            // 2. Check for player hits
            const playerHitAvatars = Array.from(playerAvatars.entries())
                .filter(([username]) => username !== userName)
                .map(([username, avatar]) => ({ username, intersect: raycaster.intersectObject(avatar, true)[0] }))
                .filter(h => h.intersect)
                .sort((a, b) => a.intersect.distance - b.intersect.distance);

            if (playerHitAvatars.length > 0) {
                const hitPlayer = playerHitAvatars[0];
                animateAttack();
                const message = JSON.stringify({ type: 'player_hit', target: hitPlayer.username, username: userName });

                if (isHost) {
                    handlePlayerHit(JSON.parse(message));
                } else {
                    const attackMessage = JSON.stringify({ type: 'player_attack', username: userName });
                    for (const [, peerData] of peers.entries()) {
                        if (peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(message);
                            peerData.dc.send(attackMessage);
                        }
                    }
                    safePlayAudio(soundHit);
                    addMessage(`Hit ${hitPlayer.username}!`, 800);
                }
                return;
            }

            // 3. Check for block interactions
            if (e.button === 0 && selectedItem && selectedItem.id === 122) { // Consume Honey
                player.health = Math.min(999, player.health + 5);
                updateHealthBar();
                document.getElementById('health').innerText = player.health;
                addMessage('Consumed Honey! +5 HP', 1500);
                INVENTORY[selectedHotIndex].count--;
                if (INVENTORY[selectedHotIndex].count <= 0) {
                    INVENTORY[selectedHotIndex] = null;
                }
                updateHotbarUI();
                return;
            }
            const ints = raycaster.intersectObject(meshGroup, true);
            if (ints.length === 0) return;

            const h = ints[0];
            const p = h.point;
            const norm = h.face.normal;

            if (e.button === 0) { // Left-click: break block
                animateAttack();
                const wx = Math.floor(p.x - norm.x * 0.5);
                const wy = Math.floor(p.y - norm.y * 0.5);
                const wz = Math.floor(p.z - norm.z * 0.5);
                removeBlockAt(wx, wy, wz);
            } else if (e.button === 2) { // Right-click: place block
                const placeX = Math.floor(p.x + norm.x * 0.5);
                const placeY = Math.floor(p.y + norm.y * 0.5);
                const placeZ = Math.floor(p.z + norm.z * 0.5);
                placeBlockAt(placeX, placeY, placeZ, selectedBlockId);
            }
        }

        function handlePlayerHit(data) {
            const attackerUsername = data.username;
            const targetUsername = data.target;

            const attacker = attackerUsername === userName ? player : userPositions[attackerUsername];
            const target = targetUsername === userName ? player : userPositions[targetUsername];

            if (attacker && target) {
                const attackerX = attackerUsername === userName ? attacker.x : attacker.targetX;
                const attackerY = attackerUsername === userName ? attacker.y : attacker.targetY;
                const attackerZ = attackerUsername === userName ? attacker.z : attacker.targetZ;

                const targetX = targetUsername === userName ? target.x : (target.targetX || target.x);
                const targetY = targetUsername === userName ? target.y : (target.targetY || target.y);
                const targetZ = targetUsername === userName ? target.z : (target.targetZ || target.z);

                const dist = Math.hypot(attackerX - targetX, attackerY - targetY, attackerZ - targetZ);
                if (dist < 6) { // 6 blocks validation
                    if (attackerUsername === userName) {
                        safePlayAudio(soundHit);
                        addMessage('Hit ' + targetUsername + '!', 800);
                    }

                    // Calculate knockback direction
                    const dx = targetX - attackerX;
                    const dz = targetZ - attackerZ;
                    const knockbackDist = Math.hypot(dx, dz);
                    const knockbackStrength = 5;
                    let kx = 0, kz = 0;
                    if (knockbackDist > 0) {
                        kx = (dx / knockbackDist) * knockbackStrength;
                        kz = (dz / knockbackDist) * knockbackStrength;
                    }

                    const targetPeer = peers.get(data.target);
                    if (targetPeer && targetPeer.dc && targetPeer.dc.readyState === 'open') {
                        targetPeer.dc.send(JSON.stringify({ type: 'player_damage', damage: 1, attacker: data.username, kx: kx, kz: kz }));
                    } else if (data.target === userName) {
                        // The host was hit
                        if (Date.now() - lastDamageTime > 800) {
                            player.health = Math.max(0, player.health - 1);
                            lastDamageTime = Date.now();
                            document.getElementById('health').innerText = player.health;
                            updateHealthBar();
                            addMessage('Hit by ' + data.username + '! HP: ' + player.health, 1000);
                            flashDamageEffect();
                            safePlayAudio(soundHit);

                            player.vx += kx;
                            player.vz += kz;

                            if (player.health <= 0) {
                                handlePlayerDeath();
                            }
                        }
                    }
                } else if (attackerUsername === userName) {
                    addMessage('Miss! Target is out of range.', 800);
                }
            }
        }
        function attackAtPoint(point) {
            for (var m of mobs) {
                if (m.mesh.position.distanceTo(point) < 1.5) {
                    handleMobHit(m);
                    return true;
                }
            }
            return false;
        }
        function checkAndDeactivateHive(brokenX, brokenY, brokenZ) {
            const HIVE_ID = 123;
            let associatedHive = null;
            let minDistance = Infinity;

            // 1. Find the closest hive in hiveLocations that this broken block might belong to.
            for (const hive of hiveLocations) {
                const dist = Math.hypot(brokenX - hive.x, brokenY - hive.y, brokenZ - hive.z);
                // A hive is a small vertical structure, so check within a reasonable radius.
                if (dist < 10 && dist < minDistance) {
                    minDistance = dist;
                    associatedHive = hive;
                }
            }

            if (!associatedHive) {
                // This broken block was likely not part of a tracked hive.
                return;
            }

            // 2. Scan the area around the associated hive's base to check for any remaining hive blocks.
            let remainingHiveBlocks = 0;
            const scanRadius = 3; // Check a 7x7 horizontal area
            const scanHeight = 8; // Check 8 blocks up from the base
            for (let y = associatedHive.y; y < associatedHive.y + scanHeight; y++) {
                for (let x = associatedHive.x - scanRadius; x <= associatedHive.x + scanRadius; x++) {
                    for (let z = associatedHive.z - scanRadius; z <= associatedHive.z + scanRadius; z++) {
                        if (getBlockAt(x, y, z) === HIVE_ID) {
                            remainingHiveBlocks++;
                        }
                    }
                }
            }

            // 3. If no hive blocks remain, deactivate the hive by removing it from tracking.
            if (remainingHiveBlocks === 0) {
                console.log(`[HIVE] All blocks for hive at ${associatedHive.x},${associatedHive.y},${associatedHive.z} are gone. Deactivating.`);
                hiveLocations = hiveLocations.filter(h => h.x !== associatedHive.x || h.y !== associatedHive.y || h.z !== associatedHive.z);
                addMessage('A bee hive has been destroyed!', 3000);
            }
        }

        function removeBlockAt(wx, wy, wz) {
            var b = getBlockAt(wx, wy, wz);
            if (!b || b === BLOCK_AIR || b === 1 || b === 6) {
                addMessage('Cannot break that block');
                return;
            }
            var cx = Math.floor(modWrap(wx, MAP_SIZE) / CHUNK_SIZE);
            var cz = Math.floor(modWrap(wz, MAP_SIZE) / CHUNK_SIZE);
            var chunkKey = makeChunkKey(worldName, cx, cz);
            var canEdit = checkChunkOwnership(chunkKey, userName);
            if (!canEdit) {
                addMessage('Cannot break block in chunk ' + chunkKey + ': owned by another user');
                return;
            }
            const coordKey = `${wx},${wy},${wz}`;
            const originSeed = foreignBlockOrigins.get(coordKey);

            chunkManager.setBlockGlobal(wx, wy, wz, BLOCK_AIR, userName);

            if (originSeed) {
                foreignBlockOrigins.delete(coordKey);
            }

            addToInventory(b, 1, originSeed);
            addMessage('Picked up ' + (BLOCKS[b] ? BLOCKS[b].name : b) + (originSeed ? ` from ${originSeed}`: ''));
            safePlayAudio(soundBreak);

            if (BLOCKS[b] && BLOCKS[b].light) {
                var lightKey = `${wx},${wy},${wz}`;
                torchRegistry.delete(lightKey);
                if (torchParticles.has(lightKey)) {
                    var particles = torchParticles.get(lightKey);
                    scene.remove(particles);
                    particles.geometry.dispose();
                    particles.material.dispose();
                    torchParticles.delete(lightKey);
                }
                // Force an immediate light update
                lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
            }

            if (b === 123 || b === 122) { // Hive or Honey
                // Use a timeout to allow the block removal to fully process before checking.
                setTimeout(() => checkAndDeactivateHive(wx, wy, wz), 100);
            }
        }
        function placeBlockAt(wx, wy, wz, bid) {
            if (!bid) {
                addMessage('No item selected');
                return;
            }
            var item = INVENTORY[selectedHotIndex];
            if (!item || item.id !== bid || item.count <= 0) {
                addMessage('No item to place');
                return;
            }
            var dist = Math.hypot(player.x - wx, player.y - wy, player.z - wz);
            if (dist > 5) {
                addMessage('Too far to place');
                return;
            }
            var cur = getBlockAt(wx, wy, wz);
            if (cur !== BLOCK_AIR && cur !== 6) {
                addMessage('Cannot place here');
                return;
            }
            if (checkCollisionWithPlayer(wx, wy, wz)) {
                addMessage('Cannot place inside player');
                return;
            }
            for (var m of mobs) {
                if (Math.abs(m.pos.x - wx) < 0.9 && Math.abs(m.pos.y - wy) < 0.9 && Math.abs(m.pos.z - wz) < 0.9) {
                    addMessage('Cannot place inside mob');
                    return;
                }
            }
            var cx = Math.floor(modWrap(wx, MAP_SIZE) / CHUNK_SIZE);
            var cz = Math.floor(modWrap(wz, MAP_SIZE) / CHUNK_SIZE);
            var chunkKey = makeChunkKey(worldName, cx, cz);
            var canEdit = checkChunkOwnership(chunkKey, userName);
            if (!canEdit) {
                addMessage('Cannot place block in chunk ' + chunkKey + ': owned by another user');
                return;
            }
            chunkManager.setBlockGlobal(wx, wy, wz, bid, true, item.originSeed);

            // If the block is from another world, record its origin.
            if (item.originSeed && item.originSeed !== worldSeed) {
                const coordKey = `${wx},${wy},${wz}`;
                foreignBlockOrigins.set(coordKey, item.originSeed);
                addMessage(`Placed ${BLOCKS[bid] ? BLOCKS[bid].name : bid} from ${item.originSeed}`);
            } else {
                addMessage('Placed ' + (BLOCKS[bid] ? BLOCKS[bid].name : bid));
            }

            item.count -= 1;
            if (item.count <= 0) INVENTORY[selectedHotIndex] = null;
            updateHotbarUI();
            safePlayAudio(soundPlace);

            if (BLOCKS[bid] && BLOCKS[bid].light) {
                const lightKey = `${wx},${wy},${wz}`;
                torchRegistry.set(lightKey, { x: wx, y: wy, z: wz });
                var particles = createFlameParticles(wx, wy + 0.5, wz);
                scene.add(particles);
                torchParticles.set(lightKey, particles);
            }
        }
        function checkCollisionWithPlayer(wx, wy, wz) {
            // Player's bounding box
            const pMinX = player.x;
            const pMaxX = player.x + player.width;
            const pMinY = player.y;
            const pMaxY = player.y + player.height;
            const pMinZ = player.z;
            const pMaxZ = player.z + player.depth;

            // Block's bounding box (a 1x1x1 cube at the given integer coords)
            const bMinX = wx;
            const bMaxX = wx + 1;
            const bMinY = wy;
            const bMaxY = wy + 1;
            const bMinZ = wz;
            const bMaxZ = wz + 1;

            // Check for overlap on all three axes
            return (
                pMinX < bMaxX && pMaxX > bMinX &&
                pMinY < bMaxY && pMaxY > bMinY &&
                pMinZ < bMaxZ && pMaxZ > bMinZ
            );
        }
        function getBlockAt(wx, wy, wz) {
            var wrappedWx = modWrap(Math.floor(wx), MAP_SIZE);
            var wrappedWz = modWrap(Math.floor(wz), MAP_SIZE);
            var cx = Math.floor(wrappedWx / CHUNK_SIZE);
            var cz = Math.floor(wrappedWz / CHUNK_SIZE);
            var chunk = chunkManager.getChunk(cx, cz);
            if (!chunk.generated) chunkManager.generateChunk(chunk);
            var lx = Math.floor(wrappedWx % CHUNK_SIZE);
            var lz = Math.floor(wrappedWz % CHUNK_SIZE);
            return chunk.get(lx, Math.floor(wy), lz);
        }
        function handlePlayerDeath() {
            if (deathScreenShown || isDying) return;

            // Make avatar visible for the animation, even in first-person mode
            if (avatarGroup) {
                avatarGroup.visible = true;
            }

            isDying = true;
            deathAnimationStart = performance.now();

            INVENTORY = new Array(36).fill(null);
            player.score = 0;
            document.getElementById('score').innerText = player.score;
            player.health = 0;
            updateHealthBar();
            updateHotbarUI();
            addMessage('You died! All items and score lost.', 5000);

            // Notify other players of the death
            const message = JSON.stringify({ type: 'player_death', username: userName });
            for (const [peerUser, peerData] of peers.entries()) {
                if (peerData.dc && peerData.dc.readyState === 'open') {
                    peerData.dc.send(message);
                }
            }
        }
        function respawnPlayer(x, y, z) {
            var targetX = modWrap(x || spawnPoint.x, MAP_SIZE);
            var targetZ = modWrap(z || spawnPoint.z, MAP_SIZE);
            var targetY = y || chunkManager.getSurfaceY(targetX, targetZ) + 1;
            if (!checkCollision(targetX, targetY, targetZ)) {
                player.x = targetX;
                player.y = targetY;
                player.z = targetZ;
                player.vy = 0;
                player.onGround = false;
                player.health = 20;
                player.yaw = 0;
                player.pitch = 0;
            } else {
                var found = false;
                for (var dy = 0; dy <= 5; dy++) {
                    if (!checkCollision(targetX, targetY + dy, targetZ)) {
                        player.x = targetX;
                        player.y = targetY + dy;
                        player.z = targetZ;
                        player.vy = 0;
                        player.onGround = false;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    player.x = targetX;
                    player.y = chunkManager.getSurfaceY(targetX, targetZ) + 1;
                    player.z = targetZ;
                    player.vy = 0;
                    player.onGround = true;
                    player.health = 20;
                    player.yaw = 0;
                    player.pitch = 0;
                }
            }
            updateHotbarUI();
            updateHealthBar();
            document.getElementById('health').innerText = player.health;
            var newCx = Math.floor(targetX / CHUNK_SIZE);
            var newCz = Math.floor(targetZ / CHUNK_SIZE);
            currentLoadRadius = INITIAL_LOAD_RADIUS;
            chunkManager.preloadChunks(newCx, newCz, currentLoadRadius);
            for (var dx = -currentLoadRadius; dx <= currentLoadRadius; dx++) {
                for (var dz = -currentLoadRadius; dz <= currentLoadRadius; dz++) {
                    var cx = modWrap(newCx + dx, CHUNKS_PER_SIDE);
                    var cz = modWrap(newCz + dz, CHUNKS_PER_SIDE);
                    var chunk = chunkManager.getChunk(cx, cz);
                    if (!chunk.generated) chunkManager.generateChunk(chunk);
                    if (chunk.needsRebuild || !chunk.mesh) {
                        chunkManager.buildChunkMesh(chunk);
                    }
                }
            }
            chunkManager.update(player.x, player.z);
            if (cameraMode === 'first') {
                camera.position.set(player.x + player.width / 2, player.y + 1.62, player.z + player.depth / 2);
                camera.rotation.set(0, 0, 0, 'YXZ');
                try {
                    renderer.domElement.requestPointerLock();
                    mouseLocked = true;
                    document.getElementById('crosshair').style.display = 'block';
                } catch (e) {
                    addMessage('Pointer lock failed. Serve over HTTPS or check iframe permissions.', 3000);
                }
            } else {
                camera.position.set(player.x, player.y + 5, player.z + 10);
                controls.target.set(player.x + player.width / 2, player.y + 0.6, player.z + player.depth / 2);
                controls.update();
            }
            document.getElementById('deathScreen').style.display = 'none';
            deathScreenShown = false;

            // Recreate the avatar to reset its state and visibility
            createAndSetupAvatar(userName, true);
            avatarGroup.visible = cameraMode === 'third';

            addMessage('Respawned at ' + Math.floor(targetX) + ', ' + Math.floor(player.y) + ', ' + Math.floor(targetZ), 3000);

            // Notify other players of the respawn
            const message = JSON.stringify({
                type: 'player_respawn',
                username: userName,
                x: player.x,
                y: player.y,
                z: player.z
            });
            for (const [peerUser, peerData] of peers.entries()) {
                if (peerData.dc && peerData.dc.readyState === 'open') {
                    peerData.dc.send(message);
                }
            }
        }
        function isSolid(id) {
            return id !== 0 && id !== 6 && id !== 12 && id !== 8 && id !== 16 && id !== 17 && id !== 100 && id !== 101 && id !== 102 && id !== 103 && id !== 104 && id !== 111 && id !== 112 && id !== 113 && id !== 114 && id !== 116 && id !== 117;
        }
        function checkCollisionWithBlock(newX, newY, newZ) {
            var minX = newX - 0.45;
            var minY = newY;
            var minZ = newZ - 0.45;
            var maxX = newX + 0.45;
            var maxY = newY + 0.9;
            var maxZ = newZ + 0.45;
            for (var bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
                for (var by = Math.floor(minY); by <= Math.floor(maxY); by++) {
                    for (var bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
                        if (isSolid(getBlockAt(bx, by, bz))) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        function checkCollision(newX, newY, newZ) {
            // Determine the integer coordinates of all blocks the hitbox touches.
            const minBx = Math.floor(newX);
            const maxBx = Math.floor(newX + player.width);
            const minBy = Math.floor(newY);
            const maxBy = Math.floor(newY + player.height);
            const minBz = Math.floor(newZ);
            const maxBz = Math.floor(newZ + player.depth);

            // Loop through every potentially colliding block.
            for (let bx = minBx; bx <= maxBx; bx++) {
                for (let by = minBy; by <= maxBy; by++) {
                    for (let bz = minBz; bz <= maxBz; bz++) {
                        if (isSolid(getBlockAt(bx, by, bz))) {
                            return true; // Collision found!
                        }
                    }
                }
            }

            return false; // No collisions found.
        }
        function pushPlayerOut() {
            var directions = [
                { dx: 0.2, dz: 0 }, { dx: -0.2, dz: 0 }, { dx: 0, dz: 0.2 }, { dx: 0, dz: -0.2 },
                { dx: 0.2, dz: 0.2 }, { dx: 0.2, dz: -0.2 }, { dx: -0.2, dz: 0.2 }, { dx: -0.2, dz: -0.2 }
            ];
            for (var yOffset = 0; yOffset <= 2; yOffset += 0.2) {
                for (var dir of directions) {
                    var newX = modWrap(player.x + dir.dx, MAP_SIZE);
                    var newZ = modWrap(player.z + dir.dz, MAP_SIZE);
                    var newY = player.y + yOffset;
                    if (!checkCollision(newX, newY, newZ)) {
                        player.x = newX;
                        player.y = newY;
                        player.z = newZ;
                        player.vy = 0;
                        player.onGround = true;
                        addMessage('Pushed out of block');
                        return true;
                    }
                }
            }
            return false;
        }

        function handleLavaEruption(data) {
            const rnd = makeSeededRandom(data.seed);
            const eruptionCount = 20 + Math.floor(rnd() * 20);
            for (let i = 0; i < eruptionCount; i++) {
                const block = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshBasicMaterial({ color: BLOCKS[16].color })
                );
                block.position.set(
                    data.volcano.x + (rnd() - 0.5) * 10,
                    data.volcano.y,
                    data.volcano.z + (rnd() - 0.5) * 10
                );
                const velocity = new THREE.Vector3(
                    (rnd() - 0.5) * 2,
                    20 + rnd() * 20,
                    (rnd() - 0.5) * 2
                );
                eruptedBlocks.push({ mesh: block, velocity: velocity, createdAt: Date.now() });
                scene.add(block);
            }
        }

        function createPebble(x, y, z, isGlowing) {
            const size = isGlowing ? 0.2 : 0.1;
            const color = isGlowing ? 0xff6a00 : 0x333333;
            const material = isGlowing ? new THREE.MeshBasicMaterial({ color: color }) : new THREE.MeshStandardMaterial({ color: color });
            const pebble = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                material
            );
            pebble.position.set(x, y, z);
            return pebble;
        }

        function handlePebbleRain(data) {
            const rnd = makeSeededRandom(data.seed);
            const rainCount = 100 + Math.floor(rnd() * 100);
            for (let i = 0; i < rainCount; i++) {
                const isGlowing = rnd() < 0.2;
                const radius = rnd() * 32;
                const angle = rnd() * Math.PI * 2;
                const x = data.volcano.x + Math.cos(angle) * radius;
                const z = data.volcano.z + Math.sin(angle) * radius;
                const y = data.volcano.y + 20 + rnd() * 20;

                const pebbleMesh = createPebble(x, y, z, isGlowing);
                const velocity = new THREE.Vector3(0, -5 - rnd() * 5, 0);
                pebbles.push({ mesh: pebbleMesh, velocity: velocity, createdAt: Date.now(), isGlowing: isGlowing });
                scene.add(pebbleMesh);
            }
        }

        function handleVolcanoEvent(data) {
            let soundId;
            switch (data.eventType) {
                case 'lava_eruption':
                    handleLavaEruption(data);
                    soundId = 'rumble0';
                    break;
                case 'pebble_rain':
                    handlePebbleRain(data);
                    soundId = 'rumble1';
                    break;
                case 'boulder_eruption':
                    handleBoulderEruption(data);
                    const sounds = ['rumble2', 'rumble3', 'rumble4', 'rumble5'];
                    soundId = sounds[Math.floor(Math.random() * sounds.length)];
                    break;
            }
            if (soundId) {
                const eruptionId = Date.now();
                const sound = document.getElementById(soundId);

                if (sound) {
                    // Add to active eruptions *before* playing for immediate volume scaling
                    const eruptionInfo = {
                        id: eruptionId,
                        volcano: data.volcano,
                        soundId: soundId,
                    };
                    activeEruptions.push(eruptionInfo);

                    sound.currentTime = 0;
                    safePlayAudio(sound);

                    // Use the 'onended' event to know precisely when the sound finishes
                    sound.onended = () => {
                        console.log(`[Audio] Sound ${soundId} finished playing.`);
                        activeEruptions = activeEruptions.filter(e => e.id !== eruptionId);
                        sound.onended = null; // Clean up the event listener
                    };
                }
            }
        }
function createEruptionSmoke(x, y, z, count) {
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];
    const opacities = new Float32Array(count);
    const smokeColors = [
        new THREE.Color(0xffffff), // White
        new THREE.Color(0x888888), // Grey
    ];

    for (let i = 0; i < count; i++) {
        positions[i * 3] = x + (Math.random() - 0.5) * 15;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * 15;
        opacities[i] = 1.0;

        const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        velocities.push({
            x: (Math.random() - 0.5) * 3,
            y: 10 + Math.random() * 10, // Higher velocity
            z: (Math.random() - 0.5) * 3,
            life: 5 + Math.random() * 5 // Longer lifespan
        });
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));
    particles.velocities = velocities;

    const material = new THREE.PointsMaterial({
        size: 5,
        blending: THREE.NormalBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    const smokeTextureCanvas = document.createElement('canvas');
    smokeTextureCanvas.width = 64;
    smokeTextureCanvas.height = 64;
    const context = smokeTextureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(200, 200, 200, 0.5)');
    gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    material.map = new THREE.CanvasTexture(smokeTextureCanvas);
    material.map.needsUpdate = true;


    const particleSystem = new THREE.Points(particles, material);
    particleSystem.position.set(0, 0, 0);
    return particleSystem;
}
function handleBoulderEruption(data) {
    const smokeCount = 150;
    const smokeSystem = createEruptionSmoke(data.volcano.x, data.volcano.y, data.volcano.z, smokeCount);
    smokeSystem.userData.chunkKey = data.volcano.chunkKey; // Not strictly necessary but good for consistency
    smokeSystem.createdAt = Date.now();
    smokeParticles.push(smokeSystem);
    scene.add(smokeSystem);

    const rnd = makeSeededRandom(data.seed);
    const eruptionCount = 10 + Math.floor(rnd() * 10);
    for (let i = 0; i < eruptionCount; i++) {
        const sizeRnd = rnd();
        let size, mass;
        if (sizeRnd < 0.5) {
            size = 1 + rnd() * 0.5; // Small
            mass = 1;
        } else if (sizeRnd < 0.85) {
            size = 2 + rnd() * 1;   // Medium
            mass = 2;
        } else {
            size = 3 + rnd() * 1.5; // Large
            mass = 4;
        }

        const boulder = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshStandardMaterial({ color: 0x555555, map: createBlockTexture(worldSeed, 4) }) // Stone texture
        );

        const angle = rnd() * Math.PI * 2;
                const horizontal_force = 50 + rnd() * 50;
                const vertical_force = 40 + rnd() * 20;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * horizontal_force / mass, // Heavier boulders travel less far
            vertical_force, // High arc
            Math.sin(angle) * horizontal_force / mass
        );

        // Spawn boulders lower down, inside the caldera, to give them a launch trajectory
        boulder.position.set(
            data.volcano.x + (rnd() - 0.5) * 8, // Randomize start position within caldera
            data.volcano.y - 10 - rnd() * 5, // Start from below lava surface
            data.volcano.z + (rnd() - 0.5) * 8
        );

        const boulderId = 'boulder_' + Date.now() + '_' + i;
        eruptedBlocks.push({
            id: boulderId,
            mesh: boulder,
            velocity: velocity,
            createdAt: Date.now(),
            type: 'boulder',
            size: size,
            mass: mass,
            isRolling: false,
            targetPosition: boulder.position.clone(),
            targetQuaternion: boulder.quaternion.clone(),
            lastUpdate: 0
        });
        scene.add(boulder);
    }
}
        function manageVolcanoes() {
            if (isHost || peers.size === 0) {
                if (Date.now() - lastVolcanoManagement < 10000) return; // Run every 10 seconds
                lastVolcanoManagement = Date.now();
                const allPlayers = [{ x: player.x, y: player.y, z: player.z }];
                for (const pos of Object.values(userPositions)) {
                    if (pos.targetX) allPlayers.push({ x: pos.targetX, y: pos.targetY, z: pos.targetZ });
                }
                for (const volcano of volcanoes) {
                    const isNearPlayer = allPlayers.some(p => Math.hypot(volcano.x - p.x, volcano.z - p.z) < 256);
                    if (isNearPlayer) {
                        const now = Date.now();
                        // Cooldown check: one event per minute per volcano
                        if (now - (volcano.lastEventTime || 0) < 60000) {
                            continue;
                        }

                        const eventRnd = makeSeededRandom(worldSeed + '_volcano_event_' + volcano.chunkKey + '_' + Math.floor(now / 60000)); // Change event seed every minute
                        if (eventRnd() < 0.05) { // 5% chance per minute to trigger an event
                            volcano.lastEventTime = now; // Set cooldown timestamp
                            const eventTypeRnd = eventRnd();
                            let eventType;
                            if (eventTypeRnd < 0.33) {
                                eventType = 'lava_eruption';
                            } else if (eventTypeRnd < 0.66) {
                                eventType = 'pebble_rain';
                            } else {
                                eventType = 'boulder_eruption';
                            }
                            console.log(`[Volcano] Triggering event: ${eventType} at volcano ${volcano.chunkKey}`);
                            const eventMessage = {
                                type: 'volcano_event',
                                volcano: { x: volcano.x, y: volcano.y, z: volcano.z },
                                eventType: eventType,
                                seed: worldSeed + '_event_' + now
                            };
                            // Host triggers the event locally
                            handleVolcanoEvent(eventMessage);
                            // Broadcast to all clients
                            for (const [peerUser, peerData] of peers.entries()) {
                                if (peerData.dc && peerData.dc.readyState === 'open') {
                                    peerData.dc.send(JSON.stringify(eventMessage));
                                }
                            }
                        }
                    }
                }
            }
        }
        var minimapCtx;


        function updateMinimap() {
            if (!minimapCtx) return;
            var canvas = minimapCtx.canvas;
            minimapCtx.clearRect(0, 0, canvas.width, canvas.height);
            minimapCtx.fillStyle = 'rgba(0,0,0,0.3)';
            minimapCtx.fillRect(0, 0, canvas.width, canvas.height);
            var scale = canvas.width / 40;
            var cx = canvas.width / 2;
            var cz = canvas.height / 2;
            minimapCtx.fillStyle = '#ffffff';
            minimapCtx.fillRect(cx - 2, cz - 2, 4, 4);
            minimapCtx.fillStyle = '#9bff9b';
            for (var m of mobs) {
                var dx = m.pos.x - player.x;
                var dz = m.pos.z - player.z;
                if (Math.abs(dx) <= 20 && Math.abs(dz) <= 20) {
                    var px = cx + dx * scale;
                    var pz = cz + dz * scale;
                    minimapCtx.fillRect(px - 2, pz - 2, 4, 4);
                }
            }
            minimapCtx.fillStyle = '#ff6b6b';
            for (var entry of playerAvatars) {
                var username = entry[0];
                var avatar = entry[1];
                var dx = avatar.position.x - player.x;
                var dz = avatar.position.z - player.z;
                if (Math.abs(dx) <= 20 && Math.abs(dz) <= 20) {
                    var px = cx + dx * scale;
                    var pz = cz + dz * scale;
                    minimapCtx.fillRect(px - 2, pz - 2, 4, 4);
                }
            }
            if (isConnecting) {
                const radius = canvas.width / 2;
                const angle = (performance.now() / 500) % (Math.PI * 2);

                minimapCtx.beginPath();
                minimapCtx.moveTo(cx, cz);
                minimapCtx.lineTo(cx + radius * Math.cos(angle), cz + radius * Math.sin(angle));

                const gradient = minimapCtx.createLinearGradient(cx, cz, cx + radius * Math.cos(angle), cz + radius * Math.sin(angle));
                gradient.addColorStop(0, 'rgba(100, 255, 100, 0)');
                gradient.addColorStop(1, 'rgba(100, 255, 100, 0.9)');

                minimapCtx.strokeStyle = gradient;
                minimapCtx.lineWidth = 2;
                minimapCtx.stroke();
            }
        }
        var keys = {};
        function registerKeyEvents() {
            function keydownHandler(e) {
                const key = e.key.toLowerCase();

                // Sprint logic: only trigger on the *first* keydown event.
                if (key === 'w' && !keys[key]) {
                    const now = performance.now();
                    if (now - lastWPress < 300) { // 300ms for a double tap
                        isSprinting = !isSprinting;
                        addMessage(isSprinting ? 'Sprinting enabled' : 'Sprinting disabled', 1500);
                    }
                    lastWPress = now;
                }

                keys[key] = true;

                if (e.key === 'Escape' && mouseLocked) {
                    document.exitPointerLock();
                    mouseLocked = false;
                }
                if (e.key.toLowerCase() === 't') toggleCameraMode();
                if (e.key.toLowerCase() === 'c') openCrafting();
                if (e.key.toLowerCase() === 'i') toggleInventory();
                if (e.key.toLowerCase() === 'p') {
                    isPromptOpen = true;
                    document.getElementById('teleportModal').style.display = 'block';
                    document.getElementById('teleportX').value = Math.floor(player.x);
                    document.getElementById('teleportY').value = Math.floor(player.y);
                    document.getElementById('teleportZ').value = Math.floor(player.z);
                }
                if (e.key.toLowerCase() === 'x' && CHUNK_DELTAS.size > 0) downloadSession();
                if (e.key.toLowerCase() === 'u') openUsersModal();
                if (e.key.toLowerCase() === ' ') {
                    playerJump();
                    safePlayAudio(soundJump);
                }

                if (e.key.toLowerCase() === 'q') {
                    onPointerDown({ button: 0, preventDefault: () => { } });
                }
                if (e.key.toLowerCase() === 'e') {
                    onPointerDown({ button: 2, preventDefault: () => { } });
                }
            }
            function keyupHandler(e) { keys[e.key.toLowerCase()] = false; }
            window.addEventListener('keydown', keydownHandler);
            window.addEventListener('keyup', keyupHandler);
            return function () {
                window.removeEventListener('keydown', keydownHandler);
                window.removeEventListener('keyup', keyupHandler);
            };
        }
        function playerJump() {
            if (player.onGround) {
                player.vy = isSprinting ? 8.5 * 3 : 8.5;
                player.onGround = false;
                safePlayAudio(soundJump);
            }
        }
        function toggleCameraMode() {
            cameraMode = (cameraMode === 'third') ? 'first' : 'third';
            addMessage('Camera: ' + cameraMode);
            controls.enabled = cameraMode === 'third';
            avatarGroup.visible = cameraMode === 'third';
            if (cameraMode === 'third') {
                camera.position.set(player.x, player.y + 5, player.z + 10);
                controls.target.set(player.x, player.y + 0.6, player.z);
                controls.update();
                if (!isMobile()) {
                    document.exitPointerLock();
                }
                mouseLocked = false;
                document.getElementById('crosshair').style.display = 'none';
            } else {
                if (!isMobile()) {
                    try {
                        renderer.domElement.requestPointerLock();
                        mouseLocked = true;
                        document.getElementById('crosshair').style.display = 'block';
                    } catch (e) {
                        addMessage('Pointer lock failed. Please serve over HTTPS or ensure allow-pointer-lock is set in iframe.');
                        document.getElementById('crosshair').style.display = 'block';
                    }
                } else {
                    document.getElementById('crosshair').style.display = 'block';
                }
                player.yaw = 0;
                player.pitch = 0;
                camera.rotation.set(0, 0, 0, 'YXZ');
            }
        }
        function performAttack() {
            animateAttack();
            var dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            var origin = (cameraMode === 'first') ? new THREE.Vector3(player.x, player.y + 1.62, player.z) : camera.position.clone();
            raycaster.setFromCamera(pointer, camera);
            raycaster.far = 5;
            var mobHits = mobs.map(function (m) { return { mob: m, intersect: raycaster.intersectObject(m.mesh)[0] }; })
                .filter(function (h) { return h.intersect; })
                .sort(function (a, b) { return a.intersect.distance - b.intersect.distance; });
            if (mobHits.length > 0) {
                var mob = mobHits[0].mob;
                mob.hurt(4);
                safePlayAudio(soundHit);
                addMessage('Hit mob!', 800);
                return;
            }
            for (var d = 0.6; d < 3.0; d += 0.6) {
                var p = origin.clone().addScaledVector(dir, d);
                var bx = Math.round(p.x), by = Math.round(p.y), bz = Math.round(p.z);
                var b = getBlockAt(bx, by, bz);
                if (b && b !== BLOCK_AIR && b !== 6) {
                    removeBlockAt(bx, by, bz);
                    return;
                }
            }
        }
        async function downloadSession() {
            var playerData = {
                world: worldName,
                seed: worldSeed,
                user: userName,
                savedAt: new Date().toISOString(),
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
            for (var entry of CHUNK_DELTAS) {
                var k = entry[0];
                var arr = entry[1];
                var parsed = parseChunkKey(k);
                if (parsed) {
                    playerData.deltas.push({ chunk: k, changes: arr });
                }
            }
            var hash = simpleHash(JSON.stringify(playerData));
            var out = {
                playerData: playerData,
                hash: hash
            };
            var blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = worldName + '_session_' + Date.now() + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            addMessage('Session downloaded');
            var chunkKeys = Array.from(CHUNK_DELTAS.keys());
            var chunkAddresses = await Promise.all(chunkKeys.map(async function (key) {
                var addr = await GetPublicAddressByKeyword(key);
                return addr ? addr.trim().replace(/^"|"$/g, '') : key;
            }));
            document.getElementById('downloadAddressList').value = chunkAddresses.join(',');
            document.getElementById('downloadModal').style.display = 'block';
        }
        function disposeObject(obj) {
            obj.traverse(function (c) {
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(function (m) { m.dispose(); });
                    else c.material.dispose();
                }
            });
        }
        function addMessage(txt, ttl) {
            var c = document.getElementById('messages');
            var el = document.createElement('div');
            el.className = 'msg';
            el.innerText = txt;
            c.prepend(el);
            setTimeout(function () { el.remove(); }, ttl || 2000);
        }
        function updateHealthBar() {
            var pct = Math.max(0, Math.min(1, player.health / 999));
            document.getElementById('healthBarInner').style.width = (pct * 100) + '%';
        }
        function updateSaveChangesButton() {
            var saveBtn = document.getElementById('saveChangesBtn');
            saveBtn.style.display = CHUNK_DELTAS.size > 0 ? 'inline-block' : 'none';
        }
        function updateHudButtons() {
            var joinScriptBtn = document.getElementById('joinScriptBtn');
            joinScriptBtn.style.display = 'none';
            updateSaveChangesButton();
            var usersBtn = document.getElementById('usersBtn');
            var peerCount = peers.size > 0 ? peers.size - (peers.has(userName) ? 1 : 0) : 0;
            console.log('[WebRTC] Updating usersBtn: peerCount=', peerCount, 'peers=', Array.from(peers.keys()));
            usersBtn.style.display = 'inline-block';
            usersBtn.innerText = '🌐 ' + peerCount;
            usersBtn.onclick = function () {
                console.log('[Modal] usersBtn clicked, opening modal');
                openUsersModal();
            };
            setupPendingModal();
        }
        function updateHud() {
            var scoreElement = document.getElementById('score');
            if (scoreElement) scoreElement.innerText = player.score;
            var healthElement = document.getElementById('health');
            if (healthElement) healthElement.innerText = player.health;
            var posLabel = document.getElementById('posLabel');
            if (posLabel) posLabel.innerText = Math.floor(player.x) + ', ' + Math.floor(player.y) + ', ' + Math.floor(player.z);
            var distFromSpawn = Math.hypot(player.x - spawnPoint.x, player.z - spawnPoint.z);
            document.getElementById('homeIcon').style.display = distFromSpawn > 10 ? 'inline' : 'none';
            updateHealthBar();
            updateHotbarUI();
            updateHudButtons();
        }
        function isMobile() { return /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent); }
        function setupMobile() {
            if (!isMobile()) return;
            var up = document.getElementById('mUp'), down = document.getElementById('mDown'), left = document.getElementById('mLeft'), right = document.getElementById('mRight');
            up.addEventListener('touchstart', function (e) { joystick.up = true; e.preventDefault(); });
            up.addEventListener('touchend', function (e) { joystick.up = false; e.preventDefault(); });
            down.addEventListener('touchstart', function (e) { joystick.down = true; e.preventDefault(); });
            down.addEventListener('touchend', function (e) { joystick.down = false; e.preventDefault(); });
            left.addEventListener('touchstart', function (e) { joystick.left = true; e.preventDefault(); });
            left.addEventListener('touchend', function (e) { joystick.left = false; e.preventDefault(); });
            right.addEventListener('touchstart', function (e) { joystick.right = true; e.preventDefault(); });
            right.addEventListener('touchend', function (e) { joystick.right = false; e.preventDefault(); });
            document.getElementById('mJump').addEventListener('touchstart', function (e) { playerJump(); safePlayAudio(soundJump); e.preventDefault(); });
            document.getElementById('mAttack').addEventListener('touchstart', function (e) { performAttack(); e.preventDefault(); });
            document.getElementById('mCam').addEventListener('touchstart', function (e) { toggleCameraMode(); e.preventDefault(); });
        }
        function updateLoginUI() {
            try {
                console.log('[Debug] updateLoginUI started, knownWorlds:', knownWorlds.size, 'knownUsers:', knownUsers.size);
                var worldInput = document.getElementById('worldNameInput');
                var userInput = document.getElementById('userInput');
                var worldSuggestions = document.getElementById('worldSuggestions');
                var userSuggestions = document.getElementById('userSuggestions');
                if (!worldInput || !userInput || !worldSuggestions || !userSuggestions) {
                    console.error('[Debug] Input or suggestion elements not found in DOM');
                    addMessage('UI initialization failed: elements missing', 3000);
                    return;
                }
                function updateWorldSuggestions() {
                    var value = worldInput.value.toLowerCase();
                    var suggestions = Array.from(knownWorlds.keys())
                        .filter(w => w.toLowerCase().startsWith(value))
                        .slice(0, 10);
                    worldSuggestions.innerHTML = suggestions.map(w => `<div data-value="${w}">${w}</div>`).join('');
                    worldSuggestions.style.display = suggestions.length > 0 && value ? 'block' : 'none';
                }

                function updateUserSuggestions() {
                    var value = userInput.value.toLowerCase();
                    var suggestions = Array.from(knownUsers.keys())
                        .filter(u => u.toLowerCase().startsWith(value))
                        .slice(0, 10);
                    userSuggestions.innerHTML = suggestions.map(u => `<div data-value="${u}">${u}</div>`).join('');
                    userSuggestions.style.display = suggestions.length > 0 && value ? 'block' : 'none';
                    console.log('[LoginUI] User suggestions updated:', suggestions.length);
                }
                worldInput.addEventListener('input', updateWorldSuggestions);
                userInput.addEventListener('input', updateUserSuggestions);
                function initSuggestions() {
                    updateWorldSuggestions();
                    updateUserSuggestions();
                }
                setTimeout(initSuggestions, 1000);
                initSuggestions();
                worldSuggestions.addEventListener('click', function (e) {
                    if (e.target.dataset.value) {
                        worldInput.value = e.target.dataset.value;
                        worldSuggestions.style.display = 'none';
                        console.log('[LoginUI] Selected world:', e.target.dataset.value);
                    }
                });
                userSuggestions.addEventListener('click', function (e) {
                    if (e.target.dataset.value) {
                        userInput.value = e.target.dataset.value;
                        userSuggestions.style.display = 'none';
                        console.log('[LoginUI] Selected user:', e.target.dataset.value);
                    }
                });
                document.addEventListener('click', function (e) {
                    if (!worldInput.contains(e.target) && !worldSuggestions.contains(e.target)) {
                        worldSuggestions.style.display = 'none';
                    }
                    if (!userInput.contains(e.target) && !userSuggestions.contains(e.target)) {
                        userSuggestions.style.display = 'none';
                    }
                });
                console.log('[Debug] updateLoginUI completed');
                userSuggestions.addEventListener('click', function (e) {
                    if (e.target.dataset.value) {
                        userInput.value = e.target.dataset.value;
                        userSuggestions.style.display = 'none';
                        console.log('[LoginUI] Selected user:', e.target.dataset.value);
                    }
                });
                document.addEventListener('click', function (e) {
                    if (!worldInput.contains(e.target) && !worldSuggestions.contains(e.target)) {
                        worldSuggestions.style.display = 'none';
                    }
                    if (!userInput.contains(e.target) && !userSuggestions.contains(e.target)) {
                        userSuggestions.style.display = 'none';
                    }
                });
                console.log('[Debug] updateLoginUI completed');
            } catch (error) {
                console.error('[Debug] Error in updateLoginUI:', error);
                addMessage('Failed to initialize login UI', 3000);
            }
        }
        async function populateSpawnChunks() {
            for (var entry of spawnChunks) {
                var user = entry[0];
                var data = entry[1];
                var spawn = calculateSpawnPoint(user + '@' + data.world);
                spawnChunks.set(user, { cx: Math.floor(spawn.x / CHUNK_SIZE), cz: Math.floor(spawn.z / CHUNK_SIZE), username: data.username, world: data.world, spawn: spawn });
            }
        }

        //SUP!? PUBLIC STUN AND TURN SERVERS
        async function getTurnCredentials() {
            console.log('[WebRTC] Using static TURN credentials: supgalaxy');
            return [
                { urls: 'stun:supturn.com:3478' },
                {
                    urls: [
                        'turn:supturn.com:3478?transport=udp',
                        'turn:supturn.com:3478?transport=tcp',
                        'turn:supturn.com:443?transport=tcp'
                    ],
                    username: 'supgalaxy',
                    credential: 'supgalaxy',
                    credentialType: 'password'
                }
            ];
        }

        async function connectToServer(hostUser, offer, iceCandidates) {
            if (peers.size >= MAX_PEERS) {
                addMessage('Cannot connect: too many peers.', 3000);
                console.log('[WebRTC] Connection failed: max peers reached');
                return;
            }
            var server = knownServers.find(function (s) { return s.hostUser === hostUser; });
            if (!server) {
                addMessage('No server found for ' + hostUser, 3000);
                console.log('[WebRTC] No server found for:', hostUser);
                return;
            }
            console.log('[WebRTC] Initiating connection to server:', hostUser);
            connectionAttempts.set(hostUser, Date.now());
            const iceServers = await getTurnCredentials();
            var pc = new RTCPeerConnection({ iceServers });
            pc.oniceconnectionstatechange = () => console.log(`[WebRTC] ICE state change for ${hostUser}: ${pc.iceConnectionState}`);

            if (localAudioStream) {
                localAudioStream.getTracks().forEach(track => {
                    pc.addTrack(track, localAudioStream);
                });
            }

            pc.ontrack = (event) => {
                const username = hostUser; // In a client-server model, the track is from the hostUser.
                if (event.track.kind === 'audio') {
                    if (!userAudioStreams.has(username)) {
                        const audio = new Audio();
                        audio.srcObject = event.streams[0];
                        audio.autoplay = true;
                        userAudioStreams.set(username, { audio: audio, stream: event.streams[0] });
                        console.log(`[WebRTC] Received audio stream from ${username}`);
                    }
                } else if (event.track.kind === 'video') {
                    if (!userVideoStreams.has(username)) {
                        const video = document.createElement('video');
                        video.srcObject = event.streams[0];
                        video.autoplay = true;
                        video.playsInline = true;
                        video.style.display = 'none'; // Initially hidden
                        document.body.appendChild(video);
                        userVideoStreams.set(username, { video: video, stream: event.streams[0] });
                        console.log(`[WebRTC] Received video stream from ${username}`);
                    }
                }
            };

            var dc = pc.createDataChannel('game');
            setupDataChannel(dc, hostUser);
            try {
                var offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                var offerIceCandidates = [];
                pc.onicecandidate = function (e) {
                    if (e.candidate) offerIceCandidates.push(e.candidate);
                };
                await new Promise(function (resolve) {
                    pc.onicegatheringstatechange = function () {
                        if (pc.iceGatheringState === 'complete') resolve();
                    };
                });
                var offerData = {
                    world: worldName,
                    user: userName,
                    offer: pc.localDescription,
                    iceCandidates: offerIceCandidates
                };
                var blob = new Blob([JSON.stringify(offerData)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = `${worldName}_offer_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                var responseKeyword = 'MCConn@' + hostUser + '@' + worldName;
                var responseAddr = await GetPublicAddressByKeyword(responseKeyword);
                document.getElementById('joinScriptText').value = responseAddr ? responseAddr.trim().replace(/"|'/g, '') : responseKeyword;
                document.getElementById('joinScriptModal').style.display = 'block';
                document.getElementById('joinScriptModal').querySelector('h3').innerText = 'Connect to Server';
                document.getElementById('joinScriptModal').querySelector('p').innerText = 'Copy this address and paste it into a Sup!? message To: field, attach the JSON file, and click 📢 to connect to ' + hostUser + '. After sending, wait for host confirmation.';
                addMessage('Offer created for ' + hostUser + '. Send the JSON via Sup!? and wait for host to accept.', 10000);
                peers.set(hostUser, { pc: pc, dc: dc, address: null });
                var answerKeyword = 'MCAnswer@' + userName + '@' + worldName;
                answerPollingIntervals.set(answerKeyword, setInterval(function () {
                    worker.postMessage({
                        type: 'poll',
                        chunkKeys: [],
                        masterKey: MASTER_WORLD_KEY,
                        userAddress: userAddress,
                        worldName: worldName,
                        serverKeyword: 'MCServerJoin@' + worldName,
                        offerKeyword: null,
                        answerKeywords: [answerKeyword],
                        userName: userName
                    });
                    if (Date.now() - connectionAttempts.get(hostUser) > 1800000) {
                        console.log('[WebRTC] Answer polling timeout for:', hostUser);
                        addMessage('Connection to ' + hostUser + ' timed out after 30 minutes.', 5000);
                        clearInterval(answerPollingIntervals.get(answerKeyword));
                        answerPollingIntervals.delete(answerKeyword);
                        var peer = peers.get(hostUser);
                        if (peer && peer.pc) peer.pc.close();
                        peers.delete(hostUser);
                        if (playerAvatars.has(hostUser)) {
                            scene.remove(playerAvatars.get(hostUser));
                            disposeObject(playerAvatars.get(hostUser));
                            playerAvatars.delete(hostUser);
                        }
                        delete userPositions[hostUser];
                        updateHudButtons();
                    }
                }, 30000));
            } catch (e) {
                console.error('[WebRTC] Failed to create offer for:', hostUser, 'error:', e);
                addMessage('Failed to connect to ' + hostUser, 3000);
                pc.close();
                peers.delete(hostUser);
                clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
            }
        }
        // Description: Handles file upload via double-click or drag-and-drop on the minimap.
        // If the file is an offer JSON, it adds it to pendingOffers and opens the pending connections modal (server mode).
        // If the file is an answer JSON, it processes it to establish a connection (client mode).
        async function handleMinimapFile(file) {
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Handle new session file format
                if (data.playerData && data.hash) {
                    if (data.playerData.world !== worldName) {
                        addMessage('Invalid file: wrong world', 3000);
                        console.log('[MINIMAP] Invalid file: world mismatch, expected:', worldName, 'got:', data.playerData.world);
                        return;
                    }

                    const playerData = data.playerData;
                    if (playerData.deltas) {
                        for (const delta of playerData.deltas) {
                            const chunkKey = delta.chunk.replace(/^#/, '');
                            chunkManager.applyDeltasToChunk(chunkKey, delta.changes);
                        }
                    }
                    if (playerData.foreignBlockOrigins) {
                        foreignBlockOrigins = new Map(playerData.foreignBlockOrigins);
                    }
                    addMessage('Loaded chunk data from session file.', 3000);
                    return;
                }

                // Check if it's a save session file (old format)
                if (data.deltas && data.profile) {
                    console.log('[MINIMAP] Save session file detected, applying...');
                    await applySaveFile(data, userAddress, new Date().toISOString());
                    addMessage('Save session loaded successfully!', 3000);
                    return;
                }

                if (!data.world || data.world !== worldName) {
                    addMessage('Invalid file: wrong world', 3000);
                    console.log('[MINIMAP] Invalid file: world mismatch, expected:', worldName, 'got:', data.world);
                    return;
                }

                if (data.offer) {
                    // Server mode: Process offer
                    const clientUser = data.user || 'anonymous';
                    if (clientUser === userName) {
                        addMessage('Cannot process offer from self', 3000);
                        console.log('[WEBRTC] Skipping offer from self:', clientUser);
                        return;
                    }
                    const profile = await GetProfileByURN(clientUser);
                    pendingOffers.push({
                        clientUser: clientUser,
                        offer: data.offer,
                        iceCandidates: data.iceCandidates || [],
                        transactionId: 'local_' + Date.now(),
                        timestamp: Date.now(),
                        profile: profile || { URN: clientUser, Creators: [null] }
                    });
                    console.log('[WEBRTC] Added local offer from:', clientUser);
                    addMessage(`Connection request from ${clientUser} via file`, 5000);
                    setupPendingModal();
                    document.getElementById('pendingModal').style.display = 'block';
                    isPromptOpen = true;
                } else if (data.answer && !isHost) {
                    // Client mode: Process answer
                    const hostUser = data.user || 'anonymous';
                    const peer = peers.get(hostUser);
                    if (!peer || !peer.pc) {
                        addMessage('No active connection for ' + hostUser, 3000);
                        console.log('[WEBRTC] No peer connection for:', hostUser);
                        return;
                    }
                    try {
                        await peer.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        for (const candidate of data.iceCandidates || []) {
                            try {
                                await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('[WEBRTC] Failed to add ICE candidate for:', hostUser, 'error:', e);
                            }
                        }
                        console.log('[WEBRTC] Successfully processed answer for:', hostUser);
                        addMessage('Connected to ' + hostUser + ' via file', 5000);
                        updateHudButtons();
                        clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                        answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
                    } catch (e) {
                        console.error('[WEBRTC] Failed to process answer for:', hostUser, 'error:', e);
                        addMessage('Failed to connect to ' + hostUser, 3000);
                    }
                } else if (data.batch && !isHost) {
                    // Client mode: Process batch answer
                    const hostUser = data.user || 'anonymous';
                    const peer = peers.get(hostUser);
                    if (!peer || !peer.pc) {
                        addMessage('No active connection for ' + hostUser, 3000);
                        console.log('[WEBRTC] No peer connection for:', hostUser);
                        return;
                    }
                    const answerEntry = data.batch.find(entry => entry.user === userName);
                    if (!answerEntry) {
                        addMessage('No answer for you in batch from ' + hostUser, 3000);
                        console.log('[WEBRTC] No answer for user:', userName, 'in batch from:', hostUser);
                        return;
                    }
                    try {
                        await peer.pc.setRemoteDescription(new RTCSessionDescription(answerEntry.answer));
                        for (const candidate of answerEntry.iceCandidates || []) {
                            try {
                                await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('[WEBRTC] Failed to add ICE candidate for:', hostUser, 'error:', e);
                            }
                        }
                        console.log('[WEBRTC] Successfully processed batch answer for:', hostUser);
                        addMessage('Connected to ' + hostUser + ' via batch file', 5000);
                        updateHudButtons();
                        clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                        answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
                    } catch (e) {
                        console.error('[WEBRTC] Failed to process batch answer for:', hostUser, 'error:', e);
                        addMessage('Failed to connect to ' + hostUser, 3000);
                    }
                } else {
                    addMessage('Invalid file format', 3000);
                    console.log('[MINIMAP] Invalid file: no offer, answer, or batch');
                }
            } catch (e) {
                console.error('[MINIMAP] Error processing file:', e);
                addMessage('Failed to process file', 3000);
            }
        }

        // ✅ COMPLETE FIXED setupDataChannel() - COPY-PASTE THIS
        function setupDataChannel(dc, user) {
            console.log(`[FIXED] Setting up data channel for: ${user}`);

            dc.onopen = () => {
                console.log(`[WEBRTC] Data channel open with: ${user}. State: ${dc.readyState}`);
                addMessage(`Connection established with ${user}`, 3000);
                // Send initial player position
                dc.send(JSON.stringify({
                    type: 'player_move',
                    username: userName,
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    yaw: player.yaw,
                    pitch: player.pitch,
                    isMoving: false,
                    isAttacking: false,
                    timestamp: Date.now()
                }));
                // If this is the host, send the current state of all mobs to the new client
                if (isHost) {
                    // Notify all other clients of the new player
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== user && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'new_player', username: user }));
                        }
                    }
                    // Notify the new client of existing players
                    for (const [peerUser, peerData] of peers.entries()) {
                         if (peerUser !== user && peerData.dc && peerData.dc.readyState === 'open') {
                            dc.send(JSON.stringify({ type: 'new_player', username: peerUser }));
                        }
                    }
                    // also notify about host
                    dc.send(JSON.stringify({ type: 'new_player', username: userName }));

                    //compile and send all chunk deltas to the new player
                    const chunkDeltasArray = Array.from(CHUNK_DELTAS.entries());
                    const foreignBlockOriginsArray = Array.from(foreignBlockOrigins.entries());
                    const worldSyncMessage = {
                        type: 'world_sync',
                        chunkDeltas: chunkDeltasArray,
                        foreignBlockOrigins: foreignBlockOriginsArray
                    };
                    dc.send(JSON.stringify(worldSyncMessage));


                    console.log(`[WEBRTC] Host sending initial mob state to ${user}`);
                    for (const mob of mobs) {
                        dc.send(JSON.stringify({
                            type: 'mob_update',
                            id: mob.id,
                            x: mob.pos.x,
                            y: mob.pos.y,
                            z: mob.pos.z,
                                    hp: mob.hp,
                                    mobType: mob.type
                        }));
                    }
                }
                updateHudButtons();
            };

            dc.onmessage = e => {
                console.log(`[WEBRTC] Message from ${user}`);
                try {
                    const data = JSON.parse(e.data);
                    const sender = data.username || user;
                    if (sender === userName) return;

                    // Host is the source of truth. It processes inputs and broadcasts state.
                    if (isHost) {
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(e.data);
                            }
                        }
                    }

                    // All peers process the message
                    switch (data.type) {
                        case 'new_player':
                            const newPlayerUsername = data.username;
                            if (newPlayerUsername !== userName && !peers.has(newPlayerUsername)) {
                                addMessage(`${newPlayerUsername} has joined!`);
                                if (!playerAvatars.has(newPlayerUsername)) {
                                    createAndSetupAvatar(newPlayerUsername, false);
                                }
                                // Add a placeholder peer entry for player count and state management
                                if (!peers.has(newPlayerUsername)) {
                                    peers.set(newPlayerUsername, { pc: null, dc: null, address: null });
                                }
                                updateHudButtons();
                            }
                            break;
                        case 'world_sync':
                            if (!isHost) {
                                console.log(`[WEBRTC] Received world_sync`);
                                if (data.chunkDeltas) {
                                    const deltas = new Map(data.chunkDeltas);
                                    for (const [chunkKey, changes] of deltas.entries()) {
                                        chunkManager.applyDeltasToChunk(chunkKey, changes);
                                    }
                                }
                                if (data.foreignBlockOrigins) {
                                    foreignBlockOrigins = new Map(data.foreignBlockOrigins);
                                }
                            }
                            break;
                        case 'state_update':
                            if (!isHost) {
                                for (const playerData of data.players) {
                                    const remoteUser = playerData.username;
                                    if (remoteUser === userName) continue;

                                    if (!userPositions[remoteUser]) {
                                        userPositions[remoteUser] = {};
                                        createAndSetupAvatar(remoteUser, false, playerData.yaw);
                                    }
                                    const userState = userPositions[remoteUser];
                                    if (!data.timestamp || data.timestamp > (userState.lastTimestamp || 0)) {
                                        userState.prevX = userState.targetX;
                                        userState.prevY = userState.targetY;
                                        userState.prevZ = userState.targetZ;
                                        userState.prevYaw = userState.targetYaw;
                                        userState.prevPitch = userState.targetPitch;
                                        userState.targetX = playerData.x;
                                        userState.targetY = playerData.y;
                                        userState.targetZ = playerData.z;
                                        userState.targetYaw = playerData.yaw;
                                        userState.targetPitch = playerData.pitch;
                                        userState.isMoving = playerData.isMoving;
                                        userState.lastUpdate = performance.now();
                                        userState.lastTimestamp = data.timestamp;
                                        userState.isAttacking = playerData.isAttacking;
                                        if (playerData.attackStartTime && playerData.attackStartTime !== userState.attackStartTime) {
                                            userState.attackStartTime = playerData.attackStartTime;
                                            userState.localAnimStartTime = performance.now();
                                        }
                                    }
                                }
                            }
                            break;

                        case 'player_respawn':
                            const respawnedUser = data.username;
                            if (userPositions[respawnedUser]) {
                                userPositions[respawnedUser].isDying = false;
                            }
                            const newAvatar = createAndSetupAvatar(respawnedUser, false);
                            newAvatar.position.set(data.x, data.y, data.z);
                            break;

                        case 'player_move':
                            if (!playerAvatars.has(sender)) {
                                createAndSetupAvatar(sender, false, data.yaw);
                            }
                            if (!userPositions[sender]) {
                                userPositions[sender] = {
                                    lastTimestamp: 0,
                                    prevX: data.x, prevY: data.y, prevZ: data.z,
                                    prevYaw: data.yaw, prevPitch: data.pitch,
                                    targetX: data.x, targetY: data.y, targetZ: data.z,
                                    targetYaw: data.yaw, targetPitch: data.pitch
                                };
                            }
                            const userState = userPositions[sender];
                            if (data.timestamp > userState.lastTimestamp) {
                                userState.prevX = userState.targetX;
                                userState.prevY = userState.targetY;
                                userState.prevZ = userState.targetZ;
                                userState.prevYaw = userState.targetYaw;
                                userState.prevPitch = userState.targetPitch;
                                userState.targetX = data.x;
                                userState.targetY = data.y;
                                userState.targetZ = data.z;
                                userState.targetYaw = data.yaw;
                                userState.targetPitch = data.pitch;
                                userState.isMoving = data.isMoving;
                                userState.lastUpdate = performance.now();
                                userState.lastTimestamp = data.timestamp;
                            }
                            break;

                        case 'block_change':
                            const dist = Math.hypot(player.x - data.wx, player.y - data.wy, player.z - data.wz);
                            if (dist < maxAudioDistance) {
                                // Play sound locally for remote player's actions
                                if (data.bid !== 0) { // Placing a block
                                    safePlayAudio(soundPlace);
                                } else { // Breaking a block
                                    safePlayAudio(soundBreak);
                                }
                            }

                            if (isHost) {
                                console.log(`[WEBRTC] Host relaying block change from ${sender}`);
                                for (const [peerUser, peerData] of peers.entries()) {
                                    if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                                        peerData.dc.send(e.data);
                                    }
                                }
                            }
                            chunkManager.setBlockGlobal(data.wx, data.wy, data.wz, data.bid, false, data.originSeed);

                            // If the block is from another world, record its origin.
                            if (data.originSeed && data.originSeed !== worldSeed) {
                                const coordKey = `${data.wx},${data.wy},${data.wz}`;
                                foreignBlockOrigins.set(coordKey, data.originSeed);
                            }
                            if (data.prevBid && BLOCKS[data.prevBid] && BLOCKS[data.prevBid].light) {
                                var lightKey = `${data.wx},${data.wy},${data.wz}`;
                                if (torchLights.has(lightKey)) {
                                    var light = torchLights.get(lightKey);
                                    scene.remove(light);
                                    light.dispose();
                                    torchLights.delete(lightKey);
                                }
                                if (torchParticles.has(lightKey)) {
                                    var particles = torchParticles.get(lightKey);
                                    scene.remove(particles);
                                    particles.geometry.dispose();
                                    particles.material.dispose();
                                    torchParticles.delete(lightKey);
                                }
                            }
                            if (data.bid && BLOCKS[data.bid] && BLOCKS[data.bid].light) {
                                var light = new THREE.PointLight(0xffaa33, 0.8, 16);
                                light.position.set(data.wx, data.wy + 0.5, data.wz);
                                scene.add(light);
                                torchLights.set(`${data.wx},${data.wy},${data.wz}`, light);
                                var particles = createFlameParticles(data.wx, data.wy + 0.5, data.wz);
                                scene.add(particles);
                                torchParticles.set(`${data.wx},${data.wy},${data.wz}`, particles);
                            }
                            break;

                        case 'mob_spawn':
                            if (!mobs.some(m => m.id === data.id)) {
                                const newMob = new Mob(data.x, data.z, data.id, data.mobType);
                                newMob.isAggressive = data.isAggressive;
                                mobs.push(newMob);
                            }
                            break;
                        case 'mob_state_batch':
                            if (!isHost) {
                                const receivedMobIds = new Set();
                                for (const mobState of data.mobs) {
                                    receivedMobIds.add(mobState.id);
                                    let mob = mobs.find(m => m.id === mobState.id);
                                    if (!mob) {
                                        mob = new Mob(mobState.x, mobState.z, mobState.id, mobState.type);
                                        mobs.push(mob);
                                    }
                                    mob.targetPos.set(mobState.x, mobState.y, mobState.z);
                                    mob.hp = mobState.hp;
                                    mob.isAggressive = mobState.isAggressive;
                                     mob.isMoving = mobState.isMoving; // <<< Update isMoving
                                     mob.aiState = mobState.aiState; // <<< Update aiState
                                     if (mobState.quaternion) {
                                         mob.targetQuaternion.fromArray(mobState.quaternion);
                                         mob.lastQuaternionUpdate = performance.now();
                                     }
                                    mob.lastUpdateTime = performance.now();
                                }
                                mobs = mobs.filter(mob => {
                                    if (!receivedMobIds.has(mob.id)) {
                                        scene.remove(mob.mesh);
                                        disposeObject(mob.mesh);
                                        return false;
                                    }
                                    return true;
                                });
                            }
                            break;

                        case 'mob_update':
                            let mob = mobs.find(m => m.id === data.id);
                            if (!mob) {
                                mob = new Mob(data.x, data.z, data.id, data.mobType);
                                mobs.push(mob);
                                // For new mobs, set the initial position directly.
                                // The `targetPos` will also be set below, ensuring no initial lerp.
                                mob.pos.set(data.x, data.y, data.z);
                            }
                            // For all mobs (new and existing), update the target position.
                            // The game loop will handle smoothly interpolating to this new target.
                            mob.targetPos.set(data.x, data.y, data.z);
                            mob.hp = data.hp;
                            mob.lastUpdateTime = performance.now(); // Trigger the interpolation logic.
                            if (data.flash) mob.flashEnd = Date.now() + 200;
                            break;

                        case 'mob_kill':
                            const mobToKill = mobs.find(m => m.id === data.id);
                            if (mobToKill) {
                                try { scene.remove(mobToKill.mesh); disposeObject(mobToKill.mesh); } catch (e) { }
                                mobs = mobs.filter(m => m.id !== mobToKill.id);
                            }
                            break;

                        case 'mob_hit':
                            if (isHost) {
                                const mobToHit = mobs.find(m => m.id === data.id);
                                if (mobToHit) mobToHit.hurt(data.damage || 4, data.username);
                            }
                            break;

                        case 'player_hit':
                            if (isHost) handlePlayerHit(data);
                            break;

                        case 'player_damage':
                            if (Date.now() - lastDamageTime > 400) {
                                player.health = Math.max(0, player.health - (data.damage || 1));
                                lastDamageTime = Date.now();
                                document.getElementById('health').innerText = player.health;
                                updateHealthBar();
                                if (data.attacker === 'lava') {
                                    addMessage('Burning in lava! HP: ' + player.health, 1000);
                                } else {
                                    addMessage('Hit by ' + data.attacker + '! HP: ' + player.health, 1000);
                                }
                                flashDamageEffect();
                                safePlayAudio(soundHit);
                                if (data.kx !== undefined && data.kz !== undefined) {
                                    player.vx += data.kx;
                                    player.vz += data.kz;
                                }
                                if (player.health <= 0) handlePlayerDeath();
                            }
                            break;

                        case 'add_score':
                            player.score += data.amount || 0;
                            document.getElementById('score').innerText = player.score;
                            addMessage(`+${data.amount} score`, 1500);
                            break;

                        case 'player_attack':
                            if (isHost) {
                                const attackerState = userPositions[sender];
                                if (attackerState) {
                                    attackerState.isAttacking = true;
                                    const now = performance.now();
                                    attackerState.attackStartTime = now;
                                    attackerState.localAnimStartTime = now;
                                }
                            }
                            break;

                        case 'player_death':
                            const deadPlayerUsername = data.username;
                            if (userPositions[deadPlayerUsername]) {
                                userPositions[deadPlayerUsername].isDying = true;
                                userPositions[deadPlayerUsername].deathAnimationStart = performance.now();
                                const deadPlayerAvatar = playerAvatars.get(deadPlayerUsername);
                                if (deadPlayerAvatar) deadPlayerAvatar.visible = true;
                            }
                            break;
                        case 'health_update':
                            if (isHost) {
                                if (userPositions[data.username]) {
                                    userPositions[data.username].health = data.health;
                                }
                            }
                            break;
                        case 'laser_fired':
                            laserQueue.push(data);
                            break;
                        case 'item_dropped':
                            if (!droppedItems.some(item => item.id === data.dropId)) {
                                createDroppedItemOrb(data.dropId, new THREE.Vector3(data.position.x, data.position.y, data.position.z), data.blockId, data.originSeed, data.dropper);
                            }
                            break;
                        case 'item_picked_up':
                            const itemIndex = droppedItems.findIndex(item => item.id === data.dropId);
                            if (itemIndex !== -1) {
                                const item = droppedItems[itemIndex];
                                scene.remove(item.mesh);
                                scene.remove(item.light);
                                droppedItems.splice(itemIndex, 1);
                            }
                            break;
                        case 'video_started':
                            addMessage(`${data.username} started their video.`, 2000);
                            break;
                        case 'video_stopped':
                            if (userVideoStreams.has(data.username)) {
                                const videoData = userVideoStreams.get(data.username);
                                if (videoData.video) {
                                    videoData.video.srcObject = null;
                                    videoData.video.remove();
                                }
                                userVideoStreams.delete(data.username);
                                addMessage(`${data.username} stopped their video.`, 2000);
                            }
                            break;
                        case 'renegotiation_offer':
                            if (peers.has(user)) {
                                const peer = peers.get(user);
                                peer.pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                                    .then(() => peer.pc.createAnswer())
                                    .then(answer => peer.pc.setLocalDescription(answer))
                                    .then(() => {
                                        if (peer.dc && peer.dc.readyState === 'open') {
                                            peer.dc.send(JSON.stringify({ type: 'renegotiation_answer', answer: peer.pc.localDescription }));
                                        }
                                    })
                                    .catch(e => console.error("Renegotiation error (offer):", e));
                            }
                            break;
                        case 'renegotiation_answer':
                            if (peers.has(user)) {
                                peers.get(user).pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                                    .catch(e => console.error("Renegotiation error (answer):", e));
                            }
                            break;
                        case 'volcano_event':
                            handleVolcanoEvent(data);
                            break;
                        case 'boulder_update':
                            if (!isHost) {
                                for (const boulderState of data.boulders) {
                                    let boulder = eruptedBlocks.find(b => b.id === boulderState.id);
                                    if (boulder) {
                                        boulder.targetPosition = new THREE.Vector3().fromArray(boulderState.position);
                                        boulder.targetQuaternion = new THREE.Quaternion().fromArray(boulderState.quaternion);
                                        boulder.lastUpdate = performance.now();
                                    }
                                }
                            }
                            break;
                    }
                } catch (err) {
                    console.error(`[WEBRTC] Failed to process message from ${user}:`, err);
                }
            };

            dc.onclose = () => {
                console.log(`[WebRTC] Data channel with ${user} closed.`);
                cleanupPeer(user);
            };

            dc.onerror = e => {
                console.error(`[WebRTC] Data channel error with ${user}:`, e);
                cleanupPeer(user);
            };
        }

        function updatePendingModal() {
            var modal = document.getElementById('pendingModal');
            var list = document.getElementById('pendingList');
            list.innerHTML = '';
            for (var offer of pendingOffers) {
                var row = document.createElement('div');
                row.className = 'row';
                var info = document.createElement('div');
                info.innerText = offer.clientUser + ' at ' + new Date(offer.timestamp).toLocaleString();
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'selectOffer';
                checkbox.dataset.user = offer.clientUser;
                row.appendChild(info);
                row.appendChild(checkbox);
                list.appendChild(row);
            }
            modal.style.display = isHost && pendingOffers.length > 0 ? 'block' : 'none';
        }
        function activateHost() {
            if (!isHost) {
                isHost = true;
                console.log('[SYSTEM] Hosting activated.');
                addMessage('Host mode activated!', 3000);
                startOfferPolling();
                const usersBtn = document.getElementById('usersBtn');
                if (usersBtn) {
                    usersBtn.classList.add('hosting');
                }
            }
        }

        async function acceptPendingOffers() {
            activateHost();
            const checkboxes = document.querySelectorAll('.selectOffer:checked');
            if (checkboxes.length === 0) {
                addMessage('No offers selected', 3000);
                return;
            }

            const batch = [];
            const users = [];

            for (const checkbox of checkboxes) {
                const clientUser = checkbox.dataset.user;
                const offer = pendingOffers.find(o => o.clientUser === clientUser);
                if (!offer || !offer.offer) continue;

                let answer = { type: 'answer', sdp: '' };
                let answerIceCandidates = [];
                let pc = null;

                try {
                    const iceServers = await getTurnCredentials();
                    pc = new RTCPeerConnection({ iceServers });

                    if (localAudioStream) {
                        localAudioStream.getTracks().forEach(track => {
                            pc.addTrack(track, localAudioStream);
                        });
                    }

                    pc.ontrack = (event) => {
                        const username = clientUser; // The track is from the connecting client.
                        if (event.track.kind === 'audio') {
                            if (!userAudioStreams.has(username)) {
                                const audio = new Audio();
                                audio.srcObject = event.streams[0];
                                audio.autoplay = true;
                                userAudioStreams.set(username, { audio: audio, stream: event.streams[0] });
                                console.log(`[WebRTC] Received audio stream from ${username}`);
                            }
                        } else if (event.track.kind === 'video') {
                            if (!userVideoStreams.has(username)) {
                                const video = document.createElement('video');
                                video.srcObject = event.streams[0];
                                video.autoplay = true;
                                video.playsInline = true;
                                video.style.display = 'none'; // Initially hidden
                                document.body.appendChild(video);
                                userVideoStreams.set(username, { video: video, stream: event.streams[0] });
                                console.log(`[WebRTC] Received video stream from ${username}`);
                            }
                        }
                    };

                    // CRITICAL: Store peer IMMEDIATELY
                    peers.set(clientUser, { pc, dc: null, address: null });

                    pc.ondatachannel = (e) => {
                        const dc = e.channel;
                        peers.get(clientUser).dc = dc;
                        setupDataChannel(dc, clientUser);
                    };

                    // NO TIMEOUT - Process IMMEDIATELY
                    await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
                    for (const candidate of offer.iceCandidates || []) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
                    }

                    answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    pc.onicecandidate = e => {
                        if (e.candidate) answerIceCandidates.push(e.candidate);
                    };

                    // COMPLETE ICE GATHERING - NO TIMEOUT
                    await new Promise(resolve => {
                        pc.onicegatheringstatechange = () => {
                            if (pc.iceGatheringState === 'complete') resolve();
                        };
                        // FORCE COMPLETE AFTER 5s MAX
                        setTimeout(resolve, 5000);
                    });

                    batch.push({
                        user: clientUser,
                        answer,
                        iceCandidates: answerIceCandidates
                    });
                    users.push(clientUser);

                    console.log(`[FIXED] Created answer for ${clientUser} - NO TIMEOUT`);

                } catch (e) {
                    console.error(`[ERROR] Failed ${clientUser}:`, e);
                    if (pc) pc.close();
                    continue;
                }
            }

            if (batch.length > 0) {
                const batchData = { world: worldName, user: userName, batch };
                const blob = new Blob([JSON.stringify(batchData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${worldName}_batch_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                // IMMEDIATE MODAL - NO DELAY
                const modal = document.getElementById('joinScriptModal');
                const batchKeyword = 'MCBatch@' + userName + '@' + worldName;
                const addressText = (await GetPublicAddressByKeyword(batchKeyword))?.trim().replace(/"|'/g, '') || batchKeyword;

                modal.querySelector('h3').innerText = '🚀 BATCH READY - SEND NOW';
                modal.querySelector('p').innerText = `Copy address → Sup!? To: field → Attach JSON → 📢 SEND IMMEDIATELY`;
                modal.querySelector('#joinScriptText').value = addressText;
                modal.style.display = 'block';
                isPromptOpen = true;

                addMessage(`✅ Batch ready for ${users.length} players - SEND NOW!`, 10000);
                pendingOffers = pendingOffers.filter(o => !users.includes(o.clientUser));
                updatePendingModal();
            }
        }

        function setupPendingModal() {
            console.log('[MODAL] Setting up pendingModal');
            const existingModal = document.getElementById('pendingModal');
            if (existingModal) {
                existingModal.remove();
                console.log('[MODAL] Removed existing pendingModal');
            }
            const modal = document.createElement('div');
            modal.id = 'pendingModal';
            modal.style.position = 'fixed';
            modal.style.right = '12px';
            modal.style.bottom = '12px';
            modal.style.zIndex = '220';
            modal.style.background = 'var(--panel)';
            modal.style.padding = '14px';
            modal.style.borderRadius = '10px';
            modal.style.minWidth = '300px';
            modal.style.maxWidth = '400px';
            modal.style.display = isHost && pendingOffers.length > 0 ? 'block' : 'none';
            modal.innerHTML = `
            <h3>Pending Connections</h3>
            <div id="pendingList"></div>
            <div class="actions">
                <label><input type="checkbox" id="acceptAll"> Accept All</label>
                <button id="acceptPending">Accept Selected</button>
                <button id="closePending">Close</button>
            </div>
        `;
            document.body.appendChild(modal);
            console.log('[MODAL] pendingModal added to DOM');
            const list = modal.querySelector('#pendingList');
            list.style.maxHeight = 'calc(80vh - 100px)';
            list.style.overflow = 'auto';
            list.innerHTML = '';
            let hasEntries = false;
            const offerMap = new Map();
            for (const offer of pendingOffers) {
                if (offer.clientUser === userName) {
                    console.log('[MODAL] Skipping offer from self:', offer.clientUser);
                    continue;
                }
                if (!offerMap.has(offer.clientUser)) {
                    offerMap.set(offer.clientUser, offer);
                }
            }
            const latestOffers = Array.from(offerMap.values());
            for (const offer of latestOffers) {
                console.log('[MODAL] Rendering pending offer from:', offer.clientUser);
                const row = document.createElement('div');
                row.className = 'row';
                row.style.maxHeight = '80px';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.marginBottom = '8px';
                const info = document.createElement('div');
                info.innerText = `${offer.clientUser || 'Unknown'} at ${new Date(offer.timestamp).toLocaleString()}\nBio: ${offer.profile && offer.profile.Bio ? offer.profile.Bio : 'No bio'}`;
                info.style.whiteSpace = 'pre-line';
                info.style.maxWidth = '200px';
                info.style.maxHeight = '60px';
                info.style.overflow = 'hidden';
                info.style.textOverflow = 'ellipsis';
                info.style.flex = '1';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'selectOffer';
                checkbox.dataset.user = offer.clientUser || '';
                checkbox.dataset.transactionId = offer.transactionId;
                checkbox.style.margin = '0 8px';
                const acceptBtn = document.createElement('button');
                acceptBtn.innerText = 'Accept';
                acceptBtn.style.marginRight = '8px';
                acceptBtn.onclick = () => {
                    console.log('[WEBRTC] Accepting offer from:', offer.clientUser);
                    checkbox.checked = true;
                    acceptPendingOffers();
                };
                const rejectBtn = document.createElement('button');
                rejectBtn.innerText = 'Reject';
                rejectBtn.style.background = 'var(--danger)';
                rejectBtn.style.color = '#111';
                rejectBtn.onclick = () => {
                    console.log('[WEBRTC] Rejecting offer from:', offer.clientUser);
                    pendingOffers = pendingOffers.filter(o => o.clientUser !== offer.clientUser);
                    addMessage(`Rejected connection from ${offer.clientUser || 'Unknown'}`, 3000);
                    setupPendingModal();
                };
                row.appendChild(info);
                row.appendChild(checkbox);
                row.appendChild(acceptBtn);
                row.appendChild(rejectBtn);
                list.appendChild(row);
                hasEntries = true;
            }
            if (!hasEntries) {
                console.log('[MODAL] No pending offers to render');
                const empty = document.createElement('div');
                empty.style.marginTop = '8px';
                empty.innerText = 'No pending connection requests';
                list.appendChild(empty);
            }
            const acceptAll = modal.querySelector('#acceptAll');
            if (acceptAll) {
                acceptAll.addEventListener('change', e => {
                    document.querySelectorAll('.selectOffer').forEach(ch => { ch.checked = e.target.checked; });
                    console.log('[MODAL] Accept All checkbox changed');
                });
            }
            const acceptPending = modal.querySelector('#acceptPending');
            if (acceptPending) {
                acceptPending.onclick = async () => {
                    console.log('[MODAL] Accept Pending clicked');
                    await acceptPendingOffers();
                };
            }
            modal.querySelector('#closePending').onclick = () => {
                console.log('[MODAL] Closing pendingModal');
                modal.style.display = 'none';
                isPromptOpen = false;
            };
        }
        function startOfferPolling() {
            if (!isHost) {
                console.log('[SYSTEM] Not hosting, skipping offer polling');
                return;
            }
            console.log('[SYSTEM] Starting offer polling for:', userName);
            var offerKeyword = 'MCConn@' + userName + '@' + worldName;
            var apiDelay = 350;
            var interval = setInterval(async function () {
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    console.log('[SYSTEM] Polling offers for:', offerKeyword);
                    worker.postMessage({
                        type: 'poll',
                        chunkKeys: [],
                        masterKey: MASTER_WORLD_KEY,
                        userAddress: userAddress,
                        worldName: worldName,
                        serverKeyword: 'MCServerJoin@' + worldName,
                        offerKeyword: offerKeyword,
                        answerKeywords: [],
                        userName: userName
                    });
                } catch (e) {
                    console.error('[SYSTEM] Error in offer polling:', e);
                }
            }, 30000);
            offerPollingIntervals.set(offerKeyword, interval);
        }
        function startAnswerPolling(hostUser) {
            var keyword = 'MCAnswer@' + userName + '@' + worldName;
            if (answerPollingIntervals.has(keyword)) return;
            console.log('[SYSTEM] Starting answer polling for:', hostUser);
            answerPollingIntervals.set(keyword, setInterval(function () {
                worker.postMessage({
                    type: 'poll',
                    chunkKeys: [],
                    masterKey: MASTER_WORLD_KEY,
                    userAddress: userAddress,
                    worldName: worldName,
                    serverKeyword: 'MCServerJoin@' + worldName,
                    offerKeyword: null,
                    answerKeywords: [keyword],
                    userName: userName
                });
                if (Date.now() - connectionAttempts.get(hostUser) > 1800000) {
                    console.log('[SYSTEM] Answer polling timeout for:', hostUser);
                    addMessage('Connection to ' + hostUser + ' timed out after 30 minutes.', 5000);
                    clearInterval(answerPollingIntervals.get(keyword));
                    answerPollingIntervals.delete(keyword);
                    var peer = peers.get(hostUser);
                    if (peer && peer.pc) peer.pc.close();
                    peers.delete(hostUser);
                    if (playerAvatars.has(hostUser)) {
                        scene.remove(playerAvatars.get(hostUser));
                        disposeObject(playerAvatars.get(hostUser));
                        playerAvatars.delete(hostUser);
                    }
                    delete userPositions[hostUser];
                    updateHudButtons();
                }
            }, 30000));
        }
        async function pollServers() {
            if (isInitialLoad) {
                console.log('[SYSTEM] Skipping poll, initial load not complete');
                return;
            }
            console.log('[SYSTEM] Polling server announcements for:', 'MCServerJoin@' + worldName);
            var serverKeyword = 'MCServerJoin@' + worldName;
            var retries = 0;
            var maxRetries = 3;
            var retryDelay = 5000;
            var apiDelay = 350;
            async function tryFetchMessages() {
                var serverAddr;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    serverAddr = await GetPublicAddressByKeyword(serverKeyword);
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch server address:', e);
                }
                if (!serverAddr) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(tryFetchMessages, retryDelay * Math.pow(2, retries));
                    } else {
                        addMessage('Failed to fetch server announcements', 3000);
                        console.error('[SYSTEM] Max retries reached for server announcements');
                    }
                    return;
                }
                var messages = [];
                var skip = 0;
                var qty = 5000;
                while (true) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var response = await GetPublicMessagesByAddress(serverAddr, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    } catch (e) {
                        console.error('[SYSTEM] Failed to fetch server messages, skip:', skip, 'error:', e);
                        break;
                    }
                }
                var newServers = [];
                var transactionIds = [];
                var messageMap = new Map();
                for (var msg of messages) {
                    if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
                        if (msg.TransactionId) {
                            break; // Stop processing as all remaining messages are older
                        }
                        continue;
                    }
                    transactionIds.push(msg.TransactionId);
                    var fromAddress = msg.FromAddress;
                    var timestamp = Date.parse(msg.BlockDate) || Date.now();
                    var existing = messageMap.get(fromAddress);
                    if (!existing || existing.timestamp < timestamp) {
                        messageMap.set(fromAddress, { msg: msg, timestamp: timestamp });
                    }
                }
                for (var entry of messageMap) {
                    var msg = entry[1].msg;
                    var timestamp = entry[1].timestamp;
                    try {
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var fromProfile = await GetProfileByAddress(msg.FromAddress);
                        if (!fromProfile || !fromProfile.URN) {
                            console.log('[USERS] Skipping server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                            continue;
                        }
                        var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var userProfile = await GetProfileByURN(hostUser);
                        if (!userProfile) {
                            console.log('[USERS] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
                        } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                            console.log('[USERS] Skipping server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
                            continue;
                        }
                        var spawn = calculateSpawnPoint(hostUser + '@' + worldName);
                        var offer = null;
                        var iceCandidates = [];
                        var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                        if (match) {
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (cidRegex.test(hash)) {
                                try {
                                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                                    var data = await fetchIPFS(hash);
                                    if (data && data.offer && data.world === worldName) {
                                        offer = data.offer;
                                        iceCandidates = data.iceCandidates || [];
                                    }
                                } catch (e) {
                                    console.error('[SYSTEM] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
                                }
                            }
                        }
                        if (!knownServers.some(s => s.hostUser === hostUser && s.transactionId === msg.TransactionId)) {
                            newServers.push({
                                hostUser: hostUser,
                                spawn: spawn,
                                offer: offer,
                                iceCandidates: iceCandidates,
                                transactionId: msg.TransactionId,
                                timestamp: timestamp,
                                connectionRequestCount: 0,
                                latestRequestTime: null
                            });
                            processedMessages.add(msg.TransactionId);
                        }
                    } catch (e) {
                        console.error('[SYSTEM] Error processing server message:', msg.TransactionId, e);
                    }
                }
                console.log('[SYSTEM] New server announcements found:', newServers.length);
                var serverMap = new Map();
                for (var server of knownServers.concat(newServers)) {
                    if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                        serverMap.set(server.hostUser, server);
                    }
                }
                knownServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
                if (newServers.length > 0) {
                    addMessage('New player(s) available to connect!', 3000);
                    updateHudButtons();
                }
            }
            tryFetchMessages();
        }
        async function initServers() {
            console.log('[SYSTEM] Initializing servers for:', worldName);
            var serverKeyword = 'MCServerJoin@' + worldName;
            var responseKeywords = [];
            var serverAddr;
            try {
                serverAddr = await GetPublicAddressByKeyword(serverKeyword);
            } catch (e) {
                console.error('[SYSTEM] Failed to fetch initial server address:', e);
            }
            if (!serverAddr) {
                console.error('[SYSTEM] No server address for:', serverKeyword);
                return;
            }
            console.log('[SYSTEM] Fetching initial server announcements for:', serverKeyword);
            var messages = [];
            var skip = 0;
            var qty = 5000;
            var apiDelay = 350;
            while (true) {
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var response = await GetPublicMessagesByAddress(serverAddr, skip, qty);
                    if (!response || response.length === 0) break;
                    messages = messages.concat(response);
                    if (response.length < qty) break;
                    skip += qty;
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch initial server messages, skip:', skip, 'error:', e);
                    break;
                }
            }
            console.log('[SYSTEM] Initial poll: Found', messages.length, 'server announcements');
            var messageMap = new Map();
            for (var msg of messages) {
                if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
                    if (msg.TransactionId) {
                        console.log('[SYSTEM] Stopping server message processing at cached ID:', msg.TransactionId);
                        break; // Stop processing as all remaining messages are older
                    }
                    continue;
                }
                processedMessages.add(msg.TransactionId);
                var timestamp = Date.parse(msg.BlockDate) || Date.now();
                var existing = messageMap.get(msg.FromAddress);
                if (!existing || existing.timestamp < timestamp) {
                    messageMap.set(msg.FromAddress, { msg: msg, timestamp: timestamp });
                }
            }
            for (var entry of messageMap) {
                var msg = entry[1].msg;
                var timestamp = entry[1].timestamp;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var fromProfile = await GetProfileByAddress(msg.FromAddress);
                    if (!fromProfile || !fromProfile.URN) {
                        console.log('[USERS] Skipping initial server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                        continue;
                    }
                    var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var userProfile = await GetProfileByURN(hostUser);
                    if (!userProfile) {
                        console.log('[USERS] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
                    } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                        console.log('[USERS] Skipping initial server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
                        continue;
                    }
                    var spawn = calculateSpawnPoint(hostUser + '@' + worldName);
                    var offer = null;
                    var iceCandidates = [];
                    var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                    if (match) {
                        var hash = match[1];
                        var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                        if (cidRegex.test(hash)) {
                            try {
                                await new Promise(resolve => setTimeout(resolve, apiDelay));
                                var data = await fetchIPFS(hash);
                                if (data && data.offer && data.world === worldName) {
                                    offer = data.offer;
                                    iceCandidates = data.iceCandidates || [];
                                }
                            } catch (e) {
                                console.error('[SYSTEM] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
                            }
                        }
                    }
                    if (!knownServers.some(s => s.hostUser === hostUser && s.transactionId === msg.TransactionId)) {
                        knownServers.push({
                            hostUser: hostUser,
                            spawn: spawn,
                            offer: offer,
                            iceCandidates: iceCandidates,
                            transactionId: msg.TransactionId,
                            timestamp: timestamp,
                            connectionRequestCount: 0,
                            latestRequestTime: null
                        });
                    }
                    responseKeywords.push('MCConn@' + hostUser + '@' + worldName);
                } catch (e) {
                    console.error('[SYSTEM] Error processing initial server message:', msg.TransactionId, e);
                }
            }
            var serverMap = new Map();
            for (var server of knownServers) {
                if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                    serverMap.set(server.hostUser, server);
                }
            }
            knownServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
            if (isHost) {
                responseKeywords.push('MCConn@' + userName + '@' + worldName);
            }
            for (var responseKeyword of responseKeywords) {
                var responseAddr;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    responseAddr = await GetPublicAddressByKeyword(responseKeyword);
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch initial response address for:', responseKeyword, e);
                }
                if (responseAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, apiDelay));
                            var response = await GetPublicMessagesByAddress(responseAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        } catch (e) {
                            console.error('[SYSTEM] Failed to fetch initial response messages for:', responseKeyword, 'skip:', skip, 'error:', e);
                            break;
                        }
                    }
                    console.log('[SYSTEM] Initial poll: Found', messages.length, 'existing responses for:', responseKeyword);
                    for (var msg of messages) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[SYSTEM] Stopping response message processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (msg.TransactionId) {
                            processedMessages.add(msg.TransactionId);
                        }
                    }
                    var requestCount = messages.length;
                    var latestRequest = messages.length > 0 ? Date.parse(messages[0].BlockDate) || Date.now() : null;
                    var hostUser = responseKeyword.match(/MCConn@(.+)@[^@]+$/)[1];
                    var server = knownServers.find(function (s) { return s.hostUser === hostUser; });
                    if (server) {
                        server.connectionRequestCount = requestCount;
                        server.latestRequestTime = latestRequest;
                    }
                }
            }
            // Process offers only for host's keyword if isHost
            if (isHost) {
                var hostKeyword = 'MCConn@' + userName + '@' + worldName;
                var responseAddr = await GetPublicAddressByKeyword(hostKeyword);
                if (responseAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, apiDelay));
                            var response = await GetPublicMessagesByAddress(responseAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        } catch (e) {
                            console.error('[SYSTEM] Failed to fetch initial host offer messages for:', hostKeyword, 'skip:', skip, 'error:', e);
                            break;
                        }
                    }
                    var newOffers = [];
                    for (var msg of messages) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[SYSTEM] Stopping host offer processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (!msg.TransactionId) continue;
                        processedMessages.add(msg.TransactionId);
                        try {
                            var fromProfile = await GetProfileByAddress(msg.FromAddress);
                            if (!fromProfile || !fromProfile.URN) {
                                console.log('[USERS] Skipping initial offer message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var clientUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                            var userProfile = await GetProfileByURN(clientUser);
                            if (!userProfile) {
                                console.log('[USERS] No profile for user:', clientUser, 'txId:', msg.TransactionId);
                                continue;
                            }
                            if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                                console.log('[USERS] Skipping initial offer message, invalid creators for user:', clientUser, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                            if (!match) {
                                console.log('[SYSTEM] No IPFS hash in initial offer message:', msg.Message, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (!cidRegex.test(hash)) {
                                console.log('[SYSTEM] Invalid CID in initial offer message:', hash, 'txId:', msg.TransactionId);
                                continue;
                            }
                            try {
                                await new Promise(resolve => setTimeout(resolve, apiDelay));
                                var data = await fetchIPFS(hash);
                                if (!data || !data.world || data.world !== worldName) {
                                    console.log('[SYSTEM] Invalid IPFS data for initial offer message:', hash, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                if (data.offer || data.answer) {
                                    newOffers.push({
                                        clientUser: data.user || clientUser,
                                        offer: data.offer || data.answer,
                                        iceCandidates: data.iceCandidates || [],
                                        transactionId: msg.TransactionId,
                                        timestamp: Date.parse(msg.BlockDate) || Date.now(),
                                        profile: fromProfile
                                    });
                                }
                            } catch (e) {
                                console.error('[SYSTEM] Failed to fetch IPFS for initial offer hash:', hash, 'error:', e, 'txId:', msg.TransactionId);
                            }
                        } catch (e) {
                            console.error('[SYSTEM] Error processing initial offer message:', msg.TransactionId, e);
                        }
                    }
                    if (newOffers.length > 0) {
                        pendingOffers.push(...newOffers);
                        setupPendingModal();
                    }
                }
            }
            console.log('[SYSTEM] Initial load complete.');
            worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
            isInitialLoad = false;
        }
        function openUsersModal() {
            console.log('[MODAL] Opening users modal');
            var existingModal = document.getElementById('usersModal');
            if (existingModal) {
                existingModal.remove();
                console.log('[MODAL] Removed existing usersModal');
            }
            var modal = document.createElement('div');
            modal.id = 'usersModal';
            modal.style.position = 'fixed';
            modal.style.left = '50%';
            modal.style.top = '50%';
            modal.style.transform = 'translate(-50%,-50%)';
            modal.style.zIndex = '220';
            modal.style.background = 'var(--panel)';
            modal.style.padding = '14px';
            modal.style.borderRadius = '10px';
            modal.style.minWidth = '360px';
            modal.style.display = 'block';
            modal.innerHTML = `
            <h3>Online Players</h3>
            <div style="margin-bottom:10px;">
                <input id="friendHandle" placeholder="Enter friend’s handle" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:#0d1620;color:#fff;box-sizing:border-box;" autocomplete="off">
                <button id="connectFriend" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;background:var(--accent);color:#111;border:0;font-weight:700;cursor:pointer;">Connect to Friend</button>
            </div>
            <div id="usersList"></div>
            <p class="warning">Note: Servers may be offline. Connection requires the host to be active. Recent attempts increase success likelihood.</p>
            <div style="margin-top:10px;text-align:right;">
                <button id="closeUsers">Close</button>
            </div>
        `;
            document.body.appendChild(modal);
            console.log('[MODAL] Modal added to DOM');
            var list = modal.querySelector('#usersList');
            list.innerHTML = '';
            var hasEntries = false;

            var connectedHeader = document.createElement('h4');
            connectedHeader.innerText = 'Connected Players';
            list.appendChild(connectedHeader);
            for (var peer of peers) {
                var peerUser = peer[0];
                if (peerUser !== userName) {
                    hasEntries = true;
                    console.log('[MODAL] Rendering peer:', peerUser);
                    var spawn = calculateSpawnPoint(peerUser + '@' + worldName);
                    var row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.gap = '8px';
                    row.style.alignItems = 'center';
                    row.style.marginTop = '8px';
                    var info = document.createElement('div');
                    info.innerText = peerUser + ' (Connected) at (' + Math.floor(spawn.x) + ', ' + Math.floor(spawn.y) + ', ' + Math.floor(spawn.z) + ')';
                    var btn = document.createElement('button');
                    btn.innerText = 'Visit Spawn';
                    btn.onclick = function () {
                        console.log('[MODAL] Teleporting to spawn of:', peerUser);
                        respawnPlayer(spawn.x, 100, spawn.z);
                        modal.style.display = 'none';
                        isPromptOpen = false;
                    };
                    row.appendChild(info);
                    row.appendChild(btn);
                    list.appendChild(row);
                }
            }

            var activeServersHeader = document.createElement('h4');
            activeServersHeader.innerText = 'Known Servers (Last 10)';
            list.appendChild(activeServersHeader);
            var serverMap = new Map();
            for (var server of knownServers) {
                if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                    serverMap.set(server.hostUser, server);
                }
            }
            var uniqueServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
            for (var server of uniqueServers) {
                hasEntries = true;
                console.log('[MODAL] Rendering server:', server.hostUser);
                var row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'center';
                row.style.marginTop = '8px';
                var info = document.createElement('div');
                var attemptTime = connectionAttempts.get(server.hostUser);
                info.innerText = server.hostUser + ' at (' + Math.floor(server.spawn.x) + ', ' + Math.floor(server.spawn.y) + ', ' + Math.floor(server.spawn.z) + ')\nServer started: ' + new Date(server.timestamp).toLocaleString() + '\nLast connect attempt: ' + (attemptTime ? new Date(attemptTime).toLocaleString() : 'Never') + '\nConnection requests: ' + (server.connectionRequestCount || 0) + '\nLatest request: ' + (server.latestRequestTime ? new Date(server.latestRequestTime).toLocaleString() : 'None');
                info.style.whiteSpace = 'pre-line';
                if (!peers.has(server.hostUser) && (!isHost || server.hostUser !== userName)) {
                    var btn = document.createElement('button');
                    btn.innerText = 'Try Connect';
                    btn.onclick = async function () {
                        console.log('[WEBRTC] Attempting to connect to server:', server.hostUser);
                        addMessage("Finding a route to " + server.hostUser + "...", 5000);
                        await connectToServer(server.hostUser, server.offer, server.iceCandidates);
                        modal.style.display = 'none';
                        isPromptOpen = false;
                    };
                    row.appendChild(btn);
                }
                row.appendChild(info);
                list.appendChild(row);
            }

            if (isHost) {
                var pendingHeader = document.createElement('h4');
                pendingHeader.innerText = 'Pending Connections';
                list.appendChild(pendingHeader);
                for (var offer of pendingOffers) {
                    var row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.gap = '8px';
                    row.style.alignItems = 'center';
                    row.style.marginTop = '8px';
                    var info = document.createElement('div');
                    info.innerText = offer.clientUser + ' at ' + new Date(offer.timestamp).toLocaleString() + '\nBio: ' + (offer.profile && offer.profile.Bio ? offer.profile.Bio : 'No bio');
                    info.style.whiteSpace = 'pre-line';
                    row.appendChild(info);
                    list.appendChild(row);
                    hasEntries = true;
                }
            }
            if (!hasEntries) {
                console.log('[MODAL] No servers or peers to render in modal');
                var empty = document.createElement('div');
                empty.style.marginTop = '8px';
                empty.innerText = 'No players available';
                list.appendChild(empty);
            }
            modal.querySelector('#closeUsers').onclick = function () {
                console.log('[MODAL] Closing users modal');
                modal.remove();
                isPromptOpen = false;
            };
            modal.querySelector('#friendHandle').addEventListener('keydown', function (e) {
                e.stopPropagation();
            });
            modal.querySelector('#connectFriend').onclick = function () {
                isConnecting = true;
                var handle = document.getElementById('friendHandle').value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
                if (!handle) {
                    addMessage('Please enter a friend’s handle', 3000);
                    return;
                }
                if (handle === userName) {
                    addMessage('Cannot connect to yourself', 3000);
                    return;
                }
                console.log('[WEBRTC] Attempting to connect to friend:', handle);
                // Add friend to knownServers with a temporary entry
                var spawn = calculateSpawnPoint(handle + '@' + worldName);
                knownServers.push({
                    hostUser: handle,
                    spawn: spawn,
                    offer: null,
                    iceCandidates: [],
                    transactionId: 'local_' + Date.now(),
                    timestamp: Date.now(),
                    connectionRequestCount: 0,
                    latestRequestTime: null
                });
                connectToServer(handle, null, []);
                modal.style.display = 'none';
                isPromptOpen = false;
            };
        }
        async function startGame() {
            var startBtn = document.getElementById('startBtn');
            if(startBtn) startBtn.blur();
            console.log('[LOGIN] Start game triggered');
            isPromptOpen = false;
            var worldInput = document.getElementById('worldNameInput').value;
            var userInput = document.getElementById('userInput').value;
            if (worldInput.length > 8) {
                addMessage('World name too long (max 8 chars)', 3000);
                return;
            }
            if (userInput.length > 20) {
                addMessage('Username too long (max 20 chars)', 3000);
                return;
            }
            if (!worldInput || !userInput) {
                addMessage('Please enter a world and username', 3000);
                return;
            }
            worldName = worldInput.slice(0, 8);
            userName = userInput.slice(0, 20);
            worldSeed = worldName;

            const colorRnd = makeSeededRandom(worldSeed + '_colors');
            for (const blockId in BLOCKS) {
                if (Object.hasOwnProperty.call(BLOCKS, blockId)) {
                    const block = BLOCKS[blockId];
                    const baseColor = new THREE.Color(block.color);
                    const hsv = {};
                    baseColor.getHSL(hsv);
                    const newHue = (hsv.h + (colorRnd() - 0.5) * 0.05); // Less hue shift
                    const newSat = Math.max(0.4, Math.min(0.9, hsv.s + (colorRnd() - 0.5) * 0.2)); // Saturate a bit
                    const newLight = Math.max(0.1, Math.min(0.5, hsv.l + (colorRnd() - 0.5) * 0.2)); // Darker
                    baseColor.setHSL(newHue, newSat, newLight);
                    block.color = '#' + baseColor.getHexString();
                }
            }

            var userWorldKey = userName + '@' + worldName;
            var profile;
            try {
                profile = await GetProfileByURN(userName);
            } catch (e) {
                console.error("Failed to get profile by URN", e);
                profile = null;
            }
            userAddress = profile && profile.Creators ? profile.Creators[0] : 'anonymous';
            if (!knownUsers.has(userName)) knownUsers.set(userName, userAddress);
            if (!knownWorlds.has(worldName)) {
                knownWorlds.set(worldName, { discoverer: userName, users: new Set([userName]), toAddress: userAddress });
            } else {
                knownWorlds.get(worldName).users.add(userName);
            }
            keywordCache.set(userAddress, userWorldKey);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('hud').style.display = 'block';
            document.getElementById('hotbar').style.display = 'flex';
            document.getElementById('rightPanel').style.display = 'flex';
            document.getElementById('worldLabel').textContent = worldName;
            document.getElementById('seedLabel').textContent = 'User ' + userName;
            updateHudButtons();
            console.log('[LOGIN] Initializing Three.js');
            try {
                await initAudio();
            } catch (e) {
                console.error("Failed to initialize audio:", e);
                addMessage("Could not initialize audio, continuing without it.", 3000);
            }
            console.log('[LOGIN] Initializing Three.js after audio');
            initThree();
            initMusicPlayer();
            initVideoPlayer();
            INVENTORY[0] = { id: 120, count: 8 };
            INVENTORY[1] = { id: 121, count: 1 };
            selectedHotIndex = 0; // Auto-select torch
            selectedBlockId = 120; // Explicitly set selected block
            initHotbar();
            updateHotbarUI(); // Explicitly update UI and selectedBlockId
            console.log('[LOGIN] Creating ChunkManager');
            chunkManager = new ChunkManager(worldSeed);
            populateSpawnChunks();
            console.log('[LOGIN] Calculating spawn point');
            var spawn = calculateSpawnPoint(userWorldKey);
            player.x = spawn.x;
            player.y = chunkManager.getSurfaceY(spawn.x, spawn.z) + 1;
            player.z = spawn.z;
            spawnPoint = { x: player.x, y: player.y, z: player.z };
            player.vy = 0;
            player.onGround = true;
            var chunksPerSide = Math.floor(MAP_SIZE / CHUNK_SIZE);
            var spawnCx = Math.floor(spawn.x / CHUNK_SIZE);
            var spawnCz = Math.floor(spawn.z / CHUNK_SIZE);
            console.log('[LOGIN] Preloading initial chunks');
            chunkManager.preloadChunks(spawnCx, spawnCz, INITIAL_LOAD_RADIUS);
            setupMobile();
            initMinimap();
            updateHotbarUI();
            cameraMode = 'first';
            controls.enabled = false;
            avatarGroup.visible = false;
            camera.position.set(player.x, player.y + 1.62, player.z);
            camera.rotation.set(0, 0, 0, 'YXZ');
            if (!isMobile()) {
                try {
                    renderer.domElement.requestPointerLock();
                    mouseLocked = true;
                    document.getElementById('crosshair').style.display = 'block';
                } catch (e) {
                    addMessage('Pointer lock failed. Serve over HTTPS or ensure allow-pointer-lock is set in iframe.', 3000);
                }
            }
            player.yaw = 0;
            player.pitch = 0;
            lastFrame = performance.now();
            lastRegenTime = lastFrame;
            var unregisterKeyEvents = registerKeyEvents();
            console.log('[LOGIN] Starting game loop');
            requestAnimationFrame(gameLoop);
            addMessage('Welcome — world wraps at edges. Toggle camera with T. Good luck!', 5000);
            var healthElement = document.getElementById('health');
            if (healthElement) healthElement.innerText = player.health;
            var scoreElement = document.getElementById('score');
            if (scoreElement) scoreElement.innerText = player.score;
            initServers(); // Do not await, let it run in the background
            worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
            startWorker();
            setInterval(pollServers, POLL_INTERVAL);
            addMessage('Joined world ' + worldName + ' as ' + userName, 3000);

            if (initialTeleportLocation) {
                respawnPlayer(initialTeleportLocation.x, initialTeleportLocation.y, initialTeleportLocation.z);
                initialTeleportLocation = null;
            }
        }
        document.addEventListener('DOMContentLoaded', async function () {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const worldSeedParam = urlParams.get('world-seed');
                const userNameParam = urlParams.get('user-name');
                const locParam = urlParams.get('loc');

                if (worldSeedParam) {
                    document.getElementById('worldNameInput').value = worldSeedParam;
                }
                if (userNameParam) {
                    document.getElementById('userInput').value = userNameParam;
                }

                if (locParam) {
                    const locParts = locParam.split(',');
                    if (locParts.length === 3) {
                        const x = parseFloat(locParts[0]);
                        const y = parseFloat(locParts[1]);
                        const z = parseFloat(locParts[2]);
                        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                            initialTeleportLocation = { x, y, z };
                        }
                    }
                }

                console.log('[SYSTEM] DOMContentLoaded fired, initializing login elements');
                var startBtn = document.getElementById('startBtn');
                if (worldSeedParam && userNameParam) {
                    startGame();
                }
                var announceLoginBtn = document.getElementById('announceLoginBtn');
                var newUserJoinScriptBtn = document.getElementById('newUserJoinScriptBtn');
                var acceptAll = document.getElementById('acceptAll');
                var pendingModal = document.getElementById('pendingModal');
                var loginOverlay = document.getElementById('loginOverlay');
                if (!startBtn || !announceLoginBtn || !newUserJoinScriptBtn || !loginOverlay) {
                    console.error('[SYSTEM] Login buttons or overlay not found in DOM');
                    addMessage('UI initialization failed: buttons or overlay missing', 3000);
                    return;
                }
                if (acceptAll) {
                    acceptAll.addEventListener('change', function (e) {
                        document.querySelectorAll('.selectOffer').forEach(function (ch) { ch.checked = e.target.checked; });
                        console.log('[MODAL] Accept All checkbox changed');
                    });
                } else {
                    console.warn('[MODAL] acceptAll element not found');
                }
                if (pendingModal) {
                    pendingModal.addEventListener('click', function (e) { e.stopPropagation(); });
                    console.log('[MODAL] Pending modal click listener added');
                } else {
                    console.warn('[MODAL] pendingModal element not found');
                }
                startBtn.addEventListener('click', startGame);
                announceLoginBtn.addEventListener('click', async function () {
                    this.blur();
                    console.log('[LOGIN] Announce Server button clicked');
                    isPromptOpen = true;
                    var worldInput = document.getElementById('worldNameInput').value;
                    var userInput = document.getElementById('userInput').value;
                    if (worldInput.length > 8) {
                        addMessage('World name too long (max 8 chars)', 3000);
                        return;
                    }
                    if (userInput.length > 20) {
                        addMessage('Username too long (max 20 chars)', 3000);
                        return;
                    }
                    if (!worldInput || !userInput) {
                        addMessage('Please enter a world and username', 3000);
                        return;
                    }
                    var cleanWorld = worldInput.slice(0, 8);
                    var cleanUser = userInput.slice(0, 20);
                    var serverKeyword = 'MCServerJoin@' + cleanWorld;
                    var serverAddr = await GetPublicAddressByKeyword(serverKeyword);
                    document.getElementById('joinScriptText').value = serverAddr ? serverAddr.trim().replace(/^"|"$/g, '') : serverKeyword;
                    document.getElementById('joinScriptModal').style.display = 'block';
                    document.getElementById('joinScriptModal').querySelector('h3').innerText = 'Announce Server';
                    document.getElementById('joinScriptModal').querySelector('p').innerText = 'Copy this address and paste it into a Sup!? message To: field, attach a server JSON file after starting, and click 📢 to announce your server.';
                    addMessage('Prepare to announce server after starting', 3000);
                });
                newUserJoinScriptBtn.addEventListener('click', async function () {
                    this.blur();
                    console.log('[LOGIN] Create Join Script button clicked');
                    isPromptOpen = true;
                    var worldInput = document.getElementById('worldNameInput').value;
                    var userInput = document.getElementById('userInput').value;
                    if (worldInput.length > 8) {
                        addMessage('World name too long (max 8 chars)', 3000);
                        return;
                    }
                    if (userInput.length > 20) {
                        addMessage('Username too long (max 20 chars)', 3000);
                        return;
                    }
                    if (!worldInput || !userInput) {
                        addMessage('Please enter a world and username', 3000);
                        return;
                    }
                    var cleanWorld = worldInput.slice(0, 8);
                    var cleanUser = userInput.slice(0, 20);
                    var userWorldKey = cleanUser + '@' + cleanWorld;
                    var existingWorld = knownWorlds.get(cleanWorld);
                    if (existingWorld && existingWorld.users.has(cleanUser)) {
                        addMessage('User already in this world. Choose a different username.', 3000);
                        return;
                    }
                    var userAddr = await GetPublicAddressByKeyword(userWorldKey);
                    var masterAddr = await GetPublicAddressByKeyword(MASTER_WORLD_KEY);
                    var addresses = [
                        userAddr ? userAddr.trim() : userWorldKey,
                        masterAddr ? masterAddr.trim() : MASTER_WORLD_KEY
                    ].filter(function (a) { return a; });
                    var joinScript = addresses.join(',').replace(/["']/g, '');
                    document.getElementById('joinScriptText').value = joinScript;
                    document.getElementById('joinScriptModal').style.display = 'block';
                    document.getElementById('joinScriptModal').querySelector('h3').innerText = 'Join World';
                    document.getElementById('joinScriptModal').querySelector('p').innerText = 'Copy this address and paste it into a Sup!? message To: field and click 📢 to join the world.';
                    addMessage('Join script ready to share', 3000);
                });
                document.getElementById('homeIcon').addEventListener('click', function () {
                    respawnPlayer();
                    this.blur();
                });
                document.getElementById('camToggle').addEventListener('click', function() {
                    toggleCameraMode();
                    this.blur();
                });
                document.getElementById('openCraft').addEventListener('click', function() {
                    openCrafting();
                    this.blur();
                });
                document.getElementById('teleportBtn').addEventListener('click', function () {
                    isPromptOpen = true;
                    document.getElementById('teleportModal').style.display = 'block';
                    document.getElementById('teleportX').value = Math.floor(player.x);
                    document.getElementById('teleportY').value = Math.floor(player.y);
                    document.getElementById('teleportZ').value = Math.floor(player.z);
                    this.blur();
                });

                document.getElementById('shareWorldBtn').addEventListener('click', function () {
                    var x = document.getElementById('teleportX').value;
                    var y = document.getElementById('teleportY').value;
                    var z = document.getElementById('teleportZ').value;
                    var url = `https://supgalaxy.org/index.html?world-seed=${encodeURIComponent(worldSeed)}&user-name=${encodeURIComponent(userName)}&loc=${x},${y},${z}`;
                    navigator.clipboard.writeText(url).then(function () {
                        addMessage('Shareable URL copied to clipboard!', 3000);
                    }, function (err) {
                        addMessage('Failed to copy URL.', 3000);
                    });
                    this.blur();
                });
                document.getElementById('switchWorldBtn').addEventListener('click', function() {
                    switchWorld();
                    this.blur();
                });
                document.getElementById('saveChangesBtn').addEventListener('click', function() {
                    downloadSession();
                    this.blur();
                });
                document.getElementById('joinScriptBtn').addEventListener('click', async function () {
                    this.blur();
                    isPromptOpen = true;
                    document.getElementById('teleportX').value = '';
                    document.getElementById('teleportY').value = '';
                    document.getElementById('teleportZ').value = '';
                });
                document.getElementById('saveChangesBtn').addEventListener('click', downloadSession);
                document.getElementById('joinScriptBtn').addEventListener('click', async function () {
                    isPromptOpen = true;
                    var userAddr = await GetPublicAddressByKeyword(userName + '@' + worldName);
                    var masterAddr = await GetPublicAddressByKeyword(MASTER_WORLD_KEY);
                    var joinScript = [userAddr || (userName + '@' + worldName), masterAddr || MASTER_WORLD_KEY].filter(function (a) { return a; }).join(',').replace(/["']/g, '');
                    document.getElementById('joinScriptText').value = joinScript;
                    document.getElementById('joinScriptModal').style.display = 'block';
                });
                document.getElementById('usersBtn').addEventListener('click', function() {
                    openUsersModal();
                    this.blur();
                });
                document.getElementById('closeCraft').addEventListener('click', function () {
                    isPromptOpen = false;
                    document.getElementById('craftModal').style.display = 'none';
                    this.blur();
                });
                document.getElementById('closeInventory').addEventListener('click', function () {
                    toggleInventory();
                    this.blur();
                });
                document.getElementById('closeJoinScript').addEventListener('click', function () {
                    isPromptOpen = false;
                    isConnecting = false;
                    document.getElementById('joinScriptModal').style.display = 'none';
                    this.blur();
                });
                document.getElementById('closeDownloadModal').addEventListener('click', function () {
                    isPromptOpen = false;
                    document.getElementById('downloadModal').style.display = 'none';
                    this.blur();
                });
                document.getElementById('teleportCancel').addEventListener('click', function () {
                    isPromptOpen = false;
                    document.getElementById('teleportModal').style.display = 'none';
                    this.blur();
                });
                document.getElementById('teleportOk').addEventListener('click', function () {
                    var x = parseFloat(document.getElementById('teleportX').value);
                    var y = parseFloat(document.getElementById('teleportY').value);
                    var z = parseFloat(document.getElementById('teleportZ').value);
                    if (isNaN(x) || isNaN(y) || isNaN(z)) {
                        addMessage('Invalid coordinates', 3000);
                        return;
                    }
                    respawnPlayer(x, y, z);
                    document.getElementById('teleportModal').style.display = 'none';
                    isPromptOpen = false;
                    this.blur();
                });
                document.getElementById('respawnBtn').addEventListener('click', function () {
                    respawnPlayer();
                    this.blur();
                });
                document.getElementById('acceptPending').addEventListener('click', function() {
                    acceptPendingOffers();
                    this.blur();
                });
                document.getElementById('closePending').addEventListener('click', function () {
                    document.getElementById('pendingModal').style.display = 'none';
                    pendingOffers = [];
                    updatePendingModal();
                    this.blur();
                });
                async function initWorldsAndUsers() {
                    console.log('[USERS] Initializing worlds and users');
                    var masterAddr = await GetPublicAddressByKeyword(MASTER_WORLD_KEY);
                    if (masterAddr) {
                        var messages = await GetPublicMessagesByAddress(masterAddr);
                        for (var msg of messages || []) {
                            if (msg.TransactionId && !processedMessages.has(msg.TransactionId)) {
                                console.log('[USERS] Processing message:', msg.TransactionId);
                                var fromProfile = await GetProfileByAddress(msg.FromAddress);
                                if (!fromProfile || !fromProfile.URN) {
                                    console.log('[USERS] Skipping message: No valid URN for address:', msg.FromAddress);
                                    continue;
                                }
                                var user = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                                var userProfile = await GetProfileByURN(user);
                                if (!userProfile || !userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                                    console.log('[USERS] Skipping message: Invalid profile for user:', user);
                                    continue;
                                }
                                var toKeywordRaw = await GetKeywordByPublicAddress(msg.ToAddress);
                                if (!toKeywordRaw) {
                                    console.log('[USERS] Skipping message: No keyword for address:', msg.ToAddress);
                                    continue;
                                }
                                var toKeyword = toKeywordRaw.replace(/^"|"$/g, '');
                                if (!toKeyword.includes('MCUserJoin@')) {
                                    console.log('[USERS] Skipping message: Invalid keyword:', toKeyword);
                                    continue;
                                }
                                var world = toKeyword.split('@')[1].replace(/[^a-zA-Z0-9]/g, '');
                                if (user && world) {
                                    console.log('[USERS] Adding user:', user, 'to world:', world);
                                    if (!knownWorlds.has(world)) {
                                        knownWorlds.set(world, { discoverer: user, users: new Set([user]), toAddress: msg.ToAddress });
                                    } else {
                                        knownWorlds.get(world).users.add(user);
                                    }
                                    if (!knownUsers.has(user)) knownUsers.set(user, msg.FromAddress);
                                    spawnChunks.set(user, { cx: null, cz: null, username: user, world: world });
                                    processedMessages.add(msg.TransactionId);
                                }
                            } else if (msg.TransactionId) {
                                console.log('[USERS] Skipping already processed message:', msg.TransactionId);
                            }
                        }
                        console.log('[USERS] Discovered worlds:', knownWorlds.size, 'and users:', knownUsers.size);
                    }
                }
                initWorldsAndUsers();
                updateLoginUI();
                setupEmojiPicker();

                var dropZone = document.getElementById('dropZone');

                dropZone.addEventListener('dragover', function(event) {
                    event.preventDefault();
                    dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                });

                dropZone.addEventListener('dragleave', function(event) {
                    event.preventDefault();
                    dropZone.style.backgroundColor = '';
                });

                dropZone.addEventListener('drop', function(event) {
                    event.preventDefault();
                    dropZone.style.backgroundColor = '';
                    var file = event.dataTransfer.files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function(e) {
                            try {
                                var sessionData = JSON.parse(e.target.result);
                                applySaveFile(sessionData, 'local', new Date().toISOString());
                            } catch (error) {
                                console.error('Error parsing session file:', error);
                                addMessage('Sorry, file malformed.', 3000);
                            }
                        };
                        reader.readAsText(file);
                    }
                });

                console.log('[SYSTEM] DOMContentLoaded completed, all listeners attached');
            } catch (error) {
                console.error('[SYSTEM] Error in DOMContentLoaded:', error);
                addMessage('Failed to initialize login system', 3000);
            }
        });

        function setupEmojiPicker() {
            const emojiBtn = document.getElementById('emojiBtn');
            const emojiBtnUser = document.getElementById('emojiBtnUser');
            const emojiModal = document.getElementById('emojiModal');
            const emojiGrid = document.getElementById('emojiGrid');
            const worldNameInput = document.getElementById('worldNameInput');
            const userInput = document.getElementById('userInput');
            let activeInput = null;

            const emojiCategories = {
                'Faces': ['😀', '😂', '😍', '🤔', '😎', '😭', '😡', '😱', '😇', '😈', '👻', '👽', '🤖'],
                'Objects': ['⭐', '💎', '🌳', '🏰', '⚔️', '🍕', '🎉', '🔥', '💧', '🌱', '🍄', '🍎', '🚬', '💣', '🔫', '🔑', '❤️'],
                'Animals': ['🐶', '🐱', '🐭', '🦊', '🐻', '🐼', '🐨', '🐵', '🦁', '🐸', '🐢', '🐍', '🦄', '🦅', '🦋'],
                'Travel': ['🌎', '🚀', '✈️', '🚗', '⛵️', '⛰️', '🏝️', '🏜️', '🏞️', '🏛️', '🏠', '⛺️']
            };

            emojiGrid.innerHTML = '';

            for (const category in emojiCategories) {
                const categoryHeader = document.createElement('div');
                categoryHeader.innerText = category;
                categoryHeader.style.gridColumn = '1 / -1';
                categoryHeader.style.fontWeight = 'bold';
                categoryHeader.style.marginTop = '10px';
                emojiGrid.appendChild(categoryHeader);

                emojiCategories[category].forEach(emoji => {
                    const emojiElement = document.createElement('div');
                    emojiElement.innerText = emoji;
                    emojiElement.style.cursor = 'pointer';
                    emojiElement.style.padding = '8px';
                    emojiElement.style.borderRadius = '4px';
                    emojiElement.style.textAlign = 'center';
                    emojiElement.style.fontSize = '24px';
                    emojiElement.onmouseover = () => emojiElement.style.background = '#1a2632';
                    emojiElement.onmouseout = () => emojiElement.style.background = 'transparent';
                    emojiElement.addEventListener('click', () => {
                        if (activeInput) {
                            activeInput.value += emoji;
                        }
                        emojiModal.style.display = 'none';
                    });
                    emojiGrid.appendChild(emojiElement);
                });
            }

            function openModal(inputElement) {
                activeInput = inputElement;
                emojiModal.style.display = 'flex';
            }

            emojiBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(worldNameInput);
            });

            emojiBtnUser.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(userInput);
            });

            emojiModal.addEventListener('click', (e) => {
                if (e.target === emojiModal) {
                    emojiModal.style.display = 'none';
                }
            });
        }
        function flashDamageEffect() {
            const flash = document.getElementById('damageFlash');
            flash.style.background = 'rgba(255, 0, 0, 0.5)';
            setTimeout(() => {
                flash.style.background = 'rgba(255, 0, 0, 0)';
            }, 100);
        }

        function cleanupPeer(username) {
            const peer = peers.get(username);
            if (peer) {
                if (peer.pc) peer.pc.close();
                peers.delete(username);
            }

            if (playerAvatars.has(username)) {
                const avatar = playerAvatars.get(username);
                scene.remove(avatar);
                disposeObject(avatar);
                playerAvatars.delete(username);
            }

            if (userAudioStreams.has(username)) {
                const audioStream = userAudioStreams.get(username);
                audioStream.audio.srcObject = null;
                audioStream.audio.remove();
                userAudioStreams.delete(username);
            }

            if (userVideoStreams.has(username)) {
                userVideoStreams.delete(username);
            }

            delete userPositions[username];

            addMessage(`${username} has disconnected.`);
            updateHudButtons();
            console.log(`[WebRTC] Cleaned up peer: ${username}`);
        }

        async function toggleCamera() {
            const cameraBtn = document.getElementById('cameraBtn');
            const proximityVideoContainer = document.getElementById('proximityVideo');
            const proximityVideoElement = document.getElementById('proximityVideoElement');
            const proximityVideoLabel = document.getElementById('proximityVideoLabel');

            if (localVideoStream) {
                // Turn off camera and hide video feed
                localVideoStream.getTracks().forEach(track => track.stop());
                localVideoStream = null;

                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerData.pc) {
                        const senders = peerData.pc.getSenders().filter(s => s.track && s.track.kind === 'video');
                        senders.forEach(sender => peerData.pc.removeTrack(sender));

                        // Renegotiate
                        const offer = await peerData.pc.createOffer();
                        await peerData.pc.setLocalDescription(offer);
                        if (peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'renegotiation_offer', offer: offer }));
                        }
                    }
                    if (peerData.dc && peerData.dc.readyState === 'open') {
                        peerData.dc.send(JSON.stringify({ type: 'video_stopped', username: userName }));
                    }
                }

                cameraBtn.style.opacity = '0.5';
                proximityVideoContainer.style.display = 'none';
                if (proximityVideoElement.srcObject) {
                    proximityVideoElement.srcObject = null;
                }
                addMessage('Camera disabled', 2000);
            } else {
                // Turn on camera and show local video feed
                try {
                    localVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });

                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerData.pc) {
                            localVideoStream.getTracks().forEach(track => peerData.pc.addTrack(track, localVideoStream));

                            // Renegotiate
                            const offer = await peerData.pc.createOffer();
                            await peerData.pc.setLocalDescription(offer);
                            if (peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(JSON.stringify({ type: 'renegotiation_offer', offer: offer }));
                            }
                        }
                        if (peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'video_started', username: userName }));
                        }
                    }

                    cameraBtn.style.opacity = '1';
                    proximityVideoElement.srcObject = localVideoStream;
                    proximityVideoLabel.innerText = userName;
                    proximityVideoContainer.style.display = 'block';
                    addMessage('Camera enabled', 2000);

                    // Reset proximity video display to show local user first
                    lastProximityVideoChangeTime = Date.now();
                    proximityVideoUsers = [userName, ...proximityVideoUsers.filter(u => u !== userName)];
                    currentProximityVideoIndex = 0;

                } catch (err) {
                    addMessage('Could not access camera', 3000);
                    console.error('Error accessing camera:', err);
                }
            }
        }

        async function initAudio() {
            try {
                localAudioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            } catch (error) {
                console.error("Error accessing microphone:", error);
                addMessage("Microphone access denied. Proximity chat will be disabled.", 5000);
            }
        }

        function animateAttack() {
            if (!isAttacking) {
                isAttacking = true;
                attackStartTime = performance.now();
            }
        }

        function updateProximityVideo() {
            const now = Date.now();
            const proximityVideoContainer = document.getElementById('proximityVideo');
            const proximityVideoElement = document.getElementById('proximityVideoElement');
            const proximityVideoLabel = document.getElementById('proximityVideoLabel');

            const localPlayerPos = new THREE.Vector3(player.x, player.y, player.z);

            const remoteUsersInProximity = [];
            for (const [username, videoStream] of userVideoStreams.entries()) {
                if (username === userName) continue;
                if (userPositions[username]) {
                    const userPos = userPositions[username];
                    const remotePlayerPos = new THREE.Vector3(userPos.targetX, userPos.targetY, userPos.targetZ);
                    if (localPlayerPos.distanceTo(remotePlayerPos) <= 32) {
                        remoteUsersInProximity.push(username);
                    }
                }
            }

            let usersToShow = [...remoteUsersInProximity];
            if (localVideoStream) {
                usersToShow.unshift(userName);
            }

            proximityVideoUsers = usersToShow;

            if (proximityVideoUsers.length === 0) {
                proximityVideoContainer.style.display = 'none';
                if (proximityVideoElement.srcObject) {
                    proximityVideoElement.srcObject = null;
                }
                currentProximityVideoIndex = 0;
                return;
            }

            proximityVideoContainer.style.display = 'block';

            if (currentProximityVideoIndex >= proximityVideoUsers.length) {
                currentProximityVideoIndex = 0;
            }

            const thirtySeconds = 30 * 1000;
            if (now - lastProximityVideoChangeTime > thirtySeconds) {
                lastProximityVideoChangeTime = now;
                currentProximityVideoIndex = (currentProximityVideoIndex + 1) % proximityVideoUsers.length;
            }

            const currentUser = proximityVideoUsers[currentProximityVideoIndex];
            const currentStream = (currentUser === userName) ? localVideoStream : userVideoStreams.get(currentUser)?.stream;

            if (proximityVideoElement.srcObject !== currentStream) {
                proximityVideoLabel.innerText = currentUser;
                proximityVideoElement.srcObject = currentStream;
            }
        }

        function switchWorld() {
            worldArchetype = null;
            const newWorldName = prompt("Enter the name of the world to switch to:");
            if (!newWorldName || newWorldName.trim() === "") {
                addMessage("World name cannot be empty.", 3000);
                return;
            }

            // Reset game state
            worldName = newWorldName.slice(0, 8);
            worldSeed = worldName;
            chunkManager.chunks.clear();
            meshGroup.children.forEach(disposeObject);
            meshGroup.children = [];
            foreignBlockOrigins.clear();
            CHUNK_DELTAS.clear();
            mobs.forEach(m => scene.remove(m.mesh));
            mobs = [];

            // Clear old sky elements before re-initializing
            if (skyProps) {
                skyProps.suns.forEach(sun => scene.remove(sun.mesh));
                skyProps.moons.forEach(moon => scene.remove(moon.mesh));
            }
            if (stars) scene.remove(stars);
            if (clouds) scene.remove(clouds);


            // Re-initialize world
            document.getElementById('worldLabel').textContent = worldName;
            const userWorldKey = userName + '@' + worldName;
            const spawn = calculateSpawnPoint(userWorldKey);
            player.x = spawn.x;
            player.y = spawn.y;
            player.z = spawn.z;
            spawnPoint = { x: player.x, y: player.y, z: player.z };

            // Re-create the chunk manager for the new world
            chunkManager = new ChunkManager(worldSeed);

            // Re-initialize the sky with the new world's seed
            initSky();

            // Initial chunk loading
            const spawnCx = Math.floor(spawn.x / CHUNK_SIZE);
            const spawnCz = Math.floor(spawn.z / CHUNK_SIZE);
            chunkManager.preloadChunks(spawnCx, spawnCz, LOAD_RADIUS);

            addMessage(`Switched to world: ${worldName}`, 4000);
        }

        function animateRemoteFall(avatar) {
            const fallDuration = 1000; // 1 second
            const startRotation = avatar.rotation.clone();
            const endRotation = new THREE.Euler(Math.PI / 2, startRotation.y, startRotation.z);

            let startTime = null;

            function animateFall(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min(1, (timestamp - startTime) / fallDuration);

                avatar.rotation.x = startRotation.x + (endRotation.x - startRotation.x) * progress;

                if (progress < 1) {
                    requestAnimationFrame(animateFall);
                }
            }
            requestAnimationFrame(animateFall);
        }

        function updateAvatarAnimation(now, isMoving) {
            if (!avatarGroup) return;

            const walkSpeed = 0.005;
            const walkAmplitude = 0.5;
            const attackSpeed = 0.01;
            const attackAmplitude = 1.5;
            const attackDuration = 500;

            if (isAttacking) {
                const elapsedTime = now - attackStartTime;
                if (elapsedTime < attackDuration) {
                    const angle = Math.sin((elapsedTime / attackDuration) * Math.PI) * attackAmplitude;
                    avatarGroup.children[4].rotation.x = angle; // left arm
                    avatarGroup.children[5].rotation.x = angle; // right arm
                } else {
                    isAttacking = false;
                    avatarGroup.children[4].rotation.x = 0;
                    avatarGroup.children[5].rotation.x = 0;
                }
            } else if (isMoving) {
                const angle = Math.sin(now * walkSpeed) * walkAmplitude;
                avatarGroup.children[0].rotation.x = angle; // left leg
                avatarGroup.children[1].rotation.x = -angle; // right leg
                avatarGroup.children[4].rotation.x = -angle; // left arm
                avatarGroup.children[5].rotation.x = angle; // right arm
            } else {
                avatarGroup.children[0].rotation.x = 0;
                avatarGroup.children[1].rotation.x = 0;
                avatarGroup.children[4].rotation.x = 0;
                avatarGroup.children[5].rotation.x = 0;
            }
        }

        function initMinimap() {
            var canvas = document.getElementById('minimap');
            minimapCtx = canvas.getContext('2d');
            canvas.width = 120;
            canvas.height = 120;
            updateMinimap();
            // Create hidden file input for double-click upload
            var fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            // Double-click handler to trigger file selection
            canvas.addEventListener('dblclick', function () {
                console.log('[MINIMAP] Double-click detected, triggering file upload');
                fileInput.click();
            });
            // Drag-and-drop handlers
            canvas.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvas.style.border = '2px dashed var(--accent)';
            });
            canvas.addEventListener('dragleave', function () {
                canvas.style.border = '1px solid rgba(255,255,255,0.1)';
            });
            canvas.addEventListener('drop', async function (e) {
                e.preventDefault();
                canvas.style.border = '1px solid rgba(255,255,255,0.1)';
                const files = e.dataTransfer.files;
                for (const file of files) {
                    if (file && file.type === 'application/json') {
                        console.log('[MINIMAP] File dropped:', file.name);
                        await handleMinimapFile(file);
                    } else {
                        addMessage('Skipped non-JSON file: ' + (file ? file.name : 'unknown'), 3000);
                        console.log('[MINIMAP] Invalid file dropped:', file ? file.type : 'no file');
                    }
                }
            });
            // File input change handler
            fileInput.addEventListener('change', async function () {
                if (fileInput.files.length > 0) {
                    for (const file of fileInput.files) {
                        console.log('[MINIMAP] File selected via double-click:', file.name);
                        await handleMinimapFile(file);
                    }
                    fileInput.value = ''; // Reset input
                }
            });
            console.log('[MINIMAP] Events attached: double-click and drag-and-drop enabled');
        }
        function gameLoop(now) {
            if (isDying) {
                const fallDuration = 1500; // 1.5 seconds for a more dramatic fall
                const sinkDuration = 1000; // 1 second to sink
                const totalDuration = fallDuration + sinkDuration;
                const elapsedTime = now - deathAnimationStart;
                const progress = Math.min(1.0, elapsedTime / totalDuration);

                // Animate Fall (first part of the animation)
                if (elapsedTime < fallDuration) {
                    const fallProgress = elapsedTime / fallDuration;
                    avatarGroup.rotation.x = (Math.PI / 2) * fallProgress;
                } else {
                     avatarGroup.rotation.x = Math.PI / 2; // Ensure it's fully fallen
                }

                // Animate Sink (second part of the animation)
                if (elapsedTime > fallDuration) {
                    const sinkProgress = (elapsedTime - fallDuration) / sinkDuration;
                    avatarGroup.position.y -= 0.05 * sinkProgress; // Sink into the ground
                }


                if (progress >= 1.0) {
                    isDying = false;
                    deathScreenShown = true;
                    document.getElementById('deathScreen').style.display = 'flex';
                }

                renderer.render(scene, camera);
                requestAnimationFrame(gameLoop);
                return; // Stop the rest of the game loop
            }

            var dt = Math.min(0.06, (now - lastFrame) / 1000);
            lastFrame = now;
            if (player.health <= 0 && !isDying) {
                handlePlayerDeath();
            }
            if (deathScreenShown) {
                mobs.forEach(function (m) { m.update(dt); });
                updateSky(dt);
                updateMinimap();
                var scoreElement = document.getElementById('score');
                if (scoreElement) scoreElement.innerText = player.score;
                renderer.render(scene, camera);
            } else {
                var speed = isSprinting ? 4.3 * 3 : 4.3;
                var mvx = 0, mvz = 0;
                if (isMobile()) {
                    if (joystick.up) mvz -= 1;
                    if (joystick.down) mvz += 1;
                    if (joystick.left) mvx -= 1;
                    if (joystick.right) mvx += 1;
                } else {
                    if (keys['w']) mvz += 1;
                    if (keys['s']) mvz -= 1;
                    if (keys['a']) mvx -= 1;
                    if (keys['d']) mvx += 1;

                    if (mvz <= 0 && isSprinting) {
                        isSprinting = false;
                        addMessage('Sprinting disabled', 1500);
                    }

                    if (cameraMode === 'first') {
                        // Arrow key camera controls for first person
                        if (keys['arrowup']) player.pitch += 0.02;
                        if (keys['arrowdown']) player.pitch -= 0.02;
                        if (keys['arrowleft']) player.yaw += 0.02;
                        if (keys['arrowright']) player.yaw -= 0.02;
                        player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
                        camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
                    }
                }
                var forwardDir, rightDir;
                if (cameraMode === 'first') {
                    forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0, 'YXZ'));
                } else { // third-person
                    forwardDir = new THREE.Vector3();
                    camera.getWorldDirection(forwardDir);
                }
                forwardDir.y = 0;
                forwardDir.normalize();
                rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0));

                var moveVec = new THREE.Vector3();
                moveVec.addScaledVector(forwardDir, mvz);
                moveVec.addScaledVector(rightDir, mvx);

                const isMoving = moveVec.length() > 0.001;
                if (isMoving) {
                    moveVec.normalize();
                    if (cameraMode === 'third') {
                        player.yaw = Math.atan2(moveVec.x, moveVec.z);
                    }
                }
                var dx = moveVec.x * speed * dt;
                var dz = moveVec.z * speed * dt;

                // Combine user input with knockback velocity
                dx += player.vx * dt;
                dz += player.vz * dt;

                // Apply friction to knockback velocity
                player.vx *= (1 - 2 * dt);
                player.vz *= (1 - 2 * dt);

                // Apply X-axis movement and check for collision
                let potentialX = player.x + dx;
                if (!checkCollision(potentialX, player.y, player.z)) {
                    player.x = potentialX;
                } else {
                    player.vx = 0; // Stop velocity on collision
                }

                // Apply Z-axis movement and check for collision
                let potentialZ = player.z + dz;
                if (!checkCollision(player.x, player.y, potentialZ)) { // Use the (potentially updated) player.x
                    player.z = potentialZ;
                } else {
                    player.vz = 0; // Stop velocity on collision
                }

                player.x = modWrap(player.x, MAP_SIZE);
                player.z = modWrap(player.z, MAP_SIZE);

                player.vy -= gravity * dt;
                var dy = player.vy * dt;
                var newY = player.y + dy;
                if (!checkCollision(player.x, newY, player.z)) {
                    player.y = newY;
                    player.onGround = false;
                } else {
                    if (dy < 0) {
                        player.y = Math.ceil(newY - 0.001);
                        player.vy = 0;
                        player.onGround = true;
                    } else if (dy > 0) {
                        player.y = Math.floor(newY + player.height) - player.height;
                        player.vy = 0;
                    }
                }
                if (checkCollision(player.x, player.y, player.z)) {
                    if (!pushPlayerOut()) {
                        player.y = chunkManager.getSurfaceY(player.x, player.z) + 1;
                        player.vy = 0;
                        player.onGround = true;
                        addMessage('Stuck in block, respawned');
                    }
                }

                    // Grub contact damage
                    for (const mob of mobs) {
                        if (mob.type === 'grub' && Date.now() - lastDamageTime > 1000) {
                            const playerBox = new THREE.Box3().setFromCenterAndSize(
                                new THREE.Vector3(player.x + player.width / 2, player.y + player.height / 2, player.z + player.depth / 2),
                                new THREE.Vector3(player.width, player.height, player.depth)
                            );
                            const grubBox = new THREE.Box3().setFromObject(mob.mesh);
                            if (playerBox.intersectsBox(grubBox)) {
                                player.health = Math.max(0, player.health - 2);
                                lastDamageTime = Date.now();
                                document.getElementById('health').innerText = player.health;
                                updateHealthBar();
                                addMessage('Hit by a Grub! HP: ' + player.health, 1000);
                                flashDamageEffect();
                                if (player.health <= 0) {
                                    handlePlayerDeath();
                                }
                            }
                        }
                    }
                if (player.y < -10) {
                    player.x = modWrap(player.x, MAP_SIZE);
                    player.z = modWrap(player.z, MAP_SIZE);
                    player.y = chunkManager.getSurfaceY(player.x, player.z) + 1;
                    player.vy = 0;
                    player.onGround = true;
                    addMessage('Fell off world, respawned');
                }

                // Lava damage
                if (isHost || peers.size === 0) {
                    const playerBlockId = getBlockAt(player.x, player.y + 0.5, player.z); // Check at feet level
                    if (playerBlockId === 16 && now - lastDamageTime > 500) { // Using lastDamageTime now
                        player.health = Math.max(0, player.health - 1);
                        lastDamageTime = now; // Use the general damage timer
                        document.getElementById('health').innerText = player.health;
                        updateHealthBar();
                        addMessage('Burning in lava! HP: ' + player.health, 1000);
                        flashDamageEffect();
                        if (player.health <= 0) {
                            handlePlayerDeath();
                        }
                    }
                }

                if (isHost) {
                    for (const [username, peerData] of peers.entries()) {
                        if (userPositions[username]) {
                            const userPos = userPositions[username];
                            const playerBlockId = getBlockAt(userPos.targetX, userPos.targetY + 0.5, userPos.targetZ);
                            if (playerBlockId === 16) {
                                if (!peerData.lastLavaDamageTime || now - peerData.lastLavaDamageTime > 500) {
                                    peerData.lastLavaDamageTime = now;
                                    if (peerData.dc && peerData.dc.readyState === 'open') {
                                        peerData.dc.send(JSON.stringify({ type: 'player_damage', damage: 1, attacker: 'lava' }));
                                    }
                                }
                            }
                        }
                    }
                }

                if (Date.now() - lastDamageTime > 30000 && Date.now() - lastRegenTime > 10000 && player.health < 20) {
                    player.health = Math.min(20, player.health + 1);
                    lastRegenTime = Date.now();
                    var healthElement = document.getElementById('health');
                    if (healthElement) healthElement.innerText = player.health;
                    updateHealthBar();
                    addMessage('Health regenerated: ' + player.health, 1000);
                }
                var distFromSpawn = Math.hypot(player.x - spawnPoint.x, player.z - spawnPoint.z);
                document.getElementById('homeIcon').style.display = distFromSpawn > 10 ? 'inline' : 'none';
                avatarGroup.position.set(player.x + player.width / 2, player.y, player.z + player.depth / 2);
                if (cameraMode === 'third') {
                    avatarGroup.rotation.y = player.yaw;
                } else { // first person
                    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
                }
                updateAvatarAnimation(now, isMoving);
                chunkManager.update(player.x, player.z, moveVec);
                lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
                mobs.forEach(function (m) { m.update(dt); });
                manageMobs();
                manageVolcanoes();
                updateSky(dt);

                // Make skybox elements follow the camera
                if (stars) stars.position.copy(camera.position);
                if (clouds) clouds.position.copy(camera.position);

                for (const [key, particleSystem] of torchParticles.entries()) {
                    const positions = particleSystem.geometry.attributes.position.array;
                    const velocities = particleSystem.geometry.velocities;

                    for (let i = 0; i < velocities.length; i++) {
                        positions[i * 3] += velocities[i].x;
                        positions[i * 3 + 1] += velocities[i].y;
                        positions[i * 3 + 2] += velocities[i].z;

                        velocities[i].life -= dt;

                        if (velocities[i].life <= 0) {
                            positions[i * 3] = particleSystem.position.x;
                            positions[i * 3 + 1] = particleSystem.position.y;
                            positions[i * 3 + 2] = particleSystem.position.z;
                            velocities[i].life = Math.random() * 1;
                        }
                    }
                    particleSystem.geometry.attributes.position.needsUpdate = true;
                }

                for (const smokeSystem of smokeParticles) {
                    const hasAlpha = smokeSystem.geometry.attributes.alpha;
                    const hasPosition = smokeSystem.geometry.attributes.position;
                    const hasColor = smokeSystem.geometry.attributes.color;

                    if (!hasAlpha || !hasPosition) {
                        console.warn('[Volcano] Smoke particle system is missing attributes, skipping animation.');
                        continue;
                    }

                    const positions = hasPosition.array;
                    const alphas = hasAlpha.array;
                    const velocities = smokeSystem.geometry.velocities;
                    const isEruptionSmoke = !!hasColor;

                    for (let i = 0; i < velocities.length; i++) {
                        velocities[i].life -= dt;

                        if (velocities[i].life > 0) {
                            positions[i * 3] += velocities[i].x * dt;
                            positions[i * 3 + 1] += velocities[i].y * dt;
                            positions[i * 3 + 2] += velocities[i].z * dt;
                            const maxLife = isEruptionSmoke ? 10 : 7;
                            const lifeRatio = velocities[i].life / maxLife;
                            alphas[i] = Math.min(1, lifeRatio);
                        } else {
                            if (isEruptionSmoke) {
                                // Eruption smoke particles fade and die
                                alphas[i] = 0;
                            } else {
                                // Caldera smoke particles respawn at the bottom
                                const volcano = volcanoes.find(v => v.chunkKey === smokeSystem.userData.chunkKey);
                                if (volcano) {
                                    positions[i * 3] = volcano.x + (Math.random() - 0.5) * 10;
                                    positions[i * 3 + 1] = volcano.y + (Math.random() - 0.5) * 5;
                                    positions[i * 3 + 2] = volcano.z + (Math.random() - 0.5) * 10;
                                    velocities[i].life = 3 + Math.random() * 4;
                                    alphas[i] = 1.0;
                                } else {
                                    // If volcano not found, just let it die
                                    alphas[i] = 0;
                                }
                            }
                        }
                    }

                    hasPosition.needsUpdate = true;
                    hasAlpha.needsUpdate = true;
                    if (hasColor) {
                        hasColor.needsUpdate = true;
                    }
                }

                // Cleanup smoke particles
                for (let i = smokeParticles.length - 1; i >= 0; i--) {
                    const smokeSystem = smokeParticles[i];
                    if (smokeSystem.createdAt && Date.now() - smokeSystem.createdAt > 20000) { // 20-second lifespan for eruption smoke
                        scene.remove(smokeSystem);
                        disposeObject(smokeSystem);
                        smokeParticles.splice(i, 1);
                    }
                }

                updateMinimap();
                var posLabel = document.getElementById('posLabel');
                if (posLabel) posLabel.innerText = Math.floor(player.x) + ', ' + Math.floor(player.y) + ', ' + Math.floor(player.z);
                if (cameraMode === 'third') {
                    controls.target.set(player.x + player.width / 2, player.y + 0.6, player.z + player.depth / 2);
                    controls.update();
                } else {
                    var headPos = new THREE.Vector3(player.x + player.width / 2, player.y + 1.62, player.z + player.depth / 2);
                    camera.position.copy(headPos);
                }
                const positionChanged = Math.hypot(player.x - lastSentPosition.x, player.y - lastSentPosition.y, player.z - lastSentPosition.z) > 0.1;
                const rotationChanged = Math.abs(player.yaw - lastSentPosition.yaw) > 0.01 || Math.abs(player.pitch - lastSentPosition.pitch) > 0.01;

                if (now - lastUpdateTime > 50 && (positionChanged || rotationChanged)) {
                    if (isSprinting && !previousIsSprinting) {
                        sprintStartPosition.set(player.x, player.y, player.z);
                        currentLoadRadius = LOAD_RADIUS;
                    } else if (!isSprinting && previousIsSprinting) {
                        if (new THREE.Vector3(player.x, player.y, player.z).distanceTo(sprintStartPosition) > 100) {
                            currentLoadRadius = INITIAL_LOAD_RADIUS;
                        }
                    }
                    previousIsSprinting = isSprinting;
                    lastUpdateTime = now;
                    lastMoveTime = now;
                    lastSentPosition = { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch };
                    const message = {
                        type: 'player_move',
                        username: userName,
                        x: player.x, y: player.y, z: player.z,
                        yaw: player.yaw, pitch: player.pitch,
                        isMoving: isMoving, isAttacking: isAttacking,
                        timestamp: Date.now()
                    };
                    // Client sends its own movement to the host
                    if (!isHost) {
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(JSON.stringify(message));
                            }
                        }
                    }
                }

                // Host broadcasts the authoritative state of all players
                if (isHost && now - lastStateUpdateTime > 100) {
                    lastStateUpdateTime = now;
                    const playersData = [];
                    // Add host's state
                    playersData.push({
                        username: userName,
                        x: player.x, y: player.y, z: player.z,
                        yaw: player.yaw, pitch: player.pitch,
                        isMoving: isMoving, isAttacking: isAttacking,
                        attackStartTime: attackStartTime,
                        health: player.health
                    });
                    // Add clients' states
                    for (const [username, positionData] of Object.entries(userPositions)) {
                        if (peers.has(username)) { // Ensure the user is still connected
                            // Host checks if the attack animation should end
                            if (positionData.isAttacking && now - positionData.attackStartTime > 500) {
                                positionData.isAttacking = false;
                            }
                            playersData.push({
                                username: username,
                                x: positionData.targetX, y: positionData.targetY, z: positionData.targetZ,
                                yaw: positionData.targetYaw, pitch: positionData.targetPitch,
                                isMoving: positionData.isMoving, isAttacking: positionData.isAttacking,
                                attackStartTime: positionData.attackStartTime,
                                health: positionData.health
                            });
                        }
                    }

                    const stateUpdateMessage = {
                        type: 'state_update',
                        timestamp: Date.now(),
                        players: playersData
                    };

                    const messageString = JSON.stringify(stateUpdateMessage);
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(messageString);
                        }
                    }
                }

                if (isHost && now - lastMobBatchTime > 100) {
                    lastMobBatchTime = now;
                    const mobStates = mobs.map(mob => ({
                        id: mob.id,
                        x: mob.pos.x,
                        y: mob.pos.y,
                        z: mob.pos.z,
                        hp: mob.hp,
                        type: mob.type,
                        isAggressive: mob.isAggressive,
                        isMoving: mob.isMoving,
                        aiState: mob.aiState,
                        quaternion: mob.mesh.quaternion.toArray(),
                    }));

                    const batchMessage = JSON.stringify({
                        type: 'mob_state_batch',
                        mobs: mobStates
                    });

                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(batchMessage);
                        }
                    }
                }

                for (var entry of playerAvatars) {
                    var username = entry[0];
                    var avatar = entry[1];
                    if (username !== userName && userPositions[username]) {
                        const userState = userPositions[username];

                        // Skip position updates if the player is in a death animation
                        if (userState.isDying) {
                            // The animation logic below will handle the position
                        } else if (userState.prevX !== undefined) {
                            const now = performance.now();
                            const timeSinceUpdate = now - userState.lastUpdate;
                            const interpolationDelay = 100; // ms
                            const alpha = Math.min(1.0, timeSinceUpdate / interpolationDelay);

                            const interpolatedPosition = new THREE.Vector3(
                                userState.prevX + (userState.targetX - userState.prevX) * alpha,
                                userState.prevY + (userState.targetY - userState.prevY) * alpha,
                                userState.prevZ + (userState.targetZ - userState.prevZ) * alpha
                            );
                            avatar.position.copy(interpolatedPosition);

                            // Interpolate rotation using quaternions for smooth slerp
                            const prevQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, userState.prevYaw, 0, 'YXZ'));
                            const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, userState.targetYaw, 0, 'YXZ'));
                            avatar.quaternion.slerpQuaternions(prevQuaternion, targetQuaternion, alpha);

                            // Interpolate pitch for head separately
                            if (userState.prevPitch !== undefined) {
                                const interpolatedPitch = userState.prevPitch + (userState.targetPitch - userState.prevPitch) * alpha;
                                avatar.children[3].rotation.set(interpolatedPitch, 0, 0);
                            } else {
                                avatar.children[3].rotation.set(userState.targetPitch, 0, 0);
                            }

                        } else if (userState.targetX !== undefined) {
                            // If no previous state, just jump to target
                            avatar.position.set(userState.targetX, userState.targetY - 0.9, userState.targetZ);
                            avatar.rotation.set(userState.targetPitch, userState.targetYaw, 0, 'YXZ');
                        }


                        const now = performance.now();
                        // The isAttacking flag is now authoritatively set by the host.
                        // The client just needs to play the animation if the flag is true.
                        if (userState.isAttacking && userState.localAnimStartTime) {
                            const elapsedTime = now - userState.localAnimStartTime;
                            const attackDuration = 500; // Animation plays for 500ms
                            if (elapsedTime < attackDuration) {
                                const angle = Math.sin((elapsedTime / attackDuration) * Math.PI) * 1.5;
                                avatar.children[4].rotation.x = angle; // left arm
                                avatar.children[5].rotation.x = angle; // right arm
                            } else {
                                // Animation is over, but we let the host reset the isAttacking flag.
                                // This prevents the animation from re-triggering until the next state_update.
                                userState.localAnimStartTime = null;
                            }
                        } else if (userState.isMoving) {
                            const angle = Math.sin(now * 0.005) * 0.5;
                            avatar.children[0].rotation.x = angle; // left leg
                            avatar.children[1].rotation.x = -angle; // right leg
                            avatar.children[4].rotation.x = -angle; // left arm
                            avatar.children[5].rotation.x = angle; // right arm
                        } else {
                            avatar.children[0].rotation.x = 0;
                            avatar.children[1].rotation.x = 0;
                            avatar.children[4].rotation.x = 0;
                            avatar.children[5].rotation.x = 0;
                        }

                        // Handle remote player death animation
                        if (userState.isDying) {
                            const fallDuration = 1500;
                            const sinkDuration = 1000;
                            const totalDuration = fallDuration + sinkDuration;
                            const elapsedTime = now - userState.deathAnimationStart;
                            const progress = Math.min(1.0, elapsedTime / totalDuration);

                            if (elapsedTime < fallDuration) {
                                const fallProgress = elapsedTime / fallDuration;
                                avatar.rotation.x = (Math.PI / 2) * fallProgress;
                            } else {
                                avatar.rotation.x = Math.PI / 2;
                            }
                            if (elapsedTime > fallDuration) {
                                const sinkProgress = (elapsedTime - fallDuration) / sinkDuration;
                                avatar.position.y -= 0.05 * sinkProgress;
                            }
                            if (progress >= 1.0) {
                                userState.isDying = false; // Animation finished, body remains.
                            }
                        } else {
                            avatar.visible = Math.hypot(player.x - avatar.position.x, player.z - avatar.position.z) < 32;
                        }
                    }
                }

                for (const [username, audioStream] of userAudioStreams.entries()) {
                    if (userPositions[username]) {
                        const userPos = userPositions[username];
                        const dist = Math.hypot(player.x - userPos.targetX, player.y - userPos.targetY, player.z - userPos.targetZ);
                        let volume = 0;
                        if (dist < maxAudioDistance) {
                            volume = Math.max(0, 1 - (dist / maxAudioDistance));
                            volume = Math.pow(volume, rolloffFactor);
                        }
                        audioStream.audio.volume = volume;
                    }
                }

                // Update eruption sound volumes
                for (const eruption of activeEruptions) {
                    const sound = document.getElementById(eruption.soundId);
                    if (sound) { // Check if sound element exists
                        const dist = Math.hypot(player.x - eruption.volcano.x, player.y - eruption.volcano.y, player.z - eruption.volcano.z);
                        const maxDist = 192; // 64 * 3
                        if (dist < maxDist) {
                            sound.volume = Math.max(0, 1 - (dist / maxDist));
                        } else {
                            sound.volume = 0;
                        }
                    }
                }

                updateProximityVideo();

                if (lastPollPosition.distanceTo(player) > CHUNK_SIZE) {
                    hasMovedSubstantially = true;
                }

                if (isMoving) {
                    lastMoveTime = now;
                }

                if (hasMovedSubstantially && now - lastMoveTime > 10000) {
                    triggerPoll();
                    lastPollPosition.copy(player);
                    hasMovedSubstantially = false;
                }

                // Update erupted blocks
                for (let i = eruptedBlocks.length - 1; i >= 0; i--) {
                    const block = eruptedBlocks[i];

                    if (isHost || peers.size === 0) {
                        // Host calculates physics
                        if (block.type === 'boulder') {
                            block.velocity.y -= gravity * dt;
                            block.mesh.position.add(block.velocity.clone().multiplyScalar(dt));

                            const groundY = chunkManager.getSurfaceYForBoulders(block.mesh.position.x, block.mesh.position.z) + block.size / 2;
                            if (block.mesh.position.y <= groundY) {
                                block.mesh.position.y = groundY;
                                if (block.mass === 2 && !block.isRolling) { // Medium boulder rolls
                                    block.isRolling = true;
                                    block.velocity.y = 0;
                                    block.velocity.x *= 0.8;
                                    block.velocity.z *= 0.8;
                                } else {
                                    block.velocity.set(0, 0, 0);
                                }
                            }

                            if (block.isRolling) {
                                block.mesh.rotation.x += block.velocity.z * dt * 2;
                                block.mesh.rotation.z -= block.velocity.x * dt * 2;
                                block.velocity.multiplyScalar(1 - (0.5 * dt));
                                if (block.velocity.length() < 0.1) block.isRolling = false;
                            }

                             if (block.mass === 4) { // Large boulder damage
                                const playerBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(player.x + player.width / 2, player.y + player.height / 2, player.z + player.depth / 2), new THREE.Vector3(player.width, player.height, player.depth));
                                const boulderBox = new THREE.Box3().setFromObject(block.mesh);
                                if (playerBox.intersectsBox(boulderBox) && now - lastDamageTime > 1000) {
                                    player.health = Math.max(0, player.health - 10);
                                    lastDamageTime = now;
                                    document.getElementById('health').innerText = player.health;
                                    updateHealthBar();
                                    addMessage('Hit by a boulder! -10 HP', 2000);
                                    flashDamageEffect();
                                    if (player.health <= 0) handlePlayerDeath();
                                }
                            }

                        } else { // Lava block physics
                             block.velocity.y -= gravity * dt;
                             block.mesh.position.add(block.velocity.clone().multiplyScalar(dt));
                        }

                    } else {
                        // Client interpolates
                        if (block.type === 'boulder' && block.lastUpdate > 0) {
                            const timeSinceUpdate = now - block.lastUpdate;
                            const alpha = Math.min(1.0, timeSinceUpdate / 100); // 100ms interpolation time
                            block.mesh.position.lerp(block.targetPosition, alpha);
                            block.mesh.quaternion.slerp(block.targetQuaternion, alpha);
                        } else if (block.type !== 'boulder'){
                             // Client-side prediction for non-boulder projectiles for smoother visuals
                             block.velocity.y -= gravity * dt;
                             block.mesh.position.add(block.velocity.clone().multiplyScalar(dt));
                        }
                    }

                    // Cleanup logic for all clients
                    if (block.mesh.position.y < -10 || Date.now() - block.createdAt > 15000) {
                        scene.remove(block.mesh);
                        disposeObject(block.mesh);
                        eruptedBlocks.splice(i, 1);
                    }
                }

                // Host broadcasts boulder states
                if ((isHost || peers.size === 0) && now - (lastStateUpdateTime || 0) > 100) {
                    const boulderStates = eruptedBlocks
                        .filter(b => b.type === 'boulder')
                        .map(b => ({
                            id: b.id,
                            position: b.mesh.position.toArray(),
                            quaternion: b.mesh.quaternion.toArray()
                        }));

                    if (boulderStates.length > 0) {
                        const boulderUpdateMessage = { type: 'boulder_update', boulders: boulderStates };
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(JSON.stringify(boulderUpdateMessage));
                            }
                        }
                    }
                }


                // Update pebbles
                for (let i = pebbles.length - 1; i >= 0; i--) {
                    const pebble = pebbles[i];
                    pebble.mesh.position.add(pebble.velocity.clone().multiplyScalar(dt));

                    const groundY = chunkManager.getSurfaceY(pebble.mesh.position.x, pebble.mesh.position.z);
                    if (pebble.mesh.position.y <= groundY) {
                        if (pebble.isGlowing) {
                            setTimeout(() => {
                                scene.remove(pebble.mesh);
                                disposeObject(pebble.mesh);
                            }, 500); // Glowing pebbles disappear after 0.5s
                        } else {
                            scene.remove(pebble.mesh);
                            disposeObject(pebble.mesh);
                        }
                        pebbles.splice(i, 1);
                    }
                }
                // Dropped item physics and pickup
                for (let i = droppedItems.length - 1; i >= 0; i--) {
                    const item = droppedItems[i];

                    // Simple gravity
                    const groundY = chunkManager.getSurfaceY(item.mesh.position.x, item.mesh.position.z);
                    if (item.mesh.position.y > groundY + 0.25) {
                        item.mesh.position.y -= 4 * dt;
                    } else {
                        item.mesh.position.y = groundY + 0.25;
                    }
                    item.light.position.copy(item.mesh.position);

                    // Despawn after 5 minutes
                    if (Date.now() - item.createdAt > 300000) {
                        scene.remove(item.mesh);
                        scene.remove(item.light);
                        droppedItems.splice(i, 1);
                        continue;
                    }

                    // Pickup logic
                    const distToPlayer = item.mesh.position.distanceTo(new THREE.Vector3(player.x, player.y + 0.9, player.z));
                    if (distToPlayer < 1.5) {
                        // If the item was dropped by the current player, check for a 2-second cooldown
                        if (item.dropper === userName && Date.now() - item.createdAt < 2000) {
                            continue; // Skip pickup for this item
                        }

                        addToInventory(item.blockId, 1, item.originSeed);

                        scene.remove(item.mesh);
                        scene.remove(item.light);
                        droppedItems.splice(i, 1);

                        // Broadcast pickup
                        const message = JSON.stringify({
                            type: 'item_picked_up',
                            dropId: item.id
                        });
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(message);
                            }
                        }
                    }
                }

                // Process laser queue
                if (laserQueue.length > 0) {
                    const data = laserQueue.shift();
                    if (data.user !== userName) {
                        createProjectile(data.id, data.user, new THREE.Vector3(data.position.x, data.position.y, data.position.z), new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z), data.color);
                    }
                }
                // Update projectiles
                for (let i = projectiles.length - 1; i >= 0; i--) {
                    const p = projectiles[i];
                    p.mesh.position.x += p.velocity.x * dt;
                    p.mesh.position.y += p.velocity.y * dt;
                    p.mesh.position.z += p.velocity.z * dt;
                    p.light.position.copy(p.mesh.position);

                    const wx = Math.floor(p.mesh.position.x);
                    const wy = Math.floor(p.mesh.position.y);
                    const wz = Math.floor(p.mesh.position.z);

                    if (isSolid(getBlockAt(wx, wy, wz))) {
                        removeBlockAt(wx, wy, wz); // Laser breaks blocks
                        scene.remove(p.mesh);
                        scene.remove(p.light);
                        projectiles.splice(i, 1);
                        continue;
                    }

                    let hitMob = false;
                    for (const mob of mobs) {
                        if (p.mesh.position.distanceTo(mob.pos) < 1) {
                            const damage = p.isGreen ? 10 : 5;
                            if (isHost || peers.size === 0) {
                                mob.hurt(damage, p.user);
                            } else {
                                // Client sends hit notification to host
                                for (const [peerUser, peerData] of peers.entries()) {
                                    if (peerData.dc && peerData.dc.readyState === 'open') {
                                        peerData.dc.send(JSON.stringify({
                                            type: 'mob_hit',
                                            id: mob.id,
                                            damage: damage,
                                            username: p.user
                                        }));
                                    }
                                }
                            }
                            scene.remove(p.mesh);
                            scene.remove(p.light);
                            projectiles.splice(i, 1);
                            hitMob = true;
                            break;
                        }
                    }
                    if (hitMob) continue;

                    // Player hit detection
                    if (p.user !== userName) { // projectile is from another player
                        const myPlayerPos = new THREE.Vector3(player.x, player.y + player.height / 2, player.z);
                        if (p.mesh.position.distanceTo(myPlayerPos) < 1.5) {
                            // I've been hit!
                            const damage = p.isGreen ? 10 : 5;
                            player.health -= damage;

                            // Update UI
                            document.getElementById('health').innerText = player.health;
                            updateHealthBar();
                            addMessage('Hit by ' + p.user + '! HP: ' + player.health, 1000);
                            flashDamageEffect();
                            safePlayAudio(soundHit);

                            // report to host
                            const message = JSON.stringify({ type: 'health_update', username: userName, health: player.health });
                            for (const [, peerData] of peers.entries()) {
                                if (peerData.dc && peerData.dc.readyState === 'open') peerData.dc.send(message);
                            }

                            if (player.health <= 0) {
                                handlePlayerDeath();
                            }

                            // remove projectile
                            scene.remove(p.mesh);
                            scene.remove(p.light);
                            projectiles.splice(i, 1);
                            continue;
                        }
                    }


                    if (Date.now() - p.createdAt > 5000) { // 5-second lifespan
                        scene.remove(p.mesh);
                        scene.remove(p.light);
                        projectiles.splice(i, 1);
                    }
                }

                renderer.render(scene, camera);
            }
            requestAnimationFrame(gameLoop);
        }

        console.log('[SYSTEM] Script loaded');
