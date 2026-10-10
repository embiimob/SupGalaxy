const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    group.add(limb);
    group.rotation.set(rx, ry, rz);

    // Test pose
    const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .25, 0));
    const aimDir = new THREE.Vector3(0, 0, -1);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir);
    group.quaternion.slerpQuaternions(restQuat, group.quaternion.clone(), 1.0); // aim fully

    group.updateMatrixWorld(true);

    const handle = new THREE.Vector3(0.45, 0, 0);
    handle.applyMatrix4(limb.matrixWorld);

    const string = new THREE.Vector3(0,0,0);
    string.applyMatrix4(group.matrixWorld);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Handle:", handle);
    console.log("String:", string);
    console.log("Handle relative to string:", handle.clone().sub(string));
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
test(-Math.PI/2, 0, -Math.PI/2);       // current
