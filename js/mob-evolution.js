// Score-driven mob evolution (v1.3.0).
//
// Each tier unlocks once any player in an active area reaches its score. Tiers are cumulative:
// later tiers may introduce new mob types and retire older ones (for example crawleys).
// Level-2 (score 100) and level-3 (score 200) "elite" mobs are defined in ELITE_MOB_TYPES, each modelled
// on a different voxel game. They reuse the shared Mob pipeline (mob_spawn / mob_update_batch /
// mob_hit / mob_kill / mob_despawn) and are simulated only by the mob's authority (mob.spawner).
// Ranged attacks travel as synced projectiles that every client checks against its own player;
// melee and area attacks are broadcast as "elite_mob_attack" messages evaluated by each client.

const MOB_EVOLUTION_TIERS = [
    {
        // Level 2 (score past 100): one easier mob per world archetype.
        level: 2,
        minScore: 100,
        introduces: ["bone_archer", "dust_vulture", "crater_hopper", "ember_drifter", "moss_brute"],
        retires: []
    },
    {
        // Level 3 (score past 200): crawleys retire and the heavy hitters arrive. These only turn
        // hostile toward players holding a laser gun or players who attack them first.
        level: 3,
        minScore: 200,
        introduces: ["sentinel_drone", "brick_golem", "magma_wyrm"],
        retires: ["crawley"]
    }
    // Future tiers (score 300+) slot in here: add a { level, minScore, introduces, retires } entry.
];

// Mob projectiles never carry PointLights: adding or removing a scene light forces every lit
// material to recompile, which froze the game whenever a Sentinel opened fire.
const MOB_PROJECTILE_STYLES = {
    arrow: { color: 0xe6dcc0, speed: 24, gravity: 14, scale: [0.45, 0.45, 2.6], damage: 3, hitRadius: 1.2, label: "Shot by a Bone Archer" },
    sentinel: { color: 0xffb020, speed: 30, gravity: 0, scale: [0.9, 0.9, 3.2], damage: 2, hitRadius: 1.3, label: "Zapped by a Sentinel" },
    fireball: { color: 0xff5a00, speed: 16, gravity: 3, scale: [3, 3, 3], damage: 4, hitRadius: 1.6, label: "Scorched by a Magma Wyrm" },
    boulder: { color: 0x7d6f60, speed: 17, gravity: 12, scale: [4, 4, 4], damage: 5, hitRadius: 1.7, label: "Crushed by a Brick Golem boulder" },
    ember: { color: 0xff7a1a, speed: 13, gravity: 11, scale: [1.6, 1.6, 1.6], damage: 2, hitRadius: 1.2, label: "Hit by an Ember Drifter's cinder" }
};

// Laser guns: red, green and blue. Holding one counts as "armed" for provoke: "armed" mobs.
const ARMED_ITEM_IDS = new Set([121, 126, 133]);
const ELITE_PROVOKE_MS = 30000;

const ELITE_MOB_TYPES = {
    // ---- level 2 (score 100+) ----
    bone_archer: {
        name: "Bone Archer",
        inspiredBy: "Minecraft (Skeleton)",
        archetypes: ["Earth", "Massive"],
        day: false, night: true,
        hp: 20, score: 40, maxCount: 3, spawnChance: 0.35,
        hitCenterY: 1.1, hitRadius: 1.3,
        drop: { id: 124, count: 1, chance: 0.5 }
    },
    dust_vulture: {
        name: "Dust Vulture",
        inspiredBy: "7 Days to Die (Vultures)",
        archetypes: ["Desert"],
        day: true, night: true, flying: true,
        hp: 12, score: 30, maxCount: 4, worldMax: 4, spawnChance: 0.4, spawnAltitude: 18,
        roost: { minDistance: 58, maxDistance: 76, radius: 12, alertRange: 26, leash: 40 },
        hitCenterY: 0, hitRadius: 1.5,
        drop: { id: 176, count: 2, chance: 0.6 }
    },
    crater_hopper: {
        name: "Crater Hopper",
        burstColor: 0x9ad8ff,
        inspiredBy: "Cube World (Slime)",
        archetypes: ["Moon"],
        day: true, night: true,
        hp: 10, score: 25, maxCount: 3, spawnChance: 0.4,
        hitCenterY: 0.6, hitRadius: 1.1,
        drop: { id: 111, count: 1, chance: 0.5 }
    },
    ember_drifter: {
        name: "Ember Drifter",
        burstColor: 0xff7a1a,
        inspiredBy: "Vintage Story (Drifter)",
        archetypes: ["Vulcan"],
        day: true, night: true,
        hp: 14, score: 25, maxCount: 3, spawnChance: 0.35,
        hitCenterY: 1, hitRadius: 1.2,
        drop: { id: 120, count: 2, chance: 0.6 }
    },
    moss_brute: {
        name: "Moss Brute",
        burstColor: 0x6f8a52,
        inspiredBy: "Hytale (Trork)",
        archetypes: ["Massive"],
        day: true, night: true,
        hp: 22, score: 30, maxCount: 2, spawnChance: 0.3,
        hitCenterY: 1.2, hitRadius: 1.4,
        drop: { id: 8, count: 3, chance: 0.6 }
    },
    // ---- level 3 (score 200+) — only hostile to armed or attacking players ----
    sentinel_drone: {
        name: "Sentinel Drone",
        burstColor: 0xb8bcc4,
        inspiredBy: "No Man's Sky (Sentinels)",
        archetypes: ["Moon"],
        day: true, night: true, flying: true, provoke: "armed",
        hp: 24, score: 50, maxCount: 1, worldMax: 2, spawnChance: 0.08, spawnAltitude: 9,
        hitCenterY: 0, hitRadius: 1.4,
        drop: { id: 134, count: 1, chance: 0.6 }
    },
    brick_golem: {
        name: "Brick Golem",
        burstColor: 0x8d7b66,
        inspiredBy: "Dragon Quest Builders (Golem)",
        archetypes: ["Massive"],
        day: true, night: true, provoke: "armed",
        hp: 60, score: 80, maxCount: 1, spawnChance: 0.2,
        hitCenterY: 2.4, hitRadius: 2.4, heavy: true,
        drop: { id: 139, count: 4, chance: 1 }
    },
    magma_wyrm: {
        name: "Magma Wyrm",
        burstColor: 0xff6a00,
        inspiredBy: "Subnautica (Sea Dragon Leviathan)",
        archetypes: ["Vulcan"],
        day: true, night: true, aquatic: true, provoke: "armed",
        hp: 45, score: 70, maxCount: 1, spawnChance: 0.25,
        hitCenterY: 0, hitRadius: 2.6, heavy: true,
        drop: { id: 125, count: 2, chance: 1 }
    }
};

const ELITE_ATTACK_DAMAGE_CAP = 10;
const BONE_ITEM_ID = 176;
var eliteMobEffects = [];
var recentEliteAttackIds = new Set();
var lastMobEvolutionLevel = 1;

function getEliteBurstColor(type) {
    const def = getEliteMobDef(type);
    return def && def.burstColor !== undefined ? def.burstColor : 0xd8d0c0;
}

function isEliteMobType(type) {
    return Object.prototype.hasOwnProperty.call(ELITE_MOB_TYPES, type);
}

function getEliteMobDef(type) {
    return isEliteMobType(type) ? ELITE_MOB_TYPES[type] : null;
}

function getMobEvolution(score) {
    const value = Number(score) || 0;
    const active = new Set();
    const retired = new Set();
    let level = 1;
    for (const tier of MOB_EVOLUTION_TIERS) {
        if (tier.enabled === false || value < tier.minScore) continue;
        level = Math.max(level, tier.level);
        for (const type of tier.introduces) {
            active.add(type);
            retired.delete(type);
        }
        for (const type of tier.retires) {
            retired.add(type);
            active.delete(type);
        }
    }
    return { level, active, retired };
}

var recentlyRemovedMobIds = new Map();

// Remember despawned/killed mob ids briefly so late network updates do not resurrect them.
function markMobRecentlyRemoved(id) {
    if (id === undefined || id === null) return;
    const now = Date.now();
    recentlyRemovedMobIds.set(String(id), now);
    if (recentlyRemovedMobIds.size > 256) {
        for (const [key, time] of recentlyRemovedMobIds) {
            if (now - time > 10000) recentlyRemovedMobIds.delete(key);
        }
    }
}

function wasMobRecentlyRemoved(id) {
    const time = recentlyRemovedMobIds.get(String(id));
    if (time === undefined) return false;
    if (Date.now() - time > 10000) {
        recentlyRemovedMobIds.delete(String(id));
        return false;
    }
    return true;
}

function isMobAuthority(mob) {
    // The host also takes over mobs whose spawner has disconnected.
    return (mob.spawner === userName) || (isHost && (!mob.spawner || !peers.has(mob.spawner))) || peers.size === 0;
}

function getKnownPlayerScore(name) {
    if (name === userName) return Number(player.score) || 0;
    const pos = userPositions[name];
    return pos && Number.isFinite(pos.score) ? pos.score : 0;
}

function getMaxScoreNear(x, z, players, radius = 96) {
    let best = 0;
    for (const p of players) {
        if (Math.hypot(x - p.x, z - p.z) < radius) {
            best = Math.max(best, Number.isFinite(p.score) ? p.score : getKnownPlayerScore(p.name));
        }
    }
    return best;
}

function isEliteMobAllowedForWorld(type) {
    const def = getEliteMobDef(type);
    if (!def || !worldArchetype || !def.archetypes.includes(worldArchetype.name)) return false;
    return isNight ? def.night : def.day;
}

// Elite types that should spawn for an area whose highest score is `areaScore`.
function getEliteSpawnTypes(areaScore) {
    const evolution = getMobEvolution(areaScore);
    return Array.from(evolution.active).filter(type => isEliteMobAllowedForWorld(type));
}

function isEliteMobAllowedAt(type, x, z, players) {
    if (!isEliteMobAllowedForWorld(type)) return false;
    return getMobEvolution(getMaxScoreNear(x, z, players)).active.has(type);
}

function isMobTypeRetiredAt(type, x, z, players) {
    return getMobEvolution(getMaxScoreNear(x, z, players)).retired.has(type);
}

function announceMobEvolution(score) {
    const level = getMobEvolution(score).level;
    if (level > lastMobEvolutionLevel) {
        const tier = MOB_EVOLUTION_TIERS.find(t => t.level === level);
        const names = (tier ? tier.introduces : [])
            .map(type => getEliteMobDef(type))
            .filter(def => def && worldArchetype && def.archetypes.includes(worldArchetype.name))
            .map(def => def.name);
        const verb = level >= 3 ? " now roam (they only fight armed or hostile players)" : " now hunt";
        addMessage(`⚠ Mob evolution level ${level}! ${names.length ? names.join(", ") + verb : "Stronger mobs now roam"} this ${worldArchetype ? worldArchetype.name : ""} world.`, 5000);
    }
    lastMobEvolutionLevel = level;
}

