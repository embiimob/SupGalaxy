// Mob glows use additive sprites instead of PointLights: every scene light added or removed when
// manageMobs spawns or despawns a mob changes the light count and forces three.js to recompile
// every lit material, which stalls rendering for a frame each management tick.
let mobGlowTexture = null;
const wolfTameRequests = new Map();
const wolfTamePending = new Map();
const wolfTameUnacknowledged = new Map();
const combatRemovedPetIds = new Set();
const wolfTameSession = Math.random().toString(36).slice(2);
let wolfTameSequence = 0;
const idleUfoIds = new Set();
const pendingUfoRewards = new Map();
const receivedUfoRewards = new Map();
const ufoRewardRoutes = new Map();
const ufoRewardAuthorities = new Map();

function adoptUfoRewardFallback(id, world, authority) {
    const issuer = ufoRewardAuthorities.get(`${world}:${id}`);
    if (!issuer || issuer.authority === authority) return issuer;
    const ownerHere = (issuer.authority === userName && world === worldName) ||
        userPositions[issuer.authority]?.world === world;
    if (!ownerHere && typeof authority === "string" && authority.length > 0 && authority.length <= 200) {
        issuer.authority = authority;
    }
    return issuer;
}

function rememberUfoRewardAuthority(id, world, authority, position) {
    if (typeof id === "number" && Number.isFinite(id)) id = String(id);
    if (typeof id !== "string" || !id.length || id.length > 160 ||
        typeof world !== "string" || !world.length || world.length > 200 ||
        typeof authority !== "string" || !authority.length || authority.length > 200) return false;
    const key = `${world}:${id}`, existing = ufoRewardAuthorities.get(key);
    if (existing && existing.authority !== authority) return false;
    if (!existing && ufoRewardAuthorities.size >= 1024) {
        const completed = [...ufoRewardAuthorities].find(([, entry]) => entry.completed);
        if (!completed) return false;
        ufoRewardAuthorities.delete(completed[0]);
    }
    const entry = existing || { authority, completed: false };
    if (position && [position.x, position.y, position.z].every(Number.isFinite)) {
        entry.position = { x: position.x, y: position.y, z: position.z };
    }
    ufoRewardAuthorities.set(key, entry);
    return true;
}

function isValidUfoReward(message) {
    const bounded = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;
    return message.blockId === 177 && message.count === 1 &&
        bounded(message.world, 200) && bounded(message.originSeed, 200) &&
        bounded(message.target, 200) && bounded(message.mobId, 160) &&
        bounded(message.ufoRewardId, 768) &&
        message.ufoRewardId === `${message.world}:${message.mobId}:${message.target}`;
}

function authorizeUfoReward(message, authority, trustedRelay = false) {
    if (!isValidUfoReward(message) || typeof authority !== "string" || !authority.length || authority.length > 200) return false;
    const existing = ufoRewardRoutes.get(message.ufoRewardId);
    if (existing) return existing.authority === authority && existing.world === message.world &&
        existing.target === message.target && existing.originSeed === message.originSeed;
    if (!trustedRelay) {
        const issuer = ufoRewardAuthorities.get(`${message.world}:${message.mobId}`);
        if (!issuer || issuer.authority !== authority) return false;
        const mob = message.world === worldName ? mobs.find(mob => String(mob.id) === message.mobId)
            : window.mobsByWorld?.[message.world]?.find(mob => String(mob.id) === message.mobId);
        const position = mob?.pos || mob || issuer.position;
        if (!position) return false;
        const target = message.target === userName
            ? { x: player.x, y: player.y, z: player.z, world: worldName, health: player.health, isDying }
            : userPositions[message.target];
        if (!target) return false;
        // The issuer's eligible-player snapshot may precede our world switch or death.
        if (message.target !== userName &&
            (target.world !== message.world || target.isDying || target.health <= 0)) return false;
        const x = target.targetX ?? target.x, y = target.targetY ?? target.y, z = target.targetZ ?? target.z;
        if (![position.x, position.y, position.z].every(Number.isFinite) || position.y < 7900) return false;
        if (message.target !== userName && (![x, y, z].every(Number.isFinite) ||
            Math.hypot(x - position.x, y - position.y, z - position.z) > 100)) return false;
    }
    if (ufoRewardRoutes.size >= 1024) {
        const completed = [...ufoRewardRoutes].find(([, route]) => route.acknowledged);
        if (!completed) return false;
        ufoRewardRoutes.delete(completed[0]);
    }
    ufoRewardRoutes.set(message.ufoRewardId, { authority, world: message.world,
        target: message.target, originSeed: message.originSeed, acknowledged: false });
    return true;
}

function spawnUfoExplosion(position, id) {
    if (!window.activeExplosions) window.activeExplosions = [];
    const random = makeSeededRandom(String(id) + "_explosion");
    const geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    for (let i = 0; i < 60; i++) {
        const particle = new THREE.Mesh(geom, mat);
        particle.position.set(position.x + (random() - .5) * 16,
            position.y + (random() - .5) * 16, position.z + (random() - .5) * 16);
        scene.add(particle);
        window.activeExplosions.push({
            mesh: particle,
            velocity: new THREE.Vector3((random() - .5) * .25, random() * .2, (random() - .5) * .25),
            createdAt: performance.now()
        });
    }
}

function sendUfoRewardMessage(target, message) {
    const routed = { ...message, target, username: userName };
    try {
        if (sendToPlayer(target, routed)) return;
        // A peer may only be connected to the host, rather than to the recipient.
        if (!dedicatedServer && !isHost) {
            for (const [, peer] of peers) {
                if (peer.ufoTrustedHost && peer.dc?.readyState === "open") {
                    peer.dc.send(JSON.stringify(routed));
                    break;
                }
            }
        }
    } catch (error) { }
}

function receiveUfoReward(message, authority) {
    if (message.target !== userName || !isValidUfoReward(message)) return;
    let reward = receivedUfoRewards.get(message.ufoRewardId);
    if (!reward) {
        if (receivedUfoRewards.size >= 1024) {
            const completed = [...receivedUfoRewards].find(([, reward]) => reward.granted);
            if (!completed) return;
            receivedUfoRewards.delete(completed[0]);
        }
        if ([...receivedUfoRewards.values()].filter(reward => !reward.granted).length >= 256) return;
        reward = { message, authority, granted: false };
        receivedUfoRewards.set(message.ufoRewardId, reward);
    }
    if (!reward.granted) {
        if (reward.message.world !== worldName) return;
        const hasRoom = INVENTORY.some(slot => !slot || slot.count === 0 ||
            (slot.id === 177 && slot.originSeed === reward.message.originSeed && slot.count < 64));
        if (!hasRoom || player.health <= 0 || isDying || deathScreenShown) return;
        addToInventory(177, 1, reward.message.originSeed);
        reward.granted = true;
        const route = ufoRewardRoutes.get(message.ufoRewardId);
        if (route) route.acknowledged = true;
        addMessage("Received a Fusion Reactor!", 3000);
    }
    if (authority === userName) pendingUfoRewards.delete(message.ufoRewardId);
    else sendUfoRewardMessage(authority, { type: "ufo_reward_ack", ufoRewardId: message.ufoRewardId,
        world: reward.message.world });
}

function retryUfoRewards() {
    for (const reward of receivedUfoRewards.values()) {
        if (!reward.granted) receiveUfoReward(reward.message, reward.authority);
    }
    for (const [id, reward] of pendingUfoRewards) {
        if (Date.now() - reward.sentAt < 2000) continue;
        reward.sentAt = Date.now();
        if (reward.target === userName) receiveUfoReward(reward.message, userName);
        else sendUfoRewardMessage(reward.target, reward.message);
    }
}

function awardUfoAltitudeRewards(mob) {
    const candidates = [{ name: userName, x: player.x, y: player.y, z: player.z,
        alive: player.health > 0 && !isDying && !deathScreenShown, world: worldName }];
    for (const [name, state] of Object.entries(userPositions)) {
        if (name === userName) continue;
        candidates.push({ name, x: state.targetX, y: state.targetY, z: state.targetZ,
            alive: !state.isDying && (state.health === undefined || state.health > 0), world: state.world });
    }
    for (const candidate of candidates) {
        if (!candidate.alive || candidate.world !== worldName ||
            ![candidate.x, candidate.y, candidate.z].every(Number.isFinite) ||
            Math.hypot(candidate.x - mob.pos.x, candidate.y - mob.pos.y, candidate.z - mob.pos.z) > 100 ||
            Math.random() >= 1 / 3) continue;
        const id = `${worldName}:${mob.id}:${candidate.name}`;
        const message = { type: "add_to_inventory", target: candidate.name, blockId: 177,
            count: 1, originSeed: mob.originSeed || worldSeed, world: worldName, mobId: String(mob.id), ufoRewardId: id };
        if (!authorizeUfoReward(message, userName, true)) continue;
        pendingUfoRewards.set(id, { target: candidate.name, message, sentAt: 0 });
    }
    retryUfoRewards();
}

function hasUfoAltitudeRider(mob) {
    if (mob.pos.y < 7900) return false;
    if (typeof ufoRide !== "undefined" && ufoRide?.mob === mob &&
        player.health > 0 && !isDying && !deathScreenShown &&
        mob.pos.y + ufoRide.local.y >= 8000) return true;
    const ascent = Math.max(0, mob.pos.y - mob.mesh.position.y);
    const candidates = [{ x: player.x, y: player.y, z: player.z,
        alive: player.health > 0 && !isDying && !deathScreenShown, world: worldName }];
    for (const [name, state] of Object.entries(userPositions)) {
        if (name === userName) continue;
        candidates.push({ x: state.targetX, y: state.targetY, z: state.targetZ,
            alive: !state.isDying && (state.health === undefined || state.health > 0), world: state.world });
    }
    for (const candidate of candidates) {
        if (!candidate.alive || candidate.world !== worldName || candidate.y + ascent < 8000 ||
            ![candidate.x, candidate.y, candidate.z].every(Number.isFinite) ||
            Math.hypot(candidate.x - mob.pos.x, candidate.y - mob.pos.y, candidate.z - mob.pos.z) > 100) continue;
        if (typeof getUfoGroundSupport === "function" &&
            getUfoGroundSupport(candidate.x, candidate.z, candidate.y + ascent + .5,
                candidate.y + ascent - 1, mob)) return true;
    }
    return false;
}

setInterval(retryUfoRewards, 2000);

function sanitizePetData(data) {
    const result = [];
    if (!Array.isArray(data)) return result;
    for (const pet of data) {
        if (!pet || !((typeof pet.id === "string" && pet.id.length > 0 && pet.id.length <= 160) ||
            (typeof pet.id === "number" && Number.isFinite(pet.id)))) continue;
        if (combatRemovedPetIds.has(pet.id)) continue;
        if (result.some(entry => entry.id === pet.id)) continue;
        if (!Number.isFinite(pet.hp) || pet.hp <= 0) continue;
        result.push({ id: pet.id, hp: pet.hp,
            maxHp: Math.max(pet.hp, Number.isFinite(pet.maxHp) ? pet.maxHp : 12),
            feedRevision: Number.isSafeInteger(pet.feedRevision) && pet.feedRevision >= 0 ? pet.feedRevision : 0,
            originSeed: typeof pet.originSeed === "string" ? pet.originSeed.slice(0, 200) : worldSeed });
        if (result.length === 3) break;
    }
    return result;
}

function getPetSaveData() {
    player.pets = sanitizePetData(player.pets);
    for (const pet of player.pets) {
        const mob = mobs.find(mob => mob.id === pet.id && mob.petOwner === userName);
        if (mob && mob.hp > 0) {
            pet.hp = mob.hp;
            pet.maxHp = Math.max(mob.hp, Number.isFinite(mob.maxHp) ? mob.maxHp : pet.maxHp);
            pet.feedRevision = mob.feedRevision || 0;
        }
    }
    return player.pets.map(pet => ({ ...pet }));
}

function restorePetSaveData(data) {
    combatRemovedPetIds.clear();
    wolfTamePending.clear();
    wolfTameUnacknowledged.clear();
    player.pets = sanitizePetData(data);
    mobs = mobs.filter(mob => {
        if (mob.petOwner !== userName) return true;
        const pet = player.pets.find(pet => pet.id === mob.id);
        if (pet) {
            delete mob.petTransport;
            mob.hp = pet.hp;
            mob.maxHp = pet.maxHp;
            mob.feedRevision = pet.feedRevision;
            mob.originSeed = pet.originSeed;
            return true;
        }
        scene.remove(mob.mesh);
        disposeObject(mob.mesh);
        return false;
    });
}

function removePlayerPet(id) {
    combatRemovedPetIds.add(id);
    player.pets = sanitizePetData(player.pets).filter(pet => pet.id !== id);
}

function clearWorldPetsForOwner(owner, broadcast = false) {
    const removed = new Set();
    function removePet(mob, world) {
        if (mob.petOwner !== owner) return true;
        if (!removed.has(mob)) {
            removed.add(mob);
            if (mob.mesh) {
                scene.remove(mob.mesh);
                disposeObject(mob.mesh);
            }
            if (broadcast) {
                const message = JSON.stringify({
                    type: "mob_despawn", id: mob.id, petOwner: owner, relocation: true, world
                });
                for (const [, peer] of peers) if (peer.dc?.readyState === "open") peer.dc.send(message);
            }
        }
        return false;
    }
    mobs = mobs.filter(mob => removePet(mob, worldName));
    if (window.mobsByWorld) {
        for (const world of Object.keys(window.mobsByWorld)) {
            const cached = window.mobsByWorld[world];
            if (Array.isArray(cached)) window.mobsByWorld[world] = cached.filter(mob => removePet(mob, world));
        }
    }
    if (window.mobUpdateQueue) {
        const ids = new Set([...removed].map(mob => mob.id));
        window.mobUpdateQueue = window.mobUpdateQueue.filter(update => !ids.has(update.id));
    }
}

function clearPlayerPetsForWorldSwitch() {
    getPetSaveData();
    for (const [id, pending] of wolfTamePending) wolfTameUnacknowledged.set(id, pending);
    wolfTamePending.clear();
    clearWorldPetsForOwner(userName, true);
}

function clearDisconnectedPlayerPets(owner) {
    if (!owner || owner === userName) return;
    clearWorldPetsForOwner(owner, isAuthority());
}

function getPlayerPetIds(owner) {
    const ids = new Set(owner === userName ? getPetSaveData().map(pet => pet.id) :
        (Array.isArray(userPositions[owner]?.petIds) ? userPositions[owner].petIds.slice(0, 3) : []));
    for (const mob of mobs) if (mob.petOwner === owner && mob.hp > 0) ids.add(mob.id);
    return ids;
}

function getWolfTargets() {
    return mobs.filter(mob => mob.type === "timber_wolf" && mob.hp > 0).map(mob => ({
        name: `wolf:${mob.id}`, username: `wolf:${mob.id}`, mob,
        x: mob.pos.x, y: mob.pos.y, z: mob.pos.z, health: mob.hp, armed: false
    }));
}

function sendWolfAuthorityMessage(mob, message) {
    const direct = mob.spawner && peers.get(mob.spawner);
    if (direct?.dc?.readyState === "open") {
        direct.dc.send(JSON.stringify(message));
        return true;
    }
    for (const [, peer] of peers) {
        if (peer.dc?.readyState === "open") {
            peer.dc.send(JSON.stringify(message));
            return true;
        }
    }
    return false;
}

function tryTameWolf(mob) {
    if (mob.type !== "timber_wolf") return false;
    if (wolfTamePending.size) {
        addMessage("Waiting for the wolf to eat its bone…", 1200);
        return true;
    }
    const bone = INVENTORY[selectedHotIndex];
    if (!bone || bone.id !== 176 || !(bone.count > 0) || selectedBlockId !== 176) return true;
    if (Math.hypot(mob.pos.x - player.x, mob.pos.y - player.y, mob.pos.z - player.z) > 6) return true;
    const requestId = `${userName}:${wolfTameSession}:${++wolfTameSequence}`;
    const request = { type: "wolf_tame_request", id: mob.id, owner: userName, username: userName, requestId, world: worldName };
    if (!isMobAuthority(mob) && !sendWolfAuthorityMessage(mob, request)) return true;
    bone.count--;
    if (bone.count <= 0) INVENTORY[selectedHotIndex] = null;
    updateHotbarUI();
    wolfTamePending.set(requestId, { request, authority: mob.spawner || (isAuthority() ? userName : peers.keys().next().value),
        startedAt: Date.now(), sentAt: Date.now() });
    if (isMobAuthority(mob)) handleWolfTameRequest(mob, userName, requestId);
    return true;
}

function handleWolfTameRequest(mob, owner, requestId) {
    if (typeof owner !== "string" ||
        typeof requestId !== "string" || requestId.length > 300 || !requestId.startsWith(`${owner}:`)) return;
    const key = `${owner}|${requestId}`;
    let result = wolfTameRequests.get(key);
    if (!result) {
        if (!mob || !isMobAuthority(mob)) return;
        const position = owner === userName ? player : userPositions[owner];
        const x = owner === userName ? position?.x : position?.targetX;
        const y = owner === userName ? position?.y : position?.targetY;
        const z = owner === userName ? position?.z : position?.targetZ;
        const fed = mob.type === "timber_wolf" && mob.hp > 0 &&
            position && (owner === userName || position.world === worldName) &&
            Math.hypot(mob.pos.x - x, mob.pos.y - y, mob.pos.z - z) <= 6;
        if (fed) {
            mob.hp += 10;
            mob.maxHp = Math.max(Number.isFinite(mob.maxHp) ? mob.maxHp : 12, mob.hp);
            mob.feedRevision = (mob.feedRevision || 0) + 1;
        }
        const success = !!fed && !mob.petOwner && getPlayerPetIds(owner).size < 3 && Math.random() < 1 / 3;
        if (success) {
            mob.petOwner = owner;
            mob.spawner = owner;
            mob.aiState = "FOLLOW";
            mob.provokedBy = {};
            mob.lastSentPetOwner = null;
            if (owner !== userName && userPositions[owner]) {
                userPositions[owner].petIds = [...getPlayerPetIds(owner)].slice(0, 3);
            }
        }
        result = { type: "wolf_tame_result", id: mob.id, owner, requestId, success, tamed: success, fed: !!fed,
            petOwner: mob.petOwner || null, hp: mob.hp, maxHp: mob.maxHp, feedRevision: mob.feedRevision || 0, originSeed: mob.originSeed,
            world: worldName, authority: userName };
        wolfTameRequests.set(key, result);
        if (fed) queueEliteMobUpdate(mob);
    }
    handleWolfTameResult(result);
    if (dedicatedServer) {
        sendToPlayer(owner, result);
    } else {
        const message = JSON.stringify(result);
        for (const [, peer] of peers) if (peer.dc?.readyState === "open") peer.dc.send(message);
    }
}

