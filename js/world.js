const BLOCKS = {
    1: {
        name: "Bedrock",
        color: "#0b0b0b",
        strength: 5
    },
    2: {
        name: "Grass",
        color: "#3fb34f",
        strength: 1
    },
    3: {
        name: "Dirt",
        color: "#7a4f29",
        strength: 1
    },
    4: {
        name: "Stone",
        color: "#9aa0a6",
        strength: 2
    },
    5: {
        name: "Sand",
        color: "#e7d08d",
        strength: 1
    },
    6: {
        name: "Water",
        color: "#2b9cff",
        transparent: !0,
        strength: 1
    },
    7: {
        name: "Wood",
        color: "#8b5a33",
        strength: 2
    },
    8: {
        name: "Leaves",
        color: "#2f8f46",
        strength: 1
    },
    9: {
        name: "Cactus",
        color: "#4aa24a",
        strength: 1
    },
    10: {
        name: "Snow",
        color: "#ffffff",
        strength: 1
    },
    11: {
        name: "Coal",
        color: "#1f1f1f",
        strength: 2
    },
    12: {
        name: "Flower",
        color: "#ff6bcb",
        strength: 1
    },
    13: {
        name: "Clay",
        color: "#a9b6c0",
        strength: 1
    },
    14: {
        name: "Moss",
        color: "#507d43",
        strength: 1
    },
    15: {
        name: "Gravel",
        color: "#b2b2b2",
        strength: 1
    },
    16: {
        name: "Lava",
        color: "#ff6a00",
        transparent: !0,
        strength: 1
    },
    17: {
        name: "Ice",
        color: "#a8e6ff",
        transparent: !0,
        strength: 1
    },
    100: {
        name: "Glass",
        color: "#b3e6ff",
        transparent: !0,
        strength: 1
    },
    101: {
        name: "Stained Glass - Red",
        color: "#ff4b4b",
        transparent: !0,
        strength: 1
    },
    102: {
        name: "Stained Glass - Blue",
        color: "#4b6bff",
        transparent: !0,
        strength: 1
    },
    103: {
        name: "Stained Glass - Green",
        color: "#57c84d",
        transparent: !0,
        strength: 1
    },
    104: {
        name: "Stained Glass - Yellow",
        color: "#fff95b",
        transparent: !0,
        strength: 1
    },
    105: {
        name: "Brick",
        color: "#a84f3c",
        strength: 2
    },
    106: {
        name: "Smooth Stone",
        color: "#c1c1c1",
        strength: 2
    },
    107: {
        name: "Concrete",
        color: "#888888",
        strength: 3
    },
    108: {
        name: "Polished Wood",
        color: "#a87443",
        strength: 2
    },
    109: {
        name: "Marble",
        color: "#f0f0f0",
        strength: 2
    },
    110: {
        name: "Obsidian",
        color: "#2d004d",
        strength: 5
    },
    111: {
        name: "Crystal - Blue",
        color: "#6de0ff",
        transparent: !0,
        strength: 1
    },
    112: {
        name: "Crystal - Purple",
        color: "#b26eff",
        transparent: !0,
        strength: 1
    },
    113: {
        name: "Crystal - Green",
        color: "#6fff91",
        transparent: !0,
        strength: 1
    },
    114: {
        name: "Light Block",
        color: "#fffacd",
        transparent: !0,
        strength: 1
    },
    115: {
        name: "Glow Brick",
        color: "#f7cc5b",
        strength: 1
    },
    116: {
        name: "Dark Glass",
        color: "#3a3a3a",
        transparent: !0,
        strength: 1
    },
    117: {
        name: "Glass Tile",
        color: "#aeeaff",
        transparent: !0,
        strength: 1
    },
    118: {
        name: "Sandstone",
        color: "#e3c27d",
        strength: 1
    },
    119: {
        name: "Cobblestone",
        color: "#7d7d7d",
        strength: 2
    },
    120: {
        name: "Torch",
        color: "#ff9900",
        light: !0,
        transparent: !0,
        strength: 1
    },
    121: {
        name: "Laser Gun",
        color: "#ff0000",
        hand_attachable: !0,
        strength: 1
    },
    122: {
        name: "Honey",
        color: "#ffb74a",
        strength: 1
    },
    123: {
        name: "Hive",
        color: "#e3c27d",
        strength: 2
    },
    124: {
        name: "Iron Ore",
        color: "#a8a8a8",
        strength: 3
    },
    125: {
        name: "Emerald",
        color: "#00ff7b",
        strength: 4
    },
    126: {
        name: "Green Laser Gun",
        color: "#00ff00",
        hand_attachable: !0,
        strength: 1
    },
    127: {
        name: "Magician's Stone",
        color: "#8A2BE2",
        strength: 3
    }
};
const BIOMES = [{
    key: "plains",
    palette: [2, 3, 4, 13, 15],
    heightScale: .8,
    roughness: .3,
    featureDensity: .05
}, {
    key: "desert",
    palette: [5, 118, 4],
    heightScale: .6,
    roughness: .4,
    featureDensity: .02
}, {
    key: "forest",
    palette: [2, 3, 14, 4],
    heightScale: 1.3,
    roughness: .4,
    featureDensity: .03
}, {
    key: "snow",
    palette: [10, 17, 4],
    heightScale: 1.2,
    roughness: .5,
    featureDensity: .02
}, {
    key: "mountain",
    palette: [4, 11, 3, 15, 1, 16],
    heightScale: 1,
    roughness: .6,
    featureDensity: .01
}, {
    key: "swamp",
    palette: [2, 3, 6, 14, 13],
    heightScale: .5,
    roughness: .2,
    featureDensity: .04
}];

