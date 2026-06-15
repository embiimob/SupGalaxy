const fs = require('fs');
let code = fs.readFileSync('js/main.js', 'utf8');

// 1. Add publish event listener
if (!code.includes('publishTestnetBtn')) {
    code = code.replace(
        '})), document.getElementById("savePlayerChangesBtn").addEventListener("click", (function () {\n            savePlayerChangesOnly(), this.blur()\n        }))',
        '})), document.getElementById("savePlayerChangesBtn").addEventListener("click", (function () {\n            savePlayerChangesOnly(), this.blur()\n        })), document.getElementById("publishTestnetBtn").addEventListener("click", (function () {\n            publishToTestnet(), this.blur()\n        }))'
    );
}

// 2. Add publishToTestnet function
if (!code.includes('function publishToTestnet()')) {
    const publishFn = `
async function publishToTestnet() {
    // Close the modal
    document.getElementById("saveOptionsModal").style.display = "none";
    isPromptOpen = false;

    if (!window.S || !window.S.priv) {
        addMessage("Wallet locked. Please unlock first.", 3000);
        return;
    }

    addMessage("Preparing data...", 2000);

    const worldState = getCurrentWorldState();
    const serializableMagicianStones = {};
    for (const key in magicianStones) {
        if (Object.hasOwnProperty.call(magicianStones, key)) {
            const stone = magicianStones[key];
            if (stone.source !== 'local') continue;
            serializableMagicianStones[key] = {
                x: stone.x, y: stone.y, z: stone.z, url: stone.url,
                width: stone.width, height: stone.height,
                offsetX: stone.offsetX, offsetY: stone.offsetY, offsetZ: stone.offsetZ,
                loop: stone.loop, autoplay: stone.autoplay, autoplayAnimation: stone.autoplayAnimation,
                distance: stone.distance, collision: stone.collision ?? true, damage: stone.damage ?? 0, direction: stone.direction
            };
        }
    }

    const serializableCalligraphyStones = {};
    for (const key in calligraphyStones) {
        if (Object.hasOwnProperty.call(calligraphyStones, key)) {
            const stone = calligraphyStones[key];
            if (stone.source !== 'local') continue;
            serializableCalligraphyStones[key] = {
                x: stone.x, y: stone.y, z: stone.z, width: stone.width, height: stone.height,
                offsetX: stone.offsetX, offsetY: stone.offsetY, offsetZ: stone.offsetZ,
                bgColor: stone.bgColor, transparent: stone.transparent, fontFamily: stone.fontFamily,
                fontSize: stone.fontSize, fontWeight: stone.fontWeight, fontColor: stone.fontColor,
                text: stone.text, link: stone.link, direction: stone.direction
            };
        }
    }

    const serializableChests = {};
    for (const key in chests) {
        if (chests[key]) {
            serializableChests[key] = {
                x: chests[key].x, y: chests[key].y, z: chests[key].z,
                rotation: chests[key].rotation, items: chests[key].items
            };
        }
    }

    var e = {
        world: worldName,
        seed: worldSeed,
        user: userName,
        savedAt: (new Date).toISOString(),
        deltas: [],
        foreignBlockOrigins: Array.from(getCurrentWorldState().foreignBlockOrigins.entries()),
        magicianStones: serializableMagicianStones,
        calligraphyStones: serializableCalligraphyStones,
        chests: serializableChests,
        profile: {
            x: player.x, y: player.y, z: player.z,
            health: player.health, score: player.score, inventory: INVENTORY
        },
        musicPlaylist: musicPlaylist,
        videoPlaylist: videoPlaylist
    };

    for (var t of worldState.chunkDeltas) {
        var o = t[0], a = t[1];
        var localChanges = a.filter(change => change.source === 'local');
        if (localChanges.length > 0 && parseChunkKey(o)) {
            e.deltas.push({ chunk: o, changes: localChanges });
        }
    }

    var n = {
        playerData: e,
        hash: simpleHash(JSON.stringify(e))
    };

    const jsonStr = JSON.stringify(n);
    const fileName = worldName + "_session_" + Date.now() + ".json";

    addMessage("Uploading to IPFS...", 2000);

    let ipfsHash = "";
    try {
        const formData = new FormData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        formData.append('file', blob, fileName);

        const response = await fetch('https://p2fk.io/ipfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("IPFS upload failed");
        const resData = await response.json();
        ipfsHash = resData.cid;
        console.log("[Testnet3] Uploaded to IPFS. CID:", ipfsHash);
    } catch (err) {
        console.error("Upload error:", err);
        addMessage("Failed to upload to IPFS", 3000);
        return;
    }

    addMessage("Resolving keywords to testnet addresses...", 2000);

    var l = Array.from(worldState.chunkDeltas.keys()).filter(chunkKey => {
        const changes = worldState.chunkDeltas.get(chunkKey);
        return changes && changes.some(change => change.source === 'local');
    });

    if (l.length === 0) {
         addMessage("No local chunk changes to publish.", 3000);
         return;
    }

    var d = await Promise.all(l.map((async function (e) {
        var t = await GetPublicAddressByKeyword(e);
        return t ? t.trim().replace(/^"|"$/g, "") : null;
    })));

    const validAddresses = d.filter(addr => addr !== null);
    if (validAddresses.length === 0) {
         addMessage("Could not resolve any testnet addresses.", 3000);
         return;
    }

    addMessage("Broadcasting to Testnet3...", 2000);

    try {
        const payloadStr = "IPFS:" + ipfsHash + "\\\\" + fileName;
        const result = await window.buildP2fkRecipientsAndCost(validAddresses, payloadStr, 10);

        // Wait for sendManyWithWallet implementation to actually broadcast
        const txid = await window.sendManyWithWallet(result.outputs);
        addMessage("Success! TXID: " + txid.slice(0, 8) + "...", 4000);

        // Mark local changes as non-local so they don't get republished
        for (var t of worldState.chunkDeltas) {
            var a = t[1];
            a.forEach(change => {
                if (change.source === 'local') change.source = 'testnet3_published';
            });
        }
        updateSaveChangesButton();

    } catch (err) {
        console.error("Broadcast error:", err);
        addMessage("Failed to broadcast transaction: " + err.message, 4000);
    }
}
`;
    code = code.replace('async function downloadSinglePlayerSession() {', publishFn + '\nasync function downloadSinglePlayerSession() {');
}

// 3. Show button in modal if unlocked
const showModalCode = `async function downloadSession() {
    // Show the save options modal for all players (host and peer)
    isPromptOpen = true;
    document.getElementById("saveOptionsModal").style.display = "flex";

    // Check wallet status for testnet publish
    const publishBtn = document.getElementById("publishTestnetBtn");
    if (window.S && window.S.priv) {
        publishBtn.style.display = "block";
    } else {
        publishBtn.style.display = "none";
    }
}`;
code = code.replace(/async function downloadSession\(\) {[^}]+}/, showModalCode);

fs.writeFileSync('js/main.js', code);
console.log("Patched main.js");
