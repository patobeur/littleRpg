// User routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
