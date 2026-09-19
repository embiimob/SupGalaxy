const fs = require('fs');

let content = fs.readFileSync('js/chunk-manager.js', 'utf8');

const target = `    if (parseChunkKey(o)) {
        var a = this.chunks.get(o);
        if (a) {
            for (var n of t)
                if (!(n.x < 0 || n.x >= CHUNK_SIZE || n.y < 0 || n.y >= MAX_HEIGHT || n.z < 0 || n.z >= CHUNK_SIZE)) {
                    var r = n.b === BLOCK_AIR || n.b && BLOCKS[n.b] ? n.b : 4;
                    a.set(n.x, n.y, n.z, r)
                } updateTorchRegistry(a), a.needsRebuild = !0
        }
    }`;

const replacement = `    if (parseChunkKey(o)) {
        var a = this.chunks.get(o);
        if (a) {
            const parsed = parseChunkKey(o);
            for (var n of t) {
                if (!(n.x < 0 || n.x >= CHUNK_SIZE || n.y < 0 || n.y >= MAX_HEIGHT || n.z < 0 || n.z >= CHUNK_SIZE)) {
                    var r = n.b === BLOCK_AIR || n.b && BLOCKS[n.b] ? n.b : 4;
                    a.set(n.x, n.y, n.z, r)

                    if (parsed) {
                        const worldX = parsed.cx * CHUNK_SIZE + n.x;
                        const worldY = n.y;
                        const worldZ = parsed.cz * CHUNK_SIZE + n.z;
                        const key = \`\${worldX},\${worldY},\${worldZ}\`;

                        // Cleanup entities if overwritten
                        if (n.b !== 127 && window.magicianStones && window.magicianStones[key]) {
                            if (typeof cleanupMagicianStone === 'function') {
                                cleanupMagicianStone(window.magicianStones[key], key);
                            }
                            delete window.magicianStones[key];
                        }
                        if (n.b !== 128 && window.calligraphyStones && window.calligraphyStones[key]) {
                            if (typeof cleanupCalligraphyStone === 'function') {
                                cleanupCalligraphyStone(window.calligraphyStones[key], key);
                            }
                            delete window.calligraphyStones[key];
                        }
                        if (n.b !== 131 && window.chests && window.chests[key]) {
                            if (typeof cleanupChest === 'function') {
                                cleanupChest(window.chests[key], key);
                            }
                            delete window.chests[key];
                        }
                    }
                }
            }
            updateTorchRegistry(a), a.needsRebuild = !0
        }
    }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('js/chunk-manager.js', content, 'utf8');
    console.log('Patch applied successfully.');
} else {
    console.log('Target string not found.');
}