function getEliteSpawnPosition(type, anchor) {
    const def = getEliteMobDef(type);
    if (def.aquatic) {
        const spot = nearestAquaticSpawnPosition(anchor.x, anchor.z, "whale");
        return spot ? { x: spot.x, y: spot.y, z: spot.z, waterSurfaceY: spot.surfaceY } : null;
    }
    if (def.roost) return getEliteRoostSpawnPosition(type, def, anchor);
    const angle = Math.random() * Math.PI * 2;
    const distance = 28 + Math.random() * 24;
    const x = modWrap(anchor.x + Math.cos(angle) * distance, MAP_SIZE);
    const z = modWrap(anchor.z + Math.sin(angle) * distance, MAP_SIZE);
    if (def.flying) {
        const y = Math.min(MAX_HEIGHT - 8, chunkManager.getSurfaceY(x, z) + def.spawnAltitude);
        return { x, y, z };
    }
    return { x, y: null, z };
}

// Roosting flyers (Dust Vultures) gather far out at the edge of the loaded map around a shared roost,
// so players have to travel to find them. Bones are scattered on the ground under the roost.
function getEliteRoostSpawnPosition(type, def, anchor) {
    let roost = null;
    for (const mob of mobs) {
        if (mob.type === type && mob.home && Math.hypot(mob.home.x - anchor.x, mob.home.z - anchor.z) < def.roost.maxDistance + 24) {
            roost = mob.home;
            break;
        }
    }
    let isNewRoost = false;
    if (!roost) {
        const angle = Math.random() * Math.PI * 2;
        const distance = def.roost.minDistance + Math.random() * (def.roost.maxDistance - def.roost.minDistance);
        const rx = modWrap(anchor.x + Math.cos(angle) * distance, MAP_SIZE);
        const rz = modWrap(anchor.z + Math.sin(angle) * distance, MAP_SIZE);
        roost = { x: rx, y: chunkManager.getSurfaceY(rx, rz), z: rz };
        isNewRoost = true;
    }
    const angle = Math.random() * Math.PI * 2;
    const x = modWrap(roost.x + Math.cos(angle) * def.roost.radius, MAP_SIZE);
    const z = modWrap(roost.z + Math.sin(angle) * def.roost.radius, MAP_SIZE);
    const y = Math.min(MAX_HEIGHT - 8, roost.y + def.spawnAltitude);
    return { x, y, z, roost: { x: roost.x, y: roost.y, z: roost.z }, isNewRoost };
}

function countBonesNear(x, z, radius) {
    if (typeof droppedItems === "undefined") return 0;
    let count = 0;
    for (const item of droppedItems) {
        if (item.blockId === BONE_ITEM_ID && item.mesh && Math.hypot(item.mesh.position.x - x, item.mesh.position.z - z) < radius) count++;
    }
    return count;
}

// Called by the spawning authority: drops a few Bone pickups around the roost and tells peers.
function scatterRoostBones(roost) {
    if (typeof createDroppedItemOrb !== "function" || !roost) return;
    const missing = 3 - countBonesNear(roost.x, roost.z, 20);
    for (let i = 0; i < missing; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 9;
        const bx = Math.floor(modWrap(roost.x + Math.cos(angle) * distance, MAP_SIZE)) + 0.5;
        const bz = Math.floor(modWrap(roost.z + Math.sin(angle) * distance, MAP_SIZE)) + 0.5;
        const by = chunkManager.getSurfaceY(bx, bz) + 0.3;
        const dropId = `${userName}-bone-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const position = new THREE.Vector3(bx, by, bz);
        createDroppedItemOrb(dropId, position, BONE_ITEM_ID, worldSeed, userName, 1);
        const message = JSON.stringify({ type: "item_dropped", dropId, position: { x: bx, y: by, z: bz }, blockId: BONE_ITEM_ID, originSeed: worldSeed, dropper: userName, world: worldName });
        for (const [peerName, peer] of peers.entries()) {
            if (peerName !== userName && peer.dc && peer.dc.readyState === "open") peer.dc.send(message);
        }
    }
}

// Applies spawn metadata (vulture roosts) to a freshly spawned elite mob on its authority.
function onEliteMobSpawned(mob, spawn) {
    if (!mob || !spawn || !spawn.roost) return;
    mob.home = new THREE.Vector3(spawn.roost.x, spawn.roost.y, spawn.roost.z);
    scatterRoostBones(spawn.roost);
}

function hasEliteWorldCapacity(type) {
    const def = getEliteMobDef(type);
    if (!def || !def.worldMax) return true;
    let count = 0;
    for (const mob of mobs) if (mob.type === type) count++;
    return count < def.worldMax;
}

function createBoneMesh() {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xece4cf, emissive: 0x2a2620 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.62), material);
    group.add(shaft);
    for (const end of [-0.33, 0.33]) {
        for (const side of [-0.07, 0.07]) {
            const knob = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), material);
            knob.position.set(side * 1.4, 0, end);
            group.add(knob);
        }
    }
    group.rotation.y = Math.random() * Math.PI;
    return group;
}

// ---------- shared helpers ----------

function isEliteHeldItemArmed(id) {
    return ARMED_ITEM_IDS.has(Number(id));
}

// Level-3 mobs (provoke: "armed") only attack players holding a laser gun or who recently hurt them.
function markEliteMobProvoked(mob, attacker) {
    if (!mob || !attacker || !isEliteMobType(mob.type)) return;
    if (!mob.provokedBy) mob.provokedBy = {};
    mob.provokedBy[attacker] = Date.now();
}

function isEliteTargetHostile(mob, target) {
    const def = getEliteMobDef(mob.type);
    if (!def || def.provoke !== "armed") return true;
    if (target.armed) return true;
    const provokedAt = mob.provokedBy && mob.provokedBy[target.name];
    return !!provokedAt && Date.now() - provokedAt < ELITE_PROVOKE_MS;
}

function getEliteTargetablePlayers() {
    const list = [];
    if (player.health > 0) {
        list.push({ name: userName, x: player.x + player.width / 2, y: player.y, z: player.z + player.depth / 2, local: true, armed: isEliteHeldItemArmed(selectedBlockId) });
    }
    for (const [name, pos] of Object.entries(userPositions)) {
        if (pos.world === worldName && !pos.isDying && Number.isFinite(pos.targetX) && Number.isFinite(pos.targetY) && Number.isFinite(pos.targetZ)) {
            list.push({ name, x: pos.targetX + 0.4, y: pos.targetY, z: pos.targetZ + 0.4, armed: isEliteHeldItemArmed(pos.selectedBlockId) });
        }
    }
    return list;
}

function findEliteTarget(mob, range, maxDy = 24) {
    let best = null;
    let bestDistance = range;
    for (const p of getEliteTargetablePlayers()) {
        if (Math.abs(p.y - mob.pos.y) > maxDy) continue;
        if (!isEliteTargetHostile(mob, p)) continue;
        const d = Math.hypot(p.x - mob.pos.x, p.z - mob.pos.z);
        if (d < bestDistance) {
            bestDistance = d;
            best = p;
        }
    }
    if (best) best.distance = bestDistance;
    return best;
}

function faceEliteMob(mob, dx, dz, rate, dt) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const yaw = Math.atan2(dx, dz);
    const target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    mob.mesh.quaternion.slerp(target, Math.min(1, rate * dt));
}

function isWaterBlock(id) {
    return id === 6 || id === 136;
}

function settleEliteOnGround(mob, dt) {
    if (checkCollisionWithBlock(mob.pos.x, mob.pos.y, mob.pos.z)) {
        mob.pos.y += Math.min(1, 6 * dt + 0.05);
        return;
    }
    const fall = 14 * dt;
    if (!checkCollisionWithBlock(mob.pos.x, mob.pos.y - fall, mob.pos.z)) {
        mob.pos.y -= fall;
    } else {
        mob.pos.y = Math.ceil(mob.pos.y - fall);
    }
    if (mob.pos.y < 1) mob.pos.y = chunkManager.getSurfaceY(mob.pos.x, mob.pos.z) + 1;
}

function stepEliteOnGround(mob, dirX, dirZ, distance) {
    const length = Math.hypot(dirX, dirZ);
    if (length < 1e-4 || distance <= 0) return false;
    const nx = modWrap(mob.pos.x + dirX / length * distance, MAP_SIZE);
    const nz = modWrap(mob.pos.z + dirZ / length * distance, MAP_SIZE);
    let ny = mob.pos.y;
    if (checkCollisionWithBlock(nx, ny, nz)) {
        if (!checkCollisionWithBlock(nx, ny + 1, nz)) ny += 1;
        else if (!checkCollisionWithBlock(nx, ny + 2, nz)) ny += 2;
        else return false;
    }
    mob.pos.set(nx, ny, nz);
    return true;
}

function applyEliteKnockback(mob, dt) {
    const def = getEliteMobDef(mob.type);
    if (def.heavy || def.flying || def.aquatic) {
        mob.vx = 0;
        mob.vz = 0;
        return;
    }
    if (Math.abs(mob.vx) + Math.abs(mob.vz) > 0.01) {
        stepEliteOnGround(mob, mob.vx, mob.vz, Math.hypot(mob.vx, mob.vz) * dt);
        mob.vx *= Math.max(0, 1 - 4 * dt);
        mob.vz *= Math.max(0, 1 - 4 * dt);
    }
}

function eliteWander(mob, dt, speed, now) {
    if (!mob.nextWanderChange || now > mob.nextWanderChange) {
        mob.nextWanderChange = now + 2500 + Math.random() * 3500;
        const angle = Math.random() * Math.PI * 2;
        mob.wanderDir = Math.random() < 0.3 ? null : new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    }
    if (!mob.wanderDir) return false;
    return { x: mob.wanderDir.x, z: mob.wanderDir.z, speed };
}

function getBallisticDirection(from, to, speed, gravity, spread = 0) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dy = to.y - from.y;
    const horizontal = Math.max(0.001, Math.hypot(dx, dz));
    let angle = Math.atan2(dy, horizontal);
    if (gravity > 0) {
        const v2 = speed * speed;
        const disc = v2 * v2 - gravity * (gravity * horizontal * horizontal + 2 * dy * v2);
        angle = disc >= 0 ? Math.atan((v2 - Math.sqrt(disc)) / (gravity * horizontal)) : Math.PI / 4;
    }
    const direction = new THREE.Vector3(dx / horizontal * Math.cos(angle), Math.sin(angle), dz / horizontal * Math.cos(angle));
    if (spread > 0) {
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
    }
    return direction.normalize();
}

function fireEliteProjectile(mob, style, origin, direction, index = 0) {
    if (typeof createProjectile !== "function") return;
    const id = `${mob.id}-${Date.now()}-${index}-${Math.floor(Math.random() * 1e6)}`;
    createProjectile(id, mob.id, origin.clone(), direction.clone(), style);
    laserFireQueue.push({
        id,
        user: mob.id,
        world: worldName,
        position: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
        color: style
    });
}

function dispatchEliteAttack(mob, attack) {
    const payload = Object.assign({
        type: "elite_mob_attack",
        attackId: `${mob.id}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        mobId: mob.id,
        world: worldName,
        username: userName
    }, attack);
    applyEliteAttackLocally(payload);
    const message = JSON.stringify(payload);
    for (const [peerName, peer] of peers.entries()) {
        if (peerName !== userName && peer.dc && peer.dc.readyState === "open") peer.dc.send(message);
    }
}

