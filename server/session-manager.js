/**
 * Session Manager
 * Enforces single session per user policy (Last Login Wins)
 */
class SessionManager {
    constructor() {
        // Map<userId, sessionId>
        this.userSessions = new Map();
    }

    /**
     * Register a new session for a user.
     * If an old session exists, it is invalidated.
     * 
     * @param {string|number} userId - The user's ID
     * @param {string} newSessionId - The new session ID
     * @param {object} req - Express request object (to access sessionStore)
     */
    registerSession(userId, newSessionId, req) {
        if (!userId || !newSessionId) return;

        // Check if user already has an active session
        if (this.userSessions.has(userId)) {
            const oldSessionId = this.userSessions.get(userId);

            // If it's a different session, destroy the old one
            if (oldSessionId !== newSessionId) {
                console.log(`[SessionManager] Invalidating old session ${oldSessionId} for user ${userId}`);

                if (req.sessionStore) {
                    req.sessionStore.destroy(oldSessionId, (err) => {
                        if (err) {
                            console.error(`[SessionManager] Failed to destroy session ${oldSessionId}:`, err);
                        }
                    });
                }
            }
        }

        // Update with new session
        this.userSessions.set(userId, newSessionId);
    }

    /**
     * Remove a session (e.g. on logout)
     * @param {string|number} userId 
     */
    removeSession(userId) {
        if (userId) {
            this.userSessions.delete(userId);
        }
    }
}

// Export as singleton
module.exports = new SessionManager();
