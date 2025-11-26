/**
 * Unit tests for joinParser.js
 * Run with: node tests/joinParser.test.js
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

function assertNull(value, message) {
    assert(value === null, message);
}

function assertNotNull(value, message) {
    assert(value !== null, message);
}

// Import the module
const joinParser = require('../js/joinParser.js');
const {
    parseJoinString,
    normalizeJoinString,
    extractJoinTokens,
    parseMCWorldKeyword
} = joinParser;

console.log('\n=== Join Parser Tests ===\n');

// Test parseJoinString
console.log('--- parseJoinString tests ---');

// Test 1: Valid world@user format
let result = parseJoinString('KANYE@player1');
assertNotNull(result, 'parseJoinString should return object for valid world@user');
assertEqual(result.world, 'KANYE', 'world should be extracted correctly');
assertEqual(result.user, 'player1', 'user should be extracted correctly');
assertEqual(result.normalized, 'KANYE@player1', 'normalized should be world@user format');

// Test 2: Valid user@world format (longer user, shorter world)
result = parseJoinString('longerusername@MYWORLD');
assertNotNull(result, 'parseJoinString should return object for valid user@world');
assertEqual(result.world, 'MYWORLD', 'world should be extracted from second part');
assertEqual(result.user, 'longerusername', 'user should be extracted from first part');
assertEqual(result.normalized, 'MYWORLD@longerusername', 'normalized should be world@user format');

// Test 3: Both short (ambiguous - default to world@user)
result = parseJoinString('ABC@DEF');
assertNotNull(result, 'parseJoinString should handle ambiguous short strings');
assertEqual(result.world, 'ABC', 'first part treated as world when ambiguous');
assertEqual(result.user, 'DEF', 'second part treated as user when ambiguous');
assertEqual(result.normalized, 'ABC@DEF', 'normalized should preserve world@user format');

// Test 4: Null/invalid inputs
assertNull(parseJoinString(null), 'parseJoinString should return null for null input');
assertNull(parseJoinString(''), 'parseJoinString should return null for empty string');
assertNull(parseJoinString('noatsign'), 'parseJoinString should return null for string without @');
assertNull(parseJoinString('@user'), 'parseJoinString should return null for missing first part');
assertNull(parseJoinString('world@'), 'parseJoinString should return null for missing second part');
assertNull(parseJoinString(123), 'parseJoinString should return null for non-string input');

// Test 5: Special characters are stripped
result = parseJoinString('WOR LD!@us-er_1');
assertNotNull(result, 'parseJoinString should handle strings with special chars');
assertEqual(result.world, 'WORLD', 'special chars should be stripped from world');
assertEqual(result.user, 'user1', 'special chars should be stripped from user');

// Test 6: Length limits
result = parseJoinString('VERYLONGWORLDNAME@VERYLONGUSERNAMETHATEXCEEDSLIMIT');
assertNotNull(result, 'parseJoinString should truncate long names');
assert(result.world.length <= 8, 'world should be max 8 chars');
assert(result.user.length <= 20, 'user should be max 20 chars');

console.log('\n--- normalizeJoinString tests ---');

// Test normalizeJoinString
assertEqual(normalizeJoinString('KANYE@player'), 'KANYE@player', 'normalizeJoinString should return normalized string');
assertNull(normalizeJoinString('invalid'), 'normalizeJoinString should return null for invalid input');
assertEqual(normalizeJoinString('longeruser@WORLD'), 'WORLD@longeruser', 'normalizeJoinString should swap user@world to world@user');

console.log('\n--- extractJoinTokens tests ---');

// Test extractJoinTokens
let tokens = extractJoinTokens('User connected to WORLD@player and another GAME@user2');
assertEqual(tokens.length, 2, 'extractJoinTokens should find 2 tokens');
assertEqual(tokens[0].normalized, 'WORLD@player', 'first token should be normalized');
assertEqual(tokens[1].normalized, 'GAME@user2', 'second token should be normalized');

// Test extractJoinTokens with duplicates
tokens = extractJoinTokens('WORLD@user WORLD@user WORLD@user');
assertEqual(tokens.length, 1, 'extractJoinTokens should deduplicate tokens');

// Test extractJoinTokens with empty/null
assertEqual(extractJoinTokens(null).length, 0, 'extractJoinTokens should return empty array for null');
assertEqual(extractJoinTokens('').length, 0, 'extractJoinTokens should return empty array for empty string');
assertEqual(extractJoinTokens('no tokens here').length, 0, 'extractJoinTokens should return empty array when no tokens');

console.log('\n--- parseMCWorldKeyword tests ---');

// Test parseMCWorldKeyword
result = parseMCWorldKeyword('MCWorld@KANYE');
assertNotNull(result, 'parseMCWorldKeyword should parse MCWorld keywords');
assertEqual(result.world, 'KANYE', 'world should be extracted');
assertEqual(result.type, 'MCWorld', 'type should be MCWorld');

result = parseMCWorldKeyword('MCUserJoin@MYWORLD');
assertNotNull(result, 'parseMCWorldKeyword should parse MCUserJoin keywords');
assertEqual(result.world, 'MYWORLD', 'world should be extracted from MCUserJoin');
assertEqual(result.type, 'MCUserJoin', 'type should be MCUserJoin');

result = parseMCWorldKeyword('MCServerJoin@GAME');
assertNotNull(result, 'parseMCWorldKeyword should parse MCServerJoin keywords');
assertEqual(result.world, 'GAME', 'world should be extracted from MCServerJoin');
assertEqual(result.type, 'MCServerJoin', 'type should be MCServerJoin');

assertNull(parseMCWorldKeyword('InvalidKeyword@world'), 'parseMCWorldKeyword should return null for invalid prefixes');
assertNull(parseMCWorldKeyword(null), 'parseMCWorldKeyword should return null for null input');
assertNull(parseMCWorldKeyword(''), 'parseMCWorldKeyword should return null for empty string');

// Summary
console.log('\n=== Test Summary ===');
console.log('Passed: ' + testsPassed);
console.log('Failed: ' + testsFailed);
console.log('Total: ' + (testsPassed + testsFailed));

if (testsFailed > 0) {
    process.exit(1);
}
