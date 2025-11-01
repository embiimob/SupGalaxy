function createEmberTexture(seed) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const noise = makeNoise(seed + '_ember');
    const imageData = context.createImageData(size, size);
    const data = imageData.data;
    const rnd = makeSeededRandom(seed + '_ember_color');

    const colorRamp = [
        { r: Math.floor(rnd() * 100), g: 0, b: 0 },    // Dark base
        { r: 255, g: Math.floor(rnd() * 150), b: 0 }, // Mid color
        { r: 255, g: 255, b: Math.floor(rnd() * 200) } // Bright tip
    ];

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            const value = fbm(noise, x / 8, y / 8, 3, 0.6);
            const index = (y * size + x) * 4;
            let r, g, b;
            if (value < 0.5) {
                const t = value / 0.5;
                r = colorRamp[0].r + (colorRamp[1].r - colorRamp[0].r) * t;
                g = colorRamp[0].g + (colorRamp[1].g - colorRamp[0].g) * t;
                b = colorRamp[0].b + (colorRamp[1].b - colorRamp[0].b) * t;
            } else {
                const t = (value - 0.5) / 0.5;
                r = colorRamp[1].r + (colorRamp[2].r - colorRamp[1].r) * t;
                g = colorRamp[1].g + (colorRamp[2].g - colorRamp[1].g) * t;
                b = colorRamp[1].b + (colorRamp[2].b - colorRamp[1].b) * t;
            }
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = value > 0.3 ? 255 : 0; // Make parts of the flame transparent
        }
    }
    context.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

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

