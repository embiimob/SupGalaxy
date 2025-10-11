// ------------------ Main ------------------

// Core game logic, initialization, and main game loop.

// Global variables and constants
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
var MAX_HEIGHT = 64;
var SEA_LEVEL = 16;
var MAP_SIZE = 16384;
var BLOCK_AIR = 0;
var MASTER_WORLD_KEY = 'MCWorlds';
var PENDING_PERIOD = 30 * 24 * 60 * 60 * 1000;
var OWNERSHIP_EXPIRY = 365 * 24 * 60 * 60 * 1000;
var API_CALLS_PER_SECOND = 8;
var POLL_RADIUS = 3;
var LOAD_RADIUS = 5;
var CHUNKS_PER_SIDE = Math.floor(MAP_SIZE / CHUNK_SIZE);
var VERSION = 'Sup!? viewer v0.2.1';
var POLL_INTERVAL = 30000;
var MAX_PEERS = 10;

// Game data
var BLOCKS = {
    1: { name: 'Bedrock', color: '#0b0b0b' },
    2: { name: 'Grass', color: '#3fb34f' },
    3: { name: 'Dirt', color: '#7a4f29' },
    4: { name: 'Stone', color: '#9aa0a6' },
    5: { name: 'Sand', color: '#e7d08d' },
    6: { name: 'Water', color: '#2b9cff', transparent: true },
    7: { name: 'Wood', color: '#8b5a33' },
    8: { name: 'Leaves', color: '#2f8f46' },
    9: { name: 'Cactus', color: '#4aa24a' },
    10: { name: 'Snow', color: '#ffffff' },
    11: { name: 'Coal', color: '#1f1f1f' },
    12: { name: 'Flower', color: '#ff6bcb' },
    13: { name: 'Clay', color: '#a9b6c0' },
    14: { name: 'Moss', color: '#507d43' },
    15: { name: 'Gravel', color: '#b2b2b2' },
    16: { name: 'Lava', color: '#ff6a00', transparent: true },
    17: { name: 'Ice', color: '#a8e6ff', transparent: true },
    100: { name: 'Glass', color: '#b3e6ff', transparent: true },
    101: { name: 'Stained Glass - Red', color: '#ff4b4b', transparent: true },
    102: { name: 'Stained Glass - Blue', color: '#4b6bff', transparent: true },
    103: { name: 'Stained Glass - Green', color: '#57c84d', transparent: true },
    104: { name: 'Stained Glass - Yellow', color: '#fff95b', transparent: true },
    105: { name: 'Brick', color: '#a84f3c' },
    106: { name: 'Smooth Stone', color: '#c1c1c1' },
    107: { name: 'Concrete', color: '#888888' },
    108: { name: 'Polished Wood', color: '#a87443' },
    109: { name: 'Marble', color: '#f0f0f0' },
    110: { name: 'Obsidian', color: '#2d004d' },
    111: { name: 'Crystal - Blue', color: '#6de0ff', transparent: true },
    112: { name: 'Crystal - Purple', color: '#b26eff', transparent: true },
    113: { name: 'Crystal - Green', color: '#6fff91', transparent: true },
    114: { name: 'Light Block', color: '#fffacd', transparent: true },
    115: { name: 'Glow Brick', color: '#f7cc5b' },
    116: { name: 'Dark Glass', color: '#3a3a3a', transparent: true },
    117: { name: 'Glass Tile', color: '#aeeaff', transparent: true },
    118: { name: 'Sandstone', color: '#e3c27d' },
    119: { name: 'Cobblestone', color: '#7d7d7d' },
};
var BIOMES = [
    { key: 'plains', palette: [2, 3, 4, 13, 15], heightScale: 0.8, roughness: 0.3, featureDensity: 0.05 },
    { key: 'desert', palette: [5, 118, 4], heightScale: 0.6, roughness: 0.4, featureDensity: 0.02 },
    { key: 'forest', palette: [2, 3, 14, 4], heightScale: 1.3, roughness: 0.4, featureDensity: 0.03 },
    { key: 'snow', palette: [10, 17, 4], heightScale: 1.2, roughness: 0.5, featureDensity: 0.02 },
    { key: 'mountain', palette: [4, 11, 3, 15, 1], heightScale: 10.5, roughness: 0.6, featureDensity: 0.01 },
    { key: 'swamp', palette: [2, 3, 6, 14, 13], heightScale: 0.5, roughness: 0.2, featureDensity: 0.04 },
];
var RECIPES = [
    { id: 'glass', out: { id: 100, count: 4 }, requires: { 5: 2 } },
    { id: 'stained_red', out: { id: 101, count: 2 }, requires: { 100: 1, 12: 1 } },
    { id: 'stained_blue', out: { id: 102, count: 2 }, requires: { 100: 1, 6: 1 } },
    { id: 'stained_green', out: { id: 103, count: 2 }, requires: { 100: 1, 8: 1 } },
    { id: 'stained_yellow', out: { id: 104, count: 2 }, requires: { 100: 1, 5: 1 } },
    { id: 'brick', out: { id: 105, count: 4 }, requires: { 13: 2, 4: 1 } },
    { id: 'smooth_stone', out: { id: 106, count: 4 }, requires: { 4: 4 } },
    { id: 'concrete', out: { id: 107, count: 4 }, requires: { 4: 2, 5: 2 } },
    { id: 'polished_wood', out: { id: 108, count: 2 }, requires: { 7: 2 } },
    { id: 'marble', out: { id: 109, count: 1 }, requires: { 4: 3, 10: 1 } },
    { id: 'obsidian', out: { id: 110, count: 1 }, requires: { 16: 1, 4: 1 } },
    { id: 'crystal_blue', out: { id: 111, count: 1 }, requires: { 100: 1, 6: 1 } },
    { id: 'crystal_purple', out: { id: 112, count: 1 }, requires: { 100: 1, 11: 1 } },
    { id: 'crystal_green', out: { id: 113, count: 1 }, requires: { 100: 1, 8: 1 } },
    { id: 'light_block', out: { id: 114, count: 1 }, requires: { 100: 1, 11: 1 } },
    { id: 'glow_brick', out: { id: 115, count: 1 }, requires: { 105: 1, 11: 1 } },
    { id: 'dark_glass', out: { id: 116, count: 1 }, requires: { 100: 1, 11: 1 } },
    { id: 'glass_tile', out: { id: 117, count: 2 }, requires: { 100: 2 } },
    { id: 'sandstone', out: { id: 118, count: 2 }, requires: { 5: 2 } },
    { id: 'cobblestone', out: { id: 119, count: 4 }, requires: { 4: 4 } },
];

