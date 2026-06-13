const fs = require('fs');

let walletContent = fs.readFileSync('js/wallet.js', 'utf8');

walletContent = walletContent.replace(
  "window.INTERNAL_WALLET_STORAGE_KEY = typeof INTERNAL_WALLET_STORAGE_KEY !== 'undefined' ? INTERNAL_WALLET_STORAGE_KEY : 'sup_testnet_wallet';",
  "window.INTERNAL_WALLET_STORAGE_KEY = 'sup_iw_v1';"
);

fs.writeFileSync('js/wallet.js', walletContent);