function handleEliteMobAttackMessage(message, sender) {
    if (!message || typeof message.attackId !== "string") return;
    if (isHost) {
        const relay = JSON.stringify(message);
        for (const [peerName, peer] of peers.entries()) {
            const peerWorld = userPositions[peerName] ? userPositions[peerName].world : worldName;
            if (peerName !== sender && peerName !== message.username && peer.dc && peer.dc.readyState === "open" && peerWorld === message.world) {
                peer.dc.send(relay);
            }
        }
    }
    if (message.world === worldName) applyEliteAttackLocally(message);
}

function applyEliteDamageToLocalPlayer(damage, label, kx = 0, kz = 0, ky = 0) {
    if (player.health <= 0 || !(damage > 0)) return;
    player.health = Math.max(0, player.health - Math.min(ELITE_ATTACK_DAMAGE_CAP, damage));
    lastDamageTime = Date.now();
    const healthElement = document.getElementById("health");
    if (healthElement) healthElement.innerText = player.health;
    updateHealthBar();
    if (typeof flashDamageEffect === "function") flashDamageEffect();
    safePlayAudioAt(soundHit, player);
    if (Number.isFinite(kx)) player.vx += kx;
    if (Number.isFinite(kz)) player.vz += kz;
    if (Number.isFinite(ky) && ky > 0) player.vy = Math.max(player.vy, ky);
    addMessage(`${label}! HP: ${player.health}`, 1200);
    if (player.health <= 0) handlePlayerDeath();
}

function applyEliteAttackLocally(attack) {
    if (recentEliteAttackIds.has(attack.attackId)) return;
    recentEliteAttackIds.add(attack.attackId);
    if (recentEliteAttackIds.size > 200) recentEliteAttackIds.delete(recentEliteAttackIds.values().next().value);
    const x = Number(attack.x), y = Number(attack.y), z = Number(attack.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    const damage = Math.max(0, Math.min(ELITE_ATTACK_DAMAGE_CAP, Number(attack.damage) || 0));
    const radius = Math.max(0.5, Math.min(12, Number(attack.radius) || 2.5));
    const label = typeof attack.label === "string" ? attack.label.slice(0, 60) : "Hit by an elite mob";
    if (attack.fx === "shockwave") spawnEliteShockwave(new THREE.Vector3(x, y, z), radius);
    if (player.health <= 0) return;
    const cx = player.x + player.width / 2;
    const cz = player.z + player.depth / 2;
    const dx = cx - x;
    const dz = cz - z;
    const horizontal = Math.hypot(dx, dz);
    if (attack.mode === "target") {
        if (attack.target !== userName || Math.hypot(horizontal, player.y + 0.9 - y) > radius) return;
    } else if (horizontal > radius || Math.abs(player.y - y) > 3) {
        return;
    }
    if (attack.groundedOnly && !player.onGround) {
        addMessage("Jumped the shockwave!", 1000);
        return;
    }
    const knock = Math.max(0, Math.min(12, Number(attack.knockback) || 0));
    const kx = horizontal > 0.01 ? dx / horizontal * knock : 0;
    const kz = horizontal > 0.01 ? dz / horizontal * knock : 0;
    applyEliteDamageToLocalPlayer(damage, label, kx, kz, Number(attack.lift) || 0);
}

function spawnEliteShockwave(position, radius) {
    if (typeof scene === "undefined" || !scene) return;
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.1, 40),
        new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, position.y + 0.15, position.z);
    scene.add(ring);
    eliteMobEffects.push({ mesh: ring, start: performance.now(), duration: 650, radius, kind: "ring" });
}

function spawnEliteBurst(position, color, count = 14) {
    if (typeof scene === "undefined" || !scene) return;
    for (let i = 0; i < count; i++) {
        const shard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
        shard.position.copy(position);
        scene.add(shard);
        eliteMobEffects.push({
            mesh: shard,
            start: performance.now(),
            duration: 900,
            kind: "shard",
            velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 7, (Math.random() - 0.5) * 8)
        });
    }
}

function updateEliteMobEffects(dt) {
    const now = performance.now();
    for (let i = eliteMobEffects.length - 1; i >= 0; i--) {
        const effect = eliteMobEffects[i];
        const progress = Math.max(0, (now - effect.start) / effect.duration);
        if (progress >= 1) {
            scene.remove(effect.mesh);
            disposeObject(effect.mesh);
            eliteMobEffects.splice(i, 1);
            continue;
        }
        if (effect.kind === "ring") {
            effect.mesh.scale.setScalar(Math.max(0.1, effect.radius * progress));
        } else {
            effect.velocity.y -= 14 * dt;
            effect.mesh.position.addScaledVector(effect.velocity, dt);
            effect.mesh.rotation.x += dt * 6;
        }
        effect.mesh.material.opacity = 1 - progress;
    }
}

function isProjectileHittingMob(mob, point) {
    if (mob.type === "ufo_saucer") {
        return Math.abs(point.x - mob.pos.x) < 30 && Math.abs(point.y - mob.pos.y) < 15 && Math.abs(point.z - mob.pos.z) < 50;
    }
    const def = getEliteMobDef(mob.type);
    if (def) {
        return Math.hypot(point.x - mob.pos.x, point.y - (mob.pos.y + def.hitCenterY), point.z - mob.pos.z) < def.hitRadius;
    }
    return point.distanceTo(mob.pos) < 1.5;
}

// Applies a projectile hit from the local shooter; non-authority shooters route it to the mob's authority.
function sendProjectileMobDamage(mob, damage, shooter) {
    if (isMobAuthority(mob)) {
        mob.hurt(damage, shooter);
        return;
    }
    const spawnerPeer = mob.spawner ? peers.get(mob.spawner) : null;
    const message = JSON.stringify({ type: "mob_hit", id: mob.id, damage, username: shooter });
    if (spawnerPeer && spawnerPeer.dc && spawnerPeer.dc.readyState === "open") {
        spawnerPeer.dc.send(message);
        return;
    }
    for (const [, peer] of peers.entries()) {
        if (peer.dc && peer.dc.readyState === "open") peer.dc.send(message);
    }
}

// ---------- construction ----------

function eliteMaterial(mob, color, options = {}) {
    const material = options.standard
        ? new THREE.MeshStandardMaterial(Object.assign({ color }, options.params || {}))
        : new THREE.MeshLambertMaterial(Object.assign({ color }, options.params || {}));
    if (material.emissive) {
        material.userData.baseEmissive = material.emissive.getHex();
        mob.flashMaterials.push(material);
    }
    return material;
}

function eliteBox(w, h, d, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    return mesh;
}

function makeLimb(material, width, length, depth, x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    pivot.add(eliteBox(width, length, depth, material, 0, -length / 2, 0));
    return pivot;
}

function buildEliteMob(mob) {
    const def = getEliteMobDef(mob.type);
    mob.hp = def.hp;
    mob.maxHp = def.hp;
    mob.isAggressive = !def.provoke;
    mob.aiState = def.flying ? "PATROL" : def.aquatic ? "PROWL" : "IDLE";
    mob.originalColor = null;
    mob.flashMaterials = [];
    mob.mesh = new THREE.Group();
    mob.rig = new THREE.Group();
    mob.mesh.add(mob.rig);
    mob.mesh.userData.eliteType = mob.type;
    const variant = makeSeededRandom(String(mob.id) + "_elite_variant")();
    if (mob.type === "bone_archer") buildBoneArcher(mob, variant);
    else if (mob.type === "sentinel_drone") buildSentinelDrone(mob, variant);
    else if (mob.type === "dust_vulture") buildDustVulture(mob, variant);
    else if (mob.type === "brick_golem") buildBrickGolem(mob, variant);
    else if (mob.type === "magma_wyrm") buildMagmaWyrm(mob, variant);
    else if (mob.type === "crater_hopper") buildCraterHopper(mob, variant);
    else if (mob.type === "ember_drifter") buildEmberDrifter(mob, variant);
    else if (mob.type === "moss_brute") buildMossBrute(mob, variant);
}

function buildBoneArcher(mob) {
    mob.speed = 2.6;
    const bone = eliteMaterial(mob, 0xe8e2d0);
    const darkBone = eliteMaterial(mob, 0xbab29c);
    const eye = new THREE.MeshBasicMaterial({ color: 0xc04dff });
    const wood = eliteMaterial(mob, 0x6b4423);
    const rig = mob.rig;
    rig.add(eliteBox(0.5, 0.18, 0.26, darkBone, 0, 0.98, 0));
    rig.add(eliteBox(0.12, 0.6, 0.12, bone, 0, 1.3, 0));
    for (let i = 0; i < 3; i++) rig.add(eliteBox(0.5 - i * 0.05, 0.06, 0.28, bone, 0, 1.2 + i * 0.15, 0));
    const head = new THREE.Group();
    head.position.set(0, 1.62, 0);
    head.add(eliteBox(0.5, 0.5, 0.5, bone, 0, 0.25, 0));
    for (const side of [-1, 1]) head.add(eliteBox(0.12, 0.1, 0.04, eye, side * 0.12, 0.3, 0.26));
    head.add(eliteBox(0.3, 0.05, 0.04, darkBone, 0, 0.1, 0.26));
    rig.add(head);
    mob.head = head;
    mob.legs = [makeLimb(bone, 0.12, 0.9, 0.12, -0.14, 0.92, 0), makeLimb(bone, 0.12, 0.9, 0.12, 0.14, 0.92, 0)];
    mob.arms = [makeLimb(bone, 0.1, 0.75, 0.1, -0.33, 1.56, 0), makeLimb(bone, 0.1, 0.75, 0.1, 0.33, 1.56, 0)];
    mob.legs.forEach(leg => rig.add(leg));
    mob.arms.forEach(arm => rig.add(arm));
    const bow = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI), wood);
    limb.rotation.z = Math.PI / 2;
    bow.add(limb);
    mob.bowString = eliteBox(0.015, 0.9, 0.015, new THREE.MeshBasicMaterial({ color: 0xf5f5f5 }), 0, 0, 0);
    bow.add(mob.bowString);
    bow.position.set(0, -0.72, 0.05);
    bow.rotation.y = Math.PI / 2;
    mob.arms[0].add(bow);
    mob.bow = bow;
}

