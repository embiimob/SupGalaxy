/**
 * UniSat Wallet Integration for SupGalaxy
 * 
 * This module implements UniSat browser-wallet integration for saving user sessions
 * (game saves and game connection requests including offer/answer) directly on
 * Bitcoin testnet3 using sendmany-style transactions that match Sup!? encoding.
 * 
 * The encoding follows the DiscoBall.cs specification:
 * - Builds OBJP2FK string with random delimiter and length prefix
 * - Computes SHA-256 of the OBJP2FK (UTF-8 bytes), converts to uppercase hex
 * - Creates SIG header with the signature
 * - Splits bytes into 20-byte chunks, pads last chunk with '#'
 * - Prefixes with network version byte (0x6F for testnet)
 * - Base58Check-encodes each chunk into P2PKH addresses
 * - Sends sendmany transaction with tiny outputs (0.00000546 BTC / 546 satoshis)
 */

const UniSatWallet = (function() {
    'use strict';

    // Constants
    const TESTNET_VERSION_BYTE = 0x6F; // Bitcoin testnet P2PKH version byte
    const CHUNK_SIZE = 20; // Bytes per address chunk
    const DUST_SATOSHIS = 546; // Minimum dust output in satoshis
    const DUST_BTC = 0.00000546; // Same in BTC

    // Base58 alphabet for Bitcoin
    const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    // State
    let isConnected = false;
    let connectedAddress = null;
    let networkType = null;

    /**
     * Check if UniSat wallet is available in the browser
     */
    function isAvailable() {
        return typeof window.unisat !== 'undefined';
    }

    /**
     * Connect to UniSat wallet
     * @returns {Promise<{address: string, network: string}>}
     */
    async function connect() {
        if (!isAvailable()) {
            throw new Error('UniSat wallet is not installed. Please install the UniSat browser extension.');
        }

        try {
            // Request accounts
            const accounts = await window.unisat.requestAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts available');
            }

            connectedAddress = accounts[0];

            // Get network info
            const network = await window.unisat.getNetwork();
            networkType = network;

            // Switch to testnet if not already on it
            if (network !== 'testnet') {
                try {
                    await window.unisat.switchNetwork('testnet');
                    networkType = 'testnet';
                } catch (e) {
                    console.warn('[UniSat] Failed to switch to testnet:', e);
                    // Continue anyway, user may want to use livenet
                }
            }

            isConnected = true;
            console.log('[UniSat] Connected:', connectedAddress, 'Network:', networkType);

            return {
                address: connectedAddress,
                network: networkType
            };
        } catch (error) {
            console.error('[UniSat] Connection failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect from UniSat wallet
     */
    function disconnect() {
        isConnected = false;
        connectedAddress = null;
        networkType = null;
        console.log('[UniSat] Disconnected');
    }

    /**
     * Get connection status
     */
    function getStatus() {
        return {
            isConnected,
            address: connectedAddress,
            network: networkType
        };
    }

    /**
     * Generate a random delimiter character for OBJP2FK encoding
     * Uses characters outside the normal alphanumeric range
     */
    function generateRandomDelimiter() {
        // Characters that won't appear in base64 or hex encoding
        const delimiters = ['|', '~', '^', '`', '@', '!', '#', '$', '%', '&'];
        return delimiters[Math.floor(Math.random() * delimiters.length)];
    }

    /**
     * Encode length as 4-character string (matching DiscoBall format)
     * @param {number} length 
     * @returns {string}
     */
    function encodeLength(length) {
        // Pad to 4 characters with leading zeros
        return String(length).padStart(4, '0');
    }

    /**
     * Build OBJP2FK string following DiscoBall specification
     * Format: delimiter + length (4 chars) + delimiter + JSON data + delimiter
     * 
     * @param {object|string} data - Data to encode (object will be JSON stringified)
     * @param {string} [inqJson] - Optional additional JSON to append
     * @returns {string} OBJP2FK formatted string
     */
    function buildOBJP2FK(data, inqJson = null) {
        const delimiter = generateRandomDelimiter();
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        
        let content = jsonStr;
        if (inqJson) {
            content += inqJson;
        }

        const length = content.length;
        const lengthStr = encodeLength(length);

        // Format: delimiter + length + delimiter + content + delimiter
        const objp2fk = delimiter + lengthStr + delimiter + content + delimiter;
        
        console.log('[UniSat] Built OBJP2FK, length:', objp2fk.length, 'delimiter:', delimiter);
        return objp2fk;
    }

    /**
     * Compute SHA-256 hash of string (UTF-8 bytes)
     * Returns uppercase hex string matching BitConverter.ToString(...).Replace("-", "")
     * 
     * @param {string} data 
     * @returns {Promise<string>} Uppercase hex hash
     */
    async function computeSHA256(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        return hashHex;
    }

    /**
     * Request UniSat to sign a message
     * @param {string} message - Message to sign (typically the SHA-256 hash hex)
     * @returns {Promise<string>} Signature
     */
    async function signMessage(message) {
        if (!isConnected) {
            throw new Error('UniSat wallet not connected');
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
     * Format SIG header following DiscoBall specification
     * Format: "SIG       88       \n" + signature
     * 
     * @param {string} signature - Base64 signature from UniSat
     * @returns {string} Formatted SIG header
     */
    function formatSIGHeader(signature) {
        // SIG header format from DiscoBall: "SIG       88       \n"
        // 88 is the typical length of a Bitcoin signature in base64
        const sigLength = signature.length;
        const header = 'SIG       ' + String(sigLength).padStart(3, ' ') + '       \n';
        return header + signature;
    }

    /**
     * Compute double SHA-256 (used for Base58Check checksum)
     * @param {Uint8Array} data 
     * @returns {Promise<Uint8Array>}
     */
    async function doubleSHA256(data) {
        const hash1 = await crypto.subtle.digest('SHA-256', data);
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);
        return new Uint8Array(hash2);
    }

    /**
     * Encode bytes to Base58
     * @param {Uint8Array} bytes 
     * @returns {string}
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
            const remainder = num % BigInt(58);
            result = BASE58_ALPHABET[Number(remainder)] + result;
            num = num / BigInt(58);
        }

        // Add leading '1's for leading zero bytes
        for (const byte of bytes) {
            if (byte === 0) {
                result = '1' + result;
            } else {
                break;
            }
        }

        return result;
    }

    /**
     * Base58Check encode with version byte
     * @param {number} versionByte 
     * @param {Uint8Array} payload 
     * @returns {Promise<string>}
     */
    async function base58CheckEncode(versionByte, payload) {
        // Create version + payload
        const versionedPayload = new Uint8Array(1 + payload.length);
        versionedPayload[0] = versionByte;
        versionedPayload.set(payload, 1);

        // Compute checksum (first 4 bytes of double SHA-256)
        const hash = await doubleSHA256(versionedPayload);
        const checksum = hash.slice(0, 4);

        // Combine version + payload + checksum
        const fullData = new Uint8Array(versionedPayload.length + 4);
        fullData.set(versionedPayload);
        fullData.set(checksum, versionedPayload.length);

        return base58Encode(fullData);
    }

    /**
     * Encode bytes as testnet P2PKH address
     * @param {Uint8Array} bytes - 20 bytes of data
     * @returns {Promise<string>} P2PKH address
     */
    async function bytesToTestnetAddress(bytes) {
        if (bytes.length !== CHUNK_SIZE) {
            throw new Error(`Expected ${CHUNK_SIZE} bytes, got ${bytes.length}`);
        }
        return await base58CheckEncode(TESTNET_VERSION_BYTE, bytes);
    }

    /**
     * Pad the last chunk with '#' to make it 20 bytes
     * @param {Uint8Array} chunk 
     * @returns {Uint8Array}
     */
    function padChunk(chunk) {
        if (chunk.length >= CHUNK_SIZE) {
            return chunk.slice(0, CHUNK_SIZE);
        }
        const padded = new Uint8Array(CHUNK_SIZE);
        padded.set(chunk);
        // Pad with '#' (ASCII 35)
        for (let i = chunk.length; i < CHUNK_SIZE; i++) {
            padded[i] = 35; // '#'
        }
        return padded;
    }

    /**
     * Split data into chunks and encode as P2PKH addresses
     * @param {string} data - Full data string (SIG + OBJP2FK)
     * @returns {Promise<string[]>} Array of testnet P2PKH addresses
     */
    async function dataToAddresses(data) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(data);
        const addresses = [];

        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            let chunk = bytes.slice(i, Math.min(i + CHUNK_SIZE, bytes.length));
            
            // Pad last chunk if needed
            if (chunk.length < CHUNK_SIZE) {
                chunk = padChunk(chunk);
            }

            const address = await bytesToTestnetAddress(chunk);
            addresses.push(address);
        }

        console.log('[UniSat] Encoded data into', addresses.length, 'addresses');
        return addresses;
    }

    /**
     * Build a complete Sup!? compatible message with SIG header
     * @param {object|string} data - Data to encode
     * @param {string} [inqJson] - Optional additional JSON
     * @returns {Promise<{objp2fk: string, fullMessage: string, hash: string, signature: string, addresses: string[]}>}
     */
    async function buildSignedMessage(data, inqJson = null) {
        if (!isConnected) {
            throw new Error('UniSat wallet not connected');
        }

        // Build OBJP2FK string
        const objp2fk = buildOBJP2FK(data, inqJson);

        // Compute SHA-256 hash
        const hash = await computeSHA256(objp2fk);
        console.log('[UniSat] OBJP2FK hash:', hash);

        // Sign the hash with UniSat
        const signature = await signMessage(hash);

        // Format SIG header
        const sigHeader = formatSIGHeader(signature);

        // Combine SIG header and OBJP2FK
        const fullMessage = sigHeader + objp2fk;

        // Convert to addresses
        const addresses = await dataToAddresses(fullMessage);

        return {
            objp2fk,
            fullMessage,
            hash,
            signature,
            addresses
        };
    }

    /**
     * Create sendmany-style transaction outputs
     * Each address gets the dust amount (546 satoshis)
     * 
     * @param {string[]} addresses - Array of destination addresses
     * @returns {object[]} Array of {address, satoshis}
     */
    function createSendmanyOutputs(addresses) {
        return addresses.map(address => ({
            address,
            satoshis: DUST_SATOSHIS
        }));
    }

    /**
     * Estimate transaction fee for sendmany
     * Rough estimate: 10 bytes header + 148 bytes per input + 34 bytes per output
     * 
     * @param {number} numOutputs 
     * @param {number} feeRate - Satoshis per byte
     * @returns {number} Estimated fee in satoshis
     */
    function estimateFee(numOutputs, feeRate = 10) {
        // Rough size: 10 (version, locktime, etc) + ~148 per input + 34 per output
        // Assume 1 input for simplicity
        const estimatedSize = 10 + 148 + (34 * numOutputs);
        return Math.ceil(estimatedSize * feeRate);
    }

    /**
     * Send a sendmany transaction via UniSat
     * @param {string[]} addresses - Array of destination addresses
     * @returns {Promise<string>} Transaction ID
     */
    async function sendTransaction(addresses) {
        if (!isConnected) {
            throw new Error('UniSat wallet not connected');
        }

        if (addresses.length === 0) {
            throw new Error('No addresses provided');
        }

        const outputs = createSendmanyOutputs(addresses);
        
        // Calculate total amount needed
        const totalSatoshis = outputs.reduce((sum, out) => sum + out.satoshis, 0);
        const estimatedFee = estimateFee(outputs.length);
        
        console.log('[UniSat] Sending transaction:');
        console.log('  Outputs:', outputs.length);
        console.log('  Total dust:', totalSatoshis, 'satoshis');
        console.log('  Estimated fee:', estimatedFee, 'satoshis');
        console.log('  Total required:', totalSatoshis + estimatedFee, 'satoshis');

        try {
            // Use UniSat's sendBitcoin for multiple outputs
            // UniSat API: sendBitcoin(toAddress, satoshis, options)
            // For multiple outputs, we need to use the sendInscription or custom approach
            
            // UniSat v1.2+ supports sending to multiple addresses
            // We'll use a loop approach with individual transactions or batch if supported
            
            // Check if batch sending is available
            if (typeof window.unisat.sendMultiOutput === 'function') {
                // Use batch sending if available
                const txid = await window.unisat.sendMultiOutput(outputs);
                console.log('[UniSat] Transaction broadcast (batch):', txid);
                return txid;
            } else {
                // Fallback: send individual transactions (less efficient)
                // For now, we'll use the signPsbt approach for multiple outputs
                
                // Build PSBT with multiple outputs
                const psbtHex = await buildMultiOutputPsbt(outputs);
                
                // Sign the PSBT
                const signedPsbt = await window.unisat.signPsbt(psbtHex);
                
                // Push the transaction
                const txid = await window.unisat.pushPsbt(signedPsbt);
                console.log('[UniSat] Transaction broadcast (PSBT):', txid);
                return txid;
            }
        } catch (error) {
            console.error('[UniSat] Transaction failed:', error);
            throw error;
        }
    }

    /**
     * Build a PSBT with multiple outputs (placeholder - requires proper PSBT library)
     * In a real implementation, this would use a proper Bitcoin library
     * @param {object[]} outputs 
     * @returns {Promise<string>} PSBT hex
     */
    async function buildMultiOutputPsbt(outputs) {
        // This is a simplified placeholder
        // A proper implementation would need to:
        // 1. Get UTXOs from the wallet
        // 2. Build proper PSBT with inputs and outputs
        // 3. Handle change addresses
        
        // For now, we'll throw an error indicating this needs the full bitcoin library
        throw new Error('Multi-output PSBT building requires a Bitcoin library. Please use the simple sendBitcoin approach or integrate a PSBT library.');
    }

    /**
     * Save session data to Bitcoin testnet via UniSat
     * This is the main entry point for saving game sessions
     * 
     * @param {object} sessionData - The session data to save
     * @returns {Promise<{txid: string, addresses: string[]}>}
     */
    async function saveSessionToChain(sessionData) {
        if (!isConnected) {
            await connect();
        }

        console.log('[UniSat] Saving session to chain...');

        // Build signed message
        const { addresses, fullMessage, hash, signature } = await buildSignedMessage(sessionData);

        console.log('[UniSat] Message prepared:');
        console.log('  Hash:', hash);
        console.log('  Addresses:', addresses.length);
        console.log('  First address:', addresses[0]);

        // Send the transaction
        const txid = await sendTransaction(addresses);

        return {
            txid,
            addresses,
            hash,
            signature,
            fullMessage
        };
    }

    /**
     * Save WebRTC offer to Bitcoin testnet via UniSat
     * @param {object} offerData - WebRTC offer data
     * @returns {Promise<{txid: string, addresses: string[]}>}
     */
    async function saveOfferToChain(offerData) {
        return await saveSessionToChain(offerData);
    }

    /**
     * Save WebRTC answer to Bitcoin testnet via UniSat
     * @param {object} answerData - WebRTC answer data
     * @returns {Promise<{txid: string, addresses: string[]}>}
     */
    async function saveAnswerToChain(answerData) {
        return await saveSessionToChain(answerData);
    }

    /**
     * Get current balance
     * @returns {Promise<{confirmed: number, unconfirmed: number, total: number}>}
     */
    async function getBalance() {
        if (!isConnected) {
            throw new Error('UniSat wallet not connected');
        }

        try {
            const balance = await window.unisat.getBalance();
            return {
                confirmed: balance.confirmed || 0,
                unconfirmed: balance.unconfirmed || 0,
                total: balance.total || (balance.confirmed + balance.unconfirmed) || 0
            };
        } catch (error) {
            console.error('[UniSat] Failed to get balance:', error);
            throw error;
        }
    }

    /**
     * Listen for account changes
     * @param {function} callback 
     */
    function onAccountsChanged(callback) {
        if (isAvailable()) {
            window.unisat.on('accountsChanged', callback);
        }
    }

    /**
     * Listen for network changes
     * @param {function} callback 
     */
    function onNetworkChanged(callback) {
        if (isAvailable()) {
            window.unisat.on('networkChanged', callback);
        }
    }

    // Public API
    return {
        // Connection
        isAvailable,
        connect,
        disconnect,
        getStatus,

        // Encoding utilities
        buildOBJP2FK,
        computeSHA256,
        signMessage,
        formatSIGHeader,
        dataToAddresses,
        buildSignedMessage,

        // Transaction
        createSendmanyOutputs,
        estimateFee,
        sendTransaction,

        // High-level save functions
        saveSessionToChain,
        saveOfferToChain,
        saveAnswerToChain,

        // Wallet info
        getBalance,

        // Events
        onAccountsChanged,
        onNetworkChanged,

        // Constants
        DUST_SATOSHIS,
        DUST_BTC,
        TESTNET_VERSION_BYTE
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniSatWallet;
}
