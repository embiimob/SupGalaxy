var peers = new Map,
    pendingOffers = [],
    connectionAttempts = new Map;
window.hasPolledHost = !1;
var knownServers = [],
    isHost = !1,
    isConnecting = !1,
    answerPollingIntervals = new Map,
    offerPollingIntervals = new Map,
    localAudioStream = null,
    userAudioStreams = new Map,
    localVideoStream = null,
    userVideoStreams = new Map;
let proximityVideoUsers = [],
    currentProximityVideoIndex = 0,
    lastProximityVideoChangeTime = 0;
var userPositions = {},
    playerAvatars = new Map,
    partialIPFSUpdates = new Map,
    syncedWorlds = new Set;

async function getTurnCredentials() {
    return console.log("[WebRTC] Using static TURN credentials: supgalaxy"), [{
        urls: "stun:supturn.com:3478"
    }, {
        urls: ["turn:supturn.com:3478?transport=udp", "turn:supturn.com:3478?transport=tcp", "turn:supturn.com:443?transport=tcp"],
        username: "supgalaxy",
        credential: "supgalaxy",
        credentialType: "password"
    }]
}
async function connectToServer(e, t, o) {
    if (peers.size >= MAX_PEERS) return addMessage("Cannot connect: too many peers.", 3e3), void console.log("[WebRTC] Connection failed: max peers reached");
    if (!knownServers.find((function (t) {
        return t.hostUser === e
    }))) return addMessage("No server found for " + e, 3e3), void console.log("[WebRTC] No server found for:", e);
    console.log("[WebRTC] Initiating connection to server:", e), connectionAttempts.set(e, Date.now());
    const a = await getTurnCredentials();
    var r = new RTCPeerConnection({
        iceServers: a
    });
    r.oniceconnectionstatechange = () => console.log(`[WebRTC] ICE state change for ${e}: ${r.iceConnectionState}`), localAudioStream && localAudioStream.getTracks().forEach((e => {
        r.addTrack(e, localAudioStream)
    })), r.ontrack = t => {
        const o = e;
        if ("audio" === t.track.kind) {
            if (!userAudioStreams.has(o)) {
                const e = new Audio;
                e.srcObject = t.streams[0], e.autoplay = !0, userAudioStreams.set(o, {
                    audio: e,
                    stream: t.streams[0]
                }), console.log(`[WebRTC] Received audio stream from ${o}`)
            }
        } else if ("video" === t.track.kind && !userVideoStreams.has(o)) {
            const e = document.createElement("video");
            e.srcObject = t.streams[0], e.autoplay = !0, e.playsInline = !0, e.style.display = "none", document.body.appendChild(e), userVideoStreams.set(o, {
                video: e,
                stream: t.streams[0]
            }), console.log(`[WebRTC] Received video stream from ${o}`)
        }
    };
    var s = r.createDataChannel("game");
    setupDataChannel(s, e);
    try {
        t = await r.createOffer();
        await r.setLocalDescription(t);
        var n = [];
        r.onicecandidate = function (e) {
            e.candidate && n.push(e.candidate)
        }, await new Promise((function (e) {
            r.onicegatheringstatechange = function () {
                "complete" === r.iceGatheringState && e()
            }
        }));
        var i = {
            world: worldName,
            user: userName,
            offer: r.localDescription,
            iceCandidates: n
        },
            c = new Blob([JSON.stringify(i)], {
                type: "application/json"
            }),
            l = URL.createObjectURL(c),
            d = document.createElement("a");
        d.href = l, d.download = `${worldName}_offer_${Date.now()}.json`, document.body.appendChild(d), d.click(), d.remove(), URL.revokeObjectURL(l);
        var p = "MCConn@" + e + "@" + worldName,
            m = await GetPublicAddressByKeyword(p);
        document.getElementById("joinScriptText").value = m ? m.trim().replace(/"|'/g, "") : p, document.getElementById("joinScriptModal").style.display = "block", document.getElementById("joinScriptModal").querySelector("h3").innerText = "Connect to Server", document.getElementById("joinScriptModal").querySelector("p").innerText = "Copy this address and paste it into a Sup!? message To: field, attach the JSON file, and click 📢 to connect to " + e + ". After sending, wait for host confirmation.", addMessage("Offer created for " + e + ". Send the JSON via Sup!? and wait for host to accept.", 1e4), peers.set(e, {
            pc: r,
            dc: s,
            address: null
        });
        var f = "MCAnswer@" + userName + "@" + worldName;
        answerPollingIntervals.set(f, setInterval((function () {
            if (worker.postMessage({
                type: "poll",
                chunkKeys: [],
                masterKey: MASTER_WORLD_KEY,
                userAddress: userAddress,
                worldName: worldName,
                serverKeyword: "MCServerJoin@" + worldName,
                offerKeyword: null,
                answerKeywords: [f],
                userName: userName
            }), Date.now() - connectionAttempts.get(e) > 18e5) {
                console.log("[WebRTC] Answer polling timeout for:", e), addMessage("Connection to " + e + " timed out after 30 minutes.", 5e3), clearInterval(answerPollingIntervals.get(f)), answerPollingIntervals.delete(f);
                var t = peers.get(e);
                t && t.pc && t.pc.close(), peers.delete(e), playerAvatars.has(e) && (scene.remove(playerAvatars.get(e)), disposeObject(playerAvatars.get(e)), playerAvatars.delete(e)), delete userPositions[e], updateHudButtons()
            }
        }), 3e4))
    } catch (t) {
        console.error("[WebRTC] Failed to create offer for:", e, "error:", t), addMessage("Failed to connect to " + e, 3e3), r.close(), peers.delete(e), clearInterval(answerPollingIntervals.get("MCAnswer@" + userName + "@" + worldName)), answerPollingIntervals.delete("MCAnswer@" + userName + "@" + worldName)
    }
}
async function sendWorldStateAsync(peer, worldState, username) {
    if (!peer || !peer.dc || peer.dc.readyState !== 'open') {
        console.log(`[WebRTC] Cannot send world state to ${username}, data channel not open.`);
        return;
    }

    const dataToSend = {
        chunkDeltas: Array.from(worldState.chunkDeltas.entries()),
        foreignBlockOrigins: Array.from(worldState.foreignBlockOrigins.entries()),
        processedIds: Array.from(processedMessages)
    };

    const dataString = JSON.stringify(dataToSend);
    const chunkSize = 16384; // 16KB chunks
    const chunks = [];
    for (let i = 0; i < dataString.length; i += chunkSize) {
        chunks.push(dataString.slice(i, i + chunkSize));
    }

    const transactionId = `world_sync_${username}_${Date.now()}`;

    peer.dc.send(JSON.stringify({
        type: 'world_sync_start',
        total: chunks.length,
        transactionId: transactionId
    }));

    let i = 0;
    const highWaterMark = 1024 * 1024; // 1 MB buffer threshold

    function sendChunk() {
        if (!peer.dc || peer.dc.readyState !== 'open' || i >= chunks.length) {
            if (i >= chunks.length) {
                console.log(`[WebRTC] Finished sending world state to ${username}.`);
            }
            return;
        }

        const highWaterMark = 1024 * 1024; // 1 MB buffer threshold
        if (peer.dc.bufferedAmount > highWaterMark) {
            peer.dc.onbufferedamountlow = () => {
                peer.dc.onbufferedamountlow = null;
                setTimeout(sendChunk, 0);
            };
            return;
        }

        peer.dc.send(JSON.stringify({
            type: 'world_sync_chunk',
            transactionId: transactionId,
            index: i,
            chunk: chunks[i],
            total: chunks.length
        }));
        i++;
        setTimeout(sendChunk, 0);
    }

    sendChunk();
}
async function handleMinimapFile(e) {
    try {
        const t = await e.text(),
            o = JSON.parse(t);
        if (o.playerData && o.hash) {
            if (o.playerData.world !== worldName) return addMessage("Invalid file: wrong world", 3e3), void console.log("[MINIMAP] Invalid file: world mismatch, expected:", worldName, "got:", o.playerData.world);
            const e = o.playerData;
            if (e.deltas)
                for (const t of e.deltas) {
                    const e = t.chunk.replace(/^#/, "");
                    chunkManager.applyDeltasToChunk(e, t.changes)
                }
            return e.foreignBlockOrigins && (foreignBlockOrigins = new Map(e.foreignBlockOrigins)), void addMessage("Loaded chunk data from session file.", 3e3)
        }
        if (o.deltas && o.profile) return console.log("[MINIMAP] Save session file detected, applying..."), await applySaveFile(o, userAddress, (new Date).toISOString()), void addMessage("Save session loaded successfully!", 3e3);
        if (!o.world || o.world !== worldName) return addMessage("Invalid file: wrong world", 3e3), void console.log("[MINIMAP] Invalid file: world mismatch, expected:", worldName, "got:", o.world);
        if (o.offer) {
            const e = o.user || "anonymous";
            if (e === userName) return addMessage("Cannot process offer from self", 3e3), void console.log("[WEBRTC] Skipping offer from self:", e);
            const t = await GetProfileByURN(e);
            pendingOffers.push({
                clientUser: e,
                offer: o.offer,
                iceCandidates: o.iceCandidates || [],
                transactionId: "local_" + Date.now(),
                timestamp: Date.now(),
                profile: t || {
                    URN: e,
                    Creators: [null]
                }
            }), console.log("[WEBRTC] Added local offer from:", e), addMessage(`Connection request from ${e} via file`, 5e3), setupPendingModal(), document.getElementById("pendingModal").style.display = "block", isPromptOpen = !0
        } else if (o.answer && !isHost) {
            const e = o.user || "anonymous",
                t = peers.get(e);
            if (!t || !t.pc) return addMessage("No active connection for " + e, 3e3), void console.log("[WEBRTC] No peer connection for:", e);
            try {
                await t.pc.setRemoteDescription(new RTCSessionDescription(o.answer));
                for (const a of o.iceCandidates || []) try {
                    await t.pc.addIceCandidate(new RTCIceCandidate(a))
                } catch (t) {
                    console.error("[WEBRTC] Failed to add ICE candidate for:", e, "error:", t)
                }
                console.log("[WEBRTC] Successfully processed answer for:", e), addMessage("Connected to " + e + " via file", 5e3), updateHudButtons(), clearInterval(answerPollingIntervals.get("MCAnswer@" + userName + "@" + worldName)), answerPollingIntervals.delete("MCAnswer@" + userName + "@" + worldName)
            } catch (t) {
                console.error("[WEBRTC] Failed to process answer for:", e, "error:", t), addMessage("Failed to connect to " + e, 3e3)
            }
        } else if (o.batch && !isHost) {
            const e = o.user || "anonymous",
                t = peers.get(e);
            if (!t || !t.pc) return addMessage("No active connection for " + e, 3e3), void console.log("[WEBRTC] No peer connection for:", e);
            const a = o.batch.find((e => e.user === userName));
            if (!a) return addMessage("No answer for you in batch from " + e, 3e3), void console.log("[WEBRTC] No answer for user:", userName, "in batch from:", e);
            try {
                await t.pc.setRemoteDescription(new RTCSessionDescription(a.answer));
                for (const o of a.iceCandidates || []) try {
                    await t.pc.addIceCandidate(new RTCIceCandidate(o))
                } catch (t) {
                    console.error("[WEBRTC] Failed to add ICE candidate for:", e, "error:", t)
                }
                console.log("[WEBRTC] Successfully processed batch answer for:", e), addMessage("Connected to " + e + " via batch file", 5e3), updateHudButtons(), clearInterval(answerPollingIntervals.get("MCAnswer@" + userName + "@" + worldName)), answerPollingIntervals.delete("MCAnswer@" + userName + "@" + worldName)
            } catch (t) {
                console.error("[WEBRTC] Failed to process batch answer for:", e, "error:", t), addMessage("Failed to connect to " + e, 3e3)
            }
        } else addMessage("Invalid file format", 3e3), console.log("[MINIMAP] Invalid file: no offer, answer, or batch")
    } catch (e) {
        console.error("[MINIMAP] Error processing file:", e), addMessage("Failed to process file", 3e3)
    }
}

function setupDataChannel(e, t) {
    console.log(`[FIXED] Setting up data channel for: ${t}`), e.onopen = () => {
        // As per user request, when a client connects, they drop their world mappings
        // and perform a switch to the same world, effectively syncing with the host.
        if (!isHost) {
            WORLD_STATES.clear();
            console.log(`[WebRTC] Client cleared all world states to sync with host.`);
            switchWorld(worldName);
        }
        if (console.log(`[WEBRTC] Data channel open with: ${t}. State: ${e.readyState}`), addMessage(`Connection established with ${t}`, 3e3), e.send(JSON.stringify({
            type: "player_move",
            username: userName,
            world: worldName,
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
            pitch: player.pitch,
            isMoving: !1,
            isAttacking: !1,
            timestamp: Date.now()
        })), isHost) {
            for (const [e, o] of peers.entries()) e !== t && e !== userName && o.dc && "open" === o.dc.readyState && o.dc.send(JSON.stringify({
                type: "new_player",
                username: t
            }));
            for (const [o, a] of peers.entries()) o !== t && a.dc && "open" === a.dc.readyState && e.send(JSON.stringify({
                type: "new_player",
                username: o
            }));
            e.send(JSON.stringify({
                type: "new_player",
                username: userName
            }));

            if (!syncedWorlds.has(worldName)) {
                e.send(JSON.stringify({
                    type: "request_world_sync",
                    world: worldName,
                    username: userName
                }));
                syncedWorlds.add(worldName);
            }

            // Sync magician stones to new player
            if (Object.keys(magicianStones).length > 0) {
                const magicianStonesSync = {
                    type: "magician_stones_sync",
                    stones: {}
                };
                for (const key in magicianStones) {
                    const stone = magicianStones[key];
                    magicianStonesSync.stones[key] = {
                         x: stone.x, y: stone.y, z: stone.z, url: stone.url,
                        width: stone.width, height: stone.height, offsetX: stone.offsetX,
                        offsetY: stone.offsetY, offsetZ: stone.offsetZ, loop: stone.loop,
                            autoplay: stone.autoplay, distance: stone.distance,
                            direction: stone.direction
                    };
                }
                e.send(JSON.stringify(magicianStonesSync));
            }

            console.log(`[WEBRTC] Host sending initial mob state to ${t}`);
            for (const t of mobs) e.send(JSON.stringify({
                type: "mob_update",
                id: t.id,
                x: t.pos.x,
                y: t.pos.y,
                z: t.pos.z,
                hp: t.hp,
                mobType: t.type
            }))
        }
        const s = setInterval((() => {
            "open" === e.readyState && e.send(JSON.stringify({
                type: "i_am_alive"
            }))
        }), 1e4);
        const n = peers.get(t);
        n && (n.keepaliveInterval = s), updateHudButtons()
    }, e.onmessage = e => {
        console.log(`[WEBRTC] Message from ${t}`);
        try {
            const s = JSON.parse(e.data),
                n = s.username || t;
            if (n === userName) return;
            switch (s.type) {
                case "i_am_alive":
                    if (isHost) {
                        const e = peers.get(n);
                        e && (e.lastSeen = performance.now())
                    }
                    break;
                case "new_player":
                    const i = s.username;
                    i === userName || peers.has(i) || (addMessage(`${i} has joined!`), playerAvatars.has(i) || createAndSetupAvatar(i, !1), peers.has(i) || peers.set(i, {
                        pc: null,
                        dc: null,
                        address: null
                    }), updateHudButtons());
                    break;
                case "world_sync":
                    if (!isHost) {
                        console.log("[WEBRTC] Received world_sync");
                        if (s.chunkDeltas) {
                            const deltas = new Map(s.chunkDeltas);
                            for (const [chunkKey, changes] of deltas.entries()) {
                                chunkManager.addPendingDeltas(chunkKey, changes);
                            }
                        }
                        if (s.foreignBlockOrigins) {
                            getCurrentWorldState().foreignBlockOrigins = new Map(s.foreignBlockOrigins);
                        }
                    }
                    break;
                case 'world_sync_start':
                    if (!isHost) {
                        partialIPFSUpdates.set(s.transactionId, {
                            chunks: new Array(s.total),
                            total: s.total,
                            received: 0
                        });
                        const worldSyncProgress = document.getElementById('worldSyncProgress');
                        worldSyncProgress.style.display = 'flex';
                        const progressCircle = worldSyncProgress.querySelector('.progress-circle');
                        progressCircle.style.setProperty('--p', '0');
                        progressCircle.dataset.progress = '0';
                        worldSyncProgress.querySelector('.progress-circle-label').textContent = '0%';
                    }
                    break;
                case 'world_sync_chunk':
                    if (!isHost) {
                        const update = partialIPFSUpdates.get(s.transactionId);
                        if (update && !update.chunks[s.index]) {
                            update.chunks[s.index] = s.chunk;
                            update.received++;

                            const progress = Math.round(update.received / update.total * 100);
                            const circle = document.querySelector('.progress-circle');
                            if (circle) {
                                circle.style.setProperty('--p', progress);
                                circle.dataset.progress = progress;
                                const label = document.querySelector('.progress-circle-label');
                                if (label) {
                                    label.textContent = `${progress}%`;
                                }
                            }

                            if (update.received === update.total) {
                                const fullDataString = update.chunks.join('');
                                const fullData = JSON.parse(fullDataString);

                                if (fullData.chunkDeltas) {
                                    for (const [chunkKey, changes] of fullData.chunkDeltas) {
                                        chunkManager.addPendingDeltas(chunkKey, changes);
                                    }
                                }
                                if (fullData.foreignBlockOrigins) {
                                    getCurrentWorldState().foreignBlockOrigins = new Map(fullData.foreignBlockOrigins);
                                }
                                if (fullData.processedIds) {
                                    for (const id of fullData.processedIds) {
                                        processedMessages.add(id);
                                    }
                                    // Sync with worker
                                    worker.postMessage({
                                        type: "sync_processed",
                                        ids: Array.from(processedMessages)
                                    });
                                }

                                partialIPFSUpdates.delete(s.transactionId);

                                setTimeout(() => {
                                    document.getElementById('worldSyncProgress').style.display = 'none';
                                }, 2000);
                            }
                        }
                    }
                    break;
                case "state_update":
                    if (!isHost)
                        for (const e of s.players) {
                            const t = e.username;
                            if (t === userName) continue;
                            userPositions[t] || (userPositions[t] = {}, createAndSetupAvatar(t, !1, e.yaw));
                            const o = userPositions[t];
                            (!s.timestamp || s.timestamp > (o.lastTimestamp || 0)) && (o.prevX = o.targetX, o.prevY = o.targetY, o.prevZ = o.targetZ, o.prevYaw = o.targetYaw, o.prevPitch = o.targetPitch, o.targetX = e.x, o.targetY = e.y, o.targetZ = e.z, o.targetYaw = e.yaw, o.targetPitch = e.pitch, o.isMoving = e.isMoving, o.lastUpdate = performance.now(), o.lastTimestamp = s.timestamp, o.isAttacking = e.isAttacking, e.attackStartTime && e.attackStartTime !== o.attackStartTime && (o.attackStartTime = e.attackStartTime, o.localAnimStartTime = performance.now()))
                        }
                    break;
                case "player_respawn":
                    const c = s.username;
                    userPositions[c] && (userPositions[c].isDying = !1);
                    createAndSetupAvatar(c, !1).position.set(s.x, s.y, s.z);
                    break;
                case "player_move":
                    if (isHost) {
                        if (userPositions[n]) {
                            userPositions[n].world = s.world;
                        }
                        for (const [t, o] of peers.entries()) {
                            const peerWorld = userPositions[t] ? userPositions[t].world : null;
                            if (t !== n && t !== userName && o.dc && "open" === o.dc.readyState && peerWorld === s.world) {
                                o.dc.send(e.data);
                            }
                        }
                    }
                    playerAvatars.has(n) || createAndSetupAvatar(n, !1, s.yaw), userPositions[n] || (userPositions[n] = {
                        world: s.world,
                        lastTimestamp: 0,
                        prevX: s.x,
                        prevY: s.y,
                        prevZ: s.z,
                        prevYaw: s.yaw,
                        prevPitch: s.pitch,
                        targetX: s.x,
                        targetY: s.y,
                        targetZ: s.z,
                        targetYaw: s.yaw,
                        targetPitch: s.pitch
                    });
                    const l = userPositions[n];
                    s.timestamp > l.lastTimestamp && (l.prevX = l.targetX, l.prevY = l.targetY, l.prevZ = l.targetZ, l.prevYaw = l.targetYaw, l.prevPitch = l.targetPitch, l.targetX = s.x, l.targetY = s.y, l.targetZ = s.z, l.targetYaw = s.yaw, l.targetPitch = s.pitch, l.isMoving = s.isMoving, l.lastUpdate = performance.now(), l.lastTimestamp = s.timestamp);
                    break;
                case "block_change":
                    if (isHost) {
                        console.log(`[WEBRTC] Host processing block change from ${n} for world ${s.world}`);

                        if (!WORLD_STATES.has(s.world)) {
                            WORLD_STATES.set(s.world, {
                                chunkDeltas: new Map(),
                                foreignBlockOrigins: new Map()
                            });
                        }
                        const worldState = WORLD_STATES.get(s.world);
                        const chunkKey = makeChunkKey(s.world, Math.floor(modWrap(s.wx, MAP_SIZE) / CHUNK_SIZE), Math.floor(modWrap(s.wz, MAP_SIZE) / CHUNK_SIZE));
                        if (!worldState.chunkDeltas.has(chunkKey)) {
                            worldState.chunkDeltas.set(chunkKey, []);
                        }
                        worldState.chunkDeltas.get(chunkKey).push({ x: modWrap(s.wx, CHUNK_SIZE), y: s.wy, z: modWrap(s.wz, CHUNK_SIZE), b: s.bid });

                        if (s.originSeed && s.originSeed !== s.world) {
                            const blockKey = `${s.wx},${s.wy},${s.wz}`;
                            worldState.foreignBlockOrigins.set(blockKey, s.originSeed);
                        }

                        for (const [t, o] of peers.entries()) {
                            if (t !== n && t !== userName && o.dc && "open" === o.dc.readyState && o.syncedWorlds && o.syncedWorlds.has(s.world)) {
                                o.dc.send(e.data);
                            }
                        }
                    }
                    if (s.world === worldName) {
                         if (Math.hypot(player.x - s.wx, player.y - s.wy, player.z - s.wz) < maxAudioDistance && (0 !== s.bid ? safePlayAudio(soundPlace) : safePlayAudio(soundBreak)), chunkManager.setBlockGlobal(s.wx, s.wy, s.wz, s.bid, !1, s.originSeed), s.originSeed && s.originSeed !== worldSeed) {
                            const e = `${s.wx},${s.wy},${s.wz}`;
                            getCurrentWorldState().foreignBlockOrigins.set(e, s.originSeed)
                        }
                    }
                    if (s.prevBid && BLOCKS[s.prevBid] && BLOCKS[s.prevBid].light) {
                        var o = `${s.wx},${s.wy},${s.wz}`;
                        if (torchLights.has(o)) {
                            var a = torchLights.get(o);
                            scene.remove(a), a.dispose(), torchLights.delete(o)
                        }
                        if (torchParticles.has(o)) {
                            var r = torchParticles.get(o);
                            scene.remove(r), r.geometry.dispose(), r.material.dispose(), torchParticles.delete(o)
                        }
                    }
                    if (s.bid && BLOCKS[s.bid] && BLOCKS[s.bid].light) {
                        (a = new THREE.PointLight(16755251, .8, 16)).position.set(s.wx, s.wy + .5, s.wz), scene.add(a), torchLights.set(`${s.wx},${s.wy},${s.wz}`, a);
                        r = createFlameParticles(s.wx, s.wy + .5, s.wz);
                        scene.add(r), torchParticles.set(`${s.wx},${s.wy},${s.wz}`, r)
                    }
                    break;
                case "mob_spawn":
                    if (!mobs.some((e => e.id === s.id))) {
                        const e = new Mob(s.x, s.z, s.id, s.mobType);
                        e.isAggressive = s.isAggressive, mobs.push(e)
                    }
                    break;
                case "mob_state_batch":
                    if (!isHost) {
                        const e = new Set;
                        for (const t of s.mobs) {
                            e.add(t.id);
                            let o = mobs.find((e => e.id === t.id));
                            o || (o = new Mob(t.x, t.z, t.id, t.type), mobs.push(o)), o.targetPos.set(t.x, t.y, t.z), o.hp = t.hp, o.isAggressive = t.isAggressive, o.isMoving = t.isMoving, o.aiState = t.aiState, t.quaternion && (o.targetQuaternion.fromArray(t.quaternion), o.lastQuaternionUpdate = performance.now()), o.lastUpdateTime = performance.now()
                        }
                        mobs = mobs.filter((t => !!e.has(t.id) || (scene.remove(t.mesh), disposeObject(t.mesh), !1)))
                    }
                    break;
                case "mob_update":
                    let d = mobs.find((e => e.id === s.id));
                    d || (d = new Mob(s.x, s.z, s.id, s.mobType), mobs.push(d), d.pos.set(s.x, s.y, s.z)), d.prevPos.copy(d.targetPos), d.targetPos.set(s.x, s.y, s.z), d.hp = s.hp, d.lastUpdateTime = performance.now(), s.aiState && (d.aiState = s.aiState), void 0 !== s.isMoving && (d.isMoving = s.isMoving), s.flash && (d.flashEnd = Date.now() + 200), s.quaternion && (d.prevQuaternion.copy(d.targetQuaternion), d.targetQuaternion.fromArray(s.quaternion), d.lastQuaternionUpdate = performance.now());
                    break;
                case "mob_despawn":
                case "mob_kill":
                    const p = mobs.find((e => e.id === s.id));
                    if (p) {
                        try {
                            scene.remove(p.mesh), disposeObject(p.mesh)
                        } catch (e) { }
                        mobs = mobs.filter((e => e.id !== p.id))
                    }
                    break;
                case "mob_hit":
                    if (isHost) {
                        const e = mobs.find((e => e.id === s.id));
                        e && e.hurt(s.damage || 4, s.username)
                    }
                    break;
                case "player_hit":
                    isHost && handlePlayerHit(s);
                    break;
                case "player_damage":
                    {
                        const damage = s.damage || 1;
                        player.health = Math.max(0, player.health - damage);
                        lastDamageTime = Date.now();
                        document.getElementById("health").innerText = player.health;
                        updateHealthBar();
                        const attacker = s.attacker || 'another player';
                        if (s.attacker === 'lava') {
                            addMessage("Burning in lava! HP: " + player.health, 1e3)
                        } else {
                            addMessage("Hit by " + attacker + "! HP: " + player.health, 1e3);
                        }
                        flashDamageEffect();
                        safePlayAudio(soundHit);

                        if (s.kx !== undefined && s.kz !== undefined) {
                            player.vx += s.kx;
                            player.vz += s.kz;
                        }

                        if (player.health <= 0) {
                            handlePlayerDeath();
                        }
                    }
                    break;
                case "add_score":
                    player.score += s.amount || 0, document.getElementById("score").innerText = player.score, addMessage(`+${s.amount} score`, 1500);
                    break;
                case "player_attack":
                    if (isHost) {
                        const e = userPositions[n];
                        if (e) {
                            e.isAttacking = !0;
                            const t = performance.now();
                            e.attackStartTime = t, e.localAnimStartTime = t
                        }
                    }
                    break;
                case "player_death":
                    const m = s.username;
                    if (userPositions[m]) {
                        userPositions[m].isDying = !0, userPositions[m].deathAnimationStart = performance.now();
                        const e = playerAvatars.get(m);
                        e && (e.visible = !0)
                    }
                    break;
                case "health_update":
                    isHost && userPositions[s.username] && (userPositions[s.username].health = s.health);
                    break;
                case "laser_fired_batch":
                case "laser_fired":
                case "item_dropped":
                case "item_picked_up":
                    if (isHost) {
                        for (const [t, o] of peers.entries()) {
                            const peerWorld = userPositions[t] ? userPositions[t].world : null;
                            if (t !== n && t !== userName && o.dc && "open" === o.dc.readyState && peerWorld === s.world) {
                                o.dc.send(e.data);
                            }
                        }
                    }
                    if (s.type === "laser_fired" || s.type === "laser_fired_batch") {
                        laserQueue.push(s);
                    } else if (s.type === "item_dropped") {
                        if (!droppedItems.some((item => item.id === s.dropId))) {
                            createDroppedItemOrb(s.dropId, new THREE.Vector3(s.position.x, s.position.y, s.position.z), s.blockId, s.originSeed, s.dropper);
                        }
                    } else if (s.type === "item_picked_up") {
                        const f = droppedItems.findIndex((e => e.id === s.dropId));
                        if (-1 !== f) {
                            scene.remove(droppedItems[f].mesh);
                            scene.remove(droppedItems[f].light);
                            droppedItems.splice(f, 1);
                        }
                    }
                    break;
                case "video_started":
                    addMessage(`${s.username} started their video.`, 2e3);
                    break;
                case "video_stopped":
                    userVideoStreams.has(s.username) && (userVideoStreams.get(s.username).video.srcObject = null, userVideoStreams.get(s.username).video.remove(), userVideoStreams.delete(s.username), addMessage(`${s.username} stopped their video.`, 2e3));
                    break;
                case "renegotiation_offer":
                    if (peers.has(t)) {
                        const e = peers.get(t);
                        e.pc.setRemoteDescription(new RTCSessionDescription(s.offer)).then((() => e.pc.createAnswer())).then((t => e.pc.setLocalDescription(t))).then((() => {
                            e.dc && "open" === e.dc.readyState && e.dc.send(JSON.stringify({
                                type: "renegotiation_answer",
                                answer: e.pc.localDescription
                            }))
                        })).catch((e => console.error("Renegotiation error (offer):", e)))
                    }
                    break;
                case "renegotiation_answer":
                    peers.has(t) && peers.get(t).pc.setRemoteDescription(new RTCSessionDescription(s.answer)).catch((e => console.error("Renegotiation error (answer):", e)));
                    break;
                case "volcano_event":
                    handleVolcanoEvent(s);
                    break;
                case "boulder_update":
                    if (!isHost)
                        for (const e of s.boulders) {
                            let t = eruptedBlocks.find((t => t.id === e.id));
                            t && (t.targetPosition = (new THREE.Vector3).fromArray(e.position), t.targetQuaternion = (new THREE.Quaternion).fromArray(e.quaternion), t.lastUpdate = performance.now())
                        }
                    break;
                case "ipfs_chunk_update_start":
                    if (!isHost) {
                        partialIPFSUpdates.set(s.transactionId, {
                            chunks: new Array(s.total), // Pre-allocate array
                            total: s.total,
                            received: 0,
                            fromAddress: s.fromAddress,
                            timestamp: s.timestamp,
                            sourceUsername: n
                        });
                    }
                    break;
                case "ipfs_chunk_update_chunk":
                    if (!isHost) {
                        const update = partialIPFSUpdates.get(s.transactionId);
                        if (update && !update.chunks[s.index]) { // Prevent processing duplicates
                            update.chunks[s.index] = s.chunk;
                            update.received++;
                            if (update.received === s.total) {
                                const fullData = JSON.parse(update.chunks.join(''));
                                applyChunkUpdates(fullData, update.fromAddress, update.timestamp, s.transactionId, update.sourceUsername);
                                partialIPFSUpdates.delete(s.transactionId);
                            }
                        }
                    }
                    break;
                case "processed_transaction_id":
                    if (isHost) {
                        const transactionId = s.transactionId;
                        if (!processedMessages.has(transactionId)) {
                            processedMessages.add(transactionId);
                            const syncMessage = JSON.stringify({
                                type: "sync_processed_transaction",
                                transactionId: transactionId
                            });
                            for (const [peerUsername, peer] of peers.entries()) {
                                if (peerUsername !== n && peer.dc && peer.dc.readyState === 'open') {
                                    peer.dc.send(syncMessage);
                                }
                            }
                        }
                    } else {
                        // if a client happens to get this, just add it.
                        processedMessages.add(s.transactionId);
                    }
                    break;
                case "sync_processed_transaction":
                    if (!isHost) {
                        const transactionId = s.transactionId;
                        if (!processedMessages.has(transactionId)) {
                            processedMessages.add(transactionId);
                            // Also sync with the worker to prevent it from re-processing
                            worker.postMessage({
                                type: "sync_processed",
                                ids: [transactionId]
                            });
                        }
                    }
                    break;
                case "ipfs_chunk_from_client_start":
                    if (isHost) {
                        partialIPFSUpdates.set(s.transactionId, {
                            chunks: new Array(s.total), // Pre-allocate array
                            total: s.total,
                            received: 0,
                            fromAddress: s.fromAddress,
                            timestamp: s.timestamp,
                            sourceUsername: n
                        });
                    }
                    break;
                case "ipfs_chunk_from_client_chunk":
                    if (isHost) {
                        const update = partialIPFSUpdates.get(s.transactionId);
                        if (update && !update.chunks[s.index]) { // Prevent processing duplicates
                            update.chunks[s.index] = s.chunk;
                            update.received++;
                            if (update.received === s.total) {
                                const fullData = JSON.parse(update.chunks.join(''));
                                applyChunkUpdates(fullData, update.fromAddress, update.timestamp, s.transactionId, update.sourceUsername);
                                partialIPFSUpdates.delete(s.transactionId);
                            }
                        }
                    }
                    break;
                case "remove_peer":
                    s.username && cleanupPeer(s.username);
                    break;
                case "block_hit":
                    if (isHost) {
                        const originalWorldName = worldName;
                        const originalWorldSeed = worldSeed;

                        // Use the world from the message, or default to the host's current world
                        let blockWorld = s.world || originalWorldName;

                        try {
                            // Temporarily switch world context if the hit is in a different world
                            if (blockWorld !== originalWorldName) {
                                console.log(`[WebRTC] Host switching context to world "${blockWorld}" to process block hit from ${s.username}`);
                                worldName = blockWorld;
                                worldSeed = blockWorld;
                            }

                            removeBlockAt(s.x, s.y, s.z, s.username);

                        } catch (error) {
                            console.error(`[WebRTC] Error processing block_hit in world ${blockWorld}:`, error);
                        } finally {
                            // Switch back to the original world context
                            if (worldName !== originalWorldName) {
                                console.log(`[WebRTC] Host switching context back to world "${originalWorldName}"`);
                                worldName = originalWorldName;
                                worldSeed = originalWorldSeed;
                            }
                        }
                    }
                    break;
                case "add_to_inventory":
                    addToInventory(s.blockId, s.count, s.originSeed);
                    break;
                case "block_damaged":
                    if (!isHost) {
                        updateBlockDamageVisuals(s.x, s.y, s.z, s.hits);
                    }
                    break;
                case "flower_consumed":
                    const flowerIndex = flowerLocations.findIndex(f => f.x === s.location.x && f.y === s.location.y && f.z === s.location.z);
                    if (flowerIndex > -1) {
                        flowerLocations.splice(flowerIndex, 1);
                    }
                    break;
                case "magician_stone_placed":
                    // When the host receives this message from a client, it needs to both
                    // create the screen locally AND relay the message to all other clients.
                    if (isHost) {
                        for (const [peerUsername, peer] of peers.entries()) {
                            if (peerUsername !== n && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(e.data);
                            }
                        }
                    }
                    createMagicianStoneScreen(s.stoneData);
                    break;
                case "magician_stones_sync":
                    if (!isHost) {
                        for (const key in s.stones) {
                            if (Object.hasOwnProperty.call(s.stones, key)) {
                                createMagicianStoneScreen(s.stones[key]);
                            }
                        }
                    }
                    break;
                case "magician_stone_mute":
                    if (s.key && magicianStones[s.key]) {
                        const stone = magicianStones[s.key];
                        stone.isMuted = s.isMuted;
                        if (stone.audioElement) {
                            stone.audioElement.muted = s.isMuted;
                        }
                        if (stone.videoElement) {
                            stone.videoElement.muted = s.isMuted;
                        }
                    }
                    break;
                case "magician_stone_removed":
                    if (!isHost) {
                        const key = s.key;
                        if (magicianStones[key]) {
                            if (magicianStones[key].mesh) {
                                scene.remove(magicianStones[key].mesh);
                                disposeObject(magicianStones[key].mesh);
                            }
                            if (magicianStones[key].videoElement) {
                                magicianStones[key].videoElement.pause();
                                magicianStones[key].videoElement.src = '';
                            }
                            if (magicianStones[key].audioElement) {
                                magicianStones[key].audioElement.pause();
                                magicianStones[key].audioElement.src = '';
                            }
                            delete magicianStones[key];
                        }
                    }
                    break;
                case "request_world_sync":
                    if (isHost) {
                        const worldState = WORLD_STATES.get(s.world);
                        if (worldState) {
                            const peer = peers.get(s.username);
                            if (peer) {
                                sendWorldStateAsync(peer, worldState, s.username);
                            }
                        }
                    }
                    break;
                case 'world_switch':
                    if (isHost) {
                        const peer = peers.get(s.username);
                        if (peer) {
                            const clientWorld = s.world;
                            if (!peer.syncedWorlds) {
                                peer.syncedWorlds = new Set();
                            }
                            if (!peer.syncedWorlds.has(clientWorld)) {
                                const worldState = WORLD_STATES.get(clientWorld);
                                if (worldState) {
                                    sendWorldStateAsync(peer, worldState, s.username);
                                }
                                peer.syncedWorlds.add(clientWorld);
                            }
                            if (userPositions[s.username]) {
                                userPositions[s.username].world = clientWorld;
                            }
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error(`[WEBRTC] Failed to process message from ${t}:`, e)
        }
    }, e.onclose = () => {
        console.log(`[WebRTC] Data channel with ${t} closed.`), cleanupPeer(t)
    }, e.onerror = e => {
        console.error(`[WebRTC] Data channel error with ${t}:`, e), cleanupPeer(t)
    }
}

function updatePendingModal() {
    var e = document.getElementById("pendingModal"),
        t = document.getElementById("pendingList");
    for (var o of (t.innerHTML = "", pendingOffers)) {
        var a = document.createElement("div");
        a.className = "row";
        var r = document.createElement("div");
        r.innerText = o.clientUser + " at " + new Date(o.timestamp).toLocaleString();
        var s = document.createElement("input");
        s.type = "checkbox", s.className = "selectOffer", s.dataset.user = o.clientUser, a.appendChild(r), a.appendChild(s), t.appendChild(a)
    }
    e.style.display = isHost && pendingOffers.length > 0 ? "block" : "none"
}

function activateHost() {
    if (!isHost) {
        isHost = !0, console.log("[SYSTEM] Hosting activated."), addMessage("Host mode activated!", 3e3), startOfferPolling();
        const e = document.getElementById("usersBtn");
        e && e.classList.add("hosting"), setInterval((() => {
            if (!isHost) return;
            const t = performance.now(),
                o = [];
            for (const [e, a] of peers.entries()) a.lastSeen && t - a.lastSeen > 3e4 && o.push(e);
            for (const t of o) {
                console.log(`[WebRTC] Peer ${t} timed out.`), cleanupPeer(t);
                const o = JSON.stringify({
                    type: "remove_peer",
                    username: t
                });
                for (const [t, a] of peers.entries()) a.dc && "open" === a.dc.readyState && a.dc.send(o)
            }
        }), 1e4)
    }
}
async function acceptPendingOffers() {
    activateHost();
    const e = document.querySelectorAll(".selectOffer:checked");
    if (0 === e.length) return void addMessage("No offers selected", 3e3);
    const t = [],
        o = [];
    for (const a of e) {
        const e = a.dataset.user,
            r = pendingOffers.find((t => t.clientUser === e));
        if (!r || !r.offer) continue;
        let s = {
            type: "answer",
            sdp: ""
        },
            n = [],
            i = null;
        try {
            const a = await getTurnCredentials();
            i = new RTCPeerConnection({
                iceServers: a
            }), localAudioStream && localAudioStream.getTracks().forEach((e => {
                i.addTrack(e, localAudioStream)
            })), i.ontrack = t => {
                const o = e;
                if ("audio" === t.track.kind) {
                    if (!userAudioStreams.has(o)) {
                        const e = new Audio;
                        e.srcObject = t.streams[0], e.autoplay = !0, userAudioStreams.set(o, {
                            audio: e,
                            stream: t.streams[0]
                        }), console.log(`[WebRTC] Received audio stream from ${o}`)
                    }
                } else if ("video" === t.track.kind && !userVideoStreams.has(o)) {
                    const e = document.createElement("video");
                    e.srcObject = t.streams[0], e.autoplay = !0, e.playsInline = !0, e.style.display = "none", document.body.appendChild(e), userVideoStreams.set(o, {
                        video: e,
                        stream: t.streams[0]
                    }), console.log(`[WebRTC] Received video stream from ${o}`)
                }
            }, peers.set(e, {
                pc: i,
                dc: null,
                address: null
            }), i.ondatachannel = t => {
                const o = t.channel;
                peers.get(e).dc = o, setupDataChannel(o, e)
            }, await i.setRemoteDescription(new RTCSessionDescription(r.offer));
            for (const e of r.iceCandidates || []) await i.addIceCandidate(new RTCIceCandidate(e)).catch(console.error);
            s = await i.createAnswer(), await i.setLocalDescription(s), i.onicecandidate = e => {
                e.candidate && n.push(e.candidate)
            }, await new Promise((e => {
                i.onicegatheringstatechange = () => {
                    "complete" === i.iceGatheringState && e()
                }, setTimeout(e, 5e3)
            })), t.push({
                user: e,
                answer: s,
                iceCandidates: n
            }), o.push(e), console.log(`[FIXED] Created answer for ${e} - NO TIMEOUT`)
        } catch (t) {
            console.error(`[ERROR] Failed ${e}:`, t), i && i.close();
            continue
        }
    }
    if (t.length > 0) {
        const e = {
            world: worldName,
            user: userName,
            batch: t
        },
            a = new Blob([JSON.stringify(e)], {
                type: "application/json"
            }),
            r = URL.createObjectURL(a),
            s = document.createElement("a");
        s.href = r, s.download = `${worldName}_batch_${Date.now()}.json`, document.body.appendChild(s), s.click(), s.remove(), URL.revokeObjectURL(r);
        const n = document.getElementById("joinScriptModal"),
            i = "MCBatch@" + userName + "@" + worldName,
            c = (await GetPublicAddressByKeyword(i))?.trim().replace(/"|'/g, "") || i;
        n.querySelector("h3").innerText = "🚀 BATCH READY - SEND NOW", n.querySelector("p").innerText = "Copy address → Sup!? To: field → Attach JSON → 📢 SEND IMMEDIATELY", n.querySelector("#joinScriptText").value = c, n.style.display = "block", isPromptOpen = !0, addMessage(`✅ Batch ready for ${o.length} players - SEND NOW!`, 1e4), pendingOffers = pendingOffers.filter((e => !o.includes(e.clientUser))), updatePendingModal()
    }
}

function setupPendingModal() {
    console.log("[MODAL] Setting up pendingModal");
    const e = document.getElementById("pendingModal");
    e && (e.remove(), console.log("[MODAL] Removed existing pendingModal"));
    const t = document.createElement("div");
    t.id = "pendingModal", t.style.position = "fixed", t.style.right = "12px", t.style.bottom = "12px", t.style.zIndex = "220", t.style.background = "var(--panel)", t.style.padding = "14px", t.style.borderRadius = "10px", t.style.minWidth = "300px", t.style.maxWidth = "400px", t.style.display = isHost && pendingOffers.length > 0 ? "block" : "none", t.innerHTML = '\n            <h3>Pending Connections</h3>\n            <div id="pendingList"></div>\n            <div class="actions">\n                <label><input type="checkbox" id="acceptAll"> Accept All</label>\n                <button id="acceptPending">Accept Selected</button>\n                <button id="closePending">Close</button>\n            </div>\n        ', document.body.appendChild(t), console.log("[MODAL] pendingModal added to DOM");
    const o = t.querySelector("#pendingList");
    o.style.maxHeight = "calc(80vh - 100px)", o.style.overflow = "auto", o.innerHTML = "";
    let a = !1;
    const r = new Map;
    for (const e of pendingOffers) e.clientUser !== userName ? r.has(e.clientUser) || r.set(e.clientUser, e) : console.log("[MODAL] Skipping offer from self:", e.clientUser);
    const s = Array.from(r.values());
    for (const e of s) {
        console.log("[MODAL] Rendering pending offer from:", e.clientUser);
        const t = document.createElement("div");
        t.className = "row", t.style.maxHeight = "80px", t.style.display = "flex", t.style.alignItems = "center", t.style.marginBottom = "8px";
        const r = document.createElement("div");
        r.innerText = `${e.clientUser || "Unknown"} at ${new Date(e.timestamp).toLocaleString()}\nBio: ${e.profile && e.profile.Bio ? e.profile.Bio : "No bio"}`, r.style.whiteSpace = "pre-line", r.style.maxWidth = "200px", r.style.maxHeight = "60px", r.style.overflow = "hidden", r.style.textOverflow = "ellipsis", r.style.flex = "1";
        const s = document.createElement("input");
        s.type = "checkbox", s.className = "selectOffer", s.dataset.user = e.clientUser || "", s.dataset.transactionId = e.transactionId, s.style.margin = "0 8px";
        const n = document.createElement("button");
        n.innerText = "Accept", n.style.marginRight = "8px", n.onclick = () => {
            console.log("[WEBRTC] Accepting offer from:", e.clientUser), s.checked = !0, acceptPendingOffers()
        };
        const i = document.createElement("button");
        i.innerText = "Reject", i.style.background = "var(--danger)", i.style.color = "#111", i.onclick = () => {
            console.log("[WEBRTC] Rejecting offer from:", e.clientUser), pendingOffers = pendingOffers.filter((t => t.clientUser !== e.clientUser)), addMessage(`Rejected connection from ${e.clientUser || "Unknown"}`, 3e3), setupPendingModal()
        }, t.appendChild(r), t.appendChild(s), t.appendChild(n), t.appendChild(i), o.appendChild(t), a = !0
    }
    if (!a) {
        console.log("[MODAL] No pending offers to render");
        const e = document.createElement("div");
        e.style.marginTop = "8px", e.innerText = "No pending connection requests", o.appendChild(e)
    }
    const n = t.querySelector("#acceptAll");
    n && n.addEventListener("change", (e => {
        document.querySelectorAll(".selectOffer").forEach((t => {
            t.checked = e.target.checked
        })), console.log("[MODAL] Accept All checkbox changed")
    }));
    const i = t.querySelector("#acceptPending");
    i && (i.onclick = async () => {
        console.log("[MODAL] Accept Pending clicked"), await acceptPendingOffers()
    }), t.querySelector("#closePending").onclick = () => {
        console.log("[MODAL] Closing pendingModal"), t.style.display = "none", isPromptOpen = !1
    }
}

function startOfferPolling() {
    if (isHost) {
        console.log("[SYSTEM] Starting offer polling for:", userName);
        var e = "MCConn@" + userName + "@" + worldName,
            t = setInterval((async function () {
                try {
                    await new Promise((e => setTimeout(e, 350))), console.log("[SYSTEM] Polling offers for:", e), worker.postMessage({
                        type: "poll",
                        chunkKeys: [],
                        masterKey: MASTER_WORLD_KEY,
                        userAddress: userAddress,
                        worldName: worldName,
                        serverKeyword: "MCServerJoin@" + worldName,
                        offerKeyword: e,
                        answerKeywords: [],
                        userName: userName
                    })
                } catch (e) {
                    console.error("[SYSTEM] Error in offer polling:", e)
                }
            }), 3e4);
        offerPollingIntervals.set(e, t)
    } else console.log("[SYSTEM] Not hosting, skipping offer polling")
}

function startAnswerPolling(e) {
    var t = "MCAnswer@" + userName + "@" + worldName;
    answerPollingIntervals.has(t) || (console.log("[SYSTEM] Starting answer polling for:", e), answerPollingIntervals.set(t, setInterval((function () {
        if (worker.postMessage({
            type: "poll",
            chunkKeys: [],
            masterKey: MASTER_WORLD_KEY,
            userAddress: userAddress,
            worldName: worldName,
            serverKeyword: "MCServerJoin@" + worldName,
            offerKeyword: null,
            answerKeywords: [t],
            userName: userName
        }), Date.now() - connectionAttempts.get(e) > 18e5) {
            console.log("[SYSTEM] Answer polling timeout for:", e), addMessage("Connection to " + e + " timed out after 30 minutes.", 5e3), clearInterval(answerPollingIntervals.get(t)), answerPollingIntervals.delete(t);
            var o = peers.get(e);
            o && o.pc && o.pc.close(), peers.delete(e), playerAvatars.has(e) && (scene.remove(playerAvatars.get(e)), disposeObject(playerAvatars.get(e)), playerAvatars.delete(e)), delete userPositions[e], updateHudButtons()
        }
    }), 3e4)))
}
async function pollServers() {
    if (isInitialLoad) console.log("[SYSTEM] Skipping poll, initial load not complete");
    else {
        console.log("[SYSTEM] Polling server announcements for:", "MCServerJoin@" + worldName);
        var e = "MCServerJoin@" + worldName,
            t = 0,
            o = 350;
        !async function a() {
            var r;
            try {
                await new Promise((e => setTimeout(e, o))), r = await GetPublicAddressByKeyword(e)
            } catch (e) {
                console.error("[SYSTEM] Failed to fetch server address:", e)
            }
            if (r) {
                for (var s = [], n = 0, i = 5e3; ;) try {
                    await new Promise((e => setTimeout(e, o)));
                    var c = await GetPublicMessagesByAddress(r, n, i);
                    if (!c || 0 === c.length) break;
                    if (s = s.concat(c), c.length < i) break;
                    n += i
                } catch (e) {
                    console.error("[SYSTEM] Failed to fetch server messages, skip:", n, "error:", e);
                    break
                }
                var l = [],
                    d = [],
                    p = new Map;
                for (var m of s)
                    if (m.TransactionId && !processedMessages.has(m.TransactionId)) {
                        d.push(m.TransactionId);
                        var f = m.FromAddress,
                            u = Date.parse(m.BlockDate) || Date.now(),
                            g = p.get(f);
                        (!g || g.timestamp < u) && p.set(f, {
                            msg: m,
                            timestamp: u
                        })
                    } else if (m.TransactionId) break;
                for (var y of p) {
                    m = y[1].msg, u = y[1].timestamp;
                    try {
                        await new Promise((e => setTimeout(e, o)));
                        var h = await GetProfileByAddress(m.FromAddress);
                        if (!h || !h.URN) {
                            console.log("[USERS] Skipping server message, no URN for address:", m.FromAddress, "transactionId:", m.TransactionId);
                            continue
                        }
                        var w = h.URN.replace(/[^a-zA-Z0-9]/g, "");
                        await new Promise((e => setTimeout(e, o)));
                        var v = await GetProfileByURN(w);
                        if (v) {
                            if (!v.Creators || !v.Creators.includes(m.FromAddress)) {
                                console.log("[USERS] Skipping server message, invalid creators for user:", w, "transactionId:", m.TransactionId);
                                continue
                            }
                        } else console.log("[USERS] No profile for user:", w, "transactionId:", m.TransactionId);
                        var S = calculateSpawnPoint(w + "@" + worldName),
                            T = null,
                            M = [],
                            b = m.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                        if (b) {
                            var C = b[1];
                            if (/^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/.test(C)) try {
                                await new Promise((e => setTimeout(e, o)));
                                var I = await fetchIPFS(C);
                                I && I.offer && I.world === worldName && (T = I.offer, M = I.iceCandidates || [])
                            } catch (e) {
                                console.error("[SYSTEM] Failed to fetch IPFS for hash:", C, "error:", e, "transactionId:", m.TransactionId)
                            }
                        }
                        knownServers.some((e => e.hostUser === w && e.transactionId === m.TransactionId)) || (l.push({
                            hostUser: w,
                            spawn: S,
                            offer: T,
                            iceCandidates: M,
                            transactionId: m.TransactionId,
                            timestamp: u,
                            connectionRequestCount: 0,
                            latestRequestTime: null
                        }), processedMessages.add(m.TransactionId))
                    } catch (e) {
                        console.error("[SYSTEM] Error processing server message:", m.TransactionId, e)
                    }
                }
                console.log("[SYSTEM] New server announcements found:", l.length);
                var k = new Map;
                for (var A of knownServers.concat(l)) (!k.has(A.hostUser) || k.get(A.hostUser).timestamp < A.timestamp) && k.set(A.hostUser, A);
                knownServers = Array.from(k.values()).sort((function (e, t) {
                    return t.timestamp - e.timestamp
                })).slice(0, 10), l.length > 0 && (addMessage("New player(s) available to connect!", 3e3), updateHudButtons())
            } else t < 3 ? (t++, setTimeout(a, 5e3 * Math.pow(2, t))) : (addMessage("Failed to fetch server announcements", 3e3), console.error("[SYSTEM] Max retries reached for server announcements"))
        }()
    }
}
async function initServers() {
    console.log("[SYSTEM] Initializing servers for:", worldName);
    var e, t = "MCServerJoin@" + worldName,
        o = [];
    try {
        e = await GetPublicAddressByKeyword(t)
    } catch (e) {
        console.error("[SYSTEM] Failed to fetch initial server address:", e)
    }
    if (e) {
        console.log("[SYSTEM] Fetching initial server announcements for:", t);
        for (var a = [], r = 0, s = 5e3, n = 350; ;) try {
            if (await new Promise((e => setTimeout(e, n))), !(C = await GetPublicMessagesByAddress(e, r, s)) || 0 === C.length) break;
            if (a = a.concat(C), C.length < s) break;
            r += s
        } catch (e) {
            console.error("[SYSTEM] Failed to fetch initial server messages, skip:", r, "error:", e);
            break
        }
        console.log("[SYSTEM] Initial poll: Found", a.length, "server announcements");
        var i = new Map;
        for (var c of a)
            if (c.TransactionId && !processedMessages.has(c.TransactionId)) {
                processedMessages.add(c.TransactionId);
                var l = Date.parse(c.BlockDate) || Date.now(),
                    d = i.get(c.FromAddress);
                (!d || d.timestamp < l) && i.set(c.FromAddress, {
                    msg: c,
                    timestamp: l
                })
            } else if (c.TransactionId) {
                console.log("[SYSTEM] Stopping server message processing at cached ID:", c.TransactionId);
                break
            }
        for (var p of i) {
            c = p[1].msg, l = p[1].timestamp;
            try {
                if (await new Promise((e => setTimeout(e, n))), !(k = await GetProfileByAddress(c.FromAddress)) || !k.URN) {
                    console.log("[USERS] Skipping initial server message, no URN for address:", c.FromAddress, "transactionId:", c.TransactionId);
                    continue
                }
                var m = k.URN.replace(/[^a-zA-Z0-9]/g, "");
                if (await new Promise((e => setTimeout(e, n))), A = await GetProfileByURN(m)) {
                    if (!A.Creators || !A.Creators.includes(c.FromAddress)) {
                        console.log("[USERS] Skipping initial server message, invalid creators for user:", m, "transactionId:", c.TransactionId);
                        continue
                    }
                } else console.log("[USERS] No profile for user:", m, "transactionId:", c.TransactionId);
                var f = calculateSpawnPoint(m + "@" + worldName),
                    u = null,
                    g = [];
                if (E = c.Message.match(/IPFS:([a-zA-Z0-9]+)/)) {
                    var y = E[1];
                    if (/^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/.test(y)) try {
                        await new Promise((e => setTimeout(e, n))), (x = await fetchIPFS(y)) && x.offer && x.world === worldName && (u = x.offer, g = x.iceCandidates || [])
                    } catch (e) {
                        console.error("[SYSTEM] Failed to fetch IPFS for hash:", y, "error:", e, "transactionId:", c.TransactionId)
                    }
                }
                knownServers.some((e => e.hostUser === m && e.transactionId === c.TransactionId)) || knownServers.push({
                    hostUser: m,
                    spawn: f,
                    offer: u,
                    iceCandidates: g,
                    transactionId: c.TransactionId,
                    timestamp: l,
                    connectionRequestCount: 0,
                    latestRequestTime: null
                }), o.push("MCConn@" + m + "@" + worldName)
            } catch (e) {
                console.error("[SYSTEM] Error processing initial server message:", c.TransactionId, e)
            }
        }
        var h = new Map;
        for (var w of knownServers) (!h.has(w.hostUser) || h.get(w.hostUser).timestamp < w.timestamp) && h.set(w.hostUser, w);
        for (var v of (knownServers = Array.from(h.values()).sort((function (e, t) {
            return t.timestamp - e.timestamp
        })).slice(0, 10), isHost && o.push("MCConn@" + userName + "@" + worldName), o)) {
            try {
                await new Promise((e => setTimeout(e, n))), M = await GetPublicAddressByKeyword(v)
            } catch (e) {
                console.error("[SYSTEM] Failed to fetch initial response address for:", v, e)
            }
            if (M) {
                for (a = [], r = 0, s = 5e3; ;) try {
                    if (await new Promise((e => setTimeout(e, n))), !(C = await GetPublicMessagesByAddress(M, r, s)) || 0 === C.length) break;
                    if (a = a.concat(C), C.length < s) break;
                    r += s
                } catch (e) {
                    console.error("[SYSTEM] Failed to fetch initial response messages for:", v, "skip:", r, "error:", e);
                    break
                }
                for (var c of (console.log("[SYSTEM] Initial poll: Found", a.length, "existing responses for:", v), a)) {
                    if (c.TransactionId && processedMessages.has(c.TransactionId)) {
                        console.log("[SYSTEM] Stopping response message processing at cached ID:", c.TransactionId);
                        break
                    }
                    c.TransactionId && processedMessages.add(c.TransactionId)
                }
                var S = a.length,
                    T = a.length > 0 ? Date.parse(a[0].BlockDate) || Date.now() : null;
                m = v.match(/MCConn@(.+)@[^@]+$/)[1];
                (w = knownServers.find((function (e) {
                    return e.hostUser === m
                }))) && (w.connectionRequestCount = S, w.latestRequestTime = T)
            }
        }
        if (isHost) {
            var M, b = "MCConn@" + userName + "@" + worldName;
            if (M = await GetPublicAddressByKeyword(b)) {
                for (a = [], r = 0, s = 5e3; ;) try {
                    var C;
                    if (await new Promise((e => setTimeout(e, n))), !(C = await GetPublicMessagesByAddress(M, r, s)) || 0 === C.length) break;
                    if (a = a.concat(C), C.length < s) break;
                    r += s
                } catch (e) {
                    console.error("[SYSTEM] Failed to fetch initial host offer messages for:", b, "skip:", r, "error:", e);
                    break
                }
                var I = [];
                for (var c of a) {
                    if (c.TransactionId && processedMessages.has(c.TransactionId)) {
                        console.log("[SYSTEM] Stopping host offer processing at cached ID:", c.TransactionId);
                        break
                    }
                    if (c.TransactionId) {
                        processedMessages.add(c.TransactionId);
                        try {
                            var k;
                            if (!(k = await GetProfileByAddress(c.FromAddress)) || !k.URN) {
                                console.log("[USERS] Skipping initial offer message, no URN for address:", c.FromAddress, "txId:", c.TransactionId);
                                continue
                            }
                            var A, E, P = k.URN.replace(/[^a-zA-Z0-9]/g, "");
                            if (!(A = await GetProfileByURN(P))) {
                                console.log("[USERS] No profile for user:", P, "txId:", c.TransactionId);
                                continue
                            }
                            if (!A.Creators || !A.Creators.includes(c.FromAddress)) {
                                console.log("[USERS] Skipping initial offer message, invalid creators for user:", P, "txId:", c.TransactionId);
                                continue
                            }
                            if (!(E = c.Message.match(/IPFS:([a-zA-Z0-9]+)/))) {
                                console.log("[SYSTEM] No IPFS hash in initial offer message:", c.Message, "txId:", c.TransactionId);
                                continue
                            }
                            y = E[1];
                            if (!/^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/.test(y)) {
                                console.log("[SYSTEM] Invalid CID in initial offer message:", y, "txId:", c.TransactionId);
                                continue
                            }
                            try {
                                var x;
                                if (await new Promise((e => setTimeout(e, n))), !(x = await fetchIPFS(y)) || !x.world || x.world !== worldName) {
                                    console.log("[SYSTEM] Invalid IPFS data for initial offer message:", y, "txId:", c.TransactionId);
                                    continue
                                } (x.offer || x.answer) && I.push({
                                    clientUser: x.user || P,
                                    offer: x.offer || x.answer,
                                    iceCandidates: x.iceCandidates || [],
                                    transactionId: c.TransactionId,
                                    timestamp: Date.parse(c.BlockDate) || Date.now(),
                                    profile: k
                                })
                            } catch (e) {
                                console.error("[SYSTEM] Failed to fetch IPFS for initial offer hash:", y, "error:", e, "txId:", c.TransactionId)
                            }
                        } catch (e) {
                            console.error("[SYSTEM] Error processing initial offer message:", c.TransactionId, e)
                        }
                    }
                }
                I.length > 0 && (pendingOffers.push(...I), setupPendingModal())
            }
        }
        console.log("[SYSTEM] Initial load complete."), worker.postMessage({
            type: "sync_processed",
            ids: Array.from(processedMessages)
        }), isInitialLoad = !1
    } else console.error("[SYSTEM] No server address for:", t)
}

function openUsersModal() {
    console.log("[MODAL] Opening users modal");
    var e = document.getElementById("usersModal");
    e && (e.remove(), console.log("[MODAL] Removed existing usersModal"));
    var t = document.createElement("div");
    t.id = "usersModal", t.style.position = "fixed", t.style.left = "50%", t.style.top = "50%", t.style.transform = "translate(-50%,-50%)", t.style.zIndex = "220", t.style.background = "var(--panel)", t.style.padding = "14px", t.style.borderRadius = "10px", t.style.minWidth = "360px", t.style.display = "block", t.innerHTML = '\n            <h3>Online Players</h3>\n            <div style="margin-bottom:10px;">\n                <input id="friendHandle" placeholder="Enter friend’s handle" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:#0d1620;color:#fff;box-sizing:border-box;" autocomplete="off">\n                <button id="connectFriend" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;background:var(--accent);color:#111;border:0;font-weight:700;cursor:pointer;">Connect to Friend</button>\n            </div>\n            <div id="usersList"></div>\n            <p class="warning">Note: Servers may be offline. Connection requires the host to be active. Recent attempts increase success likelihood.</p>\n            <div style="margin-top:10px;text-align:right;">\n                <button id="closeUsers">Close</button>\n            </div>\n        ', document.body.appendChild(t), console.log("[MODAL] Modal added to DOM");
    var o = t.querySelector("#usersList");
    o.innerHTML = "";
    var a = !1,
        r = document.createElement("h4");
    for (var s of (r.innerText = "Connected Players", o.appendChild(r), peers)) {
        var n = s[0];
        if (n !== userName) {
            a = !0, console.log("[MODAL] Rendering peer:", n);
            var i = calculateSpawnPoint(n + "@" + worldName);
            (h = document.createElement("div")).style.display = "flex", h.style.gap = "8px", h.style.alignItems = "center", h.style.marginTop = "8px", (f = document.createElement("div")).innerText = n + " (Connected) at (" + Math.floor(i.x) + ", " + Math.floor(i.y) + ", " + Math.floor(i.z) + ")", (m = document.createElement("button")).innerText = "Visit Spawn",
                function (e, o) {
                    m.onclick = function () {
                        console.log("[MODAL] Teleporting to spawn of:", e), respawnPlayer(o.x, 100, o.z), t.style.display = "none", isPromptOpen = !1
                    }
                }(n, i), h.appendChild(f), h.appendChild(m), o.appendChild(h)
        }
    }
    var c = document.createElement("h4");
    c.innerText = "Known Servers (Last 10)", o.appendChild(c);
    var l = new Map;
    for (var d of knownServers) (!l.has(d.hostUser) || l.get(d.hostUser).timestamp < d.timestamp) && l.set(d.hostUser, d);
    var p = Array.from(l.values()).sort((function (e, t) {
        return t.timestamp - e.timestamp
    })).slice(0, 10);
    for (var d of p) {
        a = !0, console.log("[MODAL] Rendering server:", d.hostUser), (h = document.createElement("div")).style.display = "flex", h.style.gap = "8px", h.style.alignItems = "center", h.style.marginTop = "8px";
        var m, f = document.createElement("div"),
            u = connectionAttempts.get(d.hostUser);
        if (f.innerText = d.hostUser + " at (" + Math.floor(d.spawn.x) + ", " + Math.floor(d.spawn.y) + ", " + Math.floor(d.spawn.z) + ")\nServer started: " + new Date(d.timestamp).toLocaleString() + "\nLast connect attempt: " + (u ? new Date(u).toLocaleString() : "Never") + "\nConnection requests: " + (d.connectionRequestCount || 0) + "\nLatest request: " + (d.latestRequestTime ? new Date(d.latestRequestTime).toLocaleString() : "None"), f.style.whiteSpace = "pre-line", !(peers.has(d.hostUser) || isHost && d.hostUser === userName)) (m = document.createElement("button")).innerText = "Try Connect", m.onclick = async function () {
            console.log("[WEBRTC] Attempting to connect to server:", d.hostUser), addMessage("Finding a route to " + d.hostUser + "...", 5e3), await connectToServer(d.hostUser, d.offer, d.iceCandidates), t.style.display = "none", isPromptOpen = !1
        }, h.appendChild(m);
        h.appendChild(f), o.appendChild(h)
    }
    if (isHost) {
        var g = document.createElement("h4");
        for (var y of (g.innerText = "Pending Connections", o.appendChild(g), pendingOffers)) {
            var h;
            (h = document.createElement("div")).style.display = "flex", h.style.gap = "8px", h.style.alignItems = "center", h.style.marginTop = "8px", (f = document.createElement("div")).innerText = y.clientUser + " at " + new Date(y.timestamp).toLocaleString() + "\nBio: " + (y.profile && y.profile.Bio ? y.profile.Bio : "No bio"), f.style.whiteSpace = "pre-line", h.appendChild(f), o.appendChild(h), a = !0
        }
    }
    if (!a) {
        console.log("[MODAL] No servers or peers to render in modal");
        var w = document.createElement("div");
        w.style.marginTop = "8px", w.innerText = "No players available", o.appendChild(w)
    }
    t.querySelector("#closeUsers").onclick = function () {
        console.log("[MODAL] Closing users modal"), t.remove(), isPromptOpen = !1
    }, t.querySelector("#friendHandle").addEventListener("keydown", (function (e) {
        e.stopPropagation()
    })), t.querySelector("#connectFriend").onclick = function () {
        isConnecting = !0;
        var e = document.getElementById("friendHandle").value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
        if (e)
            if (e !== userName) {
                console.log("[WEBRTC] Attempting to connect to friend:", e);
                var o = calculateSpawnPoint(e + "@" + worldName);
                knownServers.push({
                    hostUser: e,
                    spawn: o,
                    offer: null,
                    iceCandidates: [],
                    transactionId: "local_" + Date.now(),
                    timestamp: Date.now(),
                    connectionRequestCount: 0,
                    latestRequestTime: null
                }), connectToServer(e, null, []), t.style.display = "none", isPromptOpen = !1
            } else addMessage("Cannot connect to yourself", 3e3);
        else addMessage("Please enter a friend’s handle", 3e3)
    }
}

function cleanupPeer(e) {
    const t = peers.get(e);
    if (t && (t.pc && t.pc.close(), t.keepaliveInterval && clearInterval(t.keepaliveInterval), peers.delete(e)), playerAvatars.has(e)) {
        const t = playerAvatars.get(e);
        scene.remove(t), disposeObject(t), playerAvatars.delete(e)
    }
    if (userAudioStreams.has(e)) {
        const t = userAudioStreams.get(e);
        t.audio.srcObject = null, t.audio.remove(), userAudioStreams.delete(e)
    }
    userVideoStreams.has(e) && userVideoStreams.delete(e), delete userPositions[e], addMessage(`${e} has disconnected.`), updateHudButtons(), console.log(`[WebRTC] Cleaned up peer: ${e}`)
}
async function toggleCamera() {
    const e = document.getElementById("cameraBtn"),
        t = document.getElementById("proximityVideo"),
        o = document.getElementById("proximityVideoElement"),
        a = document.getElementById("proximityVideoLabel");
    if (localVideoStream) {
        localVideoStream.getTracks().forEach((e => e.stop())), localVideoStream = null;
        for (const [e, t] of peers.entries()) {
            if (t.pc) {
                t.pc.getSenders().filter((e => e.track && "video" === e.track.kind)).forEach((e => t.pc.removeTrack(e)));
                const e = await t.pc.createOffer();
                await t.pc.setLocalDescription(e), t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                    type: "renegotiation_offer",
                    offer: e
                }))
            }
            t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                type: "video_stopped",
                username: userName
            }))
        }
        e.style.opacity = "0.5", t.style.display = "none", o.srcObject && (o.srcObject = null), addMessage("Camera disabled", 2e3)
    } else try {
        localVideoStream = await navigator.mediaDevices.getUserMedia({
            video: !0
        });
        for (const [e, t] of peers.entries()) {
            if (t.pc) {
                localVideoStream.getTracks().forEach((e => t.pc.addTrack(e, localVideoStream)));
                const e = await t.pc.createOffer();
                await t.pc.setLocalDescription(e), t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                    type: "renegotiation_offer",
                    offer: e
                }))
            }
            t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify({
                type: "video_started",
                username: userName
            }))
        }
        e.style.opacity = "1", o.srcObject = localVideoStream, a.innerText = userName, t.style.display = "block", addMessage("Camera enabled", 2e3), lastProximityVideoChangeTime = Date.now(), proximityVideoUsers = [userName, ...proximityVideoUsers.filter((e => e !== userName))], currentProximityVideoIndex = 0
    } catch (e) {
        addMessage("Could not access camera", 3e3), console.error("Error accessing camera:", e)
    }
}
async function initAudio() {
    try {
        localAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: !0,
                noiseSuppression: !0,
                autoGainControl: !0
            }
        })
    } catch (e) {
        console.error("Error accessing microphone:", e), addMessage("Microphone access denied. Proximity chat will be disabled.", 5e3)
    }
}