function buildSentinelDrone(mob) {
    mob.speed = 7;
    const shell = eliteMaterial(mob, 0xb8bcc4, { standard: true, params: { metalness: 0.85, roughness: 0.28 } });
    const dark = eliteMaterial(mob, 0x30343c, { standard: true, params: { metalness: 0.6, roughness: 0.5 } });
    const rig = mob.rig;
    rig.add(new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), shell));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.09, 8, 28), dark);
    band.rotation.x = Math.PI / 2;
    rig.add(band);
    mob.band = band;
    mob.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd040 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mob.eyeMaterial);
    eye.position.set(0, 0.05, 0.62);
    rig.add(eye);
    const visor = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), dark);
    visor.position.set(0, 0.05, 0.66);
    rig.add(visor);
    mob.fins = [];
    for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 4), shell);
        fin.rotation.z = side * Math.PI / 2;
        fin.position.set(side * 1.0, 0, -0.05);
        rig.add(fin);
        mob.fins.push(fin);
    }
    mob.thrusterMaterial = new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.85 });
    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mob.thrusterMaterial);
    thruster.position.set(0, -0.72, 0);
    rig.add(thruster);
    const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 10, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0, 5.6);
    beam.visible = false;
    rig.add(beam);
    mob.scanBeam = beam;
}

function buildDustVulture(mob, variant) {
    mob.speed = 9;
    const feathers = eliteMaterial(mob, variant < 0.5 ? 0x3a2a20 : 0x2a2420);
    const skin = eliteMaterial(mob, 0xc0655a);
    const beakMaterial = eliteMaterial(mob, 0xd8c070);
    const ruff = eliteMaterial(mob, 0xd8d0c0);
    const rig = mob.rig;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), feathers);
    body.scale.set(0.9, 0.75, 1.6);
    rig.add(body);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 16), ruff);
    collar.position.set(0, 0.18, 0.62);
    rig.add(collar);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.45, 8), skin);
    neck.rotation.x = Math.PI / 3;
    neck.position.set(0, 0.3, 0.82);
    rig.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skin);
    head.position.set(0, 0.44, 1.06);
    rig.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 8), beakMaterial);
    beak.rotation.x = Math.PI / 2 + 0.35;
    beak.position.set(0, 0.36, 1.3);
    rig.add(beak);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x110000 });
    for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), eyeMaterial);
        eye.position.set(side * 0.13, 0.5, 1.16);
        rig.add(eye);
    }
    mob.wings = [];
    for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * 0.35, 0.15, 0.1);
        wing.add(eliteBox(1.5, 0.06, 0.75, feathers, side * 0.75, 0, 0));
        for (let i = 0; i < 4; i++) {
            const feather = eliteBox(0.6, 0.04, 0.16, feathers, side * (1.65 + i * 0.05), 0, 0.25 - i * 0.18);
            feather.rotation.y = side * (i * 0.12 - 0.1);
            wing.add(feather);
        }
        rig.add(wing);
        mob.wings.push(wing);
    }
    const tail = eliteBox(0.5, 0.05, 0.55, feathers, 0, 0.02, -0.95);
    rig.add(tail);
    mob.talons = [];
    for (const side of [-1, 1]) {
        const talon = eliteBox(0.08, 0.35, 0.08, beakMaterial, side * 0.15, -0.45, 0.15);
        talon.visible = false;
        rig.add(talon);
        mob.talons.push(talon);
    }
    mob.flockPhase = variant * Math.PI * 2;
}

function buildBrickGolem(mob, variant) {
    mob.speed = 1.6;
    const brick = eliteMaterial(mob, 0x8d7b66);
    const brickDark = eliteMaterial(mob, 0x6c5d4d);
    const moss = eliteMaterial(mob, 0x4f7a3a);
    const glow = new THREE.MeshBasicMaterial({ color: 0x55f0ff });
    const rig = mob.rig;
    rig.add(eliteBox(2.3, 1.9, 1.4, brick, 0, 2.75, 0));
    for (let row = 0; row < 3; row++) {
        rig.add(eliteBox(2.34, 0.06, 1.44, brickDark, 0, 2.05 + row * 0.62, 0));
    }
    rig.add(eliteBox(1.7, 0.6, 1.1, brickDark, 0, 1.7, 0));
    const head = new THREE.Group();
    head.position.set(0, 3.7, 0.15);
    head.add(eliteBox(1.1, 0.9, 1.0, brick, 0, 0.45, 0));
    for (const side of [-1, 1]) head.add(eliteBox(0.22, 0.14, 0.05, glow, side * 0.25, 0.5, 0.52));
    rig.add(head);
    mob.head = head;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), glow);
    core.position.set(0, 2.9, 0.72);
    rig.add(core);
    mob.core = core;
    for (let i = 0; i < 4; i++) {
        const r = makeSeededRandom(String(mob.id) + "_moss_" + i);
        rig.add(eliteBox(0.4 + r() * 0.4, 0.15, 0.4 + r() * 0.3, moss, (r() - 0.5) * 1.8, 3.72 + (i % 2) * 0.05, (r() - 0.5) * 1.0));
    }
    mob.arms = [];
    for (const side of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(side * 1.5, 3.5, 0);
        arm.add(eliteBox(0.7, 1.0, 0.7, brick, 0, -0.5, 0));
        arm.add(eliteBox(0.85, 1.4, 0.85, brickDark, 0, -1.6, 0));
        arm.add(eliteBox(1.05, 0.9, 1.05, brick, 0, -2.6, 0));
        rig.add(arm);
        mob.arms.push(arm);
    }
    mob.legs = [makeLimb(brickDark, 0.9, 1.5, 0.9, -0.6, 1.5, 0), makeLimb(brickDark, 0.9, 1.5, 0.9, 0.6, 1.5, 0)];
    mob.legs.forEach(leg => rig.add(leg));
    mob.rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), brickDark);
    mob.rock.position.set(0, -3.1, 0);
    mob.rock.visible = false;
    mob.arms[1].add(mob.rock);
    mob.rig.scale.setScalar(0.95 + variant * 0.15);
}

function buildMagmaWyrm(mob) {
    mob.speed = 4.5;
    const hide = eliteMaterial(mob, 0x2b1b18, { standard: true, params: { roughness: 0.7, metalness: 0.15, emissive: 0x3a0e00 } });
    const lava = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
    mob.mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x601800 });
    const rig = mob.rig;
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), hide);
    skull.scale.set(1, 0.75, 1.7);
    head.add(skull);
    mob.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.5), hide);
    mob.jaw.position.set(0, -0.45, 0.55);
    head.add(mob.jaw);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.2), mob.mouthMaterial);
    mouth.position.set(0, -0.3, 0.6);
    head.add(mouth);
    for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
        eye.position.set(side * 0.5, 0.25, 0.85);
        head.add(eye);
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 6), hide);
        horn.rotation.x = -Math.PI / 2.6;
        horn.position.set(side * 0.38, 0.5, -0.4);
        head.add(horn);
    }
    rig.add(head);
    mob.head = head;
    mob.segments = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
        const radius = 0.78 - i * 0.055;
        const segment = new THREE.Group();
        segment.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), hide));
        const spike = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.35, radius * 1.1, 5), lava);
        spike.position.y = radius * 0.9;
        segment.add(spike);
        segment.position.z = -1.15 - i * 1.0;
        rig.add(segment);
        mob.segments.push(segment);
    }
}

function buildCraterHopper(mob, variant) {
    mob.speed = 4;
    const jelly = eliteMaterial(mob, variant < 0.5 ? 0x9ad8ff : 0xb8f0d8, { params: { transparent: true, opacity: 0.72 } });
    const core = eliteMaterial(mob, 0x4a7ab0);
    const eye = new THREE.MeshBasicMaterial({ color: 0x0b1a2a });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const body = new THREE.Group();
    body.add(eliteBox(1.1, 1.1, 1.1, jelly, 0, 0.55, 0));
    body.add(eliteBox(0.45, 0.45, 0.45, core, 0, 0.45, -0.05));
    for (const side of [-1, 1]) {
        body.add(eliteBox(0.16, 0.24, 0.04, eye, side * 0.24, 0.72, 0.56));
        body.add(eliteBox(0.06, 0.06, 0.02, shine, side * 0.24 + 0.04, 0.8, 0.585));
    }
    body.add(eliteBox(0.3, 0.06, 0.04, eye, 0, 0.42, 0.56));
    mob.rig.add(body);
    mob.body = body;
    mob.rig.scale.setScalar(0.9 + variant * 0.25);
}

function buildEmberDrifter(mob) {
    mob.speed = 2.2;
    const ash = eliteMaterial(mob, 0x4a4542);
    const charred = eliteMaterial(mob, 0x2a2624);
    const ember = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
    mob.emberMaterial = ember;
    const rig = mob.rig;
    mob.legs = [makeLimb(charred, 0.16, 0.7, 0.16, -0.16, 0.7, 0), makeLimb(charred, 0.16, 0.7, 0.16, 0.16, 0.7, 0)];
    mob.legs.forEach(leg => rig.add(leg));
    const torso = new THREE.Group();
    torso.position.set(0, 0.7, 0);
    torso.rotation.x = 0.55;
    torso.add(eliteBox(0.55, 0.85, 0.32, ash, 0, 0.42, 0));
    for (let i = 0; i < 3; i++) torso.add(eliteBox(0.08, 0.3 - i * 0.06, 0.04, ember, (i - 1) * 0.14, 0.45 + (i % 2) * 0.08, 0.17));
    const head = new THREE.Group();
    head.position.set(0, 0.9, 0.08);
    head.add(eliteBox(0.4, 0.42, 0.4, ash, 0, 0.2, 0));
    for (const side of [-1, 1]) head.add(eliteBox(0.12, 0.05, 0.03, ember, side * 0.1, 0.24, 0.21));
    head.add(eliteBox(0.22, 0.05, 0.03, charred, 0, 0.08, 0.21));
    torso.add(head);
    mob.head = head;
    mob.arms = [makeLimb(ash, 0.12, 1.0, 0.12, -0.36, 0.8, 0), makeLimb(ash, 0.12, 1.0, 0.12, 0.36, 0.8, 0)];
    mob.arms.forEach(arm => torso.add(arm));
    mob.cinder = eliteBox(0.32, 0.32, 0.32, ember, 0, -1.05, 0);
    mob.cinder.visible = false;
    mob.arms[1].add(mob.cinder);
    rig.add(torso);
    mob.torso = torso;
}

