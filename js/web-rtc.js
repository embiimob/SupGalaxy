var peers = new Map,
    pendingOffers = [],
    connectionAttempts = new Map;
window.hasPolledHost = !1;
// Timeout for IPFS-based signaling (60 minutes in milliseconds)
const IPFS_SIGNALING_TIMEOUT_MS = 60 * 60 * 1000;
// Interval for refreshing ICE candidates for pending connections (5 minutes)
// TURN allocations typically expire after 5-10 minutes
const ICE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
var knownServers = [],
    isHost = !1,
    isConnecting = !1,
    answerPollingIntervals = new Map,
    offerPollingIntervals = new Map,
    pendingConnectionRefreshIntervals = new Map,
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
        // Use uniform keyword format: world@friendUsername (target's thread)
        var p = worldName + "@" + e,
            m = await GetPublicAddressByKeyword(p);
        document.getElementById("joinScriptText").value = m ? m.trim().replace(/"|'/g, "") : p, document.getElementById("joinScriptModal").style.display = "block", document.getElementById("joinScriptModal").querySelector("h3").innerText = "Connect to Server", document.getElementById("joinScriptModal").querySelector("p").innerText = "Copy this address and paste it into a Sup!? message To: field, attach the JSON file, and click 📢 to connect to " + e + ". After sending, wait for host confirmation.", addMessage("Offer created for " + e + ". Send the JSON via Sup!? and wait for host to accept.", 1e4), peers.set(e, {
            pc: r,
            dc: s,
            address: null
        });
        // Monitor own thread for answers: world@username
        var f = worldName + "@" + userName;
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
            }), Date.now() - connectionAttempts.get(e) > 36e5) {
                console.log("[WebRTC] Answer polling timeout for:", e), addMessage("Connection to " + e + " timed out after 60 minutes.", 5e3), clearInterval(answerPollingIntervals.get(f)), answerPollingIntervals.delete(f);
                var t = peers.get(e);
                t && t.pc && t.pc.close(), peers.delete(e), playerAvatars.has(e) && (scene.remove(playerAvatars.get(e)), disposeObject(playerAvatars.get(e)), playerAvatars.delete(e)), delete userPositions[e], updateHudButtons()
            }
        }), 3e4))
    } catch (t) {
        console.error("[WebRTC] Failed to create offer for:", e, "error:", t), addMessage("Failed to connect to " + e, 3e3), r.close(), peers.delete(e);
        var userKeyword = worldName + "@" + userName;
        clearInterval(answerPollingIntervals.get(userKeyword)), answerPollingIntervals.delete(userKeyword)
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
            console.log("[MINIMAP] Player session file detected, applying...");
            await applySaveFile(o.playerData, "local", new Date().toISOString());
            return;
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
                // Use uniform keyword format: world@username
            var userKeyword = worldName + "@" + userName;
            console.log("[WEBRTC] Successfully processed answer for:", e), addMessage("Connected to " + e + " via file", 5e3), updateHudButtons(), clearInterval(answerPollingIntervals.get(userKeyword)), answerPollingIntervals.delete(userKeyword)
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
                    // Use uniform keyword format: world@username
                var userKeyword = worldName + "@" + userName;
                console.log("[WEBRTC] Successfully processed batch answer for:", e), addMessage("Connected to " + e + " via batch file", 5e3), updateHudButtons(), clearInterval(answerPollingIntervals.get(userKeyword)), answerPollingIntervals.delete(userKeyword)
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
            // Stop polling for offers when connected as a client
            // (hosts should continue polling for offers from other players)
            stopOfferPolling();
            console.log(`[WebRTC] Client stopped offer polling after connecting to host.`);
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

            // Sync calligraphy stones to new player
            if (Object.keys(calligraphyStones).length > 0) {
                const calligraphyStonesSync = {
                    type: "calligraphy_stones_sync",
                    stones: {}
                };
                for (const key in calligraphyStones) {
                    const stone = calligraphyStones[key];
                    calligraphyStonesSync.stones[key] = {
                        x: stone.x, y: stone.y, z: stone.z,
                        width: stone.width, height: stone.height,
                        offsetX: stone.offsetX, offsetY: stone.offsetY, offsetZ: stone.offsetZ,
                        bgColor: stone.bgColor, transparent: stone.transparent,
                        fontFamily: stone.fontFamily, fontSize: stone.fontSize,
                        fontWeight: stone.fontWeight, fontColor: stone.fontColor,
                        text: stone.text, link: stone.link,
                        direction: stone.direction
                    };
                }
                e.send(JSON.stringify(calligraphyStonesSync));
            }
            
            // When a new peer connects, recalculate spawn chunks for ALL existing peers in current world
            if (isHost) {
                console.log(`[WEBRTC] Host recalculating spawn chunks for all peers in world ${worldName}`);
                for (const [peerName, peer] of peers.entries()) {
                    const playerSpawn = calculateSpawnPoint(peerName + "@" + worldName);
                    const spawnCx = Math.floor(playerSpawn.x / CHUNK_SIZE);
                    const spawnCz = Math.floor(playerSpawn.z / CHUNK_SIZE);
                    
                    spawnChunks.set(peerName, {
                        cx: spawnCx,
                        cz: spawnCz,
                        username: peerName,
                        world: worldName,
                        spawn: playerSpawn
                    });
                    
                    const playerHomeChunkKey = makeChunkKey(worldName, spawnCx, spawnCz);
                    updateChunkOwnership(playerHomeChunkKey, peerName, Date.now(), 'home');
                }
                // Also recalculate for the host itself
                const hostSpawn = calculateSpawnPoint(userName + "@" + worldName);
                const hostSpawnCx = Math.floor(hostSpawn.x / CHUNK_SIZE);
                const hostSpawnCz = Math.floor(hostSpawn.z / CHUNK_SIZE);
                
                spawnChunks.set(userName, {
                    cx: hostSpawnCx,
                    cz: hostSpawnCz,
                    username: userName,
                    world: worldName,
                    spawn: hostSpawn
                });
                
                const hostHomeChunkKey = makeChunkKey(worldName, hostSpawnCx, hostSpawnCz);
                updateChunkOwnership(hostHomeChunkKey, userName, Date.now(), 'home');
                console.log(`[Ownership] Host recalculated spawn chunks for all peers in world ${worldName}`);
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
                    if (i === userName || peers.has(i)) break;
                    
                    addMessage(`${i} has joined!`);
                    
                    if (!playerAvatars.has(i)) {
                        createAndSetupAvatar(i, !1);
                    }
                    
                    if (!peers.has(i)) {
                        peers.set(i, {
                            pc: null,
                            dc: null,
                            address: null
                        });
                    }
                    
                    // If host, calculate and store new player's spawn point
                    if (isHost) {
                        const playerSpawn = calculateSpawnPoint(i + "@" + worldName);
                        const spawnCx = Math.floor(playerSpawn.x / CHUNK_SIZE);
                        const spawnCz = Math.floor(playerSpawn.z / CHUNK_SIZE);
                        
                        spawnChunks.set(i, {
                            cx: spawnCx,
                            cz: spawnCz,
                            username: i,
                            world: worldName,
                            spawn: playerSpawn
                        });
                        
                        // Assign home spawn ownership
                        const playerHomeChunkKey = makeChunkKey(worldName, spawnCx, spawnCz);
                        updateChunkOwnership(playerHomeChunkKey, i, Date.now(), 'home');
                        console.log(`[Ownership] Host calculated and assigned home spawn chunk ${playerHomeChunkKey} to ${i}`);
                    }
                    
                    updateHudButtons();
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
                case "calligraphy_stone_placed":
                    // When the host receives this message from a client, it needs to both
                    // create the screen locally AND relay the message to all other clients.
                    if (isHost) {
                        for (const [peerUsername, peer] of peers.entries()) {
                            if (peerUsername !== n && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(e.data);
                            }
                        }
                    }
                    createCalligraphyStoneScreen(s.stoneData);
                    break;
                case "calligraphy_stones_sync":
                    if (!isHost) {
                        for (const key in s.stones) {
                            if (Object.hasOwnProperty.call(s.stones, key)) {
                                createCalligraphyStoneScreen(s.stones[key]);
                            }
                        }
                    }
                    break;
                case "calligraphy_stone_removed":
                    if (!isHost) {
                        const key = s.key;
                        if (calligraphyStones[key]) {
                            if (calligraphyStones[key].mesh) {
                                scene.remove(calligraphyStones[key].mesh);
                                disposeObject(calligraphyStones[key].mesh);
                            }
                            delete calligraphyStones[key];
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
                        
                        // Recalculate spawn chunks for ALL peers in the requested world
                        // This is important: we calculate spawn chunks for all known peers in this world,
                        // not just those currently in it, since spawn points are deterministic
                        console.log(`[WEBRTC] Host recalculating spawn chunks for all peers in world ${s.world} (world sync request)`);
                        for (const [peerName, otherPeer] of peers.entries()) {
                            const peerSpawn = calculateSpawnPoint(peerName + "@" + s.world);
                            const peerSpawnCx = Math.floor(peerSpawn.x / CHUNK_SIZE);
                            const peerSpawnCz = Math.floor(peerSpawn.z / CHUNK_SIZE);
                            
                            spawnChunks.set(peerName, {
                                cx: peerSpawnCx,
                                cz: peerSpawnCz,
                                username: peerName,
                                world: s.world,
                                spawn: peerSpawn
                            });
                            
                            const peerChunkKey = makeChunkKey(s.world, peerSpawnCx, peerSpawnCz);
                            updateChunkOwnership(peerChunkKey, peerName, Date.now(), 'home');
                        }
                        // Also recalculate for host
                        const hostSpawn = calculateSpawnPoint(userName + "@" + s.world);
                        const hostSpawnCx = Math.floor(hostSpawn.x / CHUNK_SIZE);
                        const hostSpawnCz = Math.floor(hostSpawn.z / CHUNK_SIZE);
                        
                        spawnChunks.set(userName, {
                            cx: hostSpawnCx,
                            cz: hostSpawnCz,
                            username: userName,
                            world: s.world,
                            spawn: hostSpawn
                        });
                        
                        const hostChunkKey = makeChunkKey(s.world, hostSpawnCx, hostSpawnCz);
                        updateChunkOwnership(hostChunkKey, userName, Date.now(), 'home');
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
                            
                            // Calculate and store player's spawn point for the new world
                            const playerSpawn = calculateSpawnPoint(s.username + "@" + clientWorld);
                            const spawnCx = Math.floor(playerSpawn.x / CHUNK_SIZE);
                            const spawnCz = Math.floor(playerSpawn.z / CHUNK_SIZE);
                            
                            spawnChunks.set(s.username, {
                                cx: spawnCx,
                                cz: spawnCz,
                                username: s.username,
                                world: clientWorld,
                                spawn: playerSpawn
                            });
                            
                            // Assign home spawn ownership for new world
                            const playerHomeChunkKey = makeChunkKey(clientWorld, spawnCx, spawnCz);
                            updateChunkOwnership(playerHomeChunkKey, s.username, Date.now(), 'home');
                            console.log(`[Ownership] Host calculated spawn for ${s.username} switching to world ${clientWorld}: chunk ${playerHomeChunkKey}`);
                            
                            // Recalculate spawn chunks for ALL peers in this world
                            // Calculate for all known peers, not just those currently in the world
                            console.log(`[WEBRTC] Host recalculating spawn chunks for all peers in world ${clientWorld}`);
                            for (const [peerName, otherPeer] of peers.entries()) {
                                const peerSpawn = calculateSpawnPoint(peerName + "@" + clientWorld);
                                const peerSpawnCx = Math.floor(peerSpawn.x / CHUNK_SIZE);
                                const peerSpawnCz = Math.floor(peerSpawn.z / CHUNK_SIZE);
                                
                                spawnChunks.set(peerName, {
                                    cx: peerSpawnCx,
                                    cz: peerSpawnCz,
                                    username: peerName,
                                    world: clientWorld,
                                    spawn: peerSpawn
                                });
                                
                                const peerChunkKey = makeChunkKey(clientWorld, peerSpawnCx, peerSpawnCz);
                                updateChunkOwnership(peerChunkKey, peerName, Date.now(), 'home');
                            }
                            // Also recalculate for host
                            const hostSpawn = calculateSpawnPoint(userName + "@" + clientWorld);
                            const hostSpawnCx = Math.floor(hostSpawn.x / CHUNK_SIZE);
                            const hostSpawnCz = Math.floor(hostSpawn.z / CHUNK_SIZE);
                            
                            spawnChunks.set(userName, {
                                cx: hostSpawnCx,
                                cz: hostSpawnCz,
                                username: userName,
                                world: clientWorld,
                                spawn: hostSpawn
                            });
                            
                            const hostChunkKey = makeChunkKey(clientWorld, hostSpawnCx, hostSpawnCz);
                            updateChunkOwnership(hostChunkKey, userName, Date.now(), 'home');
                        }
                    }
                    break;
                case 'request_block_place':
                    if (isHost) {
                        console.log(`[WebRTC] Host received block place request from ${s.username} at (${s.x}, ${s.y}, ${s.z})`);
                        
                        // Validate ownership
                        const placeChunkX = Math.floor(modWrap(s.x, MAP_SIZE) / CHUNK_SIZE);
                        const placeChunkZ = Math.floor(modWrap(s.z, MAP_SIZE) / CHUNK_SIZE);
                        const placeChunkKey = makeChunkKey(s.world, placeChunkX, placeChunkZ);
                        
                        if (isChunkMutationAllowed(placeChunkKey, s.username)) {
                            // Allowed: place block and broadcast
                            chunkManager.setBlockGlobal(s.x, s.y, s.z, s.blockId, true, s.originSeed);
                            
                            if (s.originSeed && s.originSeed !== worldSeed) {
                                const blockKey = `${s.x},${s.y},${s.z}`;
                                getCurrentWorldState().foreignBlockOrigins.set(blockKey, s.originSeed);
                            }
                            
                            // Renew or establish ownership on edit
                            const normalized = placeChunkKey.replace(/^#/, "");
                            const ownership = OWNED_CHUNKS.get(normalized);
                            const now = Date.now();
                            
                            if (!ownership || ownership.type === 'ipfs') {
                                // Check if this is not a home spawn chunk
                                const parsed = parseChunkKey(normalized);
                                let isHomeSpawn = false;
                                if (parsed && spawnChunks.size > 0) {
                                    for (const [spawnUser, spawnData] of spawnChunks) {
                                        if (spawnData.cx === parsed.cx && spawnData.cz === parsed.cz && spawnData.world === parsed.world) {
                                            isHomeSpawn = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (!isHomeSpawn) {
                                    if (!ownership) {
                                        // No ownership exists - establish new ownership for 1 year
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] New ownership established for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.username === s.username) {
                                        // Owner is editing - renew for 1 year from now
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Ownership renewed for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.expiryDate && now > ownership.expiryDate) {
                                        // Previous ownership expired - establish new ownership
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Expired ownership replaced for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.pending) {
                                        // Pending ownership - anyone can claim by editing
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Pending ownership claimed by ${s.username} at chunk ${normalized}`);
                                    }
                                }
                            }
                            
                            // Broadcast to all clients
                            const placeMsg = JSON.stringify({
                                type: 'block_place',
                                x: s.x,
                                y: s.y,
                                z: s.z,
                                blockId: s.blockId,
                                username: s.username,
                                world: s.world,
                                originSeed: s.originSeed
                            });
                            for (const [peerName, peer] of peers.entries()) {
                                if (peer.dc && peer.dc.readyState === 'open') {
                                    peer.dc.send(placeMsg);
                                }
                            }
                            console.log(`[Ownership] Block place allowed for ${s.username} at chunk ${placeChunkKey}`);
                        } else {
                            // Denied: send denial message
                            let reason = 'Unknown';
                            const ownership = OWNED_CHUNKS.get(placeChunkKey);
                            
                            // Check if it's a spawn chunk
                            const parsed = parseChunkKey(placeChunkKey);
                            if (parsed && spawnChunks.size > 0) {
                                for (const [spawnUser, spawnData] of spawnChunks) {
                                    if (spawnData.cx === parsed.cx && spawnData.cz === parsed.cz && spawnData.world === parsed.world) {
                                        reason = `Chunk owned by ${spawnUser} (home spawn)`;
                                        break;
                                    }
                                }
                            }
                            
                            // If not spawn chunk, check OWNED_CHUNKS
                            if (reason === 'Unknown' && ownership) {
                                if (ownership.pending) {
                                    reason = 'Claim immature (<30d)';
                                } else if (ownership.expiryDate && Date.now() > ownership.expiryDate) {
                                    reason = 'Claim expired (>1y)';
                                } else {
                                    reason = `Chunk owned by ${ownership.username}`;
                                }
                            }
                            
                            const peer = peers.get(s.username);
                            if (peer && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(JSON.stringify({
                                    type: 'block_action_denied',
                                    x: s.x,
                                    y: s.y,
                                    z: s.z,
                                    reason: reason,
                                    chunkKey: placeChunkKey
                                }));
                            }
                            console.log(`[Ownership] Block place denied for ${s.username} at chunk ${placeChunkKey}: ${reason}`);
                        }
                    }
                    break;
                case 'request_block_break':
                    if (isHost) {
                        console.log(`[WebRTC] Host received block break request from ${s.username} at (${s.x}, ${s.y}, ${s.z})`);
                        
                        // Validate ownership
                        const breakChunkX = Math.floor(modWrap(s.x, MAP_SIZE) / CHUNK_SIZE);
                        const breakChunkZ = Math.floor(modWrap(s.z, MAP_SIZE) / CHUNK_SIZE);
                        const breakChunkKey = makeChunkKey(s.world, breakChunkX, breakChunkZ);
                        
                        if (isChunkMutationAllowed(breakChunkKey, s.username)) {
                            // Allowed: break block and broadcast
                            const blockKey = `${s.x},${s.y},${s.z}`;
                            const worldState = getCurrentWorldState();
                            const originSeed = worldState.foreignBlockOrigins.get(blockKey);
                            const blockId = getBlockAt(s.x, s.y, s.z);
                            
                            chunkManager.setBlockGlobal(s.x, s.y, s.z, BLOCK_AIR, s.username);
                            if (originSeed) worldState.foreignBlockOrigins.delete(blockKey);
                            
                            // Renew or establish ownership on edit
                            const normalized = breakChunkKey.replace(/^#/, "");
                            const ownership = OWNED_CHUNKS.get(normalized);
                            const now = Date.now();
                            
                            if (!ownership || ownership.type === 'ipfs') {
                                // Check if this is not a home spawn chunk
                                const parsed = parseChunkKey(normalized);
                                let isHomeSpawn = false;
                                if (parsed && spawnChunks.size > 0) {
                                    for (const [spawnUser, spawnData] of spawnChunks) {
                                        if (spawnData.cx === parsed.cx && spawnData.cz === parsed.cz && spawnData.world === parsed.world) {
                                            isHomeSpawn = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (!isHomeSpawn) {
                                    if (!ownership) {
                                        // No ownership exists - establish new ownership for 1 year
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] New ownership established for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.username === s.username) {
                                        // Owner is editing - renew for 1 year from now
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Ownership renewed for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.expiryDate && now > ownership.expiryDate) {
                                        // Previous ownership expired - establish new ownership
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Expired ownership replaced for ${s.username} at chunk ${normalized}`);
                                    } else if (ownership.pending) {
                                        // Pending ownership - anyone can claim by editing
                                        updateChunkOwnership(normalized, s.username, now, 'ipfs', now);
                                        console.log(`[Ownership] Pending ownership claimed by ${s.username} at chunk ${normalized}`);
                                    }
                                }
                            }
                            
                            // Send inventory update to the breaker
                            const peer = peers.get(s.username);
                            if (peer && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(JSON.stringify({
                                    type: 'add_to_inventory',
                                    blockId: blockId,
                                    count: 1,
                                    originSeed: originSeed
                                }));
                            }
                            
                            // Broadcast to all clients
                            const breakMsg = JSON.stringify({
                                type: 'block_break',
                                x: s.x,
                                y: s.y,
                                z: s.z,
                                username: s.username,
                                world: s.world,
                                originSeed: originSeed
                            });
                            for (const [peerName, peer] of peers.entries()) {
                                if (peer.dc && peer.dc.readyState === 'open') {
                                    peer.dc.send(breakMsg);
                                }
                            }
                            console.log(`[Ownership] Block break allowed for ${s.username} at chunk ${breakChunkKey}`);
                        } else {
                            // Denied: send denial message
                            let reason = 'Unknown';
                            const ownership = OWNED_CHUNKS.get(breakChunkKey);
                            
                            // Check if it's a spawn chunk
                            const parsed = parseChunkKey(breakChunkKey);
                            if (parsed && spawnChunks.size > 0) {
                                for (const [spawnUser, spawnData] of spawnChunks) {
                                    if (spawnData.cx === parsed.cx && spawnData.cz === parsed.cz && spawnData.world === parsed.world) {
                                        reason = `Chunk owned by ${spawnUser} (home spawn)`;
                                        break;
                                    }
                                }
                            }
                            
                            // If not spawn chunk, check OWNED_CHUNKS
                            if (reason === 'Unknown' && ownership) {
                                if (ownership.pending) {
                                    reason = 'Claim immature (<30d)';
                                } else if (ownership.expiryDate && Date.now() > ownership.expiryDate) {
                                    reason = 'Claim expired (>1y)';
                                } else {
                                    reason = `Chunk owned by ${ownership.username}`;
                                }
                            }
                            
                            const peer = peers.get(s.username);
                            if (peer && peer.dc && peer.dc.readyState === 'open') {
                                peer.dc.send(JSON.stringify({
                                    type: 'block_action_denied',
                                    x: s.x,
                                    y: s.y,
                                    z: s.z,
                                    reason: reason,
                                    chunkKey: breakChunkKey
                                }));
                            }
                            console.log(`[Ownership] Block break denied for ${s.username} at chunk ${breakChunkKey}: ${reason}`);
                        }
                    }
                    break;
                case 'block_place':
                    if (!isHost) {
                        // Client receives authoritative block place from host
                        console.log(`[WebRTC] Client received block place from host: (${s.x}, ${s.y}, ${s.z}) blockId: ${s.blockId}`);
                        chunkManager.setBlockGlobal(s.x, s.y, s.z, s.blockId, false, s.originSeed);
                        
                        if (s.originSeed && s.originSeed !== worldSeed) {
                            const blockKey = `${s.x},${s.y},${s.z}`;
                            getCurrentWorldState().foreignBlockOrigins.set(blockKey, s.originSeed);
                        }
                        
                        // Update inventory if this was our request
                        if (s.username === userName) {
                            const item = INVENTORY[selectedHotIndex];
                            if (item && item.id === s.blockId) {
                                item.count -= 1;
                                if (item.count <= 0) {
                                    INVENTORY[selectedHotIndex] = null;
                                }
                                updateHotbarUI();
                                addMessage("Placed " + (BLOCKS[s.blockId] ? BLOCKS[s.blockId].name : s.blockId));
                            }
                            // Play audio only for the initiating client
                            safePlayAudio(soundPlace);
                        }
                        
                        // Handle light blocks
                        if (BLOCKS[s.blockId] && BLOCKS[s.blockId].light) {
                            const blockKey = `${s.x},${s.y},${s.z}`;
                            torchRegistry.set(blockKey, { x: s.x, y: s.y, z: s.z });
                            const particles = createFlameParticles(s.x, s.y + 0.5, s.z);
                            scene.add(particles);
                            torchParticles.set(blockKey, particles);
                        }
                    }
                    break;
                case 'block_break':
                    if (!isHost) {
                        // Client receives authoritative block break from host
                        console.log(`[WebRTC] Client received block break from host: (${s.x}, ${s.y}, ${s.z})`);
                        const blockId = getBlockAt(s.x, s.y, s.z);
                        chunkManager.setBlockGlobal(s.x, s.y, s.z, BLOCK_AIR, s.username);
                        
                        const blockKey = `${s.x},${s.y},${s.z}`;
                        if (s.originSeed) {
                            getCurrentWorldState().foreignBlockOrigins.delete(blockKey);
                        }
                        
                        createBlockParticles(s.x, s.y, s.z, blockId);
                        
                        // Play audio only for the initiating client
                        if (s.username === userName) {
                            safePlayAudio(soundBreak);
                        }
                        
                        // Handle light blocks
                        if (BLOCKS[blockId] && BLOCKS[blockId].light) {
                            torchRegistry.delete(blockKey);
                            if (torchParticles.has(blockKey)) {
                                const particles = torchParticles.get(blockKey);
                                scene.remove(particles);
                                particles.geometry.dispose();
                                particles.material.dispose();
                                torchParticles.delete(blockKey);
                            }
                            lightManager.update(new THREE.Vector3(player.x, player.y, player.z));
                        }
                    }
                    break;
                case 'block_action_denied':
                    if (!isHost) {
                        // Client receives denial from host
                        addMessage(`Cannot edit: ${s.reason}`, 3000);
                        console.log(`[Ownership] Action denied at (${s.x}, ${s.y}, ${s.z}): ${s.reason}`);
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
    e.style.display = pendingOffers.length > 0 ? "block" : "none"
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
                address: null,
                isPendingConnection: true, // Mark as pending until data channel opens
                connectionStartTime: Date.now()
            }), i.ondatachannel = t => {
                console.log('[WebRTC] Host ondatachannel fired for:', e, 'channel:', t.channel.label);
                const o = t.channel;
                const peer = peers.get(e);
                if (peer) {
                    peer.dc = o;
                    peer.isPendingConnection = false; // Connection is now established
                }
                // Clear the ICE refresh interval since connection is established
                if (pendingConnectionRefreshIntervals.has(e)) {
                    clearInterval(pendingConnectionRefreshIntervals.get(e));
                    pendingConnectionRefreshIntervals.delete(e);
                    console.log('[WebRTC] Cleared ICE refresh interval for:', e);
                }
                setupDataChannel(o, e)
            }, i.oniceconnectionstatechange = () => {
                console.log('[WebRTC] Host ICE state change for', e, ':', i.iceConnectionState);
                const peer = peers.get(e);
                
                // Handle successful connection
                if (i.iceConnectionState === 'connected' || i.iceConnectionState === 'completed') {
                    if (peer && peer.isPendingConnection) {
                        console.log('[WebRTC] Host ICE connected for', e, '- connection established!');
                        peer.isPendingConnection = false;
                    }
                    // Clear the ICE refresh interval since connection is established
                    if (pendingConnectionRefreshIntervals.has(e)) {
                        clearInterval(pendingConnectionRefreshIntervals.get(e));
                        pendingConnectionRefreshIntervals.delete(e);
                        console.log('[WebRTC] Cleared ICE refresh interval for:', e);
                    }
                }
                
                // Don't cleanup pending connections on temporary ICE failures
                // Allow time for IPFS signaling to complete
                if (i.iceConnectionState === 'disconnected' || i.iceConnectionState === 'failed') {
                    if (peer && peer.isPendingConnection) {
                        const elapsedMs = Date.now() - peer.connectionStartTime;
                        if (elapsedMs < IPFS_SIGNALING_TIMEOUT_MS) {
                            console.log('[WebRTC] Host ICE disconnected for pending connection', e, '- keeping peer alive for IPFS signaling (', Math.round(elapsedMs / 60000), 'min elapsed)');
                            // Try to restart ICE if it failed and browser supports it
                            if (i.iceConnectionState === 'failed' && typeof i.restartIce === 'function') {
                                console.log('[WebRTC] Attempting ICE restart for', e);
                                i.restartIce();
                            }
                            return; // Don't cleanup yet
                        } else {
                            console.log('[WebRTC] Host ICE failed for', e, 'after timeout - cleaning up');
                            // Clean up the refresh interval
                            if (pendingConnectionRefreshIntervals.has(e)) {
                                clearInterval(pendingConnectionRefreshIntervals.get(e));
                                pendingConnectionRefreshIntervals.delete(e);
                            }
                        }
                    }
                }
            }, i.onconnectionstatechange = () => {
                console.log('[WebRTC] Host connection state change for', e, ':', i.connectionState);
                const peer = peers.get(e);
                
                // Handle successful connection
                if (i.connectionState === 'connected') {
                    if (peer && peer.isPendingConnection) {
                        console.log('[WebRTC] Host connection established for', e);
                        peer.isPendingConnection = false;
                    }
                }
                
                // Don't cleanup pending connections on connection failures
                // Allow time for IPFS signaling to complete
                if (i.connectionState === 'disconnected' || i.connectionState === 'failed') {
                    if (peer && peer.isPendingConnection) {
                        const elapsedMs = Date.now() - peer.connectionStartTime;
                        if (elapsedMs < IPFS_SIGNALING_TIMEOUT_MS) {
                            console.log('[WebRTC] Host connection', i.connectionState, 'for pending connection', e, '- keeping peer alive for IPFS signaling (', Math.round(elapsedMs / 60000), 'min elapsed)');
                            // For failed state, try to restart the connection
                            if (i.connectionState === 'failed' && typeof i.restartIce === 'function') {
                                console.log('[WebRTC] Attempting ICE restart on connection failure for', e);
                                i.restartIce();
                            }
                            return; // Don't let the browser cleanup the peer
                        } else {
                            console.log('[WebRTC] Host connection', i.connectionState, 'for', e, 'after timeout - cleaning up');
                            // Clean up the refresh interval
                            if (pendingConnectionRefreshIntervals.has(e)) {
                                clearInterval(pendingConnectionRefreshIntervals.get(e));
                                pendingConnectionRefreshIntervals.delete(e);
                            }
                        }
                    }
                }
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
            }), o.push(e), console.log(`[FIXED] Created answer for ${e} - NO TIMEOUT`);
            
            // Start periodic ICE refresh for pending connections
            // This keeps TURN allocations fresh while waiting for IPFS signaling
            const peerUser = e;
            const peerConnection = i;
            const refreshInterval = setInterval(() => {
                const peer = peers.get(peerUser);
                if (!peer || !peer.isPendingConnection) {
                    // Connection established or peer removed, stop refreshing
                    clearInterval(refreshInterval);
                    pendingConnectionRefreshIntervals.delete(peerUser);
                    console.log('[WebRTC] Stopped ICE refresh - connection established or removed:', peerUser);
                    return;
                }
                const elapsedMs = Date.now() - peer.connectionStartTime;
                if (elapsedMs >= IPFS_SIGNALING_TIMEOUT_MS) {
                    // Timeout reached, stop refreshing
                    clearInterval(refreshInterval);
                    pendingConnectionRefreshIntervals.delete(peerUser);
                    console.log('[WebRTC] Stopped ICE refresh - timeout reached:', peerUser);
                    return;
                }
                // Restart ICE to get fresh TURN allocations
                if (typeof peerConnection.restartIce === 'function') {
                    console.log('[WebRTC] Periodic ICE refresh for pending connection:', peerUser, '(', Math.round(elapsedMs / 60000), 'min elapsed)');
                    peerConnection.restartIce();
                }
            }, ICE_REFRESH_INTERVAL_MS);
            pendingConnectionRefreshIntervals.set(e, refreshInterval);
            console.log('[WebRTC] Started periodic ICE refresh for:', e, '(every', ICE_REFRESH_INTERVAL_MS / 60000, 'min)');
        } catch (t) {
            console.error(`[ERROR] Failed ${e}:`, t), i && i.close();
            // Clean up refresh interval if it was set before the error
            if (pendingConnectionRefreshIntervals.has(e)) {
                clearInterval(pendingConnectionRefreshIntervals.get(e));
                pendingConnectionRefreshIntervals.delete(e);
            }
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
        const n = document.getElementById("joinScriptModal");
        // Generate list of addresses for each recipient using uniform keyword format: world@recipientUsername
        // Use Promise.all for concurrent lookups for better performance
        const addressPromises = t.map(async (answer) => {
            const recipientKeyword = worldName + "@" + answer.user;
            const recipientAddr = await GetPublicAddressByKeyword(recipientKeyword);
            return recipientAddr?.trim().replace(/"|'/g, "") || recipientKeyword;
        });
        const recipientAddresses = await Promise.all(addressPromises);
        const c = recipientAddresses.join(",");
        n.querySelector("h3").innerText = "🚀 BATCH READY - SEND NOW", n.querySelector("p").innerText = "Copy address → Sup!? To: field → Attach JSON → 📢 SEND IMMEDIATELY. Each recipient will receive on their own thread.", n.querySelector("#joinScriptText").value = c, n.style.display = "block", isPromptOpen = !0, addMessage(`✅ Batch ready for ${o.length} players - SEND NOW!`, 1e4), pendingOffers = pendingOffers.filter((e => !o.includes(e.clientUser))), updatePendingModal()
    }
}

function setupPendingModal() {
    console.log("[MODAL] Setting up pendingModal");
    const e = document.getElementById("pendingModal");
    e && (e.remove(), console.log("[MODAL] Removed existing pendingModal"));
    const t = document.createElement("div");
    t.id = "pendingModal", t.style.position = "fixed", t.style.right = "12px", t.style.bottom = "12px", t.style.zIndex = "220", t.style.background = "var(--panel)", t.style.padding = "14px", t.style.borderRadius = "10px", t.style.minWidth = "300px", t.style.maxWidth = "400px", t.style.display = pendingOffers.length > 0 ? "block" : "none", t.innerHTML = '\n            <h3>Pending Connections</h3>\n            <div id="pendingList"></div>\n            <div class="actions">\n                <label><input type="checkbox" id="acceptAll"> Accept All</label>\n                <button id="acceptPending">Accept Selected</button>\n                <button id="closePending">Close</button>\n            </div>\n        ', document.body.appendChild(t), console.log("[MODAL] pendingModal added to DOM");
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
    // All players should poll for offers at their own world@username thread
    // (not just hosts). This enables IPFS-based signaling where anyone can receive offers.
    console.log("[SYSTEM] Starting offer polling for:", userName);
    // Use uniform keyword format: world@username (monitoring own thread for offers)
    var e = worldName + "@" + userName;
    if (offerPollingIntervals.has(e)) {
        console.log("[SYSTEM] Offer polling already active for:", e);
        return;
    }
    var t = setInterval((async function () {
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
}

function stopOfferPolling() {
    // Stop offer polling (called when client connects to a host)
    var e = worldName + "@" + userName;
    if (offerPollingIntervals.has(e)) {
        console.log("[SYSTEM] Stopping offer polling for:", e);
        clearInterval(offerPollingIntervals.get(e));
        offerPollingIntervals.delete(e);
    }
}

function stopAllPolling() {
    console.log("[SYSTEM] Stopping all polling intervals");
    offerPollingIntervals.forEach(clearInterval);
    offerPollingIntervals.clear();
    answerPollingIntervals.forEach(clearInterval);
    answerPollingIntervals.clear();
}

function startAnswerPolling(e) {
    // Use uniform keyword format: world@username (monitoring own thread for answers)
    var t = worldName + "@" + userName;
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
        }), Date.now() - connectionAttempts.get(e) > 36e5) {
            console.log("[SYSTEM] Answer polling timeout for:", e), addMessage("Connection to " + e + " timed out after 60 minutes.", 5e3), clearInterval(answerPollingIntervals.get(t)), answerPollingIntervals.delete(t);
            var o = peers.get(e);
            o && o.pc && o.pc.close(), peers.delete(e), playerAvatars.has(e) && (scene.remove(playerAvatars.get(e)), disposeObject(playerAvatars.get(e)), playerAvatars.delete(e)), delete userPositions[e], updateHudButtons()
        }
    }), 3e4)))
}
async function initServers() {
    console.log("[SYSTEM] Initializing servers for:", worldName);
    var n = 350;
    var a, r, s;

    // Cache user's own world@username thread at world load to prevent processing old messages
    var userThreadKeyword = worldName + "@" + userName;
    console.log("[SYSTEM] Caching user's own thread:", userThreadKeyword);
    try {
        var userThreadAddr = await GetPublicAddressByKeyword(userThreadKeyword);
        if (userThreadAddr) {
            for (a = [], r = 0, s = 5e3; ;) try {
                if (await new Promise((e => setTimeout(e, n))), !(C = await GetPublicMessagesByAddress(userThreadAddr, r, s)) || 0 === C.length) break;
                if (a = a.concat(C), C.length < s) break;
                r += s
            } catch (e) {
                console.error("[SYSTEM] Failed to fetch user thread messages for caching:", userThreadKeyword, "skip:", r, "error:", e);
                break
            }
            console.log("[SYSTEM] Caching", a.length, "messages from user's thread:", userThreadKeyword);
            for (var c of a) {
                if (c.TransactionId) {
                    processedMessages.add(c.TransactionId);
                }
            }
        }
    } catch (e) {
        console.error("[SYSTEM] Failed to cache user's thread:", userThreadKeyword, e)
    }
    console.log("[SYSTEM] Initial load complete."), worker.postMessage({
        type: "sync_processed",
        ids: Array.from(processedMessages)
    }), isInitialLoad = !1;
    // Start offer polling for all players at their own world@username thread
    // This enables receiving offers via IPFS signaling
    startOfferPolling();
}

