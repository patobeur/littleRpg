/**
 * Session Manager
 * Enforces single session per user policy (Last Login Wins)
 */
const Visit = require('./models/Visit');

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

                // Log the event in the visit tracker
                try {
                    const ip = req.ip || req.connection.remoteAddress || 'unknown';
                    const userAgent = req.get('user-agent') || 'unknown';
                    // Use existing visitorId or generate a temporary one for this log
                    const visitorId = req.session?.visitorId || Visit.generateVisitorId(ip, userAgent);

                    Visit.recordVisit(
                        visitorId,
                        ip,
                        userAgent,
                        '/AUTH/FORCE_LOGOUT', // Virtual path to identify this event
                        `Session Conflict: User ${userId} logged in from new device` // Details in referrer
                    ).catch(e => console.error('Failed to log session preemption:', e));
                } catch (logErr) {
                    console.error('Error logging session preemption:', logErr);
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