function updateProximityVideo() {
    const e = Date.now(),
        t = document.getElementById("proximityVideo"),
        o = document.getElementById("proximityVideoElement"),
        a = document.getElementById("proximityVideoLabel"),
        r = new THREE.Vector3(player.x, player.y, player.z),
        s = [];
    for (const [e, t] of userVideoStreams.entries())
        if (e !== userName && userPositions[e]) {
            const t = userPositions[e],
                o = new THREE.Vector3(t.targetX, t.targetY, t.targetZ);
            r.distanceTo(o) <= 32 && s.push(e)
        } let n = [...s];
    if (localVideoStream && n.unshift(userName), proximityVideoUsers = n, 0 === proximityVideoUsers.length) return t.style.display = "none", o.srcObject && (o.srcObject = null), void (currentProximityVideoIndex = 0);
    t.style.display = "block", currentProximityVideoIndex >= proximityVideoUsers.length && (currentProximityVideoIndex = 0);
    e - lastProximityVideoChangeTime > 3e4 && (lastProximityVideoChangeTime = e, currentProximityVideoIndex = (currentProximityVideoIndex + 1) % proximityVideoUsers.length);
    const i = proximityVideoUsers[currentProximityVideoIndex],
        c = i === userName ? localVideoStream : userVideoStreams.get(i)?.stream;
    o.srcObject !== c && (a.innerText = i, o.srcObject = c)
}