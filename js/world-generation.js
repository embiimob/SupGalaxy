// This file will contain functions related to procedural world generation.
function makeSeededRandom(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return function () {
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
    return function (e, t) {
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
    
    // Use utility function for consistent validation
    let blockId = sanitizeBlockId(t);
    if (blockId === null) {
        console.warn(`[createBlockTexture] Missing BLOCKS[${t}] for seed ${e}. Using fallback color #ff00ff`);
        blockId = 4; // Use Stone as fallback for invalid blocks
    }
    
    // Get block definition safely; use fallback if missing (defense-in-depth)
    const blockDef = BLOCKS[blockId];
    const baseColor = blockDef ? blockDef.color : '#ff00ff';
    
    const a = 16,
        n = document.createElement("canvas");
    n.width = a, n.height = a;
    const r = n.getContext("2d"),
        s = makeSeededRandom(e + "_block_texture_" + blockId),
        i = new THREE.Color(baseColor);
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

function drawCracksOnCanvas(canvas) {
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; // More opaque
    ctx.lineWidth = 1; // Thinner
    ctx.beginPath();

    const centerX = size / 2;
    const centerY = size / 2;

    // Draw 2 new major cracks each time this is called
    for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const length = (Math.random() * 0.4 + 0.1) * size;

        ctx.moveTo(centerX, centerY);
        const endX = centerX + length * Math.cos(angle);
        const endY = centerY + length * Math.sin(angle);
        ctx.lineTo(endX, endY);

        // Add smaller splinters
        for (let j = 0; j < Math.random() * 2; j++) {
            ctx.moveTo(endX, endY);
            const splinterAngle = angle + (Math.random() - 0.5) * (Math.PI / 2);
            const splinterLength = length * (Math.random() * 0.3 + 0.3);
            ctx.lineTo(endX + splinterLength * Math.cos(splinterAngle), endY + splinterLength * Math.sin(splinterAngle));
        }
    }
    ctx.stroke();
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

function createBlockParticles(e, t, o, a) {
    const n = BLOCKS[a];
    if (!n) return;
    const r = createBlockTexture(worldSeed, a);
    for (let s = 0; s < 10; s++) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshBasicMaterial({
            map: r
        }));
        a.position.set(e + .5, t + .5, o + .5);
        const i = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2);
        blockParticles.push({
            mesh: a,
            velocity: i,
            createdAt: Date.now()
        }), scene.add(a)
    }
}

function createFlameParticles(e, t, o) {
    const a = new THREE.BufferGeometry,
        n = new Float32Array(60),
        r = [];
    for (let a = 0; a < 20; a++) n[3 * a] = e, n[3 * a + 1] = t, n[3 * a + 2] = o, r.push({
        x: .01 * (Math.random() - .5),
        y: .05 * Math.random(),
        z: .01 * (Math.random() - .5),
        life: 1 * Math.random()
    });
    a.setAttribute("position", new THREE.BufferAttribute(n, 3)), a.velocities = r;
    const s = new THREE.PointsMaterial({
        color: 16755251,
        size: .2,
        transparent: !0,
        blending: THREE.AdditiveBlending,
        depthWrite: !1
    }),
        i = new THREE.Points(a, s);
    return i.position.set(e, t, o), i
}

function createSmokeParticle(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = [],
        i = new Float32Array(a);
    for (let n = 0; n < a; n++) r[3 * n] = e + 10 * (Math.random() - .5), r[3 * n + 1] = t + 5 * (Math.random() - .5), r[3 * n + 2] = o + 10 * (Math.random() - .5), i[n] = 1, s.push({
        x: 4 * (Math.random() - .5),
        y: 10 + 15 * Math.random(),
        z: 4 * (Math.random() - .5),
        life: 6 + 6 * Math.random()
    });
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(i, 1)), n.velocities = s;
    const l = new THREE.PointsMaterial({
        size: 4,
        map: new THREE.CanvasTexture(document.createElement("canvas")),
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0,
        color: 8947848
    }),
        d = document.createElement("canvas");
    d.width = 64, d.height = 64;
    const c = d.getContext("2d"),
        u = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    u.addColorStop(0, "rgba(200, 200, 200, 0.5)"), u.addColorStop(1, "rgba(200, 200, 200, 0)"), c.fillStyle = u, c.fillRect(0, 0, 64, 64), l.map.image = d, l.map.needsUpdate = !0;
    const p = new THREE.Points(n, l);
    return p.position.set(0, 0, 0), p
}

