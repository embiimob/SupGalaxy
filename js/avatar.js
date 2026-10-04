// Custom player avatars.
// Supports Mixamo-style rigged .glb/.gltf models (e.g. objkt.com NFTs) and MagicaVoxel .vox models.
// Models are fitted to the player's ~2 block height, wired to walk/idle/attack/head-pitch
// animations, synced to peers via "avatar_update" messages and stored in session saves (profile.avatar).

var AVATAR_HEIGHT = 1.8,
    AVATAR_MAX_WIDTH = 2.4,
    AVATAR_MAX_BYTES = 32 * 1024 * 1024,
    AVATAR_MAX_URL_LENGTH = 600,
    AVATAR_FORMATS = ['glb', 'gltf', 'vox'],
    AVATAR_STORAGE_PREFIX = 'supgalaxy_avatar_',
    AVATAR_SAMPLE_SOURCE = 'https://objkt.com/tokens/KT1K1SVcUwH9LQgwMLmGSae6kNu7FP6a1mNW/0',
    OBJKT_CONTRACT_ALIASES = {
        hicetnunc: 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton'
    },
    localAvatarConfig = null,
    localAvatarDirty = false,
    remoteAvatarConfigs = new Map(),
    avatarBufferCache = new Map(),
    avatarSourceCache = new Map(),
    activeCustomAvatars = new Set(),
    avatarPreview = null;

function avatarNoopRaycast() { }

function cleanAvatarString(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeAvatarConfig(config) {
    if (!config || typeof config !== 'object') return null;
    const url = cleanAvatarString(config.url, AVATAR_MAX_URL_LENGTH + 1);
    if (!url || url.length > AVATAR_MAX_URL_LENGTH) return null;
    if (!/^IPFS:[A-Za-z0-9]{20,}/.test(url) && !/^https:\/\/[^\s]+$/i.test(url)) return null;
    const format = typeof config.format === 'string' && AVATAR_FORMATS.includes(config.format.toLowerCase()) ? config.format.toLowerCase() : null;
    const color = typeof config.color === 'string' && /^#[0-9a-f]{6}$/i.test(config.color) ? config.color.toLowerCase() : null;
    return {
        url: url,
        format: format,
        source: cleanAvatarString(config.source, AVATAR_MAX_URL_LENGTH) || url,
        name: cleanAvatarString(config.name, 80),
        wireframe: config.wireframe === true,
        color: color
    };
}

function sameAvatarConfig(a, b) {
    return JSON.stringify(a || null) === JSON.stringify(b || null);
}

function parseAvatarIpfsReference(value) {
    const match = String(value || '').trim().match(/^(?:ipfs:\/\/(?:ipfs\/)?|IPFS:)([A-Za-z0-9]{20,})(?:[\\\/]+(.*))?$/i);
    if (!match) return null;
    const path = (match[2] || '').split(/[?#]/, 1)[0].replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return { hash: match[1], path: path || null };
}

function detectAvatarFormat(path, mime) {
    const mimeType = String(mime || '').toLowerCase();
    if (mimeType.includes('gltf-binary')) return 'glb';
    if (mimeType.includes('gltf')) return 'gltf';
    if (mimeType.includes('vox')) return 'vox';
    const cleanPath = String(path || '').split(/[?#]/, 1)[0];
    const extension = (cleanPath.match(/\.([a-z0-9]+)$/i) || [])[1];
    return extension && AVATAR_FORMATS.includes(extension.toLowerCase()) ? extension.toLowerCase() : null;
}

function sniffAvatarFormat(buffer) {
    if (!buffer || buffer.byteLength < 4) return null;
    const head = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 4));
    if (head === 'glTF') return 'glb';
    if (head === 'VOX ') return 'vox';
    if (head.trim().charAt(0) === '{') return 'gltf';
    return null;
}

function toAvatarUrl(uri) {
    const ipfs = parseAvatarIpfsReference(uri);
    if (ipfs) return 'IPFS:' + ipfs.hash + (ipfs.path ? '/' + ipfs.path : '');
    return /^https:\/\//i.test(uri || '') ? uri : null;
}

function pickTokenModelUri(metadata) {
    const formats = Array.isArray(metadata && metadata.formats) ? metadata.formats : [];
    const modelFormat = formats.find(f => f && f.uri && /model|gltf|vox/i.test(f.mimeType || ''));
    if (modelFormat) return { uri: modelFormat.uri, mime: modelFormat.mimeType };
    const artifactUri = metadata && (metadata.artifactUri || metadata.artifact_uri);
    if (!artifactUri) return null;
    const artifactFormat = formats.find(f => f && f.uri === artifactUri);
    return { uri: artifactUri, mime: (artifactFormat && artifactFormat.mimeType) || metadata.mime || '' };
}

async function resolveObjktToken(contract, tokenId) {
    let picked = null,
        name = '';
    try {
        const response = await fetch('https://api.tzkt.io/v1/tokens?contract=' + encodeURIComponent(contract) + '&tokenId=' + encodeURIComponent(tokenId) + '&select=metadata');
        if (response.ok) {
            const rows = await response.json();
            const metadata = Array.isArray(rows) ? rows[0] : null;
            picked = pickTokenModelUri(metadata);
            name = metadata && metadata.name ? String(metadata.name) : '';
        }
    } catch (e) {
        console.warn('[Avatar] TzKT token lookup failed:', e);
    }
    if (!picked) {
        try {
            const response = await fetch('https://data.objkt.com/v3/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'query($c:String!,$t:String!){token(where:{fa_contract:{_eq:$c},token_id:{_eq:$t}}){name artifact_uri mime}}',
                    variables: { c: contract, t: String(tokenId) }
                })
            });
            if (response.ok) {
                const json = await response.json();
                const token = json && json.data && Array.isArray(json.data.token) ? json.data.token[0] : null;
                if (token && token.artifact_uri) {
                    picked = { uri: token.artifact_uri, mime: token.mime || '' };
                    name = token.name || name;
                }
            }
        } catch (e) {
            console.warn('[Avatar] objkt token lookup failed:', e);
        }
    }
    const url = picked ? toAvatarUrl(picked.uri) : null;
    if (!url) throw new Error('Could not find a model file in that objkt token');
    return { url: url, format: detectAvatarFormat(picked.uri, picked.mime), name: name };
}

