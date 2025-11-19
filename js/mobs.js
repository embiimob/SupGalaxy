function Mob(t, e, s, i = "crawley", originSeed = null) {
    this.lastDamageTime = 0, this.lastRegenTime = 0;
    if (this.id = s || Date.now(), this.type = i, this.originSeed = originSeed || worldSeed, this.pos = new THREE.Vector3(t, chunkManager.getSurfaceY(t, e) + 1, e), this.prevPos = new THREE.Vector3().copy(this.pos), this.targetPos = (new THREE.Vector3).copy(this.pos), this.prevQuaternion = new THREE.Quaternion(), this.targetQuaternion = new THREE.Quaternion, this.lastQuaternionUpdate = 0, this.lastUpdateTime = 0, this.vx = 0, this.vz = 0, this.hp = 10, this.speed = "bee" === this.type ? .04 + .02 * Math.random() : .02 + .03 * Math.random(), this.attackCooldown = 0, this.flashEnd = 0, this.aiState = "bee" === this.type ? "SEARCHING_FOR_FLOWER" : "IDLE", this.hasPollen = !1, this.lingerTime = 0, this.animationTime = Math.random() * Math.PI * 2, this.isMoving = !1, "bee" === this.type) {
        const t = makeSeededRandom(worldSeed + "_bee_aggro")();
        this.isAggressive = t > .5
    } else if ("fish" === this.type) {
        this.isAggressive = makeSeededRandom(this.originSeed + "_fish_aggro")() > .5, this.speed = .01 + .02 * Math.random(), this.pos.y = SEA_LEVEL - 2
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
    } else if ("grub" === this.type) {
        this.hp = 40, this.speed = (.01 + .005 * Math.random()) / 2, this.aiState = "IDLE", this.animationTime = Math.random() * Math.PI * 2, this.cactusEaten = 0, this.isAggressive = !1;
        const t = 3,
            e = createMobTexture(worldSeed, "grub_body"),
            s = createMobTexture(worldSeed, "grub_body", !0),
            i = createMobTexture(worldSeed, "grub_mouth"),
            o = new THREE.MeshStandardMaterial({
                map: e
            }),
            h = new THREE.MeshStandardMaterial({
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
            y = new THREE.MeshStandardMaterial({
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
        const T = new THREE.MeshStandardMaterial({
            color: 16711680
        });
        this.redMaterials = Array(a.length).fill(T)
    } else if ("fish" === this.type) {
        this.mesh = new THREE.Group, this.hp = 10;
        const random = makeSeededRandom(this.originSeed + "_fish_" + this.id);
        const bodyColor = new THREE.Color().setHSL(random(), .5 + .4 * random(), .5 + .3 * random());
        const finColor = new THREE.Color().setHSL(random(), .5 + .4 * random(), .3 + .3 * random());
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            transparent: !0,
            opacity: .8
        });
        const finMaterial = new THREE.MeshStandardMaterial({
            color: finColor,
            transparent: !0,
            opacity: .8
        });
        this.originalColor = bodyColor;
        const bodyWidth = .5 + .8 * random();
        const bodyHeight = .2 + .3 * random();
        const bodyLength = .3 + .4 * random();
        const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.add(bodyMesh);
        const tailGeometry = new THREE.BoxGeometry(.1, bodyHeight, bodyLength * (.5 + .5 * random()));
        const tailMesh = new THREE.Mesh(tailGeometry, finMaterial);
        tailMesh.position.set(bodyWidth / 2, 0, 0), this.mesh.add(tailMesh);
        const topFinGeometry = new THREE.BoxGeometry(bodyWidth * (.2 + .3 * random()), .1, bodyLength * (.2 + .3 * random()));
        const topFinMesh = new THREE.Mesh(topFinGeometry, finMaterial);
        topFinMesh.position.set(0, bodyHeight / 2, 0), this.mesh.add(topFinMesh)
    }
    this.mesh.userData.mobId = this.id, this.mesh.position.copy(this.pos), scene.add(this.mesh), this.lastSentPos = new THREE.Vector3().copy(this.pos), this.lastSentQuaternion = new THREE.Quaternion().copy(this.mesh.quaternion)
}

function manageMobs() {
    if (!worldArchetype) return;
    if (!isHost && peers.size > 0) return;
    if (Date.now() - lastMobManagement < 5e3) return;
    lastMobManagement = Date.now();
    const t = [{
        x: player.x,
        y: player.y,
        z: player.z
    }];
    for (const e of Object.values(userPositions)) e.targetX && t.push({
        x: e.targetX,
        y: e.targetY,
        z: e.targetZ
    });
    const e = isNight ? worldArchetype.mobSpawnRules.night : worldArchetype.mobSpawnRules.day;
    mobs = mobs.filter((s => {
        const i = t.some((t => Math.hypot(s.pos.x - t.x, s.pos.z - t.z) < 96)),
            o = e.includes(s.type);
        if (!i || !o) {
            scene.remove(s.mesh), disposeObject(s.mesh);
            const t = JSON.stringify({
                type: "mob_despawn",
                id: s.id
            });
            for (const [e, s] of peers.entries()) e !== userName && s.dc && "open" === s.dc.readyState && s.dc.send(t);
            return !1
        }
        return !0
    }));
    for (const s of e) {
        let e;
        if ("crawley" === s) e = 10;
        else if ("bee" === s) e = 8;
        else {
            if ("grub" !== s) continue;
            e = 2
        }
        if (mobs.filter((t => t.type === s)).length < e) {
            const e = t[Math.floor(Math.random() * t.length)],
                i = Math.random() * Math.PI * 2,
                o = 32 + 64 * Math.random() / 2,
                h = new Mob(modWrap(e.x + Math.cos(i) * o, MAP_SIZE), modWrap(e.z + Math.sin(i) * o, MAP_SIZE), Date.now() + Math.random(), s);
            mobs.push(h);
            const a = JSON.stringify({
                type: "mob_spawn",
                id: h.id,
                x: h.pos.x,
                y: h.pos.y,
                z: h.pos.z,
                hp: h.hp,
                mobType: h.type,
                isAggressive: h.isAggressive
            });
            for (const [t, e] of peers.entries()) t !== userName && e.dc && "open" === e.dc.readyState && e.dc.send(a)
        }
    }
    if (mobs.filter((t => "fish" === t.type)).length < 15 * (makeSeededRandom(worldSeed + "_fish_rarity")() + .1)) {
        const e = t[0],
            s = Math.random() * Math.PI * 2,
            i = 4 + 20 * Math.random(),
            o = modWrap(e.x + Math.cos(s) * i, MAP_SIZE),
            h = modWrap(e.z + Math.sin(s) * i, MAP_SIZE);
        chunkManager.getSurfaceY(o, h) < SEA_LEVEL && mobs.push(new Mob(o, h, Date.now() + Math.random(), "fish"))
    }
}

function handleMobHit(t) {
    if (isHost || 0 === peers.size) t.hurt(4, userName);
    else
        for (const [e, s] of peers.entries()) s.dc && "open" === s.dc.readyState && (console.log(`[WebRTC] Sending mob_hit to host ${e}`), s.dc.send(JSON.stringify({
            type: "mob_hit",
            id: t.id,
            damage: 4,
            username: userName
        })));
    safePlayAudio(soundHit), addMessage("Hit mob!", 800)
}
Mob.prototype.update = function (t) {
    if (peers.size > 0 && !isHost && this.mesh.position.copy(this.pos), "bee" === this.type && (this.mesh.leftWing.rotation.z = .5 * Math.sin(.05 * Date.now()), this.mesh.rightWing.rotation.z = .5 * -Math.sin(.05 * Date.now())), "crawley" === this.type && this.mesh.eyeLight && (this.mesh.eyeLight.visible = isNight), "grub" === this.type && this.glowLight && (isNight ? this.glowLight.intensity = (Math.sin(.002 * Date.now()) + 1) / 2 * .8 + .4 : this.glowLight.intensity = 0), !isHost && peers.size > 0) {
        if (this.lastUpdateTime > 0) {
            const t = performance.now(),
                e = t - this.lastUpdateTime;
            let s = Math.min(1, e / 300);
            s = isNaN(s) ? 1 : s;
            if (this.pos.copy(this.prevPos).lerp(this.targetPos, s), this.mesh.position.copy(this.pos), this.lastQuaternionUpdate > 0) {
                const e = t - this.lastQuaternionUpdate;
                let s = Math.min(1, e / 300);
                s = isNaN(s) ? 1 : s, this.mesh.quaternion.copy(this.prevQuaternion).slerp(this.targetQuaternion, s)
            }
        } else this.pos.copy(this.targetPos), this.mesh.position.copy(this.pos);
        Date.now() < this.flashEnd ? "grub" === this.type ? this.segments.forEach((t => {
            t.material = this.redMaterials
        })) : this.mesh.material ? this.mesh.material.color.set(16711680) : this.mesh.children[0].material.color.set(16711680) : "grub" === this.type ? this.segments.forEach((t => {
            const e = t.userData.originalMaterial;
            e && (t.material = e)
        })) : this.originalColor && (this.mesh.material ? this.mesh.material.color.copy(this.originalColor) : this.mesh.children[0].material.color.copy(this.originalColor))
    } else {
        if (this.pos.x += this.vx * t, this.pos.z += this.vz * t, this.vx *= 1 - 2 * t, this.vz *= 1 - 2 * t, "crawley" === this.type) {
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
                } let e = chunkManager.getSurfaceY(this.pos.x, this.pos.z) + .5;
            for (const t of mobs)
                if (t.id !== this.id && "crawley" === t.type) {
                    Math.hypot(this.pos.x - t.pos.x, this.pos.z - t.pos.z) < .9 && t.pos.y < this.pos.y && (e = Math.max(e, t.pos.y + .9))
                } this.pos.y > e ? this.pos.y = Math.max(e, this.pos.y - 16 * t) : this.pos.y = e
        } else if ("fish" === this.type) {
            const e = .2 * Math.sin(.002 * Date.now()) * t * 60;
            this.pos.y += e;
            const s = getBlockAt(this.pos.x, this.pos.y, this.pos.z);
            6 !== s && this.pos.y > SEA_LEVEL - 4 && (this.pos.y -= 2 * e), this.pos.y < 1 && (this.pos.y = 1)
        }
        let e = new THREE.Vector3(0, 0, 0),
            s = !1;
        if (this.isAggressive && "fish" === this.type) {
            let t = null,
                e = 1 / 0;
            const s = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
            s < e && (e = s, t = {
                x: player.x,
                z: player.z
            });
            let i = t,
                o = e
        } else if ("crawley" === this.type) {
            const i = 8;
            let o = 1 / 0;
            for (const t of torchRegistry.values()) {
                const h = this.pos.distanceTo(t);
                h < i && h < o && (o = h, e.subVectors(this.pos, t).normalize(), s = !0)
            }
            if (s) {
                const s = 2.5 * this.speed;
                return this.pos.x += e.x * s * t * 60, this.pos.z += e.z * s * t * 60, void this.mesh.position.copy(this.pos)
            }
        }
        let i = null,
            o = 1 / 0;
        if ("grub" === this.type) {
            if ("IDLE" === this.aiState || "SEARCHING_FOR_CACTUS" === this.aiState) {
                this.aiState = "SEARCHING_FOR_CACTUS";
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
                s = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
            s < e && (e = s, t = {
                x: player.x,
                z: player.z,
                health: player.health,
                username: userName
            });
            for (const [s, i] of peers.entries())
                if (userPositions[s]) {
                    const i = userPositions[s],
                        o = Math.hypot(i.x - this.pos.x, i.z - this.pos.z);
                    o < e && (e = o, t = {
                        x: i.x,
                        z: i.z,
                        health: 20,
                        username: s
                    })
                } if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 1.2 && Date.now() - this.attackCooldown > 800)) {
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
            const t = 16;
            let e = null,
                s = null,
                h = 1 / 0,
                a = 1 / 0;
            for (let i = -t; i <= t; i++)
                for (let o = -t; o <= t; o++)
                    for (let t = -4; t <= 4; t++) {
                        const n = Math.floor(this.pos.x + i),
                            r = Math.floor(this.pos.y + t),
                            l = Math.floor(this.pos.z + o),
                            p = getBlockAt(n, r, l);
                        if (123 === p) {
                            const t = this.pos.distanceTo(new THREE.Vector3(n + .5, r + .5, l + .5));
                            t < h && (h = t, e = {
                                x: n,
                                y: r,
                                z: l,
                                id: p
                            })
                        } else if (122 === p) {
                            const t = this.pos.distanceTo(new THREE.Vector3(n + .5, r + .5, l + .5));
                            t < a && (a = t, s = {
                                x: n,
                                y: r,
                                z: l,
                                id: p
                            })
                        }
                    }
            if (e ? (i = e, o = h) : s && (i = s, o = a), i && o < 1.5) {
                if (0 === this.lingerTime) this.lingerTime = Date.now();
                else if (Date.now() - this.lingerTime > 2e3) {
                    Math.hypot(player.x - i.x, player.y - i.y, player.z - i.z) < maxAudioDistance && safePlayAudio(soundBreak), chunkManager.setBlockGlobal(i.x, i.y, i.z, 0), setTimeout((() => checkAndDeactivateHive(i.x, i.y, i.z)), 100), i = null, this.lingerTime = 0
                }
            } else this.lingerTime = 0
        }
        if ("bee" === this.type) {
            const avoidanceVector = new THREE.Vector3();
            const avoidanceRadius = 2;
            for (let x = -avoidanceRadius; x <= avoidanceRadius; x++) {
                for (let y = -avoidanceRadius; y <= avoidanceRadius; y++) {
                    for (let z = -avoidanceRadius; z <= avoidanceRadius; z++) {
                        const blockId = getBlockAt(Math.floor(this.pos.x + x), Math.floor(this.pos.y + y), Math.floor(this.pos.z + z));
                        if (blockId === 3 || blockId === 4) { // Dirt or Stone
                            const vec = new THREE.Vector3(x, y, z);
                            const dist = vec.length();
                            if (dist > 0) {
                                avoidanceVector.add(vec.normalize().multiplyScalar(-1 / dist));
                            }
                        }
                    }
                }
            }
            if (avoidanceVector.length() > 0) {
                avoidanceVector.normalize();
                this.pos.add(avoidanceVector.multiplyScalar(this.speed * t * 60 * 0.5));
            }
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
                        this.pos.y += 0.1 * (chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 2 - this.pos.y);

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

                    if (i) {
                        this.pos.y += 0.1 * (chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 8 - this.pos.y);
                    }
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
        if (this.isAggressive || !i) {
            let t = null,
                e = 1 / 0,
                s = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
            s < e && (e = s, t = {
                x: player.x,
                z: player.z,
                health: player.health,
                username: userName
            });
            for (const [s, i] of peers.entries())
                if (userPositions[s]) {
                    const i = userPositions[s],
                        o = Math.hypot(i.x - this.pos.x, i.z - this.pos.z);
                    o < e && (e = o, t = {
                        x: i.x,
                        z: i.z,
                        health: 20,
                        username: s
                    })
                } if (t && e < 10 && (i = {
                    x: t.x,
                    z: t.z
                }, o = e, e < 1.2 && Date.now() - this.attackCooldown > 800)) {
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
            if ("crawley" === this.type) {
                const t = chunkManager.getSurfaceY(r, l);
                t > this.pos.y && t <= this.pos.y + 1 && (this.pos.y = t + .5)
            }
            if ("grub" === this.type || "crawley" === this.type) {
                const t = chunkManager.getSurfaceY(r, l);
                t > this.pos.y && t <= this.pos.y + 1.2 && (this.pos.y = t + .5)
            }
            if ("fish" === this.type) {
                6 === getBlockAt(r, this.pos.y, l) && (this.pos.x = r, this.pos.z = l, h = !0)
            } else checkCollisionWithBlock(r, this.pos.y, l) || (this.pos.x = r, this.pos.z = l, h = !0)
        } else {
            const e = .5 * this.speed,
                s = modWrap(this.pos.x + Math.sin(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE),
                i = modWrap(this.pos.z + Math.cos(.001 * Date.now() + this.mesh.id) * e * t * 60, MAP_SIZE);
            if ("grub" === this.type || "crawley" === this.type) {
                const t = chunkManager.getSurfaceY(s, i);
                t > this.pos.y && t <= this.pos.y + 1.2 && (this.pos.y = t + .5)
            }
            checkCollisionWithBlock(s, this.pos.y, i) || (this.pos.x = s, this.pos.z = i, h = !0)
        }
        if (this.isMoving = h, "grub" === this.type && i) {
            const t = (new THREE.Vector3).subVectors(new THREE.Vector3(i.x, this.pos.y, i.z), this.pos).normalize(),
                e = Math.atan2(t.x, t.z);
            this.mesh.quaternion.slerp((new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3(0, 1, 0), e), .05)
        }
        this.mesh.position.copy(this.pos);
        const a = this.pos.distanceTo(this.lastSentPos) > .1,
            n = this.mesh.quaternion.angleTo(this.lastSentQuaternion) > .01;
        if (a || n) {
            const t = {
                type: "mob_update",
                id: this.id,
                x: this.pos.x,
                y: this.pos.y,
                z: this.pos.z,
                quaternion: this.mesh.quaternion.toArray(),
                isMoving: h,
                aiState: this.aiState,
                mobType: this.type
            };
            for (const [e, s] of peers.entries()) {
                const i = userPositions[e] ? userPositions[e].world : worldName;
                e !== userName && s.dc && "open" === s.dc.readyState && i === worldName && s.dc.send(JSON.stringify(t))
            }
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
    } else "crawley" === this.type && this.mesh.legs && (this.isMoving ? (this.animationTime += 15 * t, this.mesh.position.y += .05 * Math.sin(2 * this.animationTime), this.mesh.legs.forEach(((t, e) => {
        const s = e % 2 == 0 ? 1 : -1;
        t.rotation.x = Math.sin(this.animationTime + Math.floor(e / 2) * Math.PI / 3) * s * .8
    }))) : this.mesh.legs.forEach((t => {
        t.rotation.x = 0
    })))
}, Mob.prototype.hurt = function (t, e) {
    if (!isHost && peers.size > 0) return;
    this.hp -= t, this.flashEnd = Date.now() + 200, this.lastDamageTime = Date.now(), safePlayAudio(soundHit);
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
        const t = JSON.stringify({
            type: "mob_update",
            id: this.id,
            x: this.pos.x,
            y: this.pos.y,
            z: this.pos.z,
            hp: this.hp,
            flash: !0,
            mobType: this.type
        });
        for (const [e, s] of peers.entries()) e !== userName && s.dc && "open" === s.dc.readyState && s.dc.send(t)
    }
}, Mob.prototype.die = function (t) {
    if (!isHost && peers.size > 0) return;
    try {
        scene.remove(this.mesh), disposeObject(this.mesh)
    } catch (t) { }
    mobs = mobs.filter((t => t.id !== this.id)), addMessage("Mob defeated!");
    let e = 10;
    if ("red" === this.eyeColor ? e = 20 : "blue" === this.eyeColor && (e = 30), t === userName) player.score += e, document.getElementById("score").innerText = player.score, addMessage(`+${e} score`), safePlayAudio(soundHit);
    else {
        const s = peers.get(t);
        s && s.dc && "open" === s.dc.readyState && s.dc.send(JSON.stringify({
            type: "add_score",
            amount: e
        }))
    }
    const s = JSON.stringify({
        type: "mob_kill",
        id: this.id
    });
    for (const [t, e] of peers.entries()) t !== userName && e.dc && "open" === e.dc.readyState && e.dc.send(s)
    "fish" === this.type && createDroppedItemOrb(Date.now(), this.pos, 128, this.originSeed, null)
};
