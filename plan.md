1. **Fix Magician Stone Deduplication in `js/main.js`**
   - Use `replace_with_git_merge_diff` to modify `createMagicianStoneScreen` in `js/main.js`. After the line `cleanupMagicianStone(magicianStones[key], key);` (around line 1362), insert `delete magicianStones[key];`.

2. **Fix Calligraphy Stone Deduplication in `js/main.js`**
   - Use `replace_with_git_merge_diff` to modify `createCalligraphyStoneScreen` in `js/main.js`. After the line `cleanupCalligraphyStone(calligraphyStones[key], key);` (around line 1771), insert `delete calligraphyStones[key];`.

3. **Cleanup stones when chunks unload in `js/chunk-manager.js`**
   - Use `replace_with_git_merge_diff` to modify `ChunkManager.prototype.unloadDistantChunks` in `js/chunk-manager.js`.
   - Add logic to iterate over `magicianStones`, `calligraphyStones`, and `chests`.
   - Calculate the chunk coordinates for each entity `(Math.floor(modWrap(x, MAP_SIZE) / CHUNK_SIZE)` and check if the chunk key matches the unloaded chunk (`chunk.key`).
   - If it matches, call the appropriate cleanup function (e.g., `cleanupMagicianStone(stone, key);`) and delete it from the dictionary.

4. **Verify code changes**
   - Use `grep` or `read_file` to view the modified sections in `js/main.js` and `js/chunk-manager.js` to confirm the edits were applied successfully.

5. **Verify syntax**
   - Use `run_in_bash_session` to check the JavaScript syntax of the modified files (`node -c js/main.js js/chunk-manager.js`) to ensure no errors were introduced.

6. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

7. **Submit**
   - Submit the change with a descriptive commit message.