function handleWolfTameResult(message) {
    if (!message || typeof message.owner !== "string") return;
    const pending = wolfTamePending.get(message.requestId) || wolfTameUnacknowledged.get(message.requestId);
    if (message.owner === userName && !pending) return;
    const mob = mobs.find(mob => mob.id === message.id);
    if (!mob && pending && message.authority !== pending.authority) return;
    if (mob && message.authority !== mob.spawner && message.authority !== mob.petOwner &&
        !(message.success === true && mob.petOwner === message.owner)) return;
    if (mob && message.world === worldName && message.fed === true && Number.isFinite(message.hp) && message.hp > 0 &&
        Number.isFinite(message.feedRevision) && message.feedRevision > (mob.feedRevision || 0)) {
        mob.hp = message.hp;
        mob.maxHp = Math.max(message.hp, Number.isFinite(message.maxHp) ? message.maxHp : 12);
        mob.feedRevision = message.feedRevision;
    }
    if (message.owner === userName && pending && pending.request.id === message.id) {
        wolfTamePending.delete(message.requestId);
        wolfTameUnacknowledged.delete(message.requestId);
        if (message.fed === true && message.petOwner === userName && !combatRemovedPetIds.has(message.id)) {
            const pet = mob && mob.hp > 0 ? {
                id: message.id, hp: mob.hp, maxHp: mob.maxHp, feedRevision: mob.feedRevision, originSeed: mob.originSeed
            } : message;
            player.pets = sanitizePetData([...getPetSaveData(), pet]);
            addMessage(message.tamed ? "The Timber Wolf is now your pet! +10 HP" : "Fed your wolf! +10 HP", 2000);
        } else addMessage(combatRemovedPetIds.has(message.id) ? "This wolf was lost to combat." :
            message.fed ? "Fed the wolf! +10 HP" : "The wolf is no longer close enough to feed.", 1800);
    }
    if (mob && message.world === worldName && message.success === true && message.petOwner === message.owner &&
        !(message.owner === userName && combatRemovedPetIds.has(message.id))) {
        mob.petOwner = message.owner;
        mob.spawner = message.owner;
        mob.aiState = "FOLLOW";
    }
}

function findPlayerPetPosition(petId, index = 0) {
    const centerX = player.x + (player.width || 0.8) / 2;
    const centerZ = player.z + (player.depth || 0.8) / 2;
    let fallback = null;
    for (const radius of [2, 3, 1, 4, 0]) {
        const steps = radius ? 8 : 1;
        for (let step = 0; step < steps; step++) {
            const angle = index * Math.PI * 2 / 3 + step * Math.PI / 4;
            let x = Math.floor(centerX + Math.cos(angle) * radius) + 0.5;
            let z = Math.floor(centerZ + Math.sin(angle) * radius) + 0.5;
            if (ufoRide && player.onGround && mobs.includes(ufoRide.mob)) {
                const support = getUfoGroundSupport(x, z, player.y + 2.05, player.y - 2.05, ufoRide.mob, 0, 0);
                if (support && !petPositionBlocked(x, support.y, z) &&
                    !mobs.some(mob => mob.id !== petId && mob.petOwner === userName &&
                        Math.hypot(mob.pos.x - x, mob.pos.y - support.y, mob.pos.z - z) < 1.5)) {
                    return { x, y: support.y, z };
                }
                continue;
            }
            if (!ufoOffMap) {
                x = modWrap(x, MAP_SIZE);
                z = modWrap(z, MAP_SIZE);
            }
            if (![[-0.45, -0.45], [-0.45, 0.45], [0.45, -0.45], [0.45, 0.45]]
                .every(([dx, dz]) => isPositionInLoadedSpace(x + dx, z + dz))) continue;
            for (const dy of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
                const y = player.y + dy;
                if (y < 1 || checkCollisionWithBlock(x, y, z) || checkCollisionWithBlock(x, y + 0.4, z)) continue;
                if (mobs.some(mob => mob.id !== petId && mob.petOwner === userName &&
                    Math.hypot(mob.pos.x - x, mob.pos.y - y, mob.pos.z - z) < 1.5)) continue;
                const position = { x, y, z };
                const block = getBlockAt(x, y, z);
                if (isSolid(getBlockAt(x, y - 0.2, z)) || block === 6 || block === 136) return position;
                if (!fallback) fallback = position;
            }
        }
    }
    return fallback;
}

function petPositionBlocked(x, y, z) {
    return [[-.45, -.45], [-.45, .45], [.45, -.45], [.45, .45], [0, 0]]
        .some(([dx, dz]) => checkCollisionWithBlock(x + dx, y, z + dz) ||
            checkCollisionWithBlock(x + dx, y + .4, z + dz));
}

function resetPetMotion(mob) {
    mob.vx = mob.vz = mob.vy = mob.lungeVy = 0;
    mob.aiState = "FOLLOW";
    mob.isMoving = false;
}

function boardPlayerPet(mob, hull) {
    hull.mesh.updateMatrixWorld(true);
    resetPetMotion(mob);
    mob.petTransport = {
        hull, local: hull.mesh.worldToLocal(mob.pos.clone()),
        rotation: hull.mesh.quaternion.clone(),
        owner: new THREE.Vector3(player.x, player.y, player.z), world: worldName, vy: 0
    };
}

// Only the pet's owner simulates transport; observers receive the usual mob position updates.
function updatePlayerPetTransport(mob, dt) {
    if (mob.petOwner !== userName || !(mob.hp > 0)) return false;
    let ride = mob.petTransport;
    if (player.health <= 0 || (ride && ride.world !== worldName)) {
        delete mob.petTransport;
        resetPetMotion(mob);
        return false;
    }
    const hull = player.onGround && ufoRide && mobs.includes(ufoRide.mob) && !ufoRide.mob.deathProcessed
        ? ufoRide.mob : null;
    if (!ride && hull) {
        const support = getUfoGroundSupport(mob.pos.x, mob.pos.z, mob.pos.y + 2.05, mob.pos.y - .3, hull, 0, 0);
        if (support) {
            mob.pos.y = support.y;
            boardPlayerPet(mob, hull);
            ride = mob.petTransport;
        }
    }
    if (!ride) return false;
    if (ride.hull && ride.hull === hull) {
        hull.mesh.updateMatrixWorld(true);
        mob.pos.copy(hull.mesh.localToWorld(ride.local.clone()));
        const rotation = hull.mesh.quaternion.clone().multiply(ride.rotation.clone().invert());
        mob.mesh.quaternion.premultiply(rotation);
        ride.rotation.copy(hull.mesh.quaternion);
    } else if (ride.hull) {
        ride.hull = null;
        ride.vy = player.vy;
        resetPetMotion(mob);
    }
    let dx = player.x + (player.width || .8) / 2 - mob.pos.x;
    let dz = player.z + (player.depth || .8) / 2 - mob.pos.z;
    if (!ufoOffMap) {
        dx = modWrap(dx + MAP_SIZE / 2, MAP_SIZE) - MAP_SIZE / 2;
        dz = modWrap(dz + MAP_SIZE / 2, MAP_SIZE) - MAP_SIZE / 2;
    }
    const distance = Math.hypot(dx, dz);
    const step = Math.min(Math.max(0, distance - 2.5), mob.speed * 1.2 * dt);
    let nx = mob.pos.x + (distance ? dx / distance * step : 0) + (mob.vx || 0) * dt;
    let nz = mob.pos.z + (distance ? dz / distance * step : 0) + (mob.vz || 0) * dt;
    if (!ufoOffMap && !ride.hull) {
        nx = modWrap(nx, MAP_SIZE);
        nz = modWrap(nz, MAP_SIZE);
    }
    mob.isMoving = false;
    if (ride.hull) {
        const support = getUfoGroundSupport(nx, nz, mob.pos.y + 2.05, mob.pos.y - 2.05, hull, 0, 0);
        if (support && !petPositionBlocked(nx, support.y, nz)) {
            mob.isMoving = step > 0 || Math.abs(mob.vx) + Math.abs(mob.vz) > .01;
            mob.pos.set(nx, support.y, nz);
        } else if (Math.abs(mob.vx) + Math.abs(mob.vz) > .01 && !petPositionBlocked(nx, mob.pos.y, nz)) {
            mob.pos.x = nx;
            mob.pos.z = nz;
            ride.hull = null;
            ride.vy = 0;
        }
        if (ride.hull) ride.local.copy(hull.mesh.worldToLocal(mob.pos.clone()));
    } else {
        if (!petPositionBlocked(nx, mob.pos.y, nz)) {
            mob.pos.x = nx;
            mob.pos.z = nz;
            mob.isMoving = step > 0;
        }
        // Share the owner's actual gravity displacement, including terrain-generation pauses.
        // Once the owner lands, finish any remaining height difference with normal gravity.
        let targetY;
        if (!player.onGround || player.y < ride.owner.y) {
            targetY = mob.pos.y + player.y - ride.owner.y;
            ride.vy = player.vy;
        } else {
            ride.vy = Math.min(0, ride.vy) - gravity * dt;
            targetY = mob.pos.y + ride.vy * dt;
        }
        const support = hull && targetY <= mob.pos.y
            ? getUfoGroundSupport(mob.pos.x, mob.pos.z, mob.pos.y + .001, targetY - .3, hull, 0, 0) : null;
        if (support && !petPositionBlocked(mob.pos.x, support.y, mob.pos.z)) {
            mob.pos.y = support.y;
            boardPlayerPet(mob, hull);
            return true;
        }
        const loaded = [[-.45, -.45], [-.45, .45], [.45, -.45], [.45, .45]]
            .every(([ox, oz]) => isPositionInLoadedSpace(mob.pos.x + ox, mob.pos.z + oz));
        let landed = false;
        if (targetY >= MAX_HEIGHT || loaded) {
            let safeY = mob.pos.y;
            while (safeY > targetY) {
                const nextY = Math.max(targetY, safeY - .25);
                if (nextY < MAX_HEIGHT && petPositionBlocked(mob.pos.x, nextY, mob.pos.z)) {
                    landed = true;
                    break;
                }
                safeY = nextY;
            }
            if (targetY > safeY && !petPositionBlocked(mob.pos.x, targetY, mob.pos.z)) safeY = targetY;
            mob.pos.y = safeY;
        } else if (mob.pos.y > MAX_HEIGHT) {
            mob.pos.y = MAX_HEIGHT;
        }
        if (landed) {
            resetPetMotion(mob);
            delete mob.petTransport;
        }
    }
    if (step > 0) faceEliteMob(mob, dx, dz, 8, dt);
    mob.vx *= Math.max(0, 1 - 4 * dt);
    mob.vz *= Math.max(0, 1 - 4 * dt);
    ride.owner.set(player.x, player.y, player.z);
    mob.aiState = "FOLLOW";
    return true;
}

function maintainPlayerPets() {
    if (!chunkManager || !worldArchetype || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return;
    for (const [index, pet] of getPetSaveData().entries()) {
        let mob = mobs.find(mob => mob.id === pet.id);
        if (!mob) {
            const position = findPlayerPetPosition(pet.id, index);
            if (!position) continue;
            mob = spawnMobAndBroadcast("timber_wolf", position.x, position.z, position.y,
                { id: pet.id, petOwner: userName, hp: pet.hp, maxHp: pet.maxHp,
                    feedRevision: pet.feedRevision, originSeed: pet.originSeed });
        }
        mob.petOwner = userName;
        mob.spawner = userName;
        if (!mob.petTransport && Math.hypot(mob.pos.x - player.x, mob.pos.y - player.y, mob.pos.z - player.z) > 64) {
            const position = findPlayerPetPosition(pet.id, index);
            if (!position) continue;
            mob.pos.set(position.x, position.y, position.z);
            mob.prevPos.copy(mob.pos);
            mob.targetPos.copy(mob.pos);
            resetPetMotion(mob);
            mob.mesh.position.copy(mob.pos);
            queueEliteMobUpdate(mob);
        }
        if (!mob.petTransport && ufoRide && player.onGround && mobs.includes(ufoRide.mob)) {
            const support = getUfoGroundSupport(mob.pos.x, mob.pos.z, mob.pos.y + .3, mob.pos.y - .3, ufoRide.mob, 0, 0);
            if (support) boardPlayerPet(mob, support.mob);
        }
    }
    for (const [id, pending] of wolfTamePending) {
        if (Date.now() - pending.startedAt >= 15000) {
            wolfTameUnacknowledged.set(id, pending);
            wolfTamePending.delete(id);
            addMessage("No response from the wolf. You can try feeding again.", 1800);
            continue;
        }
        if (pending.request.world !== worldName || Date.now() - pending.sentAt < 3000) continue;
        const mob = mobs.find(mob => mob.id === pending.request.id);
        if (mob) sendWolfAuthorityMessage(mob, pending.request);
        pending.sentAt = Date.now();
    }
}

function handleMobDamageFromMob(target, source, damage) {
    if (!target || !source || target === source || !(target.hp > 0) || !(source.hp > 0) ||
        !(damage > 0) || !Number.isFinite(damage) || !isMobAuthority(target)) return;
    if (source.type === "timber_wolf" && target.type === "timber_wolf") return;
    if (!target.pos || !source.pos) return;
    // Wolves bite at close range; projectile mobs also shoot from high above the terrain.
    const reach = source.type === "timber_wolf" ? 4 :
        isEliteMobType(source.type) || source.type === "ufo_saucer" ? 350 : 6;
    const distance = Math.hypot(target.pos.x - source.pos.x, target.pos.y - source.pos.y, target.pos.z - source.pos.z);
    if (!Number.isFinite(distance) || distance > reach) return;
    target.hurt(Math.min(source.type === "timber_wolf" ? 2 : 50, damage),
        `${source.type === "timber_wolf" ? "wolf" : "mob"}:${source.id}`);
}

function sendMobDamageFromMob(target, source, damage) {
    if (!target || !source || !isMobAuthority(source)) return;
    if (isMobAuthority(target)) handleMobDamageFromMob(target, source, damage);
    else sendWolfAuthorityMessage(target, {
        type: "mob_hit", id: target.id, sourceMobId: source.id, damage, username: userName, world: worldName
    });
}

function findLegacyMobTarget(mob) {
    const candidates = [{ x: player.x, y: player.y, z: player.z, health: player.health, username: userName },
        ...getWolfTargets()];
    for (const [name, pos] of Object.entries(userPositions)) {
        if (pos.world === worldName) candidates.push({
            x: pos.targetX, y: pos.targetY, z: pos.targetZ, health: pos.health || 20, username: name
        });
    }
    let best = null;
    for (const target of candidates) {
        if (!(target.health > 0) || Math.abs(target.y - mob.pos.y) >= 30) continue;
        const distance = Math.hypot(target.x - mob.pos.x, target.y - mob.pos.y, target.z - mob.pos.z);
        if (!best || distance < best.distance) best = { ...target, distance };
    }
    return best;
}

function createMobGlowSprite(color, size, opacity = 1) {
    if (!mobGlowTexture) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext("2d"),
            gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gradient, ctx.fillRect(0, 0, 64, 64);
        mobGlowTexture = new THREE.CanvasTexture(canvas);
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mobGlowTexture,
        color: color,
        transparent: !0,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: !1
    }));
    sprite.scale.set(size, size, size);
    return sprite;
}

function isAquaticMobType(type) {
    return type === "fish_rare" || type === "fish_school" || type === "whale";
}

function findAquaticSpawnPosition(x, z, type) {
    const minimumDepth = type === "whale" ? 11 : 3;
    const wx = modWrap(Math.floor(x), MAP_SIZE);
    const wz = modWrap(Math.floor(z), MAP_SIZE);
    let surfaceY = -1;
    for (let y = Math.min(MAX_HEIGHT - 1, 63); y > 0; y--) {
        if (getBlockAt(wx, y, wz) === 6 || getBlockAt(wx, y, wz) === 136) {
            surfaceY = y;
            break;
        }
    }
    if (surfaceY < 1) return null;
    let floorY = surfaceY;
    while (floorY > 0 && (getBlockAt(wx, floorY, wz) === 6 || getBlockAt(wx, floorY, wz) === 136)) floorY--;
    const depth = surfaceY - floorY;
    if (depth < minimumDepth) return null;
    const swimY = Math.max(floorY + 1, surfaceY - 1 - Math.floor(Math.random() * Math.max(1, depth - 1)));
    return { x: wx + 0.5, y: swimY + 0.5, z: wz + 0.5, surfaceY };
}

function nearestAquaticSpawnPosition(x, z, type) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = type === "fish_school"
            ? 48 + Math.random() * 48
            : attempt === 0 ? 0 : 4 + Math.random() * 28;
        const position = findAquaticSpawnPosition(x + Math.cos(angle) * distance, z + Math.sin(angle) * distance, type);
        if (position) return position;
    }
    return null;
}

