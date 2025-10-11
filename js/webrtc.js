// ------------------ WebRTC ------------------

// Establishes and manages peer-to-peer connections for multiplayer functionality.

async function getTurnCredentials() {
    // IMPORTANT: Replace with your own TURN server API key retrieval logic.
    // Do not hardcode API keys in client-side code for production environments.
    // This is a major security risk.
    // const apiKey = 'YOUR_API_KEY_HERE';
    // const response = await fetch(`https://your-turn-service.com/api/v1/turn?apiKey=${apiKey}`);
    // const credentials = await response.json();
    // return credentials;

    // Using a public STUN server as a fallback.
    // This will not work for all network configurations (symmetric NATs).
    console.warn("Using fallback STUN server. For production, a secure TURN server is recommended for robust connectivity.");
    return [{ urls: 'stun:stun.l.google.com:19302' }];
}

async function announceServer() {
    if (isHost) {
        console.log('[WebRTC] Already hosting, skipping announce for:', userName);
        addMessage('Server already announced', 3000);
        return;
    }
    if (isInitialLoad) {
        console.log('[WebRTC] Waiting for initial load to complete before announcing');
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (!isInitialLoad) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }
    const modal = document.getElementById('joinScriptModal');
    if (!modal) {
        console.error('[WebRTC] joinScriptModal not found in DOM');
        addMessage('UI error: Modal not found', 5000);
        return;
    }
    isHost = true;
    console.log('[WebRTC] Announcing server for:', userName);
    // REMOVED: pc creation and peers.set(userName, ...)
    // Open modal
    const serverKeyword = 'MCServers@' + worldName;  // Note: Your code has 'MCServerJoin@', but adjust if needed
    let serverAddr = null;
    try {
        serverAddr = await GetPublicAddressByKeyword(serverKeyword);
    } catch (e) {
        console.error('[WebRTC] Failed to fetch server address:', e);
    }
    const addressText = serverAddr ? serverAddr.trim().replace(/"|'/g, '') : serverKeyword;
    modal.querySelector('h3').innerText = 'Announce Server';
    modal.querySelector('p').innerText = `Copy this address and paste it into a Sup!? message To: field and click 📢 to announce your server.`;
    modal.querySelector('#joinScriptText').value = addressText;
    modal.style.display = 'block';
    isPromptOpen = true;
    addMessage('Server announced! Share the address to invite players.', 5000);
    console.log('[WebRTC] Join script modal opened with address:', addressText);
    // Start polling
    if (isHost) {
        const safeChunkKeys = []; // Fallback for undefined chunkKeys
        worker.postMessage({
            type: 'poll',
            chunkKeys: safeChunkKeys,
            masterKey: 'MCWorlds',
            userAddress: userAddress,
            worldName: worldName,
            serverKeyword: 'MCServerJoin@' + worldName,
            offerKeyword: 'MCConn@' + userName + '@' + worldName,
            answerKeywords: [],
            userName: userName
        });
        worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
        startOfferPolling();
    }
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

function setupDataChannel(dc, user) {
   console.log(`[WebRTC] Setting up data channel for: ${user}`);
    dc.onopen = () => {
        console.log(`[WebRTC] Data channel open with: ${user}. State: ${dc.readyState}`);
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
            console.log(`[WebRTC] Host sending initial mob state to ${user}`);
            for (const mob of mobs) {
                dc.send(JSON.stringify({
                    type: 'mob_update',
                    id: mob.id,
                    x: mob.pos.x,
                    y: mob.pos.y,
                    z: mob.pos.z,
                    hp: mob.hp
                }));
            }
        }

        updateHudButtons();
    };
    dc.onmessage = e => {
        console.log(`[WebRTC] Message from ${user}:`, e.data.substring(0, 100));

        try {
            const data = JSON.parse(e.data);
            const sender = data.username || user; // Fallback to user if username is not in payload

            if (sender === userName) return; // Ignore messages from self

            // Host is the source of truth. It processes inputs and broadcasts state.
            if (isHost) {
                // Don't relay player_move, host will broadcast authoritative state.
                if (data.type !== 'player_move') {
                    for (const [peerUser, peerData] of peers.entries()) {
                        if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                            peerData.dc.send(e.data);
                        }
                    }
                }
            }

            // All peers (host and clients) process the message to update their local state
            let avatar = playerAvatars.get(sender);
            if (!avatar && sender) {
                avatar = createAvatar(sender);
            }

            switch (data.type) {
                case 'state_update':
                    // Received from host, update all player states
                    if (!isHost) {
                        for (const playerData of data.players) {
                            const remoteUser = playerData.username;
                            if (remoteUser === userName) {
                                // This is a correction from the server about our own position.
                                // A more advanced implementation would use this for reconciliation.
                                continue;
                            }
                            if (!userPositions[remoteUser]) {
                                userPositions[remoteUser] = {};
                                createAvatar(remoteUser);
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

                                if (playerData.isAttacking && !userState.isAttacking) {
                                    userState.isAttacking = true;
                                    userState.attackStartTime = performance.now();
                                }
                            }
                        }
                    }
                    break;
                case 'player_move':
                    // Host processes this to update its state for the client
                    if (!isHost) break;

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

                    // Interpolation and lag handling
                    if (data.timestamp > userState.lastTimestamp) {
                        // Store the previous state for interpolation
                        userState.prevX = userState.targetX;
                        userState.prevY = userState.targetY;
                        userState.prevZ = userState.targetZ;
                        userState.prevYaw = userState.targetYaw;
                        userState.prevPitch = userState.targetPitch;

                        // Set the new target state
                        userState.targetX = data.x;
                        userState.targetY = data.y;
                        userState.targetZ = data.z;
                        userState.targetYaw = data.yaw;
                        userState.targetPitch = data.pitch;

                        userState.isMoving = data.isMoving;
                        userState.lastUpdate = performance.now();
                        userState.lastTimestamp = data.timestamp;

                        if (data.isAttacking && !userState.isAttacking) {
                            userState.isAttacking = true;
                            userState.attackStartTime = performance.now();
                        }
                    }
                    break;
                case 'block_change':
                     // Received a block change. If host, relay to other clients.
                    if (isHost) {
                        console.log(`[WebRTC] Host relaying block change from ${sender} to other peers.`);
                        for (const [peerUser, peerData] of peers.entries()) {
                            if (peerUser !== sender && peerUser !== userName && peerData.dc && peerData.dc.readyState === 'open') {
                                peerData.dc.send(e.data);
                            }
                        }
                    }
                    // All peers (including host) apply the change locally.
                    // `doBroadcast` is false to prevent clients from re-broadcasting.
                    chunkManager.setBlockGlobal(data.wx, data.wy, data.wz, data.bid, false);
                    break;
                case 'mob_update':
                    // Received from host. Update local mob state.
                    let mob = mobs.find(m => m.id === data.id);
                    if (!mob) {
                        mob = new Mob(data.x, data.z, data.id);
                        mobs.push(mob);
                    }
                    mob.pos.set(data.x, data.y, data.z);
                    mob.hp = data.hp;
                    if (data.flash) {
                        mob.flashEnd = Date.now() + 200;
                    }
                    break;
                case 'mob_kill':
                    // Received from host. Remove mob locally.
                    const mobToKill = mobs.find(m => m.id === data.id);
                    if (mobToKill) {
                        try { scene.remove(mobToKill.mesh); disposeObject(mobToKill.mesh); } catch (e) {}
                        mobs = mobs.filter(m => m.id !== mobToKill.id);
                    }
                    break;
                case 'mob_hit':
                    // Received from a client. Only the host processes this.
                    if (isHost) {
                        const mobToHit = mobs.find(m => m.id === data.id);
                        if (mobToHit) {
                            mobToHit.hurt(data.damage || 4, data.username);
                        }
                    }
                    break;
                case 'player_damage':
                    // Received from host. Apply damage to self.
                    if (Date.now() - lastDamageTime > 800) {
                        player.health = Math.max(0, player.health - (data.damage || 1));
                        lastDamageTime = Date.now();
                        document.getElementById('health').innerText = player.health;
                        updateHealthBar();
                        addMessage('Hit! HP: ' + player.health, 1000);
                        if (player.health <= 0) {
                            handlePlayerDeath();
                        }
                    }
                    break;
                case 'add_score':
                    // Received from host. Add score to self.
                    player.score += data.amount || 0;
                    document.getElementById('score').innerText = player.score;
                    addMessage(`+${data.amount} score`, 1500);
                    break;
            }
        } catch (err) {
            console.error(`[WebRTC] Failed to process message from ${user}:`, err);
        }
    };
    dc.onclose = () => {
        console.log(`[WebRTC] Data channel with ${user} closed. State: ${dc.readyState}`);
        addMessage(`Connection with ${user} lost`, 3000);
        peers.delete(user);
        const avatar = playerAvatars.get(user);
        if (avatar) {
            scene.remove(avatar);
            disposeObject(avatar);
            playerAvatars.delete(user);
        }
        delete userPositions[user];
        updateHudButtons();
    };
    dc.onerror = e => {
        console.error(`[WebRTC] Data channel error with ${user}:`, e);
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

async function acceptPendingOffers() {
    const checkboxes = document.querySelectorAll('.selectOffer:checked');
    if (checkboxes.length === 0) {
        addMessage('No offers selected', 3000);
        console.log('[WebRTC] No offers selected for acceptance');
        return;
    }
    const modal = document.getElementById('joinScriptModal');
    if (!modal) {
        console.error('[WebRTC] joinScriptModal not found in DOM');
        addMessage('UI error: Modal not found', 5000);
        return;
    }
    const batch = [];
    const users = [];
    // REMOVED: const serverPc = ...
    for (const checkbox of checkboxes) {
        const clientUser = checkbox.dataset.user;
        const offer = pendingOffers.find(o => o.clientUser === clientUser);
        if (!offer) {
            console.log('[WebRTC] No offer found for user:', clientUser);
            continue;
        }
        if (!offer.offer || !offer.offer.sdp || !offer.offer.type) {
            console.error('[WebRTC] Invalid offer data for:', clientUser, 'txId:', offer.transactionId);
            addMessage(`Invalid connection offer from ${clientUser || 'Unknown'}`, 3000);
            continue;
        }
        let answer = { type: 'answer', sdp: '' }; // Fallback
        let answerIceCandidates = [];
        try {
            const iceServers = await getTurnCredentials();
            const pc = new RTCPeerConnection({ iceServers });
            peers.set(clientUser, { pc, dc: null, address: offer.profile ? offer.profile.Creators[0] : null });
            pc.ondatachannel = (e) => {
                const dc = e.channel;
                const peerData = peers.get(clientUser);
                if (peerData) {
                    peerData.dc = dc;
                }
                setupDataChannel(dc, clientUser);
            };
            await pc.setRemoteDescription(new RTCSessionDescription(offer.offer));
            for (const candidate of offer.iceCandidates || []) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('[WebRTC] Failed to add ICE candidate for:', clientUser, 'error:', e);
                }
            }
            answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            pc.onicecandidate = e => {
                if (e.candidate) answerIceCandidates.push(e.candidate);
            };
            await new Promise(resolve => {
                pc.onicegatheringstatechange = () => {
                    if (pc.iceGatheringState === 'complete') resolve();
                };
            });
            // Add state monitoring
            pc.onconnectionstatechange = () => {
                console.log('[WebRTC] Connection state for', clientUser, ':', pc.connectionState);
                if (pc.connectionState === 'connected') {
                    addMessage('Connected to ' + clientUser, 3000);
                } else if (pc.connectionState === 'failed') {
                    addMessage('Connection failed with ' + clientUser, 3000);
                    pc.close();
                    peers.delete(clientUser);
                }
            };
            pc.onsignalingstatechange = () => {
                console.log('[WebRTC] Signaling state for', clientUser, ':', pc.signalingState);
            };
            batch.push({
                user: clientUser,
                answer,
                iceCandidates: answerIceCandidates
            });
            users.push(clientUser);
        } catch (e) {
            console.error('[WebRTC] Failed to process offer for:', clientUser, 'error:', e);
            addMessage(`Failed to connect to ${clientUser || 'Unknown'}`, 3000);
        }
    }
    if (batch.length > 0) {
        const batchData = {
            world: worldName,
            user: userName,
            batch
        };
        try {
            const blob = new Blob([JSON.stringify(batchData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${worldName}_batch_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            console.log('[WebRTC] Batch JSON downloaded successfully for users:', users);
        } catch (e) {
            console.error('[WebRTC] Failed to download batch JSON:', e);
            addMessage('Failed to download batch JSON', 5000);
        }
        const batchKeyword = 'MCBatch@' + userName + '@' + worldName;
        let batchAddr = null;
        try {
            batchAddr = await GetPublicAddressByKeyword(batchKeyword);
        } catch (e) {
            console.error('[WebRTC] Failed to fetch batch address:', e);
        }
        const addressText = batchAddr ? batchAddr.trim().replace(/"|'/g, '') : batchKeyword;
        modal.querySelector('h3').innerText = 'Batch Connection';
        modal.querySelector('p').innerText = `Copy this address and paste it into a Sup!? message To: field, attach the JSON file, and click 📢 to confirm connections.`;
        modal.querySelector('#joinScriptText').value = addressText;
        modal.style.display = 'block';
        isPromptOpen = true;
        addMessage('Batch connections processed for ' + users.join(', '), 5000);
        console.log('[WebRTC] Join script modal opened for batch with address:', addressText, 'users:', users);
        pendingOffers = pendingOffers.filter(o => !users.includes(o.clientUser));
        updatePendingModal();
    } else {
        addMessage('No valid offers processed', 3000);
        console.log('[WebRTC] No valid offers were processed for batch');
    }
}

function startOfferPolling() {
    if (!isHost) {
        console.log('[WebRTC] Not hosting, skipping offer polling');
        return;
    }
    console.log('[WebRTC] Starting offer polling for:', userName);
    var offerKeyword = 'MCConn@' + userName + '@' + worldName;
    var apiDelay = 350;
    var interval = setInterval(async function () {
        try {
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            console.log('[WebRTC] Polling offers for:', offerKeyword);
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
            console.error('[WebRTC] Error in offer polling:', e);
        }
    }, 30000);
    offerPollingIntervals.set(offerKeyword, interval);
}

function startAnswerPolling(hostUser) {
    var keyword = 'MCAnswer@' + userName + '@' + worldName;
    if (answerPollingIntervals.has(keyword)) return;
    console.log('[WebRTC] Starting answer polling for:', hostUser);
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
            console.log('[WebRTC] Answer polling timeout for:', hostUser);
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
        console.log('[WebRTC] Skipping poll, initial load not complete');
        return;
    }
    console.log('[WebRTC] Polling server announcements for:', 'MCServerJoin@' + worldName);
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
            console.error('[WebRTC] Failed to fetch server address:', e);
        }
        if (!serverAddr) {
            if (retries < maxRetries) {
                retries++;
                setTimeout(tryFetchMessages, retryDelay * Math.pow(2, retries));
            } else {
                addMessage('Failed to fetch server announcements', 3000);
                console.error('[WebRTC] Max retries reached for server announcements');
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
                console.error('[WebRTC] Failed to fetch server messages, skip:', skip, 'error:', e);
                break;
            }
        }
        var newServers = [];
        var transactionIds = [];
        var messageMap = new Map();
        for (var msg of messages) {
            if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
                if (msg.TransactionId) {
                    console.log('[WebRTC] Stopping server message processing at cached ID:', msg.TransactionId);
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
                    console.log('[WebRTC] Skipping server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                    continue;
                }
                var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                await new Promise(resolve => setTimeout(resolve, apiDelay));
                var userProfile = await GetProfileByURN(hostUser);
                if (!userProfile) {
                    console.log('[WebRTC] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
                } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                    console.log('[WebRTC] Skipping server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
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
                            console.error('[WebRTC] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
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
                console.error('[WebRTC] Error processing server message:', msg.TransactionId, e);
            }
        }
        console.log('[WebRTC] New server announcements:', transactionIds);
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
    console.log('[WebRTC] Initializing servers for:', worldName);
    var serverKeyword = 'MCServerJoin@' + worldName;
    var responseKeywords = [];
    var serverAddr;
    try {
        serverAddr = await GetPublicAddressByKeyword(serverKeyword);
    } catch (e) {
        console.error('[WebRTC] Failed to fetch initial server address:', e);
    }
    if (!serverAddr) {
        console.error('[WebRTC] No server address for:', serverKeyword);
        return;
    }
    console.log('[WebRTC] Fetching initial server announcements for:', serverKeyword);
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
            console.error('[WebRTC] Failed to fetch initial server messages, skip:', skip, 'error:', e);
            break;
        }
    }
    console.log('[WebRTC] Initial poll: Cached server announcements:', messages.map(m => m.TransactionId));
    var messageMap = new Map();
    for (var msg of messages) {
        if (!msg.TransactionId || processedMessages.has(msg.TransactionId)) {
            if (msg.TransactionId) {
                console.log('[WebRTC] Stopping server message processing at cached ID:', msg.TransactionId);
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
                console.log('[WebRTC] Skipping initial server message, no URN for address:', msg.FromAddress, 'transactionId:', msg.TransactionId);
                continue;
            }
            var hostUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
            await new Promise(resolve => setTimeout(resolve, apiDelay));
            var userProfile = await GetProfileByURN(hostUser);
            if (!userProfile) {
                console.log('[WebRTC] No profile for user:', hostUser, 'transactionId:', msg.TransactionId);
            } else if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                console.log('[WebRTC] Skipping initial server message, invalid creators for user:', hostUser, 'transactionId:', msg.TransactionId);
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
                        console.error('[WebRTC] Failed to fetch IPFS for hash:', hash, 'error:', e, 'transactionId:', msg.TransactionId);
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
            console.error('[WebRTC] Error processing initial server message:', msg.TransactionId, e);
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
            console.error('[WebRTC] Failed to fetch initial response address for:', responseKeyword, e);
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
                    console.error('[WebRTC] Failed to fetch initial response messages for:', responseKeyword, 'skip:', skip, 'error:', e);
                    break;
                }
            }
            console.log('[WebRTC] Initial poll: Cached', messages.length, 'existing responses for:', responseKeyword, messages.map(m => m.TransactionId));
            for (var msg of messages) {
                if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                    console.log('[WebRTC] Stopping response message processing at cached ID:', msg.TransactionId);
                    break; // Stop processing as all remaining messages are older
                }
                if (msg.TransactionId) {
                    processedMessages.add(msg.TransactionId);
                    console.log('[WebRTC] Caching transactionId on initial load:', msg.TransactionId, 'for:', responseKeyword);
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
                    console.error('[WebRTC] Failed to fetch initial host offer messages for:', hostKeyword, 'skip:', skip, 'error:', e);
                    break;
                }
            }
            var newOffers = [];
            for (var msg of messages) {
                if (msg.TransactionId && processedMessages.has(msg.TransactionId)) {
                    console.log('[WebRTC] Stopping host offer processing at cached ID:', msg.TransactionId);
                    break; // Stop processing as all remaining messages are older
                }
                if (!msg.TransactionId) continue;
                processedMessages.add(msg.TransactionId);
                try {
                    var fromProfile = await GetProfileByAddress(msg.FromAddress);
                    if (!fromProfile || !fromProfile.URN) {
                        console.log('[WebRTC] Skipping initial offer message, no URN for address:', msg.FromAddress, 'txId:', msg.TransactionId);
                        continue;
                    }
                    var clientUser = fromProfile.URN.replace(/[^a-zA-Z0-9]/g, '');
                    var userProfile = await GetProfileByURN(clientUser);
                    if (!userProfile) {
                        console.log('[WebRTC] No profile for user:', clientUser, 'txId:', msg.TransactionId);
                        continue;
                    }
                    if (!userProfile.Creators || !userProfile.Creators.includes(msg.FromAddress)) {
                        console.log('[WebRTC] Skipping initial offer message, invalid creators for user:', clientUser, 'txId:', msg.TransactionId);
                        continue;
                    }
                    var match = msg.Message.match(/IPFS:([a-zA-Z0-9]+)/);
                    if (!match) {
                        console.log('[WebRTC] No IPFS hash in initial offer message:', msg.Message, 'txId:', msg.TransactionId);
                        continue;
                    }
                    var hash = match[1];
                    var cidRegex = /^[A-Za-z0-9]{46}$|^[A-Za-z0-9]{59}$|^[a-z0-9]+$/;
                    if (!cidRegex.test(hash)) {
                        console.log('[WebRTC] Invalid CID in initial offer message:', hash, 'txId:', msg.TransactionId);
                        continue;
                    }
                    try {
                        await new Promise(resolve => setTimeout(resolve, apiDelay));
                        var data = await fetchIPFS(hash);
                        if (!data || !data.world || data.world !== worldName) {
                            console.log('[WebRTC] Invalid IPFS data for initial offer message:', hash, 'data:', JSON.stringify(data), 'txId:', msg.TransactionId);
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
                        console.error('[WebRTC] Failed to fetch IPFS for initial offer hash:', hash, 'error:', e, 'txId:', msg.TransactionId);
                    }
                } catch (e) {
                    console.error('[WebRTC] Error processing initial offer message:', msg.TransactionId, e);
                }
            }
            if (newOffers.length > 0) {
                pendingOffers.push(...newOffers);
                setupPendingModal();
            }
        }
    }
    console.log('[WebRTC] Initial load complete, processedMessages:', Array.from(processedMessages));
    worker.postMessage({ type: 'sync_processed', ids: Array.from(processedMessages) });
    isInitialLoad = false;
}
