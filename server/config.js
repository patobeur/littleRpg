// Server Configuration
const path = require('path');

const config = {
    // Server settings
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },

    // Database settings
    database: {
        path: path.join(__dirname, '..', 'data', 'rpg.db'),
        options: {
            verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        },
    },

    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
        name: 'rpg.sid',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            sameSite: 'strict',
        },
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        handler: (req, res) => {
            res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
        },
    },
    // Auth-specific rate limiting (stricter)
    authRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // Limit each IP to 50 auth attempts per windowMs (increased for development)
        handler: (req, res) => {
            res.status(429).json({ error: 'Too many authentication attempts, please try again later.' });
        },
    },

    // User validation rules
    validation: {
        username: {
            minLength: 3,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9_]+$/,
        },
        password: {
            minLength: 8,
            maxLength: 128,
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
    },

    // Character settings
    characters: {
        maxSlots: 3,
        nameMinLength: 2,
        nameMaxLength: 20,
    },
};

module.exports = config;