const CHUNK_SIZE = 16,
    MAX_HEIGHT = 256,
    SEA_LEVEL = 16,
    MAP_SIZE = 16384,
    BLOCK_AIR = 0;

var skyProps;

function updateTorchRegistry(e) {
    const t = e.cx * CHUNK_SIZE,
        o = e.cz * CHUNK_SIZE;
    torchRegistry.forEach(((t, o) => {
        Math.floor(t.x / CHUNK_SIZE) === e.cx && Math.floor(t.z / CHUNK_SIZE) === e.cz && torchRegistry.delete(o)
    }));
    for (let a = 0; a < CHUNK_SIZE; a++)
        for (let n = 0; n < CHUNK_SIZE; n++)
            for (let r = 0; r < MAX_HEIGHT; r++) {
                const s = e.get(a, r, n);
                if (BLOCKS[s] && BLOCKS[s].light) {
                    const e = t + a,
                        s = o + n,
                        i = r,
                        l = `${e},${i},${s}`;
                    torchRegistry.set(l, {
                        x: e,
                        y: i,
                        z: s
                    })
                }
            }
}

function makeSeededRandom(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return function() {
        t += 1831565813;
        var e = Math.imul(t ^ t >>> 15, 1 | t);
        return (((e ^= e + Math.imul(e ^ e >>> 7, 61 | e)) ^ e >>> 14) >>> 0) / 4294967296
    }
}

function makeNoise(e) {
    makeSeededRandom(e);
    var t = {};

    function o(o, a) {
        var n = o + "," + a;
        if (void 0 !== t[n]) return t[n];
        var r = makeSeededRandom(e + "|" + o + "," + a)();
        return t[n] = r
    }

    function a(e, t, o) {
        return e + o * (o * (3 - 2 * o)) * (t - e)
    }
    return function(e, t) {
        var n = Math.floor(e),
            r = Math.floor(t),
            s = e - n,
            i = t - r,
            l = o(n, r),
            d = o(n + 1, r),
            c = o(n, r + 1),
            u = o(n + 1, r + 1),
            p = a(l, d, s),
            m = a(c, u, s);
        return a(p, m, i)
    }
}

function fbm(e, t, o, a, n) {
    for (var r = 0, s = 1, i = 1, l = 0, d = 0; d < a; d++) r += s * e(t * i, o * i), l += s, s *= n, i *= 2;
    return r / l
}

function modWrap(e, t) {
    return (e % t + t) % t
}

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

function hashSeed(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return t % MAP_SIZE
}