function resolveAvatarSource(input) {
    const raw = String(input || '').trim();
    if (!raw) return Promise.reject(new Error('Enter a model source'));
    if (raw.length > AVATAR_MAX_URL_LENGTH) return Promise.reject(new Error('Source is too long'));
    if (avatarSourceCache.has(raw)) return avatarSourceCache.get(raw);
    let promise;
    const objkt = raw.match(/objkt\.com\/(?:tokens|asset)\/([A-Za-z0-9_-]+)\/(\d+)/i);
    if (objkt) {
        const contract = OBJKT_CONTRACT_ALIASES[objkt[1].toLowerCase()] || objkt[1];
        promise = /^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(contract) ? resolveObjktToken(contract, objkt[2]) : Promise.reject(new Error('Unsupported objkt contract'));
    } else {
        const url = toAvatarUrl(raw);
        promise = url ? Promise.resolve({ url: url, format: detectAvatarFormat(raw), name: '' }) : Promise.reject(new Error('Use an objkt.com token URL, IPFS:CID, ipfs:// or https:// link'));
    }
    avatarSourceCache.set(raw, promise);
    promise.catch(() => avatarSourceCache.delete(raw));
    return promise;
}

async function readAvatarResponse(response) {
    if (!response || !response.ok) throw new Error('Model download failed');
    const length = parseInt(response.headers.get('content-length') || '0', 10);
    if (length > AVATAR_MAX_BYTES) throw new Error('Model is too large');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > AVATAR_MAX_BYTES) throw new Error('Model is too large');
    return buffer;
}