function buildMossBrute(mob, variant) {
    mob.speed = 2.4;
    const skin = eliteMaterial(mob, variant < 0.5 ? 0x6f8a52 : 0x7d8a4a);
    const hide = eliteMaterial(mob, 0x5a3f2a);
    const moss = eliteMaterial(mob, 0x3f6b2e);
    const tusk = eliteMaterial(mob, 0xf0ead8);
    const wood = eliteMaterial(mob, 0x6b4423);
    const eye = new THREE.MeshBasicMaterial({ color: 0xffd23a });
    const rig = mob.rig;
    mob.legs = [makeLimb(hide, 0.36, 0.75, 0.36, -0.3, 0.75, 0), makeLimb(hide, 0.36, 0.75, 0.36, 0.3, 0.75, 0)];
    mob.legs.forEach(leg => rig.add(leg));
    const body = new THREE.Group();
    body.position.set(0, 0.75, 0);
    body.add(eliteBox(1.1, 0.95, 0.75, skin, 0, 0.5, 0));
    body.add(eliteBox(1.14, 0.3, 0.79, hide, 0, 0.12, 0));
    body.add(eliteBox(0.9, 0.22, 0.6, moss, 0, 1.05, -0.08));
    const head = new THREE.Group();
    head.position.set(0, 0.95, 0.3);
    head.add(eliteBox(0.6, 0.55, 0.55, skin, 0, 0.25, 0.05));
    head.add(eliteBox(0.36, 0.26, 0.24, skin, 0, 0.12, 0.42));
    head.add(eliteBox(0.16, 0.08, 0.02, hide, 0, 0.16, 0.55));
    for (const side of [-1, 1]) {
        head.add(eliteBox(0.1, 0.08, 0.03, eye, side * 0.17, 0.38, 0.33));
        const t = eliteBox(0.07, 0.24, 0.07, tusk, side * 0.15, 0.1, 0.5);
        t.rotation.x = -0.4;
        head.add(t);
        head.add(eliteBox(0.12, 0.2, 0.06, skin, side * 0.32, 0.48, 0));
    }
    body.add(head);
    mob.head = head;
    mob.arms = [makeLimb(skin, 0.3, 0.85, 0.3, -0.72, 0.85, 0), makeLimb(skin, 0.3, 0.85, 0.3, 0.72, 0.85, 0)];
    mob.arms.forEach(arm => body.add(arm));
    const club = new THREE.Group();
    club.add(eliteBox(0.12, 0.9, 0.12, wood, 0, -0.3, 0));
    club.add(eliteBox(0.3, 0.42, 0.3, wood, 0, -0.85, 0));
    club.add(eliteBox(0.32, 0.1, 0.32, moss, 0, -0.66, 0));
    club.position.set(0, -0.8, 0.12);
    club.rotation.x = Math.PI / 2;
    mob.arms[1].add(club);
    rig.add(body);
    mob.body = body;
}

// ---------- per-frame update ----------

function updateEliteMob(mob, dt) {
    const now = Date.now();
    mob.animationTime += dt;
    if (isMobAuthority(mob)) {
        if (!mob.stateSince) mob.stateSince = now;
        applyEliteKnockback(mob, dt);
        if (mob.type === "bone_archer") thinkBoneArcher(mob, dt, now);
        else if (mob.type === "sentinel_drone") thinkSentinelDrone(mob, dt, now);
        else if (mob.type === "dust_vulture") thinkDustVulture(mob, dt, now);
        else if (mob.type === "brick_golem") thinkBrickGolem(mob, dt, now);
        else if (mob.type === "magma_wyrm") thinkMagmaWyrm(mob, dt, now);
        else if (mob.type === "crater_hopper") thinkCraterHopper(mob, dt, now);
        else if (mob.type === "ember_drifter") thinkEmberDrifter(mob, dt, now);
        else if (mob.type === "moss_brute") thinkMossBrute(mob, dt, now);
        queueEliteMobUpdate(mob);
    } else {
        if (mob.lastUpdateTime > 0) {
            const blend = 1 - Math.exp(-dt * 10);
            mob.pos.lerp(mob.targetPos, blend);
            if (mob.lastQuaternionUpdate > 0) mob.mesh.quaternion.slerp(mob.targetQuaternion, blend);
        } else {
            mob.pos.copy(mob.targetPos);
        }
    }
    if (mob.aiState !== mob.lastAnimatedState) {
        mob.stateChangedAt = now;
        mob.lastAnimatedState = mob.aiState;
    }
    animateEliteMob(mob, dt, now);
    const flashing = now < mob.flashEnd;
    for (const material of mob.flashMaterials) {
        material.emissive.setHex(flashing ? 0xaa0000 : material.userData.baseEmissive);
    }
    mob.mesh.position.set(mob.pos.x, mob.pos.y, mob.pos.z);
}

function setEliteState(mob, state, now) {
    if (mob.aiState === state) return;
    mob.aiState = state;
    mob.stateSince = now;
}

function queueEliteMobUpdate(mob) {
    const moved = mob.pos.distanceTo(mob.lastSentPos) > 0.1;
    const rotated = mob.mesh.quaternion.angleTo(mob.lastSentQuaternion) > 0.01;
    if (!moved && !rotated && mob.lastSentState === mob.aiState && mob.lastSentHp === mob.hp) return;
    if (!window.mobUpdateQueue) window.mobUpdateQueue = [];
    window.mobUpdateQueue.push({
        id: mob.id,
        x: mob.pos.x,
        y: mob.pos.y,
        z: mob.pos.z,
        quaternion: mob.mesh.quaternion.toArray(),
        isMoving: mob.isMoving,
        aiState: mob.aiState,
        type: mob.type,
        hp: mob.hp,
        isAggressive: mob.isAggressive,
        originSeed: mob.originSeed
    });
    mob.lastSentPos.copy(mob.pos);
    mob.lastSentQuaternion.copy(mob.mesh.quaternion);
    mob.lastSentState = mob.aiState;
    mob.lastSentHp = mob.hp;
}

// Minecraft skeleton: keeps its distance, strafes, draws its bow and looses arcing arrows.
function thinkBoneArcher(mob, dt, now) {
    settleEliteOnGround(mob, dt);
    const target = findEliteTarget(mob, 26, 14);
    let move = null;
    if (target) {
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        faceEliteMob(mob, dx, dz, 8, dt);
        if (!mob.strafeSwitchAt || now > mob.strafeSwitchAt) {
            mob.strafeSwitchAt = now + 1200 + Math.random() * 1800;
            mob.strafeSide = Math.random() < 0.5 ? -1 : 1;
        }
        const aiming = mob.aiState === "AIMING";
        const speed = mob.speed * (aiming ? 0.45 : 1);
        if (target.distance < 6) move = { x: -dx, z: -dz, speed: speed * 1.1 };
        else if (target.distance > 15) move = { x: dx, z: dz, speed };
        else move = { x: -dz * mob.strafeSide, z: dx * mob.strafeSide, speed: speed * 0.7 };
        if (!aiming && now >= (mob.nextShotAt || 0) && target.distance < 22) {
            setEliteState(mob, "AIMING", now);
        } else if (aiming && now - mob.stateSince > 900) {
            const style = MOB_PROJECTILE_STYLES.arrow;
            const forward = new THREE.Vector3(dx, 0, dz).normalize();
            const origin = new THREE.Vector3(mob.pos.x + forward.x * 0.6, mob.pos.y + 1.45, mob.pos.z + forward.z * 0.6);
            const aimPoint = new THREE.Vector3(target.x, target.y + 1.1, target.z);
            fireEliteProjectile(mob, "arrow", origin, getBallisticDirection(origin, aimPoint, style.speed, style.gravity, 0.06));
            mob.nextShotAt = now + 1500 + Math.random() * 900;
            setEliteState(mob, "STRAFE", now);
        } else if (!aiming) {
            setEliteState(mob, target.distance < 6 ? "RETREAT" : target.distance > 15 ? "CHASE" : "STRAFE", now);
        }
    } else {
        setEliteState(mob, "IDLE", now);
        move = eliteWander(mob, dt, mob.speed * 0.4, now);
        if (move) faceEliteMob(mob, move.x, move.z, 3, dt);
    }
    mob.isMoving = !!(move && stepEliteOnGround(mob, move.x, move.z, move.speed * dt));
}

// No Man's Sky sentinel: patrols, scans intruders, then strafes in an orbit firing laser bursts.
function thinkSentinelDrone(mob, dt, now) {
    if (!mob.home) mob.home = mob.pos.clone();
    const target = findEliteTarget(mob, mob.aiState === "ALERT" ? 44 : 26, 40);
    let goal = null;
    if (mob.aiState === "REPAIRING") {
        mob.repairTick = mob.repairTick || now;
        if (now - mob.repairTick > 500) {
            mob.repairTick = now;
            mob.hp = Math.min(Math.ceil(mob.maxHp * 0.7), mob.hp + 1);
        }
        goal = mob.pos.clone().add(new THREE.Vector3(Math.sin(mob.animationTime * 0.7) * 4, 6, Math.cos(mob.animationTime * 0.7) * 4));
        if (now - mob.stateSince > 5000) setEliteState(mob, target ? "ALERT" : "PATROL", now);
    } else if (target) {
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        faceEliteMob(mob, dx, dz, 6, dt);
        if (mob.aiState === "PATROL") setEliteState(mob, "SCANNING", now);
        if (mob.aiState === "SCANNING") {
            goal = mob.pos.clone();
            if (now - mob.stateSince > 2000) {
                setEliteState(mob, "ALERT", now);
                mob.nextBurstAt = now + 600;
                if (target.local) addMessage("⚠ Sentinel alert! You are wanted.", 2000);
                callSentinelReinforcement(mob, target);
            }
        } else {
            const orbitAngle = mob.animationTime * 0.45 + (mob.orbitOffset || (mob.orbitOffset = Math.random() * Math.PI * 2));
            goal = new THREE.Vector3(target.x + Math.cos(orbitAngle) * 11, target.y + 5.5, target.z + Math.sin(orbitAngle) * 11);
            if (now >= (mob.nextBurstAt || 0)) {
                mob.burstShots = 3;
                mob.nextBurstAt = now + 2400 + Math.random() * 600;
                mob.nextShotAt = now;
            }
            if (mob.burstShots > 0 && now >= mob.nextShotAt) {
                const forward = new THREE.Vector3(dx, 0, dz).normalize();
                const origin = mob.pos.clone().add(forward.multiplyScalar(0.9));
                const aim = new THREE.Vector3(target.x, target.y + 1, target.z);
                fireEliteProjectile(mob, "sentinel", origin, getBallisticDirection(origin, aim, MOB_PROJECTILE_STYLES.sentinel.speed, 0, 0.05), mob.burstShots);
                mob.burstShots--;
                mob.nextShotAt = now + 180;
            }
            if (mob.hp <= mob.maxHp * 0.35 && !mob.repaired) {
                mob.repaired = true;
                setEliteState(mob, "REPAIRING", now);
            }
        }
    } else {
        if (mob.aiState !== "PATROL") setEliteState(mob, "PATROL", now);
        const t = mob.animationTime * 0.25;
        goal = new THREE.Vector3(mob.home.x + Math.cos(t) * 10, mob.home.y, mob.home.z + Math.sin(t * 1.3) * 10);
        faceEliteMob(mob, goal.x - mob.pos.x, goal.z - mob.pos.z, 2, dt);
    }
    mob.isMoving = moveEliteFlyer(mob, goal, mob.speed, 3, 3, dt);
}

function callSentinelReinforcement(mob, target) {
    if (mob.isReinforcement || mob.calledReinforcement || typeof spawnMobAndBroadcast !== "function") return;
    mob.calledReinforcement = true;
    const nearby = mobs.filter(other => other.type === "sentinel_drone" && Math.hypot(other.pos.x - target.x, other.pos.z - target.z) < 96).length;
    if (nearby >= ELITE_MOB_TYPES.sentinel_drone.maxCount + 1) return;
    const angle = Math.random() * Math.PI * 2;
    const x = modWrap(target.x + Math.cos(angle) * 24, MAP_SIZE);
    const z = modWrap(target.z + Math.sin(angle) * 24, MAP_SIZE);
    const reinforcement = spawnMobAndBroadcast("sentinel_drone", x, z, Math.min(MAX_HEIGHT - 8, chunkManager.getSurfaceY(x, z) + 10));
    if (reinforcement) {
        reinforcement.isReinforcement = true;
        reinforcement.aiState = "ALERT";
        reinforcement.stateSince = Date.now();
    }
}

