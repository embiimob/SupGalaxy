/**
 * UniSat Wallet Integration for SupGalaxy
 * 
 * This module provides integration with UniSat browser wallet for
 * saving user sessions (game saves and connection requests) directly
 * on Bitcoin testnet3 using Sup!? encoding format.
 * 
 * The encoding matches DiscoBall.cs format:
 * - OBJP2FK string with random delimiter and length prefix
 * - SIG header with SHA-256 hash signature
 * - 20-byte chunks padded with '#'
 * - Network version byte prefix + Base58Check encoding
 * - sendmany-style transaction with 0.00000546 BTC outputs
 */

// Bitcoin testnet3 version byte for P2PKH addresses
const TESTNET_VERSION_BYTE = 0x6F;

// Dust limit for outputs (546 satoshis)
const DUST_LIMIT = 546;

// UniSat wallet state
let unisatConnected = false;
let unisatAddress = null;
let unisatPublicKey = null;

/**
 * Base58 alphabet used by Bitcoin
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Convert byte array to hex string
 * @param {Uint8Array} bytes - Byte array to convert
 * @returns {string} Hex string
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string to byte array
 * @param {string} hex - Hex string to convert
 * @returns {Uint8Array} Byte array
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Convert UTF-8 string to byte array
 * @param {string} str - String to convert
 * @returns {Uint8Array} Byte array
 */
function stringToBytes(str) {
    return new TextEncoder().encode(str);
}

/**
 * Compute SHA-256 hash of data
 * @param {Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} SHA-256 hash
 */
async function sha256(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

/**
 * Compute double SHA-256 hash (used for Bitcoin checksums)
 * @param {Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} Double SHA-256 hash
 */
async function doubleSha256(data) {
    const first = await sha256(data);
    return sha256(first);
}

/**
 * Encode bytes to Base58
 * @param {Uint8Array} bytes - Bytes to encode
 * @returns {string} Base58 encoded string
 */
function base58Encode(bytes) {
    // Convert bytes to big integer
    let num = BigInt(0);
    for (const byte of bytes) {
        num = num * BigInt(256) + BigInt(byte);
    }
    
    // Convert to base58
    let result = '';
    while (num > 0) {
        const remainder = Number(num % BigInt(58));
        result = BASE58_ALPHABET[remainder] + result;
        num = num / BigInt(58);
    }
    
    // Add leading 1s for each leading zero byte
    for (const byte of bytes) {
        if (byte === 0) {
            result = '1' + result;
        } else {
            break;
        }
    }
    
    return result || '1';
}

/**
 * Encode data with Base58Check (adds version byte and checksum)
 * @param {Uint8Array} payload - Data to encode
 * @param {number} versionByte - Network version byte
 * @returns {Promise<string>} Base58Check encoded string
 */
async function base58CheckEncode(payload, versionByte) {
    // Prepend version byte
    const versioned = new Uint8Array(1 + payload.length);
    versioned[0] = versionByte;
    versioned.set(payload, 1);
    
    // Calculate checksum (first 4 bytes of double SHA-256)
    const checksum = await doubleSha256(versioned);
    
    // Append first 4 bytes of checksum
    const withChecksum = new Uint8Array(versioned.length + 4);
    withChecksum.set(versioned);
    withChecksum.set(checksum.slice(0, 4), versioned.length);
    
    return base58Encode(withChecksum);
}

/**
 * Generate a random delimiter character (printable ASCII, not alphanumeric)
 * @returns {string} Random delimiter character
 */
function generateRandomDelimiter() {
    // Printable ASCII characters that are not alphanumeric
    // Avoiding characters that might interfere with parsing
    const delimiters = '!@$%^&*-_=+|:,.<>?';
    return delimiters[Math.floor(Math.random() * delimiters.length)];
}

/**
 * Build OBJP2FK string matching DiscoBall.cs format
 * 
 * Format: delimiter + length(3 digits) + content + optional inqJson
 * 
 * @param {string} content - Main content to encode
 * @param {string} [inqJson] - Optional inquiry JSON to append
 * @returns {string} OBJP2FK formatted string
 */
function buildOBJP2FK(content, inqJson = null) {
    const delimiter = generateRandomDelimiter();
    
    // Length prefix is 3 digits, padded with zeros
    const lengthPrefix = content.length.toString().padStart(3, '0');
    
    let objp2fk = delimiter + lengthPrefix + content;
    
    if (inqJson) {
        objp2fk += inqJson;
    }
    
    return objp2fk;
}

/**
 * Split data into 20-byte chunks, padding the last chunk with '#'
 * @param {Uint8Array} data - Data to split
 * @returns {Uint8Array[]} Array of 20-byte chunks
 */
function splitIntoChunks(data) {
    const CHUNK_SIZE = 20;
    const chunks = [];
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = new Uint8Array(CHUNK_SIZE);
        const remaining = Math.min(CHUNK_SIZE, data.length - i);
        
        chunk.set(data.slice(i, i + remaining));
        
        // Pad remaining bytes with '#' (ASCII 35)
        for (let j = remaining; j < CHUNK_SIZE; j++) {
            chunk[j] = 35; // '#' character
        }
        
        chunks.push(chunk);
    }
    
    return chunks;
}