function createBlockTexture(seed, blockId) {
    const cacheKey = `${seed}:${blockId}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    const rnd = makeSeededRandom(seed + '_block_texture_' + blockId);
    const baseColor = new THREE.Color(BLOCKS[blockId].color);
    let secondaryColor = new THREE.Color().setHSL(rnd(), 0.5 + rnd() * 0.3, 0.2 + rnd() * 0.3);

    context.fillStyle = baseColor.getStyle();
    context.fillRect(0, 0, size, size);

    const patternType = Math.floor(rnd() * 5);
    const patternNoise = makeNoise(seed + '_pattern_noise_' + blockId);

    context.strokeStyle = secondaryColor.getStyle();
    context.lineWidth = 1 + Math.floor(rnd() * 2);

    if (patternType === 0) { // Broken Horizontal Lines
        for (let y = 2; y < size; y += 4) {
            context.beginPath();
            for (let x = 0; x < size; x++) {
                if (patternNoise(x / 8, y / 8) > 0.4) {
                    context.moveTo(x, y);
                    context.lineTo(x + 1, y);
                }
            }
            context.stroke();
        }
    } else if (patternType === 1) { // Broken Vertical Lines
        for (let x = 2; x < size; x += 4) {
            context.beginPath();
            for (let y = 0; y < size; y++) {
                if (patternNoise(x / 8, y / 8) > 0.4) {
                    context.moveTo(x, y);
                    context.lineTo(x, y + 1);
                }
            }
            context.stroke();
        }
    } else if (patternType === 2) { // Broken Diagonal Lines
        for (let i = -size; i < size; i += 4) {
             context.beginPath();
            for (let j = 0; j < size * 2; j++) {
                if (patternNoise(i / 8, j / 8) > 0.6) {
                    context.moveTo(i + j, j);
                    context.lineTo(i + j + 1, j + 1);
                }
            }
            context.stroke();
        }
    } else if (patternType === 3) { // Wavy Lines
        for (let y = 0; y < size; y += 4) {
            context.beginPath();
            context.moveTo(0, y);
            for (let x = 0; x < size; x++) {
                const wave = Math.sin(x / 4 + rnd() * 10) * 2;
                if (patternNoise(x / 8, y / 8) > 0.3) {
                    context.lineTo(x, y + wave);
                } else {
                    context.moveTo(x, y + wave);
                }
            }
            context.stroke();
        }
    }

    if (rnd() > 0.8) {
        const borderColor = baseColor.clone().multiplyScalar(0.7);
        context.strokeStyle = borderColor.getStyle();
        context.lineWidth = 1;
        context.strokeRect(0.5, 0.5, size - 1, size - 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    textureCache.set(cacheKey, texture);
    return texture;
}

function createCloudTexture(seed) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const noise = makeNoise(seed + '_clouds');

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const value = fbm(noise, i / 32, j / 32, 4, 0.5) * 255;
            const alpha = Math.max(0, value - 128);
            context.fillStyle = `rgba(255, 255, 255, ${alpha / 128})`;
            context.fillRect(i, j, 1, 1);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

function initSky() {
    const skyRnd = makeSeededRandom(worldSeed + '_sky');
    const baseHue = skyRnd();
    const baseSat = 0.5 + skyRnd() * 0.5;
    const dayLightness = 0.6 + skyRnd() * 0.2;
    const nightLightness = 0.05 + skyRnd() * 0.05;

    skyProps = {
        dayColor: new THREE.Color().setHSL(baseHue, baseSat, dayLightness),
        nightColor: new THREE.Color().setHSL(baseHue, baseSat * 0.8, nightLightness),
        cloudColor: new THREE.Color().setHSL(skyRnd(), 0.2 + skyRnd() * 0.3, 0.8),
        suns: [],
        moons: []
    };

    const numSuns = 1 + Math.floor(skyRnd() * 3);
    for (let i = 0; i < numSuns; i++) {
        const sunSize = 80 + skyRnd() * 120;
        const sunColor = new THREE.Color().setHSL(skyRnd(), 0.8 + skyRnd() * 0.2, 0.6 + skyRnd() * 0.2);
        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(sunSize, 32, 32),
            new THREE.MeshBasicMaterial({ color: sunColor })
        );
        skyProps.suns.push({ mesh: sun, angleOffset: skyRnd() * Math.PI * 2 });
        scene.add(sun);
    }

    const numMoons = Math.floor(skyRnd() * 4);
    for (let i = 0; i < numMoons; i++) {
        const moonSize = 40 + skyRnd() * 60;
        const moonColor = new THREE.Color().setHSL(skyRnd(), 0.1 + skyRnd() * 0.2, 0.7 + skyRnd() * 0.2);

        const moonShape = new THREE.SphereGeometry(moonSize, 32, 32);
        const moonNoise = makeNoise(worldSeed + '_moon_' + i);
        const positions = moonShape.attributes.position;
        const vertex = new THREE.Vector3();

        for (let j = 0; j < positions.count; j++) {
            vertex.fromBufferAttribute(positions, j);

            const noiseFactor = 0.8;
            const noise = fbm(moonNoise, vertex.x * 0.05, vertex.y * 0.05, 3, 0.5) +
                fbm(moonNoise, vertex.y * 0.05, vertex.z * 0.05, 3, 0.5) +
                fbm(moonNoise, vertex.z * 0.05, vertex.x * 0.05, 3, 0.5);

            const craterNoise = fbm(moonNoise, vertex.x * 0.3, vertex.y * 0.3, 3, 0.5);
            const craterDepth = 0.15 * craterNoise;

            vertex.multiplyScalar(1 + (noise / 3) * noiseFactor - craterDepth);
            positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
        }
        moonShape.computeVertexNormals();

        const moon = new THREE.Mesh(
            moonShape,
            new THREE.MeshBasicMaterial({ color: moonColor })
        );
        skyProps.moons.push({ mesh: moon, angleOffset: skyRnd() * Math.PI * 2 });
        scene.add(moon);
    }

    stars = new THREE.Group();
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starNoise = makeNoise(worldSeed + '_stars');
    for (let i = 0; i < 5000; i++) {
        const theta = skyRnd() * Math.PI * 2;
        const phi = Math.acos(2 * skyRnd() - 1);
        const x = 4000 * Math.sin(phi) * Math.cos(theta);
        const y = 4000 * Math.sin(phi) * Math.sin(theta);
        const z = 4000 * Math.cos(phi);
        if (starNoise(x * 0.005, z * 0.005) > 0.7) {
            starVertices.push(x, y, z);
        }
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 + skyRnd() * 3 });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    stars.add(starPoints);
    scene.add(stars);

    clouds = new THREE.Group();
    const cloudTexture = createCloudTexture(worldSeed);
    const numClouds = Math.floor(skyRnd() * 80);
    for (let i = 0; i < numClouds; i++) {
        const cloud = new THREE.Mesh(
            new THREE.PlaneGeometry(200 + skyRnd() * 300, 100 + skyRnd() * 150),
            new THREE.MeshBasicMaterial({
                map: cloudTexture,
                color: skyProps.cloudColor,
                transparent: true,
                opacity: 0.6 + skyRnd() * 0.3,
                side: THREE.DoubleSide
            })
        );
        cloud.position.set(
            (skyRnd() - 0.5) * 8000,
            200 + skyRnd() * 150,
            (skyRnd() - 0.5) * 8000
        );
        cloud.rotation.y = skyRnd() * Math.PI * 2;
        clouds.add(cloud);
    }
    scene.add(clouds);
}

function updateSky(dt) {
    const now = new Date();
    let hours = now.getHours() + now.getMinutes() / 60;
    const timeRatio = hours / 24;
    const timeAngle = timeRatio * Math.PI * 2;

    const sunAngleForLight = timeAngle + (skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0);
    const sunY = Math.sin(sunAngleForLight);
    isNight = sunY < -0.1;

    skyProps.suns.forEach(sun => {
        const angle = timeAngle + sun.angleOffset;
        sun.mesh.position.set(camera.position.x + 4000 * Math.cos(angle), camera.position.y + 4000 * Math.sin(angle), camera.position.z + 1500 * Math.sin(angle));
        sun.mesh.visible = Math.sin(angle) > -0.1;
    });

    skyProps.moons.forEach(moon => {
        const angle = timeAngle + moon.angleOffset + Math.PI;
        moon.mesh.position.set(camera.position.x + 3800 * Math.cos(angle), camera.position.y + 3800 * Math.sin(angle), camera.position.z + 1200 * Math.sin(angle));
        moon.mesh.visible = Math.sin(angle) > -0.1;
    });

    stars.visible = isNight;
    stars.rotation.y += dt * 0.005;

    clouds.children.forEach(cloud => {
        cloud.position.x = modWrap(cloud.position.x + dt * (15 + Math.random() * 10), 8000);
    });

    const tNorm = Math.max(0, sunY);
    scene.background = new THREE.Color().copy(skyProps.dayColor).lerp(skyProps.nightColor, 1 - tNorm);

    const transitionStart = -0.2;
    const transitionEnd = 0.2;

    let lightFactor = (sunY - transitionStart) / (transitionEnd - transitionStart);
    lightFactor = Math.max(0, Math.min(1, lightFactor));

    const ambientLight = scene.getObjectByProperty('type', 'AmbientLight');
    const directionalLight = scene.getObjectByProperty('type', 'DirectionalLight');
    const hemisphereLight = scene.getObjectByProperty('type', 'HemisphereLight');

    const dayAmbient = 0.2;
    const nightAmbient = 0.01;
    const dayDirectional = 0.95;
    const nightDirectional = 0;

    if (ambientLight) {
        ambientLight.intensity = nightAmbient + (dayAmbient - nightAmbient) * lightFactor;
    }
    if (directionalLight) {
        directionalLight.intensity = nightDirectional + (dayDirectional - nightDirectional) * lightFactor;
    }
    if (hemisphereLight) {
        const dayHemi = 0.6;
        const nightHemi = 0.02;
        hemisphereLight.intensity = nightHemi + (dayHemi - nightHemi) * lightFactor;
    }
}
