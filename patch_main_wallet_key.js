const fs = require('fs');

let mainContent = fs.readFileSync('js/main.js', 'utf8');

// Ensure INTERNAL_WALLET_STORAGE_KEY is available in main.js scope since we just set it in window
mainContent = mainContent.replace(/INTERNAL_WALLET_STORAGE_KEY/g, "window.INTERNAL_WALLET_STORAGE_KEY");

fs.writeFileSync('js/main.js', mainContent);
