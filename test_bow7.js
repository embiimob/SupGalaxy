const THREE = require('three');

function test(rx, ry, rz) {
    const group = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
    limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
    group.add(limb);
    group.rotation.set(rx, ry, rz);

    // Simulate gun grip pose: restZ is around -0.62. We aim it forward (0,0,-1)
    const aimDir = new THREE.Vector3(0, 0, -1);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), aimDir); // point forward
    group.updateMatrixWorld(true);

    const handle = new THREE.Vector3(0, 0.45, 0); // local to limb, wait no the arc is in XY plane initially?

    // Before any rotation, let's look at limb arc
    // Torus in XY plane by default. Half circle. x is from +0.45 to -0.45
    // Wait, TorusGeometry by default has its tube along the ring in XY plane.
    // So the arc goes from x=0.45, y=0 to x=-0.45, y=0. And z=0. The curve goes into y>0 or y<0?
    // "arc" parameter: central angle. default 2PI. If PI, it starts at some angle and goes PI radians.
    // In three.js Torus, it starts at X axis (x=R, y=0, z=0) and goes towards Y axis (x=0, y=R, z=0) then to -X (x=-R, y=0, z=0).
    // So the middle of the handle is at (0, R, 0) in limb local space!
}
test(0,0,0);
