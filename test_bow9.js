const THREE = require('three');

const group = new THREE.Group();
const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI));
limb.rotation.set(0, Math.PI / 2, Math.PI / 2);
group.add(limb);
const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.015));
group.add(bowString);

group.updateMatrixWorld(true);

const handle = new THREE.Vector3(0, 0.45, 0); // local to limb, wait, let's just find the middle of the Torus arc
handle.applyMatrix4(limb.matrixWorld);

const str = new THREE.Vector3();
str.applyMatrix4(bowString.matrixWorld);

console.log("Handle relative to string in GROUP local space:", handle.clone().sub(str));
