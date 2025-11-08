function initChunkManager(deps) {
    const {
        THREE, BLOCKS, CHUNK_SIZE, MAX_HEIGHT, MAP_SIZE, SEA_LEVEL, BLOCK_AIR, BIOMES,
        CHUNK_DELTAS, worldName, worldSeed, player, emberTexture, foreignBlockOrigins,
        meshGroup, pending, scene, smokeParticles, torchRegistry, useGreedyMesher,
        userPositions, volcanoes, worker, createBlockTexture, createSmokeParticle,
        disposeObject, makeChunkKey, makeNoise, modWrap, parseChunkKey,
        updateSaveChangesButton, updateTorchRegistry
    } = deps;

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
        updateTorchRegistry(chunk);
        if (chunk.mesh) { meshGroup.remove(chunk.mesh); disposeObject(chunk.mesh); chunk.mesh = null; }

        const volcano = volcanoes.find(v => v.chunkKey === chunk.key);
        if (volcano && Math.random() < 0.3) {
            const smokeCount = Math.floor(volcano.lavaCount / 4);
            const smokeSystem = createSmokeParticle(volcano.x, volcano.y, volcano.z, smokeCount);
            smokeSystem.userData.chunkKey = chunk.key;
            smokeParticles.push(smokeSystem);
            scene.add(smokeSystem);
        }

        if (useGreedyMesher) {
            const group = buildGreedyMesh(chunk, foreignBlockOrigins, worldSeed);
            const pcx = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE);
            const pcz = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE);
            const baseX = chunk.cx * CHUNK_SIZE;
            const baseZ = chunk.cz * CHUNK_SIZE;
            let renderBaseX = baseX;
            let renderBaseZ = baseZ;

            if (Math.abs(chunk.cx - pcx) > CHUNKS_PER_SIDE / 2) {
                if (chunk.cx > pcx) renderBaseX -= MAP_SIZE;
                else renderBaseX += MAP_SIZE;
            }
            if (Math.abs(chunk.cz - pcz) > CHUNKS_PER_SIDE / 2) {
                if (chunk.cz > pcz) renderBaseZ -= MAP_SIZE;
                else renderBaseZ += MAP_SIZE;
            }
            group.position.set(renderBaseX, 0, renderBaseZ);
            chunk.mesh = group;
            meshGroup.add(chunk.mesh);
            chunk.needsRebuild = false;
            return;
        }

        var lists = {};
        var pcx = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE);
        var pcz = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE);

        var baseX = chunk.cx * CHUNK_SIZE;
        var baseZ = chunk.cz * CHUNK_SIZE;

        var renderBaseX = baseX;
        var renderBaseZ = baseZ;

        if (Math.abs(chunk.cx - pcx) > CHUNKS_PER_SIDE / 2) {
            if (chunk.cx > pcx) renderBaseX -= MAP_SIZE;
            else renderBaseX += MAP_SIZE;
        }
        if (Math.abs(chunk.cz - pcz) > CHUNKS_PER_SIDE / 2) {
            if (chunk.cz > pcz) renderBaseZ -= MAP_SIZE;
            else renderBaseZ += MAP_SIZE;
        }

        for (var x = 0; x < CHUNK_SIZE; x++) {
            for (var z = 0; z < CHUNK_SIZE; z++) {
                for (var y = 0; y < MAX_HEIGHT; y++) {
                    var id = chunk.get(x, y, z);
                    if (!id || id === BLOCK_AIR) continue;

                    var wx = modWrap(baseX + x, MAP_SIZE);
                    var wz = modWrap(baseZ + z, MAP_SIZE);
                    var renderX = renderBaseX + x;
                    var renderZ = renderBaseZ + z;

                    var faces = [
                        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
                        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
                        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
                    ];

                    var isCurrentBlockTransparent = BLOCKS[id] && BLOCKS[id].transparent;
                    var exposed = false;

                    for (var i = 0; i < faces.length; i++) {
                        var face = faces[i];
                        var neighborId = this.getBlockGlobal(chunk.cx, chunk.cz, x + face.x, y + face.y, z + face.z);
                        var isNeighborTransparent = (neighborId === BLOCK_AIR) || (BLOCKS[neighborId] && BLOCKS[neighborId].transparent);

                        if ((isCurrentBlockTransparent !== isNeighborTransparent) || (isCurrentBlockTransparent && id !== neighborId)) {
                            exposed = true;
                            break;
                        }
                    }
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
                    lists[materialKey].positions.push({ x: renderX, y: y, z: renderZ });
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
                mat = new THREE.MeshStandardMaterial({ map: blockTexture });
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
    ChunkManager.prototype.setBlockGlobal = function (wx, wy, wz, bid, doBroadcast = true, originSeed = null) {
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

        if (lx === 0) this.getChunk(cx - 1, cz).needsRebuild = true;
        if (lx === CHUNK_SIZE - 1) this.getChunk(cx + 1, cz).needsRebuild = true;
        if (lz === 0) this.getChunk(cx, cz - 1).needsRebuild = true;
        if (lz === CHUNK_SIZE - 1) this.getChunk(cx, cz + 1).needsRebuild = true;

        updateSaveChangesButton();

        if (doBroadcast) {
            const message = JSON.stringify({
                type: 'block_change',
                wx: wx, wy: wy, wz: wz, bid: bid,
                prevBid: prev,
                username: userName,
                originSeed: originSeed
            });

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
            var newBlockId = (d.b === BLOCK_AIR || (d.b && BLOCKS[d.b])) ? d.b : 4;
            chunk.set(d.x, d.y, d.z, newBlockId);
        }

        updateTorchRegistry(chunk);
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
    ChunkManager.prototype.getSurfaceYForBoulders = function (wx, wz) {
        var wrappedWx = modWrap(Math.floor(wx), MAP_SIZE);
        var wrappedWz = modWrap(Math.floor(wz), MAP_SIZE);
        var cx = Math.floor(wrappedWx / CHUNK_SIZE);
        var cz = Math.floor(wrappedWz / CHUNK_SIZE);
        var chunk = this.getChunk(cx, cz);
        if (!chunk.generated) this.generateChunk(chunk);
        var lx = Math.floor(wrappedWx % CHUNK_SIZE);
        var lz = Math.floor(wrappedWz % CHUNK_SIZE);
        for (var y = MAX_HEIGHT - 1; y >= 0; y--) {
            const blockId = chunk.get(lx, y, lz);
            if (blockId !== BLOCK_AIR && blockId !== 6 && blockId !== 16) return y + 1;
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
            index++;
            setTimeout(processNext.bind(this), 33);
        }
        processNext.call(this);
    };
    ChunkManager.prototype.update = function (playerX, playerZ, playerDirection) {
        var pcx = Math.floor(modWrap(playerX, MAP_SIZE) / CHUNK_SIZE);
        var pcz = Math.floor(modWrap(playerZ, MAP_SIZE) / CHUNK_SIZE);
        if (pcx !== this.lastPcx || pcz !== this.lastPcz) {
            this.lastPcx = pcx;
            this.lastPcz = pcz;
        }

        var neededChunks = [];
        for (var dx = -currentLoadRadius; dx <= currentLoadRadius; dx++) {
            for (var dz = -currentLoadRadius; dz <= currentLoadRadius; dz++) {
                var cx = modWrap(pcx + dx, CHUNKS_PER_SIDE);
                var cz = modWrap(pcz + dz, CHUNKS_PER_SIDE);
                neededChunks.push({ cx: cx, cz: cz, dx: dx, dz: dz });
            }
        }

        neededChunks.sort((a, b) => {
            const distASq = a.dx * a.dx + a.dz * a.dz;
            const distBSq = b.dx * b.dx + b.dz * b.dz;

            let aIsInFront = false;
            let bIsInFront = false;

            if (playerDirection && playerDirection.lengthSq() > 0) {
                const vecA = new THREE.Vector3(a.dx, 0, a.dz);
                if (vecA.lengthSq() > 0) {
                    if (vecA.normalize().dot(playerDirection) > 0.3) {
                        aIsInFront = true;
                    }
                }
                const vecB = new THREE.Vector3(b.dx, 0, b.dz);
                if (vecB.lengthSq() > 0) {
                    if (vecB.normalize().dot(playerDirection) > 0.3) {
                        bIsInFront = true;
                    }
                }
            }

            if (aIsInFront && !bIsInFront) return -1;
            if (!aIsInFront && bIsInFront) return 1;

            return distASq - distBSq;
        });

        var needed = new Set();
        var built = 0;
        for (const chunkInfo of neededChunks) {
            var ch = this.getChunk(chunkInfo.cx, chunkInfo.cz);
            needed.add(ch.key);
            if (!ch.generating && !ch.generated) this.generateChunk(ch);
            if (ch.generated && (ch.needsRebuild || !ch.mesh) && built < 2) {
                this.buildChunkMesh(ch);
                built++;
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
        const maxChunks = (currentLoadRadius * 2 + 1) * (currentLoadRadius * 2 + 1) * 10 * 3;
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
                    for (let i = smokeParticles.length - 1; i >= 0; i--) {
                        const smokeSystem = smokeParticles[i];
                        if (smokeSystem.userData.chunkKey === ch.key) {
                            scene.remove(smokeSystem);
                            disposeObject(smokeSystem);
                            smokeParticles.splice(i, 1);
                        }
                    }

                    const baseX = ch.cx * CHUNK_SIZE;
                    const baseZ = ch.cz * CHUNK_SIZE;
                    for (let x = 0; x < CHUNK_SIZE; x++) {
                        for (let z = 0; z < CHUNK_SIZE; z++) {
                            for (let y = 0; y < MAX_HEIGHT; y++) {
                                const id = ch.get(x, y, z);
                                if (BLOCKS[id] && BLOCKS[id].light) {
                                    const wx = modWrap(baseX + x, MAP_SIZE);
                                    const wz = modWrap(baseZ + z, MAP_SIZE);
                                    const lightKey = `${wx},${y},${wz}`;
                                    torchRegistry.delete(lightKey);
                                }
                            }
                        }
                    }
                    this.chunks.delete(ch.key);
                }
            }
        }
        for (const key of needed) {
            const chunk = this.chunks.get(key);
            if (chunk && chunk.mesh) {
                chunk.mesh.visible = true;
            }
        }
    };
    function buildGreedyMesh(chunk, foreignBlockOrigins, worldSeed) {
        const geos = {};
        const chunkData = chunk.data;

        const get = (x, y, z) => {
            if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= MAX_HEIGHT || z < 0 || z >= CHUNK_SIZE) return 0;
            return chunkData[y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x];
        };

        for (let d = 0; d < 3; d++) {
            const u = (d + 1) % 3;
            const v = (d + 2) % 3;

            const x = [0, 0, 0];
            const q = [0, 0, 0];
            q[d] = 1;

            const dims = [CHUNK_SIZE, MAX_HEIGHT, CHUNK_SIZE];
            const u_dim = dims[u];
            const v_dim = dims[v];

            const mask = new Array(u_dim * v_dim);

            for (x[d] = -1; x[d] < dims[d];) {
                let n = 0;
                for (x[v] = 0; x[v] < v_dim; x[v]++) {
                    for (x[u] = 0; x[u] < u_dim; x[u]++) {
                        const blockId1 = (x[d] >= 0) ? get(x[0], x[1], x[2]) : 0;
                        const blockId2 = (x[d] < dims[d] - 1) ? get(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;

                        const block1 = BLOCKS[blockId1] || {};
                        const block2 = BLOCKS[blockId2] || {};

                        const transparent1 = !blockId1 || block1.transparent;
                        const transparent2 = !blockId2 || block2.transparent;

                        let materialKey = null;
                        if (transparent1 !== transparent2) {
                            if (transparent1) {
                                const wx = chunk.cx * CHUNK_SIZE + x[0] + q[0];
                                const wy = x[1] + q[1];
                                const wz = chunk.cz * CHUNK_SIZE + x[2] + q[2];
                                const coordKey = `${wx},${wy},${wz}`;
                                const originSeed = foreignBlockOrigins.get(coordKey) || worldSeed;
                                materialKey = `${blockId2}-${originSeed}|-`;
                            } else {
                                const wx = chunk.cx * CHUNK_SIZE + x[0];
                                const wy = x[1];
                                const wz = chunk.cz * CHUNK_SIZE + x[2];
                                const coordKey = `${wx},${wy},${wz}`;
                                const originSeed = foreignBlockOrigins.get(coordKey) || worldSeed;
                                materialKey = `${blockId1}-${originSeed}|+`;
                            }
                        }
                        mask[n++] = materialKey;
                    }
                }

                x[d]++;

                n = 0;
                for (let j = 0; j < v_dim; j++) {
                    for (let i = 0; i < u_dim;) {
                        const materialKey = mask[n];
                        if (materialKey) {
                            let w;
                            for (w = 1; i + w < u_dim && mask[n + w] === materialKey; w++);

                            let h;
                            let done = false;
                            for (h = 1; j + h < v_dim; h++) {
                                for (let k = 0; k < w; k++) {
                                    if (mask[n + k + h * u_dim] !== materialKey) {
                                        done = true;
                                        break;
                                    }
                                }
                                if (done) break;
                            }

                            x[u] = i;
                            x[v] = j;

                            const du = [0, 0, 0]; du[u] = w;
                            const dv = [0, 0, 0]; dv[v] = h;

                            const [mat, direction] = materialKey.split('|');
                            const isPositiveFace = direction === '+';

                            const normal = [0, 0, 0];
                            normal[d] = isPositiveFace ? 1 : -1;

                            const v1 = [x[0], x[1], x[2]];
                            const v2 = [x[0] + du[0], x[1] + du[1], x[2] + du[2]];
                            const v3 = [x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]];
                            const v4 = [x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]];

                            if (isPositiveFace) {
                                v1[d] += 1; v2[d] += 1; v3[d] += 1; v4[d] += 1;
                            }

                            const quadGeo = new THREE.BufferGeometry();
                            const positions = new Float32Array([
                                v1[0], v1[1], v1[2],
                                v3[0], v3[1], v3[2],
                                v2[0], v2[1], v2[2],
                                v4[0], v4[1], v4[2],
                            ]);
                            const normals = new Float32Array([...normal, ...normal, ...normal, ...normal]);
                            const uvs = new Float32Array([0, 0, 0, h, w, 0, w, h]);

                            const indices = isPositiveFace ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1];

                            quadGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                            quadGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                            quadGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                            quadGeo.setIndex(indices);

                            if (!geos[mat]) {
                                const [blockId, ...seedParts] = mat.split('-');
                                geos[mat] = {
                                    geometries: [],
                                    blockId: parseInt(blockId),
                                    seed: seedParts.join('-')
                                };
                            }
                            geos[mat].geometries.push(quadGeo);

                            for (let l = 0; l < h; l++) {
                                for (let k = 0; k < w; k++) {
                                    mask[n + k + l * u_dim] = null;
                                }
                            }

                            i += w;
                            n += w;
                        } else {
                            i++;
                            n++;
                        }
                    }
                }
            }
        }

        const group = new THREE.Group();
        for (const matKey in geos) {
            const data = geos[matKey];
            if (data.geometries.length > 0) {
                const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(data.geometries);
                if (!merged) continue;
                const info = BLOCKS[data.blockId];
                if (!info) continue;
                let material;
                if (info.light) {
                    material = new THREE.MeshBasicMaterial({ map: emberTexture, transparent: true, opacity: 0.8 });
                } else if (info.transparent) {
                    material = new THREE.MeshBasicMaterial({ color: new THREE.Color(info.color), transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                } else {
                    const blockTexture = createBlockTexture(data.seed, data.blockId);
                    material = new THREE.MeshStandardMaterial({ map: blockTexture });
                }
                const mesh = new THREE.Mesh(merged, material);
                group.add(mesh);
            }
        }
        return group;
    }

    return ChunkManager;
}