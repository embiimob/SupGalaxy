/**
 * Unit tests for initialization.js
 * Run with: node tests/initialization.test.js
 */

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log('✓ ' + message);
    } else {
        testsFailed++;
        console.log('✗ ' + message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        testsPassed++;
        console.log('✓ ' + message);
    } else {
        testsFailed++;
        console.log('✗ ' + message + ' (expected: ' + expected + ', got: ' + actual + ')');
    }
}

// Import the functions from joinParser.js to make them available globally
const joinParser = require('../js/joinParser.js');
global.extractJoinTokens = joinParser.extractJoinTokens;
global.parseMCWorldKeyword = joinParser.parseMCWorldKeyword;

// Mock knownWorlds
global.knownWorlds = new Map();

// Import the module
const initialization = require('../js/initialization.js');

console.log('\n=== Initialization Tests ===\n');

// Reset state before each test group
function resetState() {
    initialization.knownWorldActivity.clear();
    initialization.worldUserSuggestions.length = 0;
}

console.log('--- aggregateWorldActivity tests ---');

resetState();
const testTokens = [
    { world: 'KANYE', user: 'player1', normalized: 'KANYE@player1' },
    { world: 'KANYE', user: 'player2', normalized: 'KANYE@player2' },
    { world: 'GAME', user: 'user1', normalized: 'GAME@user1' }
];

initialization.aggregateWorldActivity(testTokens, new Date('2024-01-15'));

assert(initialization.knownWorldActivity.has('KANYE'), 'KANYE world should be tracked');
assert(initialization.knownWorldActivity.has('GAME'), 'GAME world should be tracked');
assertEqual(initialization.knownWorldActivity.get('KANYE').users.size, 2, 'KANYE should have 2 users');
assertEqual(initialization.knownWorldActivity.get('GAME').users.size, 1, 'GAME should have 1 user');
assertEqual(initialization.knownWorldActivity.get('KANYE').totalAttempts, 2, 'KANYE should have 2 attempts');

// Test aggregating more data to same world
initialization.aggregateWorldActivity([
    { world: 'KANYE', user: 'player1', normalized: 'KANYE@player1' }
], new Date('2024-01-16'));

assertEqual(initialization.knownWorldActivity.get('KANYE').totalAttempts, 3, 'KANYE should now have 3 attempts');
assertEqual(initialization.knownWorldActivity.get('KANYE').users.get('player1').attempts, 2, 'player1 should have 2 attempts');

console.log('\n--- buildSuggestionsFromActivity tests ---');

resetState();
initialization.aggregateWorldActivity([
    { world: 'ACTIVE', user: 'user1', normalized: 'ACTIVE@user1' },
    { world: 'ACTIVE', user: 'user1', normalized: 'ACTIVE@user1' },
    { world: 'ACTIVE', user: 'user2', normalized: 'ACTIVE@user2' },
    { world: 'QUIET', user: 'player', normalized: 'QUIET@player' }
], new Date());

const suggestions = initialization.buildSuggestionsFromActivity();

assert(suggestions.length >= 3, 'should have at least 3 suggestions');
assertEqual(suggestions[0].world, 'ACTIVE', 'most active world should be first');
assertEqual(suggestions[0].user, 'user1', 'most active user should be first for that world');

console.log('\n--- getKnownWorldsActivity tests ---');

resetState();
initialization.aggregateWorldActivity([
    { world: 'WORLD1', user: 'playerA', normalized: 'WORLD1@playerA' },
    { world: 'WORLD1', user: 'playerB', normalized: 'WORLD1@playerB' },
    { world: 'WORLD2', user: 'user1', normalized: 'WORLD2@user1' }
], new Date('2024-01-10'));

initialization.aggregateWorldActivity([
    { world: 'WORLD2', user: 'user2', normalized: 'WORLD2@user2' }
], new Date('2024-01-20'));

const worldActivity = initialization.getKnownWorldsActivity();

assertEqual(worldActivity.length, 2, 'should have 2 worlds');
assertEqual(worldActivity[0].world, 'WORLD2', 'more recently active world should be first');
assertEqual(worldActivity[1].world, 'WORLD1', 'older world should be second');
assertEqual(worldActivity[0].userCount, 2, 'WORLD2 should have 2 users');
assertEqual(worldActivity[1].userCount, 2, 'WORLD1 should have 2 users');

console.log('\n--- processCachedMessages tests ---');

resetState();
const mockMessages = [
    { 
        Message: 'User GAME@player1 connected successfully',
        BlockDate: '2024-01-15T10:00:00Z'
    },
    { 
        Message: 'Connection attempt from TEST@user2',
        BlockDate: '2024-01-16T10:00:00Z'
    },
    {
        Message: 'No join tokens here',
        BlockDate: '2024-01-17T10:00:00Z'
    }
];

let progressValues = [];
initialization.processCachedMessages(mockMessages, (p) => progressValues.push(p));

assert(initialization.knownWorldActivity.has('GAME'), 'GAME world should be extracted from messages');
assert(initialization.knownWorldActivity.has('TEST'), 'TEST world should be extracted from messages');
assert(progressValues.length > 0, 'progress callback should be called');
assertEqual(progressValues[progressValues.length - 1], 100, 'final progress should be 100');

console.log('\n--- getSuggestions tests ---');

resetState();
initialization.aggregateWorldActivity([
    { world: 'KANYE', user: 'player', normalized: 'KANYE@player' },
    { world: 'GAME', user: 'user', normalized: 'GAME@user' },
    { world: 'WORLD', user: 'test', normalized: 'WORLD@test' }
], new Date());
initialization.buildSuggestionsFromActivity();

let results = initialization.getSuggestions('KAN', 10);
assertEqual(results.length, 1, 'should find 1 result for "KAN"');
assertEqual(results[0].world, 'KANYE', 'should find KANYE');

results = initialization.getSuggestions('', 10);
assertEqual(results.length, 3, 'empty search should return all suggestions');

results = initialization.getSuggestions('player', 10);
assertEqual(results.length, 1, 'should find result by username');

results = initialization.getSuggestions('nonexistent', 10);
assertEqual(results.length, 0, 'should return empty for non-matching search');

console.log('\n--- runInitialization tests ---');

resetState();
global.knownWorlds = new Map([
    ['TESTWORLD', { users: new Set(['user1', 'user2']) }]
]);

let initComplete = false;
initialization.runInitialization((p) => {
    if (p === 100) initComplete = true;
}).then((result) => {
    assert(result === true, 'initialization should return true on success');
    assert(initialization.knownWorldActivity.has('TESTWORLD'), 'should import data from knownWorlds');
    assertEqual(initialization.knownWorldActivity.get('TESTWORLD').users.size, 2, 'should have 2 users from knownWorlds');
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('Passed: ' + testsPassed);
    console.log('Failed: ' + testsFailed);
    console.log('Total: ' + (testsPassed + testsFailed));
    
    if (testsFailed > 0) {
        process.exit(1);
    }
});
