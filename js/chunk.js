
function Chunk(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.key = makeChunkKey(worldName, cx, cz);
    this.data = new Uint8Array(CHUNK_SIZE * MAX_HEIGHT * CHUNK_SIZE);
    this.mesh = null;
    this.generated = false;
    this.needsRebuild = true;
}
Chunk.prototype.idx = function (x, y, z) { return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x; };
Chunk.prototype.get = function (x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= MAX_HEIGHT) return BLOCK_AIR;
    return this.data[this.idx(x, y, z)];
};
Chunk.prototype.set = function (x, y, z, v) {
    if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= MAX_HEIGHT) return;
    this.data[this.idx(x, y, z)] = v;
    this.needsRebuild = true;
};
function ChunkManager(seed) {
    console.log('[WorldGen] Initializing ChunkManager with seed:', seed);
    this.seed = seed;
    this.noise = makeNoise(seed);
    this.blockNoise = makeNoise(seed + '_block');
    this.chunks = new Map();
    this.lastPcx = null;
    this.lastPcz = null;
    this.currentLoadRadius = 2; // Initial small radius
    // meshGroup is already defined and added to scene in initThree(); do not redefine here
    console.log('[ChunkManager] Using existing meshGroup for chunk rendering');
}
ChunkManager.prototype.getChunk = function (cx, cz) {
    var chunksPerSide = Math.floor(MAP_SIZE / CHUNK_SIZE);
    var wrappedCx = modWrap(cx, chunksPerSide);
    var wrappedCz = modWrap(cz, chunksPerSide);
    var key = makeChunkKey(worldName, wrappedCx, wrappedCz);
    if (this.chunks.has(key)) return this.chunks.get(key);
    var c = new Chunk(wrappedCx, wrappedCz);
    this.chunks.set(c.key, c);
    pending.add(c.key);
    return c;
};
ChunkManager.prototype.generateChunk = function (chunk) {
    if (chunk.generating || chunk.generated) return;
    chunk.generating = true;
    worker.postMessage({ type: 'generate_chunk', key: chunk.key });
};
ChunkManager.prototype.pickBiome = function (n) {
    if (n > 0.68) return BIOMES.find(function (b) { return b.key === 'snow'; }) || BIOMES[0];
    if (n < 0.25) return BIOMES.find(function (b) { return b.key === 'desert'; }) || BIOMES[1];
    if (n > 0.45) return BIOMES.find(function (b) { return b.key === 'forest'; }) || BIOMES[2];
    if (n > 0.60) return BIOMES.find(function (b) { return b.key === 'mountain'; }) || BIOMES[4];
    if (n < 0.35) return BIOMES.find(function (b) { return b.key === 'swamp'; }) || BIOMES[5];
    return BIOMES.find(function (b) { return b.key === 'plains'; }) || BIOMES[0];
};
ChunkManager.prototype.placeTree = function (chunk, lx, cy, lz, rnd) {
    var h = 5 + Math.floor(rnd() * 3);
    for (var i = 0; i < h; i++) if (cy + i < MAX_HEIGHT) chunk.set(lx, cy + i, lz, 7);
    for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) for (var dy = 0; dy <= 3; dy++) {
        var rx = lx + dx, ry = cy + h - 2 + dy, rz = lz + dz;
        if (ry < MAX_HEIGHT && rx >= 0 && rx < CHUNK_SIZE && rz >= 0 && rz < CHUNK_SIZE) {
            if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) <= 4 && chunk.get(rx, ry, rz) === BLOCK_AIR) chunk.set(rx, ry, rz, 8);
        }
    }
};
ChunkManager.prototype.placeFlower = function (chunk, lx, cy, lz) {
    if (cy < MAX_HEIGHT && chunk.get(lx, cy, lz) === BLOCK_AIR) chunk.set(lx, cy, lz, 12);
};
ChunkManager.prototype.placeCactus = function (chunk, lx, cy, lz, rnd) {
    var h = 1 + Math.floor(rnd() * 3);
    for (var i = 0; i < h; i++) if (cy + i < MAX_HEIGHT) chunk.set(lx, cy + i, lz, 9);
};
ChunkManager.prototype.buildChunkMesh = function (chunk) {
    if (chunk.mesh) { meshGroup.remove(chunk.mesh); disposeObject(chunk.mesh); chunk.mesh = null; }
    var lists = {};
    var baseX = chunk.cx * CHUNK_SIZE;
    var baseZ = chunk.cz * CHUNK_SIZE;
    for (var x = 0; x < CHUNK_SIZE; x++) {
        for (var z = 0; z < CHUNK_SIZE; z++) {
            for (var y = 0; y < MAX_HEIGHT; y++) {
                var id = chunk.get(x, y, z);
                if (!id || id === BLOCK_AIR) continue;
                var wx = modWrap(baseX + x, MAP_SIZE);
                var wz = modWrap(baseZ + z, MAP_SIZE);
                var exposed = (
                    this.getBlockGlobal(chunk.cx, chunk.cz, x + 1, y, z) === BLOCK_AIR ||
                    this.getBlockGlobal(chunk.cx, chunk.cz, x - 1, y, z) === BLOCK_AIR ||
                    this.getBlockGlobal(chunk.cx, chunk.cz, x, y + 1, z) === BLOCK_AIR ||
                    this.getBlockGlobal(chunk.cx, chunk.cz, x, y - 1, z) === BLOCK_AIR ||
                    this.getBlockGlobal(chunk.cx, chunk.cz, x, y, z + 1) === BLOCK_AIR ||
                    this.getBlockGlobal(chunk.cx, chunk.cz, x, y, z - 1) === BLOCK_AIR
                );
                if (!exposed) continue;

                const coordKey = `${wx},${y},${wz}`;
                const blockOriginSeed = foreignBlockOrigins.get(coordKey) || worldSeed;
                const materialKey = `${id}-${blockOriginSeed}`;

                if (!lists[materialKey]) {
                    lists[materialKey] = {
                        positions: [],
                        seed: blockOriginSeed,
                        blockId: id
                    };
                }
                lists[materialKey].positions.push({ x: wx, y: y, z: wz });
            }
        }
    }
    var group = new THREE.Group();
    for (var matKey in lists) {
        const list = lists[matKey];
        if (!list.positions || list.positions.length === 0) continue;

        var id = list.blockId;
        var seed = list.seed;
        var box = new THREE.BoxGeometry(1, 1, 1);
        var positions = []; var normals = []; var uvs = []; var indices = []; var vertOffset = 0;
        for (var p of list.positions) {
            var posAttr = box.attributes.position.array;
            var normAttr = box.attributes.normal.array;
            var uvAttr = box.attributes.uv.array;
            var idxAttr = box.index.array;
            for (var vi = 0; vi < box.attributes.position.count; vi++) {
                positions.push(posAttr[vi * 3 + 0] + p.x + 0.5, posAttr[vi * 3 + 1] + p.y + 0.5, posAttr[vi * 3 + 2] + p.z + 0.5);
                normals.push(normAttr[vi * 3 + 0], normAttr[vi * 3 + 1], normAttr[vi * 3 + 2]);
                uvs.push(uvAttr[vi * 2 + 0], uvAttr[vi * 2 + 1]);
            }
            for (var ii = 0; ii < idxAttr.length; ii++) indices.push(idxAttr[ii] + vertOffset);
            vertOffset += box.attributes.position.count;
        }
        var geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.setIndex(indices);
        geom.computeBoundingSphere();
        var info = BLOCKS[id] || { color: '#ff00ff' };
        var mat;

        if (info.light) {
            mat = new THREE.MeshBasicMaterial({ map: emberTexture, transparent: true, opacity: 0.8 });
        } else if (info.transparent) {
            mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(info.color), transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        } else {
            const blockTexture = createBlockTexture(seed, id);
            mat = new THREE.MeshLambertMaterial({ map: blockTexture });
        }
        var mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);
    }
    chunk.mesh = group;
    meshGroup.add(chunk.mesh);
    chunk.needsRebuild = false;
};
ChunkManager.prototype.getBlockGlobal = function (cx, cz, lx, y, lz) {
    var chunksPerSide = Math.floor(MAP_SIZE / CHUNK_SIZE);
    var wrappedWx = modWrap(cx * CHUNK_SIZE + lx, MAP_SIZE);
    var wrappedWz = modWrap(cz * CHUNK_SIZE + lz, MAP_SIZE);
    var newCx = Math.floor(wrappedWx / CHUNK_SIZE);
    var newCz = Math.floor(wrappedWz / CHUNK_SIZE);
    var newLx = modWrap(wrappedWx, CHUNK_SIZE);
    var newLz = modWrap(wrappedWz, CHUNK_SIZE);
    var chunk = this.getChunk(newCx, newCz);
    if (!chunk.generated) this.generateChunk(chunk);
    return chunk.get(newLx, y, newLz);
};
ChunkManager.prototype.setBlockGlobal = function (wx, wy, wz, bid, doBroadcast = true) {
    if (wy < 0 || wy >= MAX_HEIGHT) return;
    var wrappedWx = modWrap(wx, MAP_SIZE);
    var wrappedWz = modWrap(wz, MAP_SIZE);
    var cx = Math.floor(wrappedWx / CHUNK_SIZE);
    var cz = Math.floor(wrappedWz / CHUNK_SIZE);
    var lx = Math.floor(wrappedWx % CHUNK_SIZE);
    var lz = Math.floor(wrappedWz % CHUNK_SIZE);
    var chunk = this.getChunk(cx, cz);
    if (!chunk.generated) this.generateChunk(chunk);
    var prev = chunk.get(lx, wy, lz);
    if (prev === bid) return;
    chunk.set(lx, wy, lz, bid);
    var key = chunk.key;
    if (!CHUNK_DELTAS.has(key)) CHUNK_DELTAS.set(key, []);
    CHUNK_DELTAS.get(key).push({ x: lx, y: wy, z: lz, b: bid });
    chunk.needsRebuild = true;
    safePlayAudio(soundPlace);
    updateSaveChangesButton();

    if (doBroadcast) {
        const message = JSON.stringify({
            type: 'block_change',
            wx: wx, wy: wy, wz: wz, bid: bid,
            prevBid: prev, // Include the previous block ID
            username: userName // Let the server know who made the change
        });

        // Both host and client send the change to their peer(s).
        // The host will then relay this to other clients.
        for (const [peerUser, peerData] of peers.entries()) {
            if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                console.log(`[WebRTC] Sending block change to ${peerUser}`);
                peerData.dc.send(message);
            }
        }
    }
};