function fetchAvatarBuffer(url) {
    if (avatarBufferCache.has(url)) return avatarBufferCache.get(url);
    const promise = (async () => {
        const ipfs = parseAvatarIpfsReference(url);
        if (!ipfs) return readAvatarResponse(await fetch(url));
        const attempts = ipfs.path ? [ipfs.path, null] : [null];
        let lastError = null;
        for (const path of attempts) {
            try {
                return await readAvatarResponse(await fetchIPFSWithFallback(ipfs.hash, path));
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError || new Error('IPFS download failed');
    })();
    avatarBufferCache.set(url, promise);
    promise.catch(() => avatarBufferCache.delete(url));
    return promise;
}

// Wraps a model so it is centered on X/Z, stands on y=0, is AVATAR_HEIGHT tall and faces -Z (game forward).
function fitAvatarModel(model) {
    const fit = new THREE.Group();
    fit.add(model);
    fit.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fit);
    const size = box.getSize(new THREE.Vector3());
    if (!isFinite(size.y) || size.y <= 0) throw new Error('Model has no visible geometry');
    const scale = Math.min(AVATAR_HEIGHT / size.y, AVATAR_MAX_WIDTH / Math.max(size.x, size.z, 1e-6));
    const center = box.getCenter(new THREE.Vector3());
    fit.scale.setScalar(scale);
    fit.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.PI;
    pivot.add(fit);
    pivot.updateMatrixWorld(true);
    return pivot;
}

function findAvatarBone(bones, patterns) {
    for (const pattern of patterns) {
        const bone = bones.find(b => pattern.test(b.name));
        if (bone) return bone;
    }
    return null;
}

function createBoneController(bone, lowerArm) {
    if (!bone) return null;
    const parentQ = bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    const parentInv = parentQ.clone().invert();
    const restQ = bone.quaternion.clone();
    let baseQ = restQ.clone();
    if (lowerArm) {
        const child = bone.children.find(c => c.isBone);
        if (child) {
            const start = bone.getWorldPosition(new THREE.Vector3());
            const dir = child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
            if (Math.abs(dir.y) < 0.6 && dir.lengthSq() > 0) {
                const target = new THREE.Vector3(Math.sign(dir.x) * 0.18, -1, 0).normalize();
                const lowerQ = new THREE.Quaternion().setFromUnitVectors(dir, target);
                baseQ = parentInv.clone().multiply(lowerQ).multiply(parentQ).multiply(restQ);
            }
        }
    }
    return {
        bone: bone,
        restQ: restQ,
        baseQ: baseQ,
        axisX: new THREE.Vector3(1, 0, 0).applyQuaternion(parentInv).normalize(),
        axisZ: new THREE.Vector3(0, 0, 1).applyQuaternion(parentInv).normalize()
    };
}

var avatarTmpQuat = new THREE.Quaternion();

// Rotates a bone about an avatar-space axis on top of its current (or base) pose.
function rotateAvatarBone(ctrl, axisName, angle, fromBase) {
    if (!ctrl) return;
    if (fromBase) ctrl.bone.quaternion.copy(ctrl.baseQ);
    if (angle) ctrl.bone.quaternion.premultiply(avatarTmpQuat.setFromAxisAngle(ctrl[axisName], angle));
}

function stripAvatarRootMotion(clip, rootName) {
    if (!rootName) return;
    for (const track of clip.tracks) {
        if (track.name !== rootName + '.position' || track.getValueSize() !== 3) continue;
        const values = track.values;
        for (let i = 3; i < values.length; i += 3) {
            values[i] = values[0];
            values[i + 2] = values[2];
        }
    }
}

function createGltfAvatarRig(gltf) {
    const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!model) throw new Error('Model has no scene');
    const bones = [];
    model.traverse(o => {
        if (o.isBone) bones.push(o);
        if (o.isSkinnedMesh) o.frustumCulled = false;
    });
    const root = fitAvatarModel(model);
    const rig = {
        root: root,
        pivot: root,
        mixer: null,
        walkAction: null,
        idleAction: null,
        walkWeight: 0,
        timeScale: 0,
        phase: 0,
        amplitude: 0,
        controllers: null
    };
    if (bones.length) {
        const c = {
            hips: findAvatarBone(bones, [/hips$/i, /pelvis$/i]),
            leftLeg: findAvatarBone(bones, [/left_?up_?leg$/i, /left_?thigh$/i, /thigh[._]?l$/i, /upper_?leg[._]?l$/i]),
            rightLeg: findAvatarBone(bones, [/right_?up_?leg$/i, /right_?thigh$/i, /thigh[._]?r$/i, /upper_?leg[._]?r$/i]),
            leftKnee: findAvatarBone(bones, [/left_?leg$/i, /left_?(calf|shin)$/i, /(calf|shin|lower_?leg)[._]?l$/i]),
            rightKnee: findAvatarBone(bones, [/right_?leg$/i, /right_?(calf|shin)$/i, /(calf|shin|lower_?leg)[._]?r$/i]),
            leftArm: findAvatarBone(bones, [/left_?arm$/i, /left_?upper_?arm$/i, /upper_?arm[._]?l$/i]),
            rightArm: findAvatarBone(bones, [/right_?arm$/i, /right_?upper_?arm$/i, /upper_?arm[._]?r$/i]),
            head: findAvatarBone(bones, [/head$/i, /neck$/i])
        };
        const animated = gltf.animations && gltf.animations.length > 0;
        const animatedNodes = new Set();
        if (animated) gltf.animations.forEach(clip => clip.tracks.forEach(track => animatedNodes.add(track.name.split('.')[0])));
        const needsLowering = bone => !!bone && !animatedNodes.has(bone.name);
        rig.controllers = {
            leftLeg: createBoneController(c.leftLeg),
            rightLeg: createBoneController(c.rightLeg),
            leftKnee: createBoneController(c.leftKnee),
            rightKnee: createBoneController(c.rightKnee),
            leftArm: createBoneController(c.leftArm, needsLowering(c.leftArm)),
            rightArm: createBoneController(c.rightArm, needsLowering(c.rightArm)),
            head: createBoneController(c.head)
        };
        if (!rig.controllers.leftLeg && !rig.controllers.rightLeg && !rig.controllers.leftArm && !rig.controllers.head) rig.controllers = null;
        const rootBone = c.hips || bones.find(b => !b.parent || !b.parent.isBone);
        if (animated) {
            const clips = gltf.animations;
            clips.forEach(clip => stripAvatarRootMotion(clip, rootBone && rootBone.name));
            const walkClip = clips.find(clip => /walk|run|jog|stride|locomot/i.test(clip.name)) || clips[0];
            const idleClip = clips.find(clip => clip !== walkClip && /idle|stand|breath|rest/i.test(clip.name)) || null;
            rig.mixer = new THREE.AnimationMixer(model);
            rig.walkAction = rig.mixer.clipAction(walkClip);
            rig.walkAction.play();
            rig.walkAction.setEffectiveTimeScale(0);
            if (idleClip) {
                rig.idleAction = rig.mixer.clipAction(idleClip);
                rig.idleAction.play();
                rig.walkAction.setEffectiveWeight(0);
            }
            rig.mixer.update(0);
        }
    }
    rig.update = function (dt, state) {
        const moving = !!state.moving;
        rig.amplitude += ((moving ? 1 : 0) - rig.amplitude) * Math.min(1, dt * 8);
        rig.phase += dt * (state.sprint ? 13 : 8) * rig.amplitude;
        const swing = Math.sin(rig.phase) * rig.amplitude;
        const ctrl = rig.controllers;
        if (rig.mixer) {
            const speed = state.sprint ? 1.6 : 1;
            if (rig.idleAction) {
                rig.walkWeight += ((moving ? 1 : 0) - rig.walkWeight) * Math.min(1, dt * 6);
                rig.walkAction.setEffectiveWeight(rig.walkWeight);
                rig.idleAction.setEffectiveWeight(1 - rig.walkWeight);
                rig.walkAction.setEffectiveTimeScale(speed);
            } else {
                rig.timeScale += ((moving ? speed : 0) - rig.timeScale) * Math.min(1, dt * 6);
                rig.walkAction.setEffectiveTimeScale(rig.timeScale < 0.02 ? 0 : rig.timeScale);
            }
            // Reset overlay bones first so additive pitch/attack never accumulates on bones the clip doesn't drive.
            if (ctrl) {
                [ctrl.head, ctrl.leftArm, ctrl.rightArm].forEach(c => c && c.bone.quaternion.copy(c.baseQ));
            }
            rig.mixer.update(dt);
            if (ctrl) {
                rotateAvatarBone(ctrl.head, 'axisX', clampAvatarPitch(state.pitch), false);
                if (state.attack >= 0) rotateAvatarBone(ctrl.rightArm, 'axisX', 1.6 * Math.sin(state.attack * Math.PI), false);
            }
        } else if (ctrl) {
            rotateAvatarBone(ctrl.leftLeg, 'axisX', 0.6 * swing, true);
            rotateAvatarBone(ctrl.rightLeg, 'axisX', -0.6 * swing, true);
            rotateAvatarBone(ctrl.leftKnee, 'axisX', -0.9 * Math.max(0, -swing), true);
            rotateAvatarBone(ctrl.rightKnee, 'axisX', -0.9 * Math.max(0, swing), true);
            rotateAvatarBone(ctrl.leftArm, 'axisX', -0.5 * swing, true);
            const attackSwing = state.attack >= 0 ? 1.6 * Math.sin(state.attack * Math.PI) : 0;
            rotateAvatarBone(ctrl.rightArm, 'axisX', 0.5 * swing + attackSwing, true);
            rotateAvatarBone(ctrl.head, 'axisX', clampAvatarPitch(state.pitch), true);
            rig.pivot.position.y = Math.abs(swing) * 0.04;
        } else {
            rig.pivot.position.y = Math.abs(swing) * 0.06;
            rig.pivot.rotation.z = swing * 0.06;
            rig.pivot.rotation.x = state.attack >= 0 ? -0.3 * Math.sin(state.attack * Math.PI) : 0;
        }
    };
    return rig;
}

