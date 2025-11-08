var keywordCache = new Map();
var profileByURNCache = new Map();
var profileByAddressCache = new Map();
var keywordByAddressCache = new Map();
var addressByKeywordCache = new Map();

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
        var cleanAddress = address ? address.trim() : null;
        if (cleanAddress) addressByKeywordCache.set(keyword, cleanAddress);
        return cleanAddress;
    } catch (e) {
        addMessage('Failed to fetch address for keyword');
        return null;
    }
}
async function GetPublicMessagesByAddress(address, skip, qty) {
    try {
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
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
        var cleanUrn = encodeURIComponent(urn.trim().replace(/[^a-zA-Z0-9]/g, ''));
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
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
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
        var cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://p2fk.io/GetKeywordByPublicAddress/' + cleanAddress + '?mainnet=false');
        if (!response.ok) {
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
        await new Promise(function (r) { setTimeout(r, 1000 / API_CALLS_PER_SECOND); });
        var response = await fetch('https://ipfs.io/ipfs/' + hash);
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
