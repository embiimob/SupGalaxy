const fs = require('fs');

const { execSync } = require('child_process');

try {
  execSync('xvfb-run node jules-scratch/verification/test.js');
  console.log('Test Passed');
} catch (e) {
  console.error('Test Failed', e.message);
  console.error(e.stdout ? e.stdout.toString() : '');
}
