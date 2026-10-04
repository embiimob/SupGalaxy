// Local-only profiling switches never change saved or networked stone settings.
let modelPerformanceCapture = null;
const stoneViewFrustum = new THREE.Frustum();
const stoneViewMatrix = new THREE.Matrix4();
const stoneViewPosition = new THREE.Vector3();

function updateStoneView() {
    camera.updateMatrixWorld();
    stoneViewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    stoneViewFrustum.setFromProjectionMatrix(stoneViewMatrix);
    stoneViewPosition.set(player.x, player.y, player.z);
}

function getStoneView(stone) {
    if (!stone.visualBounds) stone.visualBounds = new THREE.Box3().setFromObject(stone.mesh);
    const distance = stone.visualBounds.distanceToPoint(stoneViewPosition);
    const limit = Number(stone.renderDistance) || 0;
    stone.mesh.visible = !limit || distance <= limit;
    return { distance, visible: stone.mesh.visible && stoneViewFrustum.intersectsBox(stone.visualBounds) };
}

function getStonePerformanceSettings(stone) {
    return {
        colliderUrl: typeof stone.colliderUrl === 'string' ? stone.colliderUrl.slice(0, 600) : '',
        collisionMode: stone.collisionMode === 'none' ? 'none' : 'static',
        textureMaxSize: [512, 1024, 2048].includes(Number(stone.textureMaxSize)) ? Number(stone.textureMaxSize) : 0,
        animationPolicy: ['nearby', 'visible', 'off'].includes(stone.animationPolicy) ? stone.animationPolicy : 'always',
        renderDistance: Number.isFinite(Number(stone.renderDistance)) ? Math.max(0, Math.min(4096, Number(stone.renderDistance))) : 0
    };
}

function shouldSkipStoneCollision() {
    return !!modelPerformanceCapture && modelPerformanceCapture.options.collision === false;
}

function shouldAnimateStone(stone, distance, visible) {
    if (modelPerformanceCapture && modelPerformanceCapture.options.animation === false) return false;
    if (stone.autoplayAnimation === false || stone.animationPolicy === 'off') return false;
    if (stone.animationPolicy === 'nearby') return distance <= (Number(stone.distance) || 10);
    if (stone.animationPolicy === 'visible') return visible;
    return true;
}

async function prepareStoneVisualQuality(model, maxSize) {
    maxSize = getStonePerformanceSettings({ textureMaxSize: maxSize }).textureMaxSize;
    if (!maxSize) return;
    const textures = new Set();
    model.traverse(child => {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            if (!material) continue;
            for (const value of Object.values(material)) {
                if (value && value.isTexture) textures.add(value);
            }
        }
    });
    for (const texture of textures) {
        const image = texture.image;
        // Compressed, data, cube and animated textures require their own upload formats.
        if (!image || texture.isCompressedTexture || texture.isDataTexture || texture.isCubeTexture ||
            texture.isVideoTexture || image.data || !image.width || !image.height ||
            Math.max(image.width, image.height) <= maxSize) continue;
        await new Promise(resolve => setTimeout(resolve, 0));
        const scale = maxSize / Math.max(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        try {
            const context = canvas.getContext('2d');
            if (!context) continue;
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            // Check origin cleanliness now, not later during a WebGL upload.
            context.getImageData(0, 0, 1, 1);
            texture.image = canvas;
            texture.needsUpdate = true;
        } catch (error) {
            console.warn('[Model quality] Keeping original texture:', error);
        }
    }
}

function startModelPerformanceCapture(options = {}) {
    if (modelPerformanceCapture) throw new Error('A model performance capture is already running');
    if (typeof renderer === 'undefined' || !renderer) throw new Error('Start a world before capturing');
    const label = String(options.label || 'model').slice(0, 80);
    const capture = {
        options, label, started: performance.now(), lastFrame: null, frames: [],
        collisionMs: 0, groundMs: 0, collisionQueries: 0, groundQueries: 0,
        renderer,
        originalRender: renderer.render,
        originalCollision: window.checkMeshCollision,
        originalGround: window.getMeshGroundY,
        avatar: null, timer: null, resolve: null,
        world: typeof worldName === 'undefined' ? null : worldName,
        playerState: typeof player === 'undefined' ? null :
            Object.fromEntries(['x', 'y', 'z', 'vx', 'vy', 'vz', 'onGround', 'yaw', 'pitch'].map(key => [key, player[key]]))
    };
    capture.result = new Promise(resolve => { capture.resolve = resolve; });
    if (options.avatar === 'default' && typeof avatarGroup !== 'undefined' && avatarGroup) {
        const rig = avatarGroup.userData.customAvatar;
        if (rig) {
            capture.avatar = {
                group: avatarGroup, rig, visible: rig.root.visible,
                parts: (avatarGroup.userData.boxParts || []).map(part => [part, part.visible])
            };
            rig.root.visible = false;
            avatarGroup.userData.profileDefaultAvatar = true;
            setBoxAvatarVisible(avatarGroup, true);
        }
    }
    const wrapQuery = (original, metric, count) => function (...args) {
        const started = performance.now();
        try { return original.apply(this, args); }
        finally {
            capture[metric] += performance.now() - started;
            capture[count]++;
        }
    };
    window.checkMeshCollision = wrapQuery(capture.originalCollision, 'collisionMs', 'collisionQueries');
    window.getMeshGroundY = wrapQuery(capture.originalGround, 'groundMs', 'groundQueries');
    renderer.render = function (...args) {
        const started = performance.now();
        const result = capture.originalRender.apply(this, args);
        const now = performance.now();
        if (capture.lastFrame !== null) {
            capture.frames.push({
                frameMs: started - capture.lastFrame,
                renderCpuMs: now - started,
                collisionMs: capture.collisionMs, groundMs: capture.groundMs,
                collisionQueries: capture.collisionQueries, groundQueries: capture.groundQueries,
                triangles: this.info.render.triangles, drawCalls: this.info.render.calls
            });
        }
        capture.lastFrame = started;
        capture.collisionMs = capture.groundMs = capture.collisionQueries = capture.groundQueries = 0;
        if (capture.frames.length >= 3600) stopModelPerformanceCapture();
        return result;
    };
    modelPerformanceCapture = capture;
    performance.mark('supgalaxy-model-start');
    const seconds = Number(options.seconds);
    capture.timer = setTimeout(stopModelPerformanceCapture,
        Math.max(1, Math.min(60, Number.isFinite(seconds) ? seconds : 5)) * 1000);
    return capture.result;
}