// Game state
var worldSeed = 'KANYE';
var worldName = 'KANYE';
var userName = 'player';
var userAddress = 'anonymous';
var selectedBlockId = null;
var selectedHotIndex = 0;
var hotbarOffset = 0;
var cameraMode = 'third';
var mobs = [];
var lastDamageTime = 0;
var lastRegenTime = 0;
var joystick = { up: false, down: false, left: false, right: false };
var lastFrame = performance.now();
var mouseLocked = false;
var deathScreenShown = false;
var soundBreak, soundPlace, soundJump, soundHit;
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
var INVENTORY = new Array(32).fill(null);
var isPromptOpen = false;
var userPositions = {};
var initialPollDone = false;
var isHost = false;
var playerAvatars = new Map();
var answerPollingIntervals = new Map();
var offerPollingIntervals = new Map();

const AVATAR_COLORS = [
    { body: 0x8338ec, leg: 0xff6b6b, head: 0xffd166 },
    { body: 0x3a86ff, leg: 0xffbe0b, head: 0xfb5607 },
    { body: 0x588157, leg: 0x3a5a40, head: 0xa3b18a },
    { body: 0xff006e, leg: 0x8338ec, head: 0xffbe0b },
    { body: 0x118ab2, leg: 0x073b4c, head: 0xef476f },
];

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// ------------------ Game Loop ------------------