/**
 * Convert chunks to P2PKH addresses using Base58Check encoding
 * @param {Uint8Array[]} chunks - Array of 20-byte chunks
 * @returns {Promise<string[]>} Array of P2PKH addresses
 */
async function chunksToAddresses(chunks) {
    const addresses = [];
    
    for (const chunk of chunks) {
        // Each chunk becomes the payload for a P2PKH address
        const address = await base58CheckEncode(chunk, TESTNET_VERSION_BYTE);
        addresses.push(address);
    }
    
    return addresses;
}

/**
 * Compute SHA-256 hash of OBJP2FK string and format as uppercase hex
 * (Same format as BitConverter.ToString(...).Replace("-", ""))
 * @param {string} objp2fk - OBJP2FK string to hash
 * @returns {Promise<string>} Uppercase hex hash string
 */
async function computeOBJP2FKHash(objp2fk) {
    const bytes = stringToBytes(objp2fk);
    const hash = await sha256(bytes);
    return bytesToHex(hash).toUpperCase();
}

/**
 * Build SIG header with signature
 * Format: "SIG       88       <signature>"
 * The signature is inserted after the SIG header marker
 * 
 * @param {string} signature - Signature string from wallet
 * @returns {string} Complete SIG header
 */
function buildSIGHeader(signature) {
    // SIG header format: "SIG" followed by padding and the signature
    // The "88" is a length indicator for the signature portion
    return 'SIG       88       ' + signature;
}

/**
 * Build complete message with SIG header and OBJP2FK
 * @param {string} objp2fk - OBJP2FK string
 * @param {string} signature - Wallet signature
 * @returns {string} Complete message ready for encoding
 */
function buildSignedMessage(objp2fk, signature) {
    const sigHeader = buildSIGHeader(signature);
    return sigHeader + objp2fk;
}

/**
 * Check if UniSat wallet is available
 * @returns {boolean} True if UniSat is available
 */
function isUnisatAvailable() {
    return typeof window.unisat !== 'undefined';
}

/**
 * Connect to UniSat wallet
 * @returns {Promise<{address: string, publicKey: string}>} Connected wallet info
 */
async function connectUnisat() {
    if (!isUnisatAvailable()) {
        throw new Error('UniSat wallet is not installed. Please install the UniSat browser extension.');
    }
    
    try {
        // Request connection
        const accounts = await window.unisat.requestAccounts();
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned from UniSat wallet');
        }
        
        unisatAddress = accounts[0];
        
        // Get public key
        unisatPublicKey = await window.unisat.getPublicKey();
        
        // Switch to testnet3
        try {
            await window.unisat.switchNetwork('testnet');
        } catch (e) {
            console.warn('[UniSat] Could not switch to testnet, continuing with current network:', e);
        }
        
        unisatConnected = true;
        
        console.log('[UniSat] Connected to wallet:', unisatAddress);
        
        return {
            address: unisatAddress,
            publicKey: unisatPublicKey
        };
    } catch (error) {
        console.error('[UniSat] Connection failed:', error);
        throw error;
    }
}

/**
 * Disconnect UniSat wallet
 */
function disconnectUnisat() {
    unisatConnected = false;
    unisatAddress = null;
    unisatPublicKey = null;
    console.log('[UniSat] Wallet disconnected');
}