function clampAvatarPitch(pitch) {
    return Math.max(-0.7, Math.min(0.7, (pitch || 0) * 0.7));
}

function buildGltfAvatarRig(buffer) {
    return new Promise((resolve, reject) => {
        new THREE.GLTFLoader().parse(buffer, '', gltf => {
            try {
                resolve(createGltfAvatarRig(gltf));
            } catch (e) {
                reject(e);
            }
        }, reject);
    });
}

var VOX_FACES = [
    { d: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { d: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
];

function parseVoxModel(buffer) {
    const view = new DataView(buffer);
    const readId = offset => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    if (buffer.byteLength < 20 || readId(0) !== 'VOX ') throw new Error('Not a MagicaVoxel file');
    let offset = 8,
        voxels = null,
        palette = null;
    while (offset + 12 <= buffer.byteLength) {
        const id = readId(offset),
            contentSize = view.getUint32(offset + 4, true),
            childrenSize = view.getUint32(offset + 8, true),
            content = offset + 12;
        if (content + contentSize > buffer.byteLength) break;
        if (id === 'MAIN') {
            offset = content + contentSize;
            continue;
        }
        if (id === 'XYZI' && !voxels) {
            const count = Math.min(view.getUint32(content, true), Math.floor((contentSize - 4) / 4));
            voxels = new Uint8Array(buffer, content + 4, count * 4);
        } else if (id === 'RGBA' && contentSize >= 1024) {
            palette = new Uint8Array(buffer, content, 1024);
        }
        offset = content + contentSize + childrenSize;
    }
    if (!voxels || !voxels.length) throw new Error('Voxel model is empty');
    return { voxels: voxels, palette: palette };
}

function voxPaletteColor(palette, index) {
    if (palette && index > 0) {
        const i = (index - 1) * 4;
        return [palette[i] / 255, palette[i + 1] / 255, palette[i + 2] / 255];
    }
    const color = new THREE.Color().setHSL((index * 0.618) % 1, 0.5, 0.55);
    return [color.r, color.g, color.b];
}

function buildVoxAvatarRig(buffer) {
    const parsed = parseVoxModel(buffer);
    const raw = parsed.voxels;
    const cells = new Map();
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    const keyOf = (x, y, z) => x + ',' + y + ',' + z;
    for (let i = 0; i < raw.length; i += 4) {
        // MagicaVoxel is Z-up; convert to Three.js Y-up.
        const x = raw[i], y = raw[i + 2], z = -raw[i + 1];
        cells.set(keyOf(x, y, z), { x: x, y: y, z: z, c: raw[i + 3], part: 'body' });
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const height = maxY - minY + 1,
        centerX = (minX + maxX + 1) / 2,
        centerZ = (minZ + maxZ + 1) / 2,
        legCut = minY + Math.round(height * 0.375),
        headCut = minY + Math.round(height * 0.75),
        segmented = height >= 6;
    const legBounds = { legL: [Infinity, -Infinity], legR: [Infinity, -Infinity] };
    if (segmented) {
        for (const cell of cells.values()) {
            if (cell.y < legCut) {
                cell.part = cell.x + 0.5 < centerX ? 'legL' : 'legR';
                legBounds[cell.part][0] = Math.min(legBounds[cell.part][0], cell.x);
                legBounds[cell.part][1] = Math.max(legBounds[cell.part][1], cell.x + 1);
            } else if (cell.y >= headCut) cell.part = 'head';
        }
    }
    const pivots = {
        body: [0, 0, 0],
        head: [centerX, headCut, centerZ],
        legL: [isFinite(legBounds.legL[0]) ? (legBounds.legL[0] + legBounds.legL[1]) / 2 : centerX, legCut, centerZ],
        legR: [isFinite(legBounds.legR[0]) ? (legBounds.legR[0] + legBounds.legR[1]) / 2 : centerX, legCut, centerZ]
    };
    const buffers = {};
    for (const cell of cells.values()) {
        const target = buffers[cell.part] || (buffers[cell.part] = { positions: [], normals: [], colors: [], indices: [] });
        const color = voxPaletteColor(parsed.palette, cell.c);
        const pivot = pivots[cell.part];
        for (const face of VOX_FACES) {
            const neighbor = cells.get(keyOf(cell.x + face.d[0], cell.y + face.d[1], cell.z + face.d[2]));
            if (neighbor && neighbor.part === cell.part) continue;
            const base = target.positions.length / 3;
            for (const corner of face.c) {
                target.positions.push(cell.x + corner[0] - pivot[0], cell.y + corner[1] - pivot[1], cell.z + corner[2] - pivot[2]);
                target.normals.push(face.d[0], face.d[1], face.d[2]);
                target.colors.push(color[0], color[1], color[2]);
            }
            target.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
    }
    const model = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const parts = {};
    for (const name in buffers) {
        const data = buffers[name];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
        geometry.setIndex(data.indices);
        const holder = new THREE.Group();
        holder.position.set(pivots[name][0], pivots[name][1], pivots[name][2]);
        holder.add(new THREE.Mesh(geometry, material));
        model.add(holder);
        parts[name] = holder;
    }
    const root = fitAvatarModel(model);
    const rig = { root: root, pivot: root, phase: 0, amplitude: 0 };
    // Parts live inside the PI-rotated pivot, so avatar-space X rotations are negated here.
    rig.update = function (dt, state) {
        rig.amplitude += ((state.moving ? 1 : 0) - rig.amplitude) * Math.min(1, dt * 8);
        rig.phase += dt * (state.sprint ? 13 : 8) * rig.amplitude;
        const swing = Math.sin(rig.phase) * rig.amplitude;
        if (parts.legL) parts.legL.rotation.x = -0.6 * swing;
        if (parts.legR) parts.legR.rotation.x = 0.6 * swing;
        if (parts.head) parts.head.rotation.x = -clampAvatarPitch(state.pitch);
        const attack = state.attack >= 0 ? Math.sin(state.attack * Math.PI) : 0;
        if (parts.body) parts.body.rotation.x = 0.25 * attack;
        rig.pivot.position.y = Math.abs(swing) * 0.05;
    };
    return rig;
}

function disposeAvatarTree(object) {
    const disposed = new Set();
    object.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const material of materials) {
            if (disposed.has(material)) continue;
            disposed.add(material);
            for (const key in material) {
                if (material[key] && material[key].isTexture) material[key].dispose();
            }
            material.dispose();
        }
    });
}

function applyAvatarWireframe(root, color) {
    const wireMaterial = new THREE.MeshBasicMaterial({ color: color || '#39ff6a', wireframe: true });
    const oldMaterials = new Set();
    root.traverse(o => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && oldMaterials.add(m));
        o.material = wireMaterial;
    });
    oldMaterials.forEach(material => {
        for (const key in material) {
            if (material[key] && material[key].isTexture) material[key].dispose();
        }
        material.dispose();
    });
}

