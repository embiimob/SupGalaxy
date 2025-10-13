// ------------------ UI ------------------

// Manages all user interface elements and interactions.

function initHotbar() {
    var hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    for (var i = 0; i < 32; i++) {
        var slot = document.createElement('div');
        slot.className = 'hot-slot';
        slot.dataset.index = i;
        var label = document.createElement('div');
        label.className = 'hot-label';
        var count = document.createElement('div');
        count.className = 'hot-count';
        slot.appendChild(label);
        slot.appendChild(count);
        hotbar.appendChild(slot);
        slot.addEventListener('click', function () {
            document.querySelectorAll('.hot-slot').forEach(function (x) { x.classList.remove('active'); });
            this.classList.add('active');
            selectedHotIndex = parseInt(this.dataset.index);
            updateHotbarUI();
        });
        slot.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            if (INVENTORY[this.dataset.index] && INVENTORY[this.dataset.index].count > 0) {
                trashIndex = this.dataset.index;
                document.getElementById('trashItemName').innerText = 'Trash ' + BLOCKS[INVENTORY[trashIndex].id].name + ' x' + INVENTORY[trashIndex].count + ' ? ';
                document.getElementById('trashConfirm').style.display = 'block';
            }
        });
    }
    updateHotbarUI();
}

function updateHotbarUI() {
    var hotbar = document.getElementById('hotbar');
    var slots = hotbar.querySelectorAll('.hot-slot');
    slots.forEach(function (s, idx) {
        var item = INVENTORY[idx];
        var id = item ? item.id : null;
        var count = item ? item.count : 0;
        var color = id && BLOCKS[id] ? hexToRgb(BLOCKS[id].color) : [0, 0, 0];
        s.style.background = 'rgba(' + color.join(',') + ', ' + (id ? 0.45 : 0.2) + ')';
        s.querySelector('.hot-label').innerText = id && BLOCKS[id] ? BLOCKS[id].name : '';
        s.querySelector('.hot-count').innerText = count > 0 ? count : '';
        s.classList.toggle('active', idx === selectedHotIndex);
    });
    selectedBlockId = INVENTORY[selectedHotIndex] ? INVENTORY[selectedHotIndex].id : null;
    var slotWidth = 56 + 8;
    hotbar.scrollLeft = (selectedHotIndex - 4) * slotWidth;
}

function openCrafting() {
    isPromptOpen = true;
    var m = document.getElementById('craftModal');
    m.style.display = 'block';
    var list = document.getElementById('recipeList');
    list.innerHTML = '';
    for (var r of RECIPES) {
        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.marginTop = '8px';
        var info = document.createElement('div');
        info.innerText = BLOCKS[r.out.id].name + ' x' + r.out.count;
        var reqs = document.createElement('div');
        reqs.style.opacity = 0.85;
        reqs.innerText = 'Requires: ' + Object.entries(r.requires).map(function (kv) { return (BLOCKS[kv[0]].name || kv[0]) + ' x' + kv[1]; }).join(', ');
        var btn = document.createElement('button');
        btn.innerText = 'Craft';
        btn.onclick = function () { attemptCraft(r); };
        row.appendChild(info);
        row.appendChild(reqs);
        row.appendChild(btn);
        list.appendChild(row);
    }
}

function addMessage(txt, ttl) {
    var c = document.getElementById('messages');
    var el = document.createElement('div');
    el.className = 'msg';
    el.innerText = txt;
    c.prepend(el);
    setTimeout(function () { el.remove(); }, ttl || 2000);
}

function updateHealthBar() {
    var pct = Math.max(0, Math.min(1, player.health / 20));
    document.getElementById('healthBarInner').style.width = (pct * 100) + '%';
}

function updateSaveChangesButton() {
    var saveBtn = document.getElementById('saveChangesBtn');
    saveBtn.style.display = CHUNK_DELTAS.size > 0 ? 'inline-block' : 'none';
}

function updateHudButtons() {
    var joinScriptBtn = document.getElementById('joinScriptBtn');
    joinScriptBtn.style.display = 'none';
    updateSaveChangesButton();
    var usersBtn = document.getElementById('usersBtn');
    var peerCount = peers.size > 0 ? peers.size - (peers.has(userName) ? 1 : 0) : 0;
    console.log('[WebRTC] Updating usersBtn: peerCount=', peerCount, 'peers=', Array.from(peers.keys()));
    usersBtn.style.display = 'inline-block';
    usersBtn.innerText = '🌐 ' + peerCount;
    usersBtn.onclick = function () {
        console.log('[Modal] usersBtn clicked, opening modal');
        openUsersModal();
    };
    setupPendingModal();
}

function updateHud() {
    var scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.innerText = player.score;
    var healthElement = document.getElementById('health');
    if (healthElement) healthElement.innerText = player.health;
    var posLabel = document.getElementById('posLabel');
    if (posLabel) posLabel.innerText = Math.floor(player.x) + ', ' + Math.floor(player.y) + ', ' + Math.floor(player.z);
    var distFromSpawn = Math.hypot(player.x - spawnPoint.x, player.z - spawnPoint.z);
    document.getElementById('homeIcon').style.display = distFromSpawn > 10 ? 'inline' : 'none';
    updateHealthBar();
    updateHotbarUI();
    updateHudButtons();
}

