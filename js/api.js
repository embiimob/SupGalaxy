var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();

async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000 / API_CALLS_PER_SECOND));
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            console.error(`Attempt ${i + 1} failed with status: ${response.status}`);
        } catch (error) {
            console.error(`Attempt ${i + 1} failed with error:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
    return null; // Return null after all retries have failed
}

async function GetPublicAddressByKeyword(keyword) {
    try {
        if (addressByKeywordCache.has(keyword)) return addressByKeywordCache.get(keyword);
        const response = await fetchWithRetry('https://p2fk.io/GetPublicAddressByKeyword/' + keyword + '?mainnet=false');
        if (!response) {
            addMessage('Failed to fetch address for keyword');
            return null;
        }
        var address = await response.text();
        var cleanAddress = address ? address.trim() : null;
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
    const hash = match[0].split('IPFS:')[1].split('\\')[0];
    const response = await fetchWithRetry('https://ipfs.io/ipfs/' + hash);
    if (!response) {
        throw new Error('Failed to fetch from IPFS.');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
async function GetPublicMessagesByAddress(address, skip, qty) {
    try {
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
        const response = await fetchWithRetry('https://p2fk.io/GetPublicMessagesByAddress/' + cleanAddress + '?skip=' + (skip || 0) + '&qty=' + (qty || 5000) + '&mainnet=false');
        if (!response) {
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
        var cleanUrn = encodeURIComponent(urn.trim().replace(/[^a-zA-Z0-9]/g, ''));
        const response = await fetchWithRetry('https://p2fk.io/GetProfileByURN/' + cleanUrn + '?mainnet=false');
        if (!response) return null;
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
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
        const response = await fetchWithRetry('https://p2fk.io/GetProfileByAddress/' + cleanAddress + '?mainnet=false');
        if (!response) return null;
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
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
        const response = await fetchWithRetry('https://p2fk.io/GetKeywordByPublicAddress/' + cleanAddress + '?mainnet=false');
        if (!response) {
            addMessage('Failed to fetch keyword for address');
            return null;
        }
        var keyword = await response.text();
        var cleanKeyword = keyword ? keyword.trim() : null;
        if (cleanKeyword) keywordByAddressCache.set(address, cleanKeyword);
        return cleanKeyword;
    } catch (e) {
        addMessage('Failed to fetch keyword for address');
        return null;
    }
}
async function fetchIPFS(hash) {
    try {
        const response = await fetchWithRetry('https://ipfs.io/ipfs/' + hash);
        if (!response) {
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