function calculateSpawnPoint(e) {
    var t = makeSeededRandom(e),
        o = Math.floor(t() * MAP_SIZE),
        a = Math.floor(t() * MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = chunkManager.getChunk(n, r);
    s.generated || chunkManager.generateChunk(s);
    for (var i = MAX_HEIGHT - 1; i > 0 && s.get(o % CHUNK_SIZE, i, a % CHUNK_SIZE) === BLOCK_AIR;) i--;
    return {
        x: o,
        y: i += 2,
        z: a
    }
}

function createEmberTexture(e) {
    const t = 32,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_ember"),
        r = a.createImageData(t, t),
        s = r.data,
        i = makeSeededRandom(e + "_ember_color"),
        l = [{
            r: Math.floor(100 * i()),
            g: 0,
            b: 0
        }, {
            r: 255,
            g: Math.floor(150 * i()),
            b: 0
        }, {
            r: 255,
            g: 255,
            b: Math.floor(200 * i())
        }];
    for (let e = 0; e < t; e++)
        for (let o = 0; o < t; o++) {
            const a = fbm(n, e / 8, o / 8, 3, .6),
                r = 4 * (o * t + e);
            let i, d, c;
            if (a < .5) {
                const e = a / .5;
                i = l[0].r + (l[1].r - l[0].r) * e, d = l[0].g + (l[1].g - l[0].g) * e, c = l[0].b + (l[1].b - l[0].b) * e
            } else {
                const e = (a - .5) / .5;
                i = l[1].r + (l[2].r - l[1].r) * e, d = l[1].g + (l[2].g - l[1].g) * e, c = l[1].b + (l[2].b - l[1].b) * e
            }
            s[r] = i, s[r + 1] = d, s[r + 2] = c, s[r + 3] = a > .3 ? 255 : 0
        }
    return a.putImageData(r, 0, 0), new THREE.CanvasTexture(o)
}

function createMobTexture(e, t, o = !1) {
    const a = `${e}:${t}:${o}`;
    if (textureCache.has(a)) return textureCache.get(a);
    const n = 16,
        r = document.createElement("canvas");
    r.width = n, r.height = n;
    const s = r.getContext("2d"),
        i = makeSeededRandom(e + "_mob_texture_" + t);
    let l, d;
    t.includes("body") ? (l = (new THREE.Color).setHSL(i(), .2 + .8 * i(), .2 + .6 * i()), d = l.clone().multiplyScalar(.7 + .2 * i())) : (l = (new THREE.Color).setHSL(.1 * i() + .05, .2 + .2 * i(), .2 + .1 * i()), d = l.clone().multiplyScalar(1.2 + .2 * i())), s.fillStyle = l.getStyle(), s.fillRect(0, 0, n, n);
    const c = makeNoise(e + "_mob_pattern_" + t);
    for (let e = 0; e < 50; e++) {
        const e = Math.floor(i() * n),
            t = Math.floor(i() * n),
            o = c(e / n, t / n) > .5 ? d : l.clone().lerp(d, .5);
        s.fillStyle = o.getStyle(), s.fillRect(e, t, 1, 1)
    }
    if (o) {
        const e = (new THREE.Color).setHSL(i(), .5 + .3 * i(), .2 + .2 * i());
        s.fillStyle = e.getStyle(), s.fillRect(0, 0, n, 1), s.fillRect(0, 15, n, 1), s.fillRect(0, 0, 1, n), s.fillRect(15, 0, 1, n)
    }
    const u = new THREE.CanvasTexture(r);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(a, u), u
}

function createBlockTexture(e, t) {
    const o = `${e}:${t}`;
    if (textureCache.has(o)) return textureCache.get(o);
    const a = 16,
        n = document.createElement("canvas");
    n.width = a, n.height = a;
    const r = n.getContext("2d"),
        s = makeSeededRandom(e + "_block_texture_" + t),
        i = new THREE.Color(BLOCKS[t].color);
    let l = (new THREE.Color).setHSL(s(), .5 + .3 * s(), .2 + .3 * s());
    r.fillStyle = i.getStyle(), r.fillRect(0, 0, a, a);
    const d = Math.floor(5 * s()),
        c = makeNoise(e + "_pattern_noise_" + t);
    if (r.strokeStyle = l.getStyle(), r.lineWidth = 1 + Math.floor(2 * s()), 0 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(t / 8, e / 8) > .4 && (r.moveTo(t, e), r.lineTo(t + 1, e));
            r.stroke()
        } else if (1 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(e / 8, t / 8) > .4 && (r.moveTo(e, t), r.lineTo(e, t + 1));
            r.stroke()
        } else if (2 === d)
        for (let e = -16; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < 32; t++) c(e / 8, t / 8) > .6 && (r.moveTo(e + t, t), r.lineTo(e + t + 1, t + 1));
            r.stroke()
        } else if (3 === d)
        for (let e = 0; e < a; e += 4) {
            r.beginPath(), r.moveTo(0, e);
            for (let t = 0; t < a; t++) {
                const o = 2 * Math.sin(t / 4 + 10 * s());
                c(t / 8, e / 8) > .3 ? r.lineTo(t, e + o) : r.moveTo(t, e + o)
            }
            r.stroke()
        }
    if (s() > .8) {
        const e = i.clone().multiplyScalar(.7);
        r.strokeStyle = e.getStyle(), r.lineWidth = 1, r.strokeRect(.5, .5, 15, 15)
    }
    const u = new THREE.CanvasTexture(n);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(o, u), u
}

