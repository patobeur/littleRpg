// Visit tracking middleware
const Visit = require('../models/Visit');
const { v4: uuidv4 } = require('crypto');

// Middleware to track visits
const visitTracker = async (req, res, next) => {
    try {
        // Get visitor ID from cookie or generate new one
        let visitorId = req.session?.visitorId;

        if (!visitorId) {
            // Check for cookie consent
            const cookieHeader = req.headers.cookie || '';
            const hasConsent = cookieHeader.includes('cookie_consent=true');
            const isAuthenticated = req.session && req.session.userId;

            // ONLY generate/store visitorId if user consented OR is logged in (functional necessity)
            if (hasConsent || isAuthenticated) {
                // Generate a unique visitor ID based on IP and user agent as fallback
                const ip = req.ip || req.connection.remoteAddress || 'unknown';
                const userAgent = req.get('user-agent') || 'unknown';
                visitorId = Visit.generateVisitorId(ip, userAgent);

                // Store in session if available
                if (req.session) {
                    req.session.visitorId = visitorId;
                }
            }
        }


        // Only record visit if we have a visitorId (meaning consent was given or user is logged in)
        if (visitorId) {
            // Get visitor information
            const ip = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.get('user-agent') || 'unknown';
            const page = req.path;
            const referrer = req.get('referer') || req.get('referrer') || 'direct';

            // Record the visit asynchronously (don't wait for it)
            Visit.recordVisit(visitorId, ip, userAgent, page, referrer).catch(err => {
                console.error('Failed to record visit:', err);
            });
        }

    } catch (error) {
        console.error('Visit tracking error:', error);
    }

    // Continue with the request
    next();
};

module.exports = visitTracker;
