var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();
var ipfsFailureCounts = new Map();
var missingIpfsPaths = new Set();
var p2fkRequestTimes = [];
var p2fkRequestQueue = [];
var p2fkThrottleTimer = null;
var p2fkBurstCount = 0;
var p2fkNextSlowRequestAt = 0;
var p2fkLastRequestAt = null;
var P2FK_RATE_WINDOW_MS = 10000;
var P2FK_MAX_REQUESTS_PER_WINDOW = 99;
var P2FK_BURST_REQUESTS = 50;

function waitForP2fkApiSlot() {
    return new Promise(function (resolve) {
        p2fkRequestQueue.push(resolve);
        processP2fkRequestQueue();
    });
}

function processP2fkRequestQueue() {
    if (p2fkThrottleTimer !== null) return;

    while (p2fkRequestQueue.length > 0) {
        var now = Date.now();
        if (p2fkLastRequestAt !== null && now - p2fkLastRequestAt >= P2FK_RATE_WINDOW_MS) {
            p2fkRequestTimes = [];
            p2fkBurstCount = 0;
            p2fkNextSlowRequestAt = 0;
        }
        p2fkRequestTimes = p2fkRequestTimes.filter(function (requestTime) {
            return now - requestTime < P2FK_RATE_WINDOW_MS;
        });

        var nextAllowedAt = now;
        if (p2fkBurstCount >= P2FK_BURST_REQUESTS) {
            nextAllowedAt = Math.max(nextAllowedAt, p2fkNextSlowRequestAt);
        }
        if (p2fkRequestTimes.length >= P2FK_MAX_REQUESTS_PER_WINDOW) {
            nextAllowedAt = Math.max(nextAllowedAt, p2fkRequestTimes[0] + P2FK_RATE_WINDOW_MS);
        }
        if (nextAllowedAt > now) {
            p2fkThrottleTimer = setTimeout(function () {
                p2fkThrottleTimer = null;
                processP2fkRequestQueue();
            }, nextAllowedAt - now);
            return;
        }

        p2fkRequestQueue.shift()();
        p2fkRequestTimes.push(now);
        p2fkLastRequestAt = now;
        if (p2fkBurstCount < P2FK_BURST_REQUESTS) {
            p2fkBurstCount++;
            if (p2fkBurstCount === P2FK_BURST_REQUESTS) {
                p2fkNextSlowRequestAt = now + 1000 / API_CALLS_PER_SECOND;
            }
        } else {
            p2fkNextSlowRequestAt = now + 1000 / API_CALLS_PER_SECOND;
        }
    }
}

function getIpfsCacheKey(hash, filename = null) {
    return filename ? hash + "/" + filename : hash;
}

function markIpfsFetchFailure(hash, filename = null) {
    var cacheKey = getIpfsCacheKey(hash, filename);
    var attempts = (ipfsFailureCounts.get(cacheKey) || 0) + 1;
    ipfsFailureCounts.set(cacheKey, attempts);
    if (attempts >= 3) {
        missingIpfsPaths.add(cacheKey);
    }
}

function clearIpfsFetchFailure(hash, filename = null) {
    var cacheKey = getIpfsCacheKey(hash, filename);
    ipfsFailureCounts.delete(cacheKey);
    missingIpfsPaths.delete(cacheKey);
}

// Sup!? local mode detection and IPFS path utilities
var isSupLocalMode = null;

function checkSupLocalMode() {
    if (isSupLocalMode === null) {
        const urlParams = new URLSearchParams(window.location.search);
        isSupLocalMode = urlParams.has('transactionid');
    }
    return isSupLocalMode;
}

async function fetchIPFSWithFallback(hash, filename = null) {
    var cacheKey = getIpfsCacheKey(hash, filename);
    if (missingIpfsPaths.has(cacheKey)) {
        throw new Error('IPFS path previously marked missing for this session.');
    }
    // If running in Sup!? local mode and filename is provided, try local path first
    if (checkSupLocalMode() && filename) {
        try {
            // Use file:// URL with effective local IPFS root (respects ipfs-path query parameter)
            const localIpfsRoot = getLocalIpfsRoot();
            const localPath = `file:///${localIpfsRoot}/${hash}/${filename}`;
            console.log('[IPFS] Attempting local fetch from:', localPath);
            const response = await fetch(localPath);
            if (response.ok) {
                console.log('[IPFS] Successfully fetched from local path');
                clearIpfsFetchFailure(hash, filename);
                return response;
            }
            console.log('[IPFS] Local fetch failed with status:', response.status);
        } catch (e) {
            // Local fetch failed, will fallback to public IPFS gateways
            console.log('[IPFS] Local fetch error:', e.message, '- falling back to public IPFS gateways');
        }
    }
    
    await waitForP2fkApiSlot();
    const gatewayUrls = buildIPFSGatewayUrls(hash, filename);
    let lastResponse = null;
    let lastError = null;
    for (const gatewayUrl of gatewayUrls) {
        try {
            const response = await fetch(gatewayUrl);
            if (response.ok) {
                clearIpfsFetchFailure(hash, filename);
                return response;
            }
            lastResponse = response;
        } catch (e) {
            lastError = e;
        }
    }
    if (lastResponse) {
        markIpfsFetchFailure(hash, filename);
        return lastResponse;
    }
    markIpfsFetchFailure(hash, filename);
    throw lastError || new Error('Failed to fetch from public IPFS gateways.');
}

