const THREE = require('three');
const euler = new THREE.Euler(Math.PI/2, Math.PI, -Math.PI/2, 'XYZ');
const v1 = new THREE.Vector3(0.45, 0, 0); // start of arc
const v2 = new THREE.Vector3(0, 0.45, 0); // middle of arc
const v3 = new THREE.Vector3(-0.45, 0, 0); // end of arc
console.log("v1:", v1.applyEuler(euler));
console.log("v2:", v2.applyEuler(euler));
console.log("v3:", v3.applyEuler(euler));
