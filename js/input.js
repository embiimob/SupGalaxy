/**
 * Input handling module for SupGalaxy
 * Manages keyboard events, mobile touch controls, and joystick input
 */

// Debug flag: Set to true to enable verbose console logging
// In production, this should be false to reduce console noise
window.DEBUG_MODE = false;

/**
 * Helper function for debug logging
 * Only outputs to console when DEBUG_MODE is enabled
 * @param {string} category - Log category (e.g., 'INPUT', 'MOBILE')
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
function debugLog(category, message, ...args) {
    if (window.DEBUG_MODE) {
        console.log(`[${category}] ${message}`, ...args);
    }
}

// Expose debugLog globally for use in other modules
window.debugLog = debugLog;

// Key state tracking object
var keys = {};

/**
 * Registers keyboard event listeners for game controls
 * @returns {Function} Cleanup function to remove event listeners
 */
function registerKeyEvents() {
    function onKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // Sprint toggle on double-tap W
        if (key === "w" && !keys[key]) {
            const now = performance.now();
            if (now - lastWPress < 300) {
                isSprinting = !isSprinting;
                addMessage(isSprinting ? "Sprinting enabled" : "Sprinting disabled", 1500);
            }
            lastWPress = now;
        }
        
        keys[key] = true;
        
        // Escape to exit pointer lock
        if (e.key === "Escape" && mouseLocked) {
            document.exitPointerLock();
            mouseLocked = false;
        }
        
        // T - Toggle camera mode
        if (key === "t") {
            toggleCameraMode();
        }
        
        // C - Open crafting menu
        if (key === "c") {
            openCrafting();
        }
        
        // I - Toggle inventory
        if (key === "i") {
            toggleInventory();
        }
        
        // P - Teleport modal
        if (key === "p") {
            isPromptOpen = true;
            document.getElementById("teleportModal").style.display = "block";
            document.getElementById("teleportX").value = Math.floor(player.x);
            document.getElementById("teleportY").value = Math.floor(player.y);
            document.getElementById("teleportZ").value = Math.floor(player.z);
        }
        
        // X - Download session (if changes exist)
        if (key === "x" && getCurrentWorldState().chunkDeltas.size > 0) {
            downloadSession();
        }
        
        // U - Open users modal
        if (key === "u") {
            openUsersModal();
        }
        
        // Space - Jump
        if (e.key === " ") {
            playerJump();
        }
        
        // Q - Left click action (attack/mine)
        if (key === "q") {
            onPointerDown({
                button: 0,
                preventDefault: () => {}
            });
        }
        
        // E - Right click action (place/interact)
        if (key === "e") {
            onPointerDown({
                button: 2,
                preventDefault: () => {}
            });
        }
    }

    function onKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }
    
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    
    debugLog('INPUT', 'Keyboard event listeners registered');
    
    // Return cleanup function
    return function() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        debugLog('INPUT', 'Keyboard event listeners removed');
    };
}

/**
 * Handle player jump action
 */
function playerJump() {
    if (player.onGround) {
        player.vy = isSprinting ? 25.5 : 8.5;
        player.onGround = false;
    }
}

/**
 * Detect if the device is mobile
 * @returns {boolean} True if mobile device
 */
function isMobile() {
    return /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
}

/**
 * Setup mobile touch controls including joystick and look zone
 */
