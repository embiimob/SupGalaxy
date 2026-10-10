const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    // INITIAL ROTATION
    group.rotation.set(rx, ry, rz);

    // In poseFirstPersonLaserGun:
    // gun.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir) replaces the group's quaternion entirely!
    // Oh wait. Yes, setFromUnitVectors overwrites the previous quaternion!

    group.updateMatrixWorld(true);
    console.log("INITIAL ROTATION:");
    console.log(group.quaternion);

    const aimDir = new THREE.Vector3(0, 0, -1);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir); // point forward
    group.updateMatrixWorld(true);
    console.log("AFTER setFromUnitVectors:");
    console.log(group.quaternion);
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
