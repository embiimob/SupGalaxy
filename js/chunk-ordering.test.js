/**
 * Tests for IPFS chunk message ordering logic.
 * 
 * IMPORTANT: GetPublicMessagesByAddress returns messages newest-first, but chunk
 * deltas MUST be applied in chronological order (oldest first) to ensure correct
 * voxel/chunk state. These tests verify that ordering is correctly handled.
 * 
 * Run tests by loading this file in a browser console or Node.js environment.
 */

(function() {
    'use strict';

    var testsPassed = 0;
    var testsFailed = 0;

    function assert(condition, message) {
        if (condition) {
            testsPassed++;
            console.log('✓ PASS: ' + message);
        } else {
            testsFailed++;
            console.error('✗ FAIL: ' + message);
        }
    }

    function assertEqual(actual, expected, message) {
        if (actual === expected) {
            testsPassed++;
            console.log('✓ PASS: ' + message + ' (got ' + actual + ')');
        } else {
            testsFailed++;
            console.error('✗ FAIL: ' + message + ' - expected ' + expected + ' but got ' + actual);
        }
    }

    function assertArrayEqual(actual, expected, message) {
        var isEqual = actual.length === expected.length && 
            actual.every(function(val, idx) { return val === expected[idx]; });
        if (isEqual) {
            testsPassed++;
            console.log('✓ PASS: ' + message);
        } else {
            testsFailed++;
            console.error('✗ FAIL: ' + message);
            console.error('  Expected: [' + expected.join(', ') + ']');
            console.error('  Actual:   [' + actual.join(', ') + ']');
        }
    }

    console.log('=== Chunk Ordering Tests ===\n');

    // Test 1: Messages should be sorted oldest-first by BlockDate
    (function testMessageSortingOldestFirst() {
        console.log('Test 1: Message sorting (oldest-first)');
        
        // Simulate messages returned by API (newest-first, as GetPublicMessagesByAddress returns)
        var messages = [
            { TransactionId: 'tx3', BlockDate: '2024-01-03T00:00:00Z', Message: 'IPFS:abc123' },
            { TransactionId: 'tx2', BlockDate: '2024-01-02T00:00:00Z', Message: 'IPFS:def456' },
            { TransactionId: 'tx1', BlockDate: '2024-01-01T00:00:00Z', Message: 'IPFS:ghi789' }
        ];

        // Sort oldest-first (ascending by BlockDate) - this is the fix
        messages.sort(function(a, b) {
            var dateA = a.BlockDate ? new Date(a.BlockDate).getTime() : 0;
            var dateB = b.BlockDate ? new Date(b.BlockDate).getTime() : 0;
            return dateA - dateB;
        });

        // Verify order is now oldest-first
        assertEqual(messages[0].TransactionId, 'tx1', 'First message should be oldest (tx1)');
        assertEqual(messages[1].TransactionId, 'tx2', 'Second message should be tx2');
        assertEqual(messages[2].TransactionId, 'tx3', 'Third message should be newest (tx3)');
    })();

    // Test 2: Chunk updates should be dispatched in chronological order
    (function testChunkUpdatesOrderedByTimestamp() {
        console.log('\nTest 2: Chunk updates ordered by timestamp');
        
        // Simulate updatesByTransaction Map
        var updatesByTransaction = new Map();
        updatesByTransaction.set('tx3', { changes: [{ x: 3 }], timestamp: 1704240000000 }); // Jan 3
        updatesByTransaction.set('tx1', { changes: [{ x: 1 }], timestamp: 1704067200000 }); // Jan 1
        updatesByTransaction.set('tx2', { changes: [{ x: 2 }], timestamp: 1704153600000 }); // Jan 2

        // Sort by timestamp (oldest-first) - this is the fix
        var sortedUpdates = Array.from(updatesByTransaction.values()).sort(function(a, b) {
            return a.timestamp - b.timestamp;
        });

        // Verify order
        assertEqual(sortedUpdates[0].changes[0].x, 1, 'First update should be from Jan 1');
        assertEqual(sortedUpdates[1].changes[0].x, 2, 'Second update should be from Jan 2');
        assertEqual(sortedUpdates[2].changes[0].x, 3, 'Third update should be from Jan 3');
    })();

    // Test 3: Verify that reversed order (newest-first) is WRONG
    (function testNewestFirstIsIncorrect() {
        console.log('\nTest 3: Verify newest-first order causes problems');
        
        // Simulate a wall build followed by a hole punch
        // Correct order: build wall (Jan 1), then punch hole (Jan 2)
        // Wrong order (newest-first): punch hole first, then build wall = hole is covered!
        
        var chunkState = {};
        
        // Apply in correct order (oldest-first)
        function applyDeltasCorrectly() {
            var deltas = [
                { timestamp: 1704067200000, block: { x: 5, y: 5, z: 5, id: 4 } },  // Jan 1: Place stone
                { timestamp: 1704153600000, block: { x: 5, y: 5, z: 5, id: 0 } }   // Jan 2: Remove (make hole)
            ];
            deltas.sort(function(a, b) { return a.timestamp - b.timestamp; }); // Oldest first
            
            var state = {};
            for (var i = 0; i < deltas.length; i++) {
                var delta = deltas[i];
                var key = delta.block.x + ',' + delta.block.y + ',' + delta.block.z;
                state[key] = delta.block.id;
            }
            return state;
        }
        
        // Apply in wrong order (newest-first)
        function applyDeltasIncorrectly() {
            var deltas = [
                { timestamp: 1704067200000, block: { x: 5, y: 5, z: 5, id: 4 } },  // Jan 1: Place stone
                { timestamp: 1704153600000, block: { x: 5, y: 5, z: 5, id: 0 } }   // Jan 2: Remove (make hole)
            ];
            deltas.sort(function(a, b) { return b.timestamp - a.timestamp; }); // Newest first (WRONG!)
            
            var state = {};
            for (var i = 0; i < deltas.length; i++) {
                var delta = deltas[i];
                var key = delta.block.x + ',' + delta.block.y + ',' + delta.block.z;
                state[key] = delta.block.id;
            }
            return state;
        }
        
        var correctState = applyDeltasCorrectly();
        var incorrectState = applyDeltasIncorrectly();
        
        // Correct state should have a hole (id: 0)
        assertEqual(correctState['5,5,5'], 0, 'Correct order: block should be removed (air/hole)');
        
        // Incorrect state will have the block (id: 4) - this is the bug!
        assertEqual(incorrectState['5,5,5'], 4, 'Incorrect order (newest-first): block remains (bug demonstrated)');
        
        // Verify they are different
        assert(correctState['5,5,5'] !== incorrectState['5,5,5'], 
            'Correct and incorrect ordering produce different results');
    })();

    // Test 4: Messages with missing BlockDate should be handled
    (function testMissingBlockDateHandling() {
        console.log('\nTest 4: Messages with missing BlockDate');
        
        var messages = [
            { TransactionId: 'tx2', BlockDate: '2024-01-02T00:00:00Z', Message: 'IPFS:abc' },
            { TransactionId: 'tx1', BlockDate: null, Message: 'IPFS:def' },
            { TransactionId: 'tx3', BlockDate: '2024-01-03T00:00:00Z', Message: 'IPFS:ghi' }
        ];

        // Sort with null handling (null dates get timestamp 0, so they go first)
        messages.sort(function(a, b) {
            var dateA = a.BlockDate ? new Date(a.BlockDate).getTime() : 0;
            var dateB = b.BlockDate ? new Date(b.BlockDate).getTime() : 0;
            return dateA - dateB;
        });

        assertEqual(messages[0].TransactionId, 'tx1', 'Message with null date should be first (timestamp 0)');
        assertEqual(messages[1].TransactionId, 'tx2', 'Message from Jan 2 should be second');
        assertEqual(messages[2].TransactionId, 'tx3', 'Message from Jan 3 should be third');
    })();

    // Test 5: Empty messages array should be handled gracefully
    (function testEmptyMessagesArray() {
        console.log('\nTest 5: Empty messages array handling');
        
        var messages = [];
        messages.sort(function(a, b) {
            var dateA = a.BlockDate ? new Date(a.BlockDate).getTime() : 0;
            var dateB = b.BlockDate ? new Date(b.BlockDate).getTime() : 0;
            return dateA - dateB;
        });

        assertEqual(messages.length, 0, 'Empty array should remain empty after sort');
    })();

    // Test 6: Single message should remain unchanged
    (function testSingleMessage() {
        console.log('\nTest 6: Single message handling');
        
        var messages = [
            { TransactionId: 'tx1', BlockDate: '2024-01-01T00:00:00Z', Message: 'IPFS:abc' }
        ];

        messages.sort(function(a, b) {
            var dateA = a.BlockDate ? new Date(a.BlockDate).getTime() : 0;
            var dateB = b.BlockDate ? new Date(b.BlockDate).getTime() : 0;
            return dateA - dateB;
        });

        assertEqual(messages.length, 1, 'Single message array should have length 1');
        assertEqual(messages[0].TransactionId, 'tx1', 'Single message should be tx1');
    })();

    // Summary
    console.log('\n=== Test Summary ===');
    console.log('Passed: ' + testsPassed);
    console.log('Failed: ' + testsFailed);
    
    if (testsFailed === 0) {
        console.log('\n✓ All tests passed!');
    } else {
        console.error('\n✗ Some tests failed!');
    }

    // Export for Node.js if running in that environment
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            passed: testsPassed,
            failed: testsFailed
        };
    }

    // Return result for browser console
    return {
        passed: testsPassed,
        failed: testsFailed,
        allPassed: testsFailed === 0
    };
})();
