/**
 * IPFS Chunk Ordering Tests
 * 
 * These tests verify that IPFS chunk updates are applied in the correct order
 * based on their block date, even when updates arrive out of order.
 * 
 * Run with: node tests/chunk-ordering.test.js
 */

// Mock constants
const CHUNK_SIZE = 16;
const MAX_HEIGHT = 256;
const BLOCK_AIR = 0;
const BLOCKS = {
    1: { name: 'Stone' },
    2: { name: 'Grass' },
    3: { name: 'Dirt' }
};

// Mock data structure for IPFS chunk message history
const IPFS_CHUNK_MESSAGE_HISTORY = new Map();

// Mock chunk data
const mockChunks = new Map();

/**
 * Creates a mock chunk for testing
 */
function createMockChunk(chunkKey) {
    const data = new Array(CHUNK_SIZE * MAX_HEIGHT * CHUNK_SIZE).fill(BLOCK_AIR);
    const chunk = {
        key: chunkKey,
        data: data,
        get: function(x, y, z) {
            return this.data[y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x];
        },
        set: function(x, y, z, blockId) {
            this.data[y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x] = blockId;
        }
    };
    mockChunks.set(chunkKey, chunk);
    return chunk;
}

/**
 * Applies a single block change to a chunk
 */
function applySingleBlockChange(chunkKey, change) {
    const chunk = mockChunks.get(chunkKey);
    if (!chunk) return;
    
    if (change.x < 0 || change.x >= CHUNK_SIZE || 
        change.y < 0 || change.y >= MAX_HEIGHT || 
        change.z < 0 || change.z >= CHUNK_SIZE) {
        return;
    }
    
    const blockId = change.b === BLOCK_AIR || (change.b && BLOCKS[change.b]) ? change.b : 1;
    chunk.set(change.x, change.y, change.z, blockId);
}

/**
 * Reprocesses all IPFS updates for a chunk in sorted order by timestamp.
 */
function reprocessChunkUpdatesInOrder(chunkKey) {
    if (!IPFS_CHUNK_MESSAGE_HISTORY.has(chunkKey)) return;
    
    const history = IPFS_CHUNK_MESSAGE_HISTORY.get(chunkKey);
    if (history.length === 0) return;
    
    // Sort by timestamp (ascending order - oldest first)
    history.sort((a, b) => a.timestamp - b.timestamp);
    
    const chunk = mockChunks.get(chunkKey);
    if (!chunk) return;
    
    // Track which block positions have been set, with their final state
    const blockStates = new Map();
    
    // Process all changes in timestamp order
    for (const update of history) {
        for (const change of update.changes) {
            const posKey = `${change.x},${change.y},${change.z}`;
            blockStates.set(posKey, { b: change.b });
        }
        update.applied = true;
    }
    
    // Apply the final computed state to the chunk
    for (const [posKey, state] of blockStates) {
        const [x, y, z] = posKey.split(',').map(Number);
        applySingleBlockChange(chunkKey, { x, y, z, b: state.b });
    }
}

/**
 * Adds an IPFS update to the chunk's message history and checks for out-of-order arrivals.
 * Returns an object with isDuplicate and isOutOfOrder flags.
 */
