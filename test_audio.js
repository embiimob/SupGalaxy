const fs = require('fs');

let declare = fs.readFileSync('js/declare.js', 'utf8');
if (!declare.includes('isAutoplayPaused')) {
  console.log('isAutoplayPaused is MISSING from js/declare.js');
} else {
  console.log('isAutoplayPaused is PRESENT in js/declare.js');
}
