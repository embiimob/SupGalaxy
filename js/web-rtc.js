        /*
        * SupGalaxy WebRTC Module
        *
        * This file contains all the functions and variables related to WebRTC communication,
        * including peer connections, data channels, and signaling.
        */

        var peers = new Map();
        var pendingOffers = [];
        var connectionAttempts = new Map();
        window.hasPolledHost = false;
        var knownServers = [];
        var isHost = false;
        var isConnecting = false;
        var answerPollingIntervals = new Map();
        var offerPollingIntervals = new Map();
        var localAudioStream = null;
        var userAudioStreams = new Map();
        var localVideoStream = null;
        var userVideoStreams = new Map();
        let proximityVideoUsers = [];
        let currentProximityVideoIndex = 0;
        let lastProximityVideoChangeTime = 0;
        var userPositions = {};
        var playerAvatars = new Map();

        //SUP!? PUBLIC STUN AND TURN SERVERS
        async function getTurnCredentials() {
            console.log('[WebRTC] Using static TURN credentials: supgalaxy');
            return [
                { urls: 'stun:supturn.com:3478' },
                {
                    urls: [
                        'turn:supturn.com:3478?transport=udp',
                        'turn:supturn.com:3478?transport=tcp',
                        'turn:supturn.com:443?transport=tcp'
                    ],
                    username: 'supgalaxy',
                    credential: 'supgalaxy',
                    credentialType: 'password'
                }
            ];
        }

        async function connectToServer(hostUser, offer, iceCandidates) {
            if (peers.size >= MAX_PEERS) {
                addMessage('Cannot connect: too many peers.', 3000);
                console.log('[WebRTC] Connection failed: max peers reached');
                return;
            }
            var server = knownServers.find(function (s) { return s.hostUser === hostUser; });
            if (!server) {
                addMessage('No server found for ' + hostUser, 3000);
                console.log('[WebRTC] No server found for:', hostUser);
                return;
            }
            console.log('[WebRTC] Initiating connection to server:', hostUser);
            connectionAttempts.set(hostUser, Date.now());
            const iceServers = await getTurnCredentials();
            var pc = new RTCPeerConnection({ iceServers });
            pc.oniceconnectionstatechange = () => console.log(`[WebRTC] ICE state change for ${hostUser}: ${pc.iceConnectionState}`);

            if (localAudioStream) {
                localAudioStream.getTracks().forEach(track => {
                    pc.addTrack(track, localAudioStream);
                });
            }

            pc.ontrack = (event) => {
                const username = hostUser; // In a client-server model, the track is from the hostUser.
                if (event.track.kind === 'audio') {
                    if (!userAudioStreams.has(username)) {
                        const audio = new Audio();
                        audio.srcObject = event.streams[0];
                        audio.autoplay = true;
                        userAudioStreams.set(username, { audio: audio, stream: event.streams[0] });
                        console.log(`[WebRTC] Received audio stream from ${username}`);
                    }
                } else if (event.track.kind === 'video') {
                    if (!userVideoStreams.has(username)) {
                        const video = document.createElement('video');
                        video.srcObject = event.streams[0];
                        video.autoplay = true;
                        video.playsInline = true;
                        video.style.display = 'none'; // Initially hidden
                        document.body.appendChild(video);
                        userVideoStreams.set(username, { video: video, stream: event.streams[0] });
                        console.log(`[WebRTC] Received video stream from ${username}`);
                    }
                }
            };

            var dc = pc.createDataChannel('game');
            setupDataChannel(dc, hostUser);
            try {
                var offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                var offerIceCandidates = [];
                pc.onicecandidate = function (e) {
                    if (e.candidate) offerIceCandidates.push(e.candidate);
                };
                await new Promise(function (resolve) {
                    pc.onicegatheringstatechange = function () {
                        if (pc.iceGatheringState === 'complete') resolve();
                    };
                });
                var offerData = {
                    world: worldName,
                    user: userName,
                    offer: pc.localDescription,
                    iceCandidates: offerIceCandidates
                };
                var blob = new Blob([JSON.stringify(offerData)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = `${worldName}_offer_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                var responseKeyword = 'MCConn@' + hostUser + '@' + worldName;
                var responseAddr = await GetPublicAddressByKeyword(responseKeyword);
                document.getElementById('joinScriptText').value = responseAddr ? responseAddr.trim().replace(/"|'/g, '') : responseKeyword;
                document.getElementById('joinScriptModal').style.display = 'block';
                document.getElementById('joinScriptModal').querySelector('h3').innerText = 'Connect to Server';
                document.getElementById('joinScriptModal').querySelector('p').innerText = 'Copy this address and paste it into a Sup!? message To: field, attach the JSON file, and click 📢 to connect to ' + hostUser + '. After sending, wait for host confirmation.';
                addMessage('Offer created for ' + hostUser + '. Send the JSON via Sup!? and wait for host to accept.', 10000);
                peers.set(hostUser, { pc: pc, dc: dc, address: null });
                var answerKeyword = 'MCAnswer@' + userName + '@' + worldName;
                answerPollingIntervals.set(answerKeyword, setInterval(function () {
                    worker.postMessage({
                        type: 'poll',
                        chunkKeys: [],
                        masterKey: MASTER_WORLD_KEY,
                        userAddress: userAddress,
                        worldName: worldName,
                        serverKeyword: 'MCServerJoin@' + worldName,
                        offerKeyword: null,
                        answerKeywords: [answerKeyword],
                        userName: userName
                    });
                    if (Date.now() - connectionAttempts.get(hostUser) > 1800000) {
                        console.log('[WebRTC] Answer polling timeout for:', hostUser);
                        addMessage('Connection to ' + hostUser + ' timed out after 30 minutes.', 5000);
                        clearInterval(answerPollingIntervals.get(answerKeyword));
                        answerPollingIntervals.delete(answerKeyword);
                        var peer = peers.get(hostUser);
                        if (peer && peer.pc) peer.pc.close();
                        peers.delete(hostUser);
                        if (playerAvatars.has(hostUser)) {
                            scene.remove(playerAvatars.get(hostUser));
                            disposeObject(playerAvatars.get(hostUser));
                            playerAvatars.delete(hostUser);
                        }
                        delete userPositions[hostUser];
                        updateHudButtons();
                    }
                }, 30000));
            } catch (e) {
                console.error('[WebRTC] Failed to create offer for:', hostUser, 'error:', e);
                addMessage('Failed to connect to ' + hostUser, 3000);
                pc.close();
                peers.delete(hostUser);
                clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
            }
        }
        // Description: Handles file upload via double-click or drag-and-drop on the minimap.
        // If the file is an offer JSON, it adds it to pendingOffers and opens the pending connections modal (server mode).
        // If the file is an answer JSON, it processes it to establish a connection (client mode).
        async function handleMinimapFile(file) {
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Handle new session file format
                if (data.playerData && data.hash) {
                    if (data.playerData.world !== worldName) {
                        addMessage('Invalid file: wrong world', 3000);
                        console.log('[MINIMAP] Invalid file: world mismatch, expected:', worldName, 'got:', data.playerData.world);
                        return;
                    }

                    const playerData = data.playerData;
                    if (playerData.deltas) {
                        for (const delta of playerData.deltas) {
                            const chunkKey = delta.chunk.replace(/^#/, '');
                            chunkManager.applyDeltasToChunk(chunkKey, delta.changes);
                        }
                    }
                    if (playerData.foreignBlockOrigins) {
                        foreignBlockOrigins = new Map(playerData.foreignBlockOrigins);
                    }
                    addMessage('Loaded chunk data from session file.', 3000);
                    return;
                }

                // Check if it's a save session file (old format)
                if (data.deltas && data.profile) {
                    console.log('[MINIMAP] Save session file detected, applying...');
                    await applySaveFile(data, userAddress, new Date().toISOString());
                    addMessage('Save session loaded successfully!', 3000);
                    return;
                }

                if (!data.world || data.world !== worldName) {
                    addMessage('Invalid file: wrong world', 3000);
                    console.log('[MINIMAP] Invalid file: world mismatch, expected:', worldName, 'got:', data.world);
                    return;
                }

                if (data.offer) {
                    // Server mode: Process offer
                    const clientUser = data.user || 'anonymous';
                    if (clientUser === userName) {
                        addMessage('Cannot process offer from self', 3000);
                        console.log('[WEBRTC] Skipping offer from self:', clientUser);
                        return;
                    }
                    const profile = await GetProfileByURN(clientUser);
                    pendingOffers.push({
                        clientUser: clientUser,
                        offer: data.offer,
                        iceCandidates: data.iceCandidates || [],
                        transactionId: 'local_' + Date.now(),
                        timestamp: Date.now(),
                        profile: profile || { URN: clientUser, Creators: [null] }
                    });
                    console.log('[WEBRTC] Added local offer from:', clientUser);
                    addMessage(`Connection request from ${clientUser} via file`, 5000);
                    setupPendingModal();
                    document.getElementById('pendingModal').style.display = 'block';
                    isPromptOpen = true;
                } else if (data.answer && !isHost) {
                    // Client mode: Process answer
                    const hostUser = data.user || 'anonymous';
                    const peer = peers.get(hostUser);
                    if (!peer || !peer.pc) {
                        addMessage('No active connection for ' + hostUser, 3000);
                        console.log('[WEBRTC] No peer connection for:', hostUser);
                        return;
                    }
                    try {
                        await peer.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        for (const candidate of data.iceCandidates || []) {
                            try {
                                await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('[WEBRTC] Failed to add ICE candidate for:', hostUser, 'error:', e);
                            }
                        }
                        console.log('[WEBRTC] Successfully processed answer for:', hostUser);
                        addMessage('Connected to ' + hostUser + ' via file', 5000);
                        updateHudButtons();
                        clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                        answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
                    } catch (e) {
                        console.error('[WEBRTC] Failed to process answer for:', hostUser, 'error:', e);
                        addMessage('Failed to connect to ' + hostUser, 3000);
                    }
                } else if (data.batch && !isHost) {
                    // Client mode: Process batch answer
                    const hostUser = data.user || 'anonymous';
                    const peer = peers.get(hostUser);
                    if (!peer || !peer.pc) {
                        addMessage('No active connection for ' + hostUser, 3000);
                        console.log('[WEBRTC] No peer connection for:', hostUser);
                        return;
                    }
                    const answerEntry = data.batch.find(entry => entry.user === userName);
                    if (!answerEntry) {
                        addMessage('No answer for you in batch from ' + hostUser, 3000);
                        console.log('[WEBRTC] No answer for user:', userName, 'in batch from:', hostUser);
                        return;
                    }
                    try {
                        await peer.pc.setRemoteDescription(new RTCSessionDescription(answerEntry.answer));
                        for (const candidate of answerEntry.iceCandidates || []) {
                            try {
                                await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('[WEBRTC] Failed to add ICE candidate for:', hostUser, 'error:', e);
                            }
                        }
                        console.log('[WEBRTC] Successfully processed batch answer for:', hostUser);
                        addMessage('Connected to ' + hostUser + ' via batch file', 5000);
                        updateHudButtons();
                        clearInterval(answerPollingIntervals.get('MCAnswer@' + userName + '@' + worldName));
                        answerPollingIntervals.delete('MCAnswer@' + userName + '@' + worldName);
                    } catch (e) {
                        console.error('[WEBRTC] Failed to process batch answer for:', hostUser, 'error:', e);
                        addMessage('Failed to connect to ' + hostUser, 3000);
                    }
                } else {
                    addMessage('Invalid file format', 3000);
                    console.log('[MINIMAP] Invalid file: no offer, answer, or batch');
                }
            } catch (e) {
                console.error('[MINIMAP] Error processing file:', e);
                addMessage('Failed to process file', 3000);
            }
        }

        // ✅ COMPLETE FIXED setupDataChannel() - COPY-PASTE THIS
        function setupDataChannel(dc, user) {
            console.log(`[FIXED] Setting up data channel for: ${user}`);

            dc.onopen = () => {
                console.log(`[WEBRTC] Data channel open with: ${user}. State: ${dc.readyState}`);
                addMessage(`Connection established with ${user}`, 3000);
                // Send initial player position
                dc.send(JSON.stringify({
                    type: 'player_move',
                    username: userName,
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    yaw: player.yaw,
                    pitch: player.pitch,
                    isMoving: false,
                    isAttacking: false,
                    timestamp: Date.now()
                }));
                // If this is the host, send the current state of all mobs to the new client
                if (isHost) {
                    // Notify all other clients of the new player
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== user && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'new_player', username: user }));
                        }
                    }
                    // Notify the new client of existing players
                    for (const [peerUser, peerData] of peers.entries()) {
                         if (peerUser !== user && peerData.dc && peerData.dc.readyState === 'open') {
                            dc.send(JSON.stringify({ type: 'new_player', username: peerUser }));
                        }
                    }
                    // also notify about host
                    dc.send(JSON.stringify({ type: 'new_player', username: userName }));

                    //compile and send all chunk deltas to the new player
                    const chunkDeltasArray = Array.from(CHUNK_DELTAS.entries());
                    const foreignBlockOriginsArray = Array.from(foreignBlockOrigins.entries());
                    const worldSyncMessage = {
                        type: 'world_sync',
                        chunkDeltas: chunkDeltasArray,
                        foreignBlockOrigins: foreignBlockOriginsArray
                    };
                    dc.send(JSON.stringify(worldSyncMessage));


                    console.log(`[WEBRTC] Host sending initial mob state to ${user}`);
                    for (const mob of mobs) {
                        dc.send(JSON.stringify({
                            type: 'mob_update',
                            id: mob.id,
                            x: mob.pos.x,
                            y: mob.pos.y,
                            z: mob.pos.z,
                                    hp: mob.hp,
                                    mobType: mob.type
                        }));
                    }
                }
                updateHudButtons();
            };

            dc.onmessage = e => {
                console.log(`[WEBRTC] Message from ${user}`);
                try {
                    const data = JSON.parse(e.data);
                    const sender = data.username || user;
                    if (sender === userName) return;

                    // Host is the source of truth. It processes inputs and broadcasts state.
                    if (isHost) {
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(e.data);
                            }
                        }
                    }

                    // All peers process the message
                    switch (data.type) {
                        case 'new_player':
                            const newPlayerUsername = data.username;
                            if (newPlayerUsername !== userName && !peers.has(newPlayerUsername)) {
                                addMessage(`${newPlayerUsername} has joined!`);
                                if (!playerAvatars.has(newPlayerUsername)) {
                                    createAndSetupAvatar(newPlayerUsername, false);
                                }
                                // Add a placeholder peer entry for player count and state management
                                if (!peers.has(newPlayerUsername)) {
                                    peers.set(newPlayerUsername, { pc: null, dc: null, address: null });
                                }
                                updateHudButtons();
                            }
                            break;
                        case 'world_sync':
                            if (!isHost) {
                                console.log(`[WEBRTC] Received world_sync`);
                                if (data.chunkDeltas) {
                                    const deltas = new Map(data.chunkDeltas);
                                    for (const [chunkKey, changes] of deltas.entries()) {
                                        chunkManager.applyDeltasToChunk(chunkKey, changes);
                                    }
                                }
                                if (data.foreignBlockOrigins) {
                                    foreignBlockOrigins = new Map(data.foreignBlockOrigins);
                                }
                            }
                            break;
                        case 'state_update':
                            if (!isHost) {
                                for (const playerData of data.players) {
                                    const remoteUser = playerData.username;
                                    if (remoteUser === userName) continue;

                                    if (!userPositions[remoteUser]) {
                                        userPositions[remoteUser] = {};
                                        createAndSetupAvatar(remoteUser, false, playerData.yaw);
                                    }
                                    const userState = userPositions[remoteUser];
                                    if (!data.timestamp || data.timestamp > (userState.lastTimestamp || 0)) {
                                        userState.prevX = userState.targetX;
                                        userState.prevY = userState.targetY;
                                        userState.prevZ = userState.targetZ;
                                        userState.prevYaw = userState.targetYaw;
                                        userState.prevPitch = userState.targetPitch;
                                        userState.targetX = playerData.x;
                                        userState.targetY = playerData.y;
                                        userState.targetZ = playerData.z;
                                        userState.targetYaw = playerData.yaw;
                                        userState.targetPitch = playerData.pitch;
                                        userState.isMoving = playerData.isMoving;
                                        userState.lastUpdate = performance.now();
                                        userState.lastTimestamp = data.timestamp;
                                        userState.isAttacking = playerData.isAttacking;
                                        if (playerData.attackStartTime && playerData.attackStartTime !== userState.attackStartTime) {
                                            userState.attackStartTime = playerData.attackStartTime;
                                            userState.localAnimStartTime = performance.now();
                                        }
                                    }
                                }
                            }
                            break;

                        case 'player_respawn':
                            const respawnedUser = data.username;
                            if (userPositions[respawnedUser]) {
                                userPositions[respawnedUser].isDying = false;
                            }
                            const newAvatar = createAndSetupAvatar(respawnedUser, false);
                            newAvatar.position.set(data.x, data.y, data.z);
                            break;

                        case 'player_move':
                            if (!playerAvatars.has(sender)) {
                                createAndSetupAvatar(sender, false, data.yaw);
                            }
                            if (!userPositions[sender]) {
                                userPositions[sender] = {
                                    lastTimestamp: 0,
                                    prevX: data.x, prevY: data.y, prevZ: data.z,
                                    prevYaw: data.yaw, prevPitch: data.pitch,
                                    targetX: data.x, targetY: data.y, targetZ: data.z,
                                    targetYaw: data.yaw, targetPitch: data.pitch
                                };
                            }
                            const userState = userPositions[sender];
                            if (data.timestamp > userState.lastTimestamp) {
                                userState.prevX = userState.targetX;
                                userState.prevY = userState.targetY;
                                userState.prevZ = userState.targetZ;
                                userState.prevYaw = userState.targetYaw;
                                userState.prevPitch = userState.targetPitch;
                                userState.targetX = data.x;
                                userState.targetY = data.y;
                                userState.targetZ = data.z;
                                userState.targetYaw = data.yaw;
                                userState.targetPitch = data.pitch;
                                userState.isMoving = data.isMoving;
                                userState.lastUpdate = performance.now();
                                userState.lastTimestamp = data.timestamp;
                            }
                            break;

                        case 'block_change':
                            const dist = Math.hypot(player.x - data.wx, player.y - data.wy, player.z - data.wz);
                            if (dist < maxAudioDistance) {
                                // Play sound locally for remote player's actions
                                if (data.bid !== 0) { // Placing a block
                                    safePlayAudio(soundPlace);
                                } else { // Breaking a block
                                    safePlayAudio(soundBreak);
                                }
                            }

                            if (isHost) {
                                console.log(`[WEBRTC] Host relaying block change from ${sender}`);
                                for (const [peerUser, peerData] of peers.entries()) {
                                    if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                                        peerData.dc.send(e.data);
                                    }
                                }
                            }
                            chunkManager.setBlockGlobal(data.wx, data.wy, data.wz, data.bid, false, data.originSeed);

                            // If the block is from another world, record its origin.
                            if (data.originSeed && data.originSeed !== worldSeed) {
                                const coordKey = `${data.wx},${data.wy},${data.wz}`;
                                foreignBlockOrigins.set(coordKey, data.originSeed);
                            }
                            if (data.prevBid && BLOCKS[data.prevBid] && BLOCKS[data.prevBid].light) {
                                var lightKey = `${data.wx},${data.wy},${data.wz}`;
                                if (torchLights.has(lightKey)) {
                                    var light = torchLights.get(lightKey);
                                    scene.remove(light);
                                    light.dispose();
                                    torchLights.delete(lightKey);
                                }
                                if (torchParticles.has(lightKey)) {
                                    var particles = torchParticles.get(lightKey);
                                    scene.remove(particles);
                                    particles.geometry.dispose();
                                    particles.material.dispose();
                                    torchParticles.delete(lightKey);
                                }
                            }
                            if (data.bid && BLOCKS[data.bid] && BLOCKS[data.bid].light) {
                                var light = new THREE.PointLight(0xffaa33, 0.8, 16);
                                light.position.set(data.wx, data.wy + 0.5, data.wz);
                                scene.add(light);
                                torchLights.set(`${data.wx},${data.wy},${data.wz}`, light);
                                var particles = createFlameParticles(data.wx, data.wy + 0.5, data.wz);
                                scene.add(particles);
                                torchParticles.set(`${data.wx},${data.wy},${data.wz}`, particles);
                            }
                            break;

                        case 'mob_spawn':
                            if (!mobs.some(m => m.id === data.id)) {
                                const newMob = new Mob(data.x, data.z, data.id, data.mobType);
                                newMob.isAggressive = data.isAggressive;
                                mobs.push(newMob);
                            }
                            break;
                        case 'mob_state_batch':
                            if (!isHost) {
                                const receivedMobIds = new Set();
                                for (const mobState of data.mobs) {
                                    receivedMobIds.add(mobState.id);
                                    let mob = mobs.find(m => m.id === mobState.id);
                                    if (!mob) {
                                        mob = new Mob(mobState.x, mobState.z, mobState.id, mobState.type);
                                        mobs.push(mob);
                                    }
                                    mob.targetPos.set(mobState.x, mobState.y, mobState.z);
                                    mob.hp = mobState.hp;
                                    mob.isAggressive = mobState.isAggressive;
                                     mob.isMoving = mobState.isMoving; // <<< Update isMoving
                                     mob.aiState = mobState.aiState; // <<< Update aiState
                                     if (mobState.quaternion) {
                                         mob.targetQuaternion.fromArray(mobState.quaternion);
                                         mob.lastQuaternionUpdate = performance.now();
                                     }
                                    mob.lastUpdateTime = performance.now();
                                }
                                mobs = mobs.filter(mob => {
                                    if (!receivedMobIds.has(mob.id)) {
                                        scene.remove(mob.mesh);
                                        disposeObject(mob.mesh);
                                        return false;
                                    }
                                    return true;
                                });
                            }
                            break;

                        case 'mob_update':
                            let mob = mobs.find(m => m.id === data.id);
                            if (!mob) {
                                mob = new Mob(data.x, data.z, data.id, data.mobType);
                                mobs.push(mob);
                                // For new mobs, set the initial position directly.
                                // The `targetPos` will also be set below, ensuring no initial lerp.
                                mob.pos.set(data.x, data.y, data.z);
                            }
                            // For all mobs (new and existing), update the target position.
                            // The game loop will handle smoothly interpolating to this new target.
                            mob.targetPos.set(data.x, data.y, data.z);
                            mob.hp = data.hp;
                            mob.lastUpdateTime = performance.now(); // Trigger the interpolation logic.
                            if (data.flash) mob.flashEnd = Date.now() + 200;
                            break;

                        case 'mob_kill':
                            const mobToKill = mobs.find(m => m.id === data.id);
                            if (mobToKill) {
                                try { scene.remove(mobToKill.mesh); disposeObject(mobToKill.mesh); } catch (e) { }
                                mobs = mobs.filter(m => m.id !== mobToKill.id);
                            }
                            break;

                        case 'mob_hit':
                            if (isHost) {
                                const mobToHit = mobs.find(m => m.id === data.id);
                                if (mobToHit) mobToHit.hurt(data.damage || 4, data.username);
                            }
                            break;

                        case 'player_hit':
                            if (isHost) handlePlayerHit(data);
                            break;

                        case 'player_damage':
                            if (Date.now() - lastDamageTime > 400) {
                                player.health = Math.max(0, player.health - (data.damage || 1));
                                lastDamageTime = Date.now();
                                document.getElementById('health').innerText = player.health;
                                updateHealthBar();
                                if (data.attacker === 'lava') {
                                    addMessage('Burning in lava! HP: ' + player.health, 1000);
                                } else {
                                    addMessage('Hit by ' + data.attacker + '! HP: ' + player.health, 1000);
                                }
                                flashDamageEffect();
                                safePlayAudio(soundHit);
                                if (data.kx !== undefined && data.kz !== undefined) {
                                    player.vx += data.kx;
                                    player.vz += data.kz;
                                }
                                if (player.health <= 0) handlePlayerDeath();
                            }
                            break;

                        case 'add_score':
                            player.score += data.amount || 0;
                            document.getElementById('score').innerText = player.score;
                            addMessage(`+${data.amount} score`, 1500);
                            break;

                        case 'player_attack':
                            if (isHost) {
                                const attackerState = userPositions[sender];
                                if (attackerState) {
                                    attackerState.isAttacking = true;
                                    const now = performance.now();
                                    attackerState.attackStartTime = now;
                                    attackerState.localAnimStartTime = now;
                                }
                            }
                            break;

                        case 'player_death':
                            const deadPlayerUsername = data.username;
                            if (userPositions[deadPlayerUsername]) {
                                userPositions[deadPlayerUsername].isDying = true;
                                userPositions[deadPlayerUsername].deathAnimationStart = performance.now();
                                const deadPlayerAvatar = playerAvatars.get(deadPlayerUsername);
                                if (deadPlayerAvatar) deadPlayerAvatar.visible = true;
                            }
                            break;
                        case 'health_update':
                            if (isHost) {
                                if (userPositions[data.username]) {
                                    userPositions[data.username].health = data.health;
                                }
                            }
                            break;
                        case 'laser_fired':
                            laserQueue.push(data);
                            break;
                        case 'item_dropped':
                            if (!droppedItems.some(item => item.id === data.dropId)) {
                                createDroppedItemOrb(data.dropId, new THREE.Vector3(data.position.x, data.position.y, data.position.z), data.blockId, data.originSeed, data.dropper);
                            }
                            break;
                        case 'item_picked_up':
                            const itemIndex = droppedItems.findIndex(item => item.id === data.dropId);
                            if (itemIndex !== -1) {
                                const item = droppedItems[itemIndex];
                                scene.remove(item.mesh);
                                scene.remove(item.light);
                                droppedItems.splice(itemIndex, 1);
                            }
                            break;
                        case 'video_started':
                            addMessage(`${data.username} started their video.`, 2000);
                            break;
                        case 'video_stopped':
                            if (userVideoStreams.has(data.username)) {
                                const videoData = userVideoStreams.get(data.username);
                                if (videoData.video) {
                                    videoData.video.srcObject = null;
                                    videoData.video.remove();
                                }
                                userVideoStreams.delete(data.username);
                                addMessage(`${data.username} stopped their video.`, 2000);
                            }
                            break;
                        case 'renegotiation_offer':
                            if (peers.has(user)) {
                                const peer = peers.get(user);
                                peer.pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                                    .then(() => peer.pc.createAnswer())
                                    .then(answer => peer.pc.setLocalDescription(answer))
                                    .then(() => {
                                        if (peer.dc && peer.dc.readyState === 'open') {
                                            peer.dc.send(JSON.stringify({ type: 'renegotiation_answer', answer: peer.pc.localDescription }));
                                        }
                                    })
                                    .catch(e => console.error("Renegotiation error (offer):", e));
                            }
                            break;
                        case 'renegotiation_answer':
                            if (peers.has(user)) {
                                peers.get(user).pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                                    .catch(e => console.error("Renegotiation error (answer):", e));
                            }
                            break;
                        case 'volcano_event':
                            handleVolcanoEvent(data);
                            break;
                        case 'boulder_update':
                            if (!isHost) {
                                for (const boulderState of data.boulders) {
                                    let boulder = eruptedBlocks.find(b => b.id === boulderState.id);
                                    if (boulder) {
                                        boulder.targetPosition = new THREE.Vector3().fromArray(boulderState.position);
                                        boulder.targetQuaternion = new THREE.Quaternion().fromArray(boulderState.quaternion);
                                        boulder.lastUpdate = performance.now();
                                    }
                                }
                            }
                            break;
                    }
                } catch (err) {
                    console.error(`[WEBRTC] Failed to process message from ${user}:`, err);
                }
            };

            dc.onclose = () => {
                console.log(`[WebRTC] Data channel with ${user} closed.`);
                cleanupPeer(user);
            };

            dc.onerror = e => {
                console.error(`[WebRTC] Data channel error with ${user}:`, e);
                cleanupPeer(user);
            };
        }

        function updatePendingModal() {
            var modal = document.getElementById('pendingModal');
            var list = document.getElementById('pendingList');
            list.innerHTML = '';
            for (var offer of pendingOffers) {
                var row = document.createElement('div');
                row.className = 'row';
                var info = document.createElement('div');
                info.innerText = offer.clientUser + ' at ' + new Date(offer.timestamp).toLocaleString();
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'selectOffer';
                checkbox.dataset.user = offer.clientUser;
                row.appendChild(info);
                row.appendChild(checkbox);
                list.appendChild(row);
            }
            modal.style.display = isHost && pendingOffers.length > 0 ? 'block' : 'none';
        }
        function activateHost() {
            if (!isHost) {
                isHost = true;
                console.log('[SYSTEM] Hosting activated.');
                addMessage('Host mode activated!', 3000);
                startOfferPolling();
                const usersBtn = document.getElementById('usersBtn');
                if (usersBtn) {
                    usersBtn.classList.add('hosting');
                }
            }
        }

        async function acceptPendingOffers() {
            activateHost();
            const checkboxes = document.querySelectorAll('.selectOffer:checked');
            if (checkboxes.length === 0) {
                addMessage('No offers selected', 3000);
                return;
            }

            const batch = [];
            const users = [];

            for (const checkbox of checkboxes) {
                const clientUser = checkbox.dataset.user;
                const offer = pendingOffers.find(o => o.clientUser === clientUser);
                if (!offer || !offer.offer) continue;

                let answer = { type: 'answer', sdp: '' };
                let answerIceCandidates = [];
                let pc = null;

                try {
                    const iceServers = await getTurnCredentials();
                    pc = new RTCPeerConnection({ iceServers });

                    if (localAudioStream) {
                        localAudioStream.getTracks().forEach(track => {
                            pc.addTrack(track, localAudioStream);
                        });
                    }

                    pc.ontrack = (event) => {
                        const username = clientUser; // The track is from the connecting client.
                        if (event.track.kind === 'audio') {
                            if (!userAudioStreams.has(username)) {
                                const audio = new Audio();
                                audio.srcObject = event.streams[0];
                                audio.autoplay = true;
                                userAudioStreams.set(username, { audio: audio, stream: event.streams[0] });
                                console.log(`[WebRTC] Received audio stream from ${username}`);
                            }
                        } else if (event.track.kind === 'video') {
                            if (!userVideoStreams.has(username)) {
                                const video = document.createElement('video');
                                video.srcObject = event.streams[0];
                                video.autoplay = true;
                                video.playsInline = true;
                                video.style.display = 'none'; // Initially hidden
                                document.body.appendChild(video);
                                userVideoStreams.set(username, { video: video, stream: event.streams[0] });
                                console.log(`[WebRTC] Received video stream from ${username}`);
                            }
                        }
                    };

                    // CRITICAL: Store peer IMMEDIATELY
                    peers.set(clientUser, { pc, dc: null, address: null });

                    pc.ondatachannel = (e) => {
                        const dc = e.channel;
                        peers.get(clientUser).dc = dc;
                        setupDataChannel(dc, clientUser);
                    };

                    // NO TIMEOUT - Process IMMEDIATELY
                    await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
                    for (const candidate of offer.iceCandidates || []) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
                    }

                    answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    pc.onicecandidate = e => {
                        if (e.candidate) answerIceCandidates.push(e.candidate);
                    };

                    // COMPLETE ICE GATHERING - NO TIMEOUT
                    await new Promise(resolve => {
                        pc.onicegatheringstatechange = () => {
                            if (pc.iceGatheringState === 'complete') resolve();
                        };
                        // FORCE COMPLETE AFTER 5s MAX
                        setTimeout(resolve, 5000);
                    });

                    batch.push({
                        user: clientUser,
                        answer,
                        iceCandidates: answerIceCandidates
                    });
                    users.push(clientUser);

                    console.log(`[FIXED] Created answer for ${clientUser} - NO TIMEOUT`);

                } catch (e) {
                    console.error(`[ERROR] Failed ${clientUser}:`, e);
                    if (pc) pc.close();
                    continue;
                }
            }

            if (batch.length > 0) {
                const batchData = { world: worldName, user: userName, batch };
                const blob = new Blob([JSON.stringify(batchData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${worldName}_batch_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                // IMMEDIATE MODAL - NO DELAY
                const modal = document.getElementById('joinScriptModal');
                const batchKeyword = 'MCBatch@' + userName + '@' + worldName;
                const addressText = (await GetPublicAddressByKeyword(batchKeyword))?.trim().replace(/"|'/g, '') || batchKeyword;

                modal.querySelector('h3').innerText = '🚀 BATCH READY - SEND NOW';
                modal.querySelector('p').innerText = `Copy address → Sup!? To: field → Attach JSON → 📢 SEND IMMEDIATELY`;
                modal.querySelector('#joinScriptText').value = addressText;
                modal.style.display = 'block';
                isPromptOpen = true;

                addMessage(`✅ Batch ready for ${users.length} players - SEND NOW!`, 10000);
                pendingOffers = pendingOffers.filter(o => !users.includes(o.clientUser));
                updatePendingModal();
            }
        }

        function setupPendingModal() {
            console.log('[MODAL] Setting up pendingModal');
            const existingModal = document.getElementById('pendingModal');
            if (existingModal) {
                existingModal.remove();
                console.log('[MODAL] Removed existing pendingModal');
            }
            const modal = document.createElement('div');
            modal.id = 'pendingModal';
            modal.style.position = 'fixed';
            modal.style.right = '12px';
            modal.style.bottom = '12px';
            modal.style.zIndex = '220';
            modal.style.background = 'var(--panel)';
            modal.style.padding = '14px';
            modal.style.borderRadius = '10px';
            modal.style.minWidth = '300px';
            modal.style.maxWidth = '400px';
            modal.style.display = isHost && pendingOffers.length > 0 ? 'block' : 'none';
            modal.innerHTML = `
            <h3>Pending Connections</h3>
            <div id="pendingList"></div>
            <div class="actions">
                <label><input type="checkbox" id="acceptAll"> Accept All</label>
                <button id="acceptPending">Accept Selected</button>
                <button id="closePending">Close</button>
            </div>
        `;
            document.body.appendChild(modal);
            console.log('[MODAL] pendingModal added to DOM');
            const list = modal.querySelector('#pendingList');
            list.style.maxHeight = 'calc(80vh - 100px)';
            list.style.overflow = 'auto';
            list.innerHTML = '';
            let hasEntries = false;
            const offerMap = new Map();
            for (const offer of pendingOffers) {
                if (offer.clientUser === userName) {
                    console.log('[MODAL] Skipping offer from self:', offer.clientUser);
                    continue;
                }
                if (!offerMap.has(offer.clientUser)) {
                    offerMap.set(offer.clientUser, offer);
                }
            }
            const latestOffers = Array.from(offerMap.values());
            for (const offer of latestOffers) {
                console.log('[MODAL] Rendering pending offer from:', offer.clientUser);
                const row = document.createElement('div');
                row.className = 'row';
                row.style.maxHeight = '80px';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.marginBottom = '8px';
                const info = document.createElement('div');
                info.innerText = `${offer.clientUser || 'Unknown'} at ${new Date(offer.timestamp).toLocaleString()}\nBio: ${offer.profile && offer.profile.Bio ? offer.profile.Bio : 'No bio'}`;
                info.style.whiteSpace = 'pre-line';
                info.style.maxWidth = '200px';
                info.style.maxHeight = '60px';
                info.style.overflow = 'hidden';
                info.style.textOverflow = 'ellipsis';
                info.style.flex = '1';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'selectOffer';
                checkbox.dataset.user = offer.clientUser || '';
                checkbox.dataset.transactionId = offer.transactionId;
                checkbox.style.margin = '0 8px';
                const acceptBtn = document.createElement('button');
                acceptBtn.innerText = 'Accept';
                acceptBtn.style.marginRight = '8px';
                acceptBtn.onclick = () => {
                    console.log('[WEBRTC] Accepting offer from:', offer.clientUser);
                    checkbox.checked = true;
                    acceptPendingOffers();
                };
                const rejectBtn = document.createElement('button');
                rejectBtn.innerText = 'Reject';
                rejectBtn.style.background = 'var(--danger)';
                rejectBtn.style.color = '#111';
                rejectBtn.onclick = () => {
                    console.log('[WEBRTC] Rejecting offer from:', offer.clientUser);
                    pendingOffers = pendingOffers.filter(o => o.clientUser !== offer.clientUser);
                    addMessage(`Rejected connection from ${offer.clientUser || 'Unknown'}`, 3000);
                    setupPendingModal();
                };
                row.appendChild(info);
                row.appendChild(checkbox);
                row.appendChild(acceptBtn);
                row.appendChild(rejectBtn);
                list.appendChild(row);
                hasEntries = true;
            }
            if (!hasEntries) {
                console.log('[MODAL] No pending offers to render');
                const empty = document.createElement('div');
                empty.style.marginTop = '8px';
                empty.innerText = 'No pending connection requests';
                list.appendChild(empty);
            }
            const acceptAll = modal.querySelector('#acceptAll');
            if (acceptAll) {
                acceptAll.addEventListener('change', e => {
                    document.querySelectorAll('.selectOffer').forEach(ch => { ch.checked = e.target.checked; });
                    console.log('[MODAL] Accept All checkbox changed');
                });
            }
            const acceptPending = modal.querySelector('#acceptPending');
            if (acceptPending) {
                acceptPending.onclick = async () => {
                    console.log('[MODAL] Accept Pending clicked');
                    await acceptPendingOffers();
                };
            }
            modal.querySelector('#closePending').onclick = () => {
                console.log('[MODAL] Closing pendingModal');
                modal.style.display = 'none';
                isPromptOpen = false;
            };
        }
        function startOfferPolling() {
            if (!isHost) {
                console.log('[SYSTEM] Not hosting, skipping offer polling');
                return;
            }
            console.log('[SYSTEM] Starting offer polling for:', userName);
            var offerKeyword = 'MCConn@' + userName + '@' + worldName;
            var apiDelay = 350;
            var interval = setInterval(async function () {
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    console.log('[SYSTEM] Polling offers for:', offerKeyword);
                    worker.postMessage({
                        type: 'poll',
                        chunkKeys: [],
                        masterKey: MASTER_WORLD_KEY,
                        userAddress: userAddress,
                        worldName: worldName,
                        serverKeyword: 'MCServerJoin@' + worldName,
                        offerKeyword: offerKeyword,
                        answerKeywords: [],
                        userName: userName
                    });
                } catch (e) {
                    console.error('[SYSTEM] Error in offer polling:', e);
                }
            }, 30000);
            offerPollingIntervals.set(offerKeyword, interval);
        }
        function startAnswerPolling(hostUser) {
            var keyword = 'MCAnswer@' + userName + '@' + worldName;
            if (answerPollingIntervals.has(keyword)) return;
            console.log('[SYSTEM] Starting answer polling for:', hostUser);
            answerPollingIntervals.set(keyword, setInterval(function () {
                worker.postMessage({
                    type: 'poll',
                    chunkKeys: [],
                    masterKey: MASTER_WORLD_KEY,
                    userAddress: userAddress,
                    worldName: worldName,
                    serverKeyword: 'MCServerJoin@' + worldName,
                    offerKeyword: null,
                    answerKeywords: [keyword],
                    userName: userName
                });
                if (Date.now() - connectionAttempts.get(hostUser) > 1800000) {
                    console.log('[SYSTEM] Answer polling timeout for:', hostUser);
                    addMessage('Connection to ' + hostUser + ' timed out after 30 minutes.', 5000);
                    clearInterval(answerPollingIntervals.get(keyword));
                    answerPollingIntervals.delete(keyword);
                    var peer = peers.get(hostUser);
                    if (peer && peer.pc) peer.pc.close();
                    peers.delete(hostUser);
                    if (playerAvatars.has(hostUser)) {
                        scene.remove(playerAvatars.get(hostUser));
                        disposeObject(playerAvatars.get(hostUser));
                        playerAvatars.delete(hostUser);
                    }
                    delete userPositions[hostUser];
                    updateHudButtons();
                }
            }, 30000));
        }
        async function pollServers() {
            if (isInitialLoad) {
                console.log('[SYSTEM] Skipping poll, initial load not complete');
                return;
            }
            console.log('[SYSTEM] Polling server announcements for:', 'MCServerJoin@' + worldName);
            var serverKeyword = 'MCServerJoin@' + worldName;
            var retries = 0;
            var maxRetries = 3;
            var retryDelay = 5000;
            var apiDelay = 350;
            async function tryFetchMessages() {
                var serverAddr;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    serverAddr = await GetPublicAddressByKeyword(serverKeyword);
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch server address:', e);
                }
                if (!serverAddr) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(tryFetchMessages, retryDelay * Math.pow(2, retries));
                    } else {
                        addMessage('Failed to fetch server announcements', 3000);
                        console.error('[SYSTEM] Max retries reached for server announcements');
                    }
                    return;
                }
                var messages = [];
                var skip = 0;
                var qty = 5000;
                while (true) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var response = await GetPublicMessagesByAddress(serverAddr, skip, qty);
                        if (!response || response.length === 0) break;
                        messages = messages.concat(response);
                        if (response.length < qty) break;
                        skip += qty;
                    } catch (e) {
                        console.error('[SYSTEM] Failed to fetch server messages, skip:', skip, 'error:', e);
                        break;
                    }
                }
                var newServers = [];
                var transactionIds = [];
                var messageMap = new Map();
                for (var msg of messages) {
                    if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
                        if (msg.TransactionId) {
                            break; // Stop processing as all remaining messages are older
                        }
                        continue;
                    }
                    transactionIds.push(msg.TransactionId);
                    var fromAddress = msg.FromAddress;
                    var timestamp = Date.parse(msg.BlockDate) || Date.now();
                    var existing = messageMap.get(fromAddress);
                    if (!existing || existing.timestamp < timestamp) {
                        messageMap.set(fromAddress, { msg: msg, timestamp: timestamp });
                    }
                }
                for (var entry of messageMap) {
                    var msg = entry[1].msg;
                    var timestamp = entry[1].timestamp;
                    try {
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var fromProfile = await GetProfileByAddress(msg.FromAddress);
                        if (!fromProfile || !fromProfile.URN) {
                            console.log('[USERS] Skipping server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                            continue;
                        }
                        var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var userProfile = await GetProfileByURN(hostUser);
                        if (!userProfile) {
                            console.log('[USERS] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
                        } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                            console.log('[USERS] Skipping server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
                            continue;
                        }
                        var spawn = calculateSpawnPoint(hostUser + '@' + worldName);
                        var offer = null;
                        var iceCandidates = [];
                        var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                        if (match) {
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (cidRegex.test(hash)) {
                                try {
                                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                                    var data = await fetchIPFS(hash);
                                    if (data && data.offer && data.world === worldName) {
                                        offer = data.offer;
                                        iceCandidates = data.iceCandidates || [];
                                    }
                                } catch (e) {
                                    console.error('[SYSTEM] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
                                }
                            }
                        }
                        if (!knownServers.some(s => s.hostUser === hostUser && s.transactionId === msg.TransactionId)) {
                            newServers.push({
                                hostUser: hostUser,
                                spawn: spawn,
                                offer: offer,
                                iceCandidates: iceCandidates,
                                transactionId: msg.TransactionId,
                                timestamp: timestamp,
                                connectionRequestCount: 0,
                                latestRequestTime: null
                            });
                            processedMessages.add(msg.TransactionId);
                        }
                    } catch (e) {
                        console.error('[SYSTEM] Error processing server message:', msg.TransactionId, e);
                    }
                }
                console.log('[SYSTEM] New server announcements found:', newServers.length);
                var serverMap = new Map();
                for (var server of knownServers.concat(newServers)) {
                    if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                        serverMap.set(server.hostUser, server);
                    }
                }
                knownServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
                if (newServers.length > 0) {
                    addMessage('New player(s) available to connect!', 3000);
                    updateHudButtons();
                }
            }
            tryFetchMessages();
        }
        async function initServers() {
            console.log('[SYSTEM] Initializing servers for:', worldName);
            var serverKeyword = 'MCServerJoin@' + worldName;
            var responseKeywords = [];
            var serverAddr;
            try {
                serverAddr = await GetPublicAddressByKeyword(serverKeyword);
            } catch (e) {
                console.error('[SYSTEM] Failed to fetch initial server address:', e);
            }
            if (!serverAddr) {
                console.error('[SYSTEM] No server address for:', serverKeyword);
                return;
            }
            console.log('[SYSTEM] Fetching initial server announcements for:', serverKeyword);
            var messages = [];
            var skip = 0;
            var qty = 5000;
            var apiDelay = 350;
            while (true) {
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var response = await GetPublicMessagesByAddress(serverAddr, skip, qty);
                    if (!response || response.length === 0) break;
                    messages = messages.concat(response);
                    if (response.length < qty) break;
                    skip += qty;
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch initial server messages, skip:', skip, 'error:', e);
                    break;
                }
            }
            console.log('[SYSTEM] Initial poll: Found', messages.length, 'server announcements');
            var messageMap = new Map();
            for (var msg of messages) {
                if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
                    if (msg.TransactionId) {
                        console.log('[SYSTEM] Stopping server message processing at cached ID:', msg.TransactionId);
                        break; // Stop processing as all remaining messages are older
                    }
                    continue;
                }
                processedMessages.add(msg.TransactionId);
                var timestamp = Date.parse(msg.BlockDate) || Date.now();
                var existing = messageMap.get(msg.FromAddress);
                if (!existing || existing.timestamp < timestamp) {
                    messageMap.set(msg.FromAddress, { msg: msg, timestamp: timestamp });
                }
            }
            for (var entry of messageMap) {
                var msg = entry[1].msg;
                var timestamp = entry[1].timestamp;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var fromProfile = await GetProfileByAddress(msg.FromAddress);
                    if (!fromProfile || !fromProfile.URN) {
                        console.log('[USERS] Skipping initial server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                        continue;
                    }
                    var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    var userProfile = await GetProfileByURN(hostUser);
                    if (!userProfile) {
                        console.log('[USERS] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
                    } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                        console.log('[USERS] Skipping initial server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
                        continue;
                    }
                    var spawn = calculateSpawnPoint(hostUser + '@' + worldName);
                    var offer = null;
                    var iceCandidates = [];
                    var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                    if (match) {
                        var hash = match[1];
                        var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                        if (cidRegex.test(hash)) {
                            try {
                                await new Promise(resolve => setTimeout(resolve, apiDelay));
                                var data = await fetchIPFS(hash);
                                if (data && data.offer && data.world === worldName) {
                                    offer = data.offer;
                                    iceCandidates = data.iceCandidates || [];
                                }
                            } catch (e) {
                                console.error('[SYSTEM] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
                            }
                        }
                    }
                    if (!knownServers.some(s => s.hostUser === hostUser && s.transactionId === msg.TransactionId)) {
                        knownServers.push({
                            hostUser: hostUser,
                            spawn: spawn,
                            offer: offer,
                            iceCandidates: iceCandidates,
                            transactionId: msg.TransactionId,
                            timestamp: timestamp,
                            connectionRequestCount: 0,
                            latestRequestTime: null
                        });
                    }
                    responseKeywords.push('MCConn@' + hostUser + '@' + worldName);
                } catch (e) {
                    console.error('[SYSTEM] Error processing initial server message:', msg.TransactionId, e);
                }
            }
            var serverMap = new Map();
            for (var server of knownServers) {
                if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                    serverMap.set(server.hostUser, server);
                }
            }
            knownServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
            if (isHost) {
                responseKeywords.push('MCConn@' + userName + '@' + worldName);
            }
            for (var responseKeyword of responseKeywords) {
                var responseAddr;
                try {
                    await new Promise(resolve => setTimeout(resolve, apiDelay));
                    responseAddr = await GetPublicAddressByKeyword(responseKeyword);
                } catch (e) {
                    console.error('[SYSTEM] Failed to fetch initial response address for:', responseKeyword, e);
                }
                if (responseAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, apiDelay));
                            var response = await GetPublicMessagesByAddress(responseAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        } catch (e) {
                            console.error('[SYSTEM] Failed to fetch initial response messages for:', responseKeyword, 'skip:', skip, 'error:', e);
                            break;
                        }
                    }
                    console.log('[SYSTEM] Initial poll: Found', messages.length, 'existing responses for:', responseKeyword);
                    for (var msg of messages) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[SYSTEM] Stopping response message processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (msg.TransactionId) {
                            processedMessages.add(msg.TransactionId);
                        }
                    }
                    var requestCount = messages.length;
                    var latestRequest = messages.length > 0 ? Date.parse(messages[0].BlockDate) || Date.now() : null;
                    var hostUser = responseKeyword.match(/MCConn@(.+)@[^@]+$/)[1];
                    var server = knownServers.find(function (s) { return s.hostUser === hostUser; });
                    if (server) {
                        server.connectionRequestCount = requestCount;
                        server.latestRequestTime = latestRequest;
                    }
                }
            }
            // Process offers only for host's keyword if isHost
            if (isHost) {
                var hostKeyword = 'MCConn@' + userName + '@' + worldName;
                var responseAddr = await GetPublicAddressByKeyword(hostKeyword);
                if (responseAddr) {
                    var messages = [];
                    var skip = 0;
                    var qty = 5000;
                    while (true) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, apiDelay));
                            var response = await GetPublicMessagesByAddress(responseAddr, skip, qty);
                            if (!response || response.length === 0) break;
                            messages = messages.concat(response);
                            if (response.length < qty) break;
                            skip += qty;
                        } catch (e) {
                            console.error('[SYSTEM] Failed to fetch initial host offer messages for:', hostKeyword, 'skip:', skip, 'error:', e);
                            break;
                        }
                    }
                    var newOffers = [];
                    for (var msg of messages) {
                        if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                            console.log('[SYSTEM] Stopping host offer processing at cached ID:', msg.TransactionId);
                            break; // Stop processing as all remaining messages are older
                        }
                        if (!msg.TransactionId) continue;
                        processedMessages.add(msg.TransactionId);
                        try {
                            var fromProfile = await GetProfileByAddress(msg.FromAddress);
                            if (!fromProfile || !fromProfile.URN) {
                                console.log('[USERS] Skipping initial offer message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var clientUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                            var userProfile = await GetProfileByURN(clientUser);
                            if (!userProfile) {
                                console.log('[USERS] No profile for user:', clientUser, 'txId:', msg.TransactionId);
                                continue;
                            }
                            if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                                console.log('[USERS] Skipping initial offer message, invalid creators for user:', clientUser, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                            if (!match) {
                                console.log('[SYSTEM] No IPFS hash in initial offer message:', msg.Message, 'txId:', msg.TransactionId);
                                continue;
                            }
                            var hash = match[1];
                            var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                            if (!cidRegex.test(hash)) {
                                console.log('[SYSTEM] Invalid CID in initial offer message:', hash, 'txId:', msg.TransactionId);
                                continue;
                            }
                            try {
                                await new Promise(resolve => setTimeout(resolve, apiDelay));
                                var data = await fetchIPFS(hash);
                                if (!data || !data.world || data.world !== worldName) {
                                    console.log('[SYSTEM] Invalid IPFS data for initial offer message:', hash, 'txId:', msg.TransactionId);
                                    continue;
                                }
                                if (data.offer || data.answer) {
                                    newOffers.push({
                                        clientUser: data.user || clientUser,
                                        offer: data.offer || data.answer,
                                        iceCandidates: data.iceCandidates || [],
                                        transactionId: msg.TransactionId,
                                        timestamp: Date.parse(msg.BlockDate) || Date.now(),
                                        profile: fromProfile
                                    });
                                }
                            } catch (e) {
                                console.error('[SYSTEM] Failed to fetch IPFS for initial offer hash:', hash, 'error:', e, 'txId:', msg.TransactionId);
                            }
                        } catch (e) {
                            console.error('[SYSTEM] Error processing initial offer message:', msg.TransactionId, e);
                        }
                    }
                    if (newOffers.length > 0) {
                        pendingOffers.push(...newOffers);
                        setupPendingModal();
                    }
                }
            }
            console.log('[SYSTEM] Initial load complete.');
            worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
            isInitialLoad = false;
        }
        function openUsersModal() {
            console.log('[MODAL] Opening users modal');
            var existingModal = document.getElementById('usersModal');
            if (existingModal) {
                existingModal.remove();
                console.log('[MODAL] Removed existing usersModal');
            }
            var modal = document.createElement('div');
            modal.id = 'usersModal';
            modal.style.position = 'fixed';
            modal.style.left = '50%';
            modal.style.top = '50%';
            modal.style.transform = 'translate(-50%,-50%)';
            modal.style.zIndex = '220';
            modal.style.background = 'var(--panel)';
            modal.style.padding = '14px';
            modal.style.borderRadius = '10px';
            modal.style.minWidth = '360px';
            modal.style.display = 'block';
            modal.innerHTML = `
            <h3>Online Players</h3>
            <div style="margin-bottom:10px;">
                <input id="friendHandle" placeholder="Enter friend’s handle" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:#0d1620;color:#fff;box-sizing:border-box;" autocomplete="off">
                <button id="connectFriend" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;background:var(--accent);color:#111;border:0;font-weight:700;cursor:pointer;">Connect to Friend</button>
            </div>
            <div id="usersList"></div>
            <p class="warning">Note: Servers may be offline. Connection requires the host to be active. Recent attempts increase success likelihood.</p>
            <div style="margin-top:10px;text-align:right;">
                <button id="closeUsers">Close</button>
            </div>
        `;
            document.body.appendChild(modal);
            console.log('[MODAL] Modal added to DOM');
            var list = modal.querySelector('#usersList');
            list.innerHTML = '';
            var hasEntries = false;

            var connectedHeader = document.createElement('h4');
            connectedHeader.innerText = 'Connected Players';
            list.appendChild(connectedHeader);
            for (var peer of peers) {
                var peerUser = peer[0];
                if (peerUser !== userName) {
                    hasEntries = true;
                    console.log('[MODAL] Rendering peer:', peerUser);
                    var spawn = calculateSpawnPoint(peerUser + '@' + worldName);
                    var row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.gap = '8px';
                    row.style.alignItems = 'center';
                    row.style.marginTop = '8px';
                    var info = document.createElement('div');
                    info.innerText = peerUser + ' (Connected) at (' + Math.floor(spawn.x) + ', ' + Math.floor(spawn.y) + ', ' + Math.floor(spawn.z) + ')';
                    var btn = document.createElement('button');
                    btn.innerText = 'Visit Spawn';
                    btn.onclick = function () {
                        console.log('[MODAL] Teleporting to spawn of:', peerUser);
                        respawnPlayer(spawn.x, 100, spawn.z);
                        modal.style.display = 'none';
                        isPromptOpen = false;
                    };
                    row.appendChild(info);
                    row.appendChild(btn);
                    list.appendChild(row);
                }
            }

            var activeServersHeader = document.createElement('h4');
            activeServersHeader.innerText = 'Known Servers (Last 10)';
            list.appendChild(activeServersHeader);
            var serverMap = new Map();
            for (var server of knownServers) {
                if (!serverMap.has(server.hostUser) || serverMap.get(server.hostUser).timestamp < server.timestamp) {
                    serverMap.set(server.hostUser, server);
                }
            }
            var uniqueServers = Array.from(serverMap.values()).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 10);
            for (var server of uniqueServers) {
                hasEntries = true;
                console.log('[MODAL] Rendering server:', server.hostUser);
                var row = document.createElement('div');
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'center';
                row.style.marginTop = '8px';
                var info = document.createElement('div');
                var attemptTime = connectionAttempts.get(server.hostUser);
                info.innerText = server.hostUser + ' at (' + Math.floor(server.spawn.x) + ', ' + Math.floor(server.spawn.y) + ', ' + Math.floor(server.spawn.z) + ')\nServer started: ' + new Date(server.timestamp).toLocaleString() + '\nLast connect attempt: ' + (attemptTime ? new Date(attemptTime).toLocaleString() : 'Never') + '\nConnection requests: ' + (server.connectionRequestCount || 0) + '\nLatest request: ' + (server.latestRequestTime ? new Date(server.latestRequestTime).toLocaleString() : 'None');
                info.style.whiteSpace = 'pre-line';
                if (!peers.has(server.hostUser) && (!isHost || server.hostUser !== userName)) {
                    var btn = document.createElement('button');
                    btn.innerText = 'Try Connect';
                    btn.onclick = async function () {
                        console.log('[WEBRTC] Attempting to connect to server:', server.hostUser);
                        addMessage("Finding a route to " + server.hostUser + "...", 5000);
                        await connectToServer(server.hostUser, server.offer, server.iceCandidates);
                        modal.style.display = 'none';
                        isPromptOpen = false;
                    };
                    row.appendChild(btn);
                }
                row.appendChild(info);
                list.appendChild(row);
            }

            if (isHost) {
                var pendingHeader = document.createElement('h4');
                pendingHeader.innerText = 'Pending Connections';
                list.appendChild(pendingHeader);
                for (var offer of pendingOffers) {
                    var row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.gap = '8px';
                    row.style.alignItems = 'center';
                    row.style.marginTop = '8px';
                    var info = document.createElement('div');
                    info.innerText = offer.clientUser + ' at ' + new Date(offer.timestamp).toLocaleString() + '\nBio: ' + (offer.profile && offer.profile.Bio ? offer.profile.Bio : 'No bio');
                    info.style.whiteSpace = 'pre-line';
                    row.appendChild(info);
                    list.appendChild(row);
                    hasEntries = true;
                }
            }
            if (!hasEntries) {
                console.log('[MODAL] No servers or peers to render in modal');
                var empty = document.createElement('div');
                empty.style.marginTop = '8px';
                empty.innerText = 'No players available';
                list.appendChild(empty);
            }
            modal.querySelector('#closeUsers').onclick = function () {
                console.log('[MODAL] Closing users modal');
                modal.remove();
                isPromptOpen = false;
            };
            modal.querySelector('#friendHandle').addEventListener('keydown', function (e) {
                e.stopPropagation();
            });
            modal.querySelector('#connectFriend').onclick = function () {
                isConnecting = true;
                var handle = document.getElementById('friendHandle').value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
                if (!handle) {
                    addMessage('Please enter a friend’s handle', 3000);
                    return;
                }
                if (handle === userName) {
                    addMessage('Cannot connect to yourself', 3000);
                    return;
                }
                console.log('[WEBRTC] Attempting to connect to friend:', handle);
                // Add friend to knownServers with a temporary entry
                var spawn = calculateSpawnPoint(handle + '@' + worldName);
                knownServers.push({
                    hostUser: handle,
                    spawn: spawn,
                    offer: null,
                    iceCandidates: [],
                    transactionId: 'local_' + Date.now(),
                    timestamp: Date.now(),
                    connectionRequestCount: 0,
                    latestRequestTime: null
                });
                connectToServer(handle, null, []);
                modal.style.display = 'none';
                isPromptOpen = false;
            };
        }
        function cleanupPeer(username) {
            const peer = peers.get(username);
            if (peer) {
                if (peer.pc) peer.pc.close();
                peers.delete(username);
            }

            if (playerAvatars.has(username)) {
                const avatar = playerAvatars.get(username);
                scene.remove(avatar);
                disposeObject(avatar);
                playerAvatars.delete(username);
            }

            if (userAudioStreams.has(username)) {
                const audioStream = userAudioStreams.get(username);
                audioStream.audio.srcObject = null;
                audioStream.audio.remove();
                userAudioStreams.delete(username);
            }

            if (userVideoStreams.has(username)) {
                userVideoStreams.delete(username);
            }

            delete userPositions[username];

            addMessage(`${username} has disconnected.`);
            updateHudButtons();
            console.log(`[WebRTC] Cleaned up peer: ${username}`);
        }

        async function toggleCamera() {
            const cameraBtn = document.getElementById('cameraBtn');
            const proximityVideoContainer = document.getElementById('proximityVideo');
            const proximityVideoElement = document.getElementById('proximityVideoElement');
            const proximityVideoLabel = document.getElementById('proximityVideoLabel');

            if (localVideoStream) {
                // Turn off camera and hide video feed
                localVideoStream.getTracks().forEach(track => track.stop());
                localVideoStream = null;

                for (const [peerUser, peerData] of peers.entries()) {
                    if (peerData.pc) {
                        const senders = peerData.pc.getSenders().filter(s => s.track && s.track.kind === 'video');
                        senders.forEach(sender => peerData.pc.removeTrack(sender));

                        // Renegotiate
                        const offer = await peerData.pc.createOffer();
                        await peerData.pc.setLocalDescription(offer);
                        if (peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'renegotiation_offer', offer: offer }));
                        }
                    }
                    if (peerData.dc && peerData.dc.readyState === 'open') {
                        peerData.dc.send(JSON.stringify({ type: 'video_stopped', username: userName }));
                    }
                }

                cameraBtn.style.opacity = '0.5';
                proximityVideoContainer.style.display = 'none';
                if (proximityVideoElement.srcObject) {
                    proximityVideoElement.srcObject = null;
                }
                addMessage('Camera disabled', 2000);
            } else {
                // Turn on camera and show local video feed
                try {
                    localVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });

                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerData.pc) {
                            localVideoStream.getTracks().forEach(track => peerData.pc.addTrack(track, localVideoStream));

                            // Renegotiate
                            const offer = await peerData.pc.createOffer();
                            await peerData.pc.setLocalDescription(offer);
                            if (peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(JSON.stringify({ type: 'renegotiation_offer', offer: offer }));
                            }
                        }
                        if (peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(JSON.stringify({ type: 'video_started', username: userName }));
                        }
                    }

                    cameraBtn.style.opacity = '1';
                    proximityVideoElement.srcObject = localVideoStream;
                    proximityVideoLabel.innerText = userName;
                    proximityVideoContainer.style.display = 'block';
                    addMessage('Camera enabled', 2000);

                    // Reset proximity video display to show local user first
                    lastProximityVideoChangeTime = Date.now();
                    proximityVideoUsers = [userName, ...proximityVideoUsers.filter(u => u !== userName)];
                    currentProximityVideoIndex = 0;

                } catch (err) {
                    addMessage('Could not access camera', 3000);
                    console.error('Error accessing camera:', err);
                }
            }
        }

        async function initAudio() {
            try {
                localAudioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            } catch (error) {
                console.error("Error accessing microphone:", error);
                addMessage("Microphone access denied. Proximity chat will be disabled.", 5000);
            }
        }
        function updateProximityVideo() {
            const now = Date.now();
            const proximityVideoContainer = document.getElementById('proximityVideo');
            const proximityVideoElement = document.getElementById('proximityVideoElement');
            const proximityVideoLabel = document.getElementById('proximityVideoLabel');

            const localPlayerPos = new THREE.Vector3(player.x, player.y, player.z);

            const remoteUsersInProximity = [];
            for (const [username, videoStream] of userVideoStreams.entries()) {
                if (username === userName) continue;
                if (userPositions[username]) {
                    const userPos = userPositions[username];
                    const remotePlayerPos = new THREE.Vector3(userPos.targetX, userPos.targetY, userPos.targetZ);
                    if (localPlayerPos.distanceTo(remotePlayerPos) <= 32) {
                        remoteUsersInProximity.push(username);
                    }
                }
            }

            let usersToShow = [...remoteUsersInProximity];
            if (localVideoStream) {
                usersToShow.unshift(userName);
            }

            proximityVideoUsers = usersToShow;

            if (proximityVideoUsers.length === 0) {
                proximityVideoContainer.style.display = 'none';
                if (proximityVideoElement.srcObject) {
                    proximityVideoElement.srcObject = null;
                }
                currentProximityVideoIndex = 0;
                return;
            }

            proximityVideoContainer.style.display = 'block';

            if (currentProximityVideoIndex >= proximityVideoUsers.length) {
                currentProximityVideoIndex = 0;
            }

            const thirtySeconds = 30 * 1000;
            if (now - lastProximityVideoChangeTime > thirtySeconds) {
                lastProximityVideoChangeTime = now;
                currentProximityVideoIndex = (currentProximityVideoIndex + 1) % proximityVideoUsers.length;
            }

            const currentUser = proximityVideoUsers[currentProximityVideoIndex];
            const currentStream = (currentUser === userName) ? localVideoStream : userVideoStreams.get(currentUser)?.stream;

            if (proximityVideoElement.srcObject !== currentStream) {
                proximityVideoLabel.innerText = currentUser;
                proximityVideoElement.srcObject = currentStream;
            }
        }
