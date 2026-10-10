const THREE = require('three');
const group = new THREE.Group();
const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
group.add(limb);
const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.015));
group.add(bowString);
group.rotation.set(-Math.PI/2, 0, -Math.PI/2);
group.updateMatrixWorld(true);

const p = new THREE.Vector3();
limb.getWorldPosition(p);
console.log("Limb pos:", p);
bowString.getWorldPosition(p);
console.log("String pos:", p);

console.log("Group rotation:", group.rotation);
