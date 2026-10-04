/* Frozen import-pose colliders: staging never falls back to render-mesh raycasting. */
(function(global) {
    'use strict';
    const scriptUrl = document.currentScript && document.currentScript.src;
    const workerUrl = new URL('stone-collision-worker.js', scriptUrl || new URL('js/stone-collision.js', document.baseURI)).href;
    const loads = new Map();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const triangle = new THREE.Triangle(), ray = new THREE.Ray();
    const hit = new THREE.Vector3(), normal = new THREE.Vector3();
    function beginLoad(key, world, loading) {
        const token = { key, world, loading };
        loads.set(key, token);
        return token;
    }
    function isLoadCurrent(token, world, loading) {
        return loads.get(token.key) === token && token.world === world &&
            token.loading === loading && loading.has(token.key);
    }
    function endLoad(token) {
        if (loads.get(token.key) === token) {
            loads.delete(token.key);
            token.loading.delete(token.key);
        }
    }
    function dispose(stone, key) {
        if (key !== undefined) {
            const token = loads.get(key);
            if (token) endLoad(token);
        }
        if (!stone) return;
        if (stone._collisionJob) {
            stone._collisionJob.cancel();
            stone._collisionJob = null;
        }
        stone.collisionIndex = null;
        stone.collisionStatus = 'disposed';
    }
    function snapshot(root) {
        root.updateMatrixWorld(true);
        const meshes = [];
        root.traverse(mesh => {
            if (!mesh.isMesh || !mesh.geometry || !mesh.geometry.attributes.position) return;
            const geometry = mesh.geometry, position = geometry.attributes.position;
            const count = geometry.index ? geometry.index.count : position.count;
            const start = Math.max(0, geometry.drawRange.start);
            const end = Math.min(count, start + geometry.drawRange.count);
            const record = {
                geometry, matrix: mesh.matrixWorld.clone(),
                normalMatrix: new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),
                influences: (mesh.morphTargetInfluences || []).slice(),
                materialArray: Array.isArray(mesh.material),
                materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material ? material.side : THREE.FrontSide),
                groups: geometry.groups.map(group => ({ ...group })),
                mirrored: mesh.matrixWorld.determinant() < 0,
                start, end, cursor: start
            };
            if (mesh.isSkinnedMesh) {
                mesh.skeleton.update();
                record.bones = mesh.skeleton.boneMatrices.slice();
                record.bind = mesh.bindMatrix.clone();
                record.bindInverse = mesh.bindMatrixInverse.clone();
            }
            meshes.push(record);
        });
        return meshes;
    }
    const vertex = new THREE.Vector3(), morph = new THREE.Vector3(), base = new THREE.Vector3();
    const skin = new THREE.Vector3(), boneVertex = new THREE.Vector3(), boneMatrix = new THREE.Matrix4();
    function readVertex(record, id, target) {
        const geometry = record.geometry;
        target.fromBufferAttribute(geometry.attributes.position, id);
        base.copy(target);
        const morphs = geometry.morphAttributes.position || [];
        for (let i = 0; i < morphs.length; i++) {
            const weight = record.influences[i] || 0;
            if (!weight) continue;
            morph.fromBufferAttribute(morphs[i], id);
            if (!geometry.morphTargetsRelative) morph.sub(base);
            target.addScaledVector(morph, weight);
        }
        if (record.bones) {
            vertex.copy(target).applyMatrix4(record.bind);
            skin.set(0, 0, 0);
            const indices = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
            const getters = ['getX', 'getY', 'getZ', 'getW'];
            for (const getter of getters) {
                const weight = weights[getter](id);
                if (!weight) continue;
                boneMatrix.fromArray(record.bones, indices[getter](id) * 16);
                boneVertex.copy(vertex).applyMatrix4(boneMatrix);
                skin.addScaledVector(boneVertex, weight);
            }
            target.copy(skin).applyMatrix4(record.bindInverse);
        }
        return target;
    }
    function prepare(stone, root = stone.mesh) {
        dispose(stone);
        if (stone.collision === false || stone.collisionMode === 'none') {
            stone.collisionStatus = 'disabled';
            return Promise.resolve(null);
        }
        stone.collisionStatus = 'preparing';
        stone.collisionError = null;
        return new Promise(resolve => {
            let worker = null, timer = null, finished = false, records = null;
            let triangles = null, sides = null, normalY = null, used = 0, meshIndex = 0;
            const job = {
                cancel() {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timer);
                    if (worker) worker.terminate();
                    records = triangles = sides = normalY = null;
                    resolve(null);
                }
            };
            stone._collisionJob = job;
            function fail(error) {
                if (finished) return;
                stone.collisionStatus = 'unavailable';
                stone.collisionError = error.message || String(error);
                console.warn('[StoneCollision] Collision unavailable:', stone.collisionError);
                job.cancel();
                stone._collisionJob = null;
            }
            try {
                if (typeof Worker !== 'function') throw new Error('Web Workers are unavailable; static collision disabled');
                worker = new Worker(workerUrl);
                worker.onerror = event => fail(new Error(event.message || 'Collision worker failed'));
                worker.onmessage = event => {
                    if (finished) return;
                    if (event.data.error) return fail(new Error(event.data.error));
                    const index = event.data;
                    index.worldBounds = new THREE.Box3();
                    if (index.order.length) {
                        index.worldBounds.min.fromArray(index.bounds, 0);
                        index.worldBounds.max.fromArray(index.bounds, 3);
                    }
                    stone.collisionIndex = index;
                    stone.collisionStatus = 'ready';
                    job.cancel();
                    stone._collisionJob = null;
                };
                records = snapshot(root);
                const count = records.reduce((sum, record) => sum + Math.floor((record.end - record.start) / 3), 0);
                triangles = new Float64Array(count * 9);
                sides = new Int8Array(count);
                normalY = new Float32Array(count);
                function stage() {
                    if (finished) return;
                    try {
                        const deadline = performance.now() + 6;
                        let processed = 0;
                        while (meshIndex < records.length && processed < 1024 && performance.now() < deadline) {
                            const record = records[meshIndex], geometry = record.geometry;
                            if (record.cursor + 2 >= record.end) { meshIndex++; continue; }
                            const cursor = record.cursor;
                            record.cursor += 3;
                            processed++;
                            let side = record.materials[0];
                            if (record.materialArray) {
                                const group = record.groups.find(group => cursor >= group.start && cursor + 2 < group.start + group.count);
                                if (!group) continue;
                                side = record.materials[group.materialIndex];
                                if (side === undefined) continue;
                            }
                            readVertex(record, geometry.index ? geometry.index.getX(cursor) : cursor, a);
                            readVertex(record, geometry.index ? geometry.index.getX(cursor + 1) : cursor + 1, b);
                            readVertex(record, geometry.index ? geometry.index.getX(cursor + 2) : cursor + 2, c);
                            triangle.set(a, b, c).getNormal(normal).applyMatrix3(record.normalMatrix).normalize();
                            normalY[used] = normal.y;
                            a.applyMatrix4(record.matrix); b.applyMatrix4(record.matrix); c.applyMatrix4(record.matrix);
                            if (![a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z].every(Number.isFinite)) continue;
                            a.toArray(triangles, used * 9); b.toArray(triangles, used * 9 + 3); c.toArray(triangles, used * 9 + 6);
                            // Mirrored world winding reverses culling; normalMatrix retains the authored outward normal.
                            sides[used] = record.mirrored && side !== THREE.DoubleSide ?
                                (side === THREE.BackSide ? THREE.FrontSide : THREE.BackSide) : side;
                            used++;
                        }
                        if (meshIndex < records.length) timer = setTimeout(stage, 0);
                        else {
                            records = null;
                            if (used !== sides.length) {
                                triangles = triangles.slice(0, used * 9); sides = sides.slice(0, used); normalY = normalY.slice(0, used);
                            }
                            worker.postMessage({ triangles, sides, normalY }, [triangles.buffer, sides.buffer, normalY.buffer]);
                            triangles = sides = normalY = null;
                        }
                    } catch (error) { fail(error); }
                }
                timer = setTimeout(stage, 0);
            } catch (error) { fail(error); }
        }).then(() => stone.collisionStatus === 'ready' ? stone.collisionIndex : null);
    }
    function walk(index, testBounds, testTriangle) {
        if (!index || !index.order.length) return false;
        const stack = [0];
        while (stack.length) {
            const node = stack.pop(), offset = node * 4;
            if (!testBounds(index.bounds, node * 6)) continue;
            if (index.nodes[offset] >= 0) {
                stack.push(index.nodes[offset], index.nodes[offset + 1]);
            } else {
                const end = index.nodes[offset + 2] + index.nodes[offset + 3];
                for (let i = index.nodes[offset + 2]; i < end; i++) {
                    const id = index.order[i], t = id * 9;
                    a.fromArray(index.triangles, t); b.fromArray(index.triangles, t + 3); c.fromArray(index.triangles, t + 6);
                    if (testTriangle(id)) return true;
                }
            }
        }
        return false;
    }
    function intersectsBox(index, box) {
        return walk(index, (bounds, offset) =>
            bounds[offset] <= box.max.x && bounds[offset + 3] >= box.min.x &&
            bounds[offset + 1] <= box.max.y && bounds[offset + 4] >= box.min.y &&
            bounds[offset + 2] <= box.max.z && bounds[offset + 5] >= box.min.z,
        () => box.intersectsTriangle(triangle.set(a, b, c)));
    }
    function groundY(index, x, z, topY, minY) {
        let highest = null;
        ray.origin.set(x, topY, z); ray.direction.set(0, -1, 0);
        walk(index, (bounds, offset) =>
            x >= bounds[offset] && x <= bounds[offset + 3] && z >= bounds[offset + 2] && z <= bounds[offset + 5] &&
            bounds[offset + 1] <= topY && bounds[offset + 4] >= (highest === null ? minY : highest),
        id => {
            if (index.normalY[id] <= 0) return false;
            const side = index.sides[id];
            const result = side === THREE.BackSide ? ray.intersectTriangle(c, b, a, true, hit) :
                ray.intersectTriangle(a, b, c, side !== THREE.DoubleSide, hit);
            if (result && hit.y >= minY && hit.y <= topY && (highest === null || hit.y > highest)) highest = hit.y;
            return false;
        });
        return highest;
    }
    global.StoneCollision = { prepare, dispose, intersectsBox, groundY, beginLoad, isLoadCurrent, endLoad };
    global.runStoneCollisionTests = async function() {
        const results = [], stones = [];
        const assert = (condition, name) => {
            if (!condition) throw new Error('Stone collision test failed: ' + name);
            results.push(name);
        };
        const near = (actual, expected) => actual !== null && Math.abs(actual - expected) < 1e-5;
        function mesh(vertices, indexed = false, side = THREE.DoubleSide) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            if (indexed) geometry.setIndex(vertices.map((value, i) => i).slice(0, vertices.length / 3));
            return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side }));
        }
        async function build(root) {
            const stone = { mesh: root };
            stones.push(stone);
            const promise = prepare(stone);
            assert(stone.collisionStatus === 'preparing' && !stone.collisionIndex, 'no collision while preparing');
            await promise;
            assert(stone.collisionStatus === 'ready', 'worker preparation ready');
            return stone.collisionIndex;
        }
        const floor = [-2, 0, -2, -2, 0, 2, 2, 0, -2, 2, 0, -2, -2, 0, 2, 2, 0, 2];
        try {
            for (const indexed of [false, true]) {
                const root = mesh(floor, indexed);
                const buffer = root.geometry.attributes.position.array.buffer;
                const index = await build(root);
                assert(buffer.byteLength > 0, 'render buffers not transferred');
                assert(near(groundY(index, 0, 0, 2, -1), 0), (indexed ? 'indexed' : 'non-indexed') + ' ground');
                assert(intersectsBox(index, new THREE.Box3(new THREE.Vector3(-0.1, -0.1, -0.1), new THREE.Vector3(0.1, 0.1, 0.1))), 'body triangle hit');
                assert(!intersectsBox(index, new THREE.Box3(new THREE.Vector3(3, -0.1, 3), new THREE.Vector3(4, 0.1, 4))), 'body empty space');
            }
            const slope = await build(mesh([-2, -1, -2, -2, -1, 2, 2, 1, -2]));
            assert(near(groundY(slope, -0.5, -0.5, 3, -2), -0.25), 'upward slope normal');
            const underside = await build(mesh([-2, 1, -2, 2, 1, -2, -2, 1, 2]));
            assert(groundY(underside, -0.5, -0.5, 3, -2) === null, 'overhang underside rejected');
            const holed = new THREE.Group();
            const left = mesh(floor); left.scale.x = 0.25; left.position.x = -1.5; holed.add(left);
            const right = mesh(floor); right.scale.x = 0.25; right.position.x = 1.5; holed.add(right);
            const holeIndex = await build(holed);
            assert(groundY(holeIndex, 0, 0, 3, -1) === null && near(groundY(holeIndex, 1.5, 0, 3, -1), 0), 'holes remain empty');
            const transformed = mesh(floor, true, THREE.FrontSide);
            transformed.position.set(5, 3, 7); transformed.scale.set(-2, 0.5, 3); transformed.rotation.y = 0.4;
            const transformedIndex = await build(transformed);
            assert(near(groundY(transformedIndex, 5, 7, 5, 1), 3), 'transformed mirrored front-side model');
            assert(transformedIndex.worldBounds.containsPoint(new THREE.Vector3(5, 3, 7)), 'cached world bounds');
            assert(intersectsBox(transformedIndex, new THREE.Box3(new THREE.Vector3(4.9, 2.9, 6.9), new THREE.Vector3(5.1, 3.1, 7.1))), 'transformed mirrored body triangle');
            const tilted = mesh(floor, false, THREE.FrontSide);
            tilted.scale.set(2, 0.5, 3); tilted.rotation.z = 0.4; tilted.position.y = 2;
            const tiltedIndex = await build(tilted);
            assert(near(groundY(tiltedIndex, 0.5, 0, 5, -1), 2 + 0.5 * Math.tan(0.4)), 'nonuniform rotated slope normal');
            const back = await build(mesh(floor, false, THREE.BackSide));
            assert(groundY(back, 0, 0, 2, -1) === null, 'back-side culling');
            const grouped = mesh(floor);
            grouped.material = [grouped.material];
            grouped.geometry.addGroup(0, 3, 0);
            const groupedIndex = await build(grouped);
            assert(near(groundY(groupedIndex, -1, -1, 2, -1), 0) && groundY(groupedIndex, 1, 1, 2, -1) === null, 'material groups exclude undrawn triangles');
            const dynamic = mesh(floor);
            dynamic.geometry.morphTargetsRelative = true;
            dynamic.geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(floor.map((value, i) => i % 3 === 1 ? 2 : 0), 3)];
            dynamic.updateMorphTargets(); dynamic.morphTargetInfluences[0] = 0.5;
            const dynamicStone = { mesh: dynamic }; stones.push(dynamicStone);
            const frozenPromise = prepare(dynamicStone);
            dynamic.morphTargetInfluences[0] = 1; dynamic.position.y = 8;
            const frozen = await frozenPromise;
            assert(near(groundY(frozen, 0, 0, 3, -1), 1), 'morph and transform snapshot independent of animation');
            const skinSource = mesh(floor);
            const skinned = new THREE.SkinnedMesh(skinSource.geometry, skinSource.material);
            skinned.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(6 * 4), 4));
            const weights = new Float32Array(6 * 4);
            for (let i = 0; i < 6; i++) weights[i * 4] = 1;
            skinned.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
            const bone = new THREE.Bone(); skinned.add(bone); skinned.bind(new THREE.Skeleton([bone]));
            bone.position.y = 2;
            const skinStone = { mesh: skinned }; stones.push(skinStone);
            const skinPromise = prepare(skinStone);
            bone.position.y = 6; skinned.updateMatrixWorld(true);
            const skinIndex = await skinPromise;
            assert(near(groundY(skinIndex, 0, 0, 4, -1), 2), 'skinned import-pose snapshot');
            const large = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 150, 150), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
            large.rotation.x = -Math.PI / 2;
            const largeIndex = await build(large);
            assert(largeIndex.nodes.length > 4 && largeIndex.order.length === 45000, 'large geometry has real spatial BVH');
            assert(near(groundY(largeIndex, 12.3, 19.2, 5, -1), 0), 'large indexed ground query');
            let referenceMatches = true;
            const referenceBox = new THREE.Box3(), referenceTriangle = new THREE.Triangle();
            for (let sample = 0; sample < 24; sample++) {
                const x = Math.sin(sample * 2.7) * 55, z = Math.cos(sample * 1.9) * 55;
                referenceBox.min.set(x, sample % 2 ? 0.2 : -0.1, z);
                referenceBox.max.set(x + 0.4, sample % 2 ? 0.4 : 0.1, z + 0.4);
                let referenceHit = false;
                for (let t = 0; t < largeIndex.triangles.length; t += 9) {
                    referenceTriangle.a.fromArray(largeIndex.triangles, t);
                    referenceTriangle.b.fromArray(largeIndex.triangles, t + 3);
                    referenceTriangle.c.fromArray(largeIndex.triangles, t + 6);
                    if (referenceBox.intersectsTriangle(referenceTriangle)) { referenceHit = true; break; }
                }
                if (intersectsBox(largeIndex, referenceBox) !== referenceHit) referenceMatches = false;
            }
            assert(referenceMatches, 'BVH matches triangle reference across 24 body probes');
            const cancelled = { mesh: mesh(floor) }; stones.push(cancelled);
            const cancelledPromise = prepare(cancelled); dispose(cancelled);
            await cancelledPromise;
            assert(cancelled.collisionStatus === 'disposed' && !cancelled.collisionIndex, 'async collection cleanup');
            const building = { mesh: mesh(floor) }; stones.push(building);
            const buildingPromise = prepare(building);
            await new Promise(resolve => setTimeout(resolve, 0)); dispose(building);
            await buildingPromise;
            assert(building.collisionStatus === 'disposed' && !building.collisionIndex, 'async worker cleanup');
            const loading = new Set(['test']);
            const old = beginLoad('test', 'world-a', loading);
            assert(!isLoadCurrent(old, 'world-b', loading), 'world switch invalidates load');
            const replacement = beginLoad('test', 'world-a', loading);
            assert(!isLoadCurrent(old, 'world-a', loading) && isLoadCurrent(replacement, 'world-a', loading), 'replacement invalidates stale load');
            dispose(null, 'test');
            assert(!isLoadCurrent(replacement, 'world-a', loading), 'removed pending load cannot resurrect');
            const disabled = { mesh: mesh(floor), collisionMode: 'none' }; stones.push(disabled);
            await prepare(disabled);
            assert(disabled.collisionStatus === 'disabled' && !disabled.collisionIndex, 'none collision mode');
            console.info('[StoneCollision] ' + results.length + ' checks passed', results);
            return { passed: results.length, results };
        } finally {
            for (const stone of stones) {
                dispose(stone);
                stone.mesh.traverse(object => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        for (const material of (Array.isArray(object.material) ? object.material : [object.material])) material.dispose();
                    }
                });
            }
        }
    };
})(window);
