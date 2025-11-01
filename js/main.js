var knownWorlds = new Map();
var knownUsers = new Map();
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
var isAttacking = false;
var attackStartTime = 0;
var useGreedyMesher = false;
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
var mobs = [];
var lastDamageTime = 0;
var lastRegenTime = 0;
var joystick = { up: false, down: false, left: false, right: false };
var lastFrame = performance.now();
var mouseLocked = false;
var lastMobBatchTime = 0;
var lastMobManagement = 0;
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
var keywordCache = new Map();
var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();
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
var craftingState = null;
var userPositions = {};
var initialPollDone = false;
var isHost = false;
var isConnecting = false;
var playerAvatars = new Map();
var answerPollingIntervals = new Map();
var worldArchetype = null;
var gravity = 16.0;
var offerPollingIntervals = new Map();
var projectiles = [];
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

const lightManager = {
    lights: [],
    poolSize: 8,
    init: function() {
        for (let i = 0; i < this.poolSize; i++) {
            const light = new THREE.PointLight(0xffaa33, 0, 0);
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
                this.lights[i].intensity = 0;
            }
        }
    }
};

var musicPlaylist = [];
var currentTrackIndex = 0;
var musicAudioElement = new Audio();
var isMusicPlaying = false;
var isMuted = false;
var musicCurrentPage = 1;
var previewAudio = new Audio();
var currentPreviewUrl = null;
var showingPlaylist = false;

var videoPlaylist = [];
var currentVideoIndex = 0;
var videoElement = document.getElementById('videoElement');
var isVideoPlaying = false;
var isVideoMuted = true;
var videoCurrentPage = 1;
var showingVideoPlaylist = false;

document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('[SYSTEM] DOMContentLoaded fired, initializing login elements');
        var startBtn = document.getElementById('startBtn');
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
        startBtn.addEventListener('click', async function () {
            this.blur();
            console.log('[LOGIN] Start button clicked');
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
                    const newHue = (hsv.h + (colorRnd() - 0.5) * 0.05);
                    const newSat = Math.max(0.4, Math.min(0.9, hsv.s + (colorRnd() - 0.5) * 0.2));
                    const newLight = Math.max(0.1, Math.min(0.5, hsv.l + (colorRnd() - 0.5) * 0.2));
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
            selectedHotIndex = 0;
            selectedBlockId = 120;
            initHotbar();
            updateHotbarUI();
            console.log('[LOGIN] Creating ChunkManager');
            chunkManager = new ChunkManager(worldSeed);
            populateSpawnChunks();
            console.log('[LOGIN] Calculating spawn point');
            var spawn = calculateSpawnPoint(userWorldKey);
            player.x = spawn.x;
            player.y = spawn.y;
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
            initServers();
            worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
            startWorker();
            setInterval(pollServers, POLL_INTERVAL);
            addMessage('Joined world ' + worldName + ' as ' + userName, 3000);
        });
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
        document.getElementById('tvIcon').addEventListener('click', () => {
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer.style.display === 'none') {
                videoPlayer.style.display = 'block';
                fetchAndPlayVideos('game');
            } else {
                videoPlayer.style.display = 'none';
                if (isVideoPlaying) {
                    videoElement.pause();
                    isVideoPlaying = false;
                    document.getElementById('videoPlayPauseBtn').innerText = '▶';
                }
            }
        });
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
