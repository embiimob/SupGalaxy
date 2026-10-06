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
    } else {
        const t = makeSeededRandom(worldSeed + "_crawley_aggro")();
        this.isAggressive = t > .5
    }
    if ("bee" === this.type) {
        this.mesh = new THREE.Group;
        const t = new THREE.MeshLambertMaterial({
            color: 16776960
        }),
            e = new THREE.MeshLambertMaterial({
                color: 16777215,
                transparent: !0,
                opacity: .7
            }),
            s = new THREE.BoxGeometry(.6, .6, 1),
            i = new THREE.Mesh(s, t);
        this.mesh.add(i);
        const o = new THREE.BoxGeometry(.8, .1, .4),
            h = new THREE.Mesh(o, e);
        h.position.set(-.5, .2, 0), this.mesh.add(h);
        const a = new THREE.Mesh(o, e);
        a.position.set(.5, .2, 0), this.mesh.add(a), this.mesh.leftWing = h, this.mesh.rightWing = a, this.originalColor = new THREE.Color(16776960)
    } else if ("crawley" === this.type) {
        this.mesh = new THREE.Group;
        const t = new THREE.MeshLambertMaterial({
            color: 4868682
        }),
            e = makeSeededRandom(worldSeed + "_eye_color_" + this.id)();
        let s;
        e < .1 ? (s = 255, this.eyeColor = "blue", this.hp = 15) : e < .5 ? (s = 65280, this.eyeColor = "green", this.hp = 5) : (s = 16711680, this.eyeColor = "red", this.hp = 10);
        const i = new THREE.MeshBasicMaterial({
            color: s
        }),
            o = new THREE.BoxGeometry(.9, .9, .9),
            h = new THREE.Mesh(o, t);
        this.mesh.add(h);
        const a = new THREE.BoxGeometry(.2, .2, .1),
            n = new THREE.Mesh(a, i);
        n.position.set(-.25, .2, -.45), this.mesh.add(n);
        const r = new THREE.Mesh(a, i);
        r.position.set(.25, .2, -.45), this.mesh.add(r);
        const l = new THREE.PointLight(16711680, 1, 5);
        l.position.set(0, .2, -.5), this.mesh.add(l), this.mesh.eyeLight = l, this.mesh.legs = [];
        const p = new THREE.BoxGeometry(.1, .6, .1);
        for (let e = 0; e < 6; e++) {
            const s = new THREE.Mesh(p, t),
                i = e % 2 == 0 ? 1 : -1;
            s.position.set(.45 * i, 0, .3 * (Math.floor(e / 2) - 1)), this.mesh.add(s), this.mesh.legs.push(s)
        }
        this.originalColor = new THREE.Color(4868682)
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
    } else if ("grub" === this.type) {
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
        this.glowLight = new THREE.PointLight(w, 0, 10 * t), this.mesh.add(this.glowLight);
        const T = new THREE.MeshLambertMaterial({
            color: 16711680
        });
        this.redMaterials = Array(a.length).fill(T)
    } else if ("ufo_saucer" === this.type) {
        this.hp = 3000;
        this.mesh = new THREE.Group();

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
                        const r = Math.random();
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
        const engineLight1 = new THREE.PointLight(0x00ffff, 5, 100);
        engineLight1.position.set(-width*0.2, 0, rearZ);
        this.mesh.add(engineLight1);

        const engineLight2 = new THREE.PointLight(0x00ffff, 5, 100);
        engineLight2.position.set(width*0.2, 0, rearZ);
        this.mesh.add(engineLight2);

        const engineLight3 = new THREE.PointLight(0x00ffff, 5, 100);
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
            if (isHost && p.name === userName) {
                hostInArea = true;
                break;
            }
            if (!isHost && peers.has(p.name)) {
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
        } else {
            mob.spawner = null;
        }
    }

    // Check if any player in the world is idle
    let hasIdlePlayer = false;
    let idlePlayerPos = null;
    const now = performance.now();
    const IDLE_THRESHOLD = 900000; // 15 minutes

    for (const p of playersInWorld) {
        if (p.name === userName) {
            if (typeof window !== 'undefined' && typeof window.lastMoveTime === 'undefined') { window.lastMoveTime = now; }
            // lastMoveTime is in the global scope from js/main.js as window.lastMoveTime
            if (typeof window !== 'undefined' && typeof window.lastMoveTime !== 'undefined') {
                if (now - window.lastMoveTime > IDLE_THRESHOLD) {
                    hasIdlePlayer = true;
                    idlePlayerPos = { x: player.x, z: player.z };
                    break;
                }
            } else if (typeof lastMoveTime !== 'undefined') {
                if (now - lastMoveTime > IDLE_THRESHOLD) {
                    hasIdlePlayer = true;
                    idlePlayerPos = { x: player.x, z: player.z };
                    break;
                }
            }
        } else if (userPositions[p.name]) {
            const peerMoveTime = userPositions[p.name].lastMoveTime || userPositions[p.name].lastUpdate || now;
            if (now - peerMoveTime > IDLE_THRESHOLD) {
                hasIdlePlayer = true;
                const pos = userPositions[p.name];
                idlePlayerPos = { x: pos.targetX || pos.prevX, z: pos.targetZ || pos.prevZ };
                break;
            }
        }
    }

    // Despawn mobs that are too far from ANY player in their active area
    const allowedTypes = (isNight ? worldArchetype.mobSpawnRules.night : worldArchetype.mobSpawnRules.day).slice();
    if (hasIdlePlayer) {
        allowedTypes.push("ufo_saucer");
    }

    mobs = mobs.filter((mob) => {
        const isNearAnyPlayer = playersInWorld.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < 96);
        // Score-tier checks run only on the mob's authority, which has the freshest scores for its area.
        const isAuthority = isMobAuthority(mob);
        const isAllowedType = isEliteMobType(mob.type)
            ? !isAuthority || isEliteMobAllowedAt(mob.type, mob.pos.x, mob.pos.z, playersInWorld)
            : allowedTypes.includes(mob.type) && !(isAuthority && isMobTypeRetiredAt(mob.type, mob.pos.x, mob.pos.z, playersInWorld));

        if (mob.type === "ufo_saucer" && (!isAllowedType || !isNearAnyPlayer)) {
            // If the player is no longer idle or too far, transition the UFO to LEAVING instead of instantly despawning
            if (mob.aiState !== "LEAVING") {
                mob.aiState = "LEAVING";
                mob.lingerTime = 180001; // Force leaving behavior
            }
            // Do not despawn instantly. Wait for the y > 800 check in update()
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
            else if ("grub" === type) maxCount = 2;
            else if ("spider" === type) maxCount = 6;
            else if ("fish_school" === type) maxCount = 6;
            else if ("fish_rare" === type) maxCount = 1;
            else if ("whale" === type) maxCount = 3;
            else if (isEliteMobType(type)) {
                maxCount = getEliteMobDef(type).maxCount;
                if (Math.random() > getEliteMobDef(type).spawnChance) continue;
            }
            else if ("ufo_saucer" === type) {
                maxCount = 1;
                if (Math.random() > 0.02) continue;
            } else continue;
            if (type === "fish_rare" && Math.random() > 0.12) continue;
            if (type === "whale" && Math.random() > 0.025) continue;

            // Count mobs of this type in this specific area
            let countInArea = 0;
            for (const mob of mobs) {
                if (mob.type === type) {
                    // Check if mob is near this area
                    // UFO acts globally for the targeted player, it shouldn't just be counted if it's within 96 horizontal blocks of a spawning area player, since it might be high up or wandering.
                    // Since we want max 1 UFO per idle player, let's just count global UFOs for now.
                    if (type === "ufo_saucer") { countInArea++; } else if (area.players.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < 96)) { countInArea++; }
                }
            }

            if (countInArea < maxCount) {
                let spawnX, spawnZ;

                if (type === "ufo_saucer" && idlePlayerPos) {
                    // Spawn directly above the idle player
                    spawnX = idlePlayerPos.x;
                    spawnZ = idlePlayerPos.z;
                } else {
                    const randomPlayer = area.players[Math.floor(Math.random() * area.players.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 32 + 64 * Math.random() / 2;
                    spawnX = modWrap(randomPlayer.x + Math.cos(angle) * distance, MAP_SIZE);
                    spawnZ = modWrap(randomPlayer.z + Math.sin(angle) * distance, MAP_SIZE);
                }

                let spawnY = null;
                let waterSurfaceY = null;
                if (isAquaticMobType(type)) {
                    const spawnPlayer = area.players[Math.floor(Math.random() * area.players.length)];
                    const aquaticSpawn = nearestAquaticSpawnPosition(spawnPlayer.x, spawnPlayer.z, type);
                    if (!aquaticSpawn) continue;
                    spawnX = aquaticSpawn.x;
                    spawnZ = aquaticSpawn.z;
                    spawnY = aquaticSpawn.y;
                    waterSurfaceY = aquaticSpawn.surfaceY;
                } else if (isEliteMobType(type)) {
                    const eliteSpawn = getEliteSpawnPosition(type, area.players[Math.floor(Math.random() * area.players.length)]);
                    if (!eliteSpawn) continue;
                    spawnX = eliteSpawn.x;
                    spawnZ = eliteSpawn.z;
                    spawnY = eliteSpawn.y;
                    if (Number.isFinite(eliteSpawn.waterSurfaceY)) waterSurfaceY = eliteSpawn.waterSurfaceY;
                }
                const newMob = spawnMobAndBroadcast(type, spawnX, spawnZ, spawnY);
                if (waterSurfaceY !== null) newMob.waterSurfaceY = waterSurfaceY;
            }
        }
    }
}

