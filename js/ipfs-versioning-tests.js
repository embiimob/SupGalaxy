/**
 * Unit tests for IPFS truncated unix date versioning and monotonic ordering.
 * 
 * These tests can be run in the browser console after the game loads.
 * To run all tests: runIpfsVersioningTests()
 * 
 * The truncated unix date system ensures that IPFS Loading updates to blocks
 * are only accepted if they have a strictly newer timestamp, preventing
 * out-of-order updates from overwriting newer state.
 * 
 * BlockDate Field:
 * All exported JSON files include a blockDate timestamp that represents when
 * the blocks were originally created. This ensures proper ordering even when
 * files are uploaded manually or processed out of order.
 */

/**
 * Test runner that executes all IPFS versioning tests and reports results.
 */
function runIpfsVersioningTests() {
    console.log('=== IPFS Versioning Tests ===\n');
    
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (e) {
            console.error(`✗ ${name}`);
            console.error(`  Error: ${e.message}`);
            failed++;
        }
    }
    
    function assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
        }
    }
    
    function assertTrue(value, message) {
        if (!value) {
            throw new Error(message || 'Expected true but got false');
        }
    }
    
    function assertFalse(value, message) {
        if (value) {
            throw new Error(message || 'Expected false but got true');
        }
    }
    
    // Test 1: Verify IPFS epoch constant is correct
    test('IPFS epoch constant is correct (2025-09-21 00:00:00 UTC)', function() {
        const expectedEpoch = Math.floor(Date.UTC(2025, 8, 21, 0, 0, 0) / 1000);
        assertEqual(IPFS_EPOCH_2025_09_21, expectedEpoch, 'IPFS_EPOCH_2025_09_21 mismatch');
        // Verify it's September 21, 2025 (month is 0-based, so 8 = September)
        const epochDate = new Date(IPFS_EPOCH_2025_09_21 * 1000);
        assertEqual(epochDate.getUTCFullYear(), 2025, 'Year should be 2025');
        assertEqual(epochDate.getUTCMonth(), 8, 'Month should be September (8)');
        assertEqual(epochDate.getUTCDate(), 21, 'Day should be 21');
    });
    
    // Test 2: Truncated date computation from known timestamp
    test('computeIpfsTruncatedDate returns correct value for known timestamp', function() {
        // Test with a timestamp that is 1 day after the epoch
        const oneDayAfterEpoch = Date.UTC(2025, 8, 22, 0, 0, 0); // Sep 22, 2025
        const result = computeIpfsTruncatedDate(oneDayAfterEpoch);
        assertEqual(result, 86400, 'Should be 86400 seconds (1 day)');
    });
    
    // Test 3: Truncated date computation for a specific date
    test('computeIpfsTruncatedDate handles October 1, 2025', function() {
        // October 1, 2025 is 10 days after September 21
        const oct1 = Date.UTC(2025, 9, 1, 0, 0, 0); // Oct 1, 2025
        const result = computeIpfsTruncatedDate(oct1);
        const expectedSeconds = 10 * 86400; // 10 days in seconds
        assertEqual(result, expectedSeconds, `Should be ${expectedSeconds} seconds (10 days)`);
    });
    
    // Test 4: Truncated date clamped to 0 for dates before epoch
    test('computeIpfsTruncatedDate returns 0 for dates before epoch', function() {
        const beforeEpoch = Date.UTC(2025, 7, 1, 0, 0, 0); // Aug 1, 2025
        const result = computeIpfsTruncatedDate(beforeEpoch);
        assertEqual(result, 0, 'Should be clamped to 0 for dates before epoch');
    });
    
    // Test 5: Truncated date handles invalid input
    test('computeIpfsTruncatedDate returns 0 for invalid input', function() {
        assertEqual(computeIpfsTruncatedDate(null), 0, 'null should return 0');
        assertEqual(computeIpfsTruncatedDate(undefined), 0, 'undefined should return 0');
        assertEqual(computeIpfsTruncatedDate(NaN), 0, 'NaN should return 0');
        assertEqual(computeIpfsTruncatedDate('invalid'), 0, 'string should return 0');
    });
    
    // Test 6: shouldApplyIpfsUpdate accepts first update (no existing timestamp)
    test('shouldApplyIpfsUpdate accepts update when no existing timestamp', function() {
        assertTrue(shouldApplyIpfsUpdate(null, 1000), 'null existing should accept');
        assertTrue(shouldApplyIpfsUpdate(undefined, 1000), 'undefined existing should accept');
        assertTrue(shouldApplyIpfsUpdate(0, 1000), '0 existing should accept');
    });
    
    // Test 7: shouldApplyIpfsUpdate accepts strictly greater incoming timestamp
    test('shouldApplyIpfsUpdate accepts strictly greater incoming timestamp', function() {
        assertTrue(shouldApplyIpfsUpdate(1000, 1001), 'Should accept 1001 > 1000');
        assertTrue(shouldApplyIpfsUpdate(100, 200), 'Should accept 200 > 100');
        assertTrue(shouldApplyIpfsUpdate(1, 1000000), 'Should accept large difference');
    });
    
    // Test 8: shouldApplyIpfsUpdate accepts equal timestamps (allows multiple updates in same block)
    test('shouldApplyIpfsUpdate accepts equal timestamps, rejects smaller', function() {
        assertTrue(shouldApplyIpfsUpdate(1000, 1000), 'Should accept equal timestamps (same block)');
        assertFalse(shouldApplyIpfsUpdate(1000, 999), 'Should reject smaller incoming');
        assertFalse(shouldApplyIpfsUpdate(1000, 1), 'Should reject much smaller incoming');
    });
    
    // Test 9: shouldApplyIpfsUpdate rejects invalid incoming timestamp
    test('shouldApplyIpfsUpdate rejects invalid incoming timestamp', function() {
        assertFalse(shouldApplyIpfsUpdate(1000, null), 'null incoming should reject');
        assertFalse(shouldApplyIpfsUpdate(1000, undefined), 'undefined incoming should reject');
        assertFalse(shouldApplyIpfsUpdate(1000, 0), '0 incoming should reject');
        assertFalse(shouldApplyIpfsUpdate(1000, -1), 'negative incoming should reject');
    });
    
    // Test 10: Integration test - monotonic ordering scenario
    test('Integration: Monotonic ordering prevents out-of-order updates', function() {
        // Simulate a block that receives updates
        let storedTimestamp = 0;
        
        // First update (day 1)
        const day1 = computeIpfsTruncatedDate(Date.UTC(2025, 9, 1, 0, 0, 0));
        assertTrue(shouldApplyIpfsUpdate(storedTimestamp, day1), 'Day 1 update should apply');
        storedTimestamp = day1; // Simulate storing
        
        // Second update arrives out of order (actually from day 0 - before)
        const day0 = computeIpfsTruncatedDate(Date.UTC(2025, 8, 30, 0, 0, 0));
        assertFalse(shouldApplyIpfsUpdate(storedTimestamp, day0), 'Day 0 update should be rejected');
        
        // Third update (day 2 - newer)
        const day2 = computeIpfsTruncatedDate(Date.UTC(2025, 9, 2, 0, 0, 0));
        assertTrue(shouldApplyIpfsUpdate(storedTimestamp, day2), 'Day 2 update should apply');
        storedTimestamp = day2;
        
        // Fourth update arrives (day 1 again - should be rejected)
        assertFalse(shouldApplyIpfsUpdate(storedTimestamp, day1), 'Repeat day 1 should be rejected');
    });
    
    // Test 11: Multi-edit scenario - three files with different BlockDates
    test('Integration: Three edits processed - middle edit with older BlockDate should NOT override newer', function() {
        // Simulates the user's test scenario:
        // - Edit 1: Day 5 (newer)
        // - Edit 2: Day 3 (older - should NOT win)
        // - Edit 3: Day 7 (newest - should win)
        
        let blockTimestamp = 0;
        
        // Process Edit 1 first (Day 5)
        const edit1Date = computeIpfsTruncatedDate(Date.UTC(2025, 9, 5, 0, 0, 0));
        assertTrue(shouldApplyIpfsUpdate(blockTimestamp, edit1Date), 'Edit 1 (Day 5) should apply');
        blockTimestamp = edit1Date;
        
        // Process Edit 2 (Day 3 - OLDER than Edit 1)
        const edit2Date = computeIpfsTruncatedDate(Date.UTC(2025, 9, 3, 0, 0, 0));
        assertFalse(shouldApplyIpfsUpdate(blockTimestamp, edit2Date), 'Edit 2 (Day 3) should be REJECTED - older than current');
        // blockTimestamp stays as edit1Date because edit2 was rejected
        
        // Process Edit 3 (Day 7 - NEWER than all)
        const edit3Date = computeIpfsTruncatedDate(Date.UTC(2025, 9, 7, 0, 0, 0));
        assertTrue(shouldApplyIpfsUpdate(blockTimestamp, edit3Date), 'Edit 3 (Day 7) should apply - newest');
        blockTimestamp = edit3Date;
        
        // Verify final state is from Edit 3 (newest)
        assertEqual(blockTimestamp, edit3Date, 'Final block timestamp should be from Edit 3 (Day 7)');
    });
    
    console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
    return { passed, failed };
}

// Make the test runner available globally
if (typeof window !== 'undefined') {
    window.runIpfsVersioningTests = runIpfsVersioningTests;
}