function setupMobile() {
    if (!isMobile()) return;

    debugLog('MOBILE', 'Setting up mobile controls');

    // Joystick variables
    const joystickZone = document.getElementById("mobileJoystickZone");
    const joystickKnob = document.getElementById("mobileJoystickKnob");
    let joystickOrigin = { x: 0, y: 0 };
    let joystickId = null;

    // Joystick Event Handlers
    joystickZone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickId = touch.identifier;
        joystickOrigin = { x: touch.clientX, y: touch.clientY };

        joystickKnob.style.display = "block";
        joystickKnob.style.left = touch.clientX + "px";
        joystickKnob.style.top = touch.clientY + "px";
        joystickKnob.style.transform = "translate(-50%, -50%)";
    }, { passive: false });

    joystickZone.addEventListener("touchmove", (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                const touch = e.changedTouches[i];
                const dx = touch.clientX - joystickOrigin.x;
                const dy = touch.clientY - joystickOrigin.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 50;

                let clampedX = dx;
                let clampedY = dy;

                if (distance > maxDist) {
                    const ratio = maxDist / distance;
                    clampedX = dx * ratio;
                    clampedY = dy * ratio;
                }

                joystickKnob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;

                const normX = clampedX / maxDist;
                const normY = clampedY / maxDist;
                const deadzone = 0.2;

                joystick.right = normX > deadzone;
                joystick.left = normX < -deadzone;
                joystick.down = normY > deadzone;
                joystick.up = normY < -deadzone;

                break;
            }
        }
    }, { passive: false });

    const endJoystick = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickId) {
                joystickId = null;
                joystickKnob.style.display = "none";
                joystick.up = false;
                joystick.down = false;
                joystick.left = false;
                joystick.right = false;
                break;
            }
        }
    };

    joystickZone.addEventListener("touchend", endJoystick, { passive: false });
    joystickZone.addEventListener("touchcancel", endJoystick, { passive: false });

    // Look/Interact Zone variables
    const lookZone = document.getElementById("mobileLookZone");
    let lookOrigin = { x: 0, y: 0 };
    let lookId = null;
    let lookStartTime = 0;
    let lookMoved = false;
    let lastPinchDistance = 0;

    // Look Event Handlers
    lookZone.addEventListener("touchstart", (e) => {
        e.preventDefault();

        if (e.touches.length === 2 && cameraMode === "third") {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            return;
        }

        const touch = e.changedTouches[0];
        lookId = touch.identifier;
        lookOrigin = { x: touch.clientX, y: touch.clientY };
        lookStartTime = Date.now();
        lookMoved = false;
    }, { passive: false });

    lookZone.addEventListener("touchmove", (e) => {
        e.preventDefault();

        if (e.touches.length === 2 && cameraMode === "third") {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (lastPinchDistance > 0) {
                const delta = distance - lastPinchDistance;
                const zoomSpeed = 0.05;

                const eye = new THREE.Vector3().copy(controls.object.position).sub(controls.target);
                let len = eye.length();
                len -= delta * zoomSpeed;
                len = Math.max(controls.minDistance, Math.min(controls.maxDistance, len));

                eye.normalize().multiplyScalar(len);
                controls.object.position.copy(controls.target).add(eye);
                controls.update();
            }

            lastPinchDistance = distance;
            return;
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookId) {
                const touch = e.changedTouches[i];
                const dx = touch.clientX - lookOrigin.x;
                const dy = touch.clientY - lookOrigin.y;

                const sensitivity = 0.005;
                if (cameraMode === "first") {
                    player.yaw -= dx * sensitivity;
                    player.pitch -= dy * sensitivity;
                    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));

                    camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
                    if (avatarGroup && avatarGroup.children[3]) {
                        avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
                    }
                } else {
                    if (controls && controls.enabled) {
                        controls.rotateLeft(dx * sensitivity);
                        controls.rotateUp(dy * sensitivity);
                        controls.update();
                    }
                }

                lookOrigin = { x: touch.clientX, y: touch.clientY };

                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                    lookMoved = true;
                }
                break;
            }
        }
    }, { passive: false });

    const endLook = (e) => {
        e.preventDefault();

        if (e.touches.length < 2) {
            lastPinchDistance = 0;
        }

        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookId) {
                const touch = e.changedTouches[i];
                const duration = Date.now() - lookStartTime;

                if (!lookMoved && duration < 300) {
                    const item = INVENTORY[selectedHotIndex];
                    let button = 2;

                    if (item && (item.id === 121 || item.id === 126 || item.id === 122)) {
                        button = 0;
                    }

                    onPointerDown({
                        button: button,
                        preventDefault: () => {}
                    });
                }

                lookId = null;
                clearInterval(breakInterval);
                breakInterval = null;
                break;
            }
        }
    };

    let breakInterval = null;
    lookZone.addEventListener("touchstart", (e) => {
        if (breakInterval) clearInterval(breakInterval);
        breakInterval = setTimeout(() => {
            if (!lookMoved) {
                onPointerDown({
                    button: 0,
                    preventDefault: () => {}
                });

                breakInterval = setInterval(() => {
                    if (!lookMoved) {
                        onPointerDown({
                            button: 0,
                            preventDefault: () => {}
                        });
                    }
                }, 250);
            }
        }, 300);
    }, { passive: false });

    lookZone.addEventListener("touchend", (e) => {
        if (breakInterval) {
            clearTimeout(breakInterval);
            clearInterval(breakInterval);
            breakInterval = null;
        }
        endLook(e);
    }, { passive: false });

    lookZone.addEventListener("touchcancel", (e) => {
        if (breakInterval) {
            clearTimeout(breakInterval);
            clearInterval(breakInterval);
            breakInterval = null;
        }
        endLook(e);
    }, { passive: false });

    // Mobile action buttons
    document.getElementById("mobileJumpBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        playerJump();
    });

    document.getElementById("mobileSprintBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        isSprinting = !isSprinting;
        addMessage(isSprinting ? "Sprinting enabled" : "Sprinting disabled", 1000);
    });

    document.getElementById("mobileInventoryBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleInventory();
    });

    document.getElementById("mobileCamBtn").addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleCameraMode();
    });

    debugLog('MOBILE', 'Mobile controls setup complete');
}
