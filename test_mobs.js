const fs = require('fs');
let code = fs.readFileSync('js/mobs.js', 'utf8');

// just run basic syntax check
try {
  new Function(code);
  console.log("Syntax OK");
} catch (e) {
  console.error("Syntax Error:", e);
}
