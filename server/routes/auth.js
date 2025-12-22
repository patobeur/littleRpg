// Authentication routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const user = await User.create(username, email, password);

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.verifyCredentials(username, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'An error occurred during logout' });
        }

        res.clearCookie('rpg.sid');
        res.json({ success: true });
    });
});

// Check session status
router.get('/session', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
            },
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