function handleLavaEruption(e) {
    const t = makeSeededRandom(e.seed),
        o = 20 + Math.floor(20 * t());
    for (let a = 0; a < o; a++) {
        const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
            color: BLOCKS[16].color
        }));
        o.position.set(e.volcano.x + 10 * (t() - .5), e.volcano.y, e.volcano.z + 10 * (t() - .5));
        const a = new THREE.Vector3(2 * (t() - .5), 20 + 20 * t(), 2 * (t() - .5));
        eruptedBlocks.push({
            mesh: o,
            velocity: a,
            createdAt: Date.now()
        }), scene.add(o)
    }
}

function createPebble(e, t, o, a) {
    const n = a ? .2 : .1,
        r = a ? 16738816 : 3355443,
        s = a ? new THREE.MeshBasicMaterial({
            color: r
        }) : new THREE.MeshStandardMaterial({
            color: r
        }),
        i = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), s);
    return i.position.set(e, t, o), i
}

function handlePebbleRain(e) {
    const t = makeSeededRandom(e.seed),
        o = 100 + Math.floor(100 * t());
    for (let a = 0; a < o; a++) {
        const o = t() < .2,
            a = 32 * t(),
            n = t() * Math.PI * 2,
            r = e.volcano.x + Math.cos(n) * a,
            s = e.volcano.z + Math.sin(n) * a,
            i = createPebble(r, e.volcano.y + 20 + 20 * t(), s, o),
            l = new THREE.Vector3(0, -5 - 5 * t(), 0);
        pebbles.push({
            mesh: i,
            velocity: l,
            createdAt: Date.now(),
            isGlowing: o
        }), scene.add(i)
    }
}

function handleVolcanoEvent(e) {
    let t;
    switch (e.eventType) {
        case "lava_eruption":
            handleLavaEruption(e), t = "rumble0";
            break;
        case "pebble_rain":
            handlePebbleRain(e), t = "rumble1";
            break;
        case "boulder_eruption":
            handleBoulderEruption(e);
            const o = ["rumble2", "rumble3", "rumble4", "rumble5"];
            t = o[Math.floor(Math.random() * o.length)]
    }
    if (t) {
        const o = Date.now(),
            a = document.getElementById(t);
        if (a) {
            const n = {
                id: o,
                volcano: e.volcano,
                soundId: t
            };
            activeEruptions.push(n), a.currentTime = 0, safePlayAudio(a), a.onended = () => {
                console.log(`[Audio] Sound ${t} finished playing.`), activeEruptions = activeEruptions.filter((e => e.id !== o)), a.onended = null
            }
        }
    }
}