function restoreModelPerformancePlayer() {
    const capture = modelPerformanceCapture;
    if (!capture) return;
    if (capture.world !== worldName || isDying || deathScreenShown) {
        capture.aborted = 'World changed or player died';
        stopModelPerformanceCapture();
        return;
    }
    if (capture.options.holdPosition !== false && capture.playerState) {
        Object.assign(player, capture.playerState);
    }
}

function stopModelPerformanceCapture() {
    const capture = modelPerformanceCapture;
    if (!capture) return null;
    modelPerformanceCapture = null;
    clearTimeout(capture.timer);
    capture.renderer.render = capture.originalRender;
    window.checkMeshCollision = capture.originalCollision;
    window.getMeshGroundY = capture.originalGround;
    if (capture.avatar) {
        const { group, rig, visible, parts } = capture.avatar;
        delete group.userData.profileDefaultAvatar;
        if (group.userData.customAvatar === rig) {
            rig.root.visible = visible;
            parts.forEach(([part, wasVisible]) => { part.visible = wasVisible; });
        }
    }
    if (capture.options.holdPosition !== false && capture.world === worldName && capture.playerState) {
        Object.assign(player, capture.playerState);
    }
    performance.mark('supgalaxy-model-end');
    performance.measure('SupGalaxy model capture: ' + capture.label, 'supgalaxy-model-start', 'supgalaxy-model-end');
    performance.clearMarks('supgalaxy-model-start');
    performance.clearMarks('supgalaxy-model-end');
    const frames = capture.frames;
    const average = key => frames.length ? frames.reduce((sum, frame) => sum + frame[key], 0) / frames.length : 0;
    const times = frames.map(frame => frame.frameMs).sort((a, b) => a - b);
    const frameMs = average('frameMs');
    const report = {
        label: capture.label, options: { ...capture.options }, frames: frames.length,
        aborted: capture.aborted || null,
        durationMs: performance.now() - capture.started,
        fps: frameMs ? 1000 / frameMs : 0,
        meanFrameMs: frameMs, p95FrameMs: times[Math.min(times.length - 1, Math.floor(times.length * .95))] || 0,
        collisionMs: average('collisionMs'), groundMs: average('groundMs'),
        collisionQueries: average('collisionQueries'), groundQueries: average('groundQueries'),
        renderCpuMs: average('renderCpuMs'), triangles: average('triangles'), drawCalls: average('drawCalls'),
        geometries: capture.renderer.info.memory.geometries, textures: capture.renderer.info.memory.textures,
        player: typeof player === 'undefined' ? null : { x: player.x, y: player.y, z: player.z },
        cameraMode: typeof cameraMode === 'undefined' ? null : cameraMode,
        hasCustomAvatar: typeof avatarGroup !== 'undefined' && !!avatarGroup.userData.customAvatar,
        stones: typeof magicianStones === 'undefined' ? [] : Object.values(magicianStones).map(stone => ({
            x: stone.x, y: stone.y, z: stone.z,
            collisionStatus: stone.collisionStatus, settings: getStonePerformanceSettings(stone)
        }))
    };
    console.table([report]);
    capture.resolve(report);
    return report;
}

async function compareModelPerformance(options = {}) {
    const reports = [];
    // Keep the player still; repeat once nearby and once on the model.
    for (const collision of [true, false]) {
        for (const avatar of ['imported', 'default']) {
            for (const animation of [true, false]) {
                reports.push(await startModelPerformanceCapture({
                    ...options, collision, avatar, animation,
                    label: (options.label || 'comparison') + ` / collision=${collision} / ${avatar} / animation=${animation}`
                }));
                if (reports[reports.length - 1].aborted) return reports;
            }
        }
    }
    console.table(reports);
    return reports;
}
