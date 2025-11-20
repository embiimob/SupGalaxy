/**
 * API Module
 * Handles all external API calls to p2fk.io and IPFS
 * @module api
 */

const profileByURNCache = new Map();
const profileByAddressCache = new Map();
const keywordByAddressCache = new Map();
const addressByKeywordCache = new Map();

/**
 * Rate limiting helper
 * @returns {Promise<void>}
 */
async function rateLimit() {
  await new Promise((resolve) => {
    setTimeout(resolve, 1000 / CONFIG.API_CALLS_PER_SECOND);
  });
}

/**
 * Get public address by keyword from p2fk.io
 * @param {string} keyword - The keyword to look up
 * @returns {Promise<string|null>} The address or null if not found
 */
async function GetPublicAddressByKeyword(keyword) {
  try {
    if (addressByKeywordCache.has(keyword)) {
      return addressByKeywordCache.get(keyword);
    }

    await rateLimit();
    const response = await fetch(`${CONFIG.API_BASE_URL}/GetPublicAddressByKeyword/${keyword}?mainnet=false`);

    if (!response.ok) {
      logger.warn('Failed to fetch address for keyword:', keyword);
      addMessage('Failed to fetch address for keyword');
      return null;
    }

    const address = await response.text();
    const cleanAddress = address ? address.trim() : null;

    if (cleanAddress) {
      addressByKeywordCache.set(keyword, cleanAddress);
    }

    return cleanAddress;
  } catch (e) {
    logger.error('Error fetching address for keyword:', keyword, e);
    addMessage('Failed to fetch address for keyword');
    return null;
  }
}

/**
 * Resolve IPFS URL to a blob URL
 * @param {string} url - The IPFS URL to resolve
 * @returns {Promise<string>} Blob URL
 */
async function resolveIPFS(url) {
  const match = url.match(/IPFS:(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})\\?(.*)/);

  if (!match) {
    throw new Error('Invalid IPFS URL format.');
  }

  const hash = match[0].split('IPFS:')[1].split('\\')[0];
  const response = await fetch(`${CONFIG.IPFS_GATEWAY}${hash}`);

  if (!response.ok) {
    throw new Error('Failed to fetch from IPFS.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Get public messages by address from p2fk.io
 * @param {string} address - The address to query
 * @param {number} skip - Number of messages to skip
 * @param {number} qty - Number of messages to retrieve
 * @returns {Promise<Array>} Array of messages
 */
async function GetPublicMessagesByAddress(address, skip, qty) {
  try {
    const cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
    await rateLimit();

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/GetPublicMessagesByAddress/${cleanAddress}?skip=${skip || 0}&qty=${qty || 5000}&mainnet=false`
    );

    if (!response.ok) {
      logger.warn('Failed to fetch messages for address:', address);
      addMessage('Failed to fetch messages: Invalid address');
      return [];
    }

    const messages = await response.json();
    return messages;
  } catch (e) {
    logger.error('Error fetching messages for address:', address, e);
    addMessage('Failed to fetch messages');
    return [];
  }
}

/**
 * Get profile by URN from p2fk.io
 * @param {string} urn - The URN to look up
 * @returns {Promise<Object|null>} Profile object or null
 */
async function GetProfileByURN(urn) {
  if (!urn || urn.trim() === '') return null;

  try {
    if (profileByURNCache.has(urn)) {
      return profileByURNCache.get(urn);
    }

    const cleanUrn = encodeURIComponent(urn.trim().replace(/[^a-zA-Z0-9]/g, ''));
    await rateLimit();

    const response = await fetch(`${CONFIG.API_BASE_URL}/GetProfileByURN/${cleanUrn}?mainnet=false`);

    if (!response.ok) return null;

    const profile = await response.json();
    if (profile) {
      profileByURNCache.set(urn, profile);
    }

    return profile;
  } catch (e) {
    logger.error('Error fetching profile by URN:', urn, e);
    return null;
  }
}

/**
 * Get profile by address from p2fk.io
 * @param {string} address - The address to look up
 * @returns {Promise<Object|null>} Profile object or null
 */
async function GetProfileByAddress(address) {
  try {
    if (profileByAddressCache.has(address)) {
      return profileByAddressCache.get(address);
    }

    const cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
    await rateLimit();

    const response = await fetch(`${CONFIG.API_BASE_URL}/GetProfileByAddress/${cleanAddress}?mainnet=false`);

    if (!response.ok) return null;

    const profile = await response.json();
    if (profile) {
      profileByAddressCache.set(address, profile);
    }

    return profile;
  } catch (e) {
    logger.error('Error fetching profile by address:', address, e);
    return null;
  }
}

/**
 * Get keyword by public address from p2fk.io
 * @param {string} address - The address to look up
 * @returns {Promise<string|null>} Keyword or null
 */
async function GetKeywordByPublicAddress(address) {
  try {
    if (keywordByAddressCache.has(address)) {
      return keywordByAddressCache.get(address);
    }

    const cleanAddress = encodeURIComponent(address.trim().replace(/[^a-zA-Z0-9]/g, ''));
    await rateLimit();

    const response = await fetch(`${CONFIG.API_BASE_URL}/GetKeywordByPublicAddress/${cleanAddress}?mainnet=false`);

    if (!response.ok) {
      logger.warn('Failed to fetch keyword for address:', address);
      addMessage('Failed to fetch keyword for address');
      return null;
    }

    const keyword = await response.text();
    const cleanKeyword = keyword ? keyword.trim() : null;

    if (cleanKeyword) {
      keywordByAddressCache.set(address, cleanKeyword);
    }

    return cleanKeyword;
  } catch (e) {
    logger.error('Error fetching keyword for address:', address, e);
    addMessage('Failed to fetch keyword for address');
    return null;
  }
}

/**
 * Fetch data from IPFS
 * @param {string} hash - IPFS hash
 * @returns {Promise<Object|null>} JSON data or null
 */
async function fetchIPFS(hash) {
  try {
    await rateLimit();
    const response = await fetch(`${CONFIG.IPFS_GATEWAY}${hash}`);

    if (!response.ok) {
      logger.warn('Failed to fetch IPFS data for hash:', hash);
      addMessage('Failed to fetch IPFS data');
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    logger.error('Error fetching IPFS data:', hash, e);
    addMessage('Failed to fetch IPFS data');
    return null;
  }
}

