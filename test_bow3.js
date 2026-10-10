const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    group.add(limb);
    group.rotation.set(rx, ry, rz);
    group.updateMatrixWorld(true);

    const handleLocal = new THREE.Vector3(0, 0, 0.45);
    handleLocal.applyMatrix4(limb.matrixWorld);

    const stringTopLocal = new THREE.Vector3(0, 0.45, 0);
    stringTopLocal.applyMatrix4(limb.matrixWorld);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Handle World:", handleLocal);
    console.log("String top World:", stringTopLocal);
}

test(-Math.PI/2, Math.PI, -Math.PI/2); // previous
test(-Math.PI/2, 0, -Math.PI/2);       // current