// Creates a mob owned by this client, queues its first update and announces it to peers.
function spawnMobAndBroadcast(type, x, z, y = null) {
    const newMob = new Mob(x, z, Date.now() + Math.random(), type, y);
    newMob.spawner = userName;
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
        isAggressive: newMob.isAggressive,
        originSeed: newMob.originSeed
    });

    const spawnMsg = JSON.stringify({
        type: "mob_spawn",
        id: newMob.id,
        x: newMob.pos.x,
        y: newMob.pos.y,
        z: newMob.pos.z,
        hp: newMob.hp,
        mobType: newMob.type,
        isAggressive: newMob.isAggressive,
        originSeed: newMob.originSeed,
        world: worldName,
        username: userName
    });

    if (isHost || peers.size === 0) {
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
    const isLocalSpawner = (t.spawner === userName) || (isHost && !t.spawner) || peers.size === 0;
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
    const isLocalSpawner = (t.spawner === userName) || (isHost && !t.spawner) || peers.size === 0;
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
                const candidates = [{ name: userName, x: player.x, y: player.y, z: player.z }];
                for (const [name, pos] of Object.entries(userPositions)) {
                    if (pos.world === worldName && pos.targetX !== undefined) {
                        candidates.push({ name, x: pos.targetX, y: pos.targetY, z: pos.targetZ });
                    }
                }
                candidates.sort((a, b) => Math.hypot(a.x - t.pos.x, a.y - t.pos.y, a.z - t.pos.z) - Math.hypot(b.x - t.pos.x, b.y - t.pos.y, b.z - t.pos.z));
                target = candidates[0] || null;
                if (target && Math.hypot(target.x - t.pos.x, target.y - t.pos.y, target.z - t.pos.z) < 3 && now - t.attackCooldown > 1400) {
                    t.attackCooldown = now;
                    const peer = peers.get(target.name);
                    if (target.name !== userName && peer && peer.dc && peer.dc.readyState === "open") {
                        peer.dc.send(JSON.stringify({ type: "player_damage", damage: 2, attacker: "whale" }));
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
                        meal.die("whale");
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

            const nearbyPlayers = [{ name: userName, x: player.x, y: player.y, z: player.z }];
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
                    const peer = peers.get(nearestPlayer.name);
                    if (nearestPlayer.name !== userName && peer && peer.dc && peer.dc.readyState === "open") {
                        peer.dc.send(JSON.stringify({ type: "player_damage", damage: 1, attacker: "fish" }));
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
    const isLocalSpawner = (this.spawner === userName) || (isHost && !this.spawner) || peers.size === 0;

    if (!isLocalSpawner) {
    if ("crawley" === this.type && this.mesh.eyeLight) this.mesh.eyeLight.visible = isNight;
    if ("grub" === this.type && this.glowLight) {
        this.glowLight.intensity = isNight ? (Math.sin(.002 * Date.now()) + 1) / 2 * .8 + .4 : 0;
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
        this.lingerTime += t * 1000;

        const lights = this.mesh.children.filter(c => c.isPointLight);
        if (lights.length > 0) {
            const intensity = 5 + Math.sin(Date.now() * 0.01) * 5;
            lights.forEach(l => l.intensity = intensity);
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

        if (this.lingerTime > 300000) {
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
            if (this.pos.y > 800) {
                try {
                    scene.remove(this.mesh);
                    disposeObject(this.mesh);
                } catch (e) {}
                mobs = mobs.filter((t => t.id !== this.id));
                markMobRecentlyRemoved(this.id);
                const s = JSON.stringify({ type: "mob_despawn", id: this.id, world: worldName });
                for (const [peerName, peer] of peers.entries()) {
                    if (peerName !== userName && peer.dc && peer.dc.readyState === "open") {
                        peer.dc.send(s);
                    }
                }
                return;
            }
        } else {
            let targetPos = new THREE.Vector3(player.x, player.y, player.z);
            let highestScore = player.score;
            let foundIdlePlayer = false;

            const now = performance.now();
            const IDLE_THRESHOLD = 900000; // 15 minutes

            // Check if local player is idle
            let localIdle = false;
            if (typeof window !== 'undefined' && typeof window.lastMoveTime !== 'undefined') {
                if (now - window.lastMoveTime > IDLE_THRESHOLD) localIdle = true;
            } else if (typeof lastMoveTime !== 'undefined') {
                if (now - lastMoveTime > IDLE_THRESHOLD) localIdle = true;
            }

            if (localIdle) {
                foundIdlePlayer = true;
                targetPos.set(player.x, player.y, player.z);
            }

            for (const [peerName, pos] of Object.entries(userPositions)) {
                const peerMoveTime = pos.lastMoveTime || pos.lastUpdate || now;
                const isPeerIdle = (now - peerMoveTime > IDLE_THRESHOLD);

                if (isPeerIdle) {
                    // Prioritize idle players. If multiple, we just take the first we find or the current one.
                    targetPos.set(pos.targetX || pos.prevX, pos.targetY || pos.prevY, pos.targetZ || pos.prevZ);
                    foundIdlePlayer = true;
                    break;
                } else if (!foundIdlePlayer && pos.score !== undefined && pos.score > highestScore) {
                    // Fallback to highest score if no idle player found yet
                    highestScore = pos.score;
                    targetPos.set(pos.targetX || pos.prevX, pos.targetY || pos.prevY, pos.targetZ || pos.prevZ);
                }
            }

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
                this.pos.y -= 2.5 * t; // Slower altitude adjustment
            } else if (this.pos.y < targetY) {
                this.pos.y += 2.5 * t;
            }

            // Smoothly rotate towards the target
            const targetRotation = Math.atan2(dx, dz);
            // Angle difference clamping to make the massive ship turn slowly
            let angleDiff = targetRotation - this.mesh.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.mesh.rotation.y += angleDiff * 0.25 * t; // Slower rotation

            this.attackCooldown -= t;
            if (this.attackCooldown <= 0 && dist < 60) { // Closer distance required to shoot
                if (typeof createProjectile === "function" && (typeof isHost === "undefined" || isHost || peers.size === 0)) {
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

                        createProjectile(pid, this.id, pPos, laserDir.clone(), "blue");

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
        this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    } else {
        if (this.pos.x += this.vx * t, this.pos.z += this.vz * t, this.vx *= 1 - 2 * t, this.vz *= 1 - 2 * t, "spider" === this.type) {
            let ceilingY = chunkManager.getCeilingY(this.pos.x, this.pos.z, this.pos.y) - 0.5;

            // Safe access to player
            let pExists = typeof player !== 'undefined' && player !== null;
            if (pExists && this.aiState !== "FALLING") {
                let playerDist = Math.hypot(this.pos.x - player.x, this.pos.z - player.z);
                if (playerDist < 2.0 && this.pos.y > player.y + 1) {
                    this.aiState = "FALLING";
                }
            }

            if (this.aiState === "FALLING") {
                this.pos.y -= 16 * t; // Fall down
                let floorY = chunkManager.getFloorY(this.pos.x, this.pos.z, this.pos.y + 16 * t);

                // Check if we hit the player
                if (pExists) {
                    let playerDistXZ = Math.hypot(this.pos.x - player.x, this.pos.z - player.z);
                    if (playerDistXZ < 1.5) {
                        let playerTopY = player.y + 1.6;
                        if (this.pos.y <= playerTopY && this.pos.y > player.y) {
                            this.pos.y = playerTopY;
                            this.aiState = "ATTACKING_PLAYER";
                            this.attackLinger = 0;

                            // Deal drop damage
                            this.lastEatTime = this.lastEatTime || 0;
                            if (Date.now() - this.lastEatTime > 1000) {
                                player.health = Math.max(0, player.health - 2);
                                document.getElementById("health").innerText = player.health;
                                if (typeof updateHealthBar === 'function') updateHealthBar();
                                addMessage("Spider dropped on you! HP: " + player.health, 1000);
                                if (player.health <= 0 && typeof handlePlayerDeath === 'function') handlePlayerDeath();
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
                    this.pos.x = player.x;
                    this.pos.z = player.z;
                    this.pos.y = player.y + 1.6;

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
            let t = null,
                e = 1 / 0,
                s = Math.hypot(player.x - this.pos.x, player.y - this.pos.y, player.z - this.pos.z);
            s < e && Math.abs(player.y - this.pos.y) < 30 && (e = s, t = {
                x: player.x,
                z: player.z,
                health: player.health,
                username: userName
            });
            for (const [peerName, peerData] of peers.entries())
                if (userPositions[peerName] && userPositions[peerName].world === worldName) {
                    const pos = userPositions[peerName],
                        o = Math.hypot(pos.targetX - this.pos.x, pos.targetY - this.pos.y, pos.targetZ - this.pos.z);
                    o < e && Math.abs(pos.targetY - this.pos.y) < 30 && (e = o, t = {
                        x: pos.targetX,
                        z: pos.targetZ,
                        health: pos.health || 20,
                        username: peerName
                    })
                } if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 2.5 && Date.now() - this.attackCooldown > 800)) {
                this.attackCooldown = Date.now();
                const e = peers.get(t.username);
                e && e.dc && "open" === e.dc.readyState ? e.dc.send(JSON.stringify({
                    type: "player_damage",
                    damage: 1,
                    attacker: "mob"
                })) : t.username === userName && Date.now() - lastDamageTime > 800 && (player.health = Math.max(0, player.health - 1), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit! HP: " + player.health, 1e3), player.health <= 0 && handlePlayerDeath())
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
            let t = null,
                e = 1 / 0,
                s = Math.hypot(player.x - this.pos.x, player.y - this.pos.y, player.z - this.pos.z);
            s < e && Math.abs(player.y - this.pos.y) < 30 && (e = s, t = {
                x: player.x,
                z: player.z,
                health: player.health,
                username: userName
            });
            for (const [peerName, peerData] of peers.entries())
                if (userPositions[peerName] && userPositions[peerName].world === worldName) {
                    const pos = userPositions[peerName],
                        o = Math.hypot(pos.targetX - this.pos.x, pos.targetY - this.pos.y, pos.targetZ - this.pos.z);
                    o < e && Math.abs(pos.targetY - this.pos.y) < 30 && (e = o, t = {
                        x: pos.targetX,
                        z: pos.targetZ,
                        health: pos.health || 20,
                        username: peerName
                    })
                } if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 2.5 && Date.now() - this.attackCooldown > 800)) {
                this.attackCooldown = Date.now();
                const e = peers.get(t.username);
                e && e.dc && "open" === e.dc.readyState ? e.dc.send(JSON.stringify({
                    type: "player_damage",
                    damage: 1,
                    attacker: "mob"
                })) : t.username === userName && Date.now() - lastDamageTime > 800 && (player.health = Math.max(0, player.health - 1), lastDamageTime = Date.now(), document.getElementById("health").innerText = player.health, updateHealthBar(), addMessage("Hit! HP: " + player.health, 1e3), player.health <= 0 && handlePlayerDeath())
            }
        }
        let h = !1;
        if (i && o > .01) {
            const e = i.x - this.pos.x,
                s = i.z - this.pos.z,
                a = e / o * this.speed,
                n = s / o * this.speed,
                r = modWrap(this.pos.x + a * t * 60, MAP_SIZE),
                l = modWrap(this.pos.z + n * t * 60, MAP_SIZE);
            if ("grub" === this.type || "crawley" === this.type) {
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
            if ("crawley" === this.type) {
                if (!this.nextWanderChange || Date.now() > this.nextWanderChange) {
                    this.nextWanderChange = Date.now() + 2000 + Math.random() * 3000;
                    if (Math.random() < 0.3) {
                        this.wanderDir = new THREE.Vector3(0, 0, 0); // pause
                    } else {
                        const angle = Math.random() * Math.PI * 2;
                        this.wanderDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
                    }
                }
                const e = 0.5 * this.speed;
                s = this.pos.x + (this.wanderDir ? this.wanderDir.x : 0) * e * t * 60;
                i = this.pos.z + (this.wanderDir ? this.wanderDir.z : 0) * e * t * 60;
            } else {
                const e = .5 * this.speed;
                s = modWrap(this.pos.x + Math.sin(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE);
                i = modWrap(this.pos.z + Math.cos(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE);
            }
            if ("grub" === this.type || "crawley" === this.type) {
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
                if ("crawley" === this.type && this.wanderDir && this.wanderDir.lengthSq() > 0) {
                    h = !0;
                } else if ("crawley" !== this.type) {
                    h = !0;
                }
            }
        }
        if (this.isMoving = h, "grub" === this.type && i) {
            const t = (new THREE.Vector3).subVectors(new THREE.Vector3(i.x, this.pos.y, i.z), this.pos).normalize(),
                e = Math.atan2(t.x, t.z);
            this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05)
        } else if (this.isMoving && "crawley" === this.type && this.wanderDir && this.wanderDir.lengthSq() > 0 && !i) {
            // Point the crawley in the direction of its wanderDir
            const t = this.wanderDir.clone().normalize();
            const e = Math.atan2(t.x, t.z);
            this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05);
        } else if (this.isMoving && "crawley" === this.type && i && typeof o !== 'undefined' && o > 0.01) {
            // Point towards the target when seeking
            const targetVec = new THREE.Vector3(i.x - this.pos.x, 0, i.z - this.pos.z).normalize();
            if (targetVec.lengthSq() > 0) {
                 const e = Math.atan2(targetVec.x, targetVec.z);
                 this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05);
            }
        }
        this.mesh.position.set(this.pos.x, this.pos.y + ("crawley" === this.type ? 0.45 : 0), this.pos.z);
        const a = this.pos.distanceTo(this.lastSentPos) > .1,
            n = this.mesh.quaternion.angleTo(this.lastSentQuaternion) > .01;
        if (a || n) {
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
                isAggressive: this.isAggressive
            });
            this.lastSentPos.copy(this.pos), this.lastSentQuaternion.copy(this.mesh.quaternion)
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
    const isLocalSpawner = (this.spawner === userName) || (isHost && !this.spawner) || peers.size === 0;
    if (!isLocalSpawner) return;
    if (this.type === "whale") {
        this.wasAttacked = true;
        this.isAggressive = true;
    }
    this.hp -= t, this.flashEnd = Date.now() + 200, this.lastDamageTime = Date.now(), safePlayAudioAt(soundHit, this.pos);
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
            flash: !0,
            type: this.type,
            isMoving: this.isMoving,
            aiState: this.aiState,
            isAggressive: this.isAggressive,
            wasAttacked: this.wasAttacked,
            quaternion: this.mesh.quaternion.toArray()
        });
    }
}, Mob.prototype.die = function (t) {
    const isLocalSpawner = (this.spawner === userName) || (isHost && !this.spawner) || peers.size === 0;
    if (!isLocalSpawner) return;

    if (this.type === "ufo_saucer") {
        if (!window.activeExplosions) window.activeExplosions = [];
        const geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        for (let i = 0; i < 60; i++) {
            const particle = new THREE.Mesh(geom, mat);
            particle.position.copy(this.pos);
            particle.position.x += (Math.random() - 0.5) * 16;
            particle.position.y += (Math.random() - 0.5) * 16;
            particle.position.z += (Math.random() - 0.5) * 16;
            scene.add(particle);
            window.activeExplosions.push({
                mesh: particle,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.25, Math.random() * 0.2, (Math.random() - 0.5) * 0.25),
                createdAt: performance.now()
            });
        }
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
    mobs = mobs.filter((t => t.id !== this.id)), markMobRecentlyRemoved(this.id), addMessage("Mob defeated!");
    const isFish = this.type === "fish_rare" || this.type === "fish_school";
    if (isFish && t !== "whale") {
        const fishItemId = this.type === "fish_rare" ? 137 : 138;
        if (t === userName) {
            addToInventory(fishItemId, 1, this.originSeed);
            addMessage(`Caught ${BLOCKS[fishItemId].name} from ${this.originSeed}!`, 2500);
        } else if (t) {
            const peer = peers.get(t);
            if (peer && peer.dc && peer.dc.readyState === "open") {
                peer.dc.send(JSON.stringify({
                    type: "add_to_inventory",
                    blockId: fishItemId,
                    count: 1,
                    originSeed: this.originSeed
                }));
            }
        }
    }
    let e = 10;
    if ("ufo_saucer" === this.type) {
        e = 1000;
        if (Math.random() < (1/3)) {
            if (typeof window.createDroppedItemOrb === 'function') {
                window.createDroppedItemOrb(`${userName}-${Date.now()}-ufo-drop`, this.pos.clone(), 133, worldSeed, userName, 1);
            }
        }
    } else if (isEliteMobType(this.type)) {
        e = getEliteMobDef(this.type).score;
        onEliteMobDeath(this, t);
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
    } else {
        const s = peers.get(t);
        if (s && s.dc && "open" === s.dc.readyState) {
            s.dc.send(JSON.stringify({
                type: "add_score",
                amount: e
            }));
        }
    }
    const s = JSON.stringify({
        type: "mob_kill",
        id: this.id,
        world: worldName
    });
    for (const [t, e] of peers.entries()) t !== userName && e.dc && "open" === e.dc.readyState && e.dc.send(s)

};
