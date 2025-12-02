
function Chunk(e, t) {
    this.cx = e, this.cz = t, this.key = makeChunkKey(worldName, e, t), this.data = new Uint8Array(CHUNK_SIZE * MAX_HEIGHT * CHUNK_SIZE), this.mesh = null, this.generated = !1, this.needsRebuild = !0
}

function ChunkManager(e) {
    console.log("[WorldGen] Initializing ChunkManager with seed:", e), this.seed = e, this.noise = makeNoise(e), this.blockNoise = makeNoise(e + "_block"), this.chunks = new Map, this.lastPcx = null, this.lastPcz = null, this.pendingDeltas = new Map, console.log("[ChunkManager] Using existing meshGroup for chunk rendering")
}

function buildGreedyMesh(e, t, o) {
    const a = {},
        n = e.data,
        r = (e, t, o) => e < 0 || e >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT || o < 0 || o >= CHUNK_SIZE ? 0 : n[t * CHUNK_SIZE * CHUNK_SIZE + o * CHUNK_SIZE + e];
    for (let n = 0; n < 3; n++) {
        const s = (n + 1) % 3,
            i = (n + 2) % 3,
            l = [0, 0, 0],
            d = [0, 0, 0];
        d[n] = 1;
        const c = [CHUNK_SIZE, MAX_HEIGHT, CHUNK_SIZE],
            u = c[s],
            p = c[i],
            m = new Array(u * p);
        for (l[n] = -1; l[n] < c[n];) {
            let y = 0;
            for (l[i] = 0; l[i] < p; l[i]++)
                for (l[s] = 0; l[s] < u; l[s]++) {
                    const a = l[n] >= 0 ? r(l[0], l[1], l[2]) : 0,
                        s = l[n] < c[n] - 1 ? r(l[0] + d[0], l[1] + d[1], l[2] + d[2]) : 0,
                        i = BLOCKS[a] || {},
                        u = BLOCKS[s] || {},
                        p = !a || i.transparent;
                    let h = null;
                    if (p !== (!s || u.transparent))
                        if (p) {
                            const a = `${e.cx * CHUNK_SIZE + l[0] + d[0]},${l[1] + d[1]},${e.cz * CHUNK_SIZE + l[2] + d[2]}`;
                            h = `${s}-${t.get(a) || o}|-`
                        } else {
                            const n = `${e.cx * CHUNK_SIZE + l[0]},${l[1]},${e.cz * CHUNK_SIZE + l[2]}`;
                            h = `${a}-${t.get(n) || o}|+`
                        } m[y++] = h
                }
            l[n]++, y = 0;
            for (let e = 0; e < p; e++)
                for (let t = 0; t < u;) {
                    const o = m[y];
                    if (o) {
                        let r, d;
                        for (r = 1; t + r < u && m[y + r] === o; r++);
                        let c = !1;
                        for (d = 1; e + d < p; d++) {
                            for (let e = 0; e < r; e++)
                                if (m[y + e + d * u] !== o) {
                                    c = !0;
                                    break
                                } if (c) break
                        }
                        l[s] = t, l[i] = e;
                        const h = [0, 0, 0];
                        h[s] = r;
                        const f = [0, 0, 0];
                        f[i] = d;
                        const [g, E] = o.split("|"), v = "+" === E, M = [0, 0, 0];
                        M[n] = v ? 1 : -1;
                        const S = [l[0], l[1], l[2]],
                            I = [l[0] + h[0], l[1] + h[1], l[2] + h[2]],
                            k = [l[0] + f[0], l[1] + f[1], l[2] + f[2]],
                            w = [l[0] + h[0] + f[0], l[1] + h[1] + f[1], l[2] + h[2] + f[2]];
                        v && (S[n] += 1, I[n] += 1, k[n] += 1, w[n] += 1);
                        const b = new THREE.BufferGeometry,
                            x = new Float32Array([S[0], S[1], S[2], k[0], k[1], k[2], I[0], I[1], I[2], w[0], w[1], w[2]]),
                            T = new Float32Array([...M, ...M, ...M, ...M]),
                            C = new Float32Array([0, 0, 0, d, r, 0, r, d]),
                            H = v ? [0, 1, 2, 2, 1, 3] : [0, 2, 1, 2, 3, 1];
                        if (b.setAttribute("position", new THREE.BufferAttribute(x, 3)), b.setAttribute("normal", new THREE.BufferAttribute(T, 3)), b.setAttribute("uv", new THREE.BufferAttribute(C, 2)), b.setIndex(H), !a[g]) {
                            const [e, ...t] = g.split("-");
                            a[g] = {
                                geometries: [],
                                blockId: parseInt(e),
                                seed: t.join("-")
                            }
                        }
                        a[g].geometries.push(b);
                        for (let e = 0; e < d; e++)
                            for (let t = 0; t < r; t++) m[y + t + e * u] = null;
                        t += r, y += r
                    } else t++, y++
                }
        }
    }
    const s = new THREE.Group;
    for (const e in a) {
        const t = a[e];
        if (t.geometries.length > 0) {
            // Skip mesh generation for Chest (131) as it uses a custom mesh
            if (t.blockId === 131) continue;
            const e = THREE.BufferGeometryUtils.mergeBufferGeometries(t.geometries);
            if (!e) continue;
            const o = BLOCKS[t.blockId];
            if (!o) continue;
            let a;
            if (o.light) {
                if (!emberTexture && typeof worldSeed !== 'undefined') {
                    console.warn("[ChunkManager] emberTexture missing, regenerating...");
                    emberTexture = createEmberTexture(worldSeed);
                }
                a = new THREE.MeshBasicMaterial({
                    map: emberTexture,
                    color: 0xffaa00, // Fallback tint
                    transparent: !0,
                    opacity: .8,
                    side: THREE.DoubleSide
                });
            }
            else if (o.transparent) a = new THREE.MeshBasicMaterial({
                color: new THREE.Color(o.color),
                transparent: !0,
                opacity: .6,
                side: THREE.DoubleSide
            });
            else {
                const e = createBlockTexture(t.seed, t.blockId);
                a = new THREE.MeshStandardMaterial({
                    map: e
                })
            }
            const n = new THREE.Mesh(e, a);
            s.add(n)
        }
    }
    return s
}
Chunk.prototype.idx = function (e, t, o) {
    return (t * CHUNK_SIZE + o) * CHUNK_SIZE + e
}, Chunk.prototype.get = function (e, t, o) {
    return e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT ? BLOCK_AIR : this.data[this.idx(e, t, o)]
}, Chunk.prototype.set = function (e, t, o, a) {
    e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT || (this.data[this.idx(e, t, o)] = a, this.needsRebuild = !0)
}, ChunkManager.prototype.addPendingDeltas = function (chunkKey, deltas) {
    if (!this.pendingDeltas.has(chunkKey)) {
        this.pendingDeltas.set(chunkKey, []);
    }
    this.pendingDeltas.get(chunkKey).push(...deltas);
}, ChunkManager.prototype.getChunk = function (e, t) {
    var o = Math.floor(MAP_SIZE / CHUNK_SIZE),
        a = modWrap(e, o),
        n = modWrap(t, o),
        r = makeChunkKey(worldName, a, n);
    if (this.chunks.has(r)) return this.chunks.get(r);
    var s = new Chunk(a, n);
    return this.chunks.set(s.key, s), pending.add(s.key), s
}, ChunkManager.prototype.generateChunk = function (e) {
    e.generating || e.generated || (e.generating = !0, worker.postMessage({
        type: "generate_chunk",
        key: e.key
    }))
}, ChunkManager.prototype.pickBiome = function (e) {
    return e > .68 ? BIOMES.find((function (e) {
        return "snow" === e.key
    })) || BIOMES[0] : e < .25 ? BIOMES.find((function (e) {
        return "desert" === e.key
    })) || BIOMES[1] : e > .45 ? BIOMES.find((function (e) {
        return "forest" === e.key
    })) || BIOMES[2] : e > .6 ? BIOMES.find((function (e) {
        return "mountain" === e.key
    })) || BIOMES[4] : e < .35 ? BIOMES.find((function (e) {
        return "swamp" === e.key
    })) || BIOMES[5] : BIOMES.find((function (e) {
        return "plains" === e.key
    })) || BIOMES[0]
}, ChunkManager.prototype.placeTree = function (e, t, o, a, n) {
    for (var r = 5 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 7);
    for (var i = -2; i <= 2; i++)
        for (var l = -2; l <= 2; l++)
            for (var d = 0; d <= 3; d++) {
                var c = t + i,
                    u = o + r - 2 + d,
                    p = a + l;
                u < MAX_HEIGHT && c >= 0 && c < CHUNK_SIZE && p >= 0 && p < CHUNK_SIZE && Math.abs(i) + Math.abs(l) + Math.abs(d) <= 4 && e.get(c, u, p) === BLOCK_AIR && e.set(c, u, p, 8)
            }
}, ChunkManager.prototype.placeFlower = function (e, t, o, a) {
    o < MAX_HEIGHT && e.get(t, o, a) === BLOCK_AIR && e.set(t, o, a, 12)
}, ChunkManager.prototype.placeCactus = function (e, t, o, a, n) {
    for (var r = 1 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 9)
}, ChunkManager.prototype.buildChunkMesh = function (e) {
    const worldState = getCurrentWorldState();
    if (worldState.chunkDeltas.has(e.key)) {
        const deltas = worldState.chunkDeltas.get(e.key);
        console.log(`[ChunkManager] Building mesh for chunk ${e.key}, applying ${deltas.length} stored deltas`);
        for (const delta of deltas) {
            e.set(delta.x, delta.y, delta.z, delta.b);
        }
    } else {
        console.log(`[ChunkManager] Building mesh for chunk ${e.key}, no stored deltas`);
    }
    updateTorchRegistry(e), e.mesh && (meshGroup.remove(e.mesh), disposeObject(e.mesh), e.mesh = null);
    const t = volcanoes.find((t => t.chunkKey === e.key));
    if (t && Math.random() < .3) {
        const o = Math.floor(t.lavaCount / 4),
            a = createSmokeParticle(t.x, t.y, t.z, o);
        a.userData.chunkKey = e.key, smokeParticles.push(a), scene.add(a)
    }
    if (useGreedyMesher) {
        const t = buildGreedyMesh(e, getCurrentWorldState().foreignBlockOrigins, worldSeed),
            o = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE),
            a = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE);
        let n = e.cx * CHUNK_SIZE,
            r = e.cz * CHUNK_SIZE;
        return Math.abs(e.cx - o) > CHUNKS_PER_SIDE / 2 && (e.cx > o ? n -= MAP_SIZE : n += MAP_SIZE), Math.abs(e.cz - a) > CHUNKS_PER_SIDE / 2 && (e.cz > a ? r -= MAP_SIZE : r += MAP_SIZE), t.position.set(n, 0, r), e.mesh = t, meshGroup.add(e.mesh), void (e.needsRebuild = !1)
    }
    var o = {},
        a = Math.floor(modWrap(player.x, MAP_SIZE) / CHUNK_SIZE),
        n = Math.floor(modWrap(player.z, MAP_SIZE) / CHUNK_SIZE),
        r = e.cx * CHUNK_SIZE,
        s = e.cz * CHUNK_SIZE,
        i = r,
        l = s;
    Math.abs(e.cx - a) > CHUNKS_PER_SIDE / 2 && (e.cx > a ? i -= MAP_SIZE : i += MAP_SIZE), Math.abs(e.cz - n) > CHUNKS_PER_SIDE / 2 && (e.cz > n ? l -= MAP_SIZE : l += MAP_SIZE);
    for (var d = 0; d < CHUNK_SIZE; d++)
        for (var c = 0; c < CHUNK_SIZE; c++)
            for (var u = 0; u < MAX_HEIGHT; u++) {
                if (!(w = e.get(d, u, c)) || w === BLOCK_AIR) continue;
                if (w === 131) continue; // Skip mesh generation for Chest
                for (var p = modWrap(r + d, MAP_SIZE), m = modWrap(s + c, MAP_SIZE), y = i + d, h = l + c, f = [{
                    x: 1,
                    y: 0,
                    z: 0
                }, {
                    x: -1,
                    y: 0,
                    z: 0
                }, {
                    x: 0,
                    y: 1,
                    z: 0
                }, {
                    x: 0,
                    y: -1,
                    z: 0
                }, {
                    x: 0,
                    y: 0,
                    z: 1
                }, {
                    x: 0,
                    y: 0,
                    z: -1
                }], g = BLOCKS[w] && BLOCKS[w].transparent, E = !1, v = 0; v < f.length; v++) {
                    var M = f[v],
                        S = this.getBlockGlobal(e.cx, e.cz, d + M.x, u + M.y, c + M.z);
                    if (g !== (S === BLOCK_AIR || BLOCKS[S] && BLOCKS[S].transparent) || g && w !== S) {
                        E = !0;
                        break
                    }
                }
                if (!E) continue;
                const t = `${p},${u},${m}`,
                    a = getCurrentWorldState().foreignBlockOrigins.get(t) || worldSeed,
                    n = `${w}-${a}`;
                o[n] || (o[n] = {
                    positions: [],
                    seed: a,
                    blockId: w
                }), o[n].positions.push({
                    x: y,
                    y: u,
                    z: h
                })
            }
    var I = new THREE.Group;
    for (var k in o) {
        const e = o[k];
        if (e.positions && 0 !== e.positions.length) {
            var w = e.blockId,
                b = e.seed,
                x = new THREE.BoxGeometry(1, 1, 1),
                T = [],
                C = [],
                H = [],
                N = [],
                R = 0;
            for (var B of e.positions) {
                for (var P = x.attributes.position.array, A = x.attributes.normal.array, L = x.attributes.uv.array, O = x.index.array, _ = 0; _ < x.attributes.position.count; _++) T.push(P[3 * _ + 0] + B.x + .5, P[3 * _ + 1] + B.y + .5, P[3 * _ + 2] + B.z + .5), C.push(A[3 * _ + 0], A[3 * _ + 1], A[3 * _ + 2]), H.push(L[2 * _ + 0], L[2 * _ + 1]);
                for (var z = 0; z < O.length; z++) N.push(O[z] + R);
                R += x.attributes.position.count
            }
            var U = new THREE.BufferGeometry;
            U.setAttribute("position", new THREE.Float32BufferAttribute(T, 3)), U.setAttribute("normal", new THREE.Float32BufferAttribute(C, 3)), U.setAttribute("uv", new THREE.Float32BufferAttribute(H, 2)), U.setIndex(N), U.computeBoundingSphere();
            var D, K = BLOCKS[w] || {
                color: "#ff00ff"
            };
            if (K.light) {
                if (!emberTexture && typeof worldSeed !== 'undefined') {
                    console.warn("[ChunkManager] emberTexture missing, regenerating...");
                    emberTexture = createEmberTexture(worldSeed);
                }
                D = new THREE.MeshBasicMaterial({
                    map: emberTexture,
                    color: 0xffaa00, // Fallback tint
                    transparent: !0,
                    opacity: .8,
                    side: THREE.DoubleSide
                });
            }
            else if (K.transparent) D = new THREE.MeshBasicMaterial({
                color: new THREE.Color(K.color),
                transparent: !0,
                opacity: .6,
                side: THREE.DoubleSide
            });
            else {
                const e = createBlockTexture(b, w);
                D = new THREE.MeshStandardMaterial({
                    map: e
                })
            }
            var G = new THREE.Mesh(U, D);
            I.add(G)
        }
    }
    e.mesh = I, meshGroup.add(e.mesh), e.needsRebuild = !1
}, ChunkManager.prototype.getBlockGlobal = function (e, t, o, a, n) {
    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var r = modWrap(e * CHUNK_SIZE + o, MAP_SIZE),
        s = modWrap(t * CHUNK_SIZE + n, MAP_SIZE),
        i = Math.floor(r / CHUNK_SIZE),
        l = Math.floor(s / CHUNK_SIZE),
        d = modWrap(r, CHUNK_SIZE),
        c = modWrap(s, CHUNK_SIZE),
        u = this.getChunk(i, l);
    return u.generated || this.generateChunk(u), u.get(d, a, c)
}, ChunkManager.prototype.setBlockGlobal = function (e, t, o, a, n = !0, r = null, source = 'local') {
    if (!(t < 0 || t >= MAX_HEIGHT)) {
        var s = modWrap(e, MAP_SIZE),
            i = modWrap(o, MAP_SIZE),
            l = Math.floor(s / CHUNK_SIZE),
            d = Math.floor(i / CHUNK_SIZE),
            c = Math.floor(s % CHUNK_SIZE),
            u = Math.floor(i % CHUNK_SIZE),
            p = this.getChunk(l, d);
        p.generated || this.generateChunk(p);
        var m = p.get(c, t, u);
        if (m !== a) {
            p.set(c, t, u, a);

            // If a block is removed, ensure its crack mesh is also removed.
            if (a === BLOCK_AIR) {
                const key = `${e},${t},${o}`;
                const damagedBlock = damagedBlocks.get(key);
                if (damagedBlock && damagedBlock.mesh) {
                    crackMeshes.remove(damagedBlock.mesh);
                    disposeObject(damagedBlock.mesh);
                    damagedBlocks.delete(key);
                }
            }

            var y = p.key;
            const worldState = getCurrentWorldState();
            if (worldState.chunkDeltas.has(y) || worldState.chunkDeltas.set(y, []), worldState.chunkDeltas.get(y).push({
                x: c,
                y: t,
                z: u,
                b: a,
                source: source
            }), p.needsRebuild = !0, 0 === c && (this.getChunk(l - 1, d).needsRebuild = !0), c === CHUNK_SIZE - 1 && (this.getChunk(l + 1, d).needsRebuild = !0), 0 === u && (this.getChunk(l, d - 1).needsRebuild = !0), u === CHUNK_SIZE - 1 && (this.getChunk(l, d + 1).needsRebuild = !0), updateSaveChangesButton(), n) {
                const n = JSON.stringify({
                    type: "block_change",
                    world: worldName,
                    wx: e,
                    wy: t,
                    wz: o,
                    bid: a,
                    prevBid: m,
                    username: userName,
                    originSeed: r
                });
                for (const [e, t] of peers.entries()) e !== userName && t.dc && "open" === t.dc.readyState && (console.log(`[WebRTC] Sending block change to ${e}`), t.dc.send(n))
            }
        }
    }
}, ChunkManager.prototype.applyDeltasToChunk = function (e, t) {
    var o = e.replace(/^#/, "");
    if (parseChunkKey(o)) {
        var a = this.chunks.get(o);
        if (a) {
            console.log(`[ChunkManager] Applying ${t.length} deltas to loaded chunk ${o}`);
            for (var n of t)
                if (!(n.x < 0 || n.x >= CHUNK_SIZE || n.y < 0 || n.y >= MAX_HEIGHT || n.z < 0 || n.z >= CHUNK_SIZE)) {
                    var r = n.b === BLOCK_AIR || n.b && BLOCKS[n.b] ? n.b : 4;
                    a.set(n.x, n.y, n.z, r)
                } updateTorchRegistry(a), a.needsRebuild = !0, this.buildChunkMesh(a)
        } else {
            console.log(`[ChunkManager] Chunk ${o} not currently loaded - deltas stored for later application`);
        }
    }
}, ChunkManager.prototype.markDirty = function (e) {
    var t = this.chunks.get(e);
    if (t) {
        console.log(`[ChunkManager] Marking chunk ${e} dirty and rebuilding mesh`);
        t.needsRebuild = !0, this.buildChunkMesh(t)
    } else {
        console.log(`[ChunkManager] Cannot mark chunk ${e} dirty - not currently loaded`);
    }
}, ChunkManager.prototype.getSurfaceY = function (e, t) {
    var o = modWrap(Math.floor(e), MAP_SIZE),
        a = modWrap(Math.floor(t), MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = this.getChunk(n, r);
    s.generated || this.generateChunk(s);
    for (var i = Math.floor(o % CHUNK_SIZE), l = Math.floor(a % CHUNK_SIZE), d = MAX_HEIGHT - 1; d >= 0; d--)
        if (s.get(i, d, l) !== BLOCK_AIR && 6 !== s.get(i, d, l)) return d + 1;
    return SEA_LEVEL
}, ChunkManager.prototype.getSurfaceYForBoulders = function (e, t) {
    var o = modWrap(Math.floor(e), MAP_SIZE),
        a = modWrap(Math.floor(t), MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = this.getChunk(n, r);
    s.generated || this.generateChunk(s);
    for (var i = Math.floor(o % CHUNK_SIZE), l = Math.floor(a % CHUNK_SIZE), d = MAX_HEIGHT - 1; d >= 0; d--) {
        const e = s.get(i, d, l);
        if (e !== BLOCK_AIR && 6 !== e && 16 !== e) return d + 1
    }
    return SEA_LEVEL
}, ChunkManager.prototype.preloadChunks = function (e, t, o) {
    // Use circular distance check instead of square for more natural load area
    var a = Math.floor(MAP_SIZE / CHUNK_SIZE), n = [], radiusSq = o * o;
    for (var s = -o; s <= o; s++)
        for (var i = -o; i <= o; i++) {
            // Circular filter: only include chunks within circular radius
            if (s * s + i * i <= radiusSq) {
                n.push({
                    cx: e + s,
                    cz: t + i,
                    dist: Math.sqrt(s * s + i * i)
                });
            }
        }
    n.sort((function (e, t) {
        return e.dist - t.dist
    }));
    var l = 0;
    (function e() {
        if (!(l >= n.length)) {
            var t = n[l].cx,
                o = n[l].cz,
                r = modWrap(t, a),
                s = modWrap(o, a),
                i = this.getChunk(r, s);
            i.generated || this.generateChunk(i), l++, setTimeout(e.bind(this), 33)
        }
    }).call(this)
}, ChunkManager.prototype.update = function (e, t, o) {
    var a = Math.floor(modWrap(e, MAP_SIZE) / CHUNK_SIZE),
        n = Math.floor(modWrap(t, MAP_SIZE) / CHUNK_SIZE);
    a === this.lastPcx && n === this.lastPcz || (this.lastPcx = a, this.lastPcz = n);
    
    // Use circular distance check for more natural load area
    var r = [], radiusSq = currentLoadRadius * currentLoadRadius;
    for (var s = -currentLoadRadius; s <= currentLoadRadius; s++)
        for (var i = -currentLoadRadius; i <= currentLoadRadius; i++) {
            // Circular filter: only include chunks within circular radius
            if (s * s + i * i <= radiusSq) {
                var l = modWrap(a + s, CHUNKS_PER_SIDE),
                    d = modWrap(n + i, CHUNKS_PER_SIDE);
                r.push({
                    cx: l,
                    cz: d,
                    dx: s,
                    dz: i
                });
            }
        }
    r.sort(((e, t) => {
        const a = e.dx * e.dx + e.dz * e.dz,
            n = t.dx * t.dx + t.dz * t.dz;
        let r = !1,
            s = !1;
        if (o && o.lengthSq() > 0) {
            const a = new THREE.Vector3(e.dx, 0, e.dz);
            a.lengthSq() > 0 && a.normalize().dot(o) > .3 && (r = !0);
            const n = new THREE.Vector3(t.dx, 0, t.dz);
            n.lengthSq() > 0 && n.normalize().dot(o) > .3 && (s = !0)
        }
        return r && !s ? -1 : !r && s ? 1 : a - n
    }));
    var c = new Set,
        u = 0;
    for (const e of r) {
        var p = this.getChunk(e.cx, e.cz);
        c.add(p.key), p.generating || p.generated || this.generateChunk(p), p.generated && (p.needsRebuild || !p.mesh) && u < 2 && (this.buildChunkMesh(p), u++)
    }
    for (var m in userPositions)
        if (m !== userName) {
            var y = userPositions[m],
                h = Math.floor(modWrap(y.x, MAP_SIZE) / CHUNK_SIZE),
                f = Math.floor(modWrap(y.z, MAP_SIZE) / CHUNK_SIZE);
            this.preloadChunks(h, f, 2)
        }
    
    // Use global MAX_LOADED_CHUNKS cap as primary bound, with dynamic threshold as secondary
    // Dynamic limit formula: (chunks in square area) * 10 (exploration headroom) * 3 (multiplayer factor)
    // This allows smooth chunk loading during exploration while respecting the hard cap
    const dynamicLimit = (2 * currentLoadRadius + 1) * (2 * currentLoadRadius + 1) * 10 * 3;
    const g = Math.min(dynamicLimit, MAX_LOADED_CHUNKS);
    if (this.chunks.size > g) {
        let e = Array.from(this.chunks.values());
        e.sort(((e, t) => {
            const o = Math.hypot(e.cx - a, e.cz - n);
            return Math.hypot(t.cx - a, t.cz - n) - o
        }));
        for (let t = 0; t < e.length && this.chunks.size > g; t++) {
            const o = e[t];
            if (!c.has(o.key)) {
                o.mesh && (meshGroup.remove(o.mesh), disposeObject(o.mesh));
                for (let e = smokeParticles.length - 1; e >= 0; e--) {
                    const t = smokeParticles[e];
                    t.userData.chunkKey === o.key && (scene.remove(t), disposeObject(t), smokeParticles.splice(e, 1))
                }
                // Clean up volcanoes associated with this chunk
                for (let e = volcanoes.length - 1; e >= 0; e--) {
                    if (volcanoes[e].chunkKey === o.key) {
                        volcanoes.splice(e, 1);
                    }
                }
                const e = o.cx * CHUNK_SIZE,
                    t = o.cz * CHUNK_SIZE;
                for (let a = 0; a < CHUNK_SIZE; a++)
                    for (let n = 0; n < CHUNK_SIZE; n++)
                        for (let r = 0; r < MAX_HEIGHT; r++) {
                            const s = o.get(a, r, n);
                            if (BLOCKS[s] && BLOCKS[s].light) {
                                const o = `${modWrap(e + a, MAP_SIZE)},${r},${modWrap(t + n, MAP_SIZE)}`;
                                torchRegistry.delete(o)
                            }
                        }
                this.chunks.delete(o.key)
            }
        }
    }
    for (const e of c) {
        const t = this.chunks.get(e);
        t && t.mesh && (t.mesh.visible = !0)
    }
    };

/**
 * Immediately unloads all chunks that are beyond the specified radius from the player's current position.
 * This is called after teleportation to ensure previously visited areas are cleaned up and don't appear
 * as tiny objects on the horizon.
 * @param {number} playerX - The player's current X position
 * @param {number} playerZ - The player's current Z position
 * @param {number} radius - The maximum chunk distance to keep (defaults to currentLoadRadius)
 */
ChunkManager.prototype.unloadDistantChunks = function(playerX, playerZ, radius) {
    // Validate radius parameter: use currentLoadRadius if not provided or invalid
    if (typeof radius !== 'number' || radius <= 0 || !isFinite(radius)) {
        radius = currentLoadRadius;
    }
    const pcx = Math.floor(modWrap(playerX, MAP_SIZE) / CHUNK_SIZE);
    const pcz = Math.floor(modWrap(playerZ, MAP_SIZE) / CHUNK_SIZE);
    
    // Build a set of chunk keys that should remain loaded using circular distance check
    const chunksToKeep = new Set();
    const radiusSq = radius * radius;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            // Circular filter: only keep chunks within circular radius
            if (dx * dx + dz * dz <= radiusSq) {
                const cx = modWrap(pcx + dx, CHUNKS_PER_SIDE);
                const cz = modWrap(pcz + dz, CHUNKS_PER_SIDE);
                chunksToKeep.add(makeChunkKey(worldName, cx, cz));
            }
        }
    }
    
    // Find and remove all chunks that are outside the radius
    const chunksToRemove = [];
    for (const [key, chunk] of this.chunks) {
        if (!chunksToKeep.has(key)) {
            chunksToRemove.push(chunk);
        }
    }
    
    // Unload the distant chunks
    for (const chunk of chunksToRemove) {
        // Remove the mesh from the scene
        if (chunk.mesh) {
            meshGroup.remove(chunk.mesh);
            disposeObject(chunk.mesh);
            chunk.mesh = null;
        }
        
        // Clean up smoke particles associated with this chunk
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            const particle = smokeParticles[i];
            if (particle.userData.chunkKey === chunk.key) {
                scene.remove(particle);
                disposeObject(particle);
                smokeParticles.splice(i, 1);
            }
        }
        
        // Clean up volcanoes associated with this chunk
        for (let i = volcanoes.length - 1; i >= 0; i--) {
            if (volcanoes[i].chunkKey === chunk.key) {
                volcanoes.splice(i, 1);
            }
        }
        
        // Clean up torch registry entries for this chunk
        const chunkStartX = chunk.cx * CHUNK_SIZE;
        const chunkStartZ = chunk.cz * CHUNK_SIZE;
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let y = 0; y < MAX_HEIGHT; y++) {
                    const blockId = chunk.get(x, y, z);
                    if (BLOCKS[blockId] && BLOCKS[blockId].light) {
                        const torchKey = `${modWrap(chunkStartX + x, MAP_SIZE)},${y},${modWrap(chunkStartZ + z, MAP_SIZE)}`;
                        torchRegistry.delete(torchKey);
                    }
                }
            }
        }
        
        // Remove the chunk from the manager
        this.chunks.delete(chunk.key);
    }
    
    if (chunksToRemove.length > 0) {
        console.log(`[ChunkManager] Unloaded ${chunksToRemove.length} distant chunk(s)`);
    }
};

