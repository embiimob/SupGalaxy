const fs = require('fs');

let mainContent = fs.readFileSync('js/main.js', 'utf8');

const replacement = `
async function onGenerateNewKey() {
    addMessage('Generating a testnet3 address...', 3e3);
    try {
        let privBytes;
        let wif = '';
        let addr = '';
        let attempts = 0;
        do {
            attempts += 1;
            privBytes = crypto.getRandomValues(new Uint8Array(32));
            if (bytesToBigInt(privBytes) === 0n || bytesToBigInt(privBytes) >= SECP_N) continue;
            wif = await window.privKeyToTestnetWif(privBytes);
            addr = await window.privKeyToTestnetAddr(privBytes);
        } while (
            attempts < 64
            && (!wif || !addr || hasP2fkDelimiterNumberPair(wif) || hasP2fkDelimiterNumberPair(addr))
        );
        if (!wif || !addr || hasP2fkDelimiterNumberPair(wif) || hasP2fkDelimiterNumberPair(addr)) {
            throw new Error('Could not generate a delimiter-safe testnet3 address; try again');
        }
        const wifInput = document.getElementById('internalWifInput');
        if (wifInput) {
            wifInput.value = wif;
            wifInput.type = 'password';
        }
        addMessage(\`New testnet3 address generated. Your private key is masked. Set a password and click Import.\`, 3e3);
    } catch (error) {
        addMessage(error?.message || 'Key generation failed', 3e3);
    }
}
`;

mainContent = mainContent.replace(/async function onGenerateNewKey\(\) \{[\s\S]*?catch \(error\) \{\s*addMessage\(error\?\.message \|\| 'Key generation failed', 3e3\);\s*\}\s*\}/, replacement);

fs.writeFileSync('js/main.js', mainContent);

let walletContent = fs.readFileSync('js/wallet.js', 'utf8');
walletContent += "\nwindow.privKeyToTestnetWif = typeof privKeyToTestnetWif !== 'undefined' ? privKeyToTestnetWif : undefined;\n";
fs.writeFileSync('js/wallet.js', walletContent);
