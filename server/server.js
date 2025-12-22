// Main server file
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const database = require('./database/database');
const { runMigrations } = require('./database/migrations');

// Import routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const userRoutes = require('./routes/users');

const http = require('http');
const { Server } = require('socket.io');
const LobbyManager = require('./lobby-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Lobby Manager
const lobbyManager = new LobbyManager(io);
lobbyManager.init();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'", "ws://localhost:*", "http://localhost:*"],
        },
    },
}));


// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session(config.session));

// General rate limiting - disabled in development
const generalLimiter = config.server.env === 'production'
    ? rateLimit(config.rateLimit)
    : (req, res, next) => next(); // No rate limiting in development
app.use(generalLimiter);

// Auth-specific rate limiting (stricter) - disabled in development
const authLimiter = config.server.env === 'production'
    ? rateLimit(config.authRateLimit)
    : (req, res, next) => next(); // No rate limiting in development

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve Three.js from node_modules
app.use('/js/three', express.static(path.join(__dirname, '..', 'node_modules', 'three', 'build')));
app.use('/js/addons', express.static(path.join(__dirname, '..', 'node_modules', 'three', 'examples', 'jsm')));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
    try {
        // Connect to database
        await database.connect();
        console.log('Database connected');

        // Run migrations
        await runMigrations();
        console.log('Database migrations completed');

        // Start server
        server.listen(config.server.port, () => {
            console.log(`\n🎮 RPG Server running on http://localhost:${config.server.port}`);
            console.log(`Environment: ${config.server.env}\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await database.close();
    process.exit(0);
});

// Start the server
start();

module.exports = app;