function addToChunkHistory(chunkKey, timestamp, transactionId, changes, address) {
    const normalized = chunkKey.replace(/^#/, "");
    
    if (!IPFS_CHUNK_MESSAGE_HISTORY.has(normalized)) {
        IPFS_CHUNK_MESSAGE_HISTORY.set(normalized, []);
    }
    
    const history = IPFS_CHUNK_MESSAGE_HISTORY.get(normalized);
    
    // Check for duplicates
    if (history.some(h => h.transactionId === transactionId)) {
        return { isDuplicate: true, isOutOfOrder: false };
    }
    
    // Find the latest timestamp in the history
    let latestTimestamp = 0;
    for (const h of history) {
        if (h.timestamp > latestTimestamp) {
            latestTimestamp = h.timestamp;
        }
    }
    
    // Check if this update is out of order
    const isOutOfOrder = history.length > 0 && timestamp < latestTimestamp;
    
    // Add the new update to history
    history.push({
        timestamp,
        transactionId,
        changes: changes.map(c => ({ ...c })),
        address,
        applied: false
    });
    
    if (isOutOfOrder) {
        reprocessChunkUpdatesInOrder(normalized);
        return { isDuplicate: false, isOutOfOrder: true };
    }
    
    return { isDuplicate: false, isOutOfOrder: false };
}

/**
 * Simulates applying chunk updates (simplified version)
 */
function applyChunkUpdate(chunkKey, timestamp, transactionId, changes) {
    const normalized = chunkKey.replace(/^#/, "");
    
    // Ensure chunk exists
    if (!mockChunks.has(normalized)) {
        createMockChunk(normalized);
    }
    
    const result = addToChunkHistory(normalized, timestamp, transactionId, changes, 'test_address');
    
    if (result.isDuplicate) {
        // Duplicate transaction - skip processing entirely
        return;
    }
    
    if (!result.isOutOfOrder) {
        // Apply changes normally
        const history = IPFS_CHUNK_MESSAGE_HISTORY.get(normalized);
        if (history) {
            const entry = history.find(h => h.transactionId === transactionId);
            if (entry) entry.applied = true;
        }
        
        for (const change of changes) {
            applySingleBlockChange(normalized, change);
        }
    }
}

/**
 * Test framework
 */
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function runTest(name, testFn) {
    totalTests++;
    
    try {
        // Reset state before each test
        IPFS_CHUNK_MESSAGE_HISTORY.clear();
        mockChunks.clear();
        
        testFn();
        
        passedTests++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        failedTests.push({ name, error: error.message });
        console.log(`  ✗ ${name}: ${error.message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}

/**
 * Test cases
 */
console.log('\nIPFS Chunk Ordering Tests\n' + '='.repeat(40));

// Test 1: Updates in order should be applied correctly
runTest('Updates in order are applied correctly', () => {
    const chunkKey = 'world:0:0';
    
    // First update: place a stone block
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 1 } // Stone
    ]);
    
    // Second update: change to air (remove block)
    applyChunkUpdate(chunkKey, 2000, 'tx2', [
        { x: 5, y: 10, z: 5, b: BLOCK_AIR }
    ]);
    
    const chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(5, 10, 5), BLOCK_AIR, 'Block should be air after second update');
});

// Test 2: Out-of-order updates should be reprocessed correctly
runTest('Out-of-order updates are reprocessed correctly', () => {
    const chunkKey = 'world:0:0';
    
    // Later update arrives first: set to air
    applyChunkUpdate(chunkKey, 2000, 'tx2', [
        { x: 5, y: 10, z: 5, b: BLOCK_AIR }
    ]);
    
    // Earlier update arrives second: set to stone
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 1 } // Stone
    ]);
    
    // After reprocessing, the final state should be air (latest timestamp wins)
    const chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(5, 10, 5), BLOCK_AIR, 'Block should be air after reprocessing (latest timestamp wins)');
});

// Test 3: Multiple out-of-order updates should be sorted correctly
runTest('Multiple out-of-order updates are sorted correctly', () => {
    const chunkKey = 'world:0:0';
    
    // Third update arrives first
    applyChunkUpdate(chunkKey, 3000, 'tx3', [
        { x: 5, y: 10, z: 5, b: 3 } // Dirt
    ]);
    
    // First update arrives second
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 1 } // Stone
    ]);
    
    // Second update arrives third
    applyChunkUpdate(chunkKey, 2000, 'tx2', [
        { x: 5, y: 10, z: 5, b: 2 } // Grass
    ]);
    
    // After reprocessing, should be Dirt (timestamp 3000, the latest)
    const chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(5, 10, 5), 3, 'Block should be Dirt (latest timestamp)');
});

// Test 4: Different positions in same chunk should be handled independently
runTest('Different positions in same chunk are handled correctly', () => {
    const chunkKey = 'world:0:0';
    
    // Update position A with later timestamp first
    applyChunkUpdate(chunkKey, 2000, 'tx2', [
        { x: 5, y: 10, z: 5, b: BLOCK_AIR }
    ]);
    
    // Update position B
    applyChunkUpdate(chunkKey, 1500, 'tx_b', [
        { x: 6, y: 10, z: 5, b: 2 } // Grass
    ]);
    
    // Update position A with earlier timestamp (triggers reprocessing)
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 1 } // Stone
    ]);
    
    const chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(5, 10, 5), BLOCK_AIR, 'Position A should be air (latest timestamp)');
    assertEqual(chunk.get(6, 10, 5), 2, 'Position B should be Grass');
});

// Test 5: Duplicate transactions should be ignored
runTest('Duplicate transactions are ignored', () => {
    const chunkKey = 'world:0:0';
    
    // First update
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 1 } // Stone
    ]);
    
    // Duplicate with same transaction ID (different changes should be ignored)
    applyChunkUpdate(chunkKey, 1000, 'tx1', [
        { x: 5, y: 10, z: 5, b: 2 } // Grass
    ]);
    
    const chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(5, 10, 5), 1, 'Block should be Stone (duplicate ignored)');
    
    const history = IPFS_CHUNK_MESSAGE_HISTORY.get(chunkKey);
    assertEqual(history.length, 1, 'History should have only 1 entry');
});

// Test 6: Air block update at latest timestamp should not be overwritten
runTest('Air block at latest timestamp is not overwritten by earlier stone block', () => {
    const chunkKey = 'world:0:0';
    
    // This is the specific bug scenario from the issue:
    // An air block update (setting block to air) at a later timestamp
    // is being overwritten by an earlier block update that arrives afterward.
    
    // Later update (air) arrives first
    applyChunkUpdate(chunkKey, 5000, 'tx_air', [
        { x: 8, y: 20, z: 8, b: BLOCK_AIR }
    ]);
    
    // Verify air is applied
    let chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(8, 20, 8), BLOCK_AIR, 'Block should be air initially');
    
    // Earlier update (stone) arrives second - this should trigger reprocessing
    // but the final state should still be air since the air update is newer
    applyChunkUpdate(chunkKey, 3000, 'tx_stone', [
        { x: 8, y: 20, z: 8, b: 1 } // Stone
    ]);
    
    chunk = mockChunks.get(chunkKey);
    assertEqual(chunk.get(8, 20, 8), BLOCK_AIR, 'Block should still be air after out-of-order stone arrives');
});

// Test 7: Complex scenario with multiple blocks and out-of-order updates
runTest('Complex scenario with multiple blocks and out-of-order updates', () => {
    const chunkKey = 'world:1:1';
    
    // Simulate a building scenario where blocks are placed and then some removed
    
    // Place initial blocks (timestamp 1000)
    applyChunkUpdate(chunkKey, 1000, 'tx_build', [
        { x: 0, y: 0, z: 0, b: 1 },  // Foundation stone
        { x: 1, y: 0, z: 0, b: 1 },
        { x: 0, y: 1, z: 0, b: 1 },  // Wall
        { x: 1, y: 1, z: 0, b: 1 }
    ]);
    
    // Remove a block to make a door (timestamp 3000)
    applyChunkUpdate(chunkKey, 3000, 'tx_door', [
        { x: 0, y: 1, z: 0, b: BLOCK_AIR }  // Door opening
    ]);
    
    // Add roof (timestamp 2000) - arrives out of order
    applyChunkUpdate(chunkKey, 2000, 'tx_roof', [
        { x: 0, y: 2, z: 0, b: 2 },  // Grass roof
        { x: 1, y: 2, z: 0, b: 2 }
    ]);
    
    const chunk = mockChunks.get(chunkKey);
    
    // Foundation should be intact
    assertEqual(chunk.get(0, 0, 0), 1, 'Foundation block 0 should be stone');
    assertEqual(chunk.get(1, 0, 0), 1, 'Foundation block 1 should be stone');
    
    // Door opening should be air (latest update for that position)
    assertEqual(chunk.get(0, 1, 0), BLOCK_AIR, 'Door opening should be air');
    
    // Other wall block should be stone
    assertEqual(chunk.get(1, 1, 0), 1, 'Wall block should be stone');
    
    // Roof should be grass
    assertEqual(chunk.get(0, 2, 0), 2, 'Roof block 0 should be grass');
    assertEqual(chunk.get(1, 2, 0), 2, 'Roof block 1 should be grass');
});

// Display summary
console.log('\n' + '='.repeat(40));
if (passedTests === totalTests) {
    console.log(`\n✓ All ${totalTests} tests passed!\n`);
    process.exit(0);
} else {
    console.log(`\n✗ ${passedTests}/${totalTests} tests passed. ${totalTests - passedTests} failed.\n`);
    console.log('Failed tests:');
    failedTests.forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    console.log('');
    process.exit(1);
}
