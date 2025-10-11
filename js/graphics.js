// ------------------ Graphics and Rendering ------------------

// Sets up and manages the Three.js scene, camera, renderer, and sky.

var scene, camera, renderer, controls;
var meshGroup;
var sun, moon, stars, clouds;

function initThree() {
    console.log('[initThree] Starting');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    console.log('[initThree] Scene created');
    camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);
    camera.position.set(0, 34, 0);
    console.log('[initThree] Camera created');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    document.body.appendChild(renderer.domElement);
    console.log('[initThree] Renderer created and appended');
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 2;
    controls.maxDistance = 100;
    controls.enabled = false;
    console.log('[initThree] Controls created');
    var dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(100, 200, 100);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    console.log('[initThree] Lights added');
    meshGroup = new THREE.Group();
    scene.add(meshGroup);
    console.log('[initThree] Mesh group created');
    initSky();
    console.log('[initThree] Sky initialized');
    renderer.domElement.addEventListener('pointerdown', function (e) { onPointerDown(e); });
    renderer.domElement.addEventListener('wheel', function (e) {
        e.preventDefault();
        if (cameraMode === 'first') {
            var delta = e.deltaY > 0 ? 1 : -1;
            selectedHotIndex = (selectedHotIndex + delta + INVENTORY.length) % INVENTORY.length;
            updateHotbarUI();
        }
    });
    renderer.domElement.addEventListener('click', function () {
        if (cameraMode === 'first' && !mouseLocked && !isMobile()) {
            try {
                renderer.domElement.requestPointerLock();
                mouseLocked = true;
                document.getElementById('crosshair').style.display = 'block';
            } catch (e) {
                addMessage('Pointer lock failed. Serve over HTTPS or check iframe permissions.');
            }
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    renderer.domElement.addEventListener('touchstart', e => {
        let target = e.target;
        let isButton = false;
        while(target && target !== document.body) {
            if (target.classList.contains('m-btn') || target.classList.contains('m-action')) {
                isButton = true;
                break;
            }
            target = target.parentElement;
        }

        if (isButton) return;

        if (cameraMode === 'first' && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault(); // Prevent scrolling/zooming
        }
    }, { passive: false });

    renderer.domElement.addEventListener('touchmove', e => {
        if (cameraMode === 'first' && e.touches.length > 0) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;

            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;

            const sensitivity = 0.005; // Mobile sensitivity
            player.yaw -= deltaX * sensitivity;
            player.pitch -= deltaY * sensitivity;
            player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
            camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

            if (avatarGroup && avatarGroup.children[3]) {
                avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
            }

            touchStartX = touchX;
            touchStartY = touchY;
            e.preventDefault(); // Prevent scrolling/zooming
        }
    }, { passive: false });
    document.addEventListener('pointerlockchange', function () {
        mouseLocked = document.pointerLockElement === renderer.domElement;
        document.getElementById('crosshair').style.display = mouseLocked && cameraMode === 'first' ? 'block' : 'none';
    });
    renderer.domElement.addEventListener('mousemove', function (e) {
        if (cameraMode === 'first' && mouseLocked) {
            var sensitivity = 0.002;
            player.yaw -= e.movementX * sensitivity;
            player.pitch -= e.movementY * sensitivity;
            player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
            camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

            if (avatarGroup) {
                avatarGroup.children[3].rotation.set(player.pitch, 0, 0);
            }
        }
    });
    window.addEventListener('resize', function () {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        updateMinimap();
    });
    createPlayerAvatar();
}

function initSky() {
    sun = new THREE.Mesh(
        new THREE.SphereGeometry(10, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    moon = new THREE.Mesh(
        new THREE.SphereGeometry(8, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xcccccc })
    );
    stars = new THREE.Group();
    var starGeometry = new THREE.BufferGeometry();
    var starVertices = [];
    var starNoise = makeNoise(worldSeed + '_stars');
    for (var i = 0; i < 1000; i++) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        var x = 1000 * Math.sin(phi) * Math.cos(theta);
        var y = 1000 * Math.sin(phi) * Math.sin(theta);
        var z = 1000 * Math.cos(phi);
        if (starNoise(x * 0.01, z * 0.01) > 0.7) {
            starVertices.push(x, y, z);
        }
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    var starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    var starPoints = new THREE.Points(starGeometry, starMaterial);
    stars.add(starPoints);
    clouds = new THREE.Group();
    for (var i = 0; i < 20; i++) {
        var cloud = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
        );
        cloud.position.set(
            (Math.random() - 0.5) * 2000,
            100 + Math.random() * 50,
            (Math.random() - 0.5) * 2000
        );
        clouds.add(cloud);
    }
    scene.add(sun, moon, stars, clouds);
}

function updateSky(dt) {
    var now = new Date();
    var hours = now.getHours() + now.getMinutes() / 60;
    var t = (hours / 24) * Math.PI * 2;
    var isNight = hours >= 18 || hours < 6;
    var sunAngle = t;
    var moonAngle = t + Math.PI;
    sun.position.set(1000 * Math.cos(sunAngle), 1000 * Math.sin(sunAngle), 0);
    moon.position.set(1000 * Math.cos(moonAngle), 1000 * Math.sin(moonAngle), 0);
    stars.visible = isNight;
    clouds.children.forEach(function (cloud) {
        cloud.position.x = modWrap(cloud.position.x + dt * 10, 2000);
        cloud.lookAt(camera.position);
    });
    var dayColor = new THREE.Color(0x87ceeb);
    var nightColor = new THREE.Color(0x1c2526);
    var tNorm = Math.sin(t) * 0.5 + 0.5;
    scene.background = dayColor.lerp(nightColor, tNorm);
    var ambientLight = scene.getObjectByProperty('type', 'AmbientLight');
    ambientLight.intensity = isNight ? 0.2 : 0.45;
    sun.visible = !isNight;
    moon.visible = isNight;
}