ChunkManager.prototype.applyDeltasToChunk = function (chunkKey, changes) {
    var normalizedKey = chunkKey.replace(/^#/, '');
    var parsed = parseChunkKey(normalizedKey);
    if (!parsed) return;
    var chunk = this.chunks.get(normalizedKey);
    if (!chunk) return;

    for (var d of changes) {
        if (d.x < 0 || d.x >= CHUNK_SIZE || d.y < 0 || d.y >= MAX_HEIGHT || d.z < 0 || d.z >= CHUNK_SIZE) continue;

        // Accept 0 OR valid BLOCKS entry, default to 4 (Stone)
        var blockId = (d.b === BLOCK_AIR || (d.b && BLOCKS[d.b])) ? d.b : 4;

        chunk.set(d.x, d.y, d.z, blockId);
    }
    chunk.needsRebuild = true;
    this.buildChunkMesh(chunk);
};

ChunkManager.prototype.markDirty = function (chunkKey) {
    var chunk = this.chunks.get(chunkKey);
    if (chunk) {
        chunk.needsRebuild = true;
        this.buildChunkMesh(chunk);
    }
};
ChunkManager.prototype.getSurfaceY = function (wx, wz) {
    var wrappedWx = modWrap(Math.floor(wx), MAP_SIZE);
    var wrappedWz = modWrap(Math.floor(wz), MAP_SIZE);
    var cx = Math.floor(wrappedWx / CHUNK_SIZE);
    var cz = Math.floor(wrappedWz / CHUNK_SIZE);
    var chunk = this.getChunk(cx, cz);
    if (!chunk.generated) this.generateChunk(chunk);
    var lx = Math.floor(wrappedWx % CHUNK_SIZE);
    var lz = Math.floor(wrappedWz % CHUNK_SIZE);
    for (var y = MAX_HEIGHT - 1; y >= 0; y--) {
        if (chunk.get(lx, y, lz) !== BLOCK_AIR && chunk.get(lx, y, lz) !== 6) return y + 1;
    }
    return SEA_LEVEL;
};
ChunkManager.prototype.preloadChunks = function (cx, cz, radius) {
    var chunksPerSide = Math.floor(MAP_SIZE / CHUNK_SIZE);
    var queue = [];
    for (var r = 0; r <= radius; r++) {
        for (var dx = -r; dx <= r; dx++) {
            for (var dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) === r || Math.abs(dz) === r) {
                    queue.push({ cx: cx + dx, cz: cz + dz, dist: Math.abs(dx) + Math.abs(dz) });
                }
            }
        }
    }
    queue.sort(function (a, b) { return a.dist - b.dist; });
    var index = 0;
    function processNext() {
        if (index >= queue.length) return;
        var dcx = queue[index].cx, dcz = queue[index].cz;
        var wrappedCx = modWrap(dcx, chunksPerSide);
        var wrappedCz = modWrap(dcz, chunksPerSide);
        var chunk = this.getChunk(wrappedCx, wrappedCz);
        if (!chunk.generated) this.generateChunk(chunk);
        if (chunk.needsRebuild || !chunk.mesh) this.buildChunkMesh(chunk);
        index++;
        setTimeout(processNext.bind(this), 333);
    }
    processNext.call(this);
};
ChunkManager.prototype.update = function (playerX, playerZ) {
    var pcx = Math.floor(modWrap(playerX, MAP_SIZE) / CHUNK_SIZE);
    var pcz = Math.floor(modWrap(playerZ, MAP_SIZE) / CHUNK_SIZE);
    if (pcx !== this.lastPcx || pcz !== this.lastPcz) {
        this.lastPcx = pcx;
        this.lastPcz = pcz;
    }
    const distanceToEdge = Math.max(Math.abs(pcx - this.lastPcx), Math.abs(pcz - this.lastPcz));
    if (distanceToEdge > this.currentLoadRadius - 2 && this.currentLoadRadius < LOAD_RADIUS) {
        this.currentLoadRadius++;
        console.log("Expanding load radius to:", this.currentLoadRadius);
    }

    var needed = new Set();
    for (var dx = -this.currentLoadRadius; dx <= this.currentLoadRadius; dx++) {
        for (var dz = -this.currentLoadRadius; dz <= this.currentLoadRadius; dz++) {
            var cx = modWrap(pcx + dx, CHUNKS_PER_SIDE);
            var cz = modWrap(pcz + dz, CHUNKS_PER_SIDE);
            var ch = this.getChunk(cx, cz);
            needed.add(ch.key);
            if (!ch.generating && !ch.generated) this.generateChunk(ch);
            if (ch.generated && (ch.needsRebuild || !ch.mesh)) this.buildChunkMesh(ch);
        }
    }
    for (var peerUser in userPositions) {
        if (peerUser !== userName) {
            var pos = userPositions[peerUser];
            var peerCx = Math.floor(modWrap(pos.x, MAP_SIZE) / CHUNK_SIZE);
            var peerCz = Math.floor(modWrap(pos.z, MAP_SIZE) / CHUNK_SIZE);
            this.preloadChunks(peerCx, peerCz, 2);
        }
    }
    const maxChunks = (LOAD_RADIUS * 2 + 1) * (LOAD_RADIUS * 2 + 1) * 1.5;
    if (this.chunks.size > maxChunks) {
        let chunks = Array.from(this.chunks.values());
        chunks.sort((a, b) => {
            const distA = Math.hypot(a.cx - pcx, a.cz - pcz);
            const distB = Math.hypot(b.cx - pcx, b.cz - pcz);
            return distB - distA;
        });

        for (let i = 0; i < chunks.length && this.chunks.size > maxChunks; i++) {
            const ch = chunks[i];
            if (!needed.has(ch.key)) {
                if (ch.mesh) {
                    meshGroup.remove(ch.mesh);
                    disposeObject(ch.mesh);
                }
                this.chunks.delete(ch.key);
            }
        }
    }

    // Make all needed chunks visible
    for (const key of needed) {
        const chunk = this.chunks.get(key);
        if (chunk && chunk.mesh) {
            chunk.mesh.visible = true;
        }
    }
};