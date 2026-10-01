Ok, when `chunk_generated` arrives, the chunk sets `needsRebuild = true`.
But wait, if Chunk A checks Chunk B and calls `generateChunk`, Chunk A doesn't know to rebuild itself when Chunk B finishes generating!
To fix this, when Chunk B finishes generating, we should mark its adjacent chunks for rebuild.
Let's modify `js/worker.js` where `data.type === 'chunk_generated'` is handled. We can add a simple check:
```javascript
                    chunk.needsRebuild = true;
                    // Mark adjacent chunks for rebuild if they are already generated
                    const { cx, cz } = chunk;
                    const adjacents = [
                        { dx: -1, dz: 0 },
                        { dx: 1, dz: 0 },
                        { dx: 0, dz: -1 },
                        { dx: 0, dz: 1 }
                    ];
                    for (const adj of adjacents) {
                        const nx = modWrap(cx + adj.dx, Math.floor(MAP_SIZE / CHUNK_SIZE));
                        const nz = modWrap(cz + adj.dz, Math.floor(MAP_SIZE / CHUNK_SIZE));
                        const adjChunkKey = nx + ',' + nz;
                        const adjChunk = chunkManager.chunks.get(adjChunkKey);
                        if (adjChunk && adjChunk.generated) {
                            adjChunk.needsRebuild = true;
                        }
                    }
```
Wait, we need to access `chunkManager` and `MAP_SIZE`, `CHUNK_SIZE`. Since we are in `worker.onmessage` in `worker.js` but on the MAIN THREAD (see `window.worker = new Worker(...)` string ends earlier, wait).
Wait, `worker.js` contains a huge string that is passed to the WebWorker, and then it continues with main thread logic at the bottom!
Let's verify where `data.type === 'chunk_generated'` is located.
