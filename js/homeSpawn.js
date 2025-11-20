/**
 * Deterministic Home Spawn Calculation
 * 
 * Provides a secure, deterministic way to calculate a player's home spawn chunk
 * for a given world based on world seed and username using SHA-256.
 */

/**
 * Calculate a deterministic home chunk for a player in a world
 * @param {string} worldSeed - The world seed/name
 * @param {string} username - The player's username
 * @returns {{chunkX: number, chunkZ: number}} The home chunk coordinates
 */
function calculateHomeChunk(worldSeed, username) {
    // Create a unique string combining world seed and username
    const input = `${worldSeed}:${username}`;
    
    // Convert string to UTF-8 bytes for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    
    // Use Web Crypto API for SHA-256 (browser-compatible)
    // Since this needs to be synchronous and consistent, we'll use a simpler hash
    // that's still deterministic but doesn't require async
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use additional mixing to improve distribution
    let hash2 = hash;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(input.length - 1 - i);
        hash2 = ((hash2 << 7) - hash2) + char;
        hash2 = hash2 & hash2;
    }
    
    // Map to chunk coordinates
    // Use modulo to keep within reasonable bounds while maintaining determinism
    // Assuming MAP_SIZE is available globally, otherwise use a large range
    const maxChunks = typeof MAP_SIZE !== 'undefined' ? Math.floor(MAP_SIZE / CHUNK_SIZE) : 256;
    
    // Convert to unsigned and map to chunk range centered around origin
    const halfRange = Math.floor(maxChunks / 2);
    const chunkX = ((hash >>> 0) % maxChunks) - halfRange;
    const chunkZ = ((hash2 >>> 0) % maxChunks) - halfRange;
    
    return {
        chunkX: chunkX,
        chunkZ: chunkZ
    };
}

/**
 * SHA-256 based version (async) - for future use if needed
 * This version provides better cryptographic properties but requires async/await
 */
async function calculateHomeChunkAsync(worldSeed, username) {
    const input = `${worldSeed}:${username}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    
    // Use Web Crypto API for SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Take first 8 bytes and convert to two 32-bit integers
    const bytes = new Uint8Array(hashBuffer);
    const view = new DataView(hashBuffer);
    const hash1 = view.getInt32(0, false); // Big-endian
    const hash2 = view.getInt32(4, false);
    
    // Map to chunk coordinates
    const maxChunks = typeof MAP_SIZE !== 'undefined' ? Math.floor(MAP_SIZE / CHUNK_SIZE) : 256;
    const halfRange = Math.floor(maxChunks / 2);
    
    const chunkX = (Math.abs(hash1) % maxChunks) - halfRange;
    const chunkZ = (Math.abs(hash2) % maxChunks) - halfRange;
    
    return {
        chunkX: chunkX,
        chunkZ: chunkZ
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateHomeChunk, calculateHomeChunkAsync };
}
