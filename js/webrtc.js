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
        const username = hostUser;
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
                video.style.display = 'none';
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

async function handleMinimapFile(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

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