async function buildAvatarRig(config) {
    const buffer = await fetchAvatarBuffer(config.url);
    const format = sniffAvatarFormat(buffer) || config.format || 'glb';
    const rig = format === 'vox' ? buildVoxAvatarRig(buffer) : await buildGltfAvatarRig(buffer);
    rig.format = format;
    if (config.wireframe) applyAvatarWireframe(rig.root, config.color);
    rig.root.traverse(o => {
        if (o.isMesh) o.raycast = avatarNoopRaycast;
    });
    rig.dispose = function () {
        if (rig.mixer) {
            rig.mixer.stopAllAction();
            rig.mixer.uncacheRoot(rig.mixer.getRoot());
        }
        if (rig.root.parent) rig.root.parent.remove(rig.root);
        disposeAvatarTree(rig.root);
    };
    return rig;
}

function setBoxAvatarVisible(group, visible) {
    const parts = group && group.userData.boxParts;
    if (parts) parts.forEach(part => { part.visible = visible; });
}

function detachCustomAvatar(group) {
    if (!group) return;
    group.userData.avatarToken = null;
    const rig = group.userData.customAvatar;
    if (rig) {
        rig.dispose();
        group.userData.customAvatar = null;
    }
    activeCustomAvatars.delete(group);
    setBoxAvatarVisible(group, true);
}

