const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    group.add(limb);
    group.rotation.set(rx, ry, rz);
    group.updateMatrixWorld(true);

    const stringLocal = new THREE.Vector3(0, 0, 0); // origin
    const handleLocal = new THREE.Vector3(0, 0.45, 0); // wait...

    const p3 = new THREE.Vector3(0, 0.45, 0);
    p3.applyMatrix4(limb.matrixWorld);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Middle of arc (handle):", p3);
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
test(-Math.PI/2, 0, -Math.PI/2);       // current
