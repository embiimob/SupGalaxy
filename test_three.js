const THREE = require('three');

const geom = new THREE.TorusGeometry(0.45, 0.035, 6, 16, Math.PI);
const pos = geom.attributes.position.array;
let minX = 100, maxX = -100, minY = 100, maxY = -100, minZ = 100, maxZ = -100;
for(let i=0; i<pos.length; i+=3) {
    if(pos[i] < minX) minX = pos[i];
    if(pos[i] > maxX) maxX = pos[i];
    if(pos[i+1] < minY) minY = pos[i+1];
    if(pos[i+1] > maxY) maxY = pos[i+1];
    if(pos[i+2] < minZ) minZ = pos[i+2];
    if(pos[i+2] > maxZ) maxZ = pos[i+2];
}
console.log(`X: ${minX} to ${maxX}`);
console.log(`Y: ${minY} to ${maxY}`);
console.log(`Z: ${minZ} to ${maxZ}`);
