const fs = require('fs');

let content = fs.readFileSync('js/chunk-manager.js', 'utf8');

// The water material definition
content = content.replace(/else if \(t\.blockId === 6\) \{[\s\S]*?depthWrite: false\s*\}\);/g, `else if (t.blockId === 6) {
                a = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color(o.color),
                    transparent: true,
                    transmission: 0.95,
                    opacity: 0.8,
                    roughness: 0.05,
                    ior: 1.33,
                    thickness: 2.0,
                    side: THREE.FrontSide,
                    depthWrite: false
                });`);

content = content.replace(/else if \(Number\(w\) === 6\) \{[\s\S]*?depthWrite: false\s*\}\);/g, `else if (Number(w) === 6) {
                D = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color(K.color),
                    transparent: true,
                    transmission: 0.95,
                    opacity: 0.8,
                    roughness: 0.05,
                    ior: 1.33,
                    thickness: 2.0,
                    side: THREE.FrontSide,
                    depthWrite: false
                });`);


// For the buildGreedyMesh we remove internal edges:
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('let shouldRender = p !== (!s || u.transparent);')) {
        // we can find where to insert the fix
    }
}

// Actually let's just use string replacement for the greedy mesh

let newContent = content.replace(
    /let h = null;\s*if \(p !== \(!s \|\| u\.transparent\)\)/,
    `let h = null;
                    let shouldRender = p !== (!s || u.transparent);
                    if (a === 6 && (s === 6 || (s !== 0 && u && !u.transparent))) shouldRender = false;
                    if (shouldRender)`
);

// and for the custom geometries (non-greedy mesh):
newContent = newContent.replace(
    /mask: E\s*\}\)/g,
    `mask: E,
                    isDeep: (w === 6 && this.getBlockGlobal(e.cx, e.cz, d, u - 1, c) === 6)
                })`
);

fs.writeFileSync('js/chunk-manager.js', newContent);
