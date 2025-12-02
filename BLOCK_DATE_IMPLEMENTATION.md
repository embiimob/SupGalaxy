# Block Date Handling - Corrected Implementation

## Understanding the System

### Two Paths for Loading Chunks

1. **Keyword Search (Primary Method for Published Chunks)**
   - User publishes chunk to blockchain via IPFS
   - Transaction gets a BlockDate from the blockchain
   - Other users load chunk by keyword search
   - `GetPublicMessagesByAddress` returns the BlockDate from transaction
   - This BlockDate is used for monotonic ordering

2. **Manual File Upload (Local-Only Changes)**
   - User exports session locally to JSON file
   - User uploads file via drag-and-drop
   - Uses current timestamp as BlockDate (local changes only)
   - These are NOT published to blockchain yet

## Key Principles

### BlockDate Source
- **Published chunks**: BlockDate comes from blockchain transaction (via GetPublicMessagesByAddress)
- **Local uploads**: Use current time (these are unpublished local changes)
- **JSON files do NOT contain blockDate** - it's obtained when publishing to blockchain

### Monotonic Ordering
- Truncated unix date = seconds since Sept 21, 2025 UTC
- Computed from BlockDate: `(blockTimestampMs / 1000) - IPFS_EPOCH_2025_09_21`
- **Larger numbers = newer dates = higher priority**
- Update applied only if: `incomingTruncated > existingTruncated`

### Implementation

**Worker.js (Keyword Search):**
```javascript
// Line 807: Extract BlockDate from blockchain transaction
timestamp: new Date(msg.BlockDate).getTime()

// Line 840: Send to main thread
self.postMessage({ type: "chunk_updates", updates: [{ timestamp: ... }] })
```

**Main.js (Manual Upload):**
```javascript
// Line 354: Use current time for local-only changes
const blockDate = p; // p = Date.now()
console.log(`[IPFS Load] Manual file upload - using current time as BlockDate`)
```

**Chunk-manager.js (Apply Updates):**
```javascript
// Line 666: BlockDate from either source
const blockDate = o; // From worker (blockchain) or main (current time)

// Line 727: Compute truncated date
const incomingTruncatedDate = computeIpfsTruncatedDate(blockDate);

// Line 750: Check if update should apply
if (shouldApplyIpfsUpdate(existingTruncatedDate, incomingTruncatedDate)) {
    // Apply - incoming is newer
}
```

## What Changed

### Removed
- ❌ `blockDate` field in exported JSON files (was incorrect - captured export time not blockchain time)
- ❌ Complex fallback logic trying to extract blockDate from files
- ❌ Outdated documentation about embedding blockDate in files

### Kept
- ✅ Monotonic ordering logic (`shouldApplyIpfsUpdate`)
- ✅ Truncated unix date computation
- ✅ MS_PER_DAY constant
- ✅ Debug logging
- ✅ Integration tests

### Clarified
- Manual file uploads use current time (for local-only changes)
- Published chunks get BlockDate from blockchain transaction
- Larger truncated dates (newer) override smaller (older)

## Testing

Run in browser console:
```javascript
runIpfsVersioningTests()
```

Expected: 11 tests pass

## Flow Example

1. User creates blocks in world → exports to `my-world.json`
2. User publishes `my-world.json` to blockchain via IPFS
   - Transaction confirmed → gets BlockDate (e.g., Oct 5, 2025)
3. Other user searches by keyword
   - Worker calls GetPublicMessagesByAddress
   - Receives BlockDate from transaction (Oct 5, 2025)
   - Computes truncated date: `(Oct5_timestamp / 1000) - epoch`
4. Later, someone publishes newer version
   - Transaction confirmed → gets BlockDate (e.g., Oct 10, 2025)
   - Truncated date is larger → overrides Oct 5 version
5. If someone tries to publish old version
   - Transaction confirmed → gets BlockDate (e.g., Oct 1, 2025)
   - Truncated date is smaller → rejected by monotonic ordering

## Verification

Check worker.js processes BlockDate correctly:
```
[Worker] Processing chunk message with BlockDate: 2025-10-05
[ChunkManager] applyChunkUpdates: BlockDate=2025-10-05T12:00:00.000Z
[IPFS Ordering] Incoming truncated: 1234567, Existing: 1230000 -> ACCEPT
```

Check manual uploads use current time:
```
[IPFS Load] Manual file upload - using current time as BlockDate: 2025-12-02T19:00:00.000Z
```
