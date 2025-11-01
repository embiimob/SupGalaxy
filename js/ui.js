function initHotbar() {
    var hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    for (var i = 0; i < 9; i++) {
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
}

function addToInventory(id, count, originSeed = null) {
    const itemOriginSeed = originSeed || worldSeed;
    for (var i = 0; i < INVENTORY.length; i++) {
        const item = INVENTORY[i];
        if (item && item.id === id && item.originSeed === itemOriginSeed && item.count < 64) {
            const space = 64 - item.count;
            const amountToAdd = Math.min(count, space);
            item.count += amountToAdd;
            count -= amountToAdd;
            if (count <= 0) {
                updateHotbarUI();
                return;
            }
        }
    }
    for (var i = 0; i < INVENTORY.length; i++) {
        if (!INVENTORY[i] || INVENTORY[i].count === 0) {
            const amountToAdd = Math.min(count, 64);
            INVENTORY[i] = { id: id, count: amountToAdd, originSeed: itemOriginSeed };
            count -= amountToAdd;
            if (count <= 0) {
                updateHotbarUI();
                return;
            }
        }
    }
    addMessage('Inventory full');
    updateHotbarUI();
}

var trashIndex = -1;
document.getElementById('trashCancel').addEventListener('click', function () {
    document.getElementById('trashConfirm').style.display = 'none';
    trashIndex = -1;
    this.blur();
});
document.getElementById('trashOk').addEventListener('click', function () {
    if (trashIndex >= 0) {
        INVENTORY[trashIndex] = null;
        updateHotbarUI();
        addMessage('Item trashed');
    }
    document.getElementById('trashConfirm').style.display = 'none';
    trashIndex = -1;
    this.blur();
});

function attemptCraft(recipe) {
    const availableNative = {};
    const availableOffWorld = {};
    const allAvailable = {};
    for (const item of INVENTORY) {
        if (item) {
            allAvailable[item.id] = (allAvailable[item.id] || 0) + item.count;
            if (item.originSeed && item.originSeed !== worldSeed) {
                availableOffWorld[item.id] = (availableOffWorld[item.id] || 0) + item.count;
            } else {
                availableNative[item.id] = (availableNative[item.id] || 0) + item.count;
            }
        }
    }
    for (const reqId in recipe.requires) {
        if ((allAvailable[reqId] || 0) < recipe.requires[reqId]) {
            addMessage(`Missing materials for ${BLOCKS[recipe.out.id].name}`);
            return;
        }
    }
    if (recipe.requiresOffWorld) {
        for (const reqId in recipe.requiresOffWorld) {
            if ((availableOffWorld[reqId] || 0) < recipe.requiresOffWorld[reqId]) {
                addMessage(`Requires off-world ${BLOCKS[reqId].name}`);
                return;
            }
        }
    }
    let neededToConsume = { ...recipe.requires };
    let neededOffWorld = { ...recipe.requiresOffWorld };
    let consumedSeeds = [];
    if (neededOffWorld) {
        for (let i = 0; i < INVENTORY.length; i++) {
            const item = INVENTORY[i];
            if (item && neededOffWorld[item.id] > 0 && item.originSeed && item.originSeed !== worldSeed) {
                const amountToTake = Math.min(item.count, neededOffWorld[item.id]);

                for (let j = 0; j < amountToTake; j++) {
                    consumedSeeds.push(item.originSeed);
                }

                item.count -= amountToTake;
                neededOffWorld[item.id] -= amountToTake;
                neededToConsume[item.id] -= amountToTake;

                if (item.count === 0) {
                    INVENTORY[i] = null;
                }
            }
        }
    }
    for (let i = 0; i < INVENTORY.length; i++) {
        const item = INVENTORY[i];
        if (item && neededToConsume[item.id] > 0) {
            const amountToTake = Math.min(item.count, neededToConsume[item.id]);
            item.count -= amountToTake;
            neededToConsume[item.id] -= amountToTake;
            if (item.count === 0) {
                INVENTORY[i] = null;
            }
        }
    }
    let newOriginSeed = null;
    if (consumedSeeds.length > 0) {
        newOriginSeed = consumedSeeds.join('');
    }
    addToInventory(recipe.out.id, recipe.out.count, newOriginSeed);
    addMessage('Crafted ' + BLOCKS[recipe.out.id].name);
    updateHotbarUI();
    if (document.getElementById('inventoryModal').style.display === 'block') {
        updateInventoryUI();
    }
    document.getElementById('craftModal').style.display = 'none';
    isPromptOpen = false;
}

function completeCraft(recipe, selectedIndex) {
    const neededToConsume = { ...recipe.requires };
    const consumedSeeds = [];

    const selectedItem = INVENTORY[selectedIndex];
    if (!selectedItem || !recipe.requiresOffWorld || !recipe.requiresOffWorld[selectedItem.id]) {
        addMessage("Invalid selection for craft.");
        craftingState = null;
        updateInventoryUI();
        return;
    }
    neededToConsume[selectedItem.id]--;
    consumedSeeds.push(selectedItem.originSeed);
    const tempInventory = JSON.parse(JSON.stringify(INVENTORY));
    tempInventory[selectedIndex].count--;
    if (recipe.requiresOffWorld) {
        for (const reqId in recipe.requiresOffWorld) {
            let neededCount = recipe.requiresOffWorld[reqId];
            if (parseInt(reqId) === selectedItem.id) {
                neededCount--;
            }
            if (neededCount > 0) {
                for (let i = 0; i < tempInventory.length; i++) {
                    const item = tempInventory[i];
                    if (item && item.id == reqId && item.originSeed && item.originSeed !== worldSeed && item.count > 0) {
                        const amountToReserve = Math.min(item.count, neededCount);
                        for (let j = 0; j < amountToReserve; j++) {
                            consumedSeeds.push(item.originSeed);
                        }
                        item.count -= amountToReserve;
                        neededCount -= amountToReserve;
                        neededToConsume[reqId] -= amountToReserve;
                        if (neededCount <= 0) break;
                    }
                }
            }
        }
    }
    const available = {};
    for (const item of tempInventory) {
        if (item && item.count > 0) {
            available[item.id] = (available[item.id] || 0) + item.count;
        }
    }
    for (const reqId in neededToConsume) {
        if ((available[reqId] || 0) < neededToConsume[reqId]) {
            addMessage("Still missing other materials.");
            craftingState = null;
            updateInventoryUI();
            return;
        }
    }
    INVENTORY[selectedIndex].count--;
    if (INVENTORY[selectedIndex].count <= 0) INVENTORY[selectedIndex] = null;
    let finalConsumption = { ...recipe.requires };
    finalConsumption[selectedItem.id]--;
    let offWorldToConsume = { ...recipe.requiresOffWorld };
     if (offWorldToConsume[selectedItem.id]) {
        offWorldToConsume[selectedItem.id]--;
    }
    if (Object.keys(offWorldToConsume).length > 0) {
         for (let i = 0; i < INVENTORY.length; i++) {
            const item = INVENTORY[i];
            if (item && offWorldToConsume[item.id] > 0 && item.originSeed && item.originSeed !== worldSeed) {
                const amountToTake = Math.min(item.count, offWorldToConsume[item.id]);
                item.count -= amountToTake;
                offWorldToConsume[item.id] -= amountToTake;
                finalConsumption[item.id] -= amountToTake;
                if (item.count === 0) INVENTORY[i] = null;
            }
        }
    }
    for (let i = 0; i < INVENTORY.length; i++) {
        const item = INVENTORY[i];
        if (item && finalConsumption[item.id] > 0) {
            const amountToTake = Math.min(item.count, finalConsumption[item.id]);
            item.count -= amountToTake;
            finalConsumption[item.id] -= amountToTake;
            if (item.count === 0) INVENTORY[i] = null;
        }
    }
    const newOriginSeed = consumedSeeds.sort().join('');
    addToInventory(recipe.out.id, recipe.out.count, newOriginSeed);
    addMessage('Crafted ' + BLOCKS[recipe.out.id].name);
    craftingState = null;
    document.getElementById('craftModal').style.display = 'none';
    isPromptOpen = false;
    toggleInventory();
    updateHotbarUI();
}

function initiateCraft(recipe) {
    if (craftingState) {
        addMessage("Please complete or cancel the current craft.");
        return;
    }
    if (recipe.requiresOffWorld) {
        for (const reqId in recipe.requiresOffWorld) {
            const neededCount = recipe.requiresOffWorld[reqId];
            const offWorldItems = INVENTORY
                .map((item, index) => ({ item, index }))
                .filter(({item}) => item && item.id == reqId && item.originSeed && item.originSeed !== worldSeed);
            const totalOffWorldQuantity = offWorldItems.reduce((sum, { item }) => sum + item.count, 0);
            if (totalOffWorldQuantity > neededCount) {
                craftingState = {
                    recipe: recipe,
                    requiredItemId: parseInt(reqId),
                };
                addMessage(`Select an off-world ${BLOCKS[reqId].name} to use.`);
                document.getElementById('craftModal').style.display = 'none';
                if (document.getElementById('inventoryModal').style.display !== 'block') {
                    toggleInventory();
                } else {
                    updateInventoryUI();
                }
                return;
            }
        }
    }
    attemptCraft(recipe);
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
        var reqsStrings = [];
        for(const id in r.requires) {
            let reqStr = `${BLOCKS[id].name || id} x${r.requires[id]}`;
            if(r.requiresOffWorld && r.requiresOffWorld[id]) {
                reqStr += ` (${r.requiresOffWorld[id]} must be Off-World)`;
            }
            reqsStrings.push(reqStr);
        }
        reqs.innerText = 'Requires: ' + reqsStrings.join(', ');
        var btn = document.createElement('button');
        btn.innerText = 'Craft';
        btn.onclick = (function(recipe) {
            return function() {
                initiateCraft(recipe);
            };
        })(r);
        row.appendChild(info);
        row.appendChild(reqs);
        row.appendChild(btn);
        list.appendChild(row);
    }
}

