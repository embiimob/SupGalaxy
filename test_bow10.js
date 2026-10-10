const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    group.rotation.set(rx, ry, rz);

    // Test pose: "aim fully"
    // In poseFirstPersonLaserGun, the quat is calculated using:
    // gun.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir)
    // where aimDir is approx (0,0,-1).
    // And if bow, restQuat = Euler(0, 0, 0)

    // Group local +Z is what we just found out the handle is relative to string (z=0.45).
    // Let's see what direction group's local Z points in world space when aiming forward.

    const aimDir = new THREE.Vector3(0, 0, -1);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir); // point forward
    group.updateMatrixWorld(true);

    const localZ = new THREE.Vector3(0, 0, 1);
    localZ.applyMatrix4(group.matrixWorld);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Local +Z points to (World):", localZ);
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
test(-Math.PI/2, 0, -Math.PI/2);       // current
