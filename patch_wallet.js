const fs = require('fs');

let walletContent = fs.readFileSync('js/wallet.js', 'utf8');

const funcsToAdd = `
async function buildP2fkRecipientsAndCost({ messageText, attachments, extraRecipients = [], fromAddress, amountPerRecipient }) {
    const safeMessageText = sanitizeP2fkMessageText(messageText);
    const unsignedPayload = buildP2fkUnsignedObject(safeMessageText, attachments);
    const signedHashHex = (await sha256HexFromText(unsignedPayload.unsignedObj)).toUpperCase();
    const signature = await signWithWallet(signedHashHex);
    const signedObj = \`SIG\${unsignedPayload.delimiter}\${P2FK_SIGNATURE_VERSION_MARKER}\${unsignedPayload.delimiter}\${signature}\${unsignedPayload.unsignedObj}\`;
    const recipients = await encodeP2fkAddresses(signedObj, P2FK_DEFAULT_VERSION_BYTE);
    const recipientSet = new Set(recipients);

    await validateLegacyTestnetAddress(fromAddress);

    for (const keyword of parseHashtagKeywords(safeMessageText)) {
      try {
        const keywordAddress = await getPublicAddressByKeyword(keyword);
        if (keywordAddress) {
          await validateLegacyTestnetAddress(keywordAddress);
          recipientSet.add(keywordAddress);
        }
      } catch (error) {
        console.debug('Unable to encode keyword address', keyword, error);
      }
    }
    for (const address of extraRecipients) {
      if (!address || address === fromAddress) continue;
      await validateLegacyTestnetAddress(address);
      recipientSet.add(address);
    }
    if (fromAddress) recipientSet.add(fromAddress);
    const recipientList = [...recipientSet];
    const outputs = recipientList.map((address) => ({ address, amount: amountPerRecipient }));
    const cost = amountPerRecipient * outputs.length;
    return { outputs, cost };
}

async function sendManyWithWallet(outputs) {
    return buildAndBroadcastInternalTx(outputs);
}

async function signWithWallet(messageText) {
    if (!internalPrivKeyBytes) throw new Error('Internal wallet is locked');
    const messageDigest = await hashBitcoinSignedMessage(messageText);
    const { r, s, recoveryId } = await ecSign(internalPrivKeyBytes, messageDigest);
    const compact = new Uint8Array(65);
    compact[0] = 27 + 4 + recoveryId;
    compact.set(bigIntToBytes32(r), 1);
    compact.set(bigIntToBytes32(s), 33);
    return btoa(String.fromCharCode.apply(null, compact));
}

// Ensure these functions also exist if they don't already
function sanitizeP2fkMessageText(text) {
    return text.trim();
}

function buildP2fkUnsignedObject(messageText, attachments = {}) {
    const P2FK_DELIMITER_ASCII = String.fromCharCode(31);
    let unsignedObj = \`\${P2FK_DELIMITER_ASCII}SUP\${P2FK_DELIMITER_ASCII}\`;
    const parts = [messageText];
    for (const [key, value] of Object.entries(attachments)) {
        parts.push(\`\${key}=\${value}\`);
    }
    unsignedObj += parts.join(P2FK_DELIMITER_ASCII);
    return { delimiter: P2FK_DELIMITER_ASCII, unsignedObj };
}

async function sha256HexFromText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const P2FK_SIGNATURE_VERSION_MARKER = "2";
const P2FK_DEFAULT_VERSION_BYTE = 111; // testnet

async function encodeP2fkAddresses(dataString, versionByte) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(dataString);
    const addresses = [];
    // Convert bytes into base58check addresses.
    // 20 bytes per address
    for (let i = 0; i < bytes.length; i += 20) {
        const chunk = bytes.slice(i, i + 20);
        const payload = new Uint8Array(20);
        payload.set(chunk, 0); // pad with zeros if < 20
        const addrBytes = new Uint8Array(21);
        addrBytes[0] = versionByte;
        addrBytes.set(payload, 1);

        // Compute checksum
        const hash1 = await crypto.subtle.digest('SHA-256', addrBytes);
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);
        const checksum = new Uint8Array(hash2).slice(0, 4);

        const finalBytes = new Uint8Array(25);
        finalBytes.set(addrBytes, 0);
        finalBytes.set(checksum, 21);

        addresses.push(encodeBase58(finalBytes));
    }
    return addresses;
}

function parseHashtagKeywords(text) {
    const KEYWORD_REGEX = /(?:^|\\s)#([a-zA-Z0-9_-]+)/g;
    const keywords = [];
    let match;
    while ((match = KEYWORD_REGEX.exec(text)) !== null) {
        keywords.push(match[1].toLowerCase());
    }
    return keywords;
}

function getPublicAddressByKeyword(keyword) {
    return fetch(\`https://p2fk.io/api/GetRootByKeyword/\${keyword}\`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) return data[0].Message.Address;
            return null;
        });
}

function validateLegacyTestnetAddress(address) {
    // For now just pass it through
    return Promise.resolve(true);
}
`;

walletContent = walletContent.replace(
    /window\.sendManyWithWallet = typeof sendManyWithWallet !== 'undefined' \? sendManyWithWallet : undefined;/,
    funcsToAdd + "\n" + `
window.buildP2fkRecipientsAndCost = buildP2fkRecipientsAndCost;
window.sendManyWithWallet = sendManyWithWallet;
window.signWithWallet = signWithWallet;
`
);

fs.writeFileSync('js/wallet.js', walletContent);
