const fs = require('fs');

let cssContent = fs.readFileSync('css/style.css', 'utf8');

cssContent = cssContent.replace(/#hud \{\s*display: none !important;\s*\}/, '#hud {\n                /* display: none !important; */\n            }');

fs.writeFileSync('css/style.css', cssContent);
