var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();

// Local mode detection and IPFS path utilities
var localMode = false;
var baseLocalIpfsPath = null;

// Function to set local mode configuration from external code (e.g., main.js)
window.setLocalMode = function(enabled, basePath) {
    localMode = enabled;
    baseLocalIpfsPath = basePath;
    console.log('[LocalMode] API configured:', { localMode, baseLocalIpfsPath });
};

async function fetchIPFSWithFallback(hash, filename = null) {
    // If running in local mode and filename is provided, try local path first
    if (localMode && baseLocalIpfsPath && filename) {
        try {
            // Construct relative path (no file:// protocol to avoid CORS issues)
            const localPath = `${baseLocalIpfsPath}/${hash}/${filename}`;
            console.log('[IPFS] Attempting local fetch from:', localPath);
            const response = await fetch(localPath);
            if (response.ok) {
                console.log('[IPFS] Successfully fetched from local path');
                return response;
            }
            console.log('[IPFS] Local fetch failed with status:', response.status);
        } catch (e) {
            // Local fetch failed, will fallback to public gateway
            console.log('[IPFS] Local fetch error:', e.message, '- falling back to public gateway');
        }
    }
    
    // Apply rate limiting for public gateway requests
    await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
    
    // Fallback to ipfs.io with hash only (public gateway does not support hash/filename format)
    console.log('[IPFS] Fallback: fetching from https://ipfs.io/ipfs/' + hash);
    return await fetch('https://ipfs.io/ipfs/' + hash);
}

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

async function resolveIPFS(url) {
    const match = url.match(/IPFS:(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})\\?(.*)/);
    if (!match) {
        throw new Error('Invalid IPFS URL format.');
    }
    const fullMatch = match[0].split('IPFS:')[1];
    const parts = fullMatch.split('\\');
    const hash = parts[0];
    const filename = parts.length > 1 ? parts[1] : null;
    
    const response = await fetchIPFSWithFallback(hash, filename);
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
async function fetchIPFS(hash) {
    try {
        const response = await fetchIPFSWithFallback(hash);
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
