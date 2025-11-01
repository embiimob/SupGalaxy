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
    this.hp = 10;
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
    } else {
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
        if (eyeColorRnd < 0.1) {
            eyeColor = 0x0000ff;
            this.eyeColor = 'blue';
            this.hp = 15;
        } else if (eyeColorRnd < 0.5) {
            eyeColor = 0x00ff00;
            this.eyeColor = 'green';
            this.hp = 5;
        } else {
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
        this.speed = (0.01 + Math.random() * 0.005) / 2;
        this.aiState = 'IDLE';
        this.animationTime = Math.random() * Math.PI * 2;
        this.cactusEaten = 0;
        this.isAggressive = false;

        const scale = 3;

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
            segment.userData.originalMaterial = segment.material;

            this.segments.push(segment);

            if (i < 2) {
                this.headPivot.add(segment);
            } else {
                this.mesh.add(segment);
            }
        }

        this.segments[0].position.z = 1.05 * scale;
        this.segments[1].position.z = 0.35 * scale;

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

        const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.redMaterials = Array(bodyMaterials.length).fill(redMaterial);
    }

    this.mesh.userData.mobId = this.id;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
}