async function GetPublicAddressByKeyword(keyword) {
    try {
        if (addressByKeywordCache.has(keyword)) return addressByKeywordCache.get(keyword);

        let cleanAddress = null;
        if (typeof window.deriveKeywordAddress === 'function') {
            cleanAddress = await window.deriveKeywordAddress(keyword);
        } else {
            // Fallback if wallet.js hasn't loaded or isn't available
            await waitForP2fkApiSlot();
            var response = await fetch('https://p2fk.io/GetPublicAddressByKeyword/' + keyword + '?mainnet=false');
            if (!response.ok) {
                addMessage('Failed to fetch address for keyword');
                return null;
            }
            var address = await response.text();
            cleanAddress = address ? address.trim().replace(/^"|"$/g, '') : null;
        }

        if (cleanAddress) addressByKeywordCache.set(keyword, cleanAddress);
        return cleanAddress;
    } catch (e) {
        addMessage('Failed to fetch address for keyword');
        return null;
    }
}

async function resolveIPFS(url) {
    const match = url.match(/IPFS:(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}|[a-zA-Z0-9]{20,})[\\\/]?(.*)/);
    if (!match) {
        throw new Error('Invalid IPFS URL format.');
    }
    const fullMatch = match[0].split('IPFS:')[1];
    const parts = fullMatch.split(/[\\\/]/);
    const hash = parts[0];
    // Ignore filename when fetching from IPFS as gateways only use CID
    const filename = null;
    
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) {
                clearIpfsFetchFailure(hash, filename);
                await new Promise(resolve => setTimeout(resolve, attempt * 500));
            }
            const response = await fetchIPFSWithFallback(hash, filename);
            if (!response.ok) {
                throw new Error('Failed to fetch from IPFS.');
            }
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

function normalizeRootRecord(root, address) {
    var messageText = Array.isArray(root && root.Message) ? root.Message.join("") : root && root.Message ? String(root.Message) : "";
    var fromAddress = root && root.SignedBy ? String(root.SignedBy).trim() : root && root.FromAddress ? String(root.FromAddress).trim() : "";
    return Object.assign({}, root, {
        Message: messageText,
        FromAddress: fromAddress,
        ToAddress: address ? address.trim().replace(/^"|"$/g, '') : ""
    });
}

async function GetPublicMessagesByAddress(address) {
    try {
        var cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
        await waitForP2fkApiSlot();
        var response = await fetch('https://p2fk.io/GetPublicMessagesByAddress/' + cleanAddress + '?mainnet=false');
        if (!response.ok) {
            return [];
        }
        var messages = await response.json();
        return Array.isArray(messages) ? messages : [];
    } catch (e) {
        return [];
    }
}

async function GetRootsByAddress(address, skip, qty) {
    try {
        var cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
        await waitForP2fkApiSlot();
        var response = await fetch('https://p2fk.io/GetRootsByAddress/' + cleanAddress + '?skip=' + (skip || 0) + '&qty=' + (qty || 5000) + '&mainnet=false');
        if (!response.ok) {
            addMessage('Failed to fetch roots: Invalid address');
            return [];
        }
        var roots = await response.json();
        return Array.isArray(roots) ? roots.map((root => normalizeRootRecord(root, address))) : [];
    } catch (e) {
        addMessage('Failed to fetch roots');
        return [];
    }
}
async function GetProfileByURN(urn) {
    if (!urn || urn.trim() === '') return null;
    try {
        if (profileByURNCache.has(urn)) return profileByURNCache.get(urn);
        var cleanUrn = encodeURIComponent(urn.trim().replace(/^"|"$/g, ''));
        await waitForP2fkApiSlot();
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
        await waitForP2fkApiSlot();
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
        var cleanAddress = address.trim().replace(/^"|"$/g, '');
        var cleanKeyword = null;
        if ("function" == typeof window.deriveKeywordFromAddress) cleanKeyword = await window.deriveKeywordFromAddress(cleanAddress);
        else if ("function" == typeof decB58C) try {
            var payload = await decB58C(cleanAddress);
            cleanKeyword = payload && payload.length > 1 ? new TextDecoder().decode(payload.slice(1)).replace(/#+$/g, "") : null
        } catch (e) {}
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
        clearIpfsFetchFailure(hash);
        return data;
    } catch (e) {
        addMessage('Failed to fetch IPFS data');
        return null;
    }
}