function createAquaticFishSkinTexture(seed, type, baseColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    const base = new THREE.Color(baseColor);
    const accent = new THREE.Color().setHSL((base.getHSL({}).h + 0.34) % 1, 0.88, 0.67);
    const random = makeSeededRandom(seed + "_fish_pattern_" + type);
    context.fillStyle = "#" + base.getHexString();
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#" + accent.getHexString();
    const pattern = Math.floor(random() * 3);
    if (pattern === 0) {
        const stripeWidth = 5 + Math.floor(random() * 8);
        const gap = 13 + Math.floor(random() * 13);
        for (let x = 8; x < canvas.width; x += stripeWidth + gap) {
            context.globalAlpha = 0.68;
            context.fillRect(x, 0, stripeWidth, canvas.height);
        }
    } else if (pattern === 1) {
        for (let i = 0; i < 16; i++) {
            context.globalAlpha = 0.55 + random() * 0.35;
            context.beginPath();
            context.ellipse(random() * canvas.width, random() * canvas.height, 3 + random() * 5, 4 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
            context.fill();
        }
    } else {
        for (let y = -8; y < canvas.height + 8; y += 12) {
            for (let x = (y / 12 % 2) * 8; x < canvas.width; x += 16) {
                context.globalAlpha = 0.55;
                context.beginPath();
                context.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2);
                context.fill();
            }
        }
    }
    context.globalAlpha = 1;
    if (type === "fish_rare") {
        context.fillStyle = "#fff3a3";
        for (let i = 0; i < 5; i++) {
            context.beginPath();
            context.arc(14 + i * 23, 32 + Math.sin(i * 1.3) * 15, 2, 0, Math.PI * 2);
            context.fill();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function Mob(t, e, s, i = "crawley", aquaticY = null, originSeed = null) {
    this.lastDamageTime = 0, this.lastRegenTime = 0;
    let yPos = i === "ufo_saucer" ? 220 : (isAquaticMobType(i) || isEliteMobType(i)) && Number.isFinite(aquaticY) ? aquaticY : chunkManager.getSurfaceY(t, e) + 1;
    if (i === "spider") {
        yPos = chunkManager.getCeilingY(t, e, 60) - 0.5; // Spawn on cavern ceiling instead of floor
        // Check if spawn was in sky
        if (yPos >= chunkManager.getSurfaceY(t, e)) {
             yPos = chunkManager.getSurfaceY(t, e) + 1; // Put it on surface temporarily
             this.invalidSpawn = true; // Flag for instant death
        }
    }
    if (this.id = s || Date.now(), this.type = i, this.originSeed = originSeed || worldSeed, this.pos = new THREE.Vector3(t, yPos, e), this.prevPos = new THREE.Vector3().copy(this.pos), this.targetPos = (new THREE.Vector3).copy(this.pos), this.prevQuaternion = new THREE.Quaternion(), this.targetQuaternion = new THREE.Quaternion, this.lastQuaternionUpdate = 0, this.lastUpdateTime = 0, this.interpolationDuration = 100, this.vx = 0, this.vz = 0, this.hp = 10, this.speed = "bee" === this.type ? .04 + .02 * Math.random() : .02 + .03 * Math.random(), this.attackCooldown = 0, this.flashEnd = 0, this.aiState = "bee" === this.type ? "SEARCHING_FOR_FLOWER" : "IDLE", this.hasPollen = !1, this.lingerTime = 0, this.animationTime = Math.random() * Math.PI * 2, this.isMoving = !1, "bee" === this.type) {
        const t = makeSeededRandom(worldSeed + "_bee_aggro")();
        this.isAggressive = t > .5
    } else if (isAquaticMobType(this.type)) {
        this.mesh = new THREE.Group();
        const variant = makeSeededRandom(this.originSeed + "_aquatic_look_" + this.type)();
        const hue = this.type === "whale" ? 0.52 + variant * 0.22 : this.type === "fish_rare" ? (0.88 + variant * 0.34) % 1 : 0.42 + variant * 0.28;
        this.aquaticColor = new THREE.Color().setHSL(hue, 0.72 + variant * 0.2, this.type === "whale" ? 0.62 : 0.56).getHex();
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: this.aquaticColor });
        const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xffe7d7 });
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x111522 });
        const shineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const finMaterial = new THREE.MeshLambertMaterial({ color: this.aquaticColor });
        if (this.type === "whale") {
            this.hp = 40;
            this.speed = 0.012 + 0.003 * Math.random();
            this.isAggressive = false;
            this.breachAt = Date.now() + 30000 + Math.random() * 60000;
            this.body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bodyMaterial);
            this.body.scale.set(4.2, 2.6, 6.4);
            this.mesh.add(this.body);
            const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), bellyMaterial);
            belly.scale.set(3.65, 1.75, 5.8);
            belly.position.y = -0.7;
            this.mesh.add(belly);
            this.tail = new THREE.Group();
            const flukeShape = new THREE.Shape();
            flukeShape.moveTo(0, 0.5);
            flukeShape.quadraticCurveTo(1.2, 0.65, 2.7, 1.25);
            flukeShape.quadraticCurveTo(3.5, 1.55, 3.8, 1.15);
            flukeShape.quadraticCurveTo(3.45, 0.4, 3.1, -0.15);
            flukeShape.quadraticCurveTo(2.25, -0.2, 1.55, 0.3);
            flukeShape.quadraticCurveTo(0.7, -0.45, 0, -0.55);
            flukeShape.quadraticCurveTo(-0.7, -0.45, -1.55, 0.3);
            flukeShape.quadraticCurveTo(-2.25, -0.2, -3.1, -0.15);
            flukeShape.quadraticCurveTo(-3.45, 0.4, -3.8, 1.15);
            flukeShape.quadraticCurveTo(-3.5, 1.55, -2.7, 1.25);
            flukeShape.quadraticCurveTo(-1.2, 0.65, 0, 0.5);
            flukeShape.closePath();
            const flukeGeometry = new THREE.ExtrudeGeometry(flukeShape, { depth: 1.2, bevelEnabled: false });
            flukeGeometry.translate(0, 0, -0.6);
            flukeGeometry.scale(1.2, 1.1, 1);
            const fluke = new THREE.Mesh(flukeGeometry, new THREE.MeshLambertMaterial({ color: this.aquaticColor, side: THREE.DoubleSide }));
            fluke.rotation.x = -Math.PI / 2;
            this.tail.add(fluke);
            this.tail.position.z = -7;
            this.mesh.add(this.tail);
            const whaleEyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (const side of [-1, 1]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8), whaleEyeWhite);
                eye.position.set(side * 2.25, 0.55, 5.05);
                this.mesh.add(eye);
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), eyeMaterial);
                pupil.position.set(side * 2.25, 0.5, 5.5);
                this.mesh.add(pupil);
                const shine = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), shineMaterial);
                shine.position.set(side * 2.17, 0.62, 5.7);
                this.mesh.add(shine);
                const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffa6b8 }));
                cheek.position.set(side * 2.55, -0.55, 4.45);
                this.mesh.add(cheek);
            }
            const smileGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.45, -0.4, 5.65),
                new THREE.Vector3(-0.8, -0.7, 6.15),
                new THREE.Vector3(0, -0.78, 6.4),
                new THREE.Vector3(0.8, -0.7, 6.15),
                new THREE.Vector3(1.45, -0.4, 5.65)
            ]);
            this.smile = new THREE.Line(smileGeometry, new THREE.LineBasicMaterial({ color: 0x24324b, linewidth: 4 }));
            this.mesh.add(this.smile);
            const angryMouthGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.3, -0.55, 5.75),
                new THREE.Vector3(-0.7, -0.38, 6.2),
                new THREE.Vector3(0, -0.32, 6.4),
                new THREE.Vector3(0.7, -0.38, 6.2),
                new THREE.Vector3(1.3, -0.55, 5.75)
            ]);
            this.angryMouth = new THREE.Line(angryMouthGeometry, new THREE.LineBasicMaterial({ color: 0x24324b, linewidth: 5 }));
            this.angryMouth.visible = false;
            this.mesh.add(this.angryMouth);
            this.angryBrows = [];
            for (const side of [-1, 1]) {
                const brow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.2), new THREE.MeshLambertMaterial({ color: 0x24324b }));
                brow.position.set(side * 2.2, 1.12, 5.1);
                brow.rotation.z = side * -0.32;
                brow.visible = false;
                this.mesh.add(brow);
                this.angryBrows.push(brow);
            }
            this.fins = [];
            for (const side of [-1, 1]) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 5.2), finMaterial);
                fin.position.set(side * 3.15, -0.55, 0.8);
                fin.rotation.y = side * 0.32;
                fin.rotation.z = side * 0.32;
                this.mesh.add(fin);
                this.fins.push(fin);
            }
            const dorsalShape = new THREE.Shape();
            dorsalShape.moveTo(-1.3, 0.05);
            dorsalShape.quadraticCurveTo(-0.5, 0.3, -0.1, 1.35);
            dorsalShape.quadraticCurveTo(0.15, 0.85, 0.65, 0.45);
            dorsalShape.quadraticCurveTo(1.05, 0.12, 1.45, 0.05);
            dorsalShape.closePath();
            this.dorsalFin = new THREE.Mesh(new THREE.ShapeGeometry(dorsalShape), new THREE.MeshLambertMaterial({ color: this.aquaticColor, side: THREE.DoubleSide }));
            this.dorsalFin.rotation.y = Math.PI / 2;
            this.dorsalFin.position.y = 2.4;
            this.mesh.add(this.dorsalFin);
            this.mesh.scale.setScalar(0.5);
            this.spout = new THREE.Group();
            const spray = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.5, 6), new THREE.MeshLambertMaterial({ color: 0xa9edff, transparent: true, opacity: 0.75 }));
            spray.position.y = 1.25;
            this.spout.add(spray);
            this.spout.position.set(0, 2.3, 3.7);
            this.mesh.add(this.spout);
            this.spout.visible = false;
            this.breach = false;
            this.breachEnd = 0;
            this.waterSurfaceY = yPos;
            this.hp = 40;
        } else {
            const rare = this.type === "fish_rare";
            this.hp = rare ? 12 : 8;
            this.speed = rare ? 0.045 : 0.035;
            this.body = new THREE.Mesh(new THREE.SphereGeometry(rare ? 0.58 : 0.42, 8, 6), bodyMaterial);
            this.body.scale.set(rare ? 0.9 : 0.72, 0.68, rare ? 1.15 : 1.35);
            this.mesh.add(this.body);
            const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 5), bellyMaterial);
            belly.scale.set(0.65, 0.35, 1.15);
            belly.position.y = -0.22;
            this.mesh.add(belly);
            this.tail = new THREE.Group();
            const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.75), finMaterial);
            tailFin.position.z = -0.42;
            this.tail.add(tailFin);
            this.tail.position.z = -0.75;
            this.mesh.add(this.tail);
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.55), finMaterial);
            fin.position.set(0, 0.48, -0.05);
            this.mesh.add(fin);
            this.fins = [fin];
            this.mesh.eyes = [];
            for (const side of [-1, 1]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), eyeMaterial);
                eye.position.set(side * 0.24, 0.11, 0.4);
                this.mesh.add(eye);
                const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), shineMaterial);
                shine.position.set(side * 0.24 - 0.025, 0.15, 0.49);
                this.mesh.add(shine);
                this.mesh.eyes.push(eye);
            }
            if (rare) {
                const crest = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 5), finMaterial);
                crest.position.set(0, 0.58, -0.05);
                this.mesh.add(crest);
            }
            const fishTraits = makeSeededRandom(this.originSeed + "_fish_traits_" + this.type + "_" + this.id);
            this.pattern = Math.floor(fishTraits() * 3);
            this.isAggressive = rare && fishTraits() < 0.2;
            this.size = rare ? 1 : 0.6 + fishTraits() * 0.9;
            if (!rare) this.mesh.scale.setScalar(this.size);
            this.body.material.map = createAquaticFishSkinTexture(this.originSeed, this.type, this.aquaticColor);
            this.body.material.color.set(0xffffff);
            this.body.material.needsUpdate = true;
            if (this.isAggressive) {
                this.aquaticColor = new THREE.Color().setHSL(hue, 0.95, 0.48).getHex();
                this.body.material.color.set(this.aquaticColor);
                finMaterial.color.set(this.aquaticColor);
            }
        }
    } else if ("ufo_saucer" === this.type) {
        this.isAggressive = !0;
    } else if ("spider" === this.type) {
        this.isAggressive = !0;
    } else if ("cow" === this.type) {
        this.hp = 30;
        this.speed = 0.015 + 0.01 * Math.random();
        this.isAggressive = false;
        this.aiState = "IDLE";
        this.animationTime = Math.random() * Math.PI * 2;
        this.eatTimer = 0;
        this.fallenTimer = 0;

        this.mesh = new THREE.Group();

        const bodyTex = createMobTexture(this.originSeed, "cow_body");
        const headTex = createMobTexture(this.originSeed, "cow_head");

        const bodyMat = new THREE.MeshLambertMaterial({ map: bodyTex });
        this.headMat = new THREE.MeshLambertMaterial({ map: headTex });
        // Generate alternate textures for blinking and sleeping
        this.headTexBlink = createMobTexture(this.originSeed, "cow_head_blink");
        this.headTexSleep = createMobTexture(this.originSeed, "cow_head_sleep");

        const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        this.mesh.add(body);

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.8);
        this.headMesh = new THREE.Mesh(headGeo, this.headMat);
        this.headMesh.position.set(0, 1.1, 1.1);
        this.mesh.add(this.headMesh);

        const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        this.mesh.legs = [];

        const positions = [
            [-0.4, 0.4, 0.7], [0.4, 0.4, 0.7],
            [-0.4, 0.4, -0.7], [0.4, 0.4, -0.7]
        ];

        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(positions[i][0], positions[i][1], positions[i][2]);
            this.mesh.add(leg);
            this.mesh.legs.push(leg);
        }

        this.originalColor = null;
    } else if ("spider" === this.type) {
        this.mesh = new THREE.Group;
        const t = new THREE.MeshLambertMaterial({
            color: 0x1a1a1a
        });
        const e = makeSeededRandom(worldSeed + "_spider_eye_color_" + this.id)();
        let s;
        if (e < 0.33) s = 0xcccccc; // Pale white
        else if (e < 0.66) s = 0x888888; // Grey
        else s = 0x000000; // Black
        if (this.invalidSpawn) {
             this.hp = -1;
        } else {
             this.hp = 15;
        }
        this.speed = 0.05 + 0.02 * Math.random();
        const i = new THREE.MeshBasicMaterial({
            color: s
        });
        const o = new THREE.BoxGeometry(.9, .4, .9);
        const h = new THREE.Mesh(o, t);
        this.mesh.add(h);
        const a = new THREE.BoxGeometry(.2, .2, .1);
        const n = new THREE.Mesh(a, i);
        n.position.set(-.25, .1, -.45);
        this.mesh.add(n);
        const r = new THREE.Mesh(a, i);
        r.position.set(.25, .1, -.45);
        this.mesh.add(r);
        this.mesh.legs = [];
        const p = new THREE.BoxGeometry(.1, .8, .1);
        for (let e = 0; e < 8; e++) {
            const s = new THREE.Mesh(p, t),
                i = e % 2 == 0 ? 1 : -1;
            s.position.set(.45 * i, 0, .3 * (Math.floor(e / 2) - 1.5));
            this.mesh.add(s);
            this.mesh.legs.push(s);
        }
        this.originalColor = new THREE.Color(0x1a1a1a);
    }

    if ("grub" === this.type) {
        this.hp = 40, this.speed = (.01 + .005 * Math.random()) / 2, this.aiState = "IDLE", this.animationTime = Math.random() * Math.PI * 2, this.cactusEaten = 0, this.isAggressive = !1;
        const t = 3,
            e = createMobTexture(worldSeed, "grub_body"),
            s = createMobTexture(worldSeed, "grub_body", !0),
            i = createMobTexture(worldSeed, "grub_mouth"),
            o = new THREE.MeshLambertMaterial({
                map: e
            }),
            h = new THREE.MeshLambertMaterial({
                map: s
            }),
            a = [h, h, h, h, h, h];
        this.originalColor = null, this.mesh = new THREE.Group, this.segments = [], this.legs = [], this.pinchers = [], this.headPivot = new THREE.Object3D;
        const n = 6;
        for (let e = 0; e < n; e++) {
            let s = (1 - .5 * Math.pow(e / n, 2)) * t;
            4 === e && (s *= .8), 5 === e && (s *= .4);
            const i = new THREE.BoxGeometry(1.2 * s, .8 * s, .8 * s),
                o = new THREE.Mesh(i, a);
            o.userData.originalMaterial = o.material, this.segments.push(o), e < 2 ? this.headPivot.add(o) : this.mesh.add(o)
        }
        this.segments[0].position.z = 1.05 * t, this.segments[1].position.z = .35 * t, this.segments[2].position.z = -1.4 * t, this.segments[3].position.z = .7 * -3 * t, this.segments[4].position.z = (.2 - 2.8) * t, this.segments[5].position.z = -3 * t, this.headPivot.position.z = -1.05 * t, this.mesh.add(this.headPivot);
        for (let e = 1; e < 5; e++)
            if (e % 2 != 0) {
                let s = (1 - .5 * Math.pow(e / n, 2)) * t;
                const i = new THREE.BoxGeometry(.1 * t, .5 * t, .1 * t),
                    h = new THREE.Mesh(i, o);
                h.position.set(.6 * -s, -.3 * t, 0), this.segments[e].add(h), this.legs.push(h);
                const a = new THREE.Mesh(i, o);
                a.position.set(.6 * s, -.3 * t, 0), this.segments[e].add(a), this.legs.push(a)
            } const r = this.segments[0],
                l = new THREE.MeshBasicMaterial({
                    color: 0
                }),
                p = new THREE.BoxGeometry(.1 * t, .1 * t, .1 * t),
                c = new THREE.Mesh(p, l);
        c.position.set(-.6 * t, .2 * t, 0), r.add(c);
        const d = new THREE.Mesh(p, l);
        d.position.set(.6 * t, .2 * t, 0), r.add(d);
        const m = new THREE.BoxGeometry(.4 * t, .1 * t, .1 * t),
            y = new THREE.MeshLambertMaterial({
                map: i
            }),
            g = new THREE.Mesh(m, y);
        g.position.set(0, -.2 * t, .45 * t), r.add(g);
        const f = new THREE.BoxGeometry(.1 * t, .3 * t, .1 * t),
            E = new THREE.Mesh(f, y);
        E.position.set(-.4 * t, -.2 * t, .5 * t), E.rotation.z = Math.PI / 6, r.add(E), this.pinchers.push(E);
        const u = new THREE.Mesh(f, y);
        u.position.set(.4 * t, -.2 * t, .5 * t), u.rotation.z = -Math.PI / 6, r.add(u), this.pinchers.push(u);
        const M = makeSeededRandom(worldSeed + "_grub_glow_" + this.id),
            w = (new THREE.Color).setHSL(M(), .7 + .3 * M(), .5 + .2 * M());
        this.glowLight = createMobGlowSprite(w, 2.2 * t, 0), this.glowLight.position.set(0, .2 * t, -1.05 * t), this.mesh.add(this.glowLight);
        const T = new THREE.MeshLambertMaterial({
            color: 16711680
        });
        this.redMaterials = Array(a.length).fill(T)
    } else if ("ufo_saucer" === this.type) {
        this.hp = 3000;
        idleUfoIds.add(this.id);
        // Double the ~45-second descent from spawn height 220 to hover height 108.
        this.attackCooldown = 90;
        this.mesh = new THREE.Group();
        this.ufoHullColumns = new Map();
        const hullRandom = makeSeededRandom(this.originSeed + "_ufo_hull_" + this.id);

        // Build Star Destroyer voxel construct
        const voxelSize = 2;
        const width = 60; // Max width at the back
        const length = 100; // Total length
        const height = 15; // Max height of main body

        const voxelPositions = [];
        const voxelColors = [];

        // Colors for voxels
        const hullColor = new THREE.Color(0x888888);
        const darkHullColor = new THREE.Color(0x666666);
        const engineColor = new THREE.Color(0x00ffff);
        const bridgeColor = new THREE.Color(0x777777);

        // Generate main triangular wedge
        for (let z = 0; z < length; z += voxelSize) {
            const currentWidth = width * (z / length); // Tapers to 0 at z=0 (nose)
            const currentHeight = height * (z / length);

            for (let x = -currentWidth / 2; x <= currentWidth / 2; x += voxelSize) {
                // Outer edges are thinner, center is thicker
                const distanceToEdge = (currentWidth / 2) - Math.abs(x);
                const localMaxHeight = Math.max(1, currentHeight * (distanceToEdge / (currentWidth / 2)));

                for (let y = -voxelSize; y < localMaxHeight; y += voxelSize) {
                    // Introduce greebling by occasionally omitting surface voxels or raising them
                    const isSurface = (y + voxelSize >= localMaxHeight) || (y === -voxelSize);
                    let yOffset = 0;
                    let color = hullColor;

                    if (isSurface) {
                        const r = hullRandom();
                        if (r < 0.05) continue; // Small holes/greebling
                        if (r > 0.85) {
                            yOffset += voxelSize; // Raised greebling
                            color = darkHullColor;
                        } else if (r > 0.7) {
                            color = darkHullColor;
                        }
                    }

                    voxelPositions.push(new THREE.Vector3(x, y + yOffset, z - length/2));
                    voxelColors.push(color);
                    const columnKey = `${x},${z}`;
                    const top = y + yOffset + voxelSize/2;
                    const column = this.ufoHullColumns.get(columnKey);
                    if (!column || top > column.top) {
                        this.ufoHullColumns.set(columnKey, { x: -x, z: length/2 - z, top });
                    }
                }
            }
        }

        // Remove the bridge completely

        // Use InstancedMesh for performance
        const geo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.2 });
        const instancedMesh = new THREE.InstancedMesh(geo, mat, voxelPositions.length);

        const dummy = new THREE.Object3D();
        const tempColor = new THREE.Color();

        for (let i = 0; i < voxelPositions.length; i++) {
            dummy.position.copy(voxelPositions[i]);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
            tempColor.copy(voxelColors[i]);
            instancedMesh.setColorAt(i, tempColor);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;

        // Rotate so it lays flat (X/Z plane) and points forward (+Z or -Z depending on orientation, we want nose forward)
        // Nose is currently at z = -length/2 because of `z - length/2`. We want nose forward, which is +Z in three.js typically?
        // Let's match original rotation logic where nose points in target direction
        instancedMesh.rotation.y = Math.PI; // Point nose in the correct direction

        this.mesh.add(instancedMesh);

        // Engines at the rear (z = length/2 rotated by PI, so effectively -length/2 in mesh space)
        const rearZ = length/2 - voxelSize;
        const engineLight1 = createMobGlowSprite(0x00ffff, voxelSize * 4);
        engineLight1.userData.engineGlow = true;
        engineLight1.position.set(-width*0.2, 0, rearZ);
        this.mesh.add(engineLight1);

        const engineLight2 = createMobGlowSprite(0x00ffff, voxelSize * 4);
        engineLight2.userData.engineGlow = true;
        engineLight2.position.set(width*0.2, 0, rearZ);
        this.mesh.add(engineLight2);

        const engineLight3 = createMobGlowSprite(0x00ffff, voxelSize * 4);
        engineLight3.userData.engineGlow = true;
        engineLight3.position.set(0, height*0.3, rearZ);
        this.mesh.add(engineLight3);

        this.originalColor = null;
    } else if (isEliteMobType(this.type)) {
        buildEliteMob(this);
    }
    if (this.mesh) { this.mesh.userData.mobId = this.id; this.mesh.position.set(this.pos.x, this.pos.y + (("crawley" === this.type || "spider" === this.type) ? 0.45 : 0), this.pos.z); scene.add(this.mesh); this.lastSentPos = new THREE.Vector3().copy(this.pos); this.lastSentQuaternion = new THREE.Quaternion().copy(this.mesh.quaternion); }
}

