// ------------------ Player ------------------

// Handles player state, movement, collision, and appearance.

var player = { x: 0, y: 24, z: 0, vx: 0, vy: 0, vz: 0, onGround: false, health: 20, score: 0, width: 0.6, height: 1.8, yaw: 0, pitch: 0 };
var isAttacking = false;
var attackStartTime = 0;
var lastSentPosition = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
var lastUpdateTime = 0;
var lastStateUpdateTime = 0;
var spawnPoint = { x: 0, y: 0, z: 0 };
var lastSavedPosition = new THREE.Vector3(0, 24, 0);

function createPlayerAvatar() {
    avatarGroup = new THREE.Group();
    var legMat = new THREE.MeshStandardMaterial({ color: 0x6b8cff });
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b8f87 });
    var headMat = new THREE.MeshStandardMaterial({ color: 0xf2c57c });
    var armMat = new THREE.MeshStandardMaterial({ color: 0xf2c57c });

    var legGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4); // Shorter legs
    var bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    var headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    var armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);

    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.25, 0.4, 0); // Adjusted Y position
    var rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.25, 0.4, 0); // Adjusted Y position
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.4, 0); // Adjusted Y position
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.3, 0); // Adjusted Y position
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.55, 1.5, 0);
    var rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.55, 1.5, 0);

    avatarGroup.add(leftLeg, rightLeg, body, head, leftArm, rightArm);
    scene.add(avatarGroup);
}

function createAvatar(username) {
    console.log('[WebRTC] Creating avatar for:', username);
    const avatar = new THREE.Group();
    const colorScheme = AVATAR_COLORS[simpleHash(username) % AVATAR_COLORS.length];

    const legMat = new THREE.MeshStandardMaterial({ color: colorScheme.leg });
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorScheme.body });
    const headMat = new THREE.MeshStandardMaterial({ color: colorScheme.head });
    const armMat = new THREE.MeshStandardMaterial({ color: colorScheme.head });

    const legGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4); // Shorter legs
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const armGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.25, 0.4, 0); // Adjusted Y position
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.25, 0.4, 0); // Adjusted Y position
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.4, 0); // Adjusted Y position
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.3, 0); // Adjusted Y position
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.55, 1.5, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.55, 1.5, 0);

    avatar.add(leftLeg, rightLeg, body, head, leftArm, rightArm);
    scene.add(avatar);
    playerAvatars.set(username, avatar);
    console.log('[WebRTC] Avatar created and added to scene for:', username);
    return avatar;
}

function handlePlayerDeath() {
    if (!deathScreenShown) {
        document.getElementById('deathScreen').style.display = 'flex';
        INVENTORY = new Array(32).fill(null);
        player.score = 0;
        var scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.innerText = player.score;
        player.health = 0;
        updateHealthBar();
        updateHotbarUI();
        addMessage('You died! All items and score lost.', 5000);
        deathScreenShown = true;
    }
}

function respawnPlayer(x, y, z) {
    var targetX = modWrap(x || spawnPoint.x, MAP_SIZE);
    var targetZ = modWrap(z || spawnPoint.z, MAP_SIZE);
    var targetY = y || 100;
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
    INVENTORY = new Array(32).fill(null);
    updateHotbarUI();
    updateHealthBar();
    document.getElementById('health').innerText = player.health;
    var newCx = Math.floor(targetX / CHUNK_SIZE);
    var newCz = Math.floor(targetZ / CHUNK_SIZE);
    chunkManager.preloadChunks(newCx, newCz, LOAD_RADIUS);
    for (var dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
        for (var dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
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
        camera.position.set(player.x, player.y + 1.62, player.z);
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
        controls.target.set(player.x, player.y + 0.6, player.z);
        controls.update();
    }
    document.getElementById('deathScreen').style.display = 'none';
    deathScreenShown = false;
    addMessage('Respawned at ' + Math.floor(targetX) + ', ' + Math.floor(player.y) + ', ' + Math.floor(targetZ), 3000);
    for (var peer of peers) {
        var peerUser = peer[0];
        var peerData = peer[1];
        if (peerData.dc && peerData.dc.readyState === 'open') {
            peerData.dc.send(JSON.stringify({
                type: 'player_move',
                username: userName,
                x: player.x,
                y: player.y,
                z: player.z,
                yaw: player.yaw,
                pitch: player.pitch
            }));
        }
    }
}