function createEruptionSmoke(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = new Float32Array(3 * a),
        i = [],
        l = new Float32Array(a),
        d = [new THREE.Color(16777215), new THREE.Color(8947848)];
    for (let n = 0; n < a; n++) {
        r[3 * n] = e + 15 * (Math.random() - .5), r[3 * n + 1] = t + 10 * (Math.random() - .5), r[3 * n + 2] = o + 15 * (Math.random() - .5), l[n] = 1;
        const a = d[Math.floor(Math.random() * d.length)];
        s[3 * n] = a.r, s[3 * n + 1] = a.g, s[3 * n + 2] = a.b, i.push({
            x: 3 * (Math.random() - .5),
            y: 10 + 10 * Math.random(),
            z: 3 * (Math.random() - .5),
            life: 5 + 5 * Math.random()
        })
    }
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("color", new THREE.BufferAttribute(s, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(l, 1)), n.velocities = i;
    const c = new THREE.PointsMaterial({
        size: 5,
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0
    }),
        u = document.createElement("canvas");
    u.width = 64, u.height = 64;
    const p = u.getContext("2d"),
        m = p.createRadialGradient(32, 32, 0, 32, 32, 32);
    m.addColorStop(0, "rgba(200, 200, 200, 0.5)"), m.addColorStop(1, "rgba(200, 200, 200, 0)"), p.fillStyle = m, p.fillRect(0, 0, 64, 64), c.map = new THREE.CanvasTexture(u), c.map.needsUpdate = !0;
    const y = new THREE.Points(n, c);
    return y.position.set(0, 0, 0), y
}

function handleBoulderEruption(e) {
    const t = createEruptionSmoke(e.volcano.x, e.volcano.y, e.volcano.z, 150);
    t.userData.chunkKey = e.volcano.chunkKey, t.createdAt = Date.now(), smokeParticles.push(t), scene.add(t);
    const o = makeSeededRandom(e.seed),
        a = 10 + Math.floor(10 * o());
    for (let t = 0; t < a; t++) {
        const a = o();
        let n, r;
        a < .5 ? (n = 1 + .5 * o(), r = 1) : a < .85 ? (n = 2 + 1 * o(), r = 2) : (n = 3 + 1.5 * o(), r = 4);
        const s = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), new THREE.MeshStandardMaterial({
            color: 5592405,
            map: createBlockTexture(worldSeed, 4)
        })),
            i = o() * Math.PI * 2,
            l = 50 + 50 * o(),
            d = 40 + 20 * o(),
            c = new THREE.Vector3(Math.cos(i) * l / r, d, Math.sin(i) * l / r);
        s.position.set(e.volcano.x + 8 * (o() - .5), e.volcano.y - 10 - 5 * o(), e.volcano.z + 8 * (o() - .5));
        const u = "boulder_" + Date.now() + "_" + t;
        eruptedBlocks.push({
            id: u,
            mesh: s,
            velocity: c,
            createdAt: Date.now(),
            type: "boulder",
            size: n,
            mass: r,
            isRolling: !1,
            targetPosition: s.position.clone(),
            targetQuaternion: s.quaternion.clone(),
            lastUpdate: 0
        }), scene.add(s)
    }
}

function disposeObject(e) {
    e.traverse((function (e) {
        e.geometry && e.geometry.dispose(), e.material && (Array.isArray(e.material) ? e.material.forEach((function (e) {
            e.dispose()
        })) : e.material.dispose())
    }))
}

function safePlayAudio(e) {
    if (e) {
        var t = e.play();
        void 0 !== t && t.catch((function (e) {
            audioErrorLogged || (addMessage("Audio playback issue detected", 3e3), audioErrorLogged = !0)
        }))
    }
}

function manageVolcanoes() {
    if (isHost || 0 === peers.size) {
        if (Date.now() - lastVolcanoManagement < 1e4) return;
        lastVolcanoManagement = Date.now();
        const e = [{
            x: player.x,
            y: player.y,
            z: player.z
        }];
        for (const t of Object.values(userPositions)) t.targetX && e.push({
            x: t.targetX,
            y: t.targetY,
            z: t.targetZ
        });
        for (const t of volcanoes) {
            if (e.some((e => Math.hypot(t.x - e.x, t.z - e.z) < 256))) {
                const e = Date.now();
                if (e - (t.lastEventTime || 0) < 6e4) continue;
                const o = makeSeededRandom(worldSeed + "_volcano_event_" + t.chunkKey + "_" + Math.floor(e / 6e4));
                if (o() < .05) {
                    t.lastEventTime = e;
                    const a = o();
                    let n;
                    n = a < .33 ? "lava_eruption" : a < .66 ? "pebble_rain" : "boulder_eruption", console.log(`[Volcano] Triggering event: ${n} at volcano ${t.chunkKey}`);
                    const r = {
                        type: "volcano_event",
                        volcano: {
                            x: t.x,
                            y: t.y,
                            z: t.z
                        },
                        eventType: n,
                        seed: worldSeed + "_event_" + e
                    };
                    handleVolcanoEvent(r);
                    for (const [e, t] of peers.entries()) t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify(r))
                }
            }
        }
    }
}