function makeChunkKey(e, t, o) {
    return ("" + e).slice(0, 8) + ":" + t + ":" + o
}

function parseJsonChunkKey(e) {
    var t = e.match(/^#?(.{1,8}):(\d{1,5}):(\d{1,5})$/);
    return t ? {
        world: t[1],
        cx: parseInt(t[2]),
        cz: parseInt(t[3])
    } : null
}

function parseChunkKey(e) {
    var t = e.match(/^(.{1,8}):(\d{1,5}):(\d{1,5})$/);
    return t ? {
        world: t[1],
        cx: parseInt(t[2]),
        cz: parseInt(t[3])
    } : null
}

async function applyChunkUpdates(e, t, o, a, sourceUsername) {
    try {
        // Get username from fromAddress
        let ownerUsername = null;
        if (t) {
            try {
                const profile = await GetProfileByAddress(t);
                if (profile && profile.URN) {
                    const urnProfile = await GetProfileByURN(profile.URN);
                    if (urnProfile && urnProfile.Creators && urnProfile.Creators.includes(t)) {
                        ownerUsername = profile.URN;
                    }
                }
            } catch (err) {
                console.error("[ChunkManager] Failed to get profile for address:", t, err);
            }
        }

        const now = Date.now();
        const blockDate = o; // o is the BlockDate timestamp
        
        console.log(`[ChunkManager] applyChunkUpdates: BlockDate=${new Date(blockDate).toISOString()}, Address=${t}, TxId=${a}`);

        // Extract magician and calligraphy stones if present in the full payload
        // The payload 'e' is expected to be an array of chunk updates, but if it came from
        // an IPFS export, it might be the full object.
        // However, applyChunkUpdates is usually called with 'fullData' which is the array of chunk updates.
        // IF the export format includes metadata at the top level, we need to check if 'e' has those properties.
        // Wait, 'e' is passed as 'fullData'.
        // Let's check if 'e' is an array or object.
        let chunksArray = Array.isArray(e) ? e : (e.deltas || []);

        // Handle metadata if 'e' is the full export object
        if (!Array.isArray(e)) {
            if (e.magicianStones) {
                for (const key in e.magicianStones) {
                    if (Object.hasOwnProperty.call(e.magicianStones, key)) {
                        createMagicianStoneScreen({ ...e.magicianStones[key], source: 'ipfs' });
                    }
                }
            }
            if (e.calligraphyStones) {
                for (const key in e.calligraphyStones) {
                    if (Object.hasOwnProperty.call(e.calligraphyStones, key)) {
                        createCalligraphyStoneScreen({ ...e.calligraphyStones[key], source: 'ipfs' });
                    }
                }
            }
        }

        const showProgress = chunksArray.length > 5;
        if (showProgress && window.showLoadingIndicator) {
            window.showLoadingIndicator(0, "Applying Updates...");
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        for (let idx = 0; idx < chunksArray.length; idx++) {
            var n = chunksArray[idx];
            var r = n.chunk,
                s = n.changes;
            if (chunkManager) {
                const worldNameFromChunk = parseChunkKey(r)?.world;
                if (worldNameFromChunk) {
                    if (!WORLD_STATES.has(worldNameFromChunk)) {
                        WORLD_STATES.set(worldNameFromChunk, {
                            chunkDeltas: new Map(),
                            foreignBlockOrigins: new Map(),
                            ipfsTruncatedDates: new Map()
                        });
                    }
                    const worldState = WORLD_STATES.get(worldNameFromChunk);
                    // Ensure ipfsTruncatedDates exists for backward compatibility
                    if (!worldState.ipfsTruncatedDates) {
                        worldState.ipfsTruncatedDates = new Map();
                    }
                    if (!worldState.chunkDeltas.has(r)) {
                        worldState.chunkDeltas.set(r, []);
                    }
                    
                    // Compute truncated unix date for monotonic ordering of IPFS updates
                    // If blockDate is missing/invalid, this returns 0 and updates will be rejected
                    // (shouldApplyIpfsUpdate rejects incoming truncated dates <= 0)
                    const incomingTruncatedDate = computeIpfsTruncatedDate(blockDate);
                    if (incomingTruncatedDate === 0 && blockDate !== undefined) {
                        console.warn(`[IPFS Ordering] BlockDate ${blockDate} resulted in truncated date 0 (before epoch 2025-09-21 or invalid)`);
                    }
                    
                    // Parse chunk coordinates for world position calculation
                    const parsedChunk = parseChunkKey(r);
                    const cx = parsedChunk ? parsedChunk.cx : 0;
                    const cz = parsedChunk ? parsedChunk.cz : 0;
                    
                    // Filter changes using monotonic ordering check
                    const acceptedChanges = [];
                    const rejectedChanges = [];
                    for (const change of s) {
                        // Calculate world position for this block
                        const worldX = cx * CHUNK_SIZE + change.x;
                        const worldY = change.y;
                        const worldZ = cz * CHUNK_SIZE + change.z;
                        const blockPosKey = `${worldX},${worldY},${worldZ}`;
                        
                        // Get existing truncated date for this block
                        const existingTruncatedDate = worldState.ipfsTruncatedDates.get(blockPosKey) || 0;
                        
                        // Apply monotonic ordering check
                        if (shouldApplyIpfsUpdate(existingTruncatedDate, incomingTruncatedDate)) {
                            acceptedChanges.push({ ...change, source: 'ipfs' });
                            // Store the new truncated date for this block
                            worldState.ipfsTruncatedDates.set(blockPosKey, incomingTruncatedDate);
                        } else {
                            // Track rejected changes for detailed logging
                            rejectedChanges.push({
                                blockId: change.b,
                                position: blockPosKey,
                                existingTruncated: existingTruncatedDate,
                                incomingTruncated: incomingTruncatedDate
                            });
                        }
                    }
                    
                    // Log detailed info about rejected updates
                    if (rejectedChanges.length > 0) {
                        console.log(`[IPFS Ordering] Rejected ${rejectedChanges.length} block update(s) in chunk ${r}`);
                        console.log(`  Transaction ID: ${a}`);
                        console.log(`  Incoming BlockDate: ${new Date(blockDate).toISOString()} (truncated unix: ${incomingTruncatedDate})`);
                        for (const rejected of rejectedChanges) {
                            console.log(`  - Block ID ${rejected.blockId} at position ${rejected.position}: existing truncated=${rejected.existingTruncated}, incoming truncated=${rejected.incomingTruncated} (incoming NOT newer)`);
                        }
                    }
                    
                    // Log summary of accepted updates
                    if (acceptedChanges.length > 0) {
                        console.log(`[IPFS Ordering] Accepted ${acceptedChanges.length} block update(s) in chunk ${r}: incoming truncated date (${incomingTruncatedDate}) is newer than existing`);
                    }
                    
                    // Only add accepted changes to deltas
                    if (acceptedChanges.length > 0) {
                        worldState.chunkDeltas.get(r).push(...acceptedChanges);
                    }
                    
                    // Use filtered changes for applying to chunk
                    s = acceptedChanges.map(c => ({ x: c.x, y: c.y, z: c.z, b: c.b }));
                }

                // Set ownership based on BlockDate and owner
                if (ownerUsername && blockDate) {
                    const normalized = r.replace(/^#/, "");
                    const existing = OWNED_CHUNKS.get(normalized);
                    const blockAge = now - blockDate;

                    // Only set ownership if claim is valid (30d-1y) or pending (<30d)
                    if (blockAge < IPFS_MAX_OWNERSHIP_PERIOD) {
                        // Check if we should update ownership
                        let shouldUpdate = false;
                        
                        if (!existing) {
                            // No existing ownership
                            shouldUpdate = true;
                        } else if (existing.type === 'ipfs' && existing.username === ownerUsername) {
                            // Same owner, update if this is newer
                            if (!existing.claimDate || blockDate > existing.claimDate) {
                                shouldUpdate = true;
                            }
                        } else if (existing.type !== 'home') {
                            // Different owner, but not a home spawn - check if existing is expired
                            if (existing.expiryDate && now > existing.expiryDate) {
                                shouldUpdate = true;
                            }
                        }

                        if (shouldUpdate) {
                            updateChunkOwnership(normalized, ownerUsername, blockDate, 'ipfs', blockDate);
                            console.log(`[Ownership] IPFS chunk ${normalized} ownership set to ${ownerUsername}, blockDate: ${new Date(blockDate).toISOString()}`);
                        } else {
                            console.log(`[Ownership] IPFS chunk ${normalized} ownership not updated - existing ownership takes precedence`);
                        }
                    }
                }

                chunkManager.applyDeltasToChunk(r, s), chunkManager.markDirty(r)
            } else console.error("[ChunkManager] chunkManager not defined")

            if (showProgress && window.showLoadingIndicator && idx % 5 === 0) {
                const percent = Math.round((idx / chunksArray.length) * 100);
                window.showLoadingIndicator(percent, `Processing ${percent}%`);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        if (showProgress && window.hideLoadingIndicator) {
            window.hideLoadingIndicator();
        }

        const dataString = JSON.stringify(e);
        const chunkSize = 131072; // 128KB chunks
        const chunks = [];
        for (let i = 0; i < dataString.length; i += chunkSize) {
            chunks.push(dataString.slice(i, i + chunkSize));
        }

        function sendChunksAsync(peer, messageType, chunks, transactionId) {
            let i = 0;
            const highWaterMark = 1024 * 1024; // 1 MB buffer threshold

            function sendChunk() {
                if (!peer.dc || peer.dc.readyState !== 'open' || i >= chunks.length) return;

                // Check if buffer is full and wait if necessary
                if (peer.dc.bufferedAmount > highWaterMark) {
                    peer.dc.onbufferedamountlow = () => {
                        peer.dc.onbufferedamountlow = null;
                        setTimeout(sendChunk, 0); // Yield before sending next chunk
                    };
                    return;
                }

                // Send one chunk
                peer.dc.send(JSON.stringify({
                    type: messageType,
                    transactionId: transactionId,
                    index: i,
                    chunk: chunks[i],
                    total: chunks.length
                }));
                i++;

                // Yield to the event loop before sending the next chunk
                setTimeout(sendChunk, 0);
            }

            sendChunk(); // Start the sending process
        }

        if (isHost) {
            const startMessage = JSON.stringify({
                type: 'ipfs_chunk_update_start',
                total: chunks.length,
                fromAddress: t,
                timestamp: o,
                transactionId: a
            });
            for (const [peerUsername, peer] of peers.entries()) {
                if (peerUsername !== sourceUsername && peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(startMessage);
                    sendChunksAsync(peer, 'ipfs_chunk_update_chunk', chunks, a);
                }
            }
        } else if (sourceUsername === undefined) {
            const startMessage = JSON.stringify({
                type: 'ipfs_chunk_from_client_start',
                total: chunks.length,
                fromAddress: t,
                timestamp: o,
                transactionId: a
            });
            for (const [, peer] of peers.entries()) {
                if (peer.dc && peer.dc.readyState === 'open') {
                    peer.dc.send(startMessage);
                    sendChunksAsync(peer, 'ipfs_chunk_from_client_chunk', chunks, a);
                }
            }
        }

        worker.postMessage({
            type: "update_processed",
            transactionIds: [a]
        });

        if (typeof processedMessages !== 'undefined') {
            processedMessages.add(a);
        }

        const message = JSON.stringify({
            type: 'processed_transaction_id',
            transactionId: a
        });
        for (const [, peer] of peers.entries()) {
            if (peer.dc && peer.dc.readyState === 'open') {
                peer.dc.send(message);
            }
        }
    } catch (e) {
        console.error("[ChunkManager] Failed to apply chunk updates:", e)
    }
}

function isChunkMutationAllowed(chunkKey, username) {
    const normalized = chunkKey.replace(/^#/, "");
    
    // Check home spawn ownership
    // spawnChunks is keyed by username@worldname
    if (spawnChunks.size > 0) {
        for (const [spawnKey, spawnData] of spawnChunks) {
            const parsed = parseChunkKey(normalized);
            if (!parsed) continue;
            // Check if this is a spawn chunk AND the world matches
            if (spawnData.cx === parsed.cx && spawnData.cz === parsed.cz && spawnData.world === parsed.world) {
                // This chunk is a home spawn chunk in this world
                if (spawnData.username !== username) {
                    console.log(`[Ownership] Chunk ${normalized} denied: home spawn of ${spawnData.username} in world ${parsed.world}`);
                    return false;
                }
                return true; // Own home spawn
            }
        }
    }
    
    // Check OWNED_CHUNKS ownership
    const ownership = OWNED_CHUNKS.get(normalized);
    if (!ownership) {
        return true; // No ownership, free to edit
    }
    
    const now = Date.now();
    
    // Check if ownership is pending (immature IPFS claim < 30 days)
    if (ownership.pending) {
        console.log(`[Ownership] Chunk ${normalized} allowed: claim pending (<30d), anyone can edit`);
        return true; // Pending chunks are editable by anyone
    }
    
    // Check if ownership has expired (> 1 year)
    if (ownership.expiryDate && now > ownership.expiryDate) {
        console.log(`[Ownership] Chunk ${normalized} allowed: claim expired (>1y), anyone can edit`);
        return true; // Expired chunks are editable by anyone
    }
    
    // Check if owned by different user (mature ownership 30d-1y)
    if (ownership.username !== username) {
        console.log(`[Ownership] Chunk ${normalized} denied: owned by ${ownership.username}`);
        return false;
    }
    
    // User owns the chunk
    return true;
}

function checkChunkOwnership(chunkKey, username) {
    return isChunkMutationAllowed(chunkKey, username);
}

var skyProps, avatarGroup;

function updateChunkOwnership(chunkKey, username, claimDate, ownershipType, blockDate) {
    try {
        const normalized = chunkKey.replace(/^#/, "");
        const now = Date.now();
        
        if (ownershipType === 'home') {
            // Home spawn ownership: non-expiring
            OWNED_CHUNKS.set(normalized, {
                username: username,
                claimDate: claimDate || now,
                type: 'home'
            });
            console.log(`[Ownership] Home spawn chunk ${normalized} assigned to ${username}`);
        } else if (ownershipType === 'ipfs') {
            // IPFS ownership: check maturity and set expiry
            const age = now - blockDate;
            const isPending = age < IPFS_MATURITY_PERIOD;
            const expiryDate = blockDate + IPFS_MAX_OWNERSHIP_PERIOD;
            
            OWNED_CHUNKS.set(normalized, {
                username: username,
                claimDate: blockDate,
                expiryDate: expiryDate,
                type: 'ipfs',
                pending: isPending
            });
            
            console.log(`[Ownership] IPFS chunk ${normalized} assigned to ${username}, pending: ${isPending}, expires: ${new Date(expiryDate).toISOString()}`);
        }
    } catch (e) {
        console.error("[ChunkManager] Failed to update chunk ownership:", e);
    }
}