// Attaches the configured custom model to a player avatar group. Box parts stay as invisible hitboxes.
function applyCustomAvatarToGroup(group, config) {
    if (!group) return;
    detachCustomAvatar(group);
    if (!config) return;
    const token = {};
    group.userData.avatarToken = token;
    buildAvatarRig(config).then(rig => {
        if (group.userData.avatarToken !== token || !group.parent) {
            rig.dispose();
            return;
        }
        group.add(rig.root);
        group.userData.customAvatar = rig;
        setBoxAvatarVisible(group, false);
        activeCustomAvatars.add(group);
    }).catch(error => {
        console.warn('[Avatar] Failed to load avatar for ' + (group.userData.avatarUser || 'player') + ':', error);
        if (group === avatarGroup && typeof addMessage === 'function') addMessage('Avatar failed to load: ' + error.message, 3e3);
    });
}

function getAvatarConfigForUser(username, isLocal) {
    return isLocal ? localAvatarConfig : remoteAvatarConfigs.get(username) || null;
}

function updateCustomAvatars(dt, now, localMoving) {
    for (const group of activeCustomAvatars) {
        const rig = group.userData.customAvatar;
        if (!rig || !group.parent) {
            detachCustomAvatar(group);
            continue;
        }
        if (!group.visible) continue;
        let state;
        if (group === avatarGroup) {
            state = {
                moving: localMoving,
                sprint: isSprinting,
                pitch: player.pitch,
                attack: isAttacking ? Math.min(1, (now - attackStartTime) / 500) : -1
            };
        } else {
            const position = typeof userPositions !== 'undefined' ? userPositions[group.userData.avatarUser] : null;
            if (!position || position.isDying) continue;
            const attackElapsed = position.localAnimStartTime ? performance.now() - position.localAnimStartTime : -1;
            state = {
                moving: !!position.isMoving,
                sprint: false,
                pitch: position.targetPitch,
                attack: attackElapsed >= 0 && attackElapsed < 500 ? attackElapsed / 500 : -1
            };
        }
        rig.update(dt, state);
    }
}

function getAvatarSaveData() {
    return localAvatarConfig ? Object.assign({}, localAvatarConfig) : null;
}

function hasUnsavedAvatarChange() {
    return localAvatarDirty;
}

function markAvatarSaved() {
    localAvatarDirty = false;
    if (typeof updateSaveChangesButton === 'function') updateSaveChangesButton();
}

function storeAvatarLocally() {
    try {
        if (!userName) return;
        if (localAvatarConfig) localStorage.setItem(AVATAR_STORAGE_PREFIX + userName, JSON.stringify(localAvatarConfig));
        else localStorage.removeItem(AVATAR_STORAGE_PREFIX + userName);
    } catch (e) { }
}

function broadcastLocalAvatar(dataChannel) {
    if (typeof peers === 'undefined' || !userName) return;
    const message = JSON.stringify({ type: 'avatar_update', username: userName, avatar: isShareableAvatarConfig(localAvatarConfig) ? localAvatarConfig : null });
    if (dataChannel) {
        if (dataChannel.readyState === 'open') dataChannel.send(message);
        return;
    }
    for (const [name, peer] of peers.entries()) {
        if (name !== userName && peer.dc && peer.dc.readyState === 'open') peer.dc.send(message);
    }
}

// Sends this player's avatar (and, for hosts, every known remote avatar) to a newly opened data channel.
function sendAvatarsToPeer(dataChannel, peerName) {
    if (!dataChannel || dataChannel.readyState !== 'open') return;
    if (isShareableAvatarConfig(localAvatarConfig)) broadcastLocalAvatar(dataChannel);
    if (typeof isHost === 'undefined' || !isHost) return;
    for (const [name, config] of remoteAvatarConfigs.entries()) {
        if (name !== peerName && name !== userName) dataChannel.send(JSON.stringify({ type: 'avatar_update', username: name, avatar: config }));
    }
}