function gameLoop(now) {
    var dt = Math.min(0.06, (now - lastFrame) / 1000);
    lastFrame = now;
    if (player.health <= 0) {
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
        var speed = 4.3;
        var mvx = 0, mvz = 0;
        if (isMobile()) {
            if (joystick.up) mvz -= 1;
            if (joystick.down) mvz += 1;
            if (joystick.left) mvx -= 1;
            if (joystick.right) mvx += 1;
        } else {
            if (keys['s']) mvz -= 1;
            if (keys['w']) mvz += 1;
            if (keys['a']) mvx -= 1;
            if (keys['d']) mvx += 1;

            // Arrow key camera controls
            if (keys['arrowup']) player.pitch += 0.02;
            if (keys['arrowdown']) player.pitch -= 0.02;
            if (keys['arrowleft']) player.yaw += 0.02;
            if (keys['arrowright']) player.yaw -= 0.02;
            player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
            camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
        }
        var forwardDir, rightDir;
        if (cameraMode === 'first') {
            forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
            forwardDir.y = 0;
            forwardDir.normalize();
            rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
        } else {
            forwardDir = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
            rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forwardDir).normalize();
        }
        var moveVec = new THREE.Vector3();
        moveVec.addScaledVector(forwardDir, mvz);
        moveVec.addScaledVector(rightDir, mvx);
        const isMoving = moveVec.length() > 0.001;
        if (isMoving) moveVec.normalize();
        var dx = moveVec.x * speed * dt;
        var dz = moveVec.z * speed * dt;
        var newX = modWrap(player.x + dx, MAP_SIZE);
        var newZ = modWrap(player.z + dz, MAP_SIZE);
        if (!checkCollision(newX, player.y, newZ)) {
            player.x = newX;
            player.z = newZ;
        } else {
            if (!checkCollision(newX, player.y, player.z)) player.x = newX;
            if (!checkCollision(player.x, player.y, newZ)) player.z = newZ;
        }
        player.vy -= 16.0 * dt;
        var dy = player.vy * dt;
        var newY = player.y + dy;
        if (!checkCollision(player.x, newY, newZ)) {
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
        if (player.y < -10) {
            player.x = modWrap(player.x, MAP_SIZE);
            player.z = modWrap(player.z, MAP_SIZE);
            player.y = chunkManager.getSurfaceY(player.x, player.z) + 1;
            player.vy = 0;
            player.onGround = true;
            addMessage('Fell off world, respawned');
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
        avatarGroup.position.set(player.x, player.y - 0.9, player.z);
        if (cameraMode === 'third') {
            avatarGroup.rotation.y = player.yaw;
        }
        updateAvatarAnimation(now, isMoving);
        chunkManager.update(player.x, player.z);
        mobs.forEach(function (m) { m.update(dt); });
        updateSky(dt);
        updateMinimap();
        var posLabel = document.getElementById('posLabel');
        if (posLabel) posLabel.innerText = Math.floor(player.x) + ', ' + Math.floor(player.y) + ', ' + Math.floor(player.z);
        if (cameraMode === 'third') {
            controls.target.set(player.x, player.y + 0.6, player.z);
            controls.update();
        } else {
            var headPos = new THREE.Vector3(player.x, player.y + 1.62, player.z);
            camera.position.copy(headPos);
        }
        const positionChanged = Math.hypot(player.x - lastSentPosition.x, player.y - lastSentPosition.y, player.z - lastSentPosition.z) > 0.1;
        const rotationChanged = Math.abs(player.yaw - lastSentPosition.yaw) > 0.01 || Math.abs(player.pitch - lastSentPosition.pitch) > 0.01;

        if (now - lastUpdateTime > 50 && (positionChanged || rotationChanged)) {
            lastUpdateTime = now;
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
                isMoving: isMoving, isAttacking: isAttacking
            });
            // Add clients' states
            for (const [username, positionData] of Object.entries(userPositions)) {
                if (peers.has(username)) { // Ensure the user is still connected
                     playersData.push({
                        username: username,
                        x: positionData.targetX, y: positionData.targetY, z: positionData.targetZ,
                        yaw: positionData.targetYaw, pitch: positionData.targetPitch,
                        isMoving: positionData.isMoving, isAttacking: positionData.isAttacking
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
        for (var entry of playerAvatars) {
            var username = entry[0];
            var avatar = entry[1];
            if (username !== userName && userPositions[username]) {
                const userState = userPositions[username];

                // Interpolate position
                if (userState.prevX !== undefined) {
                    const now = performance.now();
                    const timeSinceUpdate = now - userState.lastUpdate;
                    const interpolationDelay = 100; // ms
                    const alpha = Math.min(1.0, timeSinceUpdate / interpolationDelay);

                    const interpolatedPosition = new THREE.Vector3(
                        userState.prevX + (userState.targetX - userState.prevX) * alpha,
                        userState.prevY + (userState.targetY - userState.prevY) * alpha - 0.9,
                        userState.prevZ + (userState.targetZ - userState.prevZ) * alpha
                    );
                    avatar.position.copy(interpolatedPosition);

                    // Interpolate rotation using quaternions for smooth slerp
                    const prevQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(userState.prevPitch, userState.prevYaw, 0, 'YXZ'));
                    const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(userState.targetPitch, userState.targetYaw, 0, 'YXZ'));
                    THREE.Quaternion.slerp(prevQuaternion, targetQuaternion, avatar.quaternion, alpha);

                } else if (userState.targetX !== undefined) {
                     // If no previous state, just jump to target
                    avatar.position.set(userState.targetX, userState.targetY - 0.9, userState.targetZ);
                    avatar.rotation.set(userState.targetPitch, userState.targetYaw, 0, 'YXZ');
                }


                const now = performance.now();
                if (userState.isAttacking) {
                    const elapsedTime = now - userState.attackStartTime;
                    const attackDuration = 500;
                    if (elapsedTime < attackDuration) {
                        const angle = Math.sin((elapsedTime / attackDuration) * Math.PI) * 1.5;
                        avatar.children[4].rotation.x = angle; // left arm
                        avatar.children[5].rotation.x = angle; // right arm
                    } else {
                        userState.isAttacking = false;
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

                avatar.visible = Math.hypot(player.x - avatar.position.x, player.z - avatar.position.z) < 32;
            }
        }
        renderer.render(scene, camera);
    }
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', function () {
    try {
        console.log('[Debug] DOMContentLoaded fired, initializing login elements');
        var startBtn = document.getElementById('startBtn');
        var announceLoginBtn = document.getElementById('announceLoginBtn');
        var newUserJoinScriptBtn = document.getElementById('newUserJoinScriptBtn');
        var acceptAll = document.getElementById('acceptAll');
        var pendingModal = document.getElementById('pendingModal');
        var loginOverlay = document.getElementById('loginOverlay');
        if (!startBtn || !announceLoginBtn || !newUserJoinScriptBtn || !loginOverlay) {
            console.error('[Debug] Login buttons or overlay not found in DOM');
            addMessage('UI initialization failed: buttons or overlay missing', 3000);
            return;
        }
        if (acceptAll) {
            acceptAll.addEventListener('change', function (e) {
                document.querySelectorAll('.selectOffer').forEach(function (ch) { ch.checked = e.target.checked; });
                console.log('[Debug] Accept All checkbox changed');
            });
        } else {
            console.warn('[Debug] acceptAll element not found');
        }
        if (pendingModal) {
            pendingModal.addEventListener('click', function (e) { e.stopPropagation(); });
            console.log('[Debug] Pending modal click listener added');
        } else {
            console.warn('[Debug] pendingModal element not found');
        }
        startBtn.addEventListener('click', async function () {
            console.log('[Login] Start button clicked');
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
            worldName = worldInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
            userName = userInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
            worldSeed = worldName;
            var userWorldKey = userName + '@' + worldName;
            var profile = await GetProfileByURN(userName);
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
            console.log('[Login] Initializing Three.js');
            initThree();
            console.log('[Login] Three.js initialized');
            initHotbar();
            console.log('[Login] Creating ChunkManager');
            chunkManager = new ChunkManager(worldSeed);
            console.log('[Login] Populating spawn chunks');
            populateSpawnChunks();
            console.log('[Login] Calculating spawn point');
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
            console.log('[Login] Preloading initial chunks');
            chunkManager.preloadChunks(spawnCx, spawnCz, LOAD_RADIUS);
            console.log('[Login] Spawning mobs');
            const mobRnd = makeSeededRandom(worldSeed + '_mobs');
            spawnMobs(12, mobRnd);
            setupMobile();
            initMinimap();
            updateHotbarUI();
            selectedBlockId = null;
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
            console.log('[Login] Starting game loop');
            requestAnimationFrame(gameLoop);
            addMessage('Welcome — world wraps at edges. Toggle camera with T. Good luck!', 5000);
            var healthElement = document.getElementById('health');
            if (healthElement) healthElement.innerText = player.health;
            var scoreElement = document.getElementById('score');
            if (scoreElement) scoreElement.innerText = player.score;
            await initServers();
            worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
            startWorker();
            setInterval(pollServers, POLL_INTERVAL);
            addMessage('Joined world ' + worldName + ' as ' + userName, 3000);
        });
        announceLoginBtn.addEventListener('click', async function () {
            console.log('[Login] Announce Server button clicked');
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
            var cleanWorld = worldInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
            var cleanUser = userInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
            var serverKeyword = 'MCServerJoin@' + cleanWorld;
            var serverAddr = await GetPublicAddressByKeyword(serverKeyword);
            document.getElementById('joinScriptText').value = serverAddr ? serverAddr.trim().replace(/^"|"$/g, '') : serverKeyword;
            document.getElementById('joinScriptModal').style.display = 'block';
            document.getElementById('joinScriptModal').querySelector('h3').innerText = 'Announce Server';
            document.getElementById('joinScriptModal').querySelector('p').innerText = 'Copy this address and paste it into a Sup!? message To: field, attach a server JSON file after starting, and click 📢 to announce your server.';
            addMessage('Prepare to announce server after starting', 3000);
        });
        newUserJoinScriptBtn.addEventListener('click', async function () {
            console.log('[Login] Create Join Script button clicked');
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
            var cleanWorld = worldInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
            var cleanUser = userInput.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
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
        });
        document.getElementById('camToggle').addEventListener('click', toggleCameraMode);
        document.getElementById('openCraft').addEventListener('click', openCrafting);
        document.getElementById('teleportBtn').addEventListener('click', function () {
            isPromptOpen = true;
            document.getElementById('teleportModal').style.display = 'block';
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
        document.getElementById('announceBtn').addEventListener('click', announceServer);
        document.getElementById('usersBtn').addEventListener('click', openUsersModal);
        document.getElementById('closeCraft').addEventListener('click', function () {
            isPromptOpen = false;
            document.getElementById('craftModal').style.display = 'none';
        });
        document.getElementById('closeJoinScript').addEventListener('click', function () {
            isPromptOpen = false;
            document.getElementById('joinScriptModal').style.display = 'none';
        });
        document.getElementById('closeDownloadModal').addEventListener('click', function () {
            isPromptOpen = false;
            document.getElementById('downloadModal').style.display = 'none';
        });
        document.getElementById('teleportCancel').addEventListener('click', function () {
            isPromptOpen = false;
            document.getElementById('teleportModal').style.display = 'none';
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
        });
        document.getElementById('respawnBtn').addEventListener('click', function () {
            respawnPlayer();
        });
        document.getElementById('acceptPending').addEventListener('click', acceptPendingOffers);
        document.getElementById('closePending').addEventListener('click', function () {
            document.getElementById('pendingModal').style.display = 'none';
            pendingOffers = [];
            updatePendingModal();
        });
        async function initWorldsAndUsers() {
            console.log('[Users] Initializing worlds and users for:', MASTER_WORLD_KEY);
            var masterAddr = await GetPublicAddressByKeyword(MASTER_WORLD_KEY);
            if (masterAddr) {
                var messages = await GetPublicMessagesByAddress(masterAddr);
                for (var msg of messages || []) {
                    if (msg.TransactionId && !processedMessages.has(msg.TransactionId)) {
                        console.log('[Users] Processing message:', msg.TransactionId);
                        var fromProfile = await GetProfileByAddress(msg.FromAddress);
                        if (!fromProfile || !fromProfile.URN) {
                            console.log('[Users] Skipping: No valid URN for address:', msg.FromAddress);
                            continue;
                        }
                        var user = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                        var userProfile = await GetProfileByURN(user);
                        if (!userProfile || !userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                            console.log('[Users] Skipping: Invalid profile for user:', user);
                            continue;
                        }
                        var toKeywordRaw = await GetKeywordByPublicAddress(msg.ToAddress);
                        if (!toKeywordRaw) {
                            console.log('[Users] Skipping: No keyword for address:', msg.ToAddress);
                            continue;
                        }
                        var toKeyword = toKeywordRaw.replace(/^"|"$/g, '');
                        if (!toKeyword.includes('MCUserJoin@')) {
                            console.log('[Users] Skipping: Invalid keyword:', toKeyword);
                            continue;
                        }
                        var world = toKeyword.split('@')[1].replace(/[^a-zA-Z0-9]/g, '');
                        if (user && world) {
                            console.log('[Users] Adding user:', user, 'to world:', world);
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
                        console.log('[Users] Skipping processed message:', msg.TransactionId);
                    }
                }
                console.log('[Users] Discovered worlds:', knownWorlds.size, 'users:', knownUsers.size);
            }
        }
        initWorldsAndUsers();
        updateLoginUI();
        console.log('[Debug] DOMContentLoaded completed, button listeners attached');
    } catch (error) {
        console.error('[Debug] Error in DOMContentLoaded:', error);
        addMessage('Failed to initialize login system', 3000);
    }
});
