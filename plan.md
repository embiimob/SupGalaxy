1. **Underwater Visual Effect**:
   - Create an HTML overlay with a light blue-green color (`#006699`) and some transparency (e.g., `rgba(0, 102, 153, 0.4)`) to simulate underwater vision.
   - Modify `js/main.js` to toggle this overlay's visibility based on `window.playerInWater`. Wait, the player's camera position might be slightly different than just checking depth of 2. `inWater` is currently true if the block at `player.y + 0.5` and `player.y + 1.5` are 6.
   - A better approach is to add a full-screen div in `index.html` (or inject it via JS) with `pointer-events: none` and `z-index: 999`, and toggle its display in the `gameLoop`.
   - I'll append an element to `document.body` dynamically in `js/main.js` and set its background color to `rgba(0, 40, 80, 0.5)` or similar. Let's see if we can do this in `js/main.js` where `window.playerInWater` is evaluated.

2. **Fix Chunk Border Edges for Water**:
   - The user mentioned that a few chunks loading in are still displaying internal edges on water blocks. This is because `getBlockGlobal` in `ChunkManager.prototype.buildChunkMesh` triggers chunk generation if the adjacent chunk hasn't been generated yet, but there's a race condition or edge case. Actually, `getBlockGlobal` explicitly calls `this.generateChunk(u)` if `!u.generated`. However, if the chunk is at the border of the currently generated map and there's asynchronous logic (which there isn't, generation is synchronous for basic terrain), it should work. But wait! There's an issue with chunk updating.
   - If Chunk A generates its mesh, and Chunk B (adjacent) hasn't generated terrain yet, `getBlockGlobal` generates Chunk B's terrain. So Chunk B now has terrain. Chunk A correctly sees Chunk B's blocks and culls faces between them.
   - However, when Chunk B later generates its mesh, maybe it sees Chunk A's terrain correctly too.
   - What if Chunk A updates its mesh before Chunk B's terrain is modified by something? Or maybe the chunk boundary check in `buildChunkMesh` doesn't cross chunk borders properly because of how water meshes are batched?
   - Actually, wait: when a block is placed or updated on a chunk boundary, does the adjacent chunk update its mesh? Yes, `chunkManager.setBlockGlobal` flags adjacent chunks to rebuild.
   - So why are there internal edges on water blocks?
   - Ah! Let me look at `buildChunkMesh` where we evaluate `S = this.getBlockGlobal(e.cx, e.cz, d + M.x, u + M.y, c + M.z);`.
   - The `M` offsets for the 6 faces are checking adjacent blocks. But what about diagonal water blocks, or maybe it's something about `w === 6 && (S === 6 || (S !== BLOCK_AIR && BLOCKS[S] && !BLOCKS[S].transparent))`?
   - Wait, `getBlockGlobal` signature is `getBlockGlobal(e, t, o, a, n)`, where `e` and `t` are `e.cx` and `e.cz`. But `o`, `a`, `n` are the *local* coordinates `d + M.x`, `u + M.y`, `c + M.z`.
   - Let's check `getBlockGlobal` implementation!
