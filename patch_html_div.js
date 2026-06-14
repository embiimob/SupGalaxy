const fs = require('fs');

let htmlContent = fs.readFileSync('index.html', 'utf8');

// I can see:
//         </div>
//     </div>
//
//     <div id="videoMenuModal"
//
// If `loginOverlay` is one div, and `loginCard` is inside it, the first `</div>` closes `loginCard`, and the second `</div>` closes `loginOverlay`?
// But wait, there is `<div class="internal-wallet-section" id="internalWalletSection">` which is added.
// Ah! Let's check `internalWalletSection`!

const sectionStr = '<div class="internal-wallet-section" id="internalWalletSection">';
const idx = htmlContent.indexOf(sectionStr);
const strAfter = htmlContent.substring(idx, idx + 1000);
console.log(strAfter);
