
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
            const e = THREE.BufferGeometryUtils.mergeBufferGeometries(t.geometries);
            if (!e) continue;
            const o = BLOCKS[t.blockId];
            if (!o) continue;
            let a;
            if (o.light) a = new THREE.MeshBasicMaterial({
                map: emberTexture,
                transparent: !0,
                opacity: .8
            });
            else if (o.transparent) a = new THREE.MeshBasicMaterial({
                color: new THREE.Color(o.color),
                transparent: !0,
                opacity: .6
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
        for (const delta of deltas) {
            e.set(delta.x, delta.y, delta.z, delta.b);
        }
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
            if (K.light) D = new THREE.MeshBasicMaterial({
                map: emberTexture,
                transparent: !0,
                opacity: .8
            });
            else if (K.transparent) D = new THREE.MeshBasicMaterial({
                color: new THREE.Color(K.color),
                transparent: !0,
                opacity: .6
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
}, ChunkManager.prototype.setBlockGlobal = function (e, t, o, a, n = !0, r = null) {
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
                b: a
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
            for (var n of t)
                if (!(n.x < 0 || n.x >= CHUNK_SIZE || n.y < 0 || n.y >= MAX_HEIGHT || n.z < 0 || n.z >= CHUNK_SIZE)) {
                    var r = n.b === BLOCK_AIR || n.b && BLOCKS[n.b] ? n.b : 4;
                    a.set(n.x, n.y, n.z, r)
                } updateTorchRegistry(a), a.needsRebuild = !0, this.buildChunkMesh(a)
        }
    }
}, ChunkManager.prototype.markDirty = function (e) {
    var t = this.chunks.get(e);
    t && (t.needsRebuild = !0, this.buildChunkMesh(t))
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
    for (var a = Math.floor(MAP_SIZE / CHUNK_SIZE), n = [], r = 0; r <= o; r++)
        for (var s = -r; s <= r; s++)
            for (var i = -r; i <= r; i++) Math.abs(s) !== r && Math.abs(i) !== r || n.push({
                cx: e + s,
                cz: t + i,
                dist: Math.abs(s) + Math.abs(i)
            });
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
    for (var r = [], s = -currentLoadRadius; s <= currentLoadRadius; s++)
        for (var i = -currentLoadRadius; i <= currentLoadRadius; i++) {
            var l = modWrap(a + s, CHUNKS_PER_SIDE),
                d = modWrap(n + i, CHUNKS_PER_SIDE);
            r.push({
                cx: l,
                cz: d,
                dx: s,
                dz: i
            })
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
        } const g = (2 * currentLoadRadius + 1) * (2 * currentLoadRadius + 1) * 10 * 3;
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

function applyChunkUpdates(e, t, o, a, sourceUsername) {
    try {
        for (var n of e) {
            var r = n.chunk,
                s = n.changes;
            if (chunkManager) {
                const worldNameFromChunk = parseChunkKey(r)?.world;
                if (worldNameFromChunk) {
                    if (!WORLD_STATES.has(worldNameFromChunk)) {
                        WORLD_STATES.set(worldNameFromChunk, {
                            chunkDeltas: new Map(),
                            foreignBlockOrigins: new Map()
                        });
                    }
                    const worldState = WORLD_STATES.get(worldNameFromChunk);
                    if (!worldState.chunkDeltas.has(r)) {
                        worldState.chunkDeltas.set(r, []);
                    }
                    worldState.chunkDeltas.get(r).push(...s);
                }
                chunkManager.applyDeltasToChunk(r, s), chunkManager.markDirty(r)
            } else console.error("[ChunkManager] chunkManager not defined")
        }

        const dataString = JSON.stringify(e);
        const chunkSize = 16384; // 16KB chunks
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

function checkChunkOwnership(e, t) {
    const o = e.replace(/^#/, "");
    if (spawnChunks.size > 0)
        for (const [e, a] of spawnChunks) {
            const n = parseChunkKey(o);
            if (!n) return !1;
            if (a.cx === n.cx && a.cz === n.cz && e !== t) return !1
        }
    const a = chunkOwners.get(o);
    if (!a) return !0;
    const n = Date.now();
    return n - a.timestamp > OWNERSHIP_EXPIRY || (!!(a.pending && n - a.timestamp < PENDING_PERIOD) || a.username === t)
}
var skyProps, avatarGroup, chunkOwnership = new Map;

function updateChunkOwnership(e, t, o) {
    try {
        chunkOwnership.set(e, {
            username: t,
            timestamp: o
        })
    } catch (e) {
        console.error("[ChunkManager] Failed to update chunk ownership:", e)
    }
}
