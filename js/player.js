var player = {
    x: 0, y: 24, z: 0, vx: 0, vy: 0, vz: 0, onGround: false,
    health: 20, score: 0, width: 0.8, height: 1.8, depth: 0.8, yaw: 0, pitch: 0
};

function checkCollision(newX, newY, newZ) {
    const minBx = Math.floor(newX);
    const maxBx = Math.floor(newX + player.width);
    const minBy = Math.floor(newY);
    const maxBy = Math.floor(newY + player.height);
    const minBz = Math.floor(newZ);
    const maxBz = Math.floor(newZ + player.depth);

    for (let bx = minBx; bx <= maxBx; bx++) {
        for (let by = minBy; by <= maxBy; by++) {
            for (let bz = minBz; bz <= maxBz; bz++) {
                if (isSolid(getBlockAt(bx, by, bz))) {
                    return true;
                }
            }
        }
    }

    return false;
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

function playerJump() {
    if (player.onGround) {
        player.vy = isSprinting ? 8.5 * 3 : 8.5;
        player.onGround = false;
        safePlayAudio(soundJump);
    }
}

function handlePlayerDeath() {
    if (deathScreenShown || isDying) return;

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

    createAndSetupAvatar(userName, true);
    avatarGroup.visible = cameraMode === 'third';

    addMessage('Respawned at ' + Math.floor(targetX) + ', ' + Math.floor(player.y) + ', ' + Math.floor(targetZ), 3000);

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