function moveEliteFlyer(mob, goal, maxSpeed, clearance, response, dt) {
    if (!goal) return false;
    mob.flyVelocity = mob.flyVelocity || new THREE.Vector3();
    const desired = goal.clone().sub(mob.pos);
    const distance = desired.length();
    if (distance > 0.05) desired.multiplyScalar(Math.min(maxSpeed, distance * 2) / distance);
    else desired.set(0, 0, 0);
    mob.flyVelocity.lerp(desired, 1 - Math.exp(-response * dt));
    const next = mob.pos.clone().addScaledVector(mob.flyVelocity, dt);
    next.x = modWrap(next.x, MAP_SIZE);
    next.z = modWrap(next.z, MAP_SIZE);
    const ground = chunkManager.getSurfaceY(next.x, next.z) + 1;
    if (next.y < ground + clearance) {
        next.y = Math.min(mob.pos.y + 8 * dt, ground + clearance);
        if (mob.flyVelocity.y < 0) mob.flyVelocity.y = 0;
    }
    if (isSolid(getBlockAt(next.x, next.y, next.z))) {
        next.set(mob.pos.x, mob.pos.y + 6 * dt, mob.pos.z);
    }
    next.y = Math.min(next.y, MAX_HEIGHT - 4);
    mob.pos.copy(next);
    return mob.flyVelocity.lengthSq() > 0.01;
}

// 7 Days to Die vulture: the flock circles a bone-strewn roost far from the player. Anyone who wanders
// close to the roost gets circled, dive-bombed for a bite, and chased until they leave the leash.
function findEliteTargetNearPoint(mob, center, range, maxDy) {
    let best = null;
    let bestDistance = range;
    for (const p of getEliteTargetablePlayers()) {
        if (Math.abs(p.y - center.y) > maxDy || !isEliteTargetHostile(mob, p)) continue;
        const d = Math.hypot(p.x - center.x, p.z - center.z);
        if (d < bestDistance) {
            bestDistance = d;
            best = p;
        }
    }
    if (best) best.distance = Math.hypot(best.x - mob.pos.x, best.z - mob.pos.z);
    return best;
}

function thinkDustVulture(mob, dt, now) {
    const def = getEliteMobDef(mob.type);
    if (!mob.home) mob.home = new THREE.Vector3(mob.pos.x, chunkManager.getSurfaceY(mob.pos.x, mob.pos.z), mob.pos.z);
    const engaged = mob.aiState === "CIRCLING" || mob.aiState === "DIVING" || mob.aiState === "CLIMBING";
    const target = findEliteTargetNearPoint(mob, mob.home, engaged ? def.roost.leash : def.roost.alertRange, 50);
    const phase = mob.animationTime * 0.6 + (mob.flockPhase || 0);
    const cruiseY = Math.min(MAX_HEIGHT - 8, mob.home.y + def.spawnAltitude);
    let goal;
    let speed = mob.speed;
    if (mob.aiState === "DIVING" && target) {
        goal = new THREE.Vector3(target.x, target.y + 0.9, target.z);
        speed = 17;
        const reach = Math.hypot(target.x - mob.pos.x, target.y + 0.9 - mob.pos.y, target.z - mob.pos.z);
        if (reach < 1.9) {
            dispatchEliteAttack(mob, {
                mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                radius: 3, damage: 2, knockback: 6, lift: 4, label: "Raked by a Dust Vulture"
            });
            setEliteState(mob, "CLIMBING", now);
        } else if (now - mob.stateSince > 2600) {
            setEliteState(mob, "CLIMBING", now);
        }
    } else if (mob.aiState === "CLIMBING") {
        const away = mob.flyVelocity ? mob.flyVelocity.clone().setY(0) : new THREE.Vector3(1, 0, 0);
        if (away.lengthSq() < 0.01) away.set(Math.cos(phase), 0, Math.sin(phase));
        goal = mob.pos.clone().add(away.normalize().multiplyScalar(10)).add(new THREE.Vector3(0, 10, 0));
        if (now - mob.stateSince > 1800) {
            setEliteState(mob, target ? "CIRCLING" : "PATROL", now);
            mob.nextDiveAt = now + 3500 + Math.random() * 3500;
        }
    } else if (target) {
        if (mob.aiState !== "CIRCLING") {
            setEliteState(mob, "CIRCLING", now);
            mob.nextDiveAt = now + 2500 + Math.random() * 3000;
        }
        goal = new THREE.Vector3(target.x + Math.cos(phase) * 12, Math.max(target.y + 11, chunkManager.getSurfaceY(target.x, target.z) + 10), target.z + Math.sin(phase) * 12);
        if (now >= (mob.nextDiveAt || 0) && target.distance < 30) setEliteState(mob, "DIVING", now);
    } else {
        // Lazy thermal circles over the roost, high enough to be spotted from afar in third person.
        setEliteState(mob, "PATROL", now);
        const radius = def.roost.radius + Math.sin(phase * 0.3) * 3;
        goal = new THREE.Vector3(mob.home.x + Math.cos(phase * 0.5) * radius, cruiseY + Math.sin(phase * 0.7) * 2, mob.home.z + Math.sin(phase * 0.5) * radius);
    }
    mob.isMoving = moveEliteFlyer(mob, goal, speed, mob.aiState === "DIVING" ? 0.4 : 2, mob.aiState === "DIVING" ? 5 : 2.2, dt);
    if (mob.flyVelocity) faceEliteMob(mob, mob.flyVelocity.x, mob.flyVelocity.z, 4, dt);
}

// Dragon Quest Builders golem: lumbering pursuit, telegraphed ground slam (jump to dodge) and boulder toss.
function thinkBrickGolem(mob, dt, now) {
    settleEliteOnGround(mob, dt);
    const target = findEliteTarget(mob, 32, 16);
    let move = null;
    if (mob.aiState === "WINDUP") {
        if (now - mob.stateSince > 1200) {
            setEliteState(mob, "SLAM", now);
            const forward = new THREE.Vector3(0, 0, 1.6).applyQuaternion(mob.mesh.quaternion);
            dispatchEliteAttack(mob, {
                mode: "area", x: mob.pos.x + forward.x, y: mob.pos.y, z: mob.pos.z + forward.z,
                radius: 7, damage: 5, knockback: 9, lift: 5, groundedOnly: true, fx: "shockwave",
                label: "Flattened by a Brick Golem shockwave"
            });
            mob.slamReadyAt = now + 3400;
        }
    } else if (mob.aiState === "SLAM") {
        if (now - mob.stateSince > 700) setEliteState(mob, "CHASE", now);
    } else if (mob.aiState === "THROW") {
        if (!mob.thrown && now - mob.stateSince > 900 && target) {
            mob.thrown = true;
            const style = MOB_PROJECTILE_STYLES.boulder;
            const origin = new THREE.Vector3(mob.pos.x, mob.pos.y + 5, mob.pos.z);
            fireEliteProjectile(mob, "boulder", origin, getBallisticDirection(origin, new THREE.Vector3(target.x, target.y + 0.8, target.z), style.speed, style.gravity, 0.04));
        }
        if (now - mob.stateSince > 1400) setEliteState(mob, "CHASE", now);
    } else if (target) {
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        faceEliteMob(mob, dx, dz, 2, dt);
        if (target.distance < 6 && now >= (mob.slamReadyAt || 0)) {
            setEliteState(mob, "WINDUP", now);
        } else if (target.distance > 10 && target.distance < 24 && now >= (mob.throwReadyAt || 0)) {
            mob.thrown = false;
            mob.throwReadyAt = now + 7000 + Math.random() * 3000;
            setEliteState(mob, "THROW", now);
        } else {
            setEliteState(mob, "CHASE", now);
            if (target.distance > 3) move = { x: dx, z: dz, speed: mob.speed };
        }
    } else {
        setEliteState(mob, "IDLE", now);
        move = eliteWander(mob, dt, mob.speed * 0.5, now);
        if (move) faceEliteMob(mob, move.x, move.z, 1.5, dt);
    }
    mob.isMoving = !!(move && stepEliteOnGround(mob, move.x, move.z, move.speed * dt));
}

// Cube World slime: bounces toward prey in long low-gravity hops and squashes anyone it lands on.
function thinkCraterHopper(mob, dt, now) {
    const target = findEliteTarget(mob, 20, 12);
    if (mob.aiState === "HOP") {
        mob.hopVel.y -= 9 * dt;
        const nx = modWrap(mob.pos.x + mob.hopVel.x * dt, MAP_SIZE);
        const nz = modWrap(mob.pos.z + mob.hopVel.z * dt, MAP_SIZE);
        if (checkCollisionWithBlock(nx, mob.pos.y, nz)) {
            mob.hopVel.x *= -0.3;
            mob.hopVel.z *= -0.3;
        } else {
            mob.pos.x = nx;
            mob.pos.z = nz;
        }
        const ny = mob.pos.y + mob.hopVel.y * dt;
        let landed = false;
        if (mob.hopVel.y < 0 && checkCollisionWithBlock(mob.pos.x, ny, mob.pos.z)) {
            mob.pos.y = Math.ceil(ny);
            landed = true;
        } else if (mob.hopVel.y > 0 && checkCollisionWithBlock(mob.pos.x, ny + 0.4, mob.pos.z)) {
            mob.hopVel.y = 0;
        } else {
            mob.pos.y = ny;
        }
        faceEliteMob(mob, mob.hopVel.x, mob.hopVel.z, 6, dt);
        if (target && !mob.hopHit && Math.hypot(target.x - mob.pos.x, target.y + 0.5 - mob.pos.y, target.z - mob.pos.z) < 1.4) {
            mob.hopHit = true;
            dispatchEliteAttack(mob, {
                mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                radius: 2.5, damage: 2, knockback: 5, lift: 3, label: "Squashed by a Crater Hopper"
            });
        }
        if (landed || now - mob.stateSince > 4000 || mob.pos.y < 1) {
            if (mob.pos.y < 1) mob.pos.y = chunkManager.getSurfaceY(mob.pos.x, mob.pos.z) + 1;
            setEliteState(mob, "IDLE", now);
            mob.nextHopAt = now + (target ? 700 + Math.random() * 600 : 2500 + Math.random() * 2500);
        }
        mob.isMoving = true;
        return;
    }
    settleEliteOnGround(mob, dt);
    mob.isMoving = false;
    if (mob.aiState === "CROUCH") {
        if (now - mob.stateSince > 380) {
            let dirX;
            let dirZ;
            let horizontal;
            if (target) {
                dirX = target.x - mob.pos.x;
                dirZ = target.z - mob.pos.z;
                horizontal = Math.min(5, target.distance / 1.4);
            } else {
                const angle = Math.random() * Math.PI * 2;
                dirX = Math.cos(angle);
                dirZ = Math.sin(angle);
                horizontal = 1.8;
            }
            const length = Math.max(0.001, Math.hypot(dirX, dirZ));
            mob.hopVel = new THREE.Vector3(dirX / length * horizontal, target ? 7 : 5, dirZ / length * horizontal);
            mob.hopHit = false;
            setEliteState(mob, "HOP", now);
        }
        return;
    }
    setEliteState(mob, "IDLE", now);
    if (target) faceEliteMob(mob, target.x - mob.pos.x, target.z - mob.pos.z, 4, dt);
    if (now >= (mob.nextHopAt || 0)) setEliteState(mob, "CROUCH", now);
}