function isShareableAvatarConfig(config) {
    return !!config && /^IPFS:/.test(config.url);
}

function handleRemoteAvatarUpdate(username, avatar) {
    if (!username || username === userName) return;
    // Peers may only point at IPFS content so they cannot make other players contact arbitrary hosts.
    let config = sanitizeAvatarConfig(avatar);
    if (config && !isShareableAvatarConfig(config)) config = null;
    if (sameAvatarConfig(remoteAvatarConfigs.get(username) || null, config)) return;
    if (config) remoteAvatarConfigs.set(username, config);
    else remoteAvatarConfigs.delete(username);
    if (typeof playerAvatars !== 'undefined' && playerAvatars.has(username)) applyCustomAvatarToGroup(playerAvatars.get(username), config);
}

function setLocalAvatar(config, options) {
    const opts = options || {};
    const sanitized = sanitizeAvatarConfig(config);
    const changed = !sameAvatarConfig(localAvatarConfig, sanitized);
    localAvatarConfig = sanitized;
    storeAvatarLocally();
    if (!changed && !opts.force) return;
    if (avatarGroup) applyCustomAvatarToGroup(avatarGroup, localAvatarConfig);
    broadcastLocalAvatar();
    if (!opts.fromSave) {
        localAvatarDirty = true;
        if (typeof updateSaveChangesButton === 'function') updateSaveChangesButton();
    }
}

// Restores an avatar from a session save profile, falling back to the last avatar used by this user.
function restoreAvatarFromSave(savedAvatar) {
    let config = sanitizeAvatarConfig(savedAvatar);
    if (!config) {
        try {
            config = sanitizeAvatarConfig(JSON.parse(localStorage.getItem(AVATAR_STORAGE_PREFIX + userName) || 'null'));
        } catch (e) {
            config = null;
        }
    }
    localAvatarDirty = false;
    if (config) setLocalAvatar(config, { fromSave: true, force: true });
}

// ---------- Avatar dialog with live preview ----------

function createDefaultPreviewModel() {
    const group = new THREE.Group();
    const parts = avatarGroup && avatarGroup.userData.boxParts;
    if (!parts) return null;
    parts.forEach(part => {
        const clone = part.clone();
        clone.visible = true;
        clone.rotation.set(0, 0, 0);
        group.add(clone);
    });
    const pivot = new THREE.Group();
    pivot.add(group);
    return {
        root: pivot,
        shared: true,
        phase: 0,
        update: function (dt) {
            this.phase += dt * 8;
            const swing = 0.5 * Math.sin(this.phase);
            group.children[0].rotation.x = swing;
            group.children[1].rotation.x = -swing;
            group.children[4].rotation.x = -swing;
            group.children[5].rotation.x = swing;
        }
    };
}

function setAvatarStatus(text, isError) {
    const status = document.getElementById('avatarStatus');
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? '#ff8080' : '#bbb';
}

function setPreviewRig(rig) {
    if (!avatarPreview) {
        if (rig && !rig.shared) rig.dispose();
        return;
    }
    if (avatarPreview.rig) {
        if (avatarPreview.rig.shared) avatarPreview.turntable.remove(avatarPreview.rig.root);
        else avatarPreview.rig.dispose();
    }
    avatarPreview.rig = rig;
    if (rig) avatarPreview.turntable.add(rig.root);
}

function startAvatarPreview() {
    const canvas = document.getElementById('avatarPreviewCanvas');
    if (!canvas || avatarPreview) return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
        setAvatarStatus('Preview unavailable (WebGL)', true);
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 300, false);
    const previewScene = new THREE.Scene();
    const previewCamera = new THREE.PerspectiveCamera(35, (canvas.clientWidth || 300) / (canvas.clientHeight || 300), 0.1, 50);
    previewCamera.position.set(0, 1.3, 4.6);
    previewCamera.lookAt(0, 0.9, 0);
    previewScene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(3, 5, 4);
    previewScene.add(sun);
    const grid = new THREE.GridHelper(4, 4, 0x557799, 0x334455);
    previewScene.add(grid);
    const turntable = new THREE.Group();
    previewScene.add(turntable);
    avatarPreview = {
        renderer: renderer,
        scene: previewScene,
        camera: previewCamera,
        grid: grid,
        turntable: turntable,
        rig: null,
        frame: 0,
        last: performance.now()
    };
    const loop = now => {
        if (!avatarPreview) return;
        const dt = Math.min(0.06, (now - avatarPreview.last) / 1000);
        avatarPreview.last = now;
        turntable.rotation.y += dt * 0.7;
        if (avatarPreview.rig) avatarPreview.rig.update(dt, { moving: true, sprint: false, pitch: 0, attack: -1 });
        renderer.render(previewScene, previewCamera);
        avatarPreview.frame = requestAnimationFrame(loop);
    };
    avatarPreview.frame = requestAnimationFrame(loop);
}