function openUsersModal() {
    console.log("[MODAL] Opening users modal");
    var e = document.getElementById("usersModal");
    e && (e.remove(), console.log("[MODAL] Removed existing usersModal"));
    var t = document.createElement("div");
    t.id = "usersModal", t.style.position = "fixed", t.style.left = "50%", t.style.top = "50%", t.style.transform = "translate(-50%,-50%)", t.style.zIndex = "220", t.style.background = "var(--panel)", t.style.padding = "14px", t.style.borderRadius = "10px", t.style.minWidth = "360px", t.style.maxHeight = "80vh", t.style.display = "flex", t.style.flexDirection = "column",
        t.innerHTML = '\n            <h3 style="margin-top:0;">Online Players</h3>\n            <div style="margin-bottom:10px;">\n                <input id="friendHandle" placeholder="Enter friend’s handle" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:#0d1620;color:#fff;box-sizing:border-box;" autocomplete="off">\n                <button id="connectFriend" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;background:var(--accent);color:#111;border:0;font-weight:700;cursor:pointer;">Connect to Friend</button>\n            </div>\n            <div id="usersList" style="overflow-y: auto; flex-grow: 1; margin-bottom: 10px;"></div>\n            <p class="warning" style="font-size: 0.8em; opacity: 0.7;">Note: Servers may be offline. Connection requires the host to be active.</p>\n            <div style="margin-top:auto;text-align:right;">\n                <button id="closeUsers">Close</button>\n            </div>\n        ', document.body.appendChild(t), console.log("[MODAL] Modal added to DOM");
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

    // Known Worlds Section
    var c = document.createElement("h4");
    c.innerText = "Known Worlds", c.style.marginTop = "20px", o.appendChild(c);

    // Sort known worlds, putting current world first, then by discovery time or user count
    const sortedWorlds = Array.from(knownWorlds.entries()).sort((a, b) => {
        if (a[0] === worldName) return -1;
        if (b[0] === worldName) return 1;
        return a[0].localeCompare(b[0]); // Alphabetical for now, could be timestamp
    });

    for (const [wName, wData] of sortedWorlds) {
        const worldItem = document.createElement("div");
        worldItem.style.border = "1px solid rgba(255,255,255,0.1)";
        worldItem.style.borderRadius = "8px";
        worldItem.style.padding = "10px";
        worldItem.style.marginBottom = "10px";
        worldItem.style.background = wName === worldName ? "rgba(255,255,255,0.05)" : "transparent";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.innerHTML = `<strong>${wName}</strong> ${wName === worldName ? '(Current)' : ''}`;

        // Switch World Button (if not current)
        if (wName !== worldName) {
            const switchBtn = document.createElement("button");
            switchBtn.innerText = "Switch to World";
            switchBtn.style.fontSize = "0.8em";
            switchBtn.style.padding = "4px 8px";
            switchBtn.onclick = () => {
                switchWorld(wName);
                t.remove();
                isPromptOpen = false;
            };
            header.appendChild(switchBtn);
        }
        worldItem.appendChild(header);

        // Users List in World
        if (wData.users && wData.users.size > 0) {
            const usersContainer = document.createElement("div");
            usersContainer.style.marginTop = "8px";
            usersContainer.style.fontSize = "0.9em";

            wData.users.forEach((userData, uName) => {
                const userRow = document.createElement("div");
                userRow.style.display = "flex";
                userRow.style.justifyContent = "space-between";
                userRow.style.alignItems = "center";
                userRow.style.padding = "4px 0";
                userRow.style.borderTop = "1px solid rgba(255,255,255,0.05)";

                // Determine correct timestamp display
                let timeDisplay = "Unknown time";
                if (userData && userData.timestamp) {
                    timeDisplay = new Date(userData.timestamp).toLocaleString();
                } else if (wData.discoverer === uName) {
                     // Fallback for discoverer if stored differently in legacy
                     timeDisplay = "Discoverer";
                }

                userRow.innerHTML = `<span>${uName}</span> <span style="font-size:0.8em; opacity:0.6;">${timeDisplay}</span>`;

                // Teleport Button
                const teleportBtn = document.createElement("button");
                teleportBtn.innerText = "Spawn";
                teleportBtn.style.fontSize = "0.7em";
                teleportBtn.style.marginLeft = "10px";
                teleportBtn.onclick = () => {
                    // Ensure we are in the correct world first
                    if (worldName !== wName) {
                        if(confirm(`Switch to ${wName} to teleport?`)) {
                             switchWorld(wName);
                             // After switch, teleport logic needs to wait or be handled.
                             // Simple approach: just switch. User can teleport manually or we rely on persistent state if implemented.
                             // For now, we just switch. The user asked to "teleport to the spawns right from the report".
                             // But respawnPlayer relies on chunk generation of current world.
                             // We can calculate spawn coordinate.
                             const spawn = calculateSpawnPoint(wName + "@" + uName);
                             // Setting player position immediately after switch might be unsafe if chunks aren't ready.
                             // But switchWorld resets player to their own spawn.
                             // Let's try setting a target.
                             setTimeout(() => {
                                 respawnPlayer(spawn.x, spawn.y, spawn.z);
                             }, 1000); // Slight delay to allow switchWorld to settle
                             t.remove();
                             isPromptOpen = false;
                        }
                    } else {
                        const spawn = calculateSpawnPoint(wName + "@" + uName);
                        respawnPlayer(spawn.x, spawn.y, spawn.z);
                        t.remove();
                        isPromptOpen = false;
                    }
                };

                userRow.appendChild(teleportBtn);
                usersContainer.appendChild(userRow);
            });
            worldItem.appendChild(usersContainer);
        } else {
            const noUsers = document.createElement("div");
            noUsers.innerText = "No known users.";
            noUsers.style.fontSize = "0.8em";
            noUsers.style.opacity = "0.6";
            worldItem.appendChild(noUsers);
        }

        o.appendChild(worldItem);
        a = true;
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
    // Clean up pending connection refresh interval
    if (pendingConnectionRefreshIntervals.has(e)) {
        clearInterval(pendingConnectionRefreshIntervals.get(e));
        pendingConnectionRefreshIntervals.delete(e);
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