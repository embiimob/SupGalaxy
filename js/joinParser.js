/**
 * Join string parser utility for SupGalaxy
 * Normalizes join strings to world@user format and extracts world/user info
 */

/**
 * Parses a join string and normalizes it to world@user format
 * Accepts both user@world and world@user formats on input
 * @param {string} input - The join string to parse
 * @returns {Object|null} - Parsed result with world, user, and normalized string, or null if invalid
 */
function parseJoinString(input) {
    if (!input || typeof input !== 'string') {
        return null;
    }

    const trimmed = input.trim();
    if (!trimmed.includes('@')) {
        return null;
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return null;
    }

    const first = parts[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    const second = parts[1].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

    if (!first || !second) {
        return null;
    }

    // Determine which is world and which is user
    // World names are max 8 chars, usernames are max 20 chars
    // If first part is <= 8 chars and second part is > 8 chars, assume world@user
    // If second part is <= 8 chars and first part is > 8 chars, assume user@world
    // Edge case: When both parts are <= 8 chars (e.g., both could be worlds or short usernames),
    // we default to treating the input as world@user format since this is the preferred/canonical format.
    // This preserves backward compatibility while standardizing new inputs.
    let world, user;

    if (first.length <= 8 && second.length > 8) {
        // Likely world@user format (first is world)
        world = first.slice(0, 8);
        user = second.slice(0, 20);
    } else if (second.length <= 8 && first.length > 8) {
        // Likely user@world format (second is world)
        world = second.slice(0, 8);
        user = first.slice(0, 20);
    } else {
        // Ambiguous case (both <= 8 chars or both > 8 chars) - treat as world@user (preferred format)
        // This is the canonical format and preserves the input order for ambiguous cases
        world = first.slice(0, 8);
        user = second.slice(0, 20);
    }

    return {
        world: world,
        user: user,
        normalized: world + '@' + user
    };
}

/**
 * Normalizes a join string to world@user format
 * @param {string} input - The join string to normalize
 * @returns {string|null} - Normalized world@user string or null if invalid
 */
function normalizeJoinString(input) {
    const parsed = parseJoinString(input);
    return parsed ? parsed.normalized : null;
}

/**
 * Extracts world@user tokens from a text string (for parsing cached data)
 * Matches patterns like world@user or user@world
 * @param {string} text - Text to search for join tokens
 * @returns {Array} - Array of parsed token objects with world, user, and normalized
 */
function extractJoinTokens(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // Match patterns that look like word@word (alphanumeric)
    const pattern = /\b([a-zA-Z0-9]+)@([a-zA-Z0-9]+)\b/g;
    const tokens = [];
    const seen = new Set();
    let match;

    while ((match = pattern.exec(text)) !== null) {
        const parsed = parseJoinString(match[0]);
        if (parsed && !seen.has(parsed.normalized)) {
            seen.add(parsed.normalized);
            tokens.push(parsed);
        }
    }

    return tokens;
}

/**
 * Parses MCWorld keyword mentions from cached data
 * Handles formats like MCWorld@worldname or MCUserJoin@worldname
 * @param {string} keyword - The keyword to parse
 * @returns {Object|null} - Parsed result with world, or null if invalid
 */
function parseMCWorldKeyword(keyword) {
    if (!keyword || typeof keyword !== 'string') {
        return null;
    }

    const trimmed = keyword.trim();
    
    // Match MCWorld@ or MCUserJoin@ or MCServerJoin@ patterns
    const patterns = [
        /^MCWorld@([a-zA-Z0-9]+)/i,
        /^MCUserJoin@([a-zA-Z0-9]+)/i,
        /^MCServerJoin@([a-zA-Z0-9]+)/i
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            return {
                world: match[1].slice(0, 8),
                type: trimmed.split('@')[0]
            };
        }
    }

    return null;
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseJoinString,
        normalizeJoinString,
        extractJoinTokens,
        parseMCWorldKeyword
    };
}