function stopAvatarPreview() {
    if (!avatarPreview) return;
    cancelAnimationFrame(avatarPreview.frame);
    setPreviewRig(null);
    avatarPreview.grid.geometry.dispose();
    avatarPreview.grid.material.dispose();
    avatarPreview.renderer.dispose();
    avatarPreview.renderer.forceContextLoss();
    avatarPreview = null;
}

var avatarDialogConfig = null,
    avatarDialogRequest = 0;

function readAvatarDialogStyle() {
    return {
        wireframe: document.getElementById('avatarWireframe').checked,
        color: document.getElementById('avatarWireColor').value
    };
}

async function loadAvatarDialogPreview() {
    const request = ++avatarDialogRequest;
    const source = document.getElementById('avatarSourceInput').value.trim();
    if (!source) {
        avatarDialogConfig = null;
        setPreviewRig(createDefaultPreviewModel());
        setAvatarStatus('Default avatar');
        return null;
    }
    setAvatarStatus('Resolving model…');
    try {
        const resolved = await resolveAvatarSource(source);
        if (request !== avatarDialogRequest) return null;
        const style = readAvatarDialogStyle();
        const config = sanitizeAvatarConfig({
            url: resolved.url,
            format: resolved.format,
            source: source,
            name: resolved.name,
            wireframe: style.wireframe,
            color: style.wireframe ? style.color : null
        });
        if (!config) throw new Error('Unsupported model source');
        setAvatarStatus('Loading model…');
        const rig = await buildAvatarRig(config);
        if (request !== avatarDialogRequest) {
            rig.dispose();
            return null;
        }
        config.format = rig.format;
        avatarDialogConfig = config;
        setPreviewRig(rig);
        setAvatarStatus((config.name ? config.name + ' · ' : '') + config.format.toUpperCase() + (rig.mixer ? ' · animated' : rig.controllers ? ' · rigged' : '') + (isShareableAvatarConfig(config) ? '' : ' · https models are only visible to you; use IPFS/objkt to share'));
        return config;
    } catch (error) {
        if (request === avatarDialogRequest) {
            avatarDialogConfig = null;
            setAvatarStatus(error.message || 'Failed to load model', true);
        }
        return null;
    }
}

function openAvatarModal() {
    const modal = document.getElementById('avatarModal');
    if (!modal || !avatarGroup) return;
    isPromptOpen = true;
    if (typeof mouseLocked !== 'undefined' && mouseLocked && document.exitPointerLock) {
        document.exitPointerLock();
        mouseLocked = false;
    }
    modal.style.display = 'flex';
    document.getElementById('avatarSourceInput').value = localAvatarConfig ? localAvatarConfig.source : '';
    document.getElementById('avatarWireframe').checked = !!(localAvatarConfig && localAvatarConfig.wireframe);
    document.getElementById('avatarWireColor').value = (localAvatarConfig && localAvatarConfig.color) || '#39ff6a';
    avatarDialogConfig = null;
    startAvatarPreview();
    loadAvatarDialogPreview();
}

function closeAvatarModal() {
    avatarDialogRequest++;
    stopAvatarPreview();
    const modal = document.getElementById('avatarModal');
    if (modal) modal.style.display = 'none';
    isPromptOpen = false;
}

async function applyAvatarDialog() {
    const source = document.getElementById('avatarSourceInput').value.trim();
    let config = avatarDialogConfig;
    if (source && (!config || config.source !== source)) config = await loadAvatarDialogPreview();
    if (source && !config) return;
    setLocalAvatar(source ? config : null);
    addMessage(source ? 'Avatar updated' : 'Default avatar restored', 2e3);
    closeAvatarModal();
}

function initAvatarUI() {
    const button = document.getElementById('avatarBtn');
    if (!button) return;
    button.addEventListener('click', function () {
        openAvatarModal();
        this.blur();
    });
    document.getElementById('avatarLoadBtn').addEventListener('click', loadAvatarDialogPreview);
    document.getElementById('avatarSourceInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') loadAvatarDialogPreview();
        if (e.key === 'Escape') closeAvatarModal();
    });
    document.getElementById('avatarWireframe').addEventListener('change', loadAvatarDialogPreview);
    document.getElementById('avatarWireColor').addEventListener('change', () => {
        if (document.getElementById('avatarWireframe').checked) loadAvatarDialogPreview();
    });
    document.getElementById('avatarSampleLink').addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('avatarSourceInput').value = AVATAR_SAMPLE_SOURCE;
        loadAvatarDialogPreview();
    });
    document.getElementById('avatarResetBtn').addEventListener('click', () => {
        document.getElementById('avatarSourceInput').value = '';
        loadAvatarDialogPreview();
    });
    document.getElementById('avatarCancelBtn').addEventListener('click', closeAvatarModal);
    document.getElementById('avatarApplyBtn').addEventListener('click', applyAvatarDialog);
}

initAvatarUI();
