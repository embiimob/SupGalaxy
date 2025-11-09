
var mobs = [];
var lastMobBatchTime = 0;
var lastMobManagement = 0;
function createMobTexture(seed, partName, striped = false) {
            const cacheKey = `${seed}:${partName}:${striped}`;
            if (textureCache.has(cacheKey)) {
                return textureCache.get(cacheKey);
            }

            const size = 16;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            const rnd = makeSeededRandom(seed + '_mob_texture_' + partName);

            let baseColor, secondaryColor;
            if (partName.includes('body')) {
                baseColor = new THREE.Color().setHSL(rnd(), 0.2 + rnd() * 0.8, 0.2 + rnd() * 0.6);
                secondaryColor = baseColor.clone().multiplyScalar(0.7 + rnd() * 0.2);
            } else { // Mouth/Pinchers
                baseColor = new THREE.Color().setHSL(rnd() * 0.1 + 0.05, 0.2 + rnd() * 0.2, 0.2 + rnd() * 0.1); // Darker
                secondaryColor = baseColor.clone().multiplyScalar(1.2 + rnd() * 0.2);
            }

            context.fillStyle = baseColor.getStyle();
            context.fillRect(0, 0, size, size);

            const patternNoise = makeNoise(seed + '_mob_pattern_' + partName);
            for (let i = 0; i < 50; i++) {
                const x = Math.floor(rnd() * size);
                const y = Math.floor(rnd() * size);
                const noiseVal = patternNoise(x / size, y / size);
                const color = (noiseVal > 0.5) ? secondaryColor : baseColor.clone().lerp(secondaryColor, 0.5);
                context.fillStyle = color.getStyle();
                context.fillRect(x, y, 1, 1);
            }

            if (striped) {
                const borderColor = new THREE.Color().setHSL(rnd(), 0.5 + rnd() * 0.3, 0.2 + rnd() * 0.2);
                context.fillStyle = borderColor.getStyle();
                context.fillRect(0, 0, size, 1); // Top
                context.fillRect(0, size - 1, size, 1); // Bottom
                context.fillRect(0, 0, 1, size); // Left
                context.fillRect(size - 1, 0, 1, size); // Right
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            textureCache.set(cacheKey, texture);
            return texture;
        }
function Mob(x, z, id, type = 'crawley') {
            this.id = id || Date.now();
            this.type = type;
            this.pos = new THREE.Vector3(x, chunkManager.getSurfaceY(x, z) + 1, z);
            this.targetPos = new THREE.Vector3().copy(this.pos);
            this.targetQuaternion = new THREE.Quaternion();
            this.lastQuaternionUpdate = 0;
            this.lastUpdateTime = 0;
            this.vx = 0;
            this.vz = 0;
            this.hp = 10; // Default for bees
            this.speed = (this.type === 'bee') ? 0.04 + Math.random() * 0.02 : 0.02 + Math.random() * 0.03;
            this.attackCooldown = 0;
            this.flashEnd = 0;
            this.aiState = (this.type === 'bee') ? 'SEARCHING_FOR_FLOWER' : 'IDLE';
            this.hasPollen = false;
            this.lingerTime = 0;
            this.animationTime = Math.random() * Math.PI * 2;
            this.isMoving = false;

            if (this.type === 'bee') {
                const worldBeeAggressionFactor = makeSeededRandom(worldSeed + '_bee_aggro')();
                this.isAggressive = worldBeeAggressionFactor > 0.5;
            } else { // crawley
                const worldCrawleyAggressionFactor = makeSeededRandom(worldSeed + '_crawley_aggro')();
                this.isAggressive = worldCrawleyAggressionFactor > 0.5;
            }

            if (this.type === 'bee') {
                this.mesh = new THREE.Group();
                const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                const wingMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });

                const bodyGeo = new THREE.BoxGeometry(0.6, 0.6, 1);
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                this.mesh.add(body);

                const wingGeo = new THREE.BoxGeometry(0.8, 0.1, 0.4);
                const leftWing = new THREE.Mesh(wingGeo, wingMat);
                leftWing.position.set(-0.5, 0.2, 0);
                this.mesh.add(leftWing);

                const rightWing = new THREE.Mesh(wingGeo, wingMat);
                rightWing.position.set(0.5, 0.2, 0);
                this.mesh.add(rightWing);

                this.mesh.leftWing = leftWing;
                this.mesh.rightWing = rightWing;

                this.originalColor = new THREE.Color(0xffff00);
            } else if (this.type === 'crawley') {
                this.mesh = new THREE.Group();
                const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });

                const eyeColorRnd = makeSeededRandom(worldSeed + '_eye_color_' + this.id)();
                let eyeColor;
                if (eyeColorRnd < 0.1) { // 10% chance for blue
                    eyeColor = 0x0000ff;
                    this.eyeColor = 'blue';
                    this.hp = 15;
                } else if (eyeColorRnd < 0.5) { // 40% chance for green
                    eyeColor = 0x00ff00;
                    this.eyeColor = 'green';
                    this.hp = 5;
                } else { // 50% chance for red
                    eyeColor = 0xff0000;
                    this.eyeColor = 'red';
                    this.hp = 10;
                }
                const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });


                const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                this.mesh.add(body);

                const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);

                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-0.25, 0.2, -0.45);
                this.mesh.add(leftEye);

                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(0.25, 0.2, -0.45);
                this.mesh.add(rightEye);

                const eyeLight = new THREE.PointLight(0xff0000, 1, 5);
                eyeLight.position.set(0, 0.2, -0.5);
                this.mesh.add(eyeLight);
                this.mesh.eyeLight = eyeLight;

                this.mesh.legs = [];
                const legGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
                for (let i = 0; i < 6; i++) {
                    const leg = new THREE.Mesh(legGeo, bodyMat);
                    const side = (i % 2 === 0) ? 1 : -1;
                    leg.position.set(side * 0.45, 0, (Math.floor(i / 2) - 1) * 0.3);
                    this.mesh.add(leg);
                    this.mesh.legs.push(leg);
                }

                this.originalColor = new THREE.Color(0x4a4a4a);
            } else if (this.type === 'grub') {
                this.hp = 20;
                this.speed = (0.01 + Math.random() * 0.005) / 2; // Slower movement, halved
                this.aiState = 'IDLE';
                this.animationTime = Math.random() * Math.PI * 2;
                this.cactusEaten = 0;
                this.isAggressive = false; // Grubs are not aggressive

                const scale = 3; // Scale factor for the grub size

                const bodyTexture = createMobTexture(worldSeed, 'grub_body');
                const stripedTexture = createMobTexture(worldSeed, 'grub_body', true);
                const mouthTexture = createMobTexture(worldSeed, 'grub_mouth');
                const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture });
                const stripedMat = new THREE.MeshStandardMaterial({ map: stripedTexture });

                const bodyMaterials = [
                    stripedMat, stripedMat, stripedMat, stripedMat, stripedMat, stripedMat
                ];
                this.originalColor = null;

                this.mesh = new THREE.Group();
                this.segments = [];
                this.legs = [];
                this.pinchers = [];
                this.headPivot = new THREE.Object3D();

                const numSegments = 6;
                for (let i = 0; i < numSegments; i++) {
                    let segmentSize = (1.0 - Math.pow(i / numSegments, 2) * 0.5) * scale;
                    if (i === 4) segmentSize *= 0.8;
                    if (i === 5) segmentSize *= 0.4;

                    const segmentGeo = new THREE.BoxGeometry(segmentSize * 1.2, segmentSize * 0.8, segmentSize * 0.8);
                    const segment = new THREE.Mesh(segmentGeo, bodyMaterials);
                    segment.userData.originalMaterial = segment.material; // Store original material

                    this.segments.push(segment);

                    if (i < 2) {
                        this.headPivot.add(segment);
                    } else {
                        this.mesh.add(segment);
                    }
                }

                this.segments[0].position.z = 1.05 * scale;
                this.segments[1].position.z = 0.35 * scale;

                // Adjusted positioning for tail segments
                this.segments[2].position.z = -2 * 0.7 * scale;
                this.segments[3].position.z = -3 * 0.7 * scale;
                this.segments[4].position.z = (-4 * 0.7 + 0.2) * scale;
                this.segments[5].position.z = (-5 * 0.7 + 0.5) * scale;

                this.headPivot.position.z = -1.05 * scale;
                this.mesh.add(this.headPivot);

                for (let i = 1; i < 5; i++) {
                    if (i % 2 !== 0) {
                        let segmentSize = (1.0 - Math.pow(i / numSegments, 2) * 0.5) * scale;
                        const legGeo = new THREE.BoxGeometry(0.1 * scale, 0.5 * scale, 0.1 * scale);

                        const leftLeg = new THREE.Mesh(legGeo, bodyMat);
                        leftLeg.position.set(-segmentSize * 0.6, -0.3 * scale, 0);
                        this.segments[i].add(leftLeg);
                        this.legs.push(leftLeg);

                        const rightLeg = new THREE.Mesh(legGeo, bodyMat);
                        rightLeg.position.set(segmentSize * 0.6, -0.3 * scale, 0);
                        this.segments[i].add(rightLeg);
                        this.legs.push(rightLeg);
                    }
                }

                const head = this.segments[0];
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const eyeGeo = new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.1 * scale);

                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-0.6 * scale, 0.2 * scale, 0);
                head.add(leftEye);

                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(0.6 * scale, 0.2 * scale, 0);
                head.add(rightEye);

                const mouthGeo = new THREE.BoxGeometry(0.4 * scale, 0.1 * scale, 0.1 * scale);
                const mouthMat = new THREE.MeshStandardMaterial({ map: mouthTexture });
                const mouth = new THREE.Mesh(mouthGeo, mouthMat);
                mouth.position.set(0, -0.2 * scale, 0.45 * scale);
                head.add(mouth);

                const pincherGeo = new THREE.BoxGeometry(0.1 * scale, 0.3 * scale, 0.1 * scale);
                const leftPincher = new THREE.Mesh(pincherGeo, mouthMat);
                leftPincher.position.set(-0.4 * scale, -0.2 * scale, 0.5 * scale);
                leftPincher.rotation.z = Math.PI / 6;
                head.add(leftPincher);
                this.pinchers.push(leftPincher);

                const rightPincher = new THREE.Mesh(pincherGeo, mouthMat);
                rightPincher.position.set(0.4 * scale, -0.2 * scale, 0.5 * scale);
                rightPincher.rotation.z = -Math.PI / 6;
                head.add(rightPincher);
                this.pinchers.push(rightPincher);

                const glowRnd = makeSeededRandom(worldSeed + '_grub_glow_' + this.id);
                const glowColor = new THREE.Color().setHSL(glowRnd(), 0.7 + glowRnd() * 0.3, 0.5 + glowRnd() * 0.2);
                this.glowLight = new THREE.PointLight(glowColor, 0, 10 * scale);
                this.mesh.add(this.glowLight);

                // Pre-create red materials for damage flash
                const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                this.redMaterials = Array(bodyMaterials.length).fill(redMaterial);
            }

            this.mesh.userData.mobId = this.id;
            this.mesh.position.copy(this.pos);
            scene.add(this.mesh);
        }
        Mob.prototype.update = function (dt) {
            // Ensure mesh is at the correct initial position for clients
            if (peers.size > 0 && !isHost) {
                this.mesh.position.copy(this.pos);
            }
            if (this.type === 'bee') {
                this.mesh.leftWing.rotation.z = Math.sin(Date.now() * 0.05) * 0.5;
                this.mesh.rightWing.rotation.z = -Math.sin(Date.now() * 0.05) * 0.5;
            }

            if (this.type === 'crawley' && this.mesh.eyeLight) {
                this.mesh.eyeLight.visible = isNight;
            }

            if (this.type === 'grub' && this.glowLight) {
                if (isNight) {
                    this.glowLight.intensity = (Math.sin(Date.now() * 0.002) + 1) / 2 * 0.8 + 0.4;
                } else {
                    this.glowLight.intensity = 0;
                }
            }

            // Only the host runs the mob AI and state changes.
            if (!isHost && peers.size > 0) {
                // Interpolate position for smooth movement on clients
                if (this.lastUpdateTime > 0) {
                    const now = performance.now();
                    const timeSinceUpdate = now - this.lastUpdateTime;
                    const interpolationFactor = Math.min(1, timeSinceUpdate / 100); // 100ms interval
                    this.pos.lerp(this.targetPos, interpolationFactor);
                    this.mesh.position.copy(this.pos);

                    if (this.lastQuaternionUpdate > 0) {
                        const timeSinceUpdate = now - this.lastQuaternionUpdate;
                        const interpolationFactor = Math.min(1, timeSinceUpdate / 100);
                        this.mesh.quaternion.slerp(this.targetQuaternion, interpolationFactor);
                    }
                } else {
                    // Snap to position if no updates have been received yet
                    this.pos.copy(this.targetPos);
                    this.mesh.position.copy(this.pos);
                }

                if (Date.now() < this.flashEnd) {
                    if (this.type === 'grub') {
                        // Use pre-created red materials for damage flash
                        this.segments.forEach(segment => {
                            segment.material = this.redMaterials;
                        });
                    } else if (this.mesh.material) {
                        this.mesh.material.color.set(0xff0000);
                    } else {
                        this.mesh.children[0].material.color.set(0xff0000);
                    }
                } else {
                    if (this.type === 'grub') {
                        // Restore original materials for grub
                        this.segments.forEach(segment => {
                            // Assuming all materials on a segment should be the same, restore from the first one.
                            // This part might need adjustment if segments have different original materials.
                            const originalMaterial = segment.userData.originalMaterial;
                            if (originalMaterial) {
                                segment.material = originalMaterial;
                            }
                        });
                    } else if (this.originalColor) { // Check if originalColor is not null
                        if (this.mesh.material) {
                            this.mesh.material.color.copy(this.originalColor);
                        } else {
                            this.mesh.children[0].material.color.copy(this.originalColor);
                        }
                    }
                }

            } else {
            // Apply velocity from knockback
            this.pos.x += this.vx * dt;
            this.pos.z += this.vz * dt;

            // Friction
            this.vx *= (1 - 2 * dt);
            this.vz *= (1 - 2 * dt);

            if (this.type === 'crawley') {
                // --- Stacking & Collision Physics for Crawlers ---
                // 1. Horizontal separation from other crawlers to prevent blending.
                for (const other of mobs) {
                    if (other.id !== this.id && other.type === 'crawley') {
                        const dx = this.pos.x - other.pos.x;
                        const dz = this.pos.z - other.pos.z;
                        const dist = Math.hypot(dx, dz);
                        const min_dist = 0.9; // Crawler width

                        if (dist < min_dist) {
                            const overlap = (min_dist - dist) / dist;
                            // Push this mob away from the other. This is a soft push to reduce jitter.
                            this.pos.x += dx * overlap * 0.2;
                            this.pos.z += dz * overlap * 0.2;
                        }
                    }
                }

                // 2. Vertical stacking logic.
                // Find the highest support surface beneath the crawler (either ground or another crawler).
                let groundY = chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 0.5;
                let supportY = groundY;
                for (const other of mobs) {
                    if (other.id !== this.id && other.type === 'crawley') {
                        const dist = Math.hypot(this.pos.x - other.pos.x, this.pos.z - other.pos.z);
                        // If horizontally overlapping and the other mob is below us...
                        if (dist < 0.9 && other.pos.y < this.pos.y) {
                            // ...it can act as a support. Find the highest possible support.
                            supportY = Math.max(supportY, other.pos.y + 0.9);
                        }
                    }
                }

                // 3. Apply gravity or rest on support.
                if (this.pos.y > supportY) {
                    // If airborne, fall down.
                    this.pos.y = Math.max(supportY, this.pos.y - 16.0 * dt);
                } else {
                    // Otherwise, ensure we are resting on the highest support.
                    this.pos.y = supportY;
                }
            }


            // --- Torch Avoidance for Crawlers ---
            let avoidanceVector = new THREE.Vector3(0, 0, 0);
            let isAvoiding = false;
            if (this.type === 'crawley') {
                const AVOID_RADIUS = 8;
                let closestTorchDist = Infinity;

                for (const torchPos of torchRegistry.values()) {
                    const dist = this.pos.distanceTo(torchPos);
                    if (dist < AVOID_RADIUS && dist < closestTorchDist) {
                        closestTorchDist = dist;
                        avoidanceVector.subVectors(this.pos, torchPos).normalize();
                        isAvoiding = true;
                    }
                }

                if (isAvoiding) {
                    const scurrySpeed = this.speed * 2.5; // Scurry effect
                    this.pos.x += avoidanceVector.x * scurrySpeed * dt * 60;
                    this.pos.z += avoidanceVector.z * scurrySpeed * dt * 60;

                    this.mesh.position.copy(this.pos);
                    // Skip other AI when avoiding
                    return;
                }
            }


            let target = null;
            let targetDistance = Infinity;

            if (this.type === 'grub') {
                if (this.aiState === 'IDLE' || this.aiState === 'SEARCHING_FOR_CACTUS') {
                    this.aiState = 'SEARCHING_FOR_CACTUS'; // Explicitly set state
                    const scanRadius = 16;
                    let closestCactus = null;
                    let minCactusDist = Infinity;

                    // 1. Find the closest cactus stalk
                    for (let dx = -scanRadius; dx <= scanRadius; dx++) {
                        for (let dz = -scanRadius; dz <= scanRadius; dz++) {
                            for (let dy = -4; dy <= 4; dy++) {
                                const bx = Math.floor(this.pos.x + dx);
                                const by = Math.floor(this.pos.y + dy);
                                const bz = Math.floor(this.pos.z + dz);
                                const blockId = getBlockAt(bx, by, bz);

                                if (blockId === 9) { // Cactus
                                    const dist = this.pos.distanceTo(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5));
                                    if (dist < minCactusDist) {
                                        minCactusDist = dist;
                                        closestCactus = { x: bx, y: by, z: bz };
                                    }
                                }
                            }
                        }
                    }

                    if (closestCactus) {
                        // 2. Find the highest block of that cactus stalk
                        let highestY = closestCactus.y;
                        while (getBlockAt(closestCactus.x, highestY + 1, closestCactus.z) === 9) {
                            highestY++;
                        }
                        this.aiState = 'MOVING_TO_CACTUS';
                        this.targetBlock = { x: closestCactus.x, y: highestY, z: closestCactus.z };
                    } else {
                        // No cactus found, enter wandering state. This will be handled in the movement section.
                        this.aiState = 'IDLE';
                    }
                }

                if (this.aiState === 'MOVING_TO_CACTUS' && this.targetBlock) {
                    target = new THREE.Vector3(this.targetBlock.x + 0.5, this.targetBlock.y + 0.5, this.targetBlock.z + 0.5);
                    targetDistance = this.pos.distanceTo(target);

                    if (targetDistance < 1.8) { // A bit larger distance to start eating
                        this.aiState = 'EATING_CACTUS';
                        this.lingerTime = Date.now(); // Start linger timer
                    }
                } else if (this.aiState === 'EATING_CACTUS' && this.targetBlock) {
                    if (Date.now() - this.lingerTime > 2500) { // 2.5 second eating time
                        // Ensure the target block is still a cactus before eating
                        if (getBlockAt(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z) === 9) {
                            chunkManager.setBlockGlobal(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z, 0); // Eat block
                            this.cactusEaten++;

                            if (this.cactusEaten >= 5) { // After eating 5 blocks
                                this.cactusEaten = 0;
                                // Create an emerald behind the grub
                                const behindVector = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
                                const poopPos = this.pos.clone().add(behindVector.multiplyScalar(-2.5 * 3)); // Drop it a bit further back
                                const groundY = chunkManager.getSurfaceY(poopPos.x, poopPos.z);
                                chunkManager.setBlockGlobal(Math.floor(poopPos.x), groundY, Math.floor(poopPos.z), 125, true, worldSeed); // Emerald
                            }
                        }

                        // Target the block below
                        const blockBelow = { x: this.targetBlock.x, y: this.targetBlock.y - 1, z: this.targetBlock.z };

                        if (getBlockAt(blockBelow.x, blockBelow.y, blockBelow.z) === 9) {
                            // If there's more cactus below, continue eating
                            this.targetBlock = blockBelow;
                            this.lingerTime = Date.now(); // Reset linger for the next block
                        } else {
                            // Cactus finished, go back to searching
                            this.aiState = 'IDLE';
                            this.targetBlock = null;
                        }
                    }
                }
            } else { // All other mobs can target players
                if (this.isAggressive || !target) {
                    let closestPlayer = null;
                    let minPlayerDist = Infinity;

                    let hostDist = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
                    if (hostDist < minPlayerDist) {
                        minPlayerDist = hostDist;
                        closestPlayer = { x: player.x, z: player.z, health: player.health, username: userName };
                    }

                    for (const [username, peerData] of peers.entries()) {
                        if (userPositions[username]) {
                            const peerPos = userPositions[username];
                            const dist = Math.hypot(peerPos.x - this.pos.x, peerPos.z - this.pos.z);
                            if (dist < minPlayerDist) {
                                minPlayerDist = dist;
                                closestPlayer = { x: peerPos.x, z: peerPos.z, health: 20, username: username };
                            }
                        }
                    }
                    if (closestPlayer && minPlayerDist < 10) {
                        target = { x: closestPlayer.x, z: closestPlayer.z };
                        targetDistance = minPlayerDist;

                        if (minPlayerDist < 1.2 && Date.now() - this.attackCooldown > 800) {
                            this.attackCooldown = Date.now();
                            const targetPeer = peers.get(closestPlayer.username);
                            if (targetPeer && targetPeer.dc && targetPeer.dc.readyState === 'open') {
                                targetPeer.dc.send(JSON.stringify({ type: 'player_damage', damage: 1, attacker: 'mob' }));
                            } else if (closestPlayer.username === userName) {
                                if (Date.now() - lastDamageTime > 800) {
                                    player.health = Math.max(0, player.health - 1);
                                    lastDamageTime = Date.now();
                                    document.getElementById('health').innerText = player.health;
                                    updateHealthBar();
                                    addMessage('Hit! HP: ' + player.health, 1000);
                                    if (player.health <= 0) {
                                        handlePlayerDeath();
                                    }
                                }
                            }
                        }
                    }
                }
            }


            // Crawley AI: Target hives/honey, then players
            if (this.type === 'crawley') {
                const scanRadius = 16; // Increased scan radius for more aggressive hive seeking
                let hiveTarget = null;
                let honeyTarget = null;
                let minHiveDist = Infinity;
                let minHoneyDist = Infinity;

                // Scan for Hives and Honey separately to prioritize Hives.
                for (let dx = -scanRadius; dx <= scanRadius; dx++) {
                    for (let dz = -scanRadius; dz <= scanRadius; dz++) {
                        for (let dy = -4; dy <= 4; dy++) { // Increased vertical scan
                            const bx = Math.floor(this.pos.x + dx);
                            const by = Math.floor(this.pos.y + dy);
                            const bz = Math.floor(this.pos.z + dz);
                            const blockId = getBlockAt(bx, by, bz);

                            if (blockId === 123) { // Hive Block
                                const dist = this.pos.distanceTo(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5));
                                if (dist < minHiveDist) {
                                    minHiveDist = dist;
                                    hiveTarget = { x: bx, y: by, z: bz, id: blockId };
                                }
                            } else if (blockId === 122) { // Honey Block
                                const dist = this.pos.distanceTo(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5));
                                if (dist < minHoneyDist) {
                                    minHoneyDist = dist;
                                    honeyTarget = { x: bx, y: by, z: bz, id: blockId };
                                }
                            }
                        }
                    }
                }

                // Prioritize the Hive itself over Honey.
                if (hiveTarget) {
                    target = hiveTarget;
                    targetDistance = minHiveDist;
                } else if (honeyTarget) {
                    target = honeyTarget;
                    targetDistance = minHoneyDist;
                }


                if (target && targetDistance < 1.5) {
                    if (this.lingerTime === 0) {
                        this.lingerTime = Date.now(); // Start lingering
                    } else if (Date.now() - this.lingerTime > 2000) { // Linger for 2 seconds
                        const dist = Math.hypot(player.x - target.x, player.y - target.y, player.z - target.z);
                        if (dist < maxAudioDistance) {
                            safePlayAudio(soundBreak);
                        }
                        chunkManager.setBlockGlobal(target.x, target.y, target.z, 0);
                        // Use a timeout to allow the block removal to fully process before checking.
                        setTimeout(() => checkAndDeactivateHive(target.x, target.y, target.z), 100);
                        target = null;
                        this.lingerTime = 0; // Reset linger time
                    }
                } else {
                    this.lingerTime = 0; // Reset if not near a target
                }
            }

            // Bee AI
            if (this.type === 'bee') {
                if (this.aiState === 'SEARCHING_FOR_FLOWER') {
                    if (flowerLocations.length > 0) {
                        let closestFlower = null;
                        let minFlowerDist = Infinity;
                        for (const flower of flowerLocations) {
                            const dist = Math.hypot(flower.x - this.pos.x, flower.z - this.pos.z);
                            if (dist < minFlowerDist) {
                                minFlowerDist = dist;
                                closestFlower = flower;
                            }
                        }
                        target = closestFlower;
                        targetDistance = minFlowerDist;
                        if (target) this.pos.y += (chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 2 - this.pos.y) * 0.1;
                        if (targetDistance < 1.5) {
                            this.hasPollen = true;
                            this.aiState = 'FLYING_TO_HIVE';
                        }
                    }
                } else if (this.aiState === 'FLYING_TO_HIVE') {
                    if (hiveLocations.length > 0) {
                        let closestHive = null;
                        let minHiveDist = Infinity;
                        for (const hive of hiveLocations) {
                            const dist = Math.hypot(hive.x - this.pos.x, hive.z - this.pos.z);
                            if (dist < minHiveDist) {
                                minHiveDist = dist;
                                closestHive = hive;
                            }
                        }
                        target = closestHive;
                        targetDistance = minHiveDist;
                        if (target) this.pos.y += (chunkManager.getSurfaceY(this.pos.x, this.pos.z) + 8 - this.pos.y) * 0.1; // Fly higher
                        if (targetDistance < 2) {
                            this.aiState = 'DEPOSITING_HONEY';
                        }
                    }
                } else if (this.aiState === 'DEPOSITING_HONEY') {
                    const hive = hiveLocations.find(h => Math.hypot(h.x - this.pos.x, h.z - this.pos.z) < 3);
                    let placedHoney = false;
                    if (hive) {
                        // Search a 3x3x3 area around the hive for a valid spot
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                for (let dz = -1; dz <= 1; dz++) {
                                    if (dx === 0 && dy === 0 && dz === 0) continue; // Don't place inside hive
                                    const bx = hive.x + dx, by = hive.y + dy, bz = hive.z + dz;
                                    // Honey must be placed in an empty space on top of a solid block
                                    if (getBlockAt(bx, by, bz) === 0 && isSolid(getBlockAt(bx, by - 1, bz))) {
                                        chunkManager.setBlockGlobal(bx, by, bz, 122); // Place honey
                                        this.hasPollen = false;
                                        this.aiState = 'SEARCHING_FOR_FLOWER';
                                        placedHoney = true;
                                        break;
                                    }
                                }
                                if (placedHoney) break;
                            }
                            if (placedHoney) break;
                        }
                    }
                    if (placedHoney) {
                        this.aiState = 'SEARCHING_FOR_FLOWER';
                    } else {
                        // If no valid spot was found, don't get stuck, search for another flower.
                        this.aiState = 'SEARCHING_FOR_FLOWER';
                    }
                }
            }


            // Player targeting if aggressive or no other target
            if (this.isAggressive || !target) {
                let closestPlayer = null;
                let minPlayerDist = Infinity;

                let hostDist = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
                if (hostDist < minPlayerDist) {
                    minPlayerDist = hostDist;
                    closestPlayer = { x: player.x, z: player.z, health: player.health, username: userName };
                }

                for (const [username, peerData] of peers.entries()) {
                    if (userPositions[username]) {
                        const peerPos = userPositions[username];
                        const dist = Math.hypot(peerPos.x - this.pos.x, peerPos.z - this.pos.z);
                        if (dist < minPlayerDist) {
                            minPlayerDist = dist;
                            closestPlayer = { x: peerPos.x, z: peerPos.z, health: 20, username: username };
                        }
                    }
                }
                if (closestPlayer && minPlayerDist < 10) {
                    target = { x: closestPlayer.x, z: closestPlayer.z };
                    targetDistance = minPlayerDist;

                    if (minPlayerDist < 1.2 && Date.now() - this.attackCooldown > 800) {
                        this.attackCooldown = Date.now();
                        const targetPeer = peers.get(closestPlayer.username);
                        if (targetPeer && targetPeer.dc && targetPeer.dc.readyState === 'open') {
                            targetPeer.dc.send(JSON.stringify({ type: 'player_damage', damage: 1, attacker: 'mob' }));
                        } else if (closestPlayer.username === userName) {
                            if (Date.now() - lastDamageTime > 800) {
                                player.health = Math.max(0, player.health - 1);
                                lastDamageTime = Date.now();
                                document.getElementById('health').innerText = player.health;
                                updateHealthBar();
                                addMessage('Hit! HP: ' + player.health, 1000);
                                if (player.health <= 0) {
                                    handlePlayerDeath();
                                }
                            }
                        }
                    }
                }
            }

            let isMoving = false;
            if (target && targetDistance > 0.01) { // Check for distance to avoid division by zero
                const dx = target.x - this.pos.x;
                const dz = target.z - this.pos.z;
                const vx = dx / targetDistance * this.speed;
                const vz = dz / targetDistance * this.speed;
                const newX = modWrap(this.pos.x + vx * dt * 60, MAP_SIZE);
                const newZ = modWrap(this.pos.z + vz * dt * 60, MAP_SIZE);

                if (this.type === 'crawley') {
                    const frontY = chunkManager.getSurfaceY(newX, newZ);
                    if (frontY > this.pos.y && frontY <= this.pos.y + 1) {
                        this.pos.y = frontY + 0.5; // Climb up one block
                    }
                }

                if (this.type === 'grub' || this.type === 'crawley') {
                    const frontY = chunkManager.getSurfaceY(newX, newZ);
                    if (frontY > this.pos.y && frontY <= this.pos.y + 1.2) { // Allow climbing slightly more than 1 block
                        this.pos.y = frontY + 0.5;
                    }
                }

                if (!checkCollisionWithBlock(newX, this.pos.y, newZ)) {
                    this.pos.x = newX;
                    this.pos.z = newZ;
                    isMoving = true;
                }
            } else {
                // Wander
                const wanderSpeed = this.speed * 0.5;
                const newX = modWrap(this.pos.x + (Math.sin(Date.now() * 0.001 + this.mesh.id) * wanderSpeed) * dt * 60, MAP_SIZE);
                const newZ = modWrap(this.pos.z + (Math.cos(Date.now() * 0.001 + this.mesh.id) * wanderSpeed) * dt * 60, MAP_SIZE);
                if (this.type === 'grub' || this.type === 'crawley') {
                    const frontY = chunkManager.getSurfaceY(newX, newZ);
                    if (frontY > this.pos.y && frontY <= this.pos.y + 1.2) {
                        this.pos.y = frontY + 0.5;
                    }
                }
                 if (!checkCollisionWithBlock(newX, this.pos.y, newZ)) {
                    this.pos.x = newX;
                    this.pos.z = newZ;
                    isMoving = true;
                }
            }
            this.isMoving = isMoving;

            if (this.type === 'grub' && target) {
                const targetDirection = new THREE.Vector3().subVectors(new THREE.Vector3(target.x, this.pos.y, target.z), this.pos).normalize();
                const angle = Math.atan2(targetDirection.x, targetDirection.z);
                this.mesh.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), 0.05); // Slower turning
            }

            this.mesh.position.copy(this.pos);
            }
            // Grub and Crawley animations are now client-side, driven by host state.
            if (this.type === 'grub') {
                const isEating = this.aiState === 'EATING_CACTUS';
                const animationSpeed = (this.isMoving ? 8 : 4) / 2;
                this.animationTime += dt * animationSpeed;

                this.segments.forEach((segment, i) => {
                    if (i > 0) {
                        if (i === 1 && isEating) {
                            segment.position.y = 0;
                        } else {
                            segment.position.y = Math.sin(this.animationTime - i * 0.8) * 0.15 * 3;
                        }
                    }
                });

                if (isEating) {
                    this.headPivot.rotation.x = -Math.PI / 4 * (1 - Math.cos(this.animationTime * 2));
                    const pincherAngle = Math.abs(Math.sin(this.animationTime * 4)) * (Math.PI / 4);
                    this.pinchers[0].rotation.z = Math.PI / 6 + pincherAngle;
                    this.pinchers[1].rotation.z = -Math.PI / 6 - pincherAngle;
                } else {
                    this.headPivot.rotation.x = 0;
                    this.pinchers[0].rotation.z = Math.PI / 6;
                    this.pinchers[1].rotation.z = -Math.PI / 6;
                }

                if (this.isMoving || isEating) {
                    this.legs.forEach((leg, i) => {
                        const side = (i % 2 === 0) ? -1 : 1;
                        const legGroup = Math.floor(i / 2);
                        leg.rotation.x = Math.sin(this.animationTime - legGroup * 0.5) * side * 0.8;
                    });
                } else {
                    this.legs.forEach(leg => leg.rotation.x = 0);
                }
            } else if (this.type === 'crawley' && this.mesh.legs) {
                if (this.isMoving) {
                    this.animationTime += dt * 15; // Animation speed
                    this.mesh.position.y += Math.sin(this.animationTime * 2) * 0.05; // Body bobbing
                    this.mesh.legs.forEach((leg, i) => {
                        const side = (i % 2 === 0) ? 1 : -1;
                        leg.rotation.x = Math.sin(this.animationTime + (Math.floor(i / 2) * Math.PI / 3)) * side * 0.8;
                    });
                } else {
                    this.mesh.legs.forEach(leg => { leg.rotation.x = 0; });
                }
            }
        };
        Mob.prototype.hurt = function (dmg, attackerName) {
            if (!isHost && peers.size > 0) return; // Only host or single player can process damage

            this.hp -= dmg;
            this.flashEnd = Date.now() + 200; // Trigger flash effect
            safePlayAudio(soundHit);

            // Apply knockback
            const attacker = (attackerName === userName) ? player : userPositions[attackerName];
            if (attacker) {
                const attackerX = (attackerName === userName) ? attacker.x : attacker.targetX;
                const attackerZ = (attackerName === userName) ? attacker.z : attacker.targetZ;
                const dx = this.pos.x - attackerX;
                const dz = this.pos.z - attackerZ;
                const dist = Math.hypot(dx, dz);
                const knockbackStrength = 8;
                if (dist > 0) { // SAFEGUARD: Prevent division by zero
                    this.vx += (dx / dist) * knockbackStrength;
                    this.vz += (dz / dist) * knockbackStrength;
                }
            }


            if (this.hp <= 0) {
                this.die(attackerName);
            } else {
                // Broadcast the health update
                const updateMessage = JSON.stringify({
                    type: 'mob_update',
                    id: this.id,
                    x: this.pos.x,
                    y: this.pos.y,
                    z: this.pos.z,
                    hp: this.hp,
                    flash: true, // Tell clients to trigger the flash
                    mobType: this.type
                });
                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                        peerData.dc.send(updateMessage);
                    }
                }
            }
        };
        Mob.prototype.die = function (killerName) {
            if (!isHost && peers.size > 0) return; // Only host or single player can process death

            try {
                scene.remove(this.mesh);
                disposeObject(this.mesh);
            } catch (e) { }

            mobs = mobs.filter(m => m.id !== this.id);
            addMessage('Mob defeated!');

            // Award score to the killer
            let points = 10; // Default for green
            if (this.eyeColor === 'red') {
                points = 20; // Double points
            } else if (this.eyeColor === 'blue') {
                points = 30; // Triple points
            }

            if (killerName === userName) {
                player.score += points;
                document.getElementById('score').innerText = player.score;
                addMessage(`+${points} score`);
                safePlayAudio(soundHit); // Play a sound for getting points
            } else {
                const killerPeer = peers.get(killerName);
                if (killerPeer && killerPeer.dc && killerPeer.dc.readyState === 'open') {
                    killerPeer.dc.send(JSON.stringify({ type: 'add_score', amount: points }));
                }
            }

            // Broadcast the kill to all clients
            const killMessage = JSON.stringify({ type: 'mob_kill', id: this.id });
            for (const [peerUser, peerData] of peers.entries()) {
                if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                    peerData.dc.send(killMessage);
                }
            }
        };
        function manageMobs() {
            if (!worldArchetype) return;
            if (!isHost && peers.size > 0) return;
            if (Date.now() - lastMobManagement < 5000) return;
            lastMobManagement = Date.now();

            const CRAWLEY_CAP = 20;
            const BEE_CAP = 10;
            const GRUB_CAP = 2;
            const SPAWN_RADIUS = 64;
            const DESPAWN_RADIUS = 96;

            const allPlayers = [{ x: player.x, y: player.y, z: player.z }];
            for (const pos of Object.values(userPositions)) {
                if (pos.targetX) allPlayers.push({ x: pos.targetX, y: pos.targetY, z: pos.targetZ });
            }

            const allowedMobsToday = isNight ? worldArchetype.mobSpawnRules.night : worldArchetype.mobSpawnRules.day;

            mobs = mobs.filter(mob => {
                const isNearPlayer = allPlayers.some(p => Math.hypot(mob.pos.x - p.x, mob.pos.z - p.z) < DESPAWN_RADIUS);
                const isAllowedNow = allowedMobsToday.includes(mob.type);

                if (!isNearPlayer || !isAllowedNow) {
                    scene.remove(mob.mesh);
                    disposeObject(mob.mesh);
                    const killMessage = JSON.stringify({ type: 'mob_kill', id: mob.id });
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(killMessage);
                        }
                    }
                    return false;
                }

                return true;
            });

            for (const mobType of allowedMobsToday) {
                let mobCap;
                if (mobType === 'crawley') mobCap = CRAWLEY_CAP;
                else if (mobType === 'bee') mobCap = BEE_CAP;
                else if (mobType === 'grub') mobCap = GRUB_CAP;
                else continue;

                const currentCount = mobs.filter(m => m.type === mobType).length;

                if (currentCount < mobCap) {
                    const spawnPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];

                    const angle = Math.random() * Math.PI * 2;
                    const radius = SPAWN_RADIUS / 2 + Math.random() * SPAWN_RADIUS / 2;
                    const x = modWrap(spawnPlayer.x + Math.cos(angle) * radius, MAP_SIZE);
                    const z = modWrap(spawnPlayer.z + Math.sin(angle) * radius, MAP_SIZE);

                    const newMob = new Mob(x, z, Date.now() + Math.random(), mobType);
                    mobs.push(newMob);

                    const spawnMessage = JSON.stringify({
                        type: 'mob_spawn',
                        id: newMob.id,
                        x: newMob.pos.x,
                        y: newMob.pos.y,
                        z: newMob.pos.z,
                        hp: newMob.hp,
                        mobType: newMob.type,
                        isAggressive: newMob.isAggressive
                    });
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(spawnMessage);
                        }
                    }
                }
            }
        }
function handleMobHit(mob) {
            // This function is only for the local player's attack action.
            // The server/host will be the one to actually process the damage.
            if (isHost || peers.size === 0) {
                mob.hurt(4, userName);
            } else {
                // Client sends hit notification to its peer (the host).
                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerData.dc && peerData.dc.readyState === 'open') {
                        console.log(`[WebRTC] Sending mob_hit to host ${peerUser}`);
                        peerData.dc.send(JSON.stringify({
                            type: 'mob_hit',
                            id: mob.id,
                            damage: 4,
                            username: userName // Let the host know who is attacking
                        }));
                    }
                }
            }
            safePlayAudio(soundHit); // Play sound locally for responsiveness
            addMessage('Hit mob!', 800); // Give local feedback
        }
