const fs = require('fs');

let walletContent = fs.readFileSync('js/wallet.js', 'utf8');

walletContent = walletContent.replace(
    /const \{ publicKey \} = await ecGetPublicKey\(privBytes\);/g,
    "const publicKey = await secp256k1PublicKeyCreate(privBytes, true);"
);

fs.writeFileSync('js/wallet.js', walletContent);
