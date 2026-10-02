const fs = require('fs');
let content = fs.readFileSync('js/chunk-manager.js', 'utf8');

// For the physical material we need to configure it correctly to show up properly under water
// Let's set transmission to 0 to disable it and use standard opacity.
// OR switch back to MeshStandardMaterial but without shader redefinitions!

content = content.replace(/a = new THREE.MeshPhysicalMaterial\(\{\n\s*color: new THREE.Color\(o.color\),\n\s*transparent: true,\n\s*transmission: 0.95,\n\s*opacity: 0.8,\n\s*roughness: 0.05,\n\s*ior: 1.33,\n\s*thickness: 2.0,\n\s*side: THREE.FrontSide,\n\s*depthWrite: false\n\s*\}\);/g, `a = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(o.color),
                    transparent: true,
                    opacity: 0.7,
                    roughness: 0.2,
                    metalness: 0.1,
                    side: THREE.FrontSide,
                    depthWrite: false
                });`);


content = content.replace(/D = new THREE.MeshPhysicalMaterial\(\{\n\s*color: new THREE.Color\(K.color\),\n\s*transparent: true,\n\s*transmission: 0.95,\n\s*opacity: 0.8,\n\s*roughness: 0.05,\n\s*ior: 1.33,\n\s*thickness: 2.0,\n\s*side: THREE.FrontSide,\n\s*depthWrite: false\n\s*\}\);/g, `D = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(K.color),
                    transparent: true,
                    opacity: 0.7,
                    roughness: 0.2,
                    metalness: 0.1,
                    side: THREE.FrontSide,
                    depthWrite: false
                });`);

// also fix the shader varying from vWorldPosition to vWaveWorldPosition so it doesn't conflict
content = content.replace(/varying vec3 vWorldPosition;/g, 'varying vec3 vWaveWorldPosition;');
content = content.replace(/vWorldPosition = vWPos.xyz;/g, 'vWaveWorldPosition = vWPos.xyz;');
content = content.replace(/vWorldPosition.y/g, 'vWaveWorldPosition.y');
content = content.replace(/vWorldPosition.x/g, 'vWaveWorldPosition.x');
content = content.replace(/vWorldPosition.z/g, 'vWaveWorldPosition.z');


fs.writeFileSync('js/chunk-manager.js', content);
