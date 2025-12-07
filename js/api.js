var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();

/**
 * Local Mode Detection
 * When transactionid or viewername query parameters are present,
 * the app enters "local mode" and tries to fetch IPFS content from
 * a local source first before falling back to the public gateway.
 * 
 * Local mode path format: ../ipfs/<hash>/<filename>
 * Example: ../ipfs/QmAbc123/chunk_0001.json
 * 
 * Normal mode: Only uses public gateway https://ipfs.io/ipfs/<hash>
 */
var localMode = false;

// Detect query parameters on page load
(function detectLocalMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('transactionid') || params.has('viewername')) {
        localMode = true;
        console.log('[LocalMode] Enabled - IPFS content will be fetched from local source first');
    } else {
        console.log('[LocalMode] Disabled - Using public IPFS gateway only');
    }
})();

async function GetPublicAddressByKeyword(keyword) {
    try {
        if (addressByKeywordCache.has(keyword)) return addressByKeywordCache.get(keyword);
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetPublicAddressByKeyword/' + keyword + '?mainnet=false');
        if (!response.ok) {
            addMessage('Failed to fetch address for keyword');
            return null;
        }
        var address = await response.text();
        var cleanAddress = address ? address.trim().replace(/^"|"$/g, '') : null;
        if (cleanAddress) addressByKeywordCache.set(keyword, cleanAddress);
        return cleanAddress;
    } catch (e) {
        addMessage('Failed to fetch address for keyword');
        return null;
    }
}

/**
 * Resolve an IPFS URL to a usable blob URL
 * In local mode, attempts to fetch from ../ipfs/<filename> first before falling back to public gateway
 * 
 * @param {string} url - IPFS URL in format IPFS:hash\filename or IPFS:hash
 * @returns {Promise<string>} - Blob URL for the fetched content
 */
async function resolveIPFS(url) {
    const match = url.match(/IPFS:(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})\\?(.*)/);
    if (!match) {
        throw new Error('Invalid IPFS URL format.');
    }
    const fullMatch = match[0].split('IPFS:')[1];
    const parts = fullMatch.split('\\');
    const hash = parts[0];
    const filename = parts.length > 1 ? parts.slice(1).join('/') : null;
    
    // Try local mode first if enabled and filename is present
    if (localMode && filename) {
        const localPath = `../ipfs/${hash}/${filename}`;
        try {
            console.log('[LocalMode] Attempting to fetch from:', localPath);
            const localResponse = await fetch(localPath);
            if (localResponse.ok) {
                console.log('[LocalMode] Successfully fetched from local source');
                const blob = await localResponse.blob();
                return URL.createObjectURL(blob);
            }
        } catch (error) {
            console.log('[LocalMode] Local fetch failed, falling back to public gateway:', error.message);
        }
    }
    
    // Fallback to public gateway (use only hash, not filename)
    const response = await fetch('https://ipfs.io/ipfs/' + hash);
    if (!response.ok) {
        throw new Error('Failed to fetch from IPFS.');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
async function GetPublicMessagesByAddress(address, skip, qty) {
    try {
        var cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetPublicMessagesByAddress/' + cleanAddress + '?skip=' + (skip || 0) + '&qty=' + (qty || 5000) + '&mainnet=false');
        if (!response.ok) {
            addMessage('Failed to fetch messages: Invalid address');
            return [];
        }
        var messages = await response.json();
        return messages;
    } catch (e) {
        addMessage('Failed to fetch messages');
        return [];
    }
}
async function GetProfileByURN(urn) {
    if (!urn || urn.trim() === '') return null;
    try {
        if (profileByURNCache.has(urn)) return profileByURNCache.get(urn);
        var cleanUrn = encodeURIComponent(urn.trim().replace(/^"|"$/g, ''));
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetProfileByURN/' + cleanUrn + '?mainnet=false');
        if (!response.ok) return null;
        var profile = await response.json();
        if (profile) profileByURNCache.set(urn, profile);
        return profile;
    } catch (e) {
        return null;
    }
}
async function GetProfileByAddress(address) {
    try {
        if (profileByAddressCache.has(address)) return profileByAddressCache.get(address);
        var cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetProfileByAddress/' + cleanAddress + '?mainnet=false');
        if (!response.ok) return null;
        var profile = await response.json();
        if (profile) profileByAddressCache.set(address, profile);
        return profile;
    } catch (e) {
        return null;
    }
}
async function GetKeywordByPublicAddress(address) {
    try {
        if (keywordByAddressCache.has(address)) return keywordByAddressCache.get(address);
        var cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetKeywordByPublicAddress/' + cleanAddress + '?mainnet=false');
        if (!response.ok) {
            addMessage('Failed to fetch keyword for address');
            return null;
        }
        var keyword = await response.text();
        var cleanKeyword = keyword ? keyword.trim().replace(/^"|"$/g, '') : null;
        if (cleanKeyword) keywordByAddressCache.set(address, cleanKeyword);
        return cleanKeyword;
    } catch (e) {
        addMessage('Failed to fetch keyword for address');
        return null;
    }
}
/**
 * Fetch JSON data from IPFS
 * In local mode, attempts to fetch from ../ipfs/<filename> first before falling back to public gateway
 * Note: This function expects JSON data and parses the response
 * 
 * @param {string} hash - IPFS hash or hash/filename path
 * @returns {Promise<Object|null>} - Parsed JSON data or null on failure
 */
async function fetchIPFS(hash) {
    try {
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        
        // Try local mode first if enabled and hash contains a filename
        if (localMode && hash.includes('/')) {
            const localPath = `../ipfs/${hash}`;
            try {
                console.log('[LocalMode] Attempting to fetch JSON from:', localPath);
                var localResponse = await fetch(localPath);
                if (localResponse.ok) {
                    console.log('[LocalMode] Successfully fetched JSON from local source');
                    var localData = await localResponse.json();
                    return localData;
                }
            } catch (localError) {
                console.log('[LocalMode] Local JSON fetch failed, falling back to public gateway:', localError.message);
            }
        }
        
        // Fallback to public gateway (use only the hash part, not filename)
        const hashOnly = hash.split('/')[0];
        var response = await fetch('https://ipfs.io/ipfs/' + hashOnly);
        if (!response.ok) {
            addMessage('Failed to fetch IPFS data');
            return null;
        }
        var data = await response.json();
        return data;
    } catch (e) {
        addMessage('Failed to fetch IPFS data');
        return null;
    }
}
