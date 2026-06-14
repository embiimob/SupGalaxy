const fs = require('fs');

let cssContent = fs.readFileSync('css/style.css', 'utf8');

// Is there a display none !important hiding the hud in the main style?
const mobileMediaIndex = cssContent.indexOf('@media (max-width: 700px) and (orientation: portrait)');
console.log("Mobile media query found:", mobileMediaIndex !== -1);

if (mobileMediaIndex !== -1) {
    const section = cssContent.substring(0, mobileMediaIndex);
    const hasHiddenHUD = section.indexOf('#hud {\n                display: none !important;\n            }') !== -1;
    console.log("Has hiding hud outside media query:", hasHiddenHUD);

    // Actually the user stated that hotbar and rightpanel are also not displaying!
    // hudDisplay: 'block', hotbarDisplay: 'flex', rightPanelDisplay: 'flex'
    // hudVisible: false, hotbarVisible: false, rightPanelVisible: false

    // What if the entire page is obscured by something, like `loginOverlay` NOT being hidden?
    // Oh wait, the test script says loginOverlayVisible is false.
    // Let's check `videoMenuModal`, `modals`? No.
    // What about `#loginOverlay { display: none !important; }` ? No, loginOverlayVisible is false.
    // Why would an element with `display: block` and `z-index: 200` be invisible?
    // Opacity? Visibility: hidden?
    // Parent element? They are direct children of `body`.
}
