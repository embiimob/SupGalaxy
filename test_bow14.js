const THREE = require('three');

function test(rx, ry, rz) {
    const gun = new THREE.Group();
    // Inner container for the bow!
    const bowMesh = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    bowMesh.add(limb);

    const string = new THREE.Mesh(new THREE.BoxGeometry());
    bowMesh.add(string);

    // Now we apply the rotation to the inner mesh, NOT the outer gun group!
    bowMesh.rotation.set(rx, ry, rz);

    gun.add(bowMesh);

    // Simulate what poseFirstPersonLaserGun does
    const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const aimDir = new THREE.Vector3(0, 0, -1);
    gun.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir);

    gun.updateMatrixWorld(true);

    const handle = new THREE.Vector3(0, 0.45, 0); // Wait, arc center was at Z=0.45 in limb local space? Actually we found the arc handle is at Vector3(x: 0, y: 0.45, z: 0) when unrotated?

    // Let's check handle in gun space.
    const h = new THREE.Vector3();
    limb.getWorldPosition(h);
    // Well, limb origin is (0,0,0) and handle is at (0, 0, 0.45) in limb space ?
    // No, earlier we said Handle: Vector3 { x: 0, y: 0.45, z: -9.99e-17 }
    const p3 = new THREE.Vector3(0, 0.45, 0);
    p3.applyMatrix4(limb.matrixWorld);

    const str = new THREE.Vector3();
    string.getWorldPosition(str);

    console.log("rx", rx, "ry", ry, "rz", rz);
    console.log("Handle:", p3);
    console.log("String:", str);
}

test(-Math.PI/2, Math.PI, -Math.PI/2);
test(-Math.PI/2, 0, -Math.PI/2);