function manageMobs() {
    if (!worldArchetype) return;

    if (Date.now() - lastMobManagement < 5e3) return;
    lastMobManagement = Date.now();

    // 1. Find all players in the current world
    const playersInWorld = [];
    playersInWorld.push({ name: userName, x: player.x, y: player.y, z: player.z, score: Number(player.score) || 0 });
    for (const [peerName, pos] of Object.entries(userPositions)) {
        if (pos.world === worldName && pos.targetX !== undefined) {
            playersInWorld.push({ name: peerName, x: pos.targetX, y: pos.targetY, z: pos.targetZ, score: Number.isFinite(pos.score) ? pos.score : 0 });
        }
    }
    announceMobEvolution(player.score);

    // 2. Group players into active areas (clusters within 96 blocks)
    const activeAreas = [];
    for (const p of playersInWorld) {
        let foundArea = false;
        for (const area of activeAreas) {
            // Check if player is within 96 blocks of any player in the area
            for (const areaPlayer of area.players) {
                if (Math.hypot(p.x - areaPlayer.x, p.z - areaPlayer.z) < 96) {
                    area.players.push(p);
                    foundArea = true;
                    break;
                }
            }
            if (foundArea) break;
        }
        if (!foundArea) {
            activeAreas.push({ players: [p] });
        }
    }

    // 3. Determine if we are the spawner for any active area
    let mySpawningAreas = [];
    window.isSpawnerForCurrentWorld = false;

    for (const area of activeAreas) {
        let spawner = area.players[0].name;
        // Host overrides lowest alphabetical name if present in the area
        let hostInArea = false;
        for (const p of area.players) {
            if (isAuthority() && p.name === userName) {
                hostInArea = true;
                break;
            }
            if (!isAuthority() && peers.has(p.name)) {
                // There is a host in this area
                hostInArea = true;
                spawner = p.name;
                break;
            }
        }
        if (!hostInArea) {
            for (const p of area.players) {
                if (p.name < spawner) {
                    spawner = p.name;
                }
            }
        }

        if (dedicatedServer) spawner = isAuthority() ? userName : null;
        if (spawner === userName) {
            mySpawningAreas.push(area);
            window.isSpawnerForCurrentWorld = true;
            // Tag each area with its spawner
            area.spawner = spawner;
        } else {
            // Even if we aren't the spawner, tag it so we know who is
            area.spawner = spawner;
        }
    }

    // Assign mobs to their nearest active area so we can check if we have authority over them
    for (const mob of mobs) {
        if (mob.type === "ufo_saucer") {
            continue;
        }
        if (mob.petOwner) {
            mob.spawner = mob.petOwner;
            continue;
        }
        if (dedicatedServer) {
            if (isAuthority()) mob.spawner = userName;
            continue;
        }
        let nearestArea = null;
        let minDistance = Infinity;
        for (const area of activeAreas) {
            for (const p of area.players) {
                const d = Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z);
                if (d < minDistance) {
                    minDistance = d;
                    nearestArea = area;
                }
            }
        }
        if (nearestArea && minDistance < 96) {
            mob.spawner = nearestArea.spawner;
        } else if (isWideRangeMobType(mob.type) && (mob.spawner === userName || (mob.spawner && peers.has(mob.spawner)))) {
            // Wide-ranging mobs keep their owner while they roam the owner's loaded map beyond 96 blocks.
        } else {
            mob.spawner = null;
        }
    }

    // Each client requests its own encounter once, independent of area-spawner changes.
    const now = performance.now();
    if (window.lastMoveTime === undefined) window.lastMoveTime = now;
    if (!window.idleUfoEncountered && now - window.lastMoveTime >= 3600000) {
        window.idleUfoEncountered = true;
        spawnMobAndBroadcast("ufo_saucer", player.x, player.z, null, null, userName);
    }

    // Despawn mobs that are too far from ANY player in their active area
    const allowedTypes = (isNight ? worldArchetype.mobSpawnRules.night : worldArchetype.mobSpawnRules.day).slice();

    mobs = mobs.filter((mob) => {
        if (mob.petOwner) {
            const ownerHere = mob.petOwner === userName || userPositions[mob.petOwner]?.world === worldName;
            if (ownerHere) return true;
            scene.remove(mob.mesh);
            disposeObject(mob.mesh);
            return false;
        }
        // Score-tier checks run only on the mob's authority, which has the freshest scores for its area.
        const isAuthority = isMobAuthority(mob);
        const isWideRange = isWideRangeMobType(mob.type);
        // Wide-ranging mobs stay until their chunk leaves the authority's loaded map; other clients wait for
        // the authority's mob_despawn instead of culling them by distance.
        const isNearAnyPlayer = isWideRange
            ? (isAuthority ? isPositionInLoadedSpace(mob.pos.x, mob.pos.z) ||
                (dedicatedServer && playersInWorld.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < 96)) : true)
            : playersInWorld.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < 96);
        const isAllowedType = isEliteMobType(mob.type)
            ? !isAuthority || isEliteMobAllowedAt(mob.type, mob.pos.x, mob.pos.z, playersInWorld)
            : allowedTypes.includes(mob.type) && !(isAuthority && isMobTypeRetiredAt(mob.type, mob.pos.x, mob.pos.z, playersInWorld));

        if (mob.type === "ufo_saucer") {
            // Its authority handles departure; riders and observers cannot change its flight.
            return true;
        } else if (!isNearAnyPlayer || !isAllowedType) {
            // Only the person who "owns" the despawn should send it, but let's have everyone clean up their own locally.
            // If we are a spawner for the area the mob *was* in, broadcast despawn.
            // A simpler approach: Anyone can locally despawn if it's too far from everyone.
            // If they are a spawner, they broadcast it.
            if (mob.engineAudio) mob.engineAudio.pause();
            if (mob.engineAudio2) mob.engineAudio2.pause();
            scene.remove(mob.mesh);
            disposeObject(mob.mesh);
            markMobRecentlyRemoved(mob.id);

            // We should only broadcast despawn if we are a spawner for an area near the mob, or if we are host.
            // Since active areas can shift, it's safest to just let whoever sees it too far broadcast it.
            // To avoid spam, let's just let the host or the lowest name broadcast despawn, OR just everyone cleans it up locally.
            // For multiplayer consistency, let's just have everyone send the despawn if they see it. WebRTC dedups it anyway.
            const t = JSON.stringify({
                type: "mob_despawn",
                id: mob.id,
                world: worldName
            });
            for (const [peerName, peer] of peers.entries()) {
                if (peerName !== userName && peer.dc && peer.dc.readyState === "open") {
                    peer.dc.send(t);
                }
            }
            return false;
        }
        return true;
    });

    for (const [key, command] of getCurrentWorldState().spawnCommands) {
        const mobId = `fish-command:${worldName}:${key}`;
        if (mobs.some(mob => mob.id === mobId)) continue;
        const ownerArea = mySpawningAreas.find(area => area.players.some(p => Math.hypot(command.x - p.x, command.z - p.z) < 96));
        if (ownerArea) applyFishSpawnCommand(command);
    }

    // Spawn new mobs for our active areas
    for (const area of mySpawningAreas) {
        const areaScore = Math.max(0, ...area.players.map(p => Number(p.score) || 0));
        const areaEvolution = getMobEvolution(areaScore);
        const areaTypes = allowedTypes.filter(type => !areaEvolution.retired.has(type)).concat(getEliteSpawnTypes(areaScore));
        for (const type of areaTypes) {
            let maxCount;
            if ("crawley" === type) maxCount = 10;
            else if ("bee" === type) maxCount = 8;
            else if ("grub" === type) maxCount = getWideRangeMobCap("grub");
            else if ("spider" === type) maxCount = 6;
            else if ("fish_school" === type) maxCount = 6;
            else if ("fish_rare" === type) maxCount = 1;
            else if ("whale" === type) maxCount = 3;
            else if (isEliteMobType(type)) {
                maxCount = isWideRangeMobType(type) ? getWideRangeMobCap(type) : getEliteMobDef(type).maxCount;
                if (!hasEliteWorldCapacity(type)) continue;
                if (Math.random() > getEliteMobDef(type).spawnChance) continue;
            }
            else continue;
            if (type === "fish_rare" && Math.random() > 0.12) continue;
            if (type === "whale" && Math.random() > 0.025) continue;

            // Count mobs of this type in this specific area (wide-ranging types count the whole loaded map)
            let countInArea = isWideRangeMobType(type) ? countMobsOfType(type) : 0;
            for (const mob of mobs) {
                if (mob.type === type && !mob.petOwner) {
                    // Check if mob is near this area
                    if (isWideRangeMobType(type)) { /* already counted globally */ } else if (area.players.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < 96)) { countInArea++; }
                }
            }

            if (countInArea < maxCount) {
                let spawnX, spawnZ;

                {
                    const randomPlayer = area.players[Math.floor(Math.random() * area.players.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 32 + 64 * Math.random() / 2;
                    spawnX = modWrap(randomPlayer.x + Math.cos(angle) * distance, MAP_SIZE);
                    spawnZ = modWrap(randomPlayer.z + Math.sin(angle) * distance, MAP_SIZE);
                }

                let spawnY = null;
                let waterSurfaceY = null;
                let eliteSpawn = null;
                if (isAquaticMobType(type)) {
                    const spawnPlayer = area.players[Math.floor(Math.random() * area.players.length)];
                    const aquaticSpawn = nearestAquaticSpawnPosition(spawnPlayer.x, spawnPlayer.z, type);
                    if (!aquaticSpawn) continue;
                    spawnX = aquaticSpawn.x;
                    spawnZ = aquaticSpawn.z;
                    spawnY = aquaticSpawn.y;
                    waterSurfaceY = aquaticSpawn.surfaceY;
                } else if (isEliteMobType(type)) {
                    eliteSpawn = getEliteSpawnPosition(type, area.players[Math.floor(Math.random() * area.players.length)]);
                    if (!eliteSpawn) continue;
                    spawnX = eliteSpawn.x;
                    spawnZ = eliteSpawn.z;
                    spawnY = eliteSpawn.y;
                    if (Number.isFinite(eliteSpawn.waterSurfaceY)) waterSurfaceY = eliteSpawn.waterSurfaceY;
                } else if (type === "cow") {
                    const surfaceY = chunkManager.getSurfaceY(spawnX, spawnZ);
                    if (getBlockAt(spawnX, surfaceY, spawnZ) !== 2) continue; // Grass block
                    // Limit to 20 cows in vicinity
                    let localCows = mobs.filter(m => m.type === "cow" && Math.hypot(m.pos.x - spawnX, m.pos.z - spawnZ) < 200).length;
                    if (localCows >= 20) continue;
                }
                const newMob = spawnMobAndBroadcast(type, spawnX, spawnZ, spawnY);
                if (waterSurfaceY !== null) newMob.waterSurfaceY = waterSurfaceY;
                if (eliteSpawn) onEliteMobSpawned(newMob, eliteSpawn);
            }
        }
    }
}

// Creates a mob owned by this client, queues its first update and announces it to peers.
function spawnMobAndBroadcast(type, x, z, y = null, pet = null, ufoTarget = null) {
    const newMob = new Mob(x, z, pet ? pet.id : Date.now() + Math.random(), type, y, pet?.originSeed);
    newMob.petOwner = pet?.petOwner || null;
    newMob.spawner = newMob.petOwner || userName;
    if (type === "ufo_saucer") rememberUfoRewardAuthority(String(newMob.id), worldName, userName, newMob.pos);
    newMob.ufoTarget = ufoTarget;
    if (pet) {
        newMob.hp = pet.hp;
        newMob.maxHp = pet.maxHp;
        newMob.feedRevision = pet.feedRevision || 0;
    }
    mobs.push(newMob);

    if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
    window.mobUpdateQueue.push({
        id: newMob.id,
        x: newMob.pos.x,
        y: newMob.pos.y,
        z: newMob.pos.z,
        quaternion: newMob.mesh.quaternion.toArray(),
        isMoving: newMob.isMoving,
        aiState: newMob.aiState,
        type: newMob.type,
        hp: newMob.hp,
        maxHp: newMob.maxHp,
        feedRevision: newMob.feedRevision || 0,
        isAggressive: newMob.isAggressive,
        originSeed: newMob.originSeed,
        petOwner: newMob.petOwner,
        spawner: newMob.spawner,
        ufoTarget: newMob.ufoTarget,
        lingerTime: newMob.lingerTime,
        attackCooldown: newMob.attackCooldown
    });

    const spawnMsg = JSON.stringify({
        type: "mob_spawn",
        id: newMob.id,
        x: newMob.pos.x,
        y: newMob.pos.y,
        z: newMob.pos.z,
        hp: newMob.hp,
        maxHp: newMob.maxHp,
        feedRevision: newMob.feedRevision || 0,
        mobType: newMob.type,
        isAggressive: newMob.isAggressive,
        originSeed: newMob.originSeed,
        petOwner: newMob.petOwner,
        spawner: newMob.spawner,
        ufoTarget: newMob.ufoTarget,
        lingerTime: newMob.lingerTime,
        attackCooldown: newMob.attackCooldown,
        world: worldName,
        username: userName
    });

    if (isAuthority() || peers.size === 0) {
        for (const [peerName, peer] of peers.entries()) {
            const peerWorld = userPositions[peerName] ? userPositions[peerName].world : worldName;
            if (peerName !== userName && peer.dc && peer.dc.readyState === "open" && peerWorld === worldName) {
                peer.dc.send(spawnMsg);
            }
        }
    } else {
        // Client sends to host, host will relay
        for (const [peerName, peer] of peers.entries()) {
            if (peer.dc && "open" === peer.dc.readyState) {
                peer.dc.send(spawnMsg);
                break;
            }
        }
    }
    return newMob;
}