function toggleInventory() {
    var invModal = document.getElementById('inventoryModal');
    var isVisible = invModal.style.display === 'block';
    if (isVisible && craftingState) {
        craftingState = null;
        addMessage("Crafting canceled.");
    }
    invModal.style.display = isVisible ? 'none' : 'block';
    isPromptOpen = !isVisible;
    if (!isVisible) {
        updateInventoryUI();
    } else {
        selectedInventoryIndex = -1;
    }
}

function updateInventoryUI() {
    var grid = document.getElementById('inventoryGrid');
    var hotbar = document.getElementById('inventoryHotbar');
    grid.innerHTML = '';
    hotbar.innerHTML = '';
    for (var i = 9; i < 36; i++) {
        grid.appendChild(createInventorySlot(i));
    }
    for (var i = 0; i < 9; i++) {
        hotbar.appendChild(createInventorySlot(i));
    }
}

function createInventorySlot(index) {
    var slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.dataset.index = index;
    var item = INVENTORY[index];
    if (item && item.id) {
        var color = BLOCKS[item.id] ? hexToRgb(BLOCKS[item.id].color) : [128, 128, 128];
        slot.style.backgroundColor = `rgba(${color.join(',')}, 0.6)`;
        slot.innerText = BLOCKS[item.id] ? BLOCKS[item.id].name.substring(0, 6) : 'Unknown';
        if (item.count > 1) {
            var countEl = document.createElement('div');
            countEl.className = 'inv-count';
            countEl.innerText = item.count;
            slot.appendChild(countEl);
        }
        if (craftingState && item.id === craftingState.requiredItemId && item.originSeed && item.originSeed !== worldSeed) {
            slot.classList.add('highlight-craft');
        }
    }
    if (index === selectedInventoryIndex && !craftingState) {
        slot.classList.add('selected');
    }
    slot.addEventListener('click', function() {
        var clickedIndex = parseInt(this.dataset.index);
        if (craftingState) {
            const selectedItem = INVENTORY[clickedIndex];
            if (selectedItem && selectedItem.id === craftingState.requiredItemId && selectedItem.originSeed && selectedItem.originSeed !== worldSeed) {
                completeCraft(craftingState.recipe, clickedIndex);
            } else {
                addMessage("This item cannot be used for this craft.");
            }
        } else {
            if (selectedInventoryIndex === -1) {
                selectedInventoryIndex = clickedIndex;
            } else {
                var temp = INVENTORY[selectedInventoryIndex];
                INVENTORY[selectedInventoryIndex] = INVENTORY[clickedIndex];
                INVENTORY[clickedIndex] = temp;
                selectedInventoryIndex = -1;
            }
            updateInventoryUI();
            updateHotbarUI();
        }
    });
    slot.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var clickedIndex = parseInt(this.dataset.index);
        if (INVENTORY[clickedIndex] && INVENTORY[clickedIndex].count > 0) {
            trashIndex = clickedIndex;
            document.getElementById('trashItemName').innerText = 'Trash ' + BLOCKS[INVENTORY[trashIndex].id].name + ' x' + INVENTORY[trashIndex].count + ' ? ';
            document.getElementById('trashConfirm').style.display = 'block';
        }
    });
    return slot;
}
