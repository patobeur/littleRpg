// Authentication middleware

// Require user to be authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        if (req.accepts('html')) {
            return res.redirect('/login');
        }
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Require user to have specific role(s)
function requireRole(allowedRoles) {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            if (req.accepts('html')) {
                return res.redirect('/login');
            }
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            // Import User model to get user role
            const User = require('../models/User');
            const user = await User.findById(req.session.userId);

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            // Check if user has one of the allowed roles
            if (!allowedRoles.includes(user.role)) {
                if (req.accepts('html')) {
                    return res.redirect('/'); // Or dashboard if they are logged in but unauthorized? Redirect to home is safer.
                }
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            // Attach user to request for later use
            req.user = user;
            next();
        } catch (error) {
            console.error('Error checking user role:', error);
            if (req.accepts('html')) {
                return res.redirect('/login');
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}

// Redirect authenticated users (for login/register pages)
function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        res.redirect('/dashboard.html');
    } else {
        next();
    }
}

// Get current user ID from session
function getCurrentUserId(req) {
    return req.session && req.session.userId ? req.session.userId : null;
}

module.exports = {
    requireAuth,
    requireRole,
    redirectIfAuthenticated,
    getCurrentUserId,
};