function createCloudTexture(e) {
    const t = 256,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_clouds");
    for (let e = 0; e < t; e++)
        for (let o = 0; o < t; o++) {
            const t = 255 * fbm(n, e / 32, o / 32, 4, .5),
                r = Math.max(0, t - 128);
            a.fillStyle = `rgba(255, 255, 255, ${r / 128})`, a.fillRect(e, o, 1, 1)
        }
    return new THREE.CanvasTexture(o)
}

function initSky() {
    const e = makeSeededRandom(worldSeed + "_sky"),
        t = e(),
        o = .5 + .5 * e(),
        a = .6 + .2 * e(),
        n = .05 + .05 * e();
    skyProps = {
        dayColor: (new THREE.Color).setHSL(t, o, a),
        nightColor: (new THREE.Color).setHSL(t, .8 * o, n),
        cloudColor: (new THREE.Color).setHSL(e(), .2 + .3 * e(), .8),
        suns: [],
        moons: []
    };
    const r = 1 + Math.floor(3 * e());
    for (let t = 0; t < r; t++) {
        const t = 80 + 120 * e(),
            o = (new THREE.Color).setHSL(e(), .8 + .2 * e(), .6 + .2 * e()),
            a = new THREE.Mesh(new THREE.SphereGeometry(t, 32, 32), new THREE.MeshBasicMaterial({
                color: o
            }));
        skyProps.suns.push({
            mesh: a,
            angleOffset: e() * Math.PI * 2
        }), scene.add(a)
    }
    const s = Math.floor(4 * e());
    for (let t = 0; t < s; t++) {
        const o = 40 + 60 * e(),
            a = (new THREE.Color).setHSL(e(), .1 + .2 * e(), .7 + .2 * e()),
            n = new THREE.SphereGeometry(o, 32, 32),
            r = makeNoise(worldSeed + "_moon_" + t),
            s = n.attributes.position,
            i = new THREE.Vector3;
        for (let e = 0; e < s.count; e++) {
            i.fromBufferAttribute(s, e);
            const t = .8,
                o = fbm(r, .05 * i.x, .05 * i.y, 3, .5) + fbm(r, .05 * i.y, .05 * i.z, 3, .5) + fbm(r, .05 * i.z, .05 * i.x, 3, .5),
                a = .15 * fbm(r, .3 * i.x, .3 * i.y, 3, .5);
            i.multiplyScalar(1 + o / 3 * t - a), s.setXYZ(e, i.x, i.y, i.z)
        }
        n.computeVertexNormals();
        const l = new THREE.Mesh(n, new THREE.MeshBasicMaterial({
            color: a
        }));
        skyProps.moons.push({
            mesh: l,
            angleOffset: e() * Math.PI * 2
        }), scene.add(l)
    }
    stars = new THREE.Group;
    const i = new THREE.BufferGeometry,
        l = [],
        d = makeNoise(worldSeed + "_stars");
    for (let t = 0; t < 5e3; t++) {
        const t = e() * Math.PI * 2,
            o = Math.acos(2 * e() - 1),
            a = 4e3 * Math.sin(o) * Math.cos(t),
            n = 4e3 * Math.sin(o) * Math.sin(t),
            r = 4e3 * Math.cos(o);
        d(.005 * a, .005 * r) > .7 && l.push(a, n, r)
    }
    i.setAttribute("position", new THREE.Float32BufferAttribute(l, 3));
    const c = new THREE.PointsMaterial({
        color: 16777215,
        size: 2 + 3 * e()
    }),
        u = new THREE.Points(i, c);
    stars.add(u), scene.add(stars), clouds = new THREE.Group;
    const p = createCloudTexture(worldSeed),
        m = Math.floor(80 * e());
    for (let t = 0; t < m; t++) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(200 + 300 * e(), 100 + 150 * e()), new THREE.MeshBasicMaterial({
            map: p,
            color: skyProps.cloudColor,
            transparent: !0,
            opacity: .6 + .3 * e(),
            side: THREE.DoubleSide
        }));
        t.position.set(8e3 * (e() - .5), 200 + 150 * e(), 8e3 * (e() - .5)), t.rotation.y = e() * Math.PI * 2, clouds.add(t)
    }
    scene.add(clouds)
}

