const THREE = require('three');
const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
limb.updateMatrixWorld(true);

const handle = new THREE.Vector3(0.45, 0, 0); // Is it 0.45, 0, 0?
const handle2 = new THREE.Vector3(0, 0.45, 0);
const handle3 = new THREE.Vector3(0, 0, 0.45);

handle.applyMatrix4(limb.matrixWorld);
handle2.applyMatrix4(limb.matrixWorld);
handle3.applyMatrix4(limb.matrixWorld);

console.log("Middle of arc (unrotated) is 0, 0.45, 0. Let's see where it goes:", handle2);