function handleMobHit(t, toolId = null) {
    const damage = 4 * getPickaxeMultiplier(toolId);
    const isLocalSpawner = isMobAuthority(t);
    if (t.spawnCommandKey && typeof canRemoveFishSpawnCommand === "function" && !canRemoveFishSpawnCommand(t.spawnCommandKey, userName)) {
        addMessage("You cannot catch a fish in another player's owned chunk.", 2500);
        return;
    }
    // We shouldn't set lastMoveTime here, we do it in projectile logic (main.js). If we do it here, it will trigger for anyone handling the hit, not just the user.
    if (isLocalSpawner) {
        t.hurt(damage, userName);
    } else {
        const spawnerPeer = peers.get(t.spawner);
        const recipients = spawnerPeer && spawnerPeer.dc && spawnerPeer.dc.readyState === "open"
            ? [[t.spawner, spawnerPeer]] : peers.entries();
        // Send directly to the spawner when connected; otherwise the host routes the hit.
        for (const [e, s] of recipients) {
            if (s.dc && "open" === s.dc.readyState) {
                console.log(`[WebRTC] Sending mob_hit to ${e}`);
                s.dc.send(JSON.stringify({
                    type: "mob_hit",
                    id: t.id,
                    damage: damage,
                    toolId: toolId,
                    username: userName
                }));
            }
        }
    }
    safePlayAudioAt(soundHit, t.pos), addMessage("Hit mob!", 800)
}
function updateAquaticMob(t, delta) {
    const isLocalSpawner = isMobAuthority(t);
    const now = Date.now();
    t.animationTime += delta * (t.type === "whale" ? 2.2 : 7);
    t.body.material.color.set(now < t.flashEnd ? 0xff4444 : t.aquaticColor);
    if (!isLocalSpawner) {
        if (t.lastUpdateTime > 0) {
            const blend = 1 - Math.exp(-delta * (t.type === "whale" ? 4 : 8));
            t.pos.lerp(t.targetPos, blend);
            if (t.lastQuaternionUpdate > 0) {
                t.mesh.quaternion.slerp(t.targetQuaternion, blend);
            }
        } else {
            t.pos.copy(t.targetPos);
        }
    } else {
        let target = null;
        let curiousAboutPlayer = false;
        if (t.type === "whale") {
            if (t.wasAttacked) {
                const candidates = [{ name: userName, x: player.x, y: player.y, z: player.z }, ...getWolfTargets()];
                for (const [name, pos] of Object.entries(userPositions)) {
                    if (pos.world === worldName && pos.targetX !== undefined) {
                        candidates.push({ name, x: pos.targetX, y: pos.targetY, z: pos.targetZ });
                    }
                }
                candidates.sort((a, b) => Math.hypot(a.x - t.pos.x, a.y - t.pos.y, a.z - t.pos.z) - Math.hypot(b.x - t.pos.x, b.y - t.pos.y, b.z - t.pos.z));
                target = candidates[0] || null;
                if (target && Math.hypot(target.x - t.pos.x, target.y - t.pos.y, target.z - t.pos.z) < 3 && now - t.attackCooldown > 1400) {
                    t.attackCooldown = now;
                    if (target.mob) {
                        sendMobDamageFromMob(target.mob, t, 2);
                    } else if (target.name !== userName) {
                        sendToPlayer(target.name, { type: "player_damage", damage: 2, attacker: "whale" });
                    } else if (target.name === userName) {
                        player.health = Math.max(0, player.health - 2);
                        lastDamageTime = now;
                        updateHealthBar();
                        const healthElement = document.getElementById("health");
                        if (healthElement) healthElement.innerText = player.health;
                        addMessage("Bonked by a whale! HP: " + player.health, 1200);
                        if (player.health <= 0) handlePlayerDeath();
                    }
                }
            } else {
                const prey = mobs.filter(m => m.type === "fish_school" || m.type === "fish_rare" || m.type === "crawley");
                prey.sort((a, b) => t.pos.distanceTo(a.pos) - t.pos.distanceTo(b.pos));
                const meal = prey.find(mob => t.pos.distanceTo(mob.pos) < (mob.type === "crawley" ? 32 : 48));
                if (meal) {
                    target = meal.pos;
                    if (t.pos.distanceTo(meal.pos) < (meal.type === "crawley" ? 4.5 : 1.8) && now - (t.lastMealTime || 0) > 3000) {
                        t.lastMealTime = now;
                        sendMobDamageFromMob(meal, t, Math.max(1, meal.hp));
                    }
                }
            }
        } else {
            const whales = mobs.filter(m => m.type === "whale");
            whales.sort((a, b) => t.pos.distanceTo(a.pos) - t.pos.distanceTo(b.pos));
            const nearbyWhale = whales[0];
            if (nearbyWhale && t.pos.distanceTo(nearbyWhale.pos) < 30) {
                const away = t.pos.clone().sub(nearbyWhale.pos);
                away.y = 0;
                if (away.lengthSq() < 0.01) away.set(Math.cos(t.animationTime), 0, Math.sin(t.animationTime));
                target = t.pos.clone().add(away.normalize().multiplyScalar(14));
            }

            const nearbyPlayers = [{ name: userName, x: player.x, y: player.y, z: player.z }, ...getWolfTargets()];
            for (const [name, pos] of Object.entries(userPositions)) {
                if (pos.world === worldName && Number.isFinite(pos.targetX) && Number.isFinite(pos.targetY) && Number.isFinite(pos.targetZ)) {
                    nearbyPlayers.push({ name, x: pos.targetX, y: pos.targetY, z: pos.targetZ });
                }
            }
            nearbyPlayers.sort((a, b) =>
                Math.hypot(a.x - t.pos.x, a.y - t.pos.y, a.z - t.pos.z) -
                Math.hypot(b.x - t.pos.x, b.y - t.pos.y, b.z - t.pos.z));
            const nearestPlayer = nearbyPlayers[0];
            const playerDistance = nearestPlayer ? Math.hypot(nearestPlayer.x - t.pos.x, nearestPlayer.y - t.pos.y, nearestPlayer.z - t.pos.z) : Infinity;
            if (t.isAggressive && playerDistance < 10) {
                target = nearestPlayer;
                if (playerDistance < 1.6 && now - t.attackCooldown > 1600) {
                    t.attackCooldown = now;
                    if (nearestPlayer.mob) {
                        sendMobDamageFromMob(nearestPlayer.mob, t, 1);
                    } else if (nearestPlayer.name !== userName) {
                        sendToPlayer(nearestPlayer.name, { type: "player_damage", damage: 1, attacker: "fish" });
                    } else if (nearestPlayer.name === userName) {
                        player.health = Math.max(0, player.health - 1);
                        lastDamageTime = now;
                        updateHealthBar();
                        const healthElement = document.getElementById("health");
                        if (healthElement) healthElement.innerText = player.health;
                        addMessage("Bitten by an aggressive fish! HP: " + player.health, 1200);
                        if (player.health <= 0) handlePlayerDeath();
                    }
                }
            } else if (!target && t.type === "fish_school" && playerDistance > 4 && playerDistance < 9) {
                const away = new THREE.Vector3(t.pos.x - nearestPlayer.x, 0, t.pos.z - nearestPlayer.z);
                if (away.lengthSq() < 0.01) away.set(Math.cos(t.animationTime), 0, Math.sin(t.animationTime));
                away.normalize();
                target = { x: nearestPlayer.x + away.x * 6, y: nearestPlayer.y, z: nearestPlayer.z + away.z * 6 };
                curiousAboutPlayer = true;
            } else if (!target && playerDistance < 4) {
                const away = t.pos.clone().sub(new THREE.Vector3(nearestPlayer.x, nearestPlayer.y, nearestPlayer.z));
                away.y = 0;
                if (away.lengthSq() < 0.01) away.set(Math.cos(t.animationTime), 0, Math.sin(t.animationTime));
                target = t.pos.clone().add(away.normalize().multiplyScalar(12));
            }

            if (!target && t.type === "fish_school") {
                const schoolmates = mobs.filter(m => m !== t && m.type === "fish_school" && t.pos.distanceTo(m.pos) < 14);
                if (schoolmates.length) {
                    target = new THREE.Vector3();
                    for (const mate of schoolmates) target.add(mate.pos);
                    target.multiplyScalar(1 / schoolmates.length);
                }
            }
        }

        if (!target) {
            if (!t.nextWanderChange || now > t.nextWanderChange) {
                t.nextWanderChange = now + 1800 + Math.random() * 3800;
                const angle = Math.random() * Math.PI * 2;
                t.wanderDirection = new THREE.Vector3(Math.cos(angle), (Math.random() - 0.5) * 0.4, Math.sin(angle)).normalize();
            }
            target = t.pos.clone().add((t.wanderDirection || new THREE.Vector3(1, 0, 0)).clone().multiplyScalar(8));
        }

        if (target && target.x !== undefined) {
            const dx = target.x - t.pos.x;
            const dz = target.z - t.pos.z;
            const distance = Math.hypot(dx, dz);
            if (distance > 0.1) {
                const maxSpeed = t.speed * 60 * (t.type === "whale" ? 0.7 : curiousAboutPlayer ? 0.2 : 1);
                const desiredVelocity = new THREE.Vector3(dx / distance * maxSpeed, 0, dz / distance * maxSpeed);
                t.swimVelocity = t.swimVelocity || new THREE.Vector3();
                t.swimVelocity.lerp(desiredVelocity, 1 - Math.exp(-delta * (t.type === "whale" ? 1.8 : 3.5)));
                const nx = modWrap(t.pos.x + t.swimVelocity.x * delta, MAP_SIZE);
                const nz = modWrap(t.pos.z + t.swimVelocity.z * delta, MAP_SIZE);
                const desiredY = target.y === undefined
                    ? t.pos.y + Math.sin(t.animationTime * 0.35) * 0.08 * delta
                    : t.pos.y + Math.max(-0.3, Math.min(0.3, target.y - t.pos.y)) * (1 - Math.exp(-delta * 0.8));
                let nextY = desiredY;
                let targetBlock = getBlockAt(nx, nextY, nz);
                if (targetBlock !== 6 && targetBlock !== 136) {
                    let nearestWaterY = null;
                    for (let offset = 0; offset <= 12 && nearestWaterY === null; offset++) {
                        for (const sign of offset === 0 ? [1] : [1, -1]) {
                            const candidateY = Math.floor(desiredY) + offset * sign;
                            if (candidateY >= 0 && candidateY < MAX_HEIGHT) {
                                const candidateBlock = getBlockAt(nx, candidateY, nz);
                                if (candidateBlock === 6 || candidateBlock === 136) {
                                    nearestWaterY = candidateY + 0.5;
                                    targetBlock = candidateBlock;
                                    break;
                                }
                            }
                        }
                    }
                    if (nearestWaterY !== null) nextY = nearestWaterY;
                }
                const horizontalBlock = getBlockAt(nx, nextY, nz);
                if (horizontalBlock === 6 || horizontalBlock === 136) {
                    t.pos.set(nx, nextY, nz);
                    const targetYaw = Math.atan2(dx, dz);
                    const yawDifference = Math.atan2(Math.sin(targetYaw - t.mesh.rotation.y), Math.cos(targetYaw - t.mesh.rotation.y));
                    t.mesh.rotation.y += yawDifference * (1 - Math.exp(-delta * (t.type === "whale" ? 1.4 : 4)));
                    t.isMoving = true;
                } else {
                    t.wanderDirection = new THREE.Vector3(-dz, (Math.random() - 0.5) * 0.5, dx).normalize();
                    t.isMoving = false;
                }
            }
        }

        if (t.type === "whale") {
            if (!t.breach && now >= t.breachAt) {
                const surface = findAquaticSpawnPosition(t.pos.x, t.pos.z, "fish_school");
                if (surface) {
                    t.breach = true;
                    t.breachStart = now;
                    t.breachEnd = now + 2000;
                    t.breachBaseY = t.pos.y;
                    t.breachSurfaceY = surface.surfaceY + 1;
                    t.breachPeakY = t.breachSurfaceY + 5;
                    t.breachAt = now + 45000 + Math.random() * 90000;
                } else {
                    t.breachAt = now + 15000;
                }
            }
            if (t.breach) {
                const progress = Math.min(1, (now - t.breachStart) / (t.breachEnd - t.breachStart));
                t.pos.y = t.breachBaseY + (t.breachPeakY - t.breachBaseY) * Math.sin(progress * Math.PI);
                if (now >= t.breachEnd) {
                    t.breach = false;
                    t.pos.y = t.breachBaseY;
                }
            }
        }
    }

    if (t.type === "whale") {
        const angry = !!t.wasAttacked;
        t.smile.visible = !angry;
        t.angryMouth.visible = angry;
        t.angryBrows.forEach(brow => brow.visible = angry);
        if (!t.nextSpout || now > t.nextSpout) {
            t.spoutUntil = now + 1100;
            t.nextSpout = now + 45000 + Math.random() * 50000;
        }
        t.spout.visible = now < t.spoutUntil;
        const swimSpeed = t.swimVelocity ? t.swimVelocity.length() : t.isMoving ? t.speed * 60 * 0.7 : 0;
        t.tailPhase = (t.tailPhase || 0) + delta * (0.25 + swimSpeed * 0.8);
        t.tail.rotation.x = Math.sin(t.tailPhase) * 0.42;
        t.fins.forEach((fin, index) => fin.rotation.z = (index ? -1 : 1) * (0.14 + Math.sin(t.animationTime * 1.2) * 0.08));
    } else {
        t.tail.rotation.y = Math.sin(t.animationTime * 2.4) * 0.65;
        t.fins[0].rotation.x = Math.sin(t.animationTime * 1.8) * 0.2;
    }
    t.mesh.position.set(t.pos.x, t.pos.y + (t.type === "whale" ? 0 : Math.sin(t.animationTime * 1.5) * 0.08), t.pos.z);
    const moved = t.pos.distanceTo(t.lastSentPos) > 0.1;
    const rotated = t.mesh.quaternion.angleTo(t.lastSentQuaternion) > 0.01;
    if (isLocalSpawner && (moved || rotated || t.lastSentOriginSeed !== t.originSeed)) {
        if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
        window.mobUpdateQueue.push({
            id: t.id,
            x: t.pos.x,
            y: t.pos.y,
            z: t.pos.z,
            quaternion: t.mesh.quaternion.toArray(),
            isMoving: t.isMoving,
            aiState: t.aiState,
            type: t.type,
            hp: t.hp,
            isAggressive: t.isAggressive,
            wasAttacked: t.wasAttacked,
            originSeed: t.originSeed,
            spawnCommandKey: t.spawnCommandKey
        });
        t.lastSentPos.copy(t.pos);
        t.lastSentQuaternion.copy(t.mesh.quaternion);
        t.lastSentOriginSeed = t.originSeed;
    }
}
Mob.prototype.update = function (t) {
    if (isAquaticMobType(this.type)) {
        updateAquaticMob(this, t);
        return;
    }
    if (isEliteMobType(this.type)) {
        updateEliteMob(this, t);
        return;
    }
    if ("bee" === this.type) {
        this.animationTime += 40 * t;
        this.mesh.leftWing.rotation.z = .5 * Math.sin(this.animationTime);
        this.mesh.rightWing.rotation.z = -.5 * Math.sin(this.animationTime);
    }
    // Determine if we should run the local simulation logic (spawner) or client interpolation logic
    const isLocalSpawner = isMobAuthority(this);

    if (!isLocalSpawner) {
    if ("crawley" === this.type && this.mesh.eyeLight) this.mesh.eyeLight.visible = isNight;
    if ("grub" === this.type && this.glowLight) {
        this.glowLight.material.opacity = isNight ? ((Math.sin(.002 * Date.now()) + 1) / 2 * .8 + .4) / 1.2 * .7 : 0;
    }
    if (this.lastUpdateTime > 0) {
        const now = performance.now();
        const blend = Math.min(1, (now - this.lastUpdateTime) / this.interpolationDuration);
        this.pos.copy(this.prevPos).lerp(this.targetPos, blend);
        this.mesh.position.set(this.pos.x, this.pos.y + (("crawley" === this.type || "spider" === this.type) ? 0.45 : 0), this.pos.z);
        if (this.lastQuaternionUpdate > 0) {
            const quaternionBlend = Math.min(1, (now - this.lastQuaternionUpdate) / this.interpolationDuration);
            this.mesh.quaternion.copy(this.prevQuaternion).slerp(this.targetQuaternion, quaternionBlend);
        }
    } else this.pos.copy(this.targetPos), this.mesh.position.set(this.pos.x, this.pos.y + (("crawley" === this.type || "spider" === this.type) ? 0.45 : 0), this.pos.z);
        Date.now() < this.flashEnd ? "grub" === this.type ? this.segments.forEach((t => {
            t.material = this.redMaterials
        })) : this.mesh.material ? this.mesh.material.color.set(16711680) : this.mesh.children[0].material.color.set(16711680) : "grub" === this.type ? this.segments.forEach((t => {
            const e = t.userData.originalMaterial;
            e && (t.material = e)
        })) : this.originalColor && (this.mesh.material ? this.mesh.material.color.copy(this.originalColor) : this.mesh.children[0].material.color.copy(this.originalColor))
    } else if ("ufo_saucer" === this.type) {
        if (isAuthority(worldName) || peers.size === 0) {
            const issuer = adoptUfoRewardFallback(this.id, worldName, userName);
            if (issuer?.authority === userName) this.spawner = userName;
        }
        if (this.pos.y >= 8000 || hasUfoAltitudeRider(this)) {
            this.die(null, "altitude");
            return;
        }
        this.lingerTime += t * 1000;

        const lights = this.mesh.children.filter(c => c.userData.engineGlow);
        if (lights.length > 0) {
            const intensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
            lights.forEach(l => l.material.opacity = intensity);
        }

        if (!this.engineAudio) {
            const engineTemplate = document.getElementById('ufoEngine');
            if (engineTemplate) {
                this.engineAudio = engineTemplate.cloneNode(true);
                this.engineAudio.loop = true;
                this.engineAudio.play().catch(e => {});
            }
            this.engineAudioStartTime = Date.now();
            this.engineAudio2Delay = 20000 + Math.random() * 20000; // 20-40 seconds delay
            this.engineAudio2Started = false;
        }

        if (this.engineAudio && !this.engineAudio2Started && Date.now() - this.engineAudioStartTime > this.engineAudio2Delay) {
            const engineTemplate = document.getElementById('ufoEngine');
            if (engineTemplate) {
                this.engineAudio2 = engineTemplate.cloneNode(true);
                this.engineAudio2.loop = true;
                this.engineAudio2.play().catch(e => {});
                this.engineAudio2Started = true;
            }
        }

        if (this.engineAudio) {
            const distToPlayer = Math.hypot(player.x - this.pos.x, player.y - this.pos.y, player.z - this.pos.z);
            const maxAudioDistance = 32;
            let volume = 0;
            if (distToPlayer < maxAudioDistance) {
                volume = Math.pow(Math.max(0, 1 - distToPlayer / maxAudioDistance), rolloffFactor);
            }
            this.engineAudio.volume = volume;
            if (this.engineAudio2) {
                this.engineAudio2.volume = volume;
            }
        }

        if (this.lingerTime >= 240000) {
            this.aiState = "LEAVING";
        }
        const target = this.ufoTarget === userName
            ? { x: player.x, y: player.y, z: player.z, lastMoveTime: window.lastMoveTime, world: worldName }
            : userPositions[this.ufoTarget];
        if (!target || target.world !== worldName ||
            performance.now() - (target.lastMoveTime ?? performance.now()) < 3600000) {
            this.aiState = "LEAVING";
        }

        if (this.aiState === "LEAVING") {
            if (this.engineAudio) {
                this.engineAudio.pause();
            }
            if (this.engineAudio2) {
                this.engineAudio2.pause();
            }
            this.pos.y += 10 * t;
            this.pos.x += Math.cos(this.mesh.rotation.y) * 10 * t;
            this.pos.z -= Math.sin(this.mesh.rotation.y) * 10 * t;
        } else {
            const targetPos = new THREE.Vector3(
                target.targetX ?? target.x ?? target.prevX,
                target.targetY ?? target.y ?? target.prevY,
                target.targetZ ?? target.z ?? target.prevZ
            );

            const dx = targetPos.x - this.pos.x;
            const dz = targetPos.z - this.pos.z;
            const dist = Math.hypot(dx, dz);

            if (dist > 40) {
                this.pos.x += (dx / dist) * 2.5 * t; // Slower movement speed
                this.pos.z += (dz / dist) * 2.5 * t;
            }

            // Hover closer to the ground than 220, e.g. targetPos.y + 60
            const baseTargetY = targetPos.y > 0 ? targetPos.y : chunkManager.getSurfaceY(this.pos.x, this.pos.z);
            let targetY = Math.max(baseTargetY + 40, 108); // Lower hover altitude, minimum height 108
            if (this.pos.y > targetY) {
                this.pos.y = Math.max(targetY, this.pos.y - 2.5 * t);
            } else if (this.pos.y < targetY) {
                this.pos.y = Math.min(targetY, this.pos.y + 2.5 * t);
            }

            // Smoothly rotate towards the target
            const targetRotation = Math.atan2(dx, dz);
            // Angle difference clamping to make the massive ship turn slowly
            let angleDiff = targetRotation - this.mesh.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.mesh.rotation.y += angleDiff * 0.25 * t; // Slower rotation

            this.attackCooldown -= t;
            if (this.attackCooldown <= 0 && dist < 60 && this.pos.y <= targetY + 1) {
                if (typeof createProjectile === "function") {
                    const offsets = [
                        new THREE.Vector3(-8, 0, 0),
                        new THREE.Vector3(8, 0, 0),
                        new THREE.Vector3(0, 0, -8),
                        new THREE.Vector3(0, 0, 8)
                    ];

                    let playedAudioThisFrame = false;

                    for (let i = 0; i < offsets.length; i++) {
                        const pid = this.id + '-' + Date.now() + '-' + i;
                        const pPos = this.pos.clone().add(offsets[i]);
                        const laserDir = new THREE.Vector3().subVectors(targetPos, pPos).normalize();

                        createProjectile(pid, this.id, pPos, laserDir.clone(), "blue", "mob");

                        if (!playedAudioThisFrame) {
                            const fireAudioTemplate = document.getElementById('ufoCannonFire');
                            if (fireAudioTemplate) {
                                safePlayAudioAt(fireAudioTemplate, pPos, maxAudioDistance, 0.75);
                            }
                            playedAudioThisFrame = true;
                        }

                        if (typeof window.laserFireQueue !== "undefined") {
                            window.laserFireQueue.push({
                                id: pid,
                                user: this.id, // Ensure this identifies the mob
                                damageSource: "mob",
                                world: typeof window.worldName !== "undefined" ? window.worldName : "",
                                position: { x: pPos.x, y: pPos.y, z: pPos.z },
                                direction: { x: laserDir.x, y: laserDir.y, z: laserDir.z },
                                color: "blue"
                            });
                        }
                    }
                }
                this.attackCooldown = 1.0;
            }
        }
        if (this.pos.y >= 8000 || hasUfoAltitudeRider(this)) {
            this.pos.y = Math.min(this.pos.y, 8000);
            this.die(null, "altitude");
            return;
        }
        this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
        if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
        window.mobUpdateQueue.push({
            id: this.id, type: this.type, x: this.pos.x, y: this.pos.y, z: this.pos.z,
            quaternion: this.mesh.quaternion.toArray(), hp: this.hp, aiState: this.aiState,
            spawner: this.spawner, ufoTarget: this.ufoTarget, lingerTime: this.lingerTime,
            attackCooldown: this.attackCooldown
        });
    } else {
        if (this.pos.x += this.vx * t, this.pos.z += this.vz * t, this.vx *= 1 - 2 * t, this.vz *= 1 - 2 * t, "spider" === this.type) {
            let ceilingY = chunkManager.getCeilingY(this.pos.x, this.pos.z, this.pos.y) - 0.5;

            // Safe access to player
            const spiderTarget = findLegacyMobTarget(this);
            const pExists = !!spiderTarget;
            if (pExists && this.aiState !== "FALLING") {
                let playerDist = Math.hypot(this.pos.x - spiderTarget.x, this.pos.z - spiderTarget.z);
                if (playerDist < 2.0 && this.pos.y > spiderTarget.y + 1) {
                    this.aiState = "FALLING";
                }
            }

            if (this.aiState === "FALLING") {
                this.pos.y -= 16 * t; // Fall down
                let floorY = chunkManager.getFloorY(this.pos.x, this.pos.z, this.pos.y + 16 * t);

                // Check if we hit the player
                if (pExists) {
                    let playerDistXZ = Math.hypot(this.pos.x - spiderTarget.x, this.pos.z - spiderTarget.z);
                    if (playerDistXZ < 1.5) {
                        let playerTopY = spiderTarget.y + 1.6;
                        if (this.pos.y <= playerTopY && this.pos.y > spiderTarget.y) {
                            this.pos.y = playerTopY;
                            this.aiState = "ATTACKING_PLAYER";
                            this.attackLinger = 0;

                            // Deal drop damage
                            this.lastEatTime = this.lastEatTime || 0;
                            if (Date.now() - this.lastEatTime > 1000) {
                                if (spiderTarget.mob) sendMobDamageFromMob(spiderTarget.mob, this, 2);
                                else if (spiderTarget.username !== userName) {
                                    sendToPlayer(spiderTarget.username, {
                                        type: "player_damage", damage: 2, attacker: "spider"
                                    });
                                } else {
                                player.health = Math.max(0, player.health - 2);
                                document.getElementById("health").innerText = player.health;
                                if (typeof updateHealthBar === 'function') updateHealthBar();
                                addMessage("Spider dropped on you! HP: " + player.health, 1000);
                                if (player.health <= 0 && typeof handlePlayerDeath === 'function') handlePlayerDeath();
                                }
                                this.lastEatTime = Date.now();
                            }
                        }
                    }
                }

                if (this.pos.y <= floorY && this.aiState === "FALLING") {
                    this.pos.y = floorY;
                    this.aiState = "SEARCHING"; // Landed
                }
            } else if (this.aiState === "ATTACKING_PLAYER") {
                if (pExists) {
                    this.pos.x = spiderTarget.x;
                    this.pos.z = spiderTarget.z;
                    this.pos.y = spiderTarget.y + 1.6;

                    this.attackLinger += t;
                    if (this.attackLinger > 2.0) {
                        this.aiState = "SEARCHING";
                    }
                } else {
                    this.aiState = "SEARCHING";
                }
            } else {
                 let floorY = chunkManager.getFloorY(this.pos.x, this.pos.z, this.pos.y + 1);
                 // Don't clip through floor
                 if (this.pos.y < floorY) this.pos.y = floorY;
                 // Don't clip through ceiling
                 if (this.pos.y > ceilingY) this.pos.y = ceilingY;
            }
        } else if ("crawley" === this.type) {
            for (const t of mobs)
                if (t.id !== this.id && "crawley" === t.type) {
                    const e = this.pos.x - t.pos.x,
                        s = this.pos.z - t.pos.z,
                        i = Math.hypot(e, s),
                        o = .9;
                    if (i < o) {
                        const t = (o - i) / i;
                        this.pos.x += e * t * .2, this.pos.z += s * t * .2
                    }
                } let e = this.pos.y;
            if (!checkCollisionWithBlock(this.pos.x, this.pos.y - 16 * t, this.pos.z)) {
                e = this.pos.y - 16 * t;
                // Make sure we don't fall below the actual surface if getSurfaceY is higher
                const surfaceY = chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 1;
                if (e < surfaceY && surfaceY < this.pos.y) e = surfaceY;
            } else {
                e = Math.ceil(this.pos.y - 16 * t);
            }
            for (const t of mobs)
                if (t.id !== this.id && "crawley" === t.type) {
                    Math.hypot(this.pos.x - t.pos.x, this.pos.z - t.pos.z) < .9 && t.pos.y < this.pos.y && (e = Math.max(e, t.pos.y + .9))
                } this.pos.y > e ? this.pos.y = Math.max(e, this.pos.y - 16 * t) : this.pos.y = e
        }
        let e = new THREE.Vector3(0, 0, 0),
            s = !1;
        if ("spider" === this.type) {
            const i = 12;
            let o = 1 / 0;
            let targetY = this.pos.y; // Keep track of target Y for climbing
            let ceilingY = chunkManager.getCeilingY(this.pos.x, this.pos.z, this.pos.y) - 0.5;

            // Periodically scan for light blocks to avoid 15k checks per frame
            this.lastBlockScanTime = this.lastBlockScanTime || 0;
            if (Date.now() - this.lastBlockScanTime > 1000) {
                this.lastBlockScanTime = Date.now();
                this.spiderTargetBlock = null;
                let closestDist = Infinity;
                let r = Math.ceil(i);
                const scannedChunks = new Map();
                for (let x = Math.floor(this.pos.x) - r; x <= Math.floor(this.pos.x) + r; x++) {
                    for (let y = Math.floor(this.pos.y) - r; y <= Math.floor(this.pos.y) + r; y++) {
                        if (y < 0 || y >= MAX_HEIGHT) continue;
                        for (let z = Math.floor(this.pos.z) - r; z <= Math.floor(this.pos.z) + r; z++) {
                            let cx = Math.floor(x / CHUNK_SIZE);
                            let cz = Math.floor(z / CHUNK_SIZE);
                            const chunkKey = `${cx},${cz}`;
                            let chunk = scannedChunks.get(chunkKey);
                            if (!scannedChunks.has(chunkKey)) {
                                chunk = chunkManager.getChunk(cx, cz);
                                scannedChunks.set(chunkKey, chunk);
                            }
                            if (!chunk) continue;
                            let lx = modWrap(x, CHUNK_SIZE);
                            let lz = modWrap(z, CHUNK_SIZE);
                            const blockId = chunk.get(lx, y, lz);
                            if (blockId === 120 || blockId === 134) {
                                const h = Math.hypot(x - this.pos.x, y - this.pos.y, z - this.pos.z);
                                if (h < closestDist && h < i) {
                                    closestDist = h;
                                    this.spiderTargetBlock = new THREE.Vector3(x, y, z);
                                }
                            }
                        }
                    }
                }
            }

            if (this.spiderTargetBlock) {
                const h = this.pos.distanceTo(this.spiderTargetBlock);
                if (h < i && h < o) {
                    o = h;
                    targetY = this.spiderTargetBlock.y;
                    e.subVectors(this.spiderTargetBlock, this.pos).normalize(); // ATTRACT
                    s = !0;
                    if (h < 1.5) {
                        chunkManager.setBlockGlobal(this.spiderTargetBlock.x, this.spiderTargetBlock.y, this.spiderTargetBlock.z, 0); // Eat the block

                        // Cleanup ghost lights
                        var d = `${this.spiderTargetBlock.x},${this.spiderTargetBlock.y},${this.spiderTargetBlock.z}`;
                        if (torchRegistry.delete(d) && typeof torchParticles !== 'undefined' && torchParticles.has(d)) {
                            var c = torchParticles.get(d);
                            scene.remove(c);
                            if (c.geometry) c.geometry.dispose();
                            if (c.material) c.material.dispose();
                            torchParticles.delete(d);
                        }
                        if (typeof lightManager !== 'undefined' && typeof player !== 'undefined') {
                            lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
                        }
                        this.spiderTargetBlock = null;
                    }
                }
            }

            if (typeof selectedBlockId !== 'undefined' && (selectedBlockId === 120 || selectedBlockId === 134) && typeof player !== 'undefined' && player !== null) {
                const playerPos = new THREE.Vector3(player.x, player.y, player.z);
                const h = this.pos.distanceTo(playerPos);
                if (h < i && h < o) {
                    o = h;
                    targetY = playerPos.y;
                    e.subVectors(playerPos, this.pos).normalize(); // ATTRACT
                    s = !0;
                    if (h < 1.5 && typeof INVENTORY !== 'undefined' && typeof selectedHotIndex !== 'undefined' && INVENTORY[selectedHotIndex]) {
                        // Eat torch/stone from inventory with cooldown
                        this.lastEatTime = this.lastEatTime || 0;
                        if (Date.now() - this.lastEatTime > 1000) {
                            INVENTORY[selectedHotIndex].count--;
                            if (INVENTORY[selectedHotIndex].count <= 0) {
                                INVENTORY[selectedHotIndex] = null;
                                selectedBlockId = null;
                            }
                            if (typeof updateHotbarUI === 'function') updateHotbarUI();
                            this.lastEatTime = Date.now();
                        }
                    }
                }
            }
            if (s && this.aiState !== "FALLING" && this.aiState !== "ATTACKING_PLAYER") {
                this.isMoving = !0;
                this.pos.add(e.multiplyScalar(this.speed * t * 60));

                // Allow vertical climbing towards target
                let maxClimbSpeed = 8 * t;
                if (targetY > this.pos.y) {
                    this.pos.y += Math.min(targetY - this.pos.y, maxClimbSpeed);
                } else if (targetY < this.pos.y) {
                    this.pos.y -= Math.min(this.pos.y - targetY, maxClimbSpeed);
                }
            } else if (!s && this.aiState !== "FALLING" && this.aiState !== "ATTACKING_PLAYER") {
                // Return to ceiling
                this.pos.y += 4 * t;
                if (this.pos.y > ceilingY) this.pos.y = ceilingY;
            }
        } else if ("crawley" === this.type) {
            const now = Date.now();
            const lightRange = this.crawleyLightThreat ? 10 : 8;
            let closestLight = null;
            let closestDistance = lightRange;
            for (const [key, light] of torchRegistry.entries()) {
                const distance = this.pos.distanceTo(light);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestLight = { key, position: light };
                }
            }
            if (typeof selectedBlockId !== 'undefined' &&
                (selectedBlockId === 120 || selectedBlockId === 134) &&
                typeof player !== 'undefined' && player !== null) {
                const heldLight = new THREE.Vector3(player.x, player.y, player.z);
                const distance = this.pos.distanceTo(heldLight);
                if (distance < closestDistance) {
                    closestLight = { key: "held", position: heldLight };
                    closestDistance = distance;
                }
            }

            if (closestLight) {
                if (!this.crawleyLightThreat || this.crawleyLightThreat !== closestLight.key) {
                    this.crawleyLightThreat = closestLight.key;
                    this.crawleyLightSeenAt = now;
                    this.crawleyLightReactionDelay = 400 + Math.random() * 350;
                    this.crawleyLightRetreatUntil = this.crawleyLightSeenAt + this.crawleyLightReactionDelay + 650;
                    this.crawleyLightFlankSide = Math.random() < 0.5 ? -1 : 1;
                    this.crawleyLightPathDirection = null;
                    this.crawleyLightNextPathTime = 0;
                }

                if (now >= this.crawleyLightSeenAt + this.crawleyLightReactionDelay) {
                    const retreating = now < this.crawleyLightRetreatUntil;
                    if (now >= (this.crawleyLightNextPathTime || 0)) {
                        this.crawleyLightNextPathTime = now + 150;
                        const away = new THREE.Vector3(this.pos.x - closestLight.position.x, 0, this.pos.z - closestLight.position.z);
                        if (away.lengthSq() < 0.001) away.set(Math.cos(this.animationTime), 0, Math.sin(this.animationTime));
                        away.normalize();
                        const goal = typeof player !== 'undefined' && player !== null
                            ? new THREE.Vector3(player.x - this.pos.x, 0, player.z - this.pos.z).normalize()
                            : away.clone().multiplyScalar(-1);
                        const probeRadii = [1.25, 0.65];
                        const angles = retreating
                            ? [0, -0.45, 0.45, -0.9, 0.9, -1.35, 1.35, -1.8, 1.8, Math.PI]
                            : [0, this.crawleyLightFlankSide * 0.65, -this.crawleyLightFlankSide * 0.65,
                                this.crawleyLightFlankSide * 1.3, -this.crawleyLightFlankSide * 1.3,
                                this.crawleyLightFlankSide * 1.95, -this.crawleyLightFlankSide * 1.95, Math.PI];
                        let bestDirection = null;
                        let bestScore = -Infinity;
                        for (const angle of angles) {
                            const direction = away.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                            for (const probeRadius of probeRadii) {
                                const nextX = modWrap(this.pos.x + direction.x * probeRadius, MAP_SIZE);
                                const nextZ = modWrap(this.pos.z + direction.z * probeRadius, MAP_SIZE);
                                let nextY = this.pos.y;
                                if (checkCollisionWithBlock(nextX, nextY, nextZ)) {
                                    if (!checkCollisionWithBlock(nextX, nextY + 1, nextZ)) nextY += 1;
                                    else if (!checkCollisionWithBlock(nextX, nextY + 2, nextZ)) nextY += 2;
                                    else if (!checkCollisionWithBlock(nextX, nextY + 3, nextZ)) nextY += 3;
                                    else continue;
                                }
                                const nextDistance = Math.hypot(
                                    nextX - closestLight.position.x,
                                    nextY - closestLight.position.y,
                                    nextZ - closestLight.position.z
                                );
                                const clearance = Math.min(nextDistance, 6);
                                const score = retreating
                                    ? clearance * 2 + away.dot(direction)
                                    : clearance * 2 + goal.dot(direction) * 2 + away.dot(direction) * 0.5;
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestDirection = direction;
                                }
                            }
                        }
                        this.crawleyLightPathDirection = bestDirection;
                    }

                    this.isMoving = false;
                    const bestDirection = this.crawleyLightPathDirection;
                    if (bestDirection) {
                        const speedScale = retreating ? 0.55 : 0.8;
                        const step = this.speed * speedScale * t * 60;
                        const nextX = modWrap(this.pos.x + bestDirection.x * step, MAP_SIZE);
                        const nextZ = modWrap(this.pos.z + bestDirection.z * step, MAP_SIZE);
                        let moveY = this.pos.y;
                        if (checkCollisionWithBlock(nextX, moveY, nextZ)) {
                            if (!checkCollisionWithBlock(nextX, moveY + 1, nextZ)) moveY += 1;
                            else if (!checkCollisionWithBlock(nextX, moveY + 2, nextZ)) moveY += 2;
                            else if (!checkCollisionWithBlock(nextX, moveY + 3, nextZ)) moveY += 3;
                        }
                        if (!checkCollisionWithBlock(nextX, moveY, nextZ)) {
                            this.pos.x = nextX;
                            this.pos.z = nextZ;
                            this.pos.y = moveY;
                            this.isMoving = true;
                        } else {
                            this.crawleyLightNextPathTime = now;
                        }
                        const yaw = Math.atan2(bestDirection.x, bestDirection.z);
                        this.mesh.quaternion.slerp(
                            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
                            0.05
                        );
                    } else {
                        this.isMoving = false;
                    }
                    this.mesh.position.set(this.pos.x, this.pos.y + 0.45, this.pos.z);
                    if (this.isMoving && this.mesh.legs) {
                        this.animationTime += 6 * t;
                        this.mesh.position.y += 0.025 * Math.sin(2 * this.animationTime);
                        this.mesh.legs.forEach((leg, index) => {
                            const side = index % 2 === 0 ? 1 : -1;
                            leg.rotation.x = Math.sin(this.animationTime + Math.floor(index / 2) * Math.PI / 3) * side * 0.8;
                        });
                    }
                    const moved = this.pos.distanceTo(this.lastSentPos) > 0.1;
                    const rotated = this.mesh.quaternion.angleTo(this.lastSentQuaternion) > 0.01;
                    if (moved || rotated) {
                        if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
                        window.mobUpdateQueue.push({
                            id: this.id,
                            x: this.pos.x,
                            y: this.pos.y,
                            z: this.pos.z,
                            quaternion: this.mesh.quaternion.toArray(),
                            isMoving: this.isMoving,
                            aiState: this.aiState,
                            type: this.type,
                            hp: this.hp,
                            isAggressive: this.isAggressive,
                            petOwner: this.petOwner || null,
                            spawner: this.spawner,
                            wasAttacked: this.wasAttacked,
                            originSeed: this.originSeed,
                            spawnCommandKey: this.spawnCommandKey
                        });
                        this.lastSentPos.copy(this.pos);
                        this.lastSentQuaternion.copy(this.mesh.quaternion);
                    }
                    return;
                }
            } else {
                this.crawleyLightThreat = null;
                this.crawleyLightPathDirection = null;
                this.crawleyLightNextPathTime = 0;
            }
        }
        let i = null,
            o = 1 / 0;

    if ("cow" === this.type) {
        if (isNight) {
            this.headMat.map = this.headTexSleep;
            this.aiState = "IDLE";
            this.isMoving = false;
        } else {
            // Blink logic
            if (Math.random() < 0.01) {
                this.headMat.map = this.headTexBlink;
                setTimeout(() => {
                    if (this.headMat.map !== this.headTexSleep) {
                        this.headMat.map = this.headMat._originalMap || this.headMat.map;
                    }
                }, 200);
            } else if (!this.headMat._originalMap) {
                this.headMat._originalMap = this.headMat.map;
            }

            // Randomly eat grass
            this.eatTimer = (this.eatTimer || 0) + t;
            this.hungerTimer = (this.hungerTimer || 0) + t;

            // If hasn't eaten in 1 hour (3600 seconds), die
            if (this.hungerTimer >= 3600 && isLocalSpawner) {
                 this.hp = 0;
            }

            if (this.eatTimer > 10 + Math.random() * 20) { // Eat every 10-30 seconds
                this.eatTimer = 0;
                let bx = Math.floor(this.pos.x);
                let by = Math.floor(this.pos.y);
                let bz = Math.floor(this.pos.z);
                let blockId = getBlockAt(bx, by - 1, bz);

                // if standing on grass (2)
                if (blockId === 2) {
                    if (typeof chunkManager !== 'undefined' && chunkManager.setBlockGlobal) { chunkManager.setBlockGlobal(bx, by - 1, bz, 3, true, null, 'local'); } else if (typeof setBlockAt === 'function') { setBlockAt(bx, by - 1, bz, 3); } // dirt
                    this.hungerTimer = 0; // Reset hunger timer when eating
                    if (typeof getCurrentWorldState === 'function') {
                         const pr = `${bx},${by - 1},${bz}`;
                         if (!getCurrentWorldState().prairieDirt) getCurrentWorldState().prairieDirt = new Map();
                         getCurrentWorldState().prairieDirt.set(pr, {
                             x: bx, y: by - 1, z: bz, eatTime: Date.now()
                         });
                    }
                    if (Math.random() > 0.5) { // 50% chance to drop seed
                        // Register grass seed growth if running on main game logic
                        if (typeof getCurrentWorldState === 'function') {
                            const r = `${bx},${by - 1},${bz}`;
                            if (!getCurrentWorldState().grassSeeds) getCurrentWorldState().grassSeeds = new Map();
                            getCurrentWorldState().grassSeeds.set(r, {
                                x: bx, y: by - 1, z: bz, originSeed: worldSeed, plantedTime: Date.now()
                            });
                        }
                    }
                    this.headMesh.rotation.x = Math.PI / 4; // Head down animation
                    setTimeout(() => {
                        this.headMesh.rotation.x = 0;
                    }, 500);
                }
            }
        }

        if (this.fallenTimer > 0) {
            this.fallenTimer -= t;
            this.isMoving = false;
            this.mesh.rotation.z = Math.PI / 2; // Fallen on side
            if (this.fallenTimer <= 0) {
                this.mesh.rotation.z = 0; // Get back up
            }
        }
    }
    if ("grub" === this.type) {
            if (("IDLE" === this.aiState || "SEARCHING_FOR_CACTUS" === this.aiState) && Date.now() >= (this.nextCactusSearchTime || 0)) {
                this.aiState = "SEARCHING_FOR_CACTUS";
                this.nextCactusSearchTime = Date.now() + 1000;
                const t = 16;
                let e = null,
                    s = 1 / 0;
                for (let i = -t; i <= t; i++)
                    for (let o = -t; o <= t; o++)
                        for (let t = -4; t <= 4; t++) {
                            const h = Math.floor(this.pos.x + i),
                                a = Math.floor(this.pos.y + t),
                                n = Math.floor(this.pos.z + o);
                            if (9 === getBlockAt(h, a, n)) {
                                const t = this.pos.distanceTo(new THREE.Vector3(h + .5, a + .5, n + .5));
                                t < s && (s = t, e = {
                                    x: h,
                                    y: a,
                                    z: n
                                })
                            }
                        }
                if (e) {
                    let t = e.y;
                    for (; 9 === getBlockAt(e.x, t + 1, e.z);) t++;
                    this.aiState = "MOVING_TO_CACTUS", this.targetBlock = {
                        x: e.x,
                        y: t,
                        z: e.z
                    }
                } else this.aiState = "IDLE"
            }
            if ("MOVING_TO_CACTUS" === this.aiState && this.targetBlock) i = new THREE.Vector3(this.targetBlock.x + .5, this.targetBlock.y + .5, this.targetBlock.z + .5), o = Math.hypot(this.pos.x - i.x, this.pos.z - i.z), o < 1.8 && (this.aiState = "EATING_CACTUS", this.lingerTime = Date.now());
            else if ("EATING_CACTUS" === this.aiState && this.targetBlock && Date.now() - this.lingerTime > 2500) {
                if (9 === getBlockAt(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z) && (chunkManager.setBlockGlobal(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z, 0), this.cactusEaten++, this.cactusEaten >= 5)) {
                    this.cactusEaten = 0;
                    const t = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion),
                        e = this.pos.clone().add(t.multiplyScalar(-7.5)),
                        s = chunkManager.getSurfaceY(e.x, e.z);
                    chunkManager.setBlockGlobal(Math.floor(e.x), s, Math.floor(e.z), 125, !0, worldSeed)
                }
                const t = {
                    x: this.targetBlock.x,
                    y: this.targetBlock.y - 1,
                    z: this.targetBlock.z
                };
                9 === getBlockAt(t.x, t.y, t.z) ? (this.targetBlock = t, this.lingerTime = Date.now()) : (this.aiState = "IDLE", this.targetBlock = null)
            }
        } else if (this.isAggressive || !i) {
            const t = findLegacyMobTarget(this), e = t ? t.distance : Infinity;
            if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 2.5 && Date.now() - this.attackCooldown > 800)) {
                this.attackCooldown = Date.now();
                if (t.mob) sendMobDamageFromMob(t.mob, this, 1);
                t.username !== userName ? sendToPlayer(t.username, {
                    type: "player_damage",
                    damage: 1,
                    attacker: "mob"
                }) : Date.now() - lastDamageTime > 800 && (player.health = Math.max(0, player.health - 1), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit! HP: " + player.health, 1e3), player.health <= 0 && handlePlayerDeath())
            }
        }
        if ("crawley" === this.type) {
            const now = Date.now();
            if (this.crawleyResourceScanTime === undefined) {
                this.crawleyResourceScanTime = now + Math.random() * 2500;
            }
            if (now >= this.crawleyResourceScanTime ||
                (this.crawleyResourceTarget && getBlockAt(this.crawleyResourceTarget.x, this.crawleyResourceTarget.y, this.crawleyResourceTarget.z) !== this.crawleyResourceTarget.id)) {
                this.crawleyResourceScanTime = now + 2500 + Math.random() * 500;
                this.crawleyResourceTarget = null;
                const scanRadius = 16;
                let nearestHive = null;
                let nearestHiveDistance = Infinity;
                let nearestHoney = null;
                let nearestHoneyDistance = Infinity;
                for (let xOffset = -scanRadius; xOffset <= scanRadius; xOffset++)
                    for (let zOffset = -scanRadius; zOffset <= scanRadius; zOffset++)
                        for (let yOffset = -4; yOffset <= 4; yOffset++) {
                            const x = Math.floor(this.pos.x + xOffset);
                            const y = Math.floor(this.pos.y + yOffset);
                            const z = Math.floor(this.pos.z + zOffset);
                            const blockId = getBlockAt(x, y, z);
                            if (blockId === 123 || blockId === 122) {
                                const dx = this.pos.x - (x + 0.5);
                                const dy = this.pos.y - (y + 0.5);
                                const dz = this.pos.z - (z + 0.5);
                                const distanceSq = dx * dx + dy * dy + dz * dz;
                                if (blockId === 123 && distanceSq < nearestHiveDistance) {
                                    nearestHiveDistance = distanceSq;
                                    nearestHive = { x, y, z, id: blockId };
                                } else if (blockId === 122 && distanceSq < nearestHoneyDistance) {
                                    nearestHoneyDistance = distanceSq;
                                    nearestHoney = { x, y, z, id: blockId };
                                }
                            }
                        }
                this.crawleyResourceTarget = nearestHive || nearestHoney;
            }
            if (this.crawleyResourceTarget) {
                i = this.crawleyResourceTarget;
                o = this.pos.distanceTo(new THREE.Vector3(i.x + 0.5, i.y + 0.5, i.z + 0.5));
            }
            if (i && o < 1.5) {
                if (0 === this.lingerTime) this.lingerTime = Date.now();
                else if (Date.now() - this.lingerTime > 2e3) {
                    safePlayAudioAt(soundBreak, i), chunkManager.setBlockGlobal(i.x, i.y, i.z, 0), setTimeout((() => checkAndDeactivateHive(i.x, i.y, i.z)), 100), i = null, this.lingerTime = 0
                    this.crawleyResourceTarget = null;
                }
            } else this.lingerTime = 0
        }
        if ("bee" === this.type) {
            if ("SEARCHING_FOR_FLOWER" === this.aiState) {
                if (flowerLocations.length > 0) {
                    let closestFlower = null;
                    let minDistance = Infinity;
                    for (const flower of flowerLocations) {
                        const distance = Math.hypot(flower.x - this.pos.x, flower.z - this.pos.z);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestFlower = flower;
                        }
                    }

                    i = closestFlower; // i is the target position
                    o = minDistance; // o is the distance to target

                    if (i) {
                        if (o < 1.5) {
                            this.hasPollen = true;
                            this.aiState = "FLYING_TO_HIVE";

                            // Consume the flower
                            chunkManager.setBlockGlobal(i.x, i.y, i.z, BLOCK_AIR);

                            // Remove from flowerLocations array on host
                            const flowerIndex = flowerLocations.findIndex(f => f.x === i.x && f.y === i.y && f.z === i.z);
                            if (flowerIndex > -1) {
                                flowerLocations.splice(flowerIndex, 1);
                            }

                            // Send message to clients to remove flower from their arrays
                            const flowerConsumedMsg = JSON.stringify({
                                type: 'flower_consumed',
                                location: i
                            });
                            for (const [username, peer] of peers.entries()) {
                                if (username !== userName && peer.dc && peer.dc.readyState === 'open') {
                                    peer.dc.send(flowerConsumedMsg);
                                }
                            }
                        }
                    }
                }
            } else if ("FLYING_TO_HIVE" === this.aiState) {
                if (hiveLocations.length > 0) {
                    let closestHive = null;
                    let minDistance = Infinity;
                    for (const hive of hiveLocations) {
                        const distance = Math.hypot(hive.x - this.pos.x, hive.z - this.pos.z);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestHive = hive;
                        }
                    }
                    i = closestHive;
                    o = minDistance;

                    if (o < 2) {
                        this.aiState = "DEPOSITING_HONEY";
                    }
                } else {
                    // No hives, so go back to wandering/searching
                    this.aiState = "SEARCHING_FOR_FLOWER";
                }
            } else if ("DEPOSITING_HONEY" === this.aiState) {
                const closestHive = hiveLocations.find(h => Math.hypot(h.x - this.pos.x, h.z - this.pos.z) < 10);
                let honeyPlaced = false;

                if (closestHive) {
                    // Prioritize placing honey next to hive blocks
                    for (let yOffset = 0; yOffset < 3; yOffset++) {
                        for (let xOffset = -1; xOffset <= 1; xOffset++) {
                            for (let zOffset = -1; zOffset <= 1; zOffset++) {
                                if (xOffset === 0 && yOffset === 0 && zOffset === 0) continue;
                                const checkX = closestHive.x + xOffset;
                                const checkY = closestHive.y + yOffset;
                                const checkZ = closestHive.z + zOffset;

                                // Check if adjacent block is a hive block
                                let isAdjacentToHive = false;
                                for (let dx = -1; dx <= 1; dx++) {
                                    for (let dy = -1; dy <= 1; dy++) {
                                        for (let dz = -1; dz <= 1; dz++) {
                                            if (dx === 0 && dy === 0 && dz === 0) continue;
                                            if (getBlockAt(checkX + dx, checkY + dy, checkZ + dz) === 123) {
                                                isAdjacentToHive = true;
                                                break;
                                            }
                                        }
                                        if(isAdjacentToHive) break;
                                    }
                                    if(isAdjacentToHive) break;
                                }

                                if (isAdjacentToHive && getBlockAt(checkX, checkY, checkZ) === BLOCK_AIR && isSolid(getBlockAt(checkX, checkY - 1, checkZ))) {
                                    chunkManager.setBlockGlobal(checkX, checkY, checkZ, 122); // Place Honey
                                    honeyPlaced = true;
                                    break;
                                }
                            }
                            if (honeyPlaced) break;
                        }
                        if (honeyPlaced) break;
                    }

                    // If no spot next to hive, try stacking on honey
                    if (!honeyPlaced) {
                         for (let yOffset = 0; yOffset < 5; yOffset++) {
                            for (let xOffset = -3; xOffset <= 3; xOffset++) {
                                for (let zOffset = -3; zOffset <= 3; zOffset++) {
                                     const checkX = closestHive.x + xOffset;
                                     const checkY = closestHive.y + yOffset;
                                     const checkZ = closestHive.z + zOffset;
                                    if (getBlockAt(checkX, checkY, checkZ) === 122 && getBlockAt(checkX, checkY + 1, checkZ) === BLOCK_AIR) {
                                        chunkManager.setBlockGlobal(checkX, checkY + 1, checkZ, 122);
                                        honeyPlaced = true;
                                        break;
                                    }
                                }
                                if(honeyPlaced) break;
                            }
                            if(honeyPlaced) break;
                         }
                    }
                }

                this.hasPollen = false;
                this.aiState = "SEARCHING_FOR_FLOWER";
            }
        }
        if (this.type === "bee" && i) {
            const clearance = this.aiState === "FLYING_TO_HIVE" ? 8 : 4;
            const now = Date.now();
            if (this.beeFlightTargetX !== i.x || this.beeFlightTargetZ !== i.z ||
                this.beeFlightClearance !== clearance || !this.beeFlightScanTime || now >= this.beeFlightScanTime) {
                const dx = i.x - this.pos.x;
                const dz = i.z - this.pos.z;
                const distance = Math.hypot(dx, dz);
                const baseHeight = chunkManager.getSurfaceY(this.pos.x, this.pos.z);
                let flightHeight = baseHeight + clearance;
                if (distance > 0.01) {
                    const perpendicularX = -dz / distance;
                    const perpendicularZ = dx / distance;
                    for (let step = 2; step <= Math.min(12, distance); step += 2) {
                        const sampleX = modWrap(this.pos.x + dx / distance * step, MAP_SIZE);
                        const sampleZ = modWrap(this.pos.z + dz / distance * step, MAP_SIZE);
                        for (const sideOffset of [-2, 0, 2]) {
                            const surfaceY = chunkManager.getSurfaceY(
                                sampleX + perpendicularX * sideOffset,
                                sampleZ + perpendicularZ * sideOffset
                            );
                            flightHeight = Math.max(flightHeight, surfaceY + clearance);
                        }
                    }
                }
                this.beeFlightHeight = flightHeight;
                this.beeFlightTargetX = i.x;
                this.beeFlightTargetZ = i.z;
                this.beeFlightClearance = clearance;
                this.beeFlightScanTime = now + 250;
            }
            this.pos.y += (this.beeFlightHeight - this.pos.y) * (1 - Math.exp(-6 * t));
        }
        if (this.isAggressive || !i) {
            const t = findLegacyMobTarget(this), e = t ? t.distance : Infinity;
            if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 2.5 && Date.now() - this.attackCooldown > 800)) {
                this.attackCooldown = Date.now();
                if (t.mob) sendMobDamageFromMob(t.mob, this, 1);
                t.username !== userName ? sendToPlayer(t.username, {
                    type: "player_damage",
                    damage: 1,
                    attacker: "mob"
                }) : Date.now() - lastDamageTime > 800 && (player.health = Math.max(0, player.health - 1), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit! HP: " + player.health, 1e3), player.health <= 0 && handlePlayerDeath())
            }
        }
        let h = !1;
        if (!(this.type === "cow" && isNight)) {
            if (i && o > .01) {
                const e = i.x - this.pos.x,
                    s = i.z - this.pos.z,
                    a = e / o * this.speed,
                    n = s / o * this.speed,
                    r = modWrap(this.pos.x + a * t * 60, MAP_SIZE),
                    l = modWrap(this.pos.z + n * t * 60, MAP_SIZE);
                if ("grub" === this.type || "crawley" === this.type || "cow" === this.type) {
                    if (checkCollisionWithBlock(r, this.pos.y, l)) {
                        if (!checkCollisionWithBlock(r, this.pos.y + 1, l)) {
                            this.pos.y += 1;
                        } else if (!checkCollisionWithBlock(r, this.pos.y + 2, l)) {
                            this.pos.y += 2;
                        } else if ("crawley" === this.type && !checkCollisionWithBlock(r, this.pos.y + 3, l)) {
                            this.pos.y += 3;
                        }
                    }
                }
                checkCollisionWithBlock(r, this.pos.y, l) || (this.pos.x = r, this.pos.z = l, h = !0)
            } else {
                let s, i;
                if ("crawley" === this.type || "cow" === this.type) {
                    if (!this.nextWanderChange || Date.now() > this.nextWanderChange) {
                        this.nextWanderChange = Date.now() + 2000 + Math.random() * 3000;
                        if (Math.random() < 0.3) {
                            this.wanderDir = new THREE.Vector3(0, 0, 0); // pause
                        } else {
                            const angle = Math.random() * Math.PI * 2;
                            this.wanderDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                        }
                    }
                    const e = 0.5 * this.speed;
                    s = modWrap(this.pos.x + (this.wanderDir ? this.wanderDir.x : 0) * e * t * 60, MAP_SIZE);
                    i = modWrap(this.pos.z + (this.wanderDir ? this.wanderDir.z : 0) * e * t * 60, MAP_SIZE);
                } else {
                    const e = .5 * this.speed;
                    s = modWrap(this.pos.x + Math.sin(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE);
                    i = modWrap(this.pos.z + Math.cos(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE);
                }
                if ("grub" === this.type || "crawley" === this.type || "cow" === this.type) {
                    if (checkCollisionWithBlock(s, this.pos.y, i)) {
                        if (!checkCollisionWithBlock(s, this.pos.y + 1, i)) {
                            this.pos.y += 1;
                        } else if (!checkCollisionWithBlock(s, this.pos.y + 2, i)) {
                            this.pos.y += 2;
                        } else if ("crawley" === this.type && !checkCollisionWithBlock(s, this.pos.y + 3, i)) {
                            this.pos.y += 3;
                        }
                    }
                }
                if (!checkCollisionWithBlock(s, this.pos.y, i)) {
                    this.pos.x = s;
                    this.pos.z = i;
                    if (("crawley" === this.type || "cow" === this.type) && this.wanderDir && this.wanderDir.lengthSq() > 0) {
                        h = !0;
                    } else if ("crawley" !== this.type && "cow" !== this.type) {
                        h = !0;
                    }
                }
            }
        }
        if (this.isMoving = h, "grub" === this.type && i) {
            const t = (new THREE.Vector3).subVectors(new THREE.Vector3(i.x, this.pos.y, i.z), this.pos).normalize(),
                e = Math.atan2(t.x, t.z);
            this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05)
        } else if (this.isMoving && ("crawley" === this.type || "cow" === this.type) && this.wanderDir && this.wanderDir.lengthSq() > 0 && !i) {
            // Point the crawley or cow in the direction of its wanderDir
            const t = this.wanderDir.clone().normalize();
            const e = Math.atan2(t.x, t.z);
            this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05);
        } else if ("crawley" === this.type && i && typeof o !== 'undefined' && o > 0.01) {
            // Face the target while seeking or attacking, even when blocked or standing still
            const targetVec = new THREE.Vector3(i.x - this.pos.x, 0, i.z - this.pos.z).normalize();
            if (targetVec.lengthSq() > 0) {
                 const e = Math.atan2(targetVec.x, targetVec.z);
                 this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05);
            }
        }
        this.mesh.position.set(this.pos.x, this.pos.y + ("crawley" === this.type ? 0.45 : 0), this.pos.z);
        const a = this.pos.distanceTo(this.lastSentPos) > .1,
            n = this.mesh.quaternion.angleTo(this.lastSentQuaternion) > .01;
        if (a || n || this.lastSentState !== this.aiState || this.lastSentHp !== this.hp ||
            this.lastSentSpawner !== this.spawner) {
            if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
            window.mobUpdateQueue.push({
                id: this.id,
                x: this.pos.x,
                y: this.pos.y,
                z: this.pos.z,
                quaternion: this.mesh.quaternion.toArray(),
                isMoving: h,
                aiState: this.aiState,
                type: this.type,
                hp: this.hp,
                isAggressive: this.isAggressive,
                spawner: this.spawner,
                originSeed: this.originSeed
            });
            this.lastSentPos.copy(this.pos), this.lastSentQuaternion.copy(this.mesh.quaternion)
            this.lastSentState = this.aiState;
            this.lastSentHp = this.hp;
            this.lastSentSpawner = this.spawner;
        }
    }

    if ("grub" === this.type) {
        const e = "EATING_CACTUS" === this.aiState,
            s = (this.isMoving ? 8 : 4) / 2;
        if (this.animationTime += t * s, this.segments.forEach(((t, s) => {
            s > 0 && (t.position.y = 1 === s && e ? 0 : .15 * Math.sin(this.animationTime - .8 * s) * 3)
        })), e) {
            this.headPivot.rotation.x = -Math.PI / 4 * (1 - Math.cos(2 * this.animationTime));
            const t = Math.abs(Math.sin(4 * this.animationTime)) * (Math.PI / 4);
            this.pinchers[0].rotation.z = Math.PI / 6 + t, this.pinchers[1].rotation.z = -Math.PI / 6 - t
        } else this.headPivot.rotation.x = 0, this.pinchers[0].rotation.z = Math.PI / 6, this.pinchers[1].rotation.z = -Math.PI / 6;
        this.isMoving || e ? this.legs.forEach(((t, e) => {
            const s = e % 2 == 0 ? -1 : 1,
                i = Math.floor(e / 2);
            t.rotation.x = Math.sin(this.animationTime - .5 * i) * s * .8
        })) : this.legs.forEach((t => t.rotation.x = 0))
    } else "crawley" === this.type && this.mesh.legs && (this.isMoving ? (this.animationTime += 6 * t, this.mesh.position.y += .025 * Math.sin(2 * this.animationTime), this.mesh.legs.forEach(((t, e) => {
        const s = e % 2 == 0 ? 1 : -1;
        t.rotation.x = Math.sin(this.animationTime + Math.floor(e / 2) * Math.PI / 3) * s * .8
    }))) : this.mesh.legs.forEach((t => {
        t.rotation.x = 0
    })))
}, Mob.prototype.hurt = function (t, e) {
    const isLocalSpawner = isMobAuthority(this);
    if (!isLocalSpawner) return;
    if (!(t > 0) || !Number.isFinite(t)) return;
    if (this.type === "whale") {
        this.wasAttacked = true;
        this.isAggressive = true;
    }
    if (isEliteMobType(this.type)) markEliteMobProvoked(this, e);
    this.hp -= t, this.flashEnd = Date.now() + 200, this.lastDamageTime = Date.now(), safePlayAudioAt(soundHit, this.pos);

    if ("cow" === this.type) {
        if (isNight) {
            this.fallenTimer = 10; // fall over for 10 seconds (dt is in seconds)
        } else {
            // Day combat response
            let r = Math.random();
            if (r < 0.33) {
                // Ignore
            } else if (r < 0.66) {
                this.isAggressive = false;
                this.isMoving = true;
                // Run away (already handled by knockback and random wander)
            } else {
                this.isAggressive = true;
            }
        }
    }

    const s = e === userName ? player : userPositions[e];
    if (s) {
        const t = e === userName ? s.x : s.targetX,
            i = e === userName ? s.z : s.targetZ,
            o = this.pos.x - t,
            h = this.pos.z - i,
            a = Math.hypot(o, h),
            n = 8;
        a > 0 && (this.vx += o / a * n, this.vz += h / a * n)
    }
    if (this.hp <= 0) this.die(e);
    else {
        if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
        window.mobUpdateQueue.push({
            id: this.id,
            x: this.pos.x,
            y: this.pos.y,
            z: this.pos.z,
            hp: this.hp,
            maxHp: this.maxHp,
            feedRevision: this.feedRevision || 0,
            flash: !0,
            type: this.type,
            isMoving: this.isMoving,
            aiState: this.aiState,
            isAggressive: this.isAggressive,
            petOwner: this.petOwner || null,
            spawner: this.spawner,
            wasAttacked: this.wasAttacked,
            quaternion: this.mesh.quaternion.toArray()
        });
    }
}, Mob.prototype.die = function (t, reason = "combat") {
    const isLocalSpawner = isMobAuthority(this);
    if (!isLocalSpawner || this.deathProcessed) return;
    this.deathProcessed = true;
    const altitudeExplosion = this.type === "ufo_saucer" && reason === "altitude";
    if (this.type === "ufo_saucer") {
        if (isAuthority(worldName) || peers.size === 0) adoptUfoRewardFallback(this.id, worldName, userName);
        const issuer = ufoRewardAuthorities.get(`${worldName}:${this.id}`);
        if (issuer) {
            issuer.completed = true;
            issuer.position = { x: this.pos.x, y: this.pos.y, z: this.pos.z };
        }
    }
    if (typeof t === "string" && t.startsWith("wolf:")) {
        const wolf = mobs.find(mob => mob.type === "timber_wolf" && `wolf:${mob.id}` === t);
        t = wolf?.petOwner || null;
    }
    if (this.petOwner === userName) removePlayerPet(this.id);
    else if (this.petOwner && userPositions[this.petOwner]) {
        const ids = userPositions[this.petOwner].petIds;
        if (Array.isArray(ids)) userPositions[this.petOwner].petIds = ids.filter(id => id !== this.id);
    }

    if (this.type === "ufo_saucer") {
        spawnUfoExplosion(this.pos, this.id);
        if (altitudeExplosion) awardUfoAltitudeRewards(this);
    }

    try {
        scene.remove(this.mesh), disposeObject(this.mesh)
    } catch (t) { }
    if (this.engineAudio) {
        this.engineAudio.pause();
    }
    if (this.engineAudio2) {
        this.engineAudio2.pause();
    }
    if (this.spawnCommandKey && typeof removeFishSpawnCommandByKey === "function") {
        removeFishSpawnCommandByKey(this.spawnCommandKey);
    }
    mobs = mobs.filter((t => t.id !== this.id)), markMobRecentlyRemoved(this.id),
        addMessage(altitudeExplosion ? "UFO reactor exploded!" : "Mob defeated!");
    if (window.mobUpdateQueue) window.mobUpdateQueue = window.mobUpdateQueue.filter(update => update.id !== this.id);
    if (window.mobsByWorld?.[worldName]) {
        window.mobsByWorld[worldName] = window.mobsByWorld[worldName].filter(mob => mob.id !== this.id);
    }
    if (altitudeExplosion) {
        const message = JSON.stringify({ type: "mob_kill", id: this.id, mobType: this.type,
            reason, position: { x: this.pos.x, y: this.pos.y, z: this.pos.z }, world: worldName });
        for (const [, peer] of peers) {
            if (peer.dc?.readyState === "open") peer.dc.send(message);
        }
        return;
    }
    const isFish = this.type === "fish_rare" || this.type === "fish_school";
    if (isFish && t !== "whale") {
        const fishItemId = this.type === "fish_rare" ? 137 : 138;
        if (t === userName) {
            addToInventory(fishItemId, 1, this.originSeed);
            addMessage(`Caught ${BLOCKS[fishItemId].name} from ${this.originSeed}!`, 2500);
        } else if (t) {
            sendToPlayer(t, {
                type: "add_to_inventory",
                blockId: fishItemId,
                count: 1,
                originSeed: this.originSeed
            });
        }
    }
    let e = 10;
    if ("ufo_saucer" === this.type) {
        e = 1000;
        if (Math.random() < (1/3)) {
            if (typeof createDroppedItemOrb === 'function') {
                createDroppedItemOrb(`${userName}-${Date.now()}-ufo-drop`, this.pos.clone(), 133, worldSeed, userName, 1);
            }
        }
    } else if (isEliteMobType(this.type)) {
        e = getEliteMobDef(this.type).score;
        onEliteMobDeath(this, t);
    } else if ("cow" === this.type) {
        e = 10;
        if (isLocalSpawner && typeof createDroppedItemOrb === 'function') {
            const numBurgers = Math.floor(Math.random() * 5) + 1; // 1 to 5 burgers
            createDroppedItemOrb(`${userName}-${Date.now()}-cow-drop`, this.pos.clone(), 139, worldSeed, userName, numBurgers);
        }
    } else if ("red" === this.eyeColor) { e = 20; } else if ("blue" === this.eyeColor) { e = 30; }
    if (t === userName) {
        player.score += e;
        document.getElementById("score").innerText = player.score;
        addMessage(`+${e} score`);
        safePlayAudioAt(soundHit, this.pos);

        // Broadcast new score to host so it updates all clients
        if (!isHost) {
            for (const [, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(JSON.stringify({
                        type: "peer_score_update",
                        username: userName,
                        score: player.score
                    }));
                    break;
                }
            }
        } else {
            // Host updates its own score and broadcasts to clients
            for (const [, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(JSON.stringify({
                        type: "peer_score_update",
                        username: userName,
                        score: player.score
                    }));
                }
            }
        }
    } else if (typeof t === "string" && t.length > 0 &&
        (peers.has(t) || userPositions[t] || mobs.some(mob => mob.type === "timber_wolf" && mob.petOwner === t))) {
        const message = {
            type: "add_score",
            target: t,
            amount: e,
            world: worldName
        };
        if (dedicatedServer) {
            sendToPlayer(t, message);
        } else {
            const peer = peers.get(t);
            if (peer?.dc?.readyState === "open") {
                peer.dc.send(JSON.stringify(message));
            } else {
                for (const [, peer] of peers) {
                    if (peer.dc?.readyState === "open") {
                        peer.dc.send(JSON.stringify(message));
                        break;
                    }
                }
            }
        }
    }
    const s = JSON.stringify({
        type: "mob_kill",
        id: this.id,
        mobType: this.type,
        position: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
        petOwner: this.petOwner || null,
        petRemoved: !!this.petOwner,
        world: worldName
    });
    for (const [t, e] of peers.entries()) t !== userName && e.dc && "open" === e.dc.readyState && e.dc.send(s)

};
