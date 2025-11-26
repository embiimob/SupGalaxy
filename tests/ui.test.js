/**
 * UI tests for main screen components
 * Run with: node tests/ui.test.js
 * 
 * Note: These are simplified tests that verify the HTML structure
 * For full UI testing, consider using a browser-based testing framework
 */

const fs = require('fs');
const path = require('path');

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

console.log('\n=== UI Structure Tests ===\n');

// Read the HTML file
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('--- Announce Server Button Removal Tests ---');

// Test 1: Announce Server button should NOT be present
assert(!htmlContent.includes('id="announceLoginBtn"'), 'announceLoginBtn should not exist in HTML');
assert(!htmlContent.includes('>Announce Server<'), 'Announce Server button text should not exist');

// Test 2: Join Script button should still exist
assert(htmlContent.includes('id="newUserJoinScriptBtn"'), 'Join Script button should exist');

console.log('\n--- World@User Format Tests ---');

// Test 3: World@user format hint should be present
assert(htmlContent.includes('world@user'), 'world@user format hint should be in HTML');
assert(htmlContent.includes('KANYE@player'), 'Example KANYE@player should be in HTML');

console.log('\n--- Initialization Progress Tests ---');

// Test 4: Init progress elements should exist
assert(htmlContent.includes('id="initProgress"'), 'initProgress container should exist');
assert(htmlContent.includes('id="initProgressBar"'), 'initProgressBar should exist');
assert(htmlContent.includes('id="initProgressText"'), 'initProgressText should exist');

// Test 5: Simplified calculation message should be present
assert(
    htmlContent.includes('this calculation will take place as you cache all the old transactions on the thread to prevent new answers and offers to be acted upon'),
    'Simplified calculation message should be present'
);

console.log('\n--- Known Worlds View Tests ---');

// Test 6: Known Worlds view elements should exist
assert(htmlContent.includes('id="knownWorldsView"'), 'knownWorldsView container should exist');
assert(htmlContent.includes('id="knownWorldsList"'), 'knownWorldsList container should exist');
assert(htmlContent.includes('Known Worlds Activity'), 'Known Worlds Activity header should exist');

console.log('\n--- Script Includes Tests ---');

// Test 7: New script files should be included
assert(htmlContent.includes('src="js/joinParser.js"'), 'joinParser.js should be included');
assert(htmlContent.includes('src="js/initialization.js"'), 'initialization.js should be included');

// Test 8: Scripts should be in correct order (before main.js)
const joinParserPos = htmlContent.indexOf('src="js/joinParser.js"');
const initPos = htmlContent.indexOf('src="js/initialization.js"');
const mainPos = htmlContent.indexOf('src="js/main.js"');

assert(joinParserPos < mainPos, 'joinParser.js should be loaded before main.js');
assert(initPos < mainPos, 'initialization.js should be loaded before main.js');
assert(joinParserPos < initPos, 'joinParser.js should be loaded before initialization.js');

console.log('\n--- Main.js Tests ---');

// Read main.js
const mainJsPath = path.join(__dirname, '..', 'js', 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Test 9: Announce Server handler should be removed
assert(!mainJsContent.includes('Announce Server button clicked'), 'Announce Server click handler should be removed');

// Test 10: renderKnownWorldsView function should exist
assert(mainJsContent.includes('function renderKnownWorldsView'), 'renderKnownWorldsView function should exist');

// Test 11: Initialization integration should exist
assert(mainJsContent.includes('runInitialization'), 'runInitialization call should exist in main.js');

// Test 12: World@user format should be used in join script
assert(mainJsContent.includes('world@user format'), 'world@user format reference should exist');

// Summary
console.log('\n=== Test Summary ===');
console.log('Passed: ' + testsPassed);
console.log('Failed: ' + testsFailed);
console.log('Total: ' + (testsPassed + testsFailed));

if (testsFailed > 0) {
    process.exit(1);
}
