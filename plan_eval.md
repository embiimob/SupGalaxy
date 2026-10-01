In `ChunkManager.prototype.getBlockGlobal`:
```javascript
}, ChunkManager.prototype.getBlockGlobal = function (e, t, o, a, n) {
    Math.floor(MAP_SIZE / CHUNK_SIZE);
    var r = modWrap(e * CHUNK_SIZE + o, MAP_SIZE),
        s = modWrap(t * CHUNK_SIZE + n, MAP_SIZE),
        i = Math.floor(r / CHUNK_SIZE),
        l = Math.floor(s / CHUNK_SIZE),
        d = modWrap(r, CHUNK_SIZE),
        c = modWrap(s, CHUNK_SIZE),
        u = this.getChunk(i, l);
    return u.generated || this.generateChunk(u), u.get(d, a, c)
}
```
If `o` is `d + M.x`, where `d` is local `x` (0 to 31) and `M.x` is `-1`, `o` can be `-1`.
Wait! `e * CHUNK_SIZE + o` would be `cx * 32 + (-1)`. Since we're using `modWrap` for `r = modWrap(e * CHUNK_SIZE + o, MAP_SIZE)`, `r` would correctly wrap.
`i = Math.floor(r / CHUNK_SIZE)`. For `r = -1`, `modWrap` returns `MAP_SIZE - 1`. `Math.floor((MAP_SIZE - 1) / 32)` gets the last chunk index. This looks correct.
So what is wrong?
Ah, if `u.generated` is false, it calls `this.generateChunk(u)`. However, terrain generation inside `buildChunkMesh` works.
BUT! Look at how water blocks are added during `generateChunk` (via worker or local). They are probably added via worker.
Wait. The worker parses chunk terrain. `generateChunk` locally might just generate the *base* chunk (empty?) or trigger generation, but the worker actually populates it asynchronously!
Let me check `ChunkManager.prototype.generateChunk` and `js/worker.js`.