// Vintage Story drifter: a hunched shambler that lurches after you, lobs cinders from range and swipes up close.
function thinkEmberDrifter(mob, dt, now) {
    settleEliteOnGround(mob, dt);
    const target = findEliteTarget(mob, 22, 12);
    let move = null;
    if (mob.aiState === "THROW") {
        if (target) faceEliteMob(mob, target.x - mob.pos.x, target.z - mob.pos.z, 5, dt);
        if (!mob.thrown && now - mob.stateSince > 750 && target) {
            mob.thrown = true;
            const style = MOB_PROJECTILE_STYLES.ember;
            const origin = new THREE.Vector3(mob.pos.x, mob.pos.y + 1.6, mob.pos.z);
            fireEliteProjectile(mob, "ember", origin, getBallisticDirection(origin, new THREE.Vector3(target.x, target.y + 0.8, target.z), style.speed, style.gravity, 0.12));
        }
        if (now - mob.stateSince > 1100) setEliteState(mob, "CHASE", now);
    } else if (mob.aiState === "SWIPE") {
        if (!mob.swiped && now - mob.stateSince > 500) {
            mob.swiped = true;
            if (target && target.distance < 2.6) {
                dispatchEliteAttack(mob, {
                    mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                    radius: 3, damage: 2, knockback: 4, label: "Clawed by an Ember Drifter"
                });
            }
        }
        if (now - mob.stateSince > 900) setEliteState(mob, "CHASE", now);
    } else if (target) {
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        faceEliteMob(mob, dx, dz, 4, dt);
        if (target.distance < 1.9 && now >= (mob.swipeReadyAt || 0)) {
            mob.swiped = false;
            mob.swipeReadyAt = now + 1500;
            setEliteState(mob, "SWIPE", now);
        } else if (target.distance > 5 && target.distance < 16 && now >= (mob.throwReadyAt || 0)) {
            mob.thrown = false;
            mob.throwReadyAt = now + 3800 + Math.random() * 2400;
            setEliteState(mob, "THROW", now);
        } else {
            setEliteState(mob, "CHASE", now);
            if (target.distance > 1.4) move = { x: dx, z: dz, speed: mob.speed };
        }
    } else {
        setEliteState(mob, "IDLE", now);
        move = eliteWander(mob, dt, mob.speed * 0.5, now);
        if (move) faceEliteMob(mob, move.x, move.z, 2, dt);
    }
    mob.isMoving = !!(move && stepEliteOnGround(mob, move.x, move.z, move.speed * dt));
}

// Hytale trork: bellows a warning, then charges in a straight line. Dodge the charge and it stumbles, dazed.
function thinkMossBrute(mob, dt, now) {
    settleEliteOnGround(mob, dt);
    const target = findEliteTarget(mob, 24, 10);
    let move = null;
    if (mob.aiState === "ROAR") {
        if (target) faceEliteMob(mob, target.x - mob.pos.x, target.z - mob.pos.z, 5, dt);
        if (now - mob.stateSince > 850) {
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mob.mesh.quaternion);
            mob.chargeDir = { x: forward.x, z: forward.z };
            mob.chargeHit = false;
            setEliteState(mob, "CHARGE", now);
        }
    } else if (mob.aiState === "CHARGE") {
        const stepped = stepEliteOnGround(mob, mob.chargeDir.x, mob.chargeDir.z, 8.5 * dt);
        mob.isMoving = stepped;
        if (target && !mob.chargeHit && Math.hypot(target.x - mob.pos.x, target.z - mob.pos.z) < 1.7 && Math.abs(target.y - mob.pos.y) < 2) {
            mob.chargeHit = true;
            dispatchEliteAttack(mob, {
                mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                radius: 3, damage: 3, knockback: 10, lift: 4, label: "Gored by a Moss Brute"
            });
            setEliteState(mob, "CHASE", now);
            mob.chargeReadyAt = now + 4500;
        } else if (!stepped || now - mob.stateSince > 1600) {
            setEliteState(mob, "STUNNED", now);
            mob.chargeReadyAt = now + 4500;
        }
        return;
    } else if (mob.aiState === "STUNNED") {
        if (now - mob.stateSince > 1700) setEliteState(mob, "CHASE", now);
    } else if (mob.aiState === "SWING") {
        if (!mob.swung && now - mob.stateSince > 600) {
            mob.swung = true;
            if (target && target.distance < 2.8) {
                dispatchEliteAttack(mob, {
                    mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                    radius: 3.2, damage: 3, knockback: 7, label: "Clubbed by a Moss Brute"
                });
            }
        }
        if (now - mob.stateSince > 1000) setEliteState(mob, "CHASE", now);
    } else if (target) {
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        faceEliteMob(mob, dx, dz, 3, dt);
        if (target.distance < 2.2 && now >= (mob.swingReadyAt || 0)) {
            mob.swung = false;
            mob.swingReadyAt = now + 1800;
            setEliteState(mob, "SWING", now);
        } else if (target.distance > 5 && target.distance < 15 && now >= (mob.chargeReadyAt || 0)) {
            setEliteState(mob, "ROAR", now);
        } else {
            setEliteState(mob, "CHASE", now);
            if (target.distance > 1.8) move = { x: dx, z: dz, speed: mob.speed };
        }
    } else {
        setEliteState(mob, "IDLE", now);
        move = eliteWander(mob, dt, mob.speed * 0.45, now);
        if (move) faceEliteMob(mob, move.x, move.z, 2, dt);
    }
    mob.isMoving = !!(move && stepEliteOnGround(mob, move.x, move.z, move.speed * dt));
}

function findWaterSurfaceY(x, y, z) {
    let top = Math.floor(y);
    if (!isWaterBlock(getBlockAt(x, top, z))) return null;
    while (top < MAX_HEIGHT - 1 && isWaterBlock(getBlockAt(x, top + 1, z))) top++;
    return top;
}

// Subnautica sea dragon: prowls deep lava-lit water, surfaces to spit fireballs and lunges at swimmers.
function thinkMagmaWyrm(mob, dt, now) {
    const target = findEliteTarget(mob, 30, 30);
    const surfaceY = findWaterSurfaceY(mob.pos.x, mob.pos.y, mob.pos.z);
    let goal = null;
    let speed = mob.speed;
    if (target) {
        const targetInWater = isWaterBlock(getBlockAt(target.x, target.y + 0.5, target.z)) || isWaterBlock(getBlockAt(target.x, target.y + 1.4, target.z));
        const dx = target.x - mob.pos.x;
        const dz = target.z - mob.pos.z;
        if (mob.aiState === "SURFACING") {
            goal = new THREE.Vector3(mob.pos.x + dx * 0.05, surfaceY !== null ? surfaceY + 0.5 : mob.pos.y, mob.pos.z + dz * 0.05);
            faceEliteMob(mob, dx, dz, 3, dt);
            if (surfaceY === null || mob.pos.y >= surfaceY - 0.1 || now - mob.stateSince > 4000) {
                setEliteState(mob, "SPITTING", now);
                mob.spitsLeft = 2;
                mob.nextSpitAt = now + 450;
            }
        } else if (mob.aiState === "SPITTING") {
            faceEliteMob(mob, dx, dz, 4, dt);
            if (mob.spitsLeft > 0 && now >= mob.nextSpitAt) {
                const style = MOB_PROJECTILE_STYLES.fireball;
                const forward = new THREE.Vector3(dx, 0, dz).normalize();
                const origin = new THREE.Vector3(mob.pos.x + forward.x * 1.6, mob.pos.y + 1.9, mob.pos.z + forward.z * 1.6);
                fireEliteProjectile(mob, "fireball", origin, getBallisticDirection(origin, new THREE.Vector3(target.x, target.y + 1, target.z), style.speed, style.gravity, 0.08), mob.spitsLeft);
                mob.spitsLeft--;
                mob.nextSpitAt = now + 650;
            }
            if (now - mob.stateSince > 1800) {
                setEliteState(mob, "DIVING", now);
                mob.nextSurfaceAt = now + 4500 + Math.random() * 2500;
            }
        } else if (targetInWater && target.distance < 16) {
            setEliteState(mob, "LUNGE", now);
            goal = new THREE.Vector3(target.x, target.y + 0.8, target.z);
            speed = mob.speed * 1.7;
            faceEliteMob(mob, dx, dz, 5, dt);
            if (Math.hypot(dx, target.y + 0.8 - mob.pos.y, dz) < 2.8 && now - (mob.lastBiteAt || 0) > 1500) {
                mob.lastBiteAt = now;
                dispatchEliteAttack(mob, {
                    mode: "target", target: target.name, x: mob.pos.x, y: mob.pos.y, z: mob.pos.z,
                    radius: 4, damage: 4, knockback: 7, label: "Bitten by a Magma Wyrm"
                });
            }
        } else {
            if (mob.aiState !== "DIVING" || now - mob.stateSince > 1500) setEliteState(mob, "PROWL", now);
            goal = new THREE.Vector3(mob.pos.x + dx * 0.4, mob.pos.y - (mob.aiState === "DIVING" ? 1 : 0), mob.pos.z + dz * 0.4);
            faceEliteMob(mob, dx, dz, 2, dt);
            if (now >= (mob.nextSurfaceAt || 0) && target.distance < 26) setEliteState(mob, "SURFACING", now);
        }
    } else {
        setEliteState(mob, "PROWL", now);
        const wander = eliteWander(mob, dt, mob.speed * 0.5, now);
        if (wander) {
            goal = mob.pos.clone().add(new THREE.Vector3(wander.x * 6, 0, wander.z * 6));
            faceEliteMob(mob, wander.x, wander.z, 1.5, dt);
        }
    }
    mob.isMoving = moveEliteSwimmer(mob, goal, speed, dt);
}

function moveEliteSwimmer(mob, goal, speed, dt) {
    if (!goal) return false;
    const delta = goal.clone().sub(mob.pos);
    const distance = delta.length();
    if (distance < 0.1) return false;
    delta.multiplyScalar(Math.min(speed * dt, distance) / distance);
    const next = mob.pos.clone().add(delta);
    next.x = modWrap(next.x, MAP_SIZE);
    next.z = modWrap(next.z, MAP_SIZE);
    if (isWaterBlock(getBlockAt(next.x, next.y, next.z))) {
        mob.pos.copy(next);
        return true;
    }
    const vertical = new THREE.Vector3(mob.pos.x, next.y, mob.pos.z);
    if (isWaterBlock(getBlockAt(vertical.x, vertical.y, vertical.z))) {
        mob.pos.copy(vertical);
        return true;
    }
    const horizontal = new THREE.Vector3(next.x, mob.pos.y, next.z);
    if (isWaterBlock(getBlockAt(horizontal.x, horizontal.y, horizontal.z))) {
        mob.pos.copy(horizontal);
        return true;
    }
    mob.nextWanderChange = 0;
    return false;
}

