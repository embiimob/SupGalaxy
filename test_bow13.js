const THREE = require('three');

function test(axis, stringDrawDir) {
    const group = new THREE.Group(); // Inner group for geometry and internal rotation

    // The previous implementation added geometry directly to group, then set group.rotation = (-PI/2, PI, -PI/2).
    // BUT later in poseFirstPersonLaserGun, it overwrites group.quaternion!
    // This is why the group.rotation wasn't doing what we expected when aiming!
    // It was completely discarded by `gun.quaternion.setFromUnitVectors(...)` and `gun.quaternion.slerpQuaternions(...)`.

    console.log("WAIT. `gun` in poseFirstPersonLaserGun is the outer group returned by `createLaserGunMesh`.");
}
test();
