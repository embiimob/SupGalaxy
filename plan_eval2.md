Aha! `generateChunk` is ASYNCHRONOUS!
```javascript
}, ChunkManager.prototype.generateChunk = function (e) {
    window.lastChunkLoadTime = Date.now();
    e.generating || e.generated || (e.generating = !0, worker.postMessage({
        type: "generate_chunk",
        key: e.key
    }))
}
```
If `getBlockGlobal` calls `generateChunk`, it just sends a message to the worker. `u.get(d, a, c)` will return `BLOCK_AIR` (0) because the chunk hasn't been populated yet!
Thus, if chunk A is generating its mesh and checks chunk B (which is not generated yet), chunk B looks like empty air. So chunk A renders the water border.
Later, chunk B receives its data from the worker and builds its mesh. But chunk A has already built its mesh and *doesn't know* it needs to update just because chunk B loaded!

Wait! Does chunk A rebuild when chunk B arrives?
Let's see how chunk arrival is handled.