// ---------- visuals (run on every client from synced aiState) ----------

function animateEliteMob(mob, dt, now) {
    const t = mob.animationTime;
    const stateAge = now - (mob.stateChangedAt || now);
    if (mob.type === "bone_archer") {
        const walk = mob.isMoving ? Math.sin(t * 9) * 0.6 : 0;
        mob.legs[0].rotation.x = walk;
        mob.legs[1].rotation.x = -walk;
        if (mob.aiState === "AIMING") {
            const draw = Math.min(1, stateAge / 700);
            mob.arms[0].rotation.set(-Math.PI / 2, 0, 0.1);
            mob.arms[1].rotation.set(-Math.PI / 2 + 0.15, 0, -0.5 - draw * 0.3);
            mob.bowString.position.z = -0.12 * draw;
        } else {
            mob.arms[0].rotation.set(-0.35 - walk * 0.2, 0, 0.08);
            mob.arms[1].rotation.set(walk * 0.4, 0, -0.08);
            mob.bowString.position.z = 0;
        }
        mob.head.rotation.y = Math.sin(t * 0.8) * 0.15;
    } else if (mob.type === "sentinel_drone") {
        const alert = mob.aiState === "ALERT";
        const repairing = mob.aiState === "REPAIRING";
        const color = repairing ? 0x55aaff : alert ? 0xff3030 : 0xffd040;
        mob.eyeMaterial.color.setHex(color);
        mob.scanBeam.visible = mob.aiState === "SCANNING";
        if (mob.scanBeam.visible) mob.scanBeam.material.opacity = 0.12 + (Math.sin(t * 10) + 1) * 0.06;
        mob.band.rotation.z += dt * (alert ? 6 : 1.5);
        mob.fins.forEach((fin, i) => { fin.rotation.x = Math.sin(t * 3 + i) * 0.25; });
        mob.thrusterMaterial.opacity = 0.6 + Math.sin(t * 20) * 0.25;
        mob.rig.position.y = Math.sin(t * 2.2) * 0.15;
        mob.rig.rotation.z = repairing ? Math.sin(t * 9) * 0.25 : 0;
    } else if (mob.type === "dust_vulture") {
        const diving = mob.aiState === "DIVING";
        const climbing = mob.aiState === "CLIMBING";
        const flap = climbing ? Math.sin(t * 16) * 0.75 : diving ? 0 : Math.sin(t * 2.2) * 0.12;
        mob.wings.forEach((wing, i) => {
            const side = i === 0 ? -1 : 1;
            wing.rotation.z = side * (diving ? -0.9 : flap + 0.12);
            wing.rotation.y = side * (diving ? 0.9 : 0);
        });
        mob.talons.forEach(talon => { talon.visible = diving; });
        const targetPitch = diving ? 0.55 : climbing ? -0.35 : 0;
        const targetRoll = mob.aiState === "CIRCLING" ? -0.35 : mob.aiState === "PATROL" ? -0.22 : 0;
        mob.rig.rotation.x += (targetPitch - mob.rig.rotation.x) * Math.min(1, dt * 5);
        mob.rig.rotation.z += (targetRoll - mob.rig.rotation.z) * Math.min(1, dt * 3);
    } else if (mob.type === "brick_golem") {
        const walk = mob.isMoving ? Math.sin(t * 3.2) * 0.35 : 0;
        mob.legs[0].rotation.x = walk;
        mob.legs[1].rotation.x = -walk;
        let armX = [-walk * 0.6, walk * 0.6];
        let lean = 0;
        if (mob.aiState === "WINDUP") {
            const raise = Math.min(1, stateAge / 900);
            armX = [-Math.PI * 0.95 * raise, -Math.PI * 0.95 * raise];
            lean = -0.18 * raise;
        } else if (mob.aiState === "SLAM") {
            armX = [0.5, 0.5];
            lean = 0.25;
        } else if (mob.aiState === "THROW") {
            const progress = Math.min(1, stateAge / 900);
            armX = [-walk * 0.6, progress < 1 ? -Math.PI * 0.9 * progress : -0.4];
        }
        mob.rock.visible = mob.aiState === "THROW" && stateAge < 900;
        mob.arms[0].rotation.x += (armX[0] - mob.arms[0].rotation.x) * Math.min(1, dt * 10);
        mob.arms[1].rotation.x += (armX[1] - mob.arms[1].rotation.x) * Math.min(1, dt * 10);
        mob.rig.rotation.x += (lean - mob.rig.rotation.x) * Math.min(1, dt * 8);
        mob.rig.position.y = mob.isMoving ? Math.abs(Math.sin(t * 3.2)) * 0.12 : 0;
        mob.core.rotation.y += dt * 2;
        mob.core.scale.setScalar(mob.aiState === "WINDUP" ? 1 + Math.min(1, stateAge / 900) : 1);
    } else if (mob.type === "magma_wyrm") {
        const surfaced = mob.aiState === "SPITTING";
        const speed = mob.isMoving ? (mob.aiState === "LUNGE" ? 7 : 3.5) : 1.5;
        mob.swimPhase = (mob.swimPhase || 0) + dt * speed;
        mob.segments.forEach((segment, i) => {
            const amplitude = 0.25 + i * 0.06;
            segment.position.x = Math.sin(mob.swimPhase - i * 0.65) * amplitude;
            segment.position.y = Math.cos(mob.swimPhase * 0.7 - i * 0.5) * 0.15 - (surfaced ? i * 0.25 : 0);
        });
        mob.head.position.x = Math.sin(mob.swimPhase + 0.6) * 0.15;
        const targetHeadY = surfaced ? 1.5 : 0;
        const targetHeadPitch = surfaced ? -0.45 : 0;
        mob.head.position.y += (targetHeadY - mob.head.position.y) * Math.min(1, dt * 4);
        mob.head.rotation.x += (targetHeadPitch - mob.head.rotation.x) * Math.min(1, dt * 4);
        const open = surfaced || mob.aiState === "LUNGE" ? 0.35 + Math.abs(Math.sin(t * 6)) * 0.25 : 0.05;
        mob.jaw.rotation.x += (open - mob.jaw.rotation.x) * Math.min(1, dt * 8);
        mob.mouthMaterial.color.setHex(surfaced ? 0xffa000 : 0x601800);
    } else if (mob.type === "crater_hopper") {
        let sx = 1;
        let sy = 1;
        if (mob.aiState === "CROUCH") {
            const squash = Math.min(1, stateAge / 380);
            sx = 1 + squash * 0.3;
            sy = 1 - squash * 0.4;
        } else if (mob.aiState === "HOP") {
            const stretch = Math.max(0, 1 - stateAge / 450);
            sx = 1 - stretch * 0.15;
            sy = 1 + stretch * 0.3;
        } else {
            sx = 1 + Math.sin(t * 5) * 0.04;
            sy = 1 - Math.sin(t * 5) * 0.05;
        }
        mob.body.scale.x += (sx - mob.body.scale.x) * Math.min(1, dt * 14);
        mob.body.scale.z += (sx - mob.body.scale.z) * Math.min(1, dt * 14);
        mob.body.scale.y += (sy - mob.body.scale.y) * Math.min(1, dt * 14);
    } else if (mob.type === "ember_drifter") {
        const walk = mob.isMoving ? Math.sin(t * 5) * 0.5 : 0;
        mob.legs[0].rotation.x = walk;
        mob.legs[1].rotation.x = -walk;
        let armX = [0.3 + walk * 0.3, 0.3 - walk * 0.3];
        if (mob.aiState === "THROW") {
            const progress = Math.min(1, stateAge / 750);
            armX = [0.3, progress < 1 ? -Math.PI * 0.85 * progress : 0.6];
        } else if (mob.aiState === "SWIPE") {
            armX = stateAge < 500 ? [-1.6, -1.6] : [0.9, 0.9];
        }
        mob.arms[0].rotation.x += (armX[0] - mob.arms[0].rotation.x) * Math.min(1, dt * 10);
        mob.arms[1].rotation.x += (armX[1] - mob.arms[1].rotation.x) * Math.min(1, dt * 10);
        mob.cinder.visible = mob.aiState === "THROW" && stateAge < 750;
        mob.torso.rotation.z = mob.isMoving ? Math.sin(t * 2.5) * 0.12 : 0;
        mob.head.rotation.y = Math.sin(t * 1.3) * 0.3;
        mob.emberMaterial.color.setHex(Math.sin(t * 4) > 0 ? 0xff7a1a : 0xff9a3a);
    } else if (mob.type === "moss_brute") {
        const charging = mob.aiState === "CHARGE";
        const walk = mob.isMoving ? Math.sin(t * (charging ? 14 : 6)) * (charging ? 0.8 : 0.45) : 0;
        mob.legs[0].rotation.x = walk;
        mob.legs[1].rotation.x = -walk;
        let armX = [-walk * 0.5, walk * 0.5];
        let lean = 0;
        if (mob.aiState === "ROAR") {
            armX = [-2.4, -2.4];
            lean = -0.25;
        } else if (charging) {
            armX = [0.6, 0.6];
            lean = 0.45;
        } else if (mob.aiState === "SWING") {
            armX = [-0.2, stateAge < 600 ? -2.6 : 0.6];
        } else if (mob.aiState === "STUNNED") {
            lean = 0.2;
            armX = [0.3, 0.3];
        }
        mob.arms[0].rotation.x += (armX[0] - mob.arms[0].rotation.x) * Math.min(1, dt * 10);
        mob.arms[1].rotation.x += (armX[1] - mob.arms[1].rotation.x) * Math.min(1, dt * 12);
        mob.body.rotation.x += (lean - mob.body.rotation.x) * Math.min(1, dt * 8);
        mob.head.rotation.z = mob.aiState === "STUNNED" ? Math.sin(t * 9) * 0.3 : 0;
        mob.head.rotation.x = mob.aiState === "ROAR" ? -0.4 : 0;
    }
}

function onEliteMobDeath(mob, killer) {
    const def = getEliteMobDef(mob.type);
    spawnEliteBurst(mob.pos.clone().add(new THREE.Vector3(0, def.hitCenterY, 0)), getEliteBurstColor(mob.type));
    if (!def.drop || !killer || Math.random() > def.drop.chance || !BLOCKS[def.drop.id]) return;
    if (killer === userName) {
        addToInventory(def.drop.id, def.drop.count, worldSeed);
        addMessage(`${def.name} dropped ${def.drop.count} ${BLOCKS[def.drop.id].name}!`, 2500);
    } else {
        const peer = peers.get(killer);
        if (peer && peer.dc && peer.dc.readyState === "open") {
            peer.dc.send(JSON.stringify({ type: "add_to_inventory", blockId: def.drop.id, count: def.drop.count, originSeed: worldSeed }));
        }
    }
}
