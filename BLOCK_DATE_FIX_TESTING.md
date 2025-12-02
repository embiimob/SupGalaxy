# Block Date Handling Fix - Testing Guide

## Issue Summary
Previously, when IPFS files were manually uploaded via drag-and-drop or file selection, the system incorrectly used the upload timestamp instead of the original BlockDate from the blockchain transaction. This caused older edits to override newer ones when processed out of order.

## What Was Fixed

### 1. Manual File Upload (main.js)
**Before:** Used `(new Date).toISOString()` as BlockDate
```javascript
applySaveFile(JSON.parse(e.target.result), "local", (new Date).toISOString())
```

**After:** Uses `blockDate` from file, with fallback
```javascript
applySaveFile(JSON.parse(e.target.result), "local", null)
```

### 2. File Export (main.js)
**Before:** No `blockDate` field in exported JSON
```javascript
var e = {
    world: worldName,
    savedAt: (new Date).toISOString(),
    deltas: [],
    ...
}
```

**After:** Includes `blockDate` timestamp
```javascript
var e = {
    world: worldName,
    savedAt: (new Date).toISOString(),
    blockDate: Date.now(),
    deltas: [],
    ...
}
```

### 3. File Loading (main.js - applySaveFile)
**Before:** Always used parameter `o` as BlockDate
```javascript
const blockDate = new Date(o).getTime();
```

**After:** Uses blockDate from file first, then parameter, then fallback
```javascript
const blockDate = e.blockDate || (o ? new Date(o).getTime() : p);
```

## Test Scenarios

### Scenario 1: Three Edits Out of Order (User's Original Issue)

**Setup:**
1. Create Edit 1 on Day 5 (Oct 5, 2025) - Save to file1.json
2. Create Edit 2 on Day 3 (Oct 3, 2025) - Save to file2.json  
3. Create Edit 3 on Day 7 (Oct 7, 2025) - Save to file3.json

**Test Procedure:**
1. Load file1.json (Day 5) - Should apply
2. Load file2.json (Day 3) - Should be REJECTED (older than Day 5)
3. Load file3.json (Day 7) - Should apply (newer than Day 5)

**Expected Result:**
- Edit 2 (Day 3) should NOT override Edit 1 (Day 5)
- Only Edit 3 (Day 7) should be the final state
- Console should show: `[IPFS Ordering] Skipped X block update(s) ... incoming truncated date not newer than existing`

**Verification:**
```javascript
// In browser console after loading files:
runIpfsVersioningTests()  // Should show 11 passed, 0 failed
```

### Scenario 2: Keyword Chunk Loading vs Manual Upload

**Test A - Keyword Loading (ALREADY WORKING):**
1. Publish chunks to blockchain via IPFS with BlockDate
2. Game loads chunks by keyword search
3. BlockDate comes from `msg.BlockDate` in GetPublicMessagesByAddress
4. Console shows: `[ChunkManager] applyChunkUpdates: BlockDate=2025-10-...`

**Test B - Manual File Upload (NOW FIXED):**
1. Download session JSON file (includes blockDate field)
2. Drag-and-drop file onto minimap
3. BlockDate comes from file's `blockDate` field
4. Console shows: `[IPFS Load] BlockDate: ..., Source: file`

### Scenario 3: Backward Compatibility

**Test with Legacy File (no blockDate field):**
1. Use old JSON file without `blockDate` field
2. Upload via drag-and-drop
3. Should fall back to current timestamp
4. Console shows: `[IPFS Load] BlockDate: ..., Source: fallback`

## Debugging

### Console Logs to Monitor

**When loading files:**
```
[IPFS Load] BlockDate: 2025-10-05T12:00:00.000Z, Age: 30 days, Source: file
```

**When applying chunks:**
```
[ChunkManager] applyChunkUpdates: BlockDate=2025-10-05T12:00:00.000Z, Address=tb1..., TxId=abc123
```

**When skipping older updates:**
```
[IPFS Ordering] Skipped 5 block update(s) in chunk KANYE:10:20: incoming truncated date (864000) not newer than existing
```

### Manual Verification Steps

1. **Check exported files have blockDate:**
```javascript
// Download a session file, open in text editor
// Verify it contains: "blockDate": 1728043200000
```

2. **Verify truncated dates are stored:**
```javascript
// In browser console:
const worldState = getCurrentWorldState();
console.log(worldState.ipfsTruncatedDates);
// Should show Map with entries like: "100,50,200" => 864000
```

3. **Test monotonic ordering:**
```javascript
// Create test scenario in console:
const day1 = computeIpfsTruncatedDate(Date.UTC(2025, 9, 1));
const day2 = computeIpfsTruncatedDate(Date.UTC(2025, 9, 2));
console.log(shouldApplyIpfsUpdate(day2, day1)); // Should be false
console.log(shouldApplyIpfsUpdate(day1, day2)); // Should be true
```

## Expected Behavior After Fix

### ✅ Correct Behaviors
- Exported files include `blockDate` timestamp
- Manual file uploads use blockDate from file
- Keyword chunk loading uses BlockDate from blockchain transaction
- Older edits are rejected when a newer edit exists
- Monotonic ordering prevents out-of-order updates

### ❌ Previous Bugs (Now Fixed)
- ~~Manual uploads used current time instead of file's blockDate~~
- ~~Exported files missing blockDate field~~
- ~~Processing order determined priority instead of BlockDate~~

## Files Modified
- `/js/main.js` - Lines 3026, 354-360, 4866, 4890
- `/js/chunk-manager.js` - Line 668 (logging)
- `/js/ipfs-versioning-tests.js` - Added Test 11
- `/README.md` - Updated documentation

## Related Functions
- `computeIpfsTruncatedDate()` - Converts BlockDate to truncated unix date
- `shouldApplyIpfsUpdate()` - Checks if update should be applied
- `applyChunkUpdates()` - Applies chunk changes with BlockDate validation
- `applySaveFile()` - Loads saved files with proper BlockDate handling
