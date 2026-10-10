const THREE = require('three');
const euler = new THREE.Euler(Math.PI/2, Math.PI, -Math.PI/2, 'XYZ');
const v1 = new THREE.Vector3(0, 0, -0.4); // aim direction relative to camera
console.log("aim vector unrotated:", v1);
console.log("aim vector rotated:", v1.clone().applyEuler(euler));
