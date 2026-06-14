const fs = require('fs');

let walletContent = fs.readFileSync('js/wallet.js', 'utf8');

const genFunc = `
async function generateTestnet3Address() {
    const privBytes = new Uint8Array(32);
    crypto.getRandomValues(privBytes);

    // WIF encoding
    const payload = new Uint8Array(34);
    payload[0] = 0xef; // testnet WIF version
    payload.set(privBytes, 1);
    payload[33] = 0x01; // compressed
    const wif = await encodeBase58Check(payload);

    // Address encoding
    const { publicKey } = await ecGetPublicKey(privBytes);
    const pubKeyHash = await hash160(publicKey);
    const addrPayload = new Uint8Array(21);
    addrPayload[0] = 0x6f; // testnet address version
    addrPayload.set(pubKeyHash, 1);
    const address = await encodeBase58Check(addrPayload);

    return { wif, address };
}
window.generateTestnet3Address = generateTestnet3Address;
`;

if (!walletContent.includes("async function generateTestnet3Address()")) {
    walletContent += "\n" + genFunc;
    fs.writeFileSync('js/wallet.js', walletContent);
}
