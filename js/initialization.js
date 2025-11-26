/**
 * Initialization module for SupGalaxy
 * Handles parsing cached answers/offers and building known worlds/users
 */

/**
 * Known world activity tracking
 * Structure: Map<worldName, { users: Map<username, { attempts: number, lastAttempt: Date }>, totalAttempts: number }>
 */
var knownWorldActivity = new Map();

/**
 * Suggestions list for autocomplete built from initialization
 */
var worldUserSuggestions = [];

/**
 * Initialization state
 */
var initializationComplete = false;
var initializationProgress = 0;

/**
 * Aggregates activity by world from a list of join tokens
 * @param {Array} tokens - Array of parsed join tokens { world, user, normalized }
 * @param {Date|null} timestamp - Optional timestamp for the activity
 */
function aggregateWorldActivity(tokens, timestamp) {
    const activityTime = timestamp || new Date();

    for (const token of tokens) {
        if (!token.world || !token.user) continue;

        // Get or create world entry
        if (!knownWorldActivity.has(token.world)) {
            knownWorldActivity.set(token.world, {
                users: new Map(),
                totalAttempts: 0
            });
        }

        const worldEntry = knownWorldActivity.get(token.world);
        worldEntry.totalAttempts++;

        // Get or create user entry for this world
        if (!worldEntry.users.has(token.user)) {
            worldEntry.users.set(token.user, {
                attempts: 0,
                lastAttempt: null,
                firstSeen: activityTime
            });
        }

        const userEntry = worldEntry.users.get(token.user);
        userEntry.attempts++;
        userEntry.lastAttempt = activityTime;
    }
}

/**
 * Builds autocomplete suggestions from known world activity
 */
function buildSuggestionsFromActivity() {
    worldUserSuggestions = [];
    const seen = new Set();

    // Sort worlds by total attempts (most active first)
    const sortedWorlds = Array.from(knownWorldActivity.entries())
        .sort((a, b) => b[1].totalAttempts - a[1].totalAttempts);

    for (const [worldName, worldData] of sortedWorlds) {
        // Sort users by attempts (most active first)
        const sortedUsers = Array.from(worldData.users.entries())
            .sort((a, b) => b[1].attempts - a[1].attempts);

        for (const [userName, userData] of sortedUsers) {
            const normalized = worldName + '@' + userName;
            if (!seen.has(normalized)) {
                seen.add(normalized);
                worldUserSuggestions.push({
                    world: worldName,
                    user: userName,
                    normalized: normalized,
                    attempts: userData.attempts,
                    lastAttempt: userData.lastAttempt
                });
            }
        }
    }

    return worldUserSuggestions;
}

/**
 * Gets world activity summary for the Known Worlds view
 * @returns {Array} - Sorted array of world activity objects
 */
function getKnownWorldsActivity() {
    const result = [];

    for (const [worldName, worldData] of knownWorldActivity) {
        const users = [];
        for (const [userName, userData] of worldData.users) {
            users.push({
                name: userName,
                attempts: userData.attempts,
                lastAttempt: userData.lastAttempt,
                firstSeen: userData.firstSeen
            });
        }

        // Sort users by most recent activity
        users.sort((a, b) => {
            if (!a.lastAttempt && !b.lastAttempt) return 0;
            if (!a.lastAttempt) return 1;
            if (!b.lastAttempt) return -1;
            return new Date(b.lastAttempt) - new Date(a.lastAttempt);
        });

        result.push({
            world: worldName,
            totalAttempts: worldData.totalAttempts,
            userCount: worldData.users.size,
            users: users,
            lastActivity: users.length > 0 ? users[0].lastAttempt : null
        });
    }

    // Sort by last activity
    result.sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity) - new Date(a.lastActivity);
    });

    return result;
}

/**
 * Parses and processes cached messages for world activity
 * @param {Array} messages - Array of cached message objects
 * @param {Function} progressCallback - Optional callback for progress updates
 */
function processCachedMessages(messages, progressCallback) {
    if (!messages || !Array.isArray(messages)) {
        return;
    }

    const total = messages.length;
    let processed = 0;

    for (const msg of messages) {
        try {
            // Extract join tokens from message content
            if (msg.Message && typeof msg.Message === 'string') {
                const tokens = extractJoinTokens(msg.Message);
                const timestamp = msg.BlockDate ? new Date(msg.BlockDate) : null;
                aggregateWorldActivity(tokens, timestamp);
            }

            // Check for keyword patterns
            if (msg.ToAddress && typeof msg.ToAddress === 'string') {
                const keyword = parseMCWorldKeyword(msg.ToAddress);
                if (keyword && keyword.world) {
                    // Add world without user context
                    if (!knownWorldActivity.has(keyword.world)) {
                        knownWorldActivity.set(keyword.world, {
                            users: new Map(),
                            totalAttempts: 0
                        });
                    }
                }
            }

            processed++;
            if (progressCallback && total > 0) {
                initializationProgress = Math.round((processed / total) * 100);
                progressCallback(initializationProgress);
            }
        } catch (e) {
            console.error('[INIT] Error processing message:', e);
        }
    }

    buildSuggestionsFromActivity();
}

/**
 * Runs the initialization routine
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise} - Resolves when initialization is complete
 */
async function runInitialization(progressCallback) {
    console.log('[INIT] Starting initialization...');
    initializationComplete = false;
    initializationProgress = 0;

    if (progressCallback) {
        progressCallback(0);
    }

    try {
        // Process existing knownWorlds data
        if (typeof knownWorlds !== 'undefined' && knownWorlds.size > 0) {
            for (const [worldName, worldData] of knownWorlds) {
                if (!knownWorldActivity.has(worldName)) {
                    knownWorldActivity.set(worldName, {
                        users: new Map(),
                        totalAttempts: 0
                    });
                }

                const worldEntry = knownWorldActivity.get(worldName);
                
                // Add users from knownWorlds
                if (worldData.users) {
                    for (const userName of worldData.users) {
                        if (!worldEntry.users.has(userName)) {
                            worldEntry.users.set(userName, {
                                attempts: 1,
                                lastAttempt: new Date(),
                                firstSeen: new Date()
                            });
                        }
                        worldEntry.totalAttempts++;
                    }
                }
            }
        }

        // Build suggestions from aggregated data
        buildSuggestionsFromActivity();

        initializationProgress = 100;
        initializationComplete = true;

        if (progressCallback) {
            progressCallback(100);
        }

        console.log('[INIT] Initialization complete. Found', knownWorldActivity.size, 'worlds');
        return true;
    } catch (e) {
        console.error('[INIT] Initialization error:', e);
        initializationComplete = true;
        if (progressCallback) {
            progressCallback(100);
        }
        return false;
    }
}

/**
 * Gets suggestions for autocomplete based on input
 * @param {string} input - Current input text
 * @param {number} limit - Maximum number of suggestions
 * @returns {Array} - Array of suggestion objects
 */
function getSuggestions(input, limit = 10) {
    if (!input || typeof input !== 'string') {
        return worldUserSuggestions.slice(0, limit);
    }

    const search = input.toLowerCase().trim();
    
    return worldUserSuggestions
        .filter(s => 
            s.normalized.toLowerCase().includes(search) ||
            s.world.toLowerCase().includes(search) ||
            s.user.toLowerCase().includes(search)
        )
        .slice(0, limit);
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        aggregateWorldActivity,
        buildSuggestionsFromActivity,
        getKnownWorldsActivity,
        processCachedMessages,
        runInitialization,
        getSuggestions,
        knownWorldActivity,
        worldUserSuggestions
    };
}