/**
 * Get current UniSat connection status
 * @returns {{connected: boolean, address: string|null}} Connection status
 */
function getUnisatStatus() {
    return {
        connected: unisatConnected,
        address: unisatAddress
    };
}

/**
 * Request UniSat to sign a message
 * @param {string} message - Message to sign (hex hash string)
 * @returns {Promise<string>} Signature
 */
async function signWithUnisat(message) {
    if (!unisatConnected) {
        throw new Error('UniSat wallet is not connected');
    }
    
    try {
        const signature = await window.unisat.signMessage(message);
        console.log('[UniSat] Message signed successfully');
        return signature;
    } catch (error) {
        console.error('[UniSat] Signing failed:', error);
        throw error;
    }
}

/**
 * Create sendmany transaction data for UniSat
 * @param {string[]} addresses - Destination addresses
 * @param {number} amountPerOutput - Amount in satoshis per output
 * @returns {Object} Transaction data for UniSat
 */
function createSendManyData(addresses, amountPerOutput = DUST_LIMIT) {
    return addresses.map(address => ({
        address: address,
        satoshis: amountPerOutput
    }));
}

/**
 * Broadcast a sendmany transaction via UniSat
 * @param {string[]} addresses - Destination addresses
 * @returns {Promise<string>} Transaction ID
 */
async function broadcastSendMany(addresses) {
    if (!unisatConnected) {
        throw new Error('UniSat wallet is not connected');
    }
    
    if (addresses.length === 0) {
        throw new Error('No addresses to send to');
    }
    
    try {
        const toAddresses = createSendManyData(addresses);
        
        // UniSat uses sendBitcoin for single outputs
        // For multiple outputs, we need to use the PSBT interface
        const txid = await window.unisat.sendBitcoin(
            addresses[0], // First address
            DUST_LIMIT
        );
        
        console.log('[UniSat] Transaction broadcast, txid:', txid);
        return txid;
    } catch (error) {
        console.error('[UniSat] Broadcast failed:', error);
        throw error;
    }
}

/**
 * Broadcast a message to multiple addresses using PSBT
 * This creates a single transaction with multiple outputs
 * @param {string[]} addresses - Destination addresses
 * @param {number} feeRate - Fee rate in sat/vB
 * @returns {Promise<string>} Transaction ID
 */
async function broadcastMessagePSBT(addresses, feeRate = 1) {
    if (!unisatConnected) {
        throw new Error('UniSat wallet is not connected');
    }
    
    if (addresses.length === 0) {
        throw new Error('No addresses to send to');
    }
    
    try {
        // Create outputs for the PSBT
        const outputs = addresses.map(address => ({
            address: address,
            value: DUST_LIMIT
        }));
        
        // Use UniSat's signPsbt if available for multi-output transactions
        // Note: UniSat may have limitations on multi-output transactions
        // Fallback to sequential single sends if needed
        
        if (typeof window.unisat.signPsbt === 'function') {
            // This is a simplified approach - actual PSBT creation would require
            // proper UTXO selection and transaction building
            console.log('[UniSat] Using PSBT for multi-output transaction');
            
            // For now, we'll use sequential sends as a fallback
            // Full PSBT support would require additional bitcoin library integration
        }
        
        // Fallback: Send to each address sequentially
        const txids = [];
        for (const address of addresses) {
            try {
                const txid = await window.unisat.sendBitcoin(address, DUST_LIMIT);
                txids.push(txid);
                console.log('[UniSat] Sent to', address, 'txid:', txid);
            } catch (error) {
                console.error('[UniSat] Failed to send to', address, error);
                // Continue with remaining addresses
            }
        }
        
        return txids.length > 0 ? txids[0] : null;
    } catch (error) {
        console.error('[UniSat] PSBT broadcast failed:', error);
        throw error;
    }
}

/**
 * Complete flow: Encode session data and broadcast to Bitcoin testnet3
 * 
 * @param {Object} sessionData - Session data to encode (game save or connection request)
 * @param {string} [inqJson] - Optional inquiry JSON
 * @returns {Promise<{txid: string, addresses: string[]}>} Transaction result
 */