function setupMobile() {
    if (!isMobile()) return;
    var up = document.getElementById('mUp'), down = document.getElementById('mDown'), left = document.getElementById('mLeft'), right = document.getElementById('mRight');
    up.addEventListener('touchstart', function (e) { joystick.up = true; e.preventDefault(); });
    up.addEventListener('touchend', function (e) { joystick.up = false; e.preventDefault(); });
    down.addEventListener('touchstart', function (e) { joystick.down = true; e.preventDefault(); });
    down.addEventListener('touchend', function (e) { joystick.down = false; e.preventDefault(); });
    left.addEventListener('touchstart', function (e) { joystick.left = true; e.preventDefault(); });
    left.addEventListener('touchend', function (e) { joystick.left = false; e.preventDefault(); });
    right.addEventListener('touchstart', function (e) { joystick.right = true; e.preventDefault(); });
    right.addEventListener('touchend', function (e) { joystick.right = false; e.preventDefault(); });
    document.getElementById('mJump').addEventListener('touchstart', function (e) { playerJump(); safePlayAudio(soundJump); e.preventDefault(); });
    document.getElementById('mAttack').addEventListener('touchstart', function (e) { performAttack(); e.preventDefault(); });
    document.getElementById('mCam').addEventListener('touchstart', function (e) { toggleCameraMode(); e.preventDefault(); });
}

function updateLoginUI() {
    try {
        console.log('[Debug] updateLoginUI started, knownWorlds:', knownWorlds.size, 'knownUsers:', knownUsers.size);
        var worldInput = document.getElementById('worldNameInput');
        var userInput = document.getElementById('userInput');
        var worldSuggestions = document.getElementById('worldSuggestions');
        var userSuggestions = document.getElementById('userSuggestions');
        if (!worldInput || !userInput || !worldSuggestions || !userSuggestions) {
            console.error('[Debug] Input or suggestion elements not found in DOM');
            addMessage('UI initialization failed: elements missing', 3000);
            return;
        }
        function updateWorldSuggestions() {
            var value = worldInput.value.toLowerCase();
            var suggestions = Array.from(knownWorlds.entries())
                .filter(function (w) { return w[0].toLowerCase().startsWith(value); })
                .slice(0, 10);
            worldSuggestions.innerHTML = suggestions.map(function (w) {
                var server = knownServers.find(function (s) { return s.hostUser === w[1].discoverer; });
                var isOld = server ? (Date.now() - server.timestamp > 86400000) : true;
                return '<div data-value="' + w[0] + '" class="' + (isOld ? 'greyed' : '') + '">' + w[0] + ' (' + (w[1].discoverer || 'unknown') + ')</div>';
            }).join('');
            worldSuggestions.style.display = suggestions.length > 0 && value ? 'block' : 'none';
            console.log('[LoginUI] World suggestions updated:', suggestions.length);
        }
        function updateUserSuggestions() {
            var value = userInput.value.toLowerCase();
            var suggestions = Array.from(knownUsers.keys())
                .filter(function (u) { return u.toLowerCase().startsWith(value); })
                .slice(0, 10);
            userSuggestions.innerHTML = suggestions.map(function (u) { return '<div data-value="' + u + '">' + u + '</div>'; }).join('');
            userSuggestions.style.display = suggestions.length > 0 && value ? 'block' : 'none';
            console.log('[LoginUI] User suggestions updated:', suggestions.length);
        }
        worldInput.addEventListener('input', updateWorldSuggestions);
        userInput.addEventListener('input', updateUserSuggestions);
        function initSuggestions() {
            updateWorldSuggestions();
            updateUserSuggestions();
        }
        setTimeout(initSuggestions, 1000);
        initSuggestions();
        worldSuggestions.addEventListener('click', function (e) {
            if (e.target.dataset.value) {
                worldInput.value = e.target.dataset.value;
                worldSuggestions.style.display = 'none';
                console.log('[LoginUI] Selected world:', e.target.dataset.value);
            }
        });
        userSuggestions.addEventListener('click', function (e) {
            if (e.target.dataset.value) {
                userInput.value = e.target.dataset.value;
                userSuggestions.style.display = 'none';
                console.log('[LoginUI] Selected user:', e.target.dataset.value);
            }
        });
        document.addEventListener('click', function (e) {
            if (!worldInput.contains(e.target) && !worldSuggestions.contains(e.target)) {
                worldSuggestions.style.display = 'none';
            }
            if (!userInput.contains(e.target) && !userSuggestions.contains(e.target)) {
                userSuggestions.style.display = 'none';
            }
        });
        console.log('[Debug] updateLoginUI completed');
        userSuggestions.addEventListener('click', function (e) {
            if (e.target.dataset.value) {
                userInput.value = e.target.dataset.value;
                userSuggestions.style.display = 'none';
                console.log('[LoginUI] Selected user:', e.target.dataset.value);
            }
        });
        document.addEventListener('click', function (e) {
            if (!worldInput.contains(e.target) && !worldSuggestions.contains(e.target)) {
                worldSuggestions.style.display = 'none';
            }
            if (!userInput.contains(e.target) && !userSuggestions.contains(e.target)) {
                userSuggestions.style.display = 'none';
            }
        });
        console.log('[Debug] updateLoginUI completed');
    } catch (error) {
        console.error('[Debug] Error in updateLoginUI:', error);
        addMessage('Failed to initialize login UI', 3000);
    }
}
