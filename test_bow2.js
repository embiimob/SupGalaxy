const THREE = require('three');
const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
limb.updateMatrixWorld(true);

const p1 = new THREE.Vector3(0.45, 0, 0); // one end of arc before rotation
const p2 = new THREE.Vector3(-0.45, 0, 0); // other end
const p3 = new THREE.Vector3(0, 0.45, 0); // middle of arc before rotation

p1.applyMatrix4(limb.matrixWorld);
p2.applyMatrix4(limb.matrixWorld);
p3.applyMatrix4(limb.matrixWorld);

console.log("End 1:", p1);
console.log("End 2:", p2);
console.log("Middle:", p3);