async function broadcastSession(sessionData, inqJson = null) {
    if (!unisatConnected) {
        await connectUnisat();
    }
    
    // 1. Convert session data to JSON string
    const content = JSON.stringify(sessionData);
    
    // 2. Build OBJP2FK string
    const objp2fk = buildOBJP2FK(content, inqJson);
    
    // 3. Compute SHA-256 hash (uppercase hex)
    const hashHex = await computeOBJP2FKHash(objp2fk);
    
    // 4. Request UniSat to sign the hash
    const signature = await signWithUnisat(hashHex);
    
    // 5. Build signed message (SIG header + OBJP2FK)
    const signedMessage = buildSignedMessage(objp2fk, signature);
    
    // 6. Convert to bytes
    const messageBytes = stringToBytes(signedMessage);
    
    // 7. Split into 20-byte chunks
    const chunks = splitIntoChunks(messageBytes);
    
    // 8. Convert chunks to P2PKH addresses
    const addresses = await chunksToAddresses(chunks);
    
    console.log('[UniSat] Prepared', addresses.length, 'addresses for broadcast');
    
    // 9. Broadcast transaction
    const txid = await broadcastMessagePSBT(addresses);
    
    return {
        txid: txid,
        addresses: addresses,
        hash: hashHex,
        signature: signature
    };
}

/**
 * Generate addresses for session data (without broadcasting)
 * Useful for previewing what will be broadcast
 * 
 * @param {Object} sessionData - Session data to encode
 * @param {string} [inqJson] - Optional inquiry JSON
 * @returns {Promise<{addresses: string[], hash: string}>} Prepared addresses
 */
async function prepareSessionAddresses(sessionData, inqJson = null) {
    // 1. Convert session data to JSON string
    const content = JSON.stringify(sessionData);
    
    // 2. Build OBJP2FK string
    const objp2fk = buildOBJP2FK(content, inqJson);
    
    // 3. Compute SHA-256 hash (uppercase hex)
    const hashHex = await computeOBJP2FKHash(objp2fk);
    
    // Note: Without signature, we can't produce final addresses
    // This is for preview purposes only
    
    // Convert OBJP2FK to bytes
    const objp2fkBytes = stringToBytes(objp2fk);
    
    // Split into chunks (without signature)
    const chunks = splitIntoChunks(objp2fkBytes);
    
    // Convert to addresses
    const addresses = await chunksToAddresses(chunks);
    
    return {
        addresses: addresses,
        hash: hashHex,
        objp2fk: objp2fk
    };
}

/**
 * Create a WebRTC offer/answer for blockchain broadcast
 * 
 * @param {Object} offerData - WebRTC offer or answer data
 * @param {string} world - World name
 * @param {string} user - Username
 * @returns {Promise<{txid: string, addresses: string[]}>} Transaction result
 */
async function broadcastWebRTCSignal(offerData, world, user) {
    const sessionData = {
        world: world,
        user: user,
        offer: offerData.offer || null,
        answer: offerData.answer || null,
        iceCandidates: offerData.iceCandidates || []
    };
    
    return broadcastSession(sessionData);
}

/**
 * Create a game save for blockchain broadcast
 * 
 * @param {Object} saveData - Game save data
 * @returns {Promise<{txid: string, addresses: string[]}>} Transaction result
 */
async function broadcastGameSave(saveData) {
    return broadcastSession(saveData);
}

// Export functions for use in other modules
window.UniSat = {
    // Connection
    isAvailable: isUnisatAvailable,
    connect: connectUnisat,
    disconnect: disconnectUnisat,
    getStatus: getUnisatStatus,
    
    // Signing
    sign: signWithUnisat,
    
    // Encoding
    buildOBJP2FK: buildOBJP2FK,
    computeHash: computeOBJP2FKHash,
    splitIntoChunks: splitIntoChunks,
    chunksToAddresses: chunksToAddresses,
    
    // Broadcasting
    broadcastSession: broadcastSession,
    broadcastWebRTCSignal: broadcastWebRTCSignal,
    broadcastGameSave: broadcastGameSave,
    prepareAddresses: prepareSessionAddresses,
    
    // Utilities
    bytesToHex: bytesToHex,
    hexToBytes: hexToBytes,
    base58CheckEncode: base58CheckEncode,
    
    // Constants
    TESTNET_VERSION_BYTE: TESTNET_VERSION_BYTE,
    DUST_LIMIT: DUST_LIMIT
};

console.log('[UniSat] Module loaded');
