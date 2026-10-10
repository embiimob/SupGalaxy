const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    group.add(limb);
    group.rotation.set(rx, ry, rz);
    group.updateMatrixWorld(true);

    const handle = new THREE.Vector3(0.45, 0, 0);
    handle.applyMatrix4(limb.matrixWorld);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Handle:", handle);
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
test(-Math.PI/2, 0, -Math.PI/2);       // current
