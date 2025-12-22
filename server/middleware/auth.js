// Authentication middleware

// Require user to be authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
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
    redirectIfAuthenticated,
    getCurrentUserId,
};