function updateSky(e) {
    const t = new Date;
    const o = (t.getHours() + t.getMinutes() / 60) / 24 * Math.PI * 2,
        a = o + (skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0),
        n = Math.sin(a);
    isNight = n < -.1, skyProps.suns.forEach((e => {
        const t = o + e.angleOffset;
        e.mesh.position.set(camera.position.x + 4e3 * Math.cos(t), camera.position.y + 4e3 * Math.sin(t), camera.position.z + 1500 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
    })), skyProps.moons.forEach((e => {
        const t = o + e.angleOffset + Math.PI;
        e.mesh.position.set(camera.position.x + 3800 * Math.cos(t), camera.position.y + 3800 * Math.sin(t), camera.position.z + 1200 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
    })), stars.visible = isNight, stars.rotation.y += .005 * e, clouds.children.forEach((t => {
        t.position.x = modWrap(t.position.x + e * (15 + 10 * Math.random()), 8e3)
    }));
    const r = Math.max(0, n);
    scene.background = (new THREE.Color).copy(skyProps.dayColor).lerp(skyProps.nightColor, 1 - r);
    let s = (n - -.2) / .4;
    s = Math.max(0, Math.min(1, s));
    const i = scene.getObjectByProperty("type", "AmbientLight"),
        l = scene.getObjectByProperty("type", "DirectionalLight"),
        d = scene.getObjectByProperty("type", "HemisphereLight");
    if (i && (i.intensity = .01 + .19 * s), l && (l.intensity = 0 + .95 * s), d) {
        const e = .6,
            t = .02;
        d.intensity = t + (e - t) * s
    }
    for (let o = blockParticles.length - 1; o >= 0; o--) {
        const a = blockParticles[o];
        a.velocity.y -= gravity * e, a.mesh.position.add(a.velocity.clone().multiplyScalar(e)), (a.mesh.position.y < -10 || Date.now() - a.createdAt > 1e3) && (scene.remove(a.mesh), disposeObject(a.mesh), blockParticles.splice(o, 1))
    }
}

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

Chunk.prototype.idx = function(e, t, o) {
    return (t * CHUNK_SIZE + o) * CHUNK_SIZE + e
}, Chunk.prototype.get = function(e, t, o) {
    return e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT ? BLOCK_AIR : this.data[this.idx(e, t, o)]
}, Chunk.prototype.set = function(e, t, o, a) {
    e < 0 || e >= CHUNK_SIZE || o < 0 || o >= CHUNK_SIZE || t < 0 || t >= MAX_HEIGHT || (this.data[this.idx(e, t, o)] = a, this.needsRebuild = !0)
}, ChunkManager.prototype.addPendingDeltas = function(chunkKey, deltas) {
    if (!this.pendingDeltas.has(chunkKey)) {
        this.pendingDeltas.set(chunkKey, []);
    }
    this.pendingDeltas.get(chunkKey).push(...deltas);
}, ChunkManager.prototype.getChunk = function(e, t) {
    var o = Math.floor(MAP_SIZE / CHUNK_SIZE),
        a = modWrap(e, o),
        n = modWrap(t, o),
        r = makeChunkKey(worldName, a, n);
    if (this.chunks.has(r)) return this.chunks.get(r);
    var s = new Chunk(a, n);
    return this.chunks.set(s.key, s), pending.add(s.key), s
}, ChunkManager.prototype.generateChunk = function(e) {
    e.generating || e.generated || (e.generating = !0, worker.postMessage({
        type: "generate_chunk",
        key: e.key
    }))
}, ChunkManager.prototype.pickBiome = function(e) {
    return e > .68 ? BIOMES.find((function(e) {
        return "snow" === e.key
    })) || BIOMES[0] : e < .25 ? BIOMES.find((function(e) {
        return "desert" === e.key
    })) || BIOMES[1] : e > .45 ? BIOMES.find((function(e) {
        return "forest" === e.key
    })) || BIOMES[2] : e > .6 ? BIOMES.find((function(e) {
        return "mountain" === e.key
    })) || BIOMES[4] : e < .35 ? BIOMES.find((function(e) {
        return "swamp" === e.key
    })) || BIOMES[5] : BIOMES.find((function(e) {
        return "plains" === e.key
    })) || BIOMES[0]
}, ChunkManager.prototype.placeTree = function(e, t, o, a, n) {
    for (var r = 5 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 7);
    for (var i = -2; i <= 2; i++)
        for (var l = -2; l <= 2; l++)
            for (var d = 0; d <= 3; d++) {
                var c = t + i,
                    u = o + r - 2 + d,
                    p = a + l;
                u < MAX_HEIGHT && c >= 0 && c < CHUNK_SIZE && p >= 0 && p < CHUNK_SIZE && Math.abs(i) + Math.abs(l) + Math.abs(d) <= 4 && e.get(c, u, p) === BLOCK_AIR && e.set(c, u, p, 8)
            }
}, ChunkManager.prototype.placeFlower = function(e, t, o, a) {
    o < MAX_HEIGHT && e.get(t, o, a) === BLOCK_AIR && e.set(t, o, a, 12)
}, ChunkManager.prototype.placeCactus = function(e, t, o, a, n) {
    for (var r = 1 + Math.floor(3 * n()), s = 0; s < r; s++) o + s < MAX_HEIGHT && e.set(t, o + s, a, 9)
}, ChunkManager.prototype.buildChunkMesh = function(e) {
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
        return Math.abs(e.cx - o) > CHUNKS_PER_SIDE / 2 && (e.cx > o ? n -= MAP_SIZE : n += MAP_SIZE), Math.abs(e.cz - a) > CHUNKS_PER_SIDE / 2 && (e.cz > a ? r -= MAP_SIZE : r += MAP_SIZE), t.position.set(n, 0, r), e.mesh = t, meshGroup.add(e.mesh), void(e.needsRebuild = !1)
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
}, ChunkManager.prototype.getBlockGlobal = function(e, t, o, a, n) {
    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var r = modWrap(e * CHUNK_SIZE + o, MAP_SIZE),
        s = modWrap(t * CHUNK_SIZE + n, MAP_SIZE),
        i = Math.floor(r / CHUNK_SIZE),
        l = Math.floor(s / CHUNK_SIZE),
        d = modWrap(r, CHUNK_SIZE),
        c = modWrap(s, CHUNK_SIZE),
        u = this.getChunk(i, l);
    return u.generated || this.generateChunk(u), u.get(d, a, c)
}, ChunkManager.prototype.setBlockGlobal = function(e, t, o, a, n = !0, r = null) {
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
}, ChunkManager.prototype.applyDeltasToChunk = function(e, t) {
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
}, ChunkManager.prototype.markDirty = function(e) {
    var t = this.chunks.get(e);
    t && (t.needsRebuild = !0, this.buildChunkMesh(t))
}, ChunkManager.prototype.getSurfaceY = function(e, t) {
    var o = modWrap(Math.floor(e), MAP_SIZE),
        a = modWrap(Math.floor(t), MAP_SIZE),
        n = Math.floor(o / CHUNK_SIZE),
        r = Math.floor(a / CHUNK_SIZE),
        s = this.getChunk(n, r);
    s.generated || this.generateChunk(s);
    for (var i = Math.floor(o % CHUNK_SIZE), l = Math.floor(a % CHUNK_SIZE), d = MAX_HEIGHT - 1; d >= 0; d--)
        if (s.get(i, d, l) !== BLOCK_AIR && 6 !== s.get(i, d, l)) return d + 1;
    return SEA_LEVEL
}, ChunkManager.prototype.getSurfaceYForBoulders = function(e, t) {
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
}, ChunkManager.prototype.preloadChunks = function(e, t, o) {
    for (var a = Math.floor(MAP_SIZE / CHUNK_SIZE), n = [], r = 0; r <= o; r++)
        for (var s = -r; s <= r; s++)
            for (var i = -r; i <= r; i++) Math.abs(s) !== r && Math.abs(i) !== r || n.push({
                cx: e + s,
                cz: t + i,
                dist: Math.abs(s) + Math.abs(i)
            });
    n.sort((function(e, t) {
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
}, ChunkManager.prototype.update = function(e, t, o) {
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
        }
    const g = (2 * currentLoadRadius + 1) * (2 * currentLoadRadius + 1) * 10 * 3;
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
