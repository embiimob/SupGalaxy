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
