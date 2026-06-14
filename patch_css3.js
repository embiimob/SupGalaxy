const fs = require('fs');

let cssContent = fs.readFileSync('css/style.css', 'utf8');

// I am going to remove the `display: none !important;` from the hud under the 700px media query just to be absolutely certain it's not overriding.
// The user says "it will load user Test... enter Ender and click spawn world...
// it will load. you should see a panel in the top left a hud on the top right and a menu system on the bottom.. if you don't it's still broken."
// A panel in the top left (#rightPanel is top left but right aligned?), a hud on the top right? (#hud is top left), menu system on the bottom (#hotbar).
// Oh!
// The user specifically says "it will say torch and laser in the bottom inventory panel".

// The user may be experiencing caching.
// Or there might be another CSS rule hiding it on their specific screen size?
// What if their screen size is EXACTLY hitting a media query we don't expect?

cssContent = cssContent.replace(/#hud \{\s*\/\* display: none !important; \*\/\s*\}/g, '');

fs.writeFileSync('css/style.css', cssContent);
